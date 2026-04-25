'use strict';

const ffmpeg = require('fluent-ffmpeg');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function getOutputPath(inputFile, outputFolder, suffix, ext) {
  const base = path.basename(inputFile, path.extname(inputFile));
  const filename = `${base}_${suffix}.${ext}`;
  return path.join(outputFolder, filename);
}

// ─── Codec resolution ─────────────────────────────────────────────
// Friendly codec ids the UI sends ('h264', 'h265', 'av1', 'vp9') get mapped
// here to the actual ffmpeg encoder name, optionally swapped for a
// hardware-accelerated variant when both available and requested.
//
// Order within each list = preference (try first match).
const codecMap = {
  h264: { sw: ['libx264'],     hw: ['h264_videotoolbox', 'h264_nvenc', 'h264_qsv', 'h264_amf'] },
  h265: { sw: ['libx265'],     hw: ['hevc_videotoolbox', 'hevc_nvenc', 'hevc_qsv', 'hevc_amf'] },
  av1:  { sw: ['libsvtav1', 'libaom-av1'], hw: ['av1_nvenc', 'av1_qsv', 'av1_amf'] },
  vp9:  { sw: ['libvpx-vp9'],  hw: [] },
};

function resolveEncoder(codecId, useHardware, availableEncoders) {
  const entry = codecMap[codecId] || codecMap.h264;
  const list = useHardware ? [...entry.hw, ...entry.sw] : [...entry.sw, ...entry.hw];
  for (const enc of list) {
    if (!availableEncoders || availableEncoders.length === 0 || availableEncoders.includes(enc)) {
      return enc;
    }
  }
  return entry.sw[0]; // fallback
}

// 1 = fastest encode, 5 = slowest (smaller file on average for software encoders).
function getEncoderSpeedOptions(encoder, stepIn) {
  const step = Math.max(1, Math.min(5, Number(stepIn) || 3));
  const i = step - 1;
  if (encoder === 'libx264' || encoder === 'libx265') {
    const p = ['ultrafast', 'veryfast', 'medium', 'slow', 'veryslow'];
    return { args: ['-preset', p[i]], short: p[i] };
  }
  if (encoder === 'libvpx-vp9') {
    const cpu = [5, 4, 3, 1, 0][i];
    return { args: ['-cpu-used', String(cpu)], short: `cpu-used=${cpu}` };
  }
  if (encoder === 'libsvtav1') {
    const pr = [12, 10, 8, 5, 3][i];
    return { args: ['-preset', String(pr)], short: `preset=${pr}` };
  }
  if (encoder === 'libaom-av1') {
    const cu = [8, 6, 4, 2, 0][i];
    return { args: ['-cpu-used', String(cu)], short: `cpu-used=${cu}` };
  }
  if (encoder.endsWith('_nvenc')) {
    const p = ['p1', 'p2', 'p3', 'p4', 'p5'][i];
    return { args: ['-preset', p], short: p };
  }
  if (encoder.endsWith('_qsv')) {
    const p = ['veryfast', 'faster', 'fast', 'slow', 'slower'];
    return { args: ['-preset', p[i]], short: p[i] };
  }
  if (encoder.endsWith('_amf')) {
    const q = ['speed', 'speed', 'balanced', 'quality', 'quality'];
    return { args: ['-quality', q[i]], short: q[i] };
  }
  if (encoder.endsWith('_videotoolbox')) {
    if (step <= 2) return { args: ['-realtime', '1'], short: 'realtime' };
    return { args: [], short: 'default' };
  }
  if (encoder.endsWith('_mf')) {
    const pr = [12, 10, 8, 5, 3];
    return { args: ['-preset', String(pr[i])], short: `p${pr[i]}` };
  }
  return { args: ['-preset', 'medium'], short: 'medium' };
}

// Map the user's "quality %" slider (10-100) onto the right CLI flag for
// the chosen encoder. Higher % = better quality for ALL codecs in the UI.
function buildQualityFlags(encoder, qualityPercent) {
  const pct = Math.max(10, Math.min(100, Number(qualityPercent) || 70));
  const t = (pct - 10) / 90; // 0..1, higher = better

  // Apple VideoToolbox: -q:v 1..100, higher = better quality. Usable ~50-90.
  if (encoder.endsWith('_videotoolbox')) {
    const q = Math.round(50 + t * 40);
    return [`-q:v ${q}`];
  }
  // NVENC: -cq 0..51, lower = better. Usable ~17-32.
  if (encoder.endsWith('_nvenc')) {
    const cq = Math.round(32 - t * 15);
    return [`-rc vbr`, `-cq ${cq}`, `-b:v 0`];
  }
  // Intel QSV: -global_quality 1..51, lower = better. Usable ~17-32.
  if (encoder.endsWith('_qsv')) {
    const q = Math.round(32 - t * 15);
    return [`-global_quality ${q}`];
  }
  // AMD AMF: -quality + -qp_i/qp_p; simple bitrate fallback.
  if (encoder.endsWith('_amf')) {
    const qp = Math.round(32 - t * 15);
    return [`-rc cqp`, `-qp_i ${qp}`, `-qp_p ${qp}`, `-qp_b ${qp}`];
  }
  // SVT-AV1: -crf 1..63, lower = better. Usable ~23-50.
  if (encoder === 'libsvtav1' || encoder === 'libaom-av1') {
    const crf = Math.round(50 - t * 27);
    return [`-crf ${crf}`];
  }
  // VP9: -crf 0..63, lower = better. Needs -b:v 0 for true CQP mode.
  if (encoder === 'libvpx-vp9') {
    const crf = Math.round(50 - t * 27);
    return [`-crf ${crf}`, `-b:v 0`];
  }
  // Default x264 / x265: -crf 0..51, lower = better. Usable ~18-32.
  const crf = Math.round(51 - t * 33);
  return [`-crf ${crf}`];
}

// Pick a sensible output container for the chosen codec. VP9 lives in webm.
function containerForCodec(codecId, inputExt) {
  if (codecId === 'vp9') return 'webm';
  return inputExt || 'mp4';
}

// Convert a CRF value (legacy AI-mode contract) back to a quality % so the
// generic per-encoder mapper can take over.
function crfToPercent(crf) {
  return Math.round(100 - ((crf - 18) / (51 - 18)) * 100);
}

/** When set (and not 'source'), adds -r for output frame rate (duplicate/drop frames as needed). */
function appendOutputFps(outputOptions, modeNote, outputFps) {
  if (!outputFps || outputFps === 'source') return modeNote;
  const r = parseFloat(String(outputFps));
  if (!Number.isFinite(r) || r <= 0) return modeNote;
  outputOptions.push('-r', String(r));
  return `${modeNote} · ${r} fps`;
}

/**
 * Build -vf for crop / rotate (° CW) / flips. Re-encodes to H.264 + copy audio.
 * rotate: 0 | 90 | 180 | 270
 * 90° CW = transpose=1, 180 = transpose=1,transpose=1, 270° CW = transpose=2 (90° CCW)
 */
function buildTransformVf(options) {
  const parts = [];
  const w = options.cropW;
  const h = options.cropH;
  if (w > 0 && h > 0) {
    const cw = Math.max(2, Math.floor(Number(w) || 0));
    const ch = Math.max(2, Math.floor(Number(h) || 0));
    const cx = Math.max(0, Math.floor(Number(options.cropX) || 0));
    const cy = Math.max(0, Math.floor(Number(options.cropY) || 0));
    parts.push(`crop=${cw}:${ch}:${cx}:${cy}`);
  }
  const r = (Number(options.rotate) || 0) % 360;
  if (r === 90) parts.push('transpose=1');
  else if (r === 180) parts.push('transpose=1,transpose=1');
  else if (r === 270) parts.push('transpose=2');
  if (options.flipH) parts.push('hflip');
  if (options.flipV) parts.push('vflip');
  if (parts.length === 0) return null;
  parts.push('format=yuv420p');
  return parts.join(',');
}

// Probe video duration in seconds via ffprobe. Used when target-file-size
// mode is invoked but the caller didn't pre-pass the duration.
function probeDuration(ffprobePath, file) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffprobePath, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      file,
    ]);
    let out = '';
    let err = '';
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d; });
    proc.on('close', code => {
      if (code === 0) {
        const dur = parseFloat(out.trim());
        resolve(Number.isFinite(dur) && dur > 0 ? dur : 0);
      } else {
        reject(new Error(err.trim() || 'ffprobe failed'));
      }
    });
  });
}

function runOperation({ jobId, operation, options, ffmpegPath, ffprobePath, availableEncoders, outputFolder, onProgress, onComplete, onError }) {
  // Configure ffmpeg paths
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);

  const input = options.inputPath;
  if (!input || !fs.existsSync(input)) {
    return onError('Input file not found: ' + input);
  }

  let cmd;
  let outputFile;

  switch (operation) {
    case 'convert': {
      const ext = (options.outputFormat || 'mp4').toLowerCase();
      // MP4: default to faststart when the flag is omitted (AI / older clients); only skip when false.
      const webOpt = ext === 'mp4' && options.webOptimized !== false;
      outputFile = getOutputPath(input, outputFolder, 'converted', ext);

      // MP4 / MKV: remux (stream copy) for speed when codecs are compatible.
      // "Web optimized" for MP4 = move moov atom to the file start (-movflags +faststart) for
      // progressive / streaming playback. WebM: transcode to VP9 + Opus (Matroska subset).
      if (ext === 'webm') {
        cmd = ffmpeg(input)
          .output(outputFile)
          .videoCodec('libvpx-vp9')
          .audioCodec('libopus')
          .outputOptions(['-crf 32', '-b:v 0', '-b:a 128k'])
          .on('start', () => onProgress({ type: 'start', note: 'convert: WebM (VP9 + Opus)' }))
          .on('progress', p => onProgress({ type: 'progress', percent: Math.round(p.percent || 0), timemark: p.timemark }))
          .on('end', () => onComplete({ success: true, outputPath: outputFile }))
          .on('error', err => onError(err.message));
      } else {
        const outOpts = ['-c', 'copy'];
        if (ext === 'mp4' && webOpt) outOpts.push('-movflags', '+faststart');
        cmd = ffmpeg(input)
          .output(outputFile)
          .outputOptions(outOpts)
          .on('start', () => onProgress({
            type: 'start',
            note: ext === 'mp4' && webOpt ? 'convert: remux + faststart' : 'convert: remux (copy streams)',
          }))
          .on('progress', p => onProgress({ type: 'progress', percent: Math.round(p.percent || 0), timemark: p.timemark }))
          .on('end', () => onComplete({ success: true, outputPath: outputFile }))
          .on('error', err => onError(err.message));
      }
      break;
    }

    case 'compress': {
      const inputExt = path.extname(input).slice(1) || 'mp4';
      const codecId = options.codec || 'h264';
      const useHardware = !!options.useHardware;
      const encoder = resolveEncoder(codecId, useHardware, availableEncoders);
      const outputExt = containerForCodec(codecId, inputExt);
      outputFile = getOutputPath(input, outputFolder, 'compressed', outputExt);

      const qualityMode = options.qualityMode || 'crf';
      const audioBitrateKbps = 128;

      const buildAndRun = (durationSec) => {
        const step = options.encoderSpeed != null
          ? Math.max(1, Math.min(5, Number(options.encoderSpeed) || 3))
          : 3;
        const speed = getEncoderSpeedOptions(encoder, step);
        const outputOptions = [...speed.args];
        let modeNote = `${codecId} (${encoder}) · ${speed.short}`;

        if (qualityMode === 'bitrate') {
          const kbps = Math.max(50, Math.floor(options.bitrateKbps || 2000));
          outputOptions.push(
            `-b:v ${kbps}k`,
            `-maxrate ${Math.floor(kbps * 1.5)}k`,
            `-bufsize ${kbps * 2}k`,
          );
          modeNote += ` · bitrate=${kbps}k`;
        } else if (qualityMode === 'filesize') {
          const targetMB = Math.max(1, Number(options.targetSizeMB) || 25);
          if (!durationSec || durationSec <= 0) {
            return onError('Could not determine video duration for target file size mode');
          }
          const overheadFactor = 0.95;
          const totalKbps = (targetMB * 8 * 1024 * overheadFactor) / durationSec;
          const videoKbps = Math.max(50, Math.floor(totalKbps - audioBitrateKbps));
          outputOptions.push(
            `-b:v ${videoKbps}k`,
            `-maxrate ${Math.floor(videoKbps * 1.4)}k`,
            `-bufsize ${videoKbps * 2}k`,
          );
          modeNote += ` · target=${targetMB}MB → ${videoKbps}k video`;
        } else {
          // Quality (CRF / per-encoder equivalent)
          let qualityPercent;
          if (options.qualityPercent !== undefined) {
            qualityPercent = options.qualityPercent;
          } else if (options.quality !== undefined) {
            // Legacy AI-mode contract: { quality: 28 } meaning x264 CRF.
            qualityPercent = crfToPercent(options.quality);
          } else {
            qualityPercent = 70;
          }
          outputOptions.push(...buildQualityFlags(encoder, qualityPercent));
          modeNote += ` · quality=${qualityPercent}%`;
        }

        modeNote = appendOutputFps(outputOptions, modeNote, options.outputFps);

        // Pick an audio codec compatible with the container.
        const audioCodec = outputExt === 'webm' ? 'libopus' : 'aac';

        const localCmd = ffmpeg(input)
          .output(outputFile)
          .videoCodec(encoder)
          .outputOptions(outputOptions)
          .audioCodec(audioCodec)
          .audioBitrate(`${audioBitrateKbps}k`)
          .on('start', () => onProgress({ type: 'start', note: modeNote }))
          .on('progress', p => onProgress({
            type: 'progress',
            percent: Math.round(p.percent || 0),
            timemark: p.timemark,
          }))
          .on('end', () => onComplete({ success: true, outputPath: outputFile }))
          .on('error', err => onError(err.message));
        localCmd.run();
      };

      if (qualityMode === 'filesize' && !options.durationSec) {
        probeDuration(ffprobePath, input)
          .then(buildAndRun)
          .catch(err => onError(`Duration probe failed: ${err.message}`));
      } else {
        buildAndRun(options.durationSec);
      }
      break;
    }

    case 'extractAudio': {
      const audioExt = options.audioFormat || 'mp3';
      outputFile = getOutputPath(input, outputFolder, 'audio', audioExt);
      cmd = ffmpeg(input)
        .noVideo()
        .output(outputFile)
        .on('progress', p => onProgress({ type: 'progress', percent: Math.round(p.percent || 0), timemark: p.timemark }))
        .on('end', () => onComplete({ success: true, outputPath: outputFile }))
        .on('error', err => onError(err.message));
      break;
    }

    case 'trim': {
      const ext = path.extname(input).slice(1) || 'mp4';
      outputFile = getOutputPath(input, outputFolder, 'trimmed', ext);
      const startSec = timeToSeconds(options.startTime || '00:00:00');
      const durationSec = options.endTime
        ? timeToSeconds(options.endTime) - startSec
        : (options.duration ?? null);
      cmd = ffmpeg(input)
        .setStartTime(startSec)
        .output(outputFile)
        .on('progress', p => onProgress({ type: 'progress', percent: Math.round(p.percent || 0), timemark: p.timemark }))
        .on('end', () => onComplete({ success: true, outputPath: outputFile }))
        .on('error', err => onError(err.message));
      if (durationSec !== null && durationSec > 0) {
        cmd = cmd.setDuration(durationSec);
      }
      break;
    }

    case 'resize': {
      const ext = path.extname(input).slice(1) || 'mp4';
      outputFile = getOutputPath(input, outputFolder, 'resized', ext);
      const size = options.width && options.height
        ? `${options.width}x${options.height}`
        : options.size || '1280x720';
      const fpsOpt = [];
      if (options.outputFps && options.outputFps !== 'source') {
        const r = parseFloat(String(options.outputFps));
        if (Number.isFinite(r) && r > 0) fpsOpt.push('-r', String(r));
      }
      cmd = ffmpeg(input)
        .size(size)
        .output(outputFile);
      if (fpsOpt.length) cmd = cmd.outputOptions(fpsOpt);
      cmd = cmd
        .on('progress', p => onProgress({ type: 'progress', percent: Math.round(p.percent || 0), timemark: p.timemark }))
        .on('end', () => onComplete({ success: true, outputPath: outputFile }))
        .on('error', err => onError(err.message));
      break;
    }

    case 'transform': {
      const inExt = path.extname(input).slice(1) || 'mp4';
      // H.264 in WebM/OGV is invalid — fall back to MP4.
      const outExt = (inExt === 'webm' || inExt === 'ogg' || inExt === 'ogv') ? 'mp4' : inExt;
      outputFile = getOutputPath(input, outputFolder, 'transformed', outExt);
      const vf = buildTransformVf(options);
      if (!vf) {
        return onError('Choose at least one: rotation, horizontal flip, vertical flip, or crop (width & height).');
      }
      const note = `transform: ${vf.replace(/,format=yuv420p$/, '')}`;
      const tOpts = ['-crf 18', '-preset', 'fast', '-c:a', 'copy', '-vf', vf];
      if (outExt === 'mp4' || outExt === 'm4v' || outExt === 'mov') tOpts.push('-movflags', '+faststart');
      cmd = ffmpeg(input)
        .output(outputFile)
        .videoCodec('libx264')
        .outputOptions(tOpts)
        .on('start', () => onProgress({ type: 'start', note }))
        .on('progress', p => onProgress({ type: 'progress', percent: Math.round(p.percent || 0), timemark: p.timemark }))
        .on('end', () => onComplete({ success: true, outputPath: outputFile }))
        .on('error', err => onError(err.message));
      break;
    }

    case 'watermark': {
      const ext = path.extname(input).slice(1) || 'mp4';
      outputFile = getOutputPath(input, outputFolder, 'watermarked', ext);
      const overlayPos = options.position || 'bottomright';
      const overlayMap = {
        topleft: '10:10',
        topright: 'W-w-10:10',
        bottomleft: '10:H-h-10',
        bottomright: 'W-w-10:H-h-10',
        center: '(W-w)/2:(H-h)/2',
      };
      cmd = ffmpeg(input)
        .input(options.watermarkPath)
        .complexFilter(`[0:v][1:v] overlay=${overlayMap[overlayPos] || overlayMap.bottomright}`)
        .output(outputFile)
        .on('progress', p => onProgress({ type: 'progress', percent: Math.round(p.percent || 0), timemark: p.timemark }))
        .on('end', () => onComplete({ success: true, outputPath: outputFile }))
        .on('error', err => onError(err.message));
      break;
    }

    case 'thumbnail': {
      outputFile = getOutputPath(input, outputFolder, 'thumb', 'png');
      const ts = options.timestamp || '00:00:05';
      onProgress({ type: 'progress', percent: 30 });
      cmd = ffmpeg(input)
        .seekInput(ts)
        .frames(1)
        .output(outputFile)
        .on('progress', () => onProgress({ type: 'progress', percent: 70 }))
        .on('end', () => onComplete({ success: true, outputPath: outputFile }))
        .on('error', err => onError(err.message));
      break;
    }

    default:
      return onError(`Unknown operation: ${operation}`);
  }

  if (cmd) {
    cmd.run();
  }
}

function timeToSeconds(time) {
  if (!time) return 0;
  const parts = time.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

module.exports = { runOperation };

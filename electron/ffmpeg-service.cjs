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

function runOperation({ jobId, operation, options, ffmpegPath, ffprobePath, outputFolder, onProgress, onComplete, onError }) {
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
      const ext = options.outputFormat || 'mp4';
      outputFile = getOutputPath(input, outputFolder, 'converted', ext);
      cmd = ffmpeg(input)
        .output(outputFile)
        .on('progress', p => onProgress({ type: 'progress', percent: Math.round(p.percent || 0), timemark: p.timemark }))
        .on('end', () => onComplete({ success: true, outputPath: outputFile }))
        .on('error', err => onError(err.message));
      if (options.videoCodec) cmd = cmd.videoCodec(options.videoCodec);
      if (options.audioCodec) cmd = cmd.audioCodec(options.audioCodec);
      break;
    }

    case 'compress': {
      const ext = path.extname(input).slice(1) || 'mp4';
      outputFile = getOutputPath(input, outputFolder, 'compressed', ext);
      const qualityMode = options.qualityMode || 'crf';
      const audioBitrateKbps = 128;

      // Build the command once we know the (possibly probed) duration.
      const buildAndRun = (durationSec) => {
        const outputOptions = ['-preset medium'];
        let modeNote = '';

        if (qualityMode === 'bitrate') {
          const kbps = Math.max(50, Math.floor(options.bitrateKbps || 2000));
          outputOptions.push(
            `-b:v ${kbps}k`,
            `-maxrate ${Math.floor(kbps * 1.5)}k`,
            `-bufsize ${kbps * 2}k`,
          );
          modeNote = `bitrate=${kbps}k`;
        } else if (qualityMode === 'filesize') {
          const targetMB = Math.max(1, Number(options.targetSizeMB) || 25);
          if (!durationSec || durationSec <= 0) {
            return onError('Could not determine video duration for target file size mode');
          }
          // Reserve ~5% headroom for container overhead, then subtract audio bitrate.
          const overheadFactor = 0.95;
          const totalKbps = (targetMB * 8 * 1024 * overheadFactor) / durationSec;
          const videoKbps = Math.max(50, Math.floor(totalKbps - audioBitrateKbps));
          outputOptions.push(
            `-b:v ${videoKbps}k`,
            `-maxrate ${Math.floor(videoKbps * 1.4)}k`,
            `-bufsize ${videoKbps * 2}k`,
          );
          modeNote = `target=${targetMB}MB → ${videoKbps}k video`;
        } else {
          const crf = options.quality !== undefined ? options.quality : 28;
          outputOptions.push(`-crf ${crf}`);
          modeNote = `crf=${crf}`;
        }

        const localCmd = ffmpeg(input)
          .output(outputFile)
          .videoCodec('libx264')
          .outputOptions(outputOptions)
          .audioCodec('aac')
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
      cmd = ffmpeg(input)
        .size(size)
        .output(outputFile)
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

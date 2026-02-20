'use strict';

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

function getOutputPath(inputFile, outputFolder, suffix, ext) {
  const base = path.basename(inputFile, path.extname(inputFile));
  const filename = `${base}_${suffix}.${ext}`;
  return path.join(outputFolder, filename);
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
      const crf = options.quality !== undefined ? options.quality : 28;
      cmd = ffmpeg(input)
        .output(outputFile)
        .videoCodec('libx264')
        .outputOptions([`-crf ${crf}`, '-preset medium'])
        .audioCodec('aac')
        .on('progress', p => onProgress({ type: 'progress', percent: Math.round(p.percent || 0), timemark: p.timemark }))
        .on('end', () => onComplete({ success: true, outputPath: outputFile }))
        .on('error', err => onError(err.message));
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
      cmd = ffmpeg(input)
        .setStartTime(options.startTime || '00:00:00')
        .setDuration(options.endTime ? undefined : options.duration)
        .output(outputFile)
        .on('progress', p => onProgress({ type: 'progress', percent: Math.round(p.percent || 0), timemark: p.timemark }))
        .on('end', () => onComplete({ success: true, outputPath: outputFile }))
        .on('error', err => onError(err.message));
      if (options.endTime) {
        cmd = cmd.setDuration(
          timeToSeconds(options.endTime) - timeToSeconds(options.startTime || '00:00:00')
        );
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
      cmd = ffmpeg(input)
        .screenshots({
          timestamps: [options.timestamp || '00:00:05'],
          filename: path.basename(outputFile),
          folder: outputFolder,
        })
        .on('end', () => onComplete({ success: true, outputPath: outputFile }))
        .on('error', err => onError(err.message));
      // No progress for screenshots
      onProgress({ type: 'progress', percent: 50 });
      cmd.run();
      return;
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

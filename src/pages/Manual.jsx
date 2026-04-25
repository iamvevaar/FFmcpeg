import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, FileAudio, Scissors, Maximize2, Droplets, Image, ArrowLeft, Zap, Globe, Crop, Sun } from 'lucide-react';
import DropZone from '../components/DropZone.jsx';
import TimelinePreview from '../components/TimelinePreview.jsx';
import useJobStore from '../stores/useJobStore.js';
import './Manual.css';

const TABS = [
    { id: 'convert', label: 'Convert', icon: Play },
    { id: 'compress', label: 'Compress', icon: Droplets },
    { id: 'extractAudio', label: 'Audio', icon: FileAudio },
    { id: 'trim', label: 'Trim', icon: Scissors },
    { id: 'resize', label: 'Resize', icon: Maximize2 },
    { id: 'transform', label: 'Transform', icon: Crop },
    { id: 'thumbnail', label: 'Thumbnail', icon: Image },
];

/** HandBrake-style containers: MP4/MKV = fast remux; WebM = VP9 + Opus transcode. */
const CONTAINERS = ['mp4', 'mkv', 'webm'];
const AUDIO_FORMATS = ['mp3', 'aac', 'wav', 'flac', 'm4a', 'ogg'];

function crfToPercent(crf) { return Math.round(100 - ((crf - 18) / (51 - 18)) * 100); }
function percentToCrf(pct) { return Math.round(18 + ((100 - pct) / 100) * (51 - 18)); }

/** Rough HDR detection from ffprobe video stream (BT.2020 + PQ/HLG or 10-bit). */
function describeHdrFromVideoStream(s) {
    if (!s) {
        return { isHdr: false, label: null, transfer: null, primaries: null, space: null, pixFmt: null };
    }
    const transfer = s.color_transfer;
    const primaries = s.color_primaries;
    const space = s.color_space;
    const pixFmt = s.pix_fmt || '';
    if (transfer === 'smpte2084') {
        return { isHdr: true, label: 'HDR10 (PQ)', transfer, primaries, space, pixFmt };
    }
    if (transfer === 'arib-std-b67') {
        return { isHdr: true, label: 'HLG', transfer, primaries, space, pixFmt };
    }
    if (transfer === 'smpte428') {
        return { isHdr: true, label: 'HDR', transfer, primaries, space, pixFmt };
    }
    if (/p10|10le|12le|14le|16le/i.test(pixFmt) && (space && space.includes('bt2020'))) {
        return { isHdr: true, label: 'HDR (10-bit / BT.2020)', transfer, primaries, space, pixFmt };
    }
    return { isHdr: false, label: null, transfer, primaries, space, pixFmt };
}

/** ffprobe avg_frame_rate like "30000/1001" → ~29.97 */
function parseAvgFrameRate(str) {
    if (!str || str === '0/0') return null;
    const parts = String(str).split('/');
    if (parts.length === 2) {
        const a = parseInt(parts[0], 10);
        const b = parseInt(parts[1], 10);
        if (b > 0) {
            const n = a / b;
            return Number.isFinite(n) && n > 0.01 ? n : null;
        }
    }
    const f = parseFloat(str);
    return Number.isFinite(f) && f > 0 ? f : null;
}

const ENCODER_SPEED_STEPS = [
    { value: 1, label: 'Fastest', sub: 'Quick' },
    { value: 2, label: 'Fast', sub: 'Short wait' },
    { value: 3, label: 'Balanced', sub: 'Default' },
    { value: 4, label: 'Slow', sub: 'Smaller' },
    { value: 5, label: 'Slowest', sub: 'Best' },
];

const FPS_OPTIONS = [
    { value: 'source', label: 'Same as source' },
    { value: '23.976', label: '23.976 (NTSC film)' },
    { value: '24', label: '24' },
    { value: '25', label: '25 (PAL)' },
    { value: '29.97', label: '29.97 (NTSC)' },
    { value: '30', label: '30' },
    { value: '50', label: '50' },
    { value: '60', label: '60' },
    { value: '120', label: '120' },
];

export default function Manual() {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [activeTab, setActiveTab] = useState('convert');
    const [running, setRunning] = useState(false);

    // Tab-specific state
    const [outputFormat, setOutputFormat] = useState('mp4');   // 'mp4' | 'mkv' | 'webm'
    const [webOptimized, setWebOptimized] = useState(true);     // +faststart, MP4 only
    const [audioFormat, setAudioFormat] = useState('mp3');
    const [quality, setQuality] = useState(70); // percent slider (CRF mode)
    const [compressMode, setCompressMode] = useState('crf'); // 'crf' | 'bitrate' | 'filesize'
    const [bitrateMbps, setBitrateMbps] = useState(5);       // for 'bitrate' mode
    const [targetSizeMB, setTargetSizeMB] = useState(25);    // for 'filesize' mode
    const [codec, setCodec] = useState('h264');              // 'h264' | 'h265' | 'av1' | 'vp9'
    const [useHardware, setUseHardware] = useState(false);
    const [encoders, setEncoders] = useState([]);            // available ffmpeg encoders
    const [encoderSpeed, setEncoderSpeed] = useState(3);       // 1 = fastest ... 5 = slowest
    const [startTime, setStartTime] = useState('00:00:00');
    const [endTime, setEndTime] = useState('00:00:30');
    const [trimStartSec, setTrimStartSec] = useState(0);
    const [trimEndSec, setTrimEndSec] = useState(30);
    const [videoDuration, setVideoDuration] = useState(null); // seconds from ffprobe
    const [resizeW, setResizeW] = useState(1280);
    const [resizeH, setResizeH] = useState(720);
    const [resolutionPreset, setResolutionPreset] = useState('1080p'); // '4k' | '1440p' | '1080p' | '720p' | '480p' | 'custom'
    const [dontUpscale, setDontUpscale] = useState(true);
    const [lockAspect, setLockAspect] = useState(true);
    const [sourceWidth, setSourceWidth] = useState(null);
    const [sourceHeight, setSourceHeight] = useState(null);
    const [sourceFps, setSourceFps] = useState(null);
    const [outputFps, setOutputFps] = useState('source');
    const [thumbTs, setThumbTs] = useState('00:00:05');
    const [thumbSec, setThumbSec] = useState(5);

    const [transformRotate, setTransformRotate] = useState(0);
    const [transformFlipH, setTransformFlipH] = useState(false);
    const [transformFlipV, setTransformFlipV] = useState(false);
    const [cropEnabled, setCropEnabled] = useState(false);
    const [cropX, setCropX] = useState(0);
    const [cropY, setCropY] = useState(0);
    const [cropW, setCropW] = useState(0);
    const [cropH, setCropH] = useState(0);
    const [transformError, setTransformError] = useState(false);
    const [hdrMeta, setHdrMeta] = useState(null);
    const [preserveHdr, setPreserveHdr] = useState(false);
    const [hdrCompressError, setHdrCompressError] = useState(false);

    const { addJob, updateJob } = useJobStore();
    const dropzoneRef = useRef();
    const [fileError, setFileError] = useState(false);

    // ── Encoder discovery ────────────────────────────────────────
    // Ask the main process which ffmpeg encoders exist on this machine
    // so we can show "Hardware accel (Apple GPU / NVENC / QSV)" only when
    // it'll actually work.
    useEffect(() => {
        window.ffmcp?.listEncoders?.().then(list => setEncoders(list || [])).catch(() => {});
    }, []);

    const HW_ENCODERS = useMemo(() => ({
        h264: ['h264_videotoolbox', 'h264_nvenc', 'h264_qsv', 'h264_amf'],
        h265: ['hevc_videotoolbox', 'hevc_nvenc', 'hevc_qsv', 'hevc_amf'],
        av1:  ['av1_nvenc', 'av1_qsv', 'av1_amf'],
        vp9:  [],
    }), []);

    const hwAvailableFor = (c) => (HW_ENCODERS[c] || []).some(enc => encoders.includes(enc));
    const hwLabelFor = (c) => {
        const found = (HW_ENCODERS[c] || []).find(enc => encoders.includes(enc));
        if (!found) return 'Hardware acceleration';
        if (found.endsWith('_videotoolbox')) return 'Apple GPU (VideoToolbox)';
        if (found.endsWith('_nvenc')) return 'NVIDIA GPU (NVENC)';
        if (found.endsWith('_qsv')) return 'Intel GPU (QSV)';
        if (found.endsWith('_amf')) return 'AMD GPU (AMF)';
        return 'Hardware acceleration';
    };

    const CODECS = useMemo(() => ([
        { id: 'h264', label: 'H.264',   sub: 'Universal' },
        { id: 'h265', label: 'H.265',   sub: 'Smaller, modern' },
        { id: 'av1',  label: 'AV1',     sub: 'Newest, smallest' },
        { id: 'vp9',  label: 'VP9',     sub: 'Web · WebM' },
    ]), []);

    // ── Resolution ladder ──────────────────────────────────────
    // Each preset = the SHORTER dimension's size in pixels. Landscape 1080p
    // → 1920×1080, portrait 1080p → 1080×1920. This matches how creators
    // think about resolution regardless of orientation.
    const RESOLUTION_PRESETS = useMemo(() => ([
        { id: '4k',     label: '4K',     short: 2160, sub: '3840 × 2160' },
        { id: '1440p',  label: '1440p',  short: 1440, sub: '2560 × 1440' },
        { id: '1080p',  label: '1080p',  short: 1080, sub: '1920 × 1080' },
        { id: '720p',   label: '720p',   short: 720,  sub: '1280 × 720' },
        { id: '480p',   label: '480p',   short: 480,  sub: '854 × 480' },
        { id: 'custom', label: 'Custom', short: null, sub: 'Set dimensions' },
    ]), []);

    // Compute target dims for a preset, respecting source aspect & orientation.
    // Always returns the *true* preset size (may be larger than source — i.e.
    // an upscale). The decision to actually upscale is made later by the
    // caller using the `isUpscale` flag + the `dontUpscale` user toggle.
    // Dims are rounded to even pixels (required by most h264/h265 encoders).
    const computeTargetSize = useCallback((srcW, srcH, shortLimit) => {
        if (!shortLimit) return null;
        if (!srcW || !srcH) {
            return { w: Math.round(shortLimit * 16 / 9 / 2) * 2, h: shortLimit, isUpscale: false };
        }
        const isPortrait = srcH > srcW;
        const sourceShort = isPortrait ? srcW : srcH;
        const scale = shortLimit / sourceShort; // > 1 → upscale, < 1 → downscale
        return {
            w: Math.max(2, Math.round(srcW * scale / 2) * 2),
            h: Math.max(2, Math.round(srcH * scale / 2) * 2),
            isUpscale: shortLimit > sourceShort,
        };
    }, []);

    // The dims that will actually be sent to ffmpeg, factoring in dontUpscale.
    const effectiveResize = useMemo(() => {
        if (resolutionPreset === 'custom') {
            const isUpscale = !!(sourceWidth && sourceHeight && (resizeW > sourceWidth || resizeH > sourceHeight));
            return { w: resizeW, h: resizeH, isUpscale };
        }
        const preset = RESOLUTION_PRESETS.find(p => p.id === resolutionPreset);
        if (!preset) return null;
        const target = computeTargetSize(sourceWidth, sourceHeight, preset.short);
        if (!target) return null;
        if (dontUpscale && target.isUpscale && sourceWidth && sourceHeight) {
            return { w: sourceWidth, h: sourceHeight, skipped: true, isUpscale: false };
        }
        return { w: target.w, h: target.h, isUpscale: target.isUpscale };
    }, [resolutionPreset, resizeW, resizeH, sourceWidth, sourceHeight, dontUpscale, computeTargetSize, RESOLUTION_PRESETS]);

    // ── Trim helpers ─────────────────────────────────────────────
    const secToHms = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
    };
    const hmsToSec = (hms) => {
        const parts = hms.split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return Number(hms) || 0;
    };
    const TRIM_MAX = videoDuration ?? 3600;

    // Dynamic hint labels (quarter-points of the actual duration)
    const trimHints = useCallback(() => {
        const max = TRIM_MAX;
        return [
            secToHms(0),
            secToHms(Math.round(max * 0.33)),
            secToHms(Math.round(max * 0.66)),
            secToHms(max),
        ];
    }, [TRIM_MAX]); // eslint-disable-line react-hooks/exhaustive-deps

    // Probe file duration + dimensions whenever a new file is picked.
    // Dimensions feed the resolution-ladder UI so it can compute target sizes
    // that respect the source's aspect ratio and orientation (portrait / landscape).
    const handleFileSelect = (path) => {
        setFile(path);
        setFileError(false);
        if (!path) {
            setVideoDuration(null);
            setSourceWidth(null);
            setSourceHeight(null);
            setSourceFps(null);
            setHdrMeta(null);
            setPreserveHdr(false);
            return;
        }
        window.ffmcp?.getMediaInfo(path).then(info => {
            const dur = Math.floor(parseFloat(info?.format?.duration) || 0);
            if (dur > 0) {
                setVideoDuration(dur);
                const defaultEnd = Math.min(30, dur);
                setTrimStartSec(0);
                setTrimEndSec(defaultEnd);
                setStartTime(secToHms(0));
                setEndTime(secToHms(defaultEnd));
            }
            const videoStream = (info?.streams || []).find(s => s.codec_type === 'video');
            const w = videoStream?.width;
            const h = videoStream?.height;
            if (w && h) {
                setSourceWidth(w);
                setSourceHeight(h);
            }
            const fpsN = parseAvgFrameRate(videoStream?.avg_frame_rate) || parseAvgFrameRate(videoStream?.r_frame_rate);
            setSourceFps(fpsN);
            const hm = describeHdrFromVideoStream(videoStream);
            setHdrMeta(hm);
            setPreserveHdr(!!hm.isHdr);
        }).catch(() => {
            setVideoDuration(null);
            setSourceWidth(null);
            setSourceHeight(null);
            setSourceFps(null);
            setHdrMeta(null);
            setPreserveHdr(false);
        });
    };

    const handleRun = async () => {
        if (!file) {
            setFileError(true);
            dropzoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => setFileError(false), 600);
            return;
        }

        if (activeTab === 'transform') {
            const hasR = (transformRotate % 360) !== 0;
            const hasF = transformFlipH || transformFlipV;
            const hasC = cropEnabled && cropW > 0 && cropH > 0;
            if (!hasR && !hasF && !hasC) {
                setTransformError(true);
                setTimeout(() => setTransformError(false), 4000);
                return;
            }
            if (hasC && sourceWidth && sourceHeight) {
                if (cropX < 0 || cropY < 0 || cropX + cropW > sourceWidth || cropY + cropH > sourceHeight) {
                    setTransformError(true);
                    setTimeout(() => setTransformError(false), 4000);
                    return;
                }
            }
        }

        if (activeTab === 'compress' && hdrMeta?.isHdr && preserveHdr) {
            if (codec !== 'h265' && codec !== 'av1') {
                setHdrCompressError(true);
                setTimeout(() => setHdrCompressError(false), 5000);
                return;
            }
        }

        setRunning(true);

        const compressLabel = (() => {
            let t = compressMode === 'bitrate'
                ? `Compress @ ${bitrateMbps} Mbps`
                : compressMode === 'filesize'
                    ? `Compress to ${targetSizeMB} MB`
                    : `Compress (${quality}% quality)`;
            if (encoderSpeed !== 3) t += ` · step ${encoderSpeed}/5`;
            if (outputFps !== 'source') t += ` · ${outputFps} fps`;
            if (hdrMeta?.isHdr && preserveHdr) t += ' · HDR';
            return t;
        })();

        const resizeFinal = effectiveResize || { w: resizeW, h: resizeH };
        const resizeLabel = (() => {
            const base = resolutionPreset === 'custom'
                ? `Resize ${resizeFinal.w}×${resizeFinal.h}`
                : `Resize → ${resolutionPreset.toUpperCase()} (${resizeFinal.w}×${resizeFinal.h})`;
            if (outputFps !== 'source') return `${base} · ${outputFps} fps`;
            return base;
        })();

        const convertLabel = outputFormat === 'mp4' && webOptimized
            ? 'Convert → MP4 (web-optimized)'
            : `Convert → ${outputFormat.toUpperCase()}`;

        const transformLabel = (() => {
            const p = ['Transform'];
            if ((transformRotate % 360) !== 0) p.push(`${transformRotate}°`);
            if (transformFlipH) p.push('flip H');
            if (transformFlipV) p.push('flip V');
            if (cropEnabled && cropW > 0 && cropH > 0) p.push(`crop ${cropW}×${cropH}`);
            return p.join(' · ');
        })();

        const opLabels = {
            convert: convertLabel,
            compress: compressLabel,
            extractAudio: `Extract Audio → ${audioFormat.toUpperCase()}`,
            trim: `Trim ${startTime} → ${endTime}`,
            resize: resizeLabel,
            transform: transformLabel,
            thumbnail: `Thumbnail at ${thumbTs}`,
        };

        const compressOptions = (() => {
            const base = { inputPath: file, codec, useHardware: useHardware && hwAvailableFor(codec), encoderSpeed };
            if (outputFps !== 'source') base.outputFps = outputFps;
            if (hdrMeta?.isHdr && preserveHdr) {
                base.preserveHdr = true;
                base.colorTransfer = hdrMeta.transfer;
                base.colorPrimaries = hdrMeta.primaries;
                base.colorSpace = hdrMeta.space;
                base.pixFmtIn = hdrMeta.pixFmt;
            }
            if (compressMode === 'bitrate') {
                return { ...base, qualityMode: 'bitrate', bitrateKbps: Math.round(bitrateMbps * 1000) };
            }
            if (compressMode === 'filesize') {
                return {
                    ...base,
                    qualityMode: 'filesize',
                    targetSizeMB,
                    durationSec: videoDuration || undefined,
                };
            }
            return { ...base, qualityMode: 'crf', qualityPercent: quality };
        })();

        const opOptions = {
            convert: { inputPath: file, outputFormat, webOptimized: outputFormat === 'mp4' ? webOptimized : false },
            compress: compressOptions,
            extractAudio: { inputPath: file, audioFormat },
            trim: { inputPath: file, startTime, endTime },
            resize: { inputPath: file, width: resizeFinal.w, height: resizeFinal.h, ...(outputFps !== 'source' ? { outputFps } : {}) },
            transform: {
                inputPath: file,
                rotate: transformRotate,
                flipH: transformFlipH,
                flipV: transformFlipV,
                cropW: cropEnabled ? cropW : 0,
                cropH: cropEnabled ? cropH : 0,
                cropX: cropEnabled ? cropX : 0,
                cropY: cropEnabled ? cropY : 0,
            },
            thumbnail: { inputPath: file, timestamp: thumbTs },
        };

        const jobId = addJob(activeTab, opLabels[activeTab], file);
        updateJob(jobId, { status: 'running', progress: 0 });

        try {
            const result = await window.ffmcp.runOperation(jobId, activeTab, opOptions[activeTab]);
            updateJob(jobId, { status: 'done', progress: 100, outputPath: result.outputPath });
        } catch (err) {
            updateJob(jobId, { status: 'error', error: err.message || String(err) });
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="manual-page">
            <div className="page-container">
                {/* Header */}
                <div className="page-header animate-fade">
                    <button className="page-back-btn" onClick={() => navigate('/')} aria-label="Go back">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="page-title">Manual Mode</h1>
                        <p className="page-sub">Full control over your media processing tasks</p>
                    </div>
                </div>

                <div className="manual-body">
                    {/* Left: File + Tabs */}
                    <div className="manual-left animate-fade">
                        <section>
                            <label className="label">Input File</label>
                            <DropZone
                                file={file}
                                onFile={handleFileSelect}
                                onClear={() => {
                                    setFile(null);
                                    setVideoDuration(null);
                                    setSourceWidth(null);
                                    setSourceHeight(null);
                                    setSourceFps(null);
                                    setHdrMeta(null);
                                    setPreserveHdr(false);
                                }}
                                error={fileError}
                                dropzoneRef={dropzoneRef}
                            />
                        </section>

                        <section>
                            <label className="label">Operation</label>
                            <div className="tab-bar">
                                {TABS.map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        className={`tab-btn${activeTab === id ? ' active' : ''}`}
                                        onClick={() => setActiveTab(id)}
                                    >
                                        <Icon size={14} />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Operation panels */}
                        <div className="op-panel animate-fade" key={activeTab}>
                            {activeTab === 'convert' && (
                                <div className="field-group">
                                    <label className="label">Container</label>
                                    <div className="codec-grid container-grid">
                                        {CONTAINERS.map(f => (
                                            <button
                                                key={f}
                                                type="button"
                                                className={`codec-card${outputFormat === f ? ' active' : ''}`}
                                                onClick={() => setOutputFormat(f)}
                                            >
                                                <span className="codec-card-label">.{f}</span>
                                                <span className="codec-card-sub">
                                                    {f === 'mp4' && 'Broadest compatibility'}
                                                    {f === 'mkv' && 'No re-encode · Matroska'}
                                                    {f === 'webm' && 'Web · VP9 + Opus'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    {outputFormat === 'mp4' && (
                                        <button
                                            type="button"
                                            className={`hw-toggle${webOptimized ? ' active' : ''}`}
                                            onClick={() => setWebOptimized(v => !v)}
                                        >
                                            <span className="hw-toggle-icon">
                                                <Globe size={14} />
                                            </span>
                                            <span className="hw-toggle-text">
                                                <strong>Web-optimized (fast start)</strong>
                                                <span>Moves metadata to the start for streaming (YouTube, browsers)</span>
                                            </span>
                                            <span className={`hw-toggle-switch${webOptimized ? ' on' : ''}`}>
                                                <span className="hw-toggle-knob" />
                                            </span>
                                        </button>
                                    )}
                                    {outputFormat === 'mkv' && (
                                        <p className="field-note">Remuxes streams without re-encoding when possible. No MP4 &quot;fast start&quot; — that&apos;s a different container model.</p>
                                    )}
                                    {outputFormat === 'webm' && (
                                        <p className="field-note">Re-encodes video to VP9 and audio to Opus (required for a standards-compliant .webm).</p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'compress' && (
                                <div className="field-group">
                                    <label className="label">Codec</label>
                                    <div className="codec-grid">
                                        {CODECS.map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                className={`codec-card${codec === c.id ? ' active' : ''}`}
                                                onClick={() => {
                                                    setCodec(c.id);
                                                    if (!hwAvailableFor(c.id)) setUseHardware(false);
                                                }}
                                            >
                                                <span className="codec-card-label">{c.label}</span>
                                                <span className="codec-card-sub">{c.sub}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {hwAvailableFor(codec) && (
                                        <button
                                            type="button"
                                            className={`hw-toggle${useHardware ? ' active' : ''}`}
                                            onClick={() => setUseHardware(v => !v)}
                                        >
                                            <span className="hw-toggle-icon">
                                                <Zap size={14} fill={useHardware ? 'currentColor' : 'none'} />
                                            </span>
                                            <span className="hw-toggle-text">
                                                <strong>{hwLabelFor(codec)}</strong>
                                                <span>Faster encoding · slightly larger files</span>
                                            </span>
                                            <span className={`hw-toggle-switch${useHardware ? ' on' : ''}`}>
                                                <span className="hw-toggle-knob" />
                                            </span>
                                        </button>
                                    )}

                                    {hdrMeta?.isHdr && (
                                        <div style={{ marginTop: 14 }}>
                                            {hdrCompressError && (
                                                <p className="field-note transform-error">To preserve HDR, pick <strong>H.265</strong> or <strong>AV1</strong> (not H.264 or VP9).</p>
                                            )}
                                            <div className="resize-info">
                                                <div className="resize-info-row">
                                                    <span className="resize-info-label">Detected</span>
                                                    <span className="resize-info-value resize-info-output">{hdrMeta.label}</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className={`hw-toggle${preserveHdr ? ' active' : ''}`}
                                                onClick={() => setPreserveHdr(v => !v)}
                                            >
                                                <span className="hw-toggle-icon">
                                                    <Sun size={14} />
                                                </span>
                                                <span className="hw-toggle-text">
                                                    <strong>Preserve HDR when compressing</strong>
                                                    <span>10-bit output and color metadata where the encoder supports it</span>
                                                </span>
                                                <span className={`hw-toggle-switch${preserveHdr ? ' on' : ''}`}>
                                                    <span className="hw-toggle-knob" />
                                                </span>
                                            </button>
                                            {preserveHdr && (codec === 'h264' || codec === 'vp9') && (
                                                <p className="field-note transform-error">Switch codec to H.265 or AV1 for HDR, or turn Preserve HDR off.</p>
                                            )}
                                        </div>
                                    )}

                                    <label className="label" style={{ marginTop: 14 }}>Encoding speed</label>
                                    <p className="field-note" style={{ marginTop: 4, marginBottom: 8 }}>1 = fastest, 5 = slowest. Slower encodes are often a bit smaller for the same quality.</p>
                                    <div className="codec-grid speed-grid">
                                        {ENCODER_SPEED_STEPS.map(({ value, label, sub }) => (
                                            <button
                                                key={value}
                                                type="button"
                                                className={`codec-card${encoderSpeed === value ? ' active' : ''}`}
                                                onClick={() => setEncoderSpeed(value)}
                                            >
                                                <span className="codec-card-label">{label}</span>
                                                <span className="codec-card-sub">Step {value} — {sub}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <label className="label" style={{ marginTop: 14 }}>Compression Mode</label>
                                    <div className="tab-bar">
                                        {[
                                            { id: 'crf', label: 'Quality' },
                                            { id: 'bitrate', label: 'Bitrate' },
                                            { id: 'filesize', label: 'Target Size' },
                                        ].map(({ id, label }) => (
                                            <button
                                                key={id}
                                                className={`tab-btn${compressMode === id ? ' active' : ''}`}
                                                onClick={() => setCompressMode(id)}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>

                                    {compressMode === 'crf' && (
                                        <div className="field-group" style={{ marginTop: 12 }}>
                                            <div className="slider-header">
                                                <label className="label">Quality</label>
                                                <span className="slider-value">{quality}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={10} max={100}
                                                value={quality}
                                                onChange={e => setQuality(+e.target.value)}
                                            />
                                            <div className="slider-hints">
                                                <span>Smaller file</span>
                                                <span>Higher quality</span>
                                            </div>
                                            <p className="field-note">
                                                CRF {percentToCrf(quality)} · {quality >= 80 ? 'Visually lossless' : quality >= 60 ? 'Good balance' : quality >= 40 ? 'Compressed' : 'Highly compressed'}
                                            </p>
                                        </div>
                                    )}

                                    {compressMode === 'bitrate' && (
                                        <div className="field-group" style={{ marginTop: 12 }}>
                                            <div className="slider-header">
                                                <label className="label">Video Bitrate</label>
                                                <span className="slider-value" style={{ fontSize: 22 }}>{bitrateMbps.toFixed(1)} Mbps</span>
                                            </div>
                                            <input
                                                className="input"
                                                type="number"
                                                min={0.1} max={50} step={0.1}
                                                value={bitrateMbps}
                                                onChange={e => setBitrateMbps(Math.max(0.1, Math.min(50, parseFloat(e.target.value) || 0.1)))}
                                            />
                                            <input
                                                type="range"
                                                min={0.5} max={50} step={0.1}
                                                value={bitrateMbps}
                                                onChange={e => setBitrateMbps(parseFloat(e.target.value))}
                                            />
                                            <div className="slider-hints">
                                                <span>0.5 Mbps</span>
                                                <span>10 Mbps</span>
                                                <span>25 Mbps</span>
                                                <span>50 Mbps</span>
                                            </div>
                                            <p className="field-note">
                                                {videoDuration
                                                    ? `Estimated output size: ~${((bitrateMbps + 0.128) * videoDuration / 8).toFixed(1)} MB`
                                                    : 'Add a file to see estimated size'}
                                            </p>
                                        </div>
                                    )}

                                    {compressMode === 'filesize' && (
                                        <div className="field-group" style={{ marginTop: 12 }}>
                                            <div className="slider-header">
                                                <label className="label">Target File Size</label>
                                                <span className="slider-value" style={{ fontSize: 22 }}>{targetSizeMB} MB</span>
                                            </div>
                                            <input
                                                className="input"
                                                type="number"
                                                min={1} max={2000} step={1}
                                                value={targetSizeMB}
                                                onChange={e => setTargetSizeMB(Math.max(1, Math.min(2000, parseInt(e.target.value, 10) || 1)))}
                                            />
                                            <input
                                                type="range"
                                                min={1} max={500} step={1}
                                                value={Math.min(targetSizeMB, 500)}
                                                onChange={e => setTargetSizeMB(+e.target.value)}
                                            />
                                            <div className="slider-hints">
                                                <span>WhatsApp 16</span>
                                                <span>Discord 25</span>
                                                <span>Email 100</span>
                                                <span>500 MB</span>
                                            </div>
                                            {videoDuration ? (() => {
                                                const totalKbps = (targetSizeMB * 8 * 1024 * 0.95) / videoDuration;
                                                const videoKbps = Math.max(50, Math.floor(totalKbps - 128));
                                                const tooSmall = videoKbps <= 100;
                                                return (
                                                    <p className="field-note" style={tooSmall ? { color: '#B42318' } : undefined}>
                                                        {tooSmall
                                                            ? `Target too small for ${secToHms(videoDuration)} of video — output will be very low quality`
                                                            : `Will encode at ~${(videoKbps / 1000).toFixed(1)} Mbps video + 128 kbps audio (over ${secToHms(videoDuration)})`}
                                                    </p>
                                                );
                                            })() : (
                                                <p className="field-note">Add a file to see encoding estimate</p>
                                            )}
                                        </div>
                                    )}

                                    <label className="label" style={{ marginTop: 16 }}>Frame rate</label>
                                    <select
                                        className="input select"
                                        value={outputFps}
                                        onChange={e => setOutputFps(e.target.value)}
                                        aria-label="Output frame rate"
                                    >
                                        {FPS_OPTIONS.map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                    <p className="field-note">
                                        {sourceFps != null
                                            ? `Source ~${sourceFps < 100 ? sourceFps.toFixed(2) : Math.round(sourceFps)} fps · ${outputFps === 'source' ? 'output matches input' : `output ${outputFps} fps (may duplicate or drop frames)`}.`
                                            : (outputFps === 'source'
                                                ? 'Uses the file’s frame rate after a file is loaded.'
                                                : `Output will be ${outputFps} fps.`)}
                                    </p>
                                </div>
                            )}

                            {activeTab === 'extractAudio' && (
                                <div className="field-group">
                                    <label className="label">Audio Format</label>
                                    <div className="tab-bar">
                                        {AUDIO_FORMATS.map(f => (
                                            <button
                                                key={f}
                                                className={`tab-btn${audioFormat === f ? ' active' : ''}`}
                                                onClick={() => setAudioFormat(f)}
                                            >
                                                {f.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'trim' && (
                                <div className="field-row">
                                    {/* Start Time */}
                                    <div className="field-group">
                                        <div className="slider-header">
                                            <label className="label">Start Time</label>
                                            <span className="slider-value" style={{ fontSize: 14 }}>{startTime}</span>
                                        </div>
                                        <input
                                            className="input"
                                            type="text"
                                            placeholder="00:00:00"
                                            value={startTime}
                                            onChange={e => {
                                                setStartTime(e.target.value);
                                                const s = hmsToSec(e.target.value);
                                                if (!isNaN(s)) setTrimStartSec(Math.min(s, trimEndSec - 1));
                                            }}
                                        />
                                        <TimelinePreview
                                            file={file}
                                            min={0}
                                            max={TRIM_MAX}
                                            step={1}
                                            value={trimStartSec}
                                            onChange={(v) => {
                                                const s = Math.min(v, trimEndSec - 1);
                                                setTrimStartSec(s);
                                                setStartTime(secToHms(s));
                                            }}
                                        />
                                        <div className="slider-hints">
                                            {trimHints().map((h, i) => <span key={i}>{h}</span>)}
                                        </div>
                                    </div>

                                    {/* End Time */}
                                    <div className="field-group">
                                        <div className="slider-header">
                                            <label className="label">End Time</label>
                                            <span className="slider-value" style={{ fontSize: 14 }}>{endTime}</span>
                                        </div>
                                        <input
                                            className="input"
                                            type="text"
                                            placeholder="00:01:00"
                                            value={endTime}
                                            onChange={e => {
                                                setEndTime(e.target.value);
                                                const s = hmsToSec(e.target.value);
                                                if (!isNaN(s)) setTrimEndSec(Math.max(s, trimStartSec + 1));
                                            }}
                                        />
                                        <TimelinePreview
                                            file={file}
                                            min={0}
                                            max={TRIM_MAX}
                                            step={1}
                                            value={trimEndSec}
                                            onChange={(v) => {
                                                const s = Math.max(v, trimStartSec + 1);
                                                setTrimEndSec(s);
                                                setEndTime(secToHms(s));
                                            }}
                                        />
                                        <div className="slider-hints">
                                            {trimHints().map((h, i) => <span key={i}>{h}</span>)}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'resize' && (
                                <div className="field-group">
                                    <label className="label">Resolution</label>
                                    <div className="codec-grid resolution-grid">
                                        {RESOLUTION_PRESETS.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                className={`codec-card${resolutionPreset === p.id ? ' active' : ''}`}
                                                onClick={() => setResolutionPreset(p.id)}
                                            >
                                                <span className="codec-card-label">{p.label}</span>
                                                <span className="codec-card-sub">{p.sub}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Source info + computed output */}
                                    {sourceWidth && sourceHeight ? (
                                        <div className="resize-info">
                                            <div className="resize-info-row">
                                                <span className="resize-info-label">Source</span>
                                                <span className="resize-info-value">
                                                    {sourceWidth} × {sourceHeight}
                                                    {sourceHeight > sourceWidth ? ' · Portrait' : sourceHeight === sourceWidth ? ' · Square' : ' · Landscape'}
                                                </span>
                                            </div>
                                            {effectiveResize && (
                                                <div className="resize-info-row">
                                                    <span className="resize-info-label">Output</span>
                                                    <span className="resize-info-value resize-info-output">
                                                        {effectiveResize.w} × {effectiveResize.h}
                                                        {effectiveResize.skipped && ' · Source kept (no upscale)'}
                                                        {effectiveResize.isUpscale && !effectiveResize.skipped && ' · Upscaling'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="field-note">Add a file to see exact output dimensions for the chosen preset.</p>
                                    )}

                                    {/* Don't upscale toggle (only meaningful for non-Custom) */}
                                    {resolutionPreset !== 'custom' && (
                                        <button
                                            type="button"
                                            className={`hw-toggle${dontUpscale ? ' active' : ''}`}
                                            onClick={() => setDontUpscale(v => !v)}
                                        >
                                            <span className="hw-toggle-icon">
                                                <Maximize2 size={14} />
                                            </span>
                                            <span className="hw-toggle-text">
                                                <strong>Don't upscale source</strong>
                                                <span>Keep source size if it's already smaller than the chosen preset</span>
                                            </span>
                                            <span className={`hw-toggle-switch${dontUpscale ? ' on' : ''}`}>
                                                <span className="hw-toggle-knob" />
                                            </span>
                                        </button>
                                    )}

                                    {/* Custom W × H controls */}
                                    {resolutionPreset === 'custom' && (
                                        <>
                                            <button
                                                type="button"
                                                className={`hw-toggle${lockAspect ? ' active' : ''}`}
                                                onClick={() => setLockAspect(v => !v)}
                                                style={{ marginTop: 8 }}
                                            >
                                                <span className="hw-toggle-icon">
                                                    <Maximize2 size={14} />
                                                </span>
                                                <span className="hw-toggle-text">
                                                    <strong>Lock aspect ratio</strong>
                                                    <span>Adjust height automatically when width changes</span>
                                                </span>
                                                <span className={`hw-toggle-switch${lockAspect ? ' on' : ''}`}>
                                                    <span className="hw-toggle-knob" />
                                                </span>
                                            </button>

                                            <div className="field-row" style={{ marginTop: 12 }}>
                                                <div className="field-group">
                                                    <div className="slider-header">
                                                        <label className="label">Width (px)</label>
                                                        <span className="slider-value">{resizeW}</span>
                                                    </div>
                                                    <input
                                                        className="input"
                                                        type="number"
                                                        min={64} max={7680} step={2}
                                                        value={resizeW}
                                                        onChange={e => {
                                                            const newW = Math.min(7680, Math.max(64, +e.target.value || 64));
                                                            setResizeW(newW);
                                                            if (lockAspect && sourceWidth && sourceHeight) {
                                                                setResizeH(Math.max(2, Math.round(newW * sourceHeight / sourceWidth / 2) * 2));
                                                            }
                                                        }}
                                                    />
                                                    <input
                                                        type="range"
                                                        min={64} max={7680} step={2}
                                                        value={resizeW}
                                                        onChange={e => {
                                                            const newW = +e.target.value;
                                                            setResizeW(newW);
                                                            if (lockAspect && sourceWidth && sourceHeight) {
                                                                setResizeH(Math.max(2, Math.round(newW * sourceHeight / sourceWidth / 2) * 2));
                                                            }
                                                        }}
                                                    />
                                                </div>

                                                <div className="field-group">
                                                    <div className="slider-header">
                                                        <label className="label">Height (px)</label>
                                                        <span className="slider-value">{resizeH}</span>
                                                    </div>
                                                    <input
                                                        className="input"
                                                        type="number"
                                                        min={64} max={4320} step={2}
                                                        value={resizeH}
                                                        onChange={e => {
                                                            const newH = Math.min(4320, Math.max(64, +e.target.value || 64));
                                                            setResizeH(newH);
                                                            if (lockAspect && sourceWidth && sourceHeight) {
                                                                setResizeW(Math.max(2, Math.round(newH * sourceWidth / sourceHeight / 2) * 2));
                                                            }
                                                        }}
                                                    />
                                                    <input
                                                        type="range"
                                                        min={64} max={4320} step={2}
                                                        value={resizeH}
                                                        onChange={e => {
                                                            const newH = +e.target.value;
                                                            setResizeH(newH);
                                                            if (lockAspect && sourceWidth && sourceHeight) {
                                                                setResizeW(Math.max(2, Math.round(newH * sourceWidth / sourceHeight / 2) * 2));
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <label className="label" style={{ marginTop: 16 }}>Frame rate</label>
                                    <select
                                        className="input select"
                                        value={outputFps}
                                        onChange={e => setOutputFps(e.target.value)}
                                        aria-label="Output frame rate for resize"
                                    >
                                        {FPS_OPTIONS.map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                    <p className="field-note">
                                        {sourceFps != null
                                            ? `Source ~${sourceFps < 100 ? sourceFps.toFixed(2) : Math.round(sourceFps)} fps · ${outputFps === 'source' ? 'keeps source timing' : `re-times to ${outputFps} fps`}.`
                                            : (outputFps === 'source'
                                                ? 'Keeps the file’s frame rate when loaded.'
                                                : `Output ${outputFps} fps.`)}
                                    </p>
                                </div>
                            )}

                            {activeTab === 'transform' && (
                                <div className="field-group">
                                    {transformError && (
                                        <p className="field-note transform-error">
                                            Pick rotation, a flip, and/or a valid crop (width &amp; height). Crop must sit inside the source frame.
                                        </p>
                                    )}
                                    <label className="label">Rotate (clockwise)</label>
                                    <div className="tab-bar" style={{ flexWrap: 'wrap' }}>
                                        {[0, 90, 180, 270].map((deg) => (
                                            <button
                                                key={deg}
                                                type="button"
                                                className={`tab-btn${transformRotate === deg ? ' active' : ''}`}
                                                onClick={() => setTransformRotate(deg)}
                                            >
                                                {deg === 0 ? 'None' : `${deg}°`}
                                            </button>
                                        ))}
                                    </div>
                                    <label className="label" style={{ marginTop: 14 }}>Flip</label>
                                    <div className="tab-bar">
                                        <button
                                            type="button"
                                            className={`tab-btn${transformFlipH ? ' active' : ''}`}
                                            onClick={() => setTransformFlipH(v => !v)}
                                        >
                                            Horizontal
                                        </button>
                                        <button
                                            type="button"
                                            className={`tab-btn${transformFlipV ? ' active' : ''}`}
                                            onClick={() => setTransformFlipV(v => !v)}
                                        >
                                            Vertical
                                        </button>
                                    </div>
                                    <label className="label" style={{ marginTop: 14 }}>Crop (pixels)</label>
                                    <button
                                        type="button"
                                        className={`tab-btn${cropEnabled ? ' active' : ''}`}
                                        style={{ width: '100%', justifyContent: 'center' }}
                                        onClick={() => {
                                            if (!cropEnabled && sourceWidth && sourceHeight) {
                                                setCropX(0);
                                                setCropY(0);
                                                setCropW(sourceWidth);
                                                setCropH(sourceHeight);
                                            }
                                            setCropEnabled(c => !c);
                                        }}
                                    >
                                        {cropEnabled ? 'Crop on · edit region below' : 'Enable crop (optional)'}
                                    </button>
                                    <p className="field-note" style={{ marginTop: 6 }}>From top-left; must fit inside the source size when a file is probed.</p>
                                    {cropEnabled && (
                                        <div className="field-row" style={{ marginTop: 12 }}>
                                            <div className="field-group">
                                                <label className="label">Left (X)</label>
                                                <input
                                                    className="input"
                                                    type="number"
                                                    min={0}
                                                    max={sourceWidth || 8000}
                                                    value={cropX}
                                                    onChange={e => setCropX(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                                />
                                            </div>
                                            <div className="field-group">
                                                <label className="label">Top (Y)</label>
                                                <input
                                                    className="input"
                                                    type="number"
                                                    min={0}
                                                    max={sourceHeight || 8000}
                                                    value={cropY}
                                                    onChange={e => setCropY(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {cropEnabled && (
                                        <div className="field-row">
                                            <div className="field-group">
                                                <label className="label">Width</label>
                                                <input
                                                    className="input"
                                                    type="number"
                                                    min={2}
                                                    max={sourceWidth || 8000}
                                                    value={cropW}
                                                    onChange={e => setCropW(Math.max(2, parseInt(e.target.value, 10) || 2))}
                                                />
                                            </div>
                                            <div className="field-group">
                                                <label className="label">Height</label>
                                                <input
                                                    className="input"
                                                    type="number"
                                                    min={2}
                                                    max={sourceHeight || 8000}
                                                    value={cropH}
                                                    onChange={e => setCropH(Math.max(2, parseInt(e.target.value, 10) || 2))}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <p className="field-note">Re-encodes with H.264; audio is copied. WebM sources are saved as MP4.</p>
                                </div>
                            )}


                            {activeTab === 'thumbnail' && (
                                <div className="field-group">
                                    <div className="slider-header">
                                        <label className="label">Timestamp</label>
                                        <span className="slider-value" style={{ fontSize: 14 }}>{thumbTs}</span>
                                    </div>
                                    <input
                                        className="input"
                                        type="text"
                                        placeholder="00:00:05"
                                        value={thumbTs}
                                        onChange={e => {
                                            setThumbTs(e.target.value);
                                            const s = hmsToSec(e.target.value);
                                            if (!isNaN(s)) setThumbSec(Math.min(s, videoDuration ?? 3600));
                                        }}
                                    />
                                    <TimelinePreview
                                        file={file}
                                        min={0}
                                        max={videoDuration ?? 3600}
                                        step={1}
                                        value={thumbSec}
                                        onChange={(s) => {
                                            setThumbSec(s);
                                            setThumbTs(secToHms(s));
                                        }}
                                    />
                                    <div className="slider-hints">
                                        {trimHints().map((h, i) => <span key={i}>{h}</span>)}
                                    </div>
                                    {!videoDuration && (
                                        <p className="field-note">Select a file to get the exact video duration range</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            className="btn btn-primary run-btn"
                            onClick={handleRun}
                            disabled={running}
                        >
                            {running ? (
                                <><span className="spinner" style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Processing...</>
                            ) : (
                                <><Play size={16} fill="currentColor" /> Run Operation</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

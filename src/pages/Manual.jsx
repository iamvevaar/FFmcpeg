import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, FileAudio, Scissors, Maximize2, Droplets, Image, ArrowLeft } from 'lucide-react';
import DropZone from '../components/DropZone.jsx';
import useJobStore from '../stores/useJobStore.js';
import './Manual.css';

const TABS = [
    { id: 'convert', label: 'Convert', icon: Play },
    { id: 'compress', label: 'Compress', icon: Droplets },
    { id: 'extractAudio', label: 'Audio', icon: FileAudio },
    { id: 'trim', label: 'Trim', icon: Scissors },
    { id: 'resize', label: 'Resize', icon: Maximize2 },
    { id: 'thumbnail', label: 'Thumbnail', icon: Image },
];

const VIDEO_FORMATS = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'ts'];
const AUDIO_FORMATS = ['mp3', 'aac', 'wav', 'flac', 'm4a', 'ogg'];

function crfToPercent(crf) { return Math.round(100 - ((crf - 18) / (51 - 18)) * 100); }
function percentToCrf(pct) { return Math.round(18 + ((100 - pct) / 100) * (51 - 18)); }

export default function Manual() {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [activeTab, setActiveTab] = useState('convert');
    const [running, setRunning] = useState(false);

    // Tab-specific state
    const [outputFormat, setOutputFormat] = useState('mp4');
    const [audioFormat, setAudioFormat] = useState('mp3');
    const [quality, setQuality] = useState(70); // percent slider
    const [startTime, setStartTime] = useState('00:00:00');
    const [endTime, setEndTime] = useState('00:00:30');
    const [trimStartSec, setTrimStartSec] = useState(0);
    const [trimEndSec, setTrimEndSec] = useState(30);
    const [videoDuration, setVideoDuration] = useState(null); // seconds from ffprobe
    const [resizeW, setResizeW] = useState(1280);
    const [resizeH, setResizeH] = useState(720);
    const [thumbTs, setThumbTs] = useState('00:00:05');
    const [thumbSec, setThumbSec] = useState(5);

    const { addJob, updateJob } = useJobStore();
    const dropzoneRef = useRef();
    const [fileError, setFileError] = useState(false);

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

    // Probe file duration whenever a new file is picked
    const handleFileSelect = (path) => {
        setFile(path);
        setFileError(false);
        if (!path) { setVideoDuration(null); return; }
        window.ffmcp?.getMediaInfo(path).then(info => {
            const dur = Math.floor(parseFloat(info?.format?.duration) || 0);
            if (dur > 0) {
                setVideoDuration(dur);
                // Reset trim points sensibly for the new file
                const defaultEnd = Math.min(30, dur);
                setTrimStartSec(0);
                setTrimEndSec(defaultEnd);
                setStartTime(secToHms(0));
                setEndTime(secToHms(defaultEnd));
            }
        }).catch(() => setVideoDuration(null));
    };

    const handleRun = async () => {
        if (!file) {
            setFileError(true);
            dropzoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => setFileError(false), 600);
            return;
        }
        setRunning(true);

        const opLabels = {
            convert: `Convert → ${outputFormat.toUpperCase()}`,
            compress: `Compress (${quality}% quality)`,
            extractAudio: `Extract Audio → ${audioFormat.toUpperCase()}`,
            trim: `Trim ${startTime} → ${endTime}`,
            resize: `Resize ${resizeW}×${resizeH}`,
            thumbnail: `Thumbnail at ${thumbTs}`,
        };

        const opOptions = {
            convert: { inputPath: file, outputFormat },
            compress: { inputPath: file, quality: percentToCrf(quality) },
            extractAudio: { inputPath: file, audioFormat },
            trim: { inputPath: file, startTime, endTime },
            resize: { inputPath: file, width: resizeW, height: resizeH },
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
                                onClear={() => { setFile(null); setVideoDuration(null); }}
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
                                    <label className="label">Video</label>
                                    <div className="tab-bar">
                                        {VIDEO_FORMATS.map(f => (
                                            <button
                                                key={f}
                                                className={`tab-btn${outputFormat === f ? ' active' : ''}`}
                                                onClick={() => setOutputFormat(f)}
                                            >
                                                {f.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                    <label className="label" style={{ marginTop: 10 }}>Audio</label>
                                    <div className="tab-bar">
                                        {AUDIO_FORMATS.map(f => (
                                            <button
                                                key={f}
                                                className={`tab-btn${outputFormat === f ? ' active' : ''}`}
                                                onClick={() => setOutputFormat(f)}
                                            >
                                                {f.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'compress' && (
                                <div className="field-group">
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
                                    <p className="field-note">CRF {percentToCrf(quality)} · {quality >= 80 ? 'Visually lossless' : quality >= 60 ? 'Good balance' : quality >= 40 ? 'Compressed' : 'Highly compressed'}</p>
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
                                        <input
                                            type="range"
                                            min={0} max={TRIM_MAX} step={1}
                                            value={trimStartSec}
                                            onChange={e => {
                                                const s = Math.min(+e.target.value, trimEndSec - 1);
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
                                        <input
                                            type="range"
                                            min={0} max={TRIM_MAX} step={1}
                                            value={trimEndSec}
                                            onChange={e => {
                                                const s = Math.max(+e.target.value, trimStartSec + 1);
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
                                <div className="field-row">
                                    {/* Width */}
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
                                            onChange={e => setResizeW(Math.min(7680, Math.max(64, +e.target.value || 64)))}
                                        />
                                        <input
                                            type="range"
                                            min={64} max={7680} step={2}
                                            value={resizeW}
                                            onChange={e => setResizeW(+e.target.value)}
                                        />
                                        <div className="slider-hints">
                                            <span>144p (64)</span>
                                            <span>HD (1280)</span>
                                            <span>4K (3840)</span>
                                            <span>8K (7680)</span>
                                        </div>
                                    </div>

                                    {/* Height */}
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
                                            onChange={e => setResizeH(Math.min(4320, Math.max(64, +e.target.value || 64)))}
                                        />
                                        <input
                                            type="range"
                                            min={64} max={4320} step={2}
                                            value={resizeH}
                                            onChange={e => setResizeH(+e.target.value)}
                                        />
                                        <div className="slider-hints">
                                            <span>144p (64)</span>
                                            <span>720p (720)</span>
                                            <span>2K (2160)</span>
                                            <span>8K (4320)</span>
                                        </div>
                                    </div>
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
                                    <input
                                        type="range"
                                        min={0}
                                        max={videoDuration ?? 3600}
                                        step={1}
                                        value={thumbSec}
                                        onChange={e => {
                                            const s = +e.target.value;
                                            setThumbSec(s);
                                            setThumbTs(secToHms(s));
                                        }}
                                    />
                                    <div className="slider-hints">
                                        {trimHints().map((h, i) => <span key={i}>{h}</span>)}
                                    </div>
                                    {!videoDuration && (
                                        <p className="field-note">💡 Select a file to get the exact video duration range</p>
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

import { useState, useCallback } from 'react';
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
    const [resizeW, setResizeW] = useState(1280);
    const [resizeH, setResizeH] = useState(720);
    const [thumbTs, setThumbTs] = useState('00:00:05');

    const { addJob, updateJob } = useJobStore();

    const handleRun = async () => {
        if (!file) return;
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
                            onFile={(path) => setFile(path)}
                            onClear={() => setFile(null)}
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
                                <label className="label">Output Format</label>
                                <select
                                    className="input select"
                                    value={outputFormat}
                                    onChange={e => setOutputFormat(e.target.value)}
                                >
                                    <optgroup label="Video">
                                        {VIDEO_FORMATS.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                                    </optgroup>
                                    <optgroup label="Audio">
                                        {AUDIO_FORMATS.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                                    </optgroup>
                                </select>
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
                                <select
                                    className="input select"
                                    value={audioFormat}
                                    onChange={e => setAudioFormat(e.target.value)}
                                >
                                    {AUDIO_FORMATS.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                                </select>
                            </div>
                        )}

                        {activeTab === 'trim' && (
                            <div className="field-row">
                                <div className="field-group">
                                    <label className="label">Start Time</label>
                                    <input
                                        className="input"
                                        type="text"
                                        placeholder="00:00:00"
                                        value={startTime}
                                        onChange={e => setStartTime(e.target.value)}
                                    />
                                </div>
                                <div className="field-group">
                                    <label className="label">End Time</label>
                                    <input
                                        className="input"
                                        type="text"
                                        placeholder="00:01:00"
                                        value={endTime}
                                        onChange={e => setEndTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'resize' && (
                            <div className="field-row">
                                <div className="field-group">
                                    <label className="label">Width (px)</label>
                                    <input
                                        className="input"
                                        type="number"
                                        value={resizeW}
                                        onChange={e => setResizeW(+e.target.value)}
                                    />
                                </div>
                                <div className="field-group">
                                    <label className="label">Height (px)</label>
                                    <input
                                        className="input"
                                        type="number"
                                        value={resizeH}
                                        onChange={e => setResizeH(+e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'thumbnail' && (
                            <div className="field-group">
                                <label className="label">Timestamp</label>
                                <input
                                    className="input"
                                    type="text"
                                    placeholder="00:00:05"
                                    value={thumbTs}
                                    onChange={e => setThumbTs(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    <button
                        className="btn btn-primary run-btn"
                        onClick={handleRun}
                        disabled={!file || running}
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
    );
}

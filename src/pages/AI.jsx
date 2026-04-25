import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Wand2, Play, FolderOpen, Bot, User, Loader, AlertCircle, ArrowLeft, KeyRound, Sparkles } from 'lucide-react';
import DropZone from '../components/DropZone.jsx';
import useJobStore from '../stores/useJobStore.js';
import './AI.css';

const FOLLOWUP_BY_OP = {
    compress: [
        'Trim the first 10 seconds of this file',
        'Downscale to 1080p',
        'Extract a thumbnail at 3 seconds',
        'Remux to MP4 (web-optimized) without re-encoding if possible',
        'Extract audio as M4A from this file',
    ],
    convert: [
        'Compress for Discord (under 25 MB)',
        'Trim the first 5 seconds',
        'Downscale to 1280×720',
        'Compress with H.265 and preserve HDR if the source is HDR',
    ],
    trim: [
        'Compress the result to under 16 MB for WhatsApp',
        'Re-encode the result with AV1 for smallest size',
        'Extract a thumbnail at the new start of the video',
    ],
    resize: [
        'Compress the result to save space (CRF or target size)',
        'Set output to 30 fps and compress',
        'Remux the file to MKV',
    ],
    transform: [
        'Compress the video with H.265',
        'Trim 15 seconds from the start',
        'Convert to web-optimized MP4 for streaming',
    ],
    extractAudio: [
        'Compress the same file for YouTube (web-optimized MP4)',
        'Trim 30 seconds from the start of the full video for a sample',
        'Downscale the full video to 720p',
    ],
    thumbnail: [
        'Compress the full video to about 5 Mbps',
        'Convert the main video to MP4 (web-optimized)',
        'Extract audio as MP3 from the full file',
    ],
    watermark: [
        'Resize to 1920×1080',
        'Compress the watermarked file for web',
    ],
    _default: [
        'Compress to fit 25 MB for Discord',
        'Downscale to 720p',
        'Extract audio as MP3',
    ],
};

/**
 * Suggested follow-ups after a success: primary list by operation, then lightly
 * re-ordered so we don’t lead with the same action class the user *just* finished
 * (e.g. after compress, trim/thumbnail first). Uses prior session runs for variety.
 */
function buildFollowupQueries(parsed, forPrompt, sessionRuns) {
    const op = parsed?.operation;
    const base = (op && FOLLOWUP_BY_OP[op]) ? [...FOLLOWUP_BY_OP[op]] : [...FOLLOWUP_BY_OP._default];
    const justDid = op;

    const isCompressy = s => /compress|mb|crf|bitrate|smaller|size/i.test(s);
    const isTrimmy = s => /trim|seconds|clip/i.test(s);
    if (justDid === 'compress') {
        base.sort((a, b) => (isCompressy(a) ? 1 : 0) - (isCompressy(b) ? 1 : 0));
    } else if (justDid === 'trim') {
        base.sort((a, b) => (isTrimmy(a) ? 1 : 0) - (isTrimmy(b) ? 1 : 0));
    }

    if (forPrompt) {
        const fp = forPrompt.toLowerCase();
        if (/whatsapp|16\s*mb/.test(fp)) {
            const line = 'Downscale to 720p to get under size limits more easily';
            if (!base.includes(line)) base.unshift(line);
        }
        if (/(discord|25\s*mb)/.test(fp) && !base.some(s => s.includes('1080'))) {
            const line2 = 'Downscale to 1080p to reduce file size before compressing';
            if (!base.includes(line2)) base.splice(1, 0, line2);
        }
    }

    const prevOps = new Set((sessionRuns || []).slice(-3).map(r => r.op));
    if (prevOps.size && prevOps.has('compress') && justDid === 'compress') {
        const line = 'Try trimming or a thumbnail next — you’ve compressed a few times';
        if (base.length < 5) base.push(line);
    }

    const out = [];
    const seen = new Set();
    for (const s of base) {
        if (out.length >= 5) break;
        if (seen.has(s)) continue;
        seen.add(s);
        out.push(s);
    }
    return out;
}

function CommandPreview({ operation, description, options }) {
    const optStr = JSON.stringify(options, null, 2);
    return (
        <div className="cmd-preview">
            <div className="cmd-preview-header">
                <span className="badge badge-accent">{operation}</span>
                <span className="cmd-preview-desc">{description}</span>
            </div>
            <pre className="cmd-code">{optStr}</pre>
        </div>
    );
}

function Message({ msg, onFollowupSelect }) {
    return (
        <div className={`chat-msg ${msg.role}`}>
            <div className="chat-avatar">
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className="chat-bubble">
                {msg.text && <p>{msg.text}</p>}
                {msg.parsed && (
                    <>
                        <CommandPreview {...msg.parsed} />
                        {!msg.confirmed && !msg.running && (
                            <div className="chat-actions">
                                <button className="btn btn-primary btn-sm" onClick={msg.onRun}>
                                    <Play size={14} fill="currentColor" /> Run this
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={msg.onCancel}>
                                    Cancel
                                </button>
                            </div>
                        )}
                        {msg.running && (
                            <div className="chat-running">
                                <Loader size={14} className="spinner" />
                                <span>Processing...</span>
                            </div>
                        )}
                        {msg.done && (
                            <div className="chat-done">
                                <span>✅ Done!</span>
                                {msg.outputPath && (
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => window.ffmcp?.showInFolder(msg.outputPath)}
                                    >
                                        <FolderOpen size={13} /> Show in Finder
                                    </button>
                                )}
                            </div>
                        )}
                        {msg.done && !msg.error && onFollowupSelect && msg.followupQueries?.length > 0 && (
                            <div className="chat-followups" role="group" aria-label="Suggested follow-up prompts">
                                <div className="chat-followups-head">
                                    <Sparkles size={14} className="chat-followups-icon" aria-hidden />
                                    <span>Try next (same file)</span>
                                </div>
                                <p className="chat-followups-hint">Picks a suggestion below — you can edit it before sending.</p>
                                <div className="chat-followups-chips">
                                    {msg.followupQueries.map(q => (
                                        <button
                                            key={q}
                                            type="button"
                                            className="chat-followup-chip"
                                            onClick={() => onFollowupSelect(q)}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
                {msg.error && (
                    <div className="chat-error">
                        <AlertCircle size={14} />
                        <span>{msg.error}</span>
                    </div>
                )}
                {msg.thinking && (
                    <div className="chat-thinking">
                        <span /><span /><span />
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AI() {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(true);
    const bottomRef = useRef();
    const dropzoneRef = useRef();
    const [fileError, setFileError] = useState(false);
    /** Last few successful { op, prompt } in this session (same file) — powers follow-up ordering */
    const [sessionRuns, setSessionRuns] = useState([]);
    const sessionRunsRef = useRef([]);
    useEffect(() => {
        sessionRunsRef.current = sessionRuns;
    }, [sessionRuns]);
    const { addJob, updateJob } = useJobStore();
    const inputRef = useRef();

    const applyFollowup = useCallback((text) => {
        setPrompt(text);
        requestAnimationFrame(() => inputRef.current?.focus());
    }, []);

    // Check if API key is configured
    useEffect(() => {
        window.ffmcp?.store.getAll().then(s => {
            setHasApiKey(Boolean(s?.apiKey?.trim()));
        });
    }, []);

    const showBanner = !hasApiKey;

    // Scroll chat to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const addMessage = (msg) => {
        const id = Date.now() + Math.random();
        const full = { id, ...msg };
        setMessages(prev => [...prev, full]);
        return id;
    };

    const updateMessage = (id, updates) => {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    };

    const handleSend = async () => {
        const text = prompt.trim();
        if (!text || loading) return;

        // Guard: file must be selected first
        if (!file) {
            setFileError(true);
            dropzoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Auto-clear shake after animation completes so it re-triggers next time
            setTimeout(() => setFileError(false), 600);
            return;
        }

        setPrompt('');
        const userPrompt = text;
        addMessage({ role: 'user', text: userPrompt });

        const thinkingId = addMessage({ role: 'ai', thinking: true });
        setLoading(true);

        try {
            const parsed = await window.ffmcp.sendPrompt(userPrompt, file);
            updateMessage(thinkingId, {
                thinking: false,
                parsed,
                forPrompt: userPrompt,
                onRun: () => handleRun(thinkingId, parsed, userPrompt),
                onCancel: () => updateMessage(thinkingId, { confirmed: true, text: 'Operation cancelled.' }),
            });
        } catch (err) {
            updateMessage(thinkingId, {
                thinking: false,
                error: err.message || 'AI request failed. Check your API key in Settings.',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRun = async (msgId, parsed, userPrompt = '') => {
        if (!file) {
            updateMessage(msgId, { error: 'Please select a file above first.' });
            return;
        }
        updateMessage(msgId, { running: true });

        const jobId = addJob(parsed.operation, parsed.description, file);
        updateJob(jobId, { status: 'running', progress: 0 });

        try {
            const opts = { inputPath: file, ...parsed.options };
            const result = await window.ffmcp.runOperation(jobId, parsed.operation, opts);
            updateJob(jobId, { status: 'done', progress: 100, outputPath: result.outputPath });
            const followupQueries = buildFollowupQueries(parsed, userPrompt, sessionRunsRef.current);
            setSessionRuns(r => [...r, { op: parsed.operation, prompt: userPrompt }]);
            updateMessage(msgId, {
                running: false,
                done: true,
                confirmed: true,
                outputPath: result.outputPath,
                followupQueries,
            });
        } catch (err) {
            updateJob(jobId, { status: 'error', error: err.message });
            updateMessage(msgId, { running: false, error: err.message, confirmed: true });
        }
    };

    const suggestions = [
        'Convert this video to MP4 (web-optimized for YouTube)',
        'Remux to MKV without re-encoding',
        'Extract audio as MP3',
        'Compress to fit in 25 MB for Discord',
        'Compress for WhatsApp (under 16 MB)',
        'Compress with H.265 using my GPU',
        'Compress and preserve HDR (keep 10-bit)',
        'Re-encode to AV1 for smallest size (slowest encode)',
        'Trim first 30 seconds',
        'Downscale to 720p',
        'Compress this to 24 fps',
        'Resize for Instagram Reels (1080×1920)',
        'Rotate the video 90 degrees clockwise',
        'Flip the video horizontally',
        'Extract thumbnail at 5 seconds',
    ];

    return (
        <div className="ai-page">
            <div className="page-container">
                <div className="page-header animate-fade">
                    <button className="page-back-btn" onClick={() => navigate('/')} aria-label="Go back">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="page-title">AI Mode</h1>
                        <p className="page-sub">Describe what you want — AI handles the rest</p>
                    </div>
                </div>

                <div className="ai-file-section animate-fade">
                    <label className="label">File to process</label>
                    <DropZone
                        file={file}
                        onFile={(path) => { setFile(path); setFileError(false); setSessionRuns([]); }}
                        onClear={() => { setFile(null); setSessionRuns([]); }}
                        error={fileError}
                        dropzoneRef={dropzoneRef}
                    />
                </div>

                <div className="chat-area">
                    {messages.length === 0 && (
                        <div className="chat-empty animate-fade">
                            <Wand2 size={40} style={{ color: 'var(--accent-2)', opacity: 0.4 }} />
                            <p>Ask anything about your video</p>
                            <div className="suggestions">
                                {suggestions.map(s => (
                                    <button key={s} className="suggestion" onClick={() => setPrompt(s)}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map(msg => (
                        <Message key={msg.id} msg={msg} onFollowupSelect={file ? applyFollowup : undefined} />
                    ))}
                    <div ref={bottomRef} />
                </div>

                {/* API key missing banner */}
                {showBanner && (
                    <div className="api-key-banner animate-fade">
                        <KeyRound size={16} className="api-key-banner-icon" />
                        <p className="api-key-banner-text">
                            <strong>No API key configured.</strong>{' '}
                            Add your Gemini API key to use AI Mode.
                        </p>
                        <button
                            className="api-key-banner-btn"
                            onClick={() => navigate('/settings')}
                        >
                            Open Settings →
                        </button>
                    </div>
                )}

                <div className="chat-input-bar animate-fade">
                    <input
                        ref={inputRef}
                        className="input chat-input"
                        type="text"
                        placeholder="e.g. compress this video by 60%, or extract audio as MP3..."
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        disabled={loading}
                    />
                    <button
                        className="btn btn-primary chat-send"
                        onClick={handleSend}
                        disabled={!prompt.trim() || loading}
                    >
                        {loading ? <Loader size={16} className="spinner" /> : <Send size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
}

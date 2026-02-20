import { useState, useRef, useEffect } from 'react';
import { Send, Wand2, Play, FolderOpen, FileVideo, Bot, User, Loader, AlertCircle } from 'lucide-react';
import DropZone from '../components/DropZone.jsx';
import useJobStore from '../stores/useJobStore.js';
import './AI.css';

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

function Message({ msg }) {
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
    const [file, setFile] = useState(null);
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef();
    const { addJob, updateJob } = useJobStore();

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

        setPrompt('');
        addMessage({ role: 'user', text });

        const thinkingId = addMessage({ role: 'ai', thinking: true });
        setLoading(true);

        try {
            const parsed = await window.ffmcp.sendPrompt(text, file);
            updateMessage(thinkingId, {
                thinking: false,
                parsed,
                onRun: () => handleRun(thinkingId, parsed),
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

    const handleRun = async (msgId, parsed) => {
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
            updateMessage(msgId, { running: false, done: true, confirmed: true, outputPath: result.outputPath });
        } catch (err) {
            updateJob(jobId, { status: 'error', error: err.message });
            updateMessage(msgId, { running: false, error: err.message, confirmed: true });
        }
    };

    const suggestions = [
        'Convert this video to MP4',
        'Extract audio as MP3',
        'Compress to 50% quality',
        'Trim first 30 seconds',
        'Resize to 1280×720',
        'Extract thumbnail at 5 seconds',
    ];

    return (
        <div className="ai-page">
            <div className="page-header animate-fade">
                <div>
                    <h1 className="page-title">AI Mode</h1>
                    <p className="page-sub">Describe what you want — AI handles the rest</p>
                </div>
            </div>

            <div className="ai-file-section animate-fade">
                <label className="label">File to process</label>
                <DropZone file={file} onFile={setFile} onClear={() => setFile(null)} />
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
                    <Message key={msg.id} msg={msg} />
                ))}
                <div ref={bottomRef} />
            </div>

            <div className="chat-input-bar animate-fade">
                <input
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
    );
}

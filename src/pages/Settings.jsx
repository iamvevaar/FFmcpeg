import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Folder, Save, CheckCircle, Monitor, ArrowLeft } from 'lucide-react';
import './Settings.css';

export default function Settings() {
    const navigate = useNavigate();
    const [apiKey, setApiKey] = useState('');
    const [outputFolder, setOutputFolder] = useState('');
    const [ffmpegPath, setFfmpegPath] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (window.ffmcp) {
            window.ffmcp.store.getAll().then(s => {
                setApiKey(s.apiKey || '');
                setOutputFolder(s.outputFolder || '');
            });
            window.ffmcp.getFFmpegPath().then(p => setFfmpegPath(p || 'Not found'));
        }
    }, []);

    const handleSave = async () => {
        await window.ffmcp.store.set('apiKey', apiKey);
        await window.ffmcp.store.set('outputFolder', outputFolder);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const handlePickFolder = async () => {
        const folder = await window.ffmcp.openFolder();
        if (folder) setOutputFolder(folder);
    };

    return (
        <div className="settings-page">
            <div className="page-container">
                <div className="page-header animate-fade">
                    <button className="page-back-btn" onClick={() => navigate('/')} aria-label="Go back">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="page-title">Settings</h1>
                        <p className="page-sub">Configure API keys, output paths, and more</p>
                    </div>
                </div>

                <div className="settings-body animate-fade">

                    {/* AI Configuration */}
                    <div className="settings-section glass">
                        <div className="settings-section-header">
                            <Key size={18} style={{ color: 'var(--accent-2)' }} />
                            <div>
                                <h2 className="settings-section-title">AI Configuration</h2>
                                <p className="settings-section-sub">Required for AI Mode natural language processing</p>
                            </div>
                        </div>

                        <div className="settings-field">
                            <label className="label">Gemini API Key</label>
                            <input
                                className="input"
                                type="password"
                                placeholder="AIza..."
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                autoComplete="off"
                            />
                            <p className="field-hint">
                                Get your free key at{' '}
                                <a
                                    href="https://aistudio.google.com/apikey"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="link"
                                >
                                    aistudio.google.com/apikey
                                </a>
                            </p>
                        </div>
                    </div>

                    {/* Output Settings */}
                    <div className="settings-section glass">
                        <div className="settings-section-header">
                            <Folder size={18} style={{ color: 'var(--accent-2)' }} />
                            <div>
                                <h2 className="settings-section-title">Output Folder</h2>
                                <p className="settings-section-sub">Where processed files are saved</p>
                            </div>
                        </div>

                        <div className="settings-field">
                            <label className="label">Default Output Directory</label>
                            <div className="folder-picker">
                                <input
                                    className="input"
                                    type="text"
                                    value={outputFolder}
                                    readOnly
                                    placeholder="/Users/you/Downloads"
                                />
                                <button className="btn btn-secondary" onClick={handlePickFolder}>
                                    <Folder size={14} />
                                    Browse
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* System Info */}
                    <div className="settings-section glass">
                        <div className="settings-section-header">
                            <Monitor size={18} style={{ color: 'var(--accent-2)' }} />
                            <div>
                                <h2 className="settings-section-title">System</h2>
                                <p className="settings-section-sub">FFmpeg binary information</p>
                            </div>
                        </div>

                        <div className="settings-field">
                            <label className="label">FFmpeg Path</label>
                            <div className="info-box">{ffmpegPath}</div>
                        </div>
                    </div>

                    <button className={`btn ${saved ? 'btn-success' : 'btn-primary'} save-btn`} onClick={handleSave}>
                        {saved
                            ? <><CheckCircle size={16} /> Saved!</>
                            : <><Save size={16} /> Save Settings</>
                        }
                    </button>

                </div>
            </div>
        </div>

    );
}

import { useNavigate } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import { Sliders, Wand2, ArrowRight, KeyRound, Check } from 'lucide-react';
import './Home.css';

const modes = [
    {
        key: 'manual',
        to: '/manual',
        icon: Sliders,
        eyebrow: 'Manual mode',
        title: 'Precision controls,\nzero terminal.',
        description: 'Convert, compress, trim, resize, and extract audio with intuitive controls. Built for fine-tuned, repeatable tasks.',
        features: ['Format Conversion', 'Compression', 'Trim & Cut', 'Audio Extraction', 'Resize & Scale'],
        cta: 'Open Manual Mode',
    },
    {
        key: 'ai',
        to: '/ai',
        icon: Wand2,
        eyebrow: 'AI mode',
        title: 'Just describe\nwhat you want.',
        description: 'Type a natural language prompt and let AI translate it into the right FFmpeg command — preview, then run.',
        features: ['Natural Language Prompts', 'Smart Parameter Detection', 'Command Preview', 'One-click Execute'],
        cta: 'Open AI Mode',
    },
];

export default function Home() {
    const navigate = useNavigate();
    const [activeMode, setActiveMode] = useState('manual');
    const [hasApiKey, setHasApiKey] = useState(true);
    const selectedMode = useMemo(
        () => modes.find(mode => mode.key === activeMode) || modes[0],
        [activeMode]
    );

    useEffect(() => {
        window.ffmcp?.store.getAll().then(s => {
            setHasApiKey(Boolean(s?.apiKey?.trim()));
        });
    }, []);

    return (
        <div className="home-page">
            <section className="home-hero animate-fade">
                <span className="home-eyebrow">Media processing, made simple</span>
                <h1 className="home-title">
                    Studio-grade FFmpeg,<br />
                    <span className="home-title-accent">without the command line.</span>
                </h1>
                <p className="home-subtitle">
                    Convert, compress, trim, resize, and process media files with a clean,
                    modern interface — powered by FFmpeg.
                </p>

                <div className="home-tabs" role="tablist">
                    {modes.map(mode => (
                        <button
                            key={mode.key}
                            type="button"
                            role="tab"
                            aria-selected={activeMode === mode.key}
                            className={`home-tab${activeMode === mode.key ? ' active' : ''}`}
                            onClick={() => setActiveMode(mode.key)}
                        >
                            <mode.icon size={16} />
                            <span>{mode.eyebrow}</span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="home-feature animate-fade" key={selectedMode.key}>
                <div className="home-feature-grid">
                    <div className="home-feature-content">
                        <span className="home-feature-eyebrow">{selectedMode.eyebrow}</span>
                        <h2 className="home-feature-title">
                            {selectedMode.title.split('\n').map((line, i) => (
                                <span key={i}>{line}{i === 0 && <br />}</span>
                            ))}
                        </h2>
                        <p className="home-feature-desc">{selectedMode.description}</p>

                        <button
                            type="button"
                            className="btn btn-primary home-feature-cta"
                            onClick={() => navigate(selectedMode.to)}
                        >
                            {selectedMode.cta}
                            <ArrowRight size={16} />
                        </button>
                    </div>

                    <div className="home-feature-visual">
                        <div className="home-feature-icon-frame">
                            <selectedMode.icon size={72} strokeWidth={1.4} />
                        </div>
                        <ul className="home-feature-list">
                            {selectedMode.features.map(feature => (
                                <li key={feature}>
                                    <span className="home-feature-check">
                                        <Check size={12} strokeWidth={3} />
                                    </span>
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {activeMode === 'ai' && !hasApiKey && (
                <div className="api-key-banner animate-fade">
                    <KeyRound size={18} className="api-key-banner-icon" />
                    <p className="api-key-banner-text">
                        <strong>No API key configured.</strong>{' '}
                        Add your Gemini API key to use AI Mode.
                    </p>
                    <button
                        className="api-key-banner-btn"
                        onClick={() => navigate('/settings')}
                    >
                        Open Settings
                    </button>
                </div>
            )}
        </div>
    );
}

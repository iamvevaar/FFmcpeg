import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Sliders, Wand2, Zap, ChevronRight } from 'lucide-react';
import './Home.css';

const modes = [
    {
        key: 'manual',
        to: '/manual',
        icon: Sliders,
        title: 'Manual Mode',
        subtitle: 'Full control with a guided UI',
        description: 'Convert, compress, trim, resize, and extract audio with intuitive controls. Perfect for precise tasks.',
        color: '#6366f1',
        features: ['Format Conversion', 'Compression', 'Trim & Cut', 'Audio Extraction', 'Resize & Scale'],
    },
    {
        key: 'ai',
        to: '/ai',
        icon: Wand2,
        title: 'AI Mode',
        subtitle: 'Just describe what you want',
        description: 'Type a natural language prompt and let AI figure out the best FFmpeg command for you.',
        color: '#8b5cf6',
        features: ['Natural Language Prompts', 'Smart Parameter Detection', 'Command Preview', 'One-click Execute'],
    },
];

export default function Home() {
    const navigate = useNavigate();
    const [activeMode, setActiveMode] = useState('manual');
    const selectedMode = useMemo(
        () => modes.find(mode => mode.key === activeMode) || modes[0],
        [activeMode]
    );

    return (
        <div className="home-page">
            <div className="home-bg" />

            <header className="home-header animate-fade">
                <div className="home-logo">
                    <Zap size={24} fill="currentColor" />
                </div>
                <h1 className="home-title">Welcome to FFMCPeg</h1>
                <p className="home-subtitle">Professional media processing, powered by FFmpeg — no terminal required.</p>
            </header>


            <div className="home-tabs animate-fade">
                {modes.map(mode => (
                    <button
                        key={mode.key}
                        type="button"
                        className={`home-tab${activeMode === mode.key ? ' active' : ''}`}
                        onClick={() => setActiveMode(mode.key)}
                    >
                        <mode.icon size={16} />
                        <span>{mode.title}</span>
                    </button>
                ))}
            </div>

            <div className="home-cards">
                <div
                    key={selectedMode.key}
                    className="mode-card glass glass-hover animate-fade"
                    style={{ '--card-accent': selectedMode.color }}
                    onClick={() => navigate(selectedMode.to)}
                >
                    <div
                        className="mode-card-icon"
                        style={{ background: `${selectedMode.color}1a`, border: `1px solid ${selectedMode.color}33` }}
                    >
                        <selectedMode.icon size={28} style={{ color: selectedMode.color }} />
                    </div>
                    <div className="mode-card-body">
                        <p className="mode-subtitle">{selectedMode.subtitle}</p>
                        <h2 className="mode-title">{selectedMode.title}</h2>
                        <p className="mode-desc">{selectedMode.description}</p>
                        <ul className="mode-features">
                            {selectedMode.features.map(feature => (
                                <li key={feature}>
                                    <span className="feature-dot" style={{ background: selectedMode.color }} />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="mode-card-cta">
                        <span>Open {selectedMode.title}</span>
                        <ChevronRight size={16} />
                    </div>
                </div>
            </div>
        </div>
    );
}

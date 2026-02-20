import { useNavigate } from 'react-router-dom';
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

    return (
        <div className="home-page">
            <div className="home-bg" />

            <header className="home-header animate-fade">
                <div className="home-logo">
                    <Zap size={24} fill="currentColor" />
                </div>
                <h1 className="home-title">Welcome to FFmcp</h1>
                <p className="home-subtitle">Professional media processing, powered by FFmpeg — no terminal required.</p>
            </header>

            <div className="home-cards">
                {modes.map(({ key, to, icon: Icon, title, subtitle, description, color, features }, idx) => (
                    <div
                        key={key}
                        className="mode-card glass glass-hover animate-fade"
                        style={{ animationDelay: `${idx * 0.12}s`, '--card-accent': color }}
                        onClick={() => navigate(to)}
                    >
                        <div className="mode-card-icon" style={{ background: `${color}1a`, border: `1px solid ${color}33` }}>
                            <Icon size={28} style={{ color }} />
                        </div>
                        <div className="mode-card-body">
                            <p className="mode-subtitle">{subtitle}</p>
                            <h2 className="mode-title">{title}</h2>
                            <p className="mode-desc">{description}</p>
                            <ul className="mode-features">
                                {features.map(f => (
                                    <li key={f}><span className="feature-dot" style={{ background: color }} />{f}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="mode-card-cta">
                            <span>Get started</span>
                            <ChevronRight size={16} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

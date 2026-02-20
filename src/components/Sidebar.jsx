import { NavLink, useLocation } from 'react-router-dom';
import { Home, Wand2, Sliders, Settings, Zap } from 'lucide-react';
import './Sidebar.css';

const nav = [
    { to: '/', icon: Home, label: 'Home', exact: true },
    { to: '/manual', icon: Sliders, label: 'Manual' },
    { to: '/ai', icon: Wand2, label: 'AI Mode' },
    { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-icon-wrap">
                    <Zap size={20} fill="currentColor" />
                </div>
                <span className="sidebar-brand">FFmcp</span>
            </div>

            <nav className="sidebar-nav">
                {nav.map(({ to, icon: Icon, label, exact }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={exact}
                        className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                    >
                        <Icon size={18} />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-version">v1.0.0</div>
            </div>
        </aside>
    );
}

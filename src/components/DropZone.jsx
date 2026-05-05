import { useState, useRef } from 'react';
import { Upload, FileVideo, X } from 'lucide-react';
import './DropZone.css';

// Resolve a browser File to its absolute path. Electron 32+ removed File.path,
// so the renderer can no longer read it directly — fall through preload's
// webUtils.getPathForFile bridge. Returns '' if the path can't be resolved
// (e.g. running in a plain browser preview).
function resolveFilePath(file) {
    if (window.ffmcp?.getPathForFile) {
        const p = window.ffmcp.getPathForFile(file);
        if (p) return p;
    }
    return file.path || '';
}

export default function DropZone({ file, onFile, onClear, error, dropzoneRef }) {
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef();

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (!f) return;
        const p = resolveFilePath(f);
        if (p) onFile(p, f);
    };

    const handleClick = async () => {
        if (window.ffmcp) {
            const path = await window.ffmcp.openFile();
            if (path) onFile(path);
        } else {
            inputRef.current.click();
        }
    };

    const handleInputChange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const p = resolveFilePath(f);
        if (p) onFile(p, f);
    };

    const ext = file ? file.split('.').pop().toUpperCase() : '';
    const name = file ? file.split('/').pop() : '';

    if (file) {
        return (
            <div className="dropzone dropzone-filled animate-fade">
                <div className="dz-file-icon">
                    <FileVideo size={28} />
                    <span className="dz-ext">{ext}</span>
                </div>
                <div className="dz-file-info">
                    <p className="dz-file-name">{name}</p>
                    <p className="dz-file-path">{file}</p>
                </div>
                <button className="dz-clear" onClick={onClear} aria-label="Clear file">
                    <X size={16} />
                </button>
            </div>
        );
    }

    return (
        <div
            ref={dropzoneRef}
            className={`dropzone${dragging ? ' dragging' : ''}${error ? ' dropzone-error' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            <input
                ref={inputRef}
                type="file"
                accept="video/*,audio/*"
                style={{ display: 'none' }}
                onChange={handleInputChange}
            />
            <div className="dz-icon">
                <Upload size={32} />
            </div>
            <p className="dz-title">Drop your file here</p>
            <p className="dz-subtitle">or click to browse — MP4, MKV, AVI, MOV, MP3, WAV &amp; more</p>
        </div>
    );
}

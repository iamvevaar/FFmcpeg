import { useState, useRef } from 'react';
import { Upload, FileVideo, X } from 'lucide-react';
import './DropZone.css';

export default function DropZone({ file, onFile, onClear }) {
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef();

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f.path || f.name, f);
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
        if (f) onFile(f.path || f.name, f);
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
                <button className="dz-clear btn btn-ghost" onClick={onClear}>
                    <X size={16} />
                </button>
            </div>
        );
    }

    return (
        <div
            className={`dropzone${dragging ? ' dragging' : ''}`}
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

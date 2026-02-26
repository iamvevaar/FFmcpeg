import { useEffect } from 'react';
import { CheckCircle, XCircle, Loader, FolderOpen, Trash2, Clock } from 'lucide-react';
import useJobStore from '../stores/useJobStore.js';
import './JobQueue.css';

function statusIcon(status) {
    if (status === 'running') return <Loader size={14} className="spinner" style={{ color: 'var(--accent-2)' }} />;
    if (status === 'done') return <CheckCircle size={14} style={{ color: 'var(--success)' }} />;
    if (status === 'error') return <XCircle size={14} style={{ color: 'var(--danger)' }} />;
    return <Clock size={14} style={{ color: 'var(--text-muted)' }} />;
}

const OP_NAMES = {
    convert: 'Conversion',
    compress: 'Compression',
    extractAudio: 'Audio Extraction',
    trim: 'Trimming',
    resize: 'Resizing',
    thumbnail: 'Thumbnail',
};


export default function JobQueue() {
    const { jobs, isOpen, toggleQueue, openQueue, removeJob, clearCompleted } = useJobStore();

    // Auto-open the panel whenever a new job is added
    useEffect(() => {
        if (jobs.length > 0) openQueue();
    }, [jobs.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const hasCompleted = jobs.some(j => j.status === 'done' || j.status === 'error');

    return (
        <aside className={`job-queue${isOpen ? ' open' : ''}`}>
            {/* Close handle at the top of the panel */}
            <div className="jq-header">
                <span className="jq-title">Job Queue</span>
                <div className="jq-header-actions">

                    <button className="btn btn-ghost jq-close" onClick={toggleQueue} title="Close">
                        ✕
                    </button>
                </div>
            </div>

            <div className="jq-list">
                {jobs.length === 0 ? (
                    <div className="jq-empty">
                        <Clock size={28} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                        <p>No jobs yet</p>
                    </div>
                ) : (
                    jobs.map(job => (
                        <div key={job.id} className={`jq-item ${job.status}`}>
                            <div className="jq-item-top">
                                <div className="jq-item-label">
                                    {statusIcon(job.status)}
                                    <span className="jq-name">{OP_NAMES[job.operation] ?? job.operation}</span>
                                </div>
                                {/* <button className="btn btn-ghost jq-remove" onClick={() => removeJob(job.id)}>
                                    <Trash2 size={12} />
                                </button> */}
                            </div>

                            {job.status === 'running' && (
                                <div className="jq-progress">
                                    <div className="progress-track">
                                        <div className="progress-fill" style={{ width: `${job.progress}%` }} />
                                    </div>
                                    <span className="jq-percent">{job.progress}%</span>
                                </div>
                            )}

                            {job.status === 'error' && (
                                <p className="jq-error">{job.error}</p>
                            )}

                            {job.status === 'done' && job.outputPath && (
                                <div className='jq-item-bottom'>
                                    <p className="jq-file">{job.filePath?.split('/').pop()}</p>
                                    <button
                                        className="jq-open-btn"
                                        onClick={() => window.ffmcp?.showInFolder(job.outputPath)}
                                    >
                                        <FolderOpen size={12} />
                                    </button>
                                </div>
                            )}



                        </div>
                    ))
                )}
            </div>
        </aside>
    );
}

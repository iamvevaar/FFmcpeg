import { useEffect } from 'react';
import { CheckCircle, XCircle, Loader, FolderOpen, Clock } from 'lucide-react';
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
    transform: 'Transform',
    thumbnail: 'Thumbnail',
};


export default function JobQueue() {
    const { jobs, isOpen, toggleQueue, openQueue } = useJobStore();

    // Auto-open the panel whenever a new job is added
    useEffect(() => {
        if (jobs.length > 0) openQueue();
    }, [jobs.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
                    jobs.map(job => {
                        const isClickable = job.status === 'done' && job.outputPath;
                        const onOpen = () => window.ffmcp?.showInFolder(job.outputPath);
                        const commonClass = `jq-item ${job.status}${isClickable ? ' jq-item--clickable' : ''}`;

                        const inner = (
                            <>
                                <div className="jq-item-top">
                                    <div className="jq-item-label">
                                        {statusIcon(job.status)}
                                        <span className="jq-name">{OP_NAMES[job.operation] ?? job.operation}</span>
                                    </div>
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
                                    <div className="jq-item-bottom">
                                        <p className="jq-file" title={job.filePath?.split('/').pop()}>
                                            {job.filePath?.split('/').pop()}
                                        </p>
                                        <div className="jq-open-cue" aria-hidden>
                                            <FolderOpen className="jq-open-cue-icon" size={20} strokeWidth={2} />
                                        </div>
                                    </div>
                                )}
                            </>
                        );

                        if (isClickable) {
                            return (
                                <button
                                    key={job.id}
                                    type="button"
                                    className={commonClass}
                                    onClick={onOpen}
                                    aria-label="Show output file in folder"
                                >
                                    {inner}
                                </button>
                            );
                        }

                        return (
                            <div key={job.id} className={commonClass}>
                                {inner}
                            </div>
                        );
                    })
                )}
            </div>
        </aside>
    );
}

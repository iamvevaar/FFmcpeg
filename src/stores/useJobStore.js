import { create } from 'zustand';

let jobCounter = 0;

const useJobStore = create((set, get) => ({
  jobs: [],

  addJob: (operation, label, filePath) => {
    const id = `job_${++jobCounter}_${Date.now()}`;
    const job = {
      id,
      operation,
      label,
      filePath,
      status: 'queued', // queued | running | done | error
      progress: 0,
      timemark: '',
      outputPath: null,
      error: null,
      createdAt: Date.now(),
    };
    set(s => ({ jobs: [job, ...s.jobs] }));
    return id;
  },

  updateJob: (id, updates) => {
    set(s => ({
      jobs: s.jobs.map(j => j.id === id ? { ...j, ...updates } : j),
    }));
  },

  removeJob: (id) => {
    set(s => ({ jobs: s.jobs.filter(j => j.id !== id) }));
  },

  clearCompleted: () => {
    set(s => ({ jobs: s.jobs.filter(j => j.status !== 'done' && j.status !== 'error') }));
  },

  getJob: (id) => get().jobs.find(j => j.id === id),
}));

export default useJobStore;

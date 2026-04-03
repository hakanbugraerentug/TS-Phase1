import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../App';

const API_BASE = 'http://localhost:8000';

interface TfsCommit {
  commitId: string;
  comment: string;
  authorName: string;
  authorDate: string;
  repositoryName: string;
  projectName: string;
  remoteUrl: string;
}

interface TfsWorkItem {
  id: number;
  title: string;
  state: string;
  workItemType: string;
  assignedTo?: string;
  changedDate: string;
  url: string;
}

interface TfsPageProps {
  user: User;
}

const WorkItemTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const colors: Record<string, string> = {
    'Bug': 'bg-red-500/20 border-red-500/30 text-red-400',
    'Task': 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    'User Story': 'bg-green-500/20 border-green-500/30 text-green-400',
    'Feature': 'bg-purple-500/20 border-purple-500/30 text-purple-400',
    'Epic': 'bg-orange-500/20 border-orange-500/30 text-orange-400',
  };
  const color = colors[type] ?? 'bg-slate-500/20 border-slate-500/30 text-slate-400';
  return (
    <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest ${color}`}>
      {type}
    </span>
  );
};

const StateBadge: React.FC<{ state: string }> = ({ state }) => {
  const active = ['Active', 'In Progress', 'Committed', 'Open', 'New', 'Doing'];
  const done = ['Closed', 'Resolved', 'Done', 'Completed'];
  const isActive = active.some(s => state.toLowerCase().includes(s.toLowerCase()));
  const isDone = done.some(s => state.toLowerCase().includes(s.toLowerCase()));
  const color = isDone
    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
    : isActive
    ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
    : 'bg-slate-500/20 border-slate-500/30 text-slate-400';
  return (
    <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest ${color}`}>
      {state}
    </span>
  );
};

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

const LoadingSpinner: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-12 gap-3">
    <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" />
    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{label}</span>
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-600">
    <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
    <span className="text-[10px] font-black uppercase tracking-widest">{message}</span>
  </div>
);

export const TfsPage: React.FC<TfsPageProps> = ({ user }) => {
  const [commits, setCommits] = useState<TfsCommit[]>([]);
  const [completedItems, setCompletedItems] = useState<TfsWorkItem[]>([]);
  const [activeItems, setActiveItems] = useState<TfsWorkItem[]>([]);

  const [loadingCommits, setLoadingCommits] = useState(true);
  const [loadingCompleted, setLoadingCompleted] = useState(true);
  const [loadingActive, setLoadingActive] = useState(true);

  const [errorCommits, setErrorCommits] = useState<string | null>(null);
  const [errorCompleted, setErrorCompleted] = useState<string | null>(null);
  const [errorActive, setErrorActive] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${user.accessToken}` };

  const fetchAll = useCallback(async () => {
    setLoadingCommits(true);
    setLoadingCompleted(true);
    setLoadingActive(true);
    setErrorCommits(null);
    setErrorCompleted(null);
    setErrorActive(null);

    // Fetch all three in parallel
    const [commitsRes, completedRes, activeRes] = await Promise.allSettled([
      fetch(`${API_BASE}/api/tfs/commits`, { headers }),
      fetch(`${API_BASE}/api/tfs/workitems/completed`, { headers }),
      fetch(`${API_BASE}/api/tfs/workitems/active`, { headers }),
    ]);

    if (commitsRes.status === 'fulfilled') {
      if (commitsRes.value.ok) {
        setCommits(await commitsRes.value.json());
      } else {
        const err = await commitsRes.value.json().catch(() => ({ message: 'Commitler yüklenemedi.' }));
        setErrorCommits(err.message ?? 'Commitler yüklenemedi.');
      }
    } else {
      setErrorCommits('Sunucuya ulaşılamadı.');
    }
    setLoadingCommits(false);

    if (completedRes.status === 'fulfilled') {
      if (completedRes.value.ok) {
        setCompletedItems(await completedRes.value.json());
      } else {
        const err = await completedRes.value.json().catch(() => ({ message: 'Tamamlanan iş öğeleri yüklenemedi.' }));
        setErrorCompleted(err.message ?? 'Tamamlanan iş öğeleri yüklenemedi.');
      }
    } else {
      setErrorCompleted('Sunucuya ulaşılamadı.');
    }
    setLoadingCompleted(false);

    if (activeRes.status === 'fulfilled') {
      if (activeRes.value.ok) {
        setActiveItems(await activeRes.value.json());
      } else {
        const err = await activeRes.value.json().catch(() => ({ message: 'Aktif iş öğeleri yüklenemedi.' }));
        setErrorActive(err.message ?? 'Aktif iş öğeleri yüklenemedi.');
      }
    } else {
      setErrorActive('Sunucuya ulaşılamadı.');
    }
    setLoadingActive(false);
  }, [user.accessToken]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">TFS / Azure DevOps</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
            Son 7 günlük aktivite özeti
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600/20 border border-orange-500/30 text-orange-400 hover:bg-orange-600/30 font-black text-[9px] uppercase tracking-widest transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Yenile
        </button>
      </div>

      {/* Commits - Last Week */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-black text-white">Son 1 Haftadaki Commitler</h2>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
              {loadingCommits ? '...' : `${commits.length} commit bulundu`}
            </p>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-white/5 rounded-2xl overflow-hidden">
          {loadingCommits ? (
            <LoadingSpinner label="Commitler yükleniyor..." />
          ) : errorCommits ? (
            <div className="p-6 text-center text-red-400 text-xs font-black">{errorCommits}</div>
          ) : commits.length === 0 ? (
            <EmptyState message="Son 7 günde commit bulunamadı." />
          ) : (
            <div className="divide-y divide-white/5">
              {commits.map(commit => (
                <div key={commit.commitId} className="px-6 py-4 hover:bg-white/2 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold truncate">{commit.comment}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
                          {commit.projectName} / {commit.repositoryName}
                        </span>
                        <span className="text-slate-600 text-[9px]">•</span>
                        <span className="text-slate-500 text-[9px]">{commit.authorName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-slate-600 text-[9px] font-black">{formatDate(commit.authorDate)}</span>
                      {commit.remoteUrl && (
                        <a
                          href={commit.remoteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[8px] font-black uppercase tracking-widest hover:bg-orange-500/20 transition-colors"
                        >
                          {commit.commitId.slice(0, 7)}
                        </a>
                      )}
                      {!commit.remoteUrl && (
                        <span className="text-orange-400 text-[9px] font-mono">{commit.commitId.slice(0, 7)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Completed Work Items */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-black text-white">Son 1 Haftada Tamamlanan İş Öğeleri</h2>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
              {loadingCompleted ? '...' : `${completedItems.length} iş öğesi`}
            </p>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-white/5 rounded-2xl overflow-hidden">
          {loadingCompleted ? (
            <LoadingSpinner label="Tamamlanan iş öğeleri yükleniyor..." />
          ) : errorCompleted ? (
            <div className="p-6 text-center text-red-400 text-xs font-black">{errorCompleted}</div>
          ) : completedItems.length === 0 ? (
            <EmptyState message="Son 7 günde tamamlanan iş öğesi bulunamadı." />
          ) : (
            <div className="divide-y divide-white/5">
              {completedItems.map(item => (
                <div key={item.id} className="px-6 py-4 hover:bg-white/2 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-slate-500 text-[9px] font-mono">#{item.id}</span>
                        <WorkItemTypeBadge type={item.workItemType} />
                        <StateBadge state={item.state} />
                      </div>
                      <p className="text-white text-xs font-bold">{item.title}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-slate-600 text-[9px] font-black">{formatDate(item.changedDate)}</span>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-colors"
                        >
                          Aç
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Active Work Items */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-black text-white">Aktif İş Öğelerim</h2>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
              {loadingActive ? '...' : `${activeItems.length} aktif iş öğesi`}
            </p>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-white/5 rounded-2xl overflow-hidden">
          {loadingActive ? (
            <LoadingSpinner label="Aktif iş öğeleri yükleniyor..." />
          ) : errorActive ? (
            <div className="p-6 text-center text-red-400 text-xs font-black">{errorActive}</div>
          ) : activeItems.length === 0 ? (
            <EmptyState message="Aktif iş öğesi bulunamadı." />
          ) : (
            <div className="divide-y divide-white/5">
              {activeItems.map(item => (
                <div key={item.id} className="px-6 py-4 hover:bg-white/2 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-slate-500 text-[9px] font-mono">#{item.id}</span>
                        <WorkItemTypeBadge type={item.workItemType} />
                        <StateBadge state={item.state} />
                      </div>
                      <p className="text-white text-xs font-bold">{item.title}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-slate-600 text-[9px] font-black">{formatDate(item.changedDate)}</span>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-colors"
                        >
                          Aç
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

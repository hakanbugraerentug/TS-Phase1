import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../App';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommentData {
  id: string;
  username: string;
  content: string;
  date: string;
  projectId: string;
}

interface ProjectData {
  id: string;
  title: string;
  owner?: string;
  members?: string[];
  ilgiliEkipIdleri?: string[];
  birimler?: { birimTipi: string; birimAdi: string; sorumluKullanici: string }[];
}

interface TeamData {
  id: string;
  title: string;
  leader: string;
  members: string[];
  projectId?: string;
}

interface AiReportComment {
  commentId: string;
  date: string;
  username: string;
  projectName: string;
  userComment: string;
}

interface BulletLine {
  bullet0: string | null;
  bullet1: string[] | null;
  bullet2: string[] | null;
  bullet3: string[] | null;
}

interface AiReportResponse {
  title: string;
  instructions: string[];
  bullet_lines: BulletLine[];
  traceability: { project: string; bullet_field: string; text: string; sources: string[] }[];
  source_map: Record<string, AiReportComment>;
}

/** API'den gelen project-groups verisi */
interface ProjectGroupData {
  id: string;
  name: string;
  projectIds: string[];
}

/** Sol panel render için hiyerarşik yapı */
interface ProjectGroup {
  groupName: string | null; // null → proje adı direkt başlık
  projects: { project: ProjectData; comments: CommentData[] }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getWeekStart = (): string => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
};

const sevenDaysAgoDate = (): Date => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return d;
};

const SKIP_PHRASES = ['(bir bilgi girilmemiştir.)', 'bir bilgi girilmemiştir', '-genel'];
const isSkippable = (t: string) => !t?.trim() || SKIP_PHRASES.some(p => t.toLowerCase().includes(p));

const safeParseDate = (s?: string | null): Date | null => {
  if (!s) return null;
  try { const d = new Date(s); return isNaN(d.getTime()) ? null : d; } catch { return null; }
};

const buildRelevantProjectIds = (username: string, projects: ProjectData[], teams: TeamData[]): Set<string> => {
  const ids = new Set<string>();
  const myTeamIds = new Set(teams.filter(t => t.leader === username || t.members.includes(username)).map(t => t.id));
  const myTeamProjectIds = new Set(teams.filter(t => myTeamIds.has(t.id) && t.projectId).map(t => t.projectId!));
  for (const p of projects) {
    if ((p.members ?? []).includes(username)) { ids.add(p.id); continue; }
    if (p.owner === username) { ids.add(p.id); continue; }
    if ((p.ilgiliEkipIdleri ?? []).some(tid => myTeamIds.has(tid))) { ids.add(p.id); continue; }
    if (myTeamProjectIds.has(p.id)) ids.add(p.id);
  }
  return ids;
};

const buildCommentsByProject = (comments: CommentData[], relevantIds: Set<string>): Map<string, CommentData[]> => {
  const threshold = sevenDaysAgoDate();
  const map = new Map<string, CommentData[]>();
  for (const c of comments) {
    if (!relevantIds.has(c.projectId) || isSkippable(c.content)) continue;
    const d = safeParseDate(c.date);
    if (d && d < threshold) continue;
    const list = map.get(c.projectId) ?? [];
    list.push(c);
    map.set(c.projectId, list);
  }
  return map;
};

/**
 * Projeleri gerçek project-groups verisine göre hiyerarşik yapıya çevirir.
 * projectGroups: GET /api/project-groups → { id, name, projectIds[] }[]
 * Gruba dahil olmayan projeler groupName=null olarak listelenir.
 */
const buildProjectGroups = (
  projects: ProjectData[],
  commentsByProject: Map<string, CommentData[]>,
  apiGroups: ProjectGroupData[]
): ProjectGroup[] => {
  const withComments = projects.filter(p => (commentsByProject.get(p.id) ?? []).length > 0);

  // Her projenin hangi gruba ait olduğunu bul (ilk eşleşen grup kullanılır)
  const projectToGroup = new Map<string, string>(); // projectId → groupName
  for (const g of apiGroups) {
    for (const pid of g.projectIds) {
      if (!projectToGroup.has(pid)) projectToGroup.set(pid, g.name);
    }
  }

  const groupMap = new Map<string, { project: ProjectData; comments: CommentData[] }[]>();
  const ungrouped: { project: ProjectData; comments: CommentData[] }[] = [];

  for (const p of withComments) {
    const entry = { project: p, comments: commentsByProject.get(p.id) ?? [] };
    const gName = projectToGroup.get(p.id);
    if (gName) {
      const l = groupMap.get(gName) ?? [];
      l.push(entry);
      groupMap.set(gName, l);
    } else {
      ungrouped.push(entry);
    }
  }

  const result: ProjectGroup[] = [];
  for (const [g, items] of groupMap.entries()) result.push({ groupName: g, projects: items });
  for (const item of ungrouped) result.push({ groupName: null, projects: [item] });
  return result;
};

// ─── Left panel ───────────────────────────────────────────────────────────────

interface EditableCommentProps {
  comment: CommentData;
  editMode: boolean;
  onSave: (id: string, newContent: string) => void;
  onDelete: (id: string) => void;
}

const EditableComment: React.FC<EditableCommentProps> = ({ comment, editMode, onSave, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(comment.content);

  const dateStr = comment.date?.substring(0, 10) ?? '';

  if (editing) {
    return (
      <div className="pl-4 py-2">
        <textarea
          value={val}
          onChange={e => setVal(e.target.value)}
          className="w-full bg-slate-900/60 border border-blue-500/30 rounded-xl text-white text-sm italic p-2 resize-none outline-none focus:border-blue-400/60 leading-relaxed"
          rows={2}
        />
        <div className="flex gap-2 mt-1.5">
          <button onClick={() => { onSave(comment.id, val); setEditing(false); }}
            className="text-[8px] font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-300">
            Kaydet
          </button>
          <button onClick={() => { setVal(comment.content); setEditing(false); }}
            className="text-[8px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-400">
            İptal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2 py-1.5 pl-4">
      <span className="text-blue-500 flex-shrink-0 text-xs mt-0.5">–</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-300 italic leading-relaxed">{comment.content}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[8px] font-black text-blue-400/70">{comment.username}</span>
          {dateStr && <span className="text-[8px] text-slate-600 font-mono">{dateStr}</span>}
          {editMode && (
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditing(true)}
                className="text-[8px] font-black text-slate-400 hover:text-blue-400 uppercase tracking-widest">
                düzenle
              </button>
              <button onClick={() => onDelete(comment.id)}
                className="text-[8px] font-black text-slate-400 hover:text-red-400 uppercase tracking-widest">
                kaldır
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const GroupBlock: React.FC<{
  group: ProjectGroup;
  editMode: boolean;
  onCommentSave: (id: string, val: string) => void;
  onCommentDelete: (id: string) => void;
}> = ({ group, editMode, onCommentSave, onCommentDelete }) => {
  const isGrouped = group.groupName !== null;

  if (isGrouped) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-black text-white italic">[{group.groupName}]</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>
        {group.projects.map(({ project, comments }) => (
          <div key={project.id} className="mb-3 pl-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-500 text-xs">•</span>
              <span className="text-[11px] font-black text-slate-300 tracking-tight">{project.title}</span>
            </div>
            <div className="border-l border-white/5">
              {comments.map(c => (
                <EditableComment key={c.id} comment={c} editMode={editMode}
                  onSave={onCommentSave} onDelete={onCommentDelete} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const { project, comments } = group.projects[0];
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-black text-white italic">[{project.title}]</span>
        <div className="flex-1 h-px bg-white/5" />
      </div>
      <div className="border-l border-white/5">
        {comments.map(c => (
          <EditableComment key={c.id} comment={c} editMode={editMode}
            onSave={onCommentSave} onDelete={onCommentDelete} />
        ))}
      </div>
    </div>
  );
};

// ─── Right panel ──────────────────────────────────────────────────────────────

const BULLET_MARKER: Record<number, string> = { 1: '•', 2: '–', 3: '·' };
const BULLET_COLOR: Record<number, string> = { 1: 'text-slate-200', 2: 'text-slate-400', 3: 'text-slate-500' };
const BULLET_INDENT: Record<number, string> = { 1: '', 2: 'pl-5', 3: 'pl-10' };

const BulletItem: React.FC<{
  text: string; level: number; lineIdx: number; itemIdx: number;
  editMode: boolean;
  onEdit: (li: number, lv: number, ii: number, val: string) => void;
  onDelete: (li: number, lv: number, ii: number) => void;
}> = ({ text, level, lineIdx, itemIdx, editMode, onEdit, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(text);
  const marker = BULLET_MARKER[level] ?? '•';
  const color = BULLET_COLOR[level] ?? 'text-slate-200';
  const indent = BULLET_INDENT[level] ?? '';

  if (editing) {
    return (
      <div className={`px-3 py-2 ${indent}`}>
        <textarea
          value={val}
          onChange={e => setVal(e.target.value)}
          className="w-full bg-slate-900/60 border border-blue-500/30 rounded-xl text-white text-sm italic p-2 resize-none outline-none focus:border-blue-400/60"
          rows={2}
        />
        <div className="flex gap-2 mt-1.5 pl-1">
          <button onClick={() => { onEdit(lineIdx, level, itemIdx, val); setEditing(false); }}
            className="text-[8px] font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-300">
            Kaydet
          </button>
          <button onClick={() => { setVal(text); setEditing(false); }}
            className="text-[8px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-400">
            İptal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex items-start gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-all ${indent}`}>
      <span className="text-blue-500 mt-0.5 flex-shrink-0">{marker}</span>
      <span className={`${color} text-sm italic leading-relaxed flex-1`}>{text}</span>
      {editMode && (
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 self-center">
          <button onClick={() => setEditing(true)}
            className="text-[8px] font-black text-slate-500 hover:text-blue-400 uppercase tracking-widest">
            düzenle
          </button>
          <button onClick={() => onDelete(lineIdx, level, itemIdx)}
            className="text-[8px] font-black text-slate-500 hover:text-red-400 uppercase tracking-widest">
            kaldır
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export const WeeklySummary: React.FC<{ user: User }> = ({ user }) => {
  const [allComments, setAllComments] = useState<CommentData[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectData[]>([]);
  const [allTeams, setAllTeams] = useState<TeamData[]>([]);
  const [apiProjectGroups, setApiProjectGroups] = useState<ProjectGroupData[]>([]);
  const [reportData, setReportData] = useState<AiReportResponse | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [leftEditMode, setLeftEditMode] = useState(false);
  const [rightEditMode, setRightEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [reportStatus, setReportStatus] = useState<'manuel' | 'generated' | null>(null);
  const [promptModalOpen, setPromptModalOpen] = useState(false);

  // Local editable copies of comments
  const [localComments, setLocalComments] = useState<CommentData[]>([]);

  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  const aiReportUrl = (import.meta.env.VITE_AI_REPORT_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const h = { Authorization: `Bearer ${user.accessToken}` };
        const [cRes, pRes, tRes, gRes] = await Promise.all([
          fetch(`${apiUrl}/api/comments`, { headers: h }),
          fetch(`${apiUrl}/api/projects`, { headers: h }),
          fetch(`${apiUrl}/api/teams`, { headers: h }),
          fetch(`${apiUrl}/api/project-groups`, { headers: h }),
        ]);
        const comments = cRes.ok ? await cRes.json() : [];
        setAllComments(comments);
        setLocalComments(comments);
        setAllProjects(pRes.ok ? await pRes.json() : []);
        setAllTeams(tRes.ok ? await tRes.json() : []);
        setApiProjectGroups(gRes.ok ? await gRes.json() : []);

        const savedRes = await fetch(`${apiUrl}/api/weekly-reports?weekStart=${getWeekStart()}`, { headers: h });
        if (savedRes.ok) {
          const saved = await savedRes.json();
          if (saved.reportData) { setReportData(saved.reportData); setIsSaved(true); }
          if (saved.readyToReview) setIsSubmitted(true);
          if (saved.status) setReportStatus(saved.status as 'manuel' | 'generated');
        }
      } finally { setIsLoading(false); }
    };
    load();
  }, [user.accessToken]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const relevantProjectIds = useMemo(
    () => buildRelevantProjectIds(user.username, allProjects, allTeams),
    [user.username, allProjects, allTeams]
  );

  const relevantProjects = useMemo(
    () => allProjects.filter(p => relevantProjectIds.has(p.id)),
    [allProjects, relevantProjectIds]
  );

  const commentsByProject = useMemo(
    () => buildCommentsByProject(localComments, relevantProjectIds),
    [localComments, relevantProjectIds]
  );

  const projectGroups = useMemo(
    () => buildProjectGroups(relevantProjects, commentsByProject, apiProjectGroups),
    [relevantProjects, commentsByProject, apiProjectGroups]
  );

  const totalCommentCount = useMemo(
    () => Array.from(commentsByProject.values()).reduce((a, l) => a + l.length, 0),
    [commentsByProject]
  );

  // ── Left panel actions ────────────────────────────────────────────────────

  const handleCommentSave = (id: string, newContent: string) => {
    setLocalComments(prev => prev.map(c => c.id === id ? { ...c, content: newContent } : c));
    setIsSaved(false);
  };

  const handleCommentDelete = (id: string) => {
    setLocalComments(prev => prev.filter(c => c.id !== id));
    setIsSaved(false);
  };

  // ── Right panel actions ───────────────────────────────────────────────────

  const handleBulletEdit = (lineIdx: number, level: number, itemIdx: number, newText: string) => {
    if (!reportData) return;
    const fk = `bullet${level}` as keyof BulletLine;
    setReportData({
      ...reportData,
      bullet_lines: reportData.bullet_lines.map((line, li) => {
        if (li !== lineIdx) return line;
        const arr = (line[fk] as string[] | null) ?? [];
        return { ...line, [fk]: arr.map((t, ti) => ti === itemIdx ? newText : t) };
      }),
    });
    setIsSaved(false);
    setReportStatus('manuel');
  };

  const handleBulletDelete = (lineIdx: number, level: number, itemIdx: number) => {
    if (!reportData) return;
    const fk = `bullet${level}` as keyof BulletLine;
    setReportData({
      ...reportData,
      bullet_lines: reportData.bullet_lines.map((line, li) => {
        if (li !== lineIdx) return line;
        const arr = (line[fk] as string[] | null) ?? [];
        return { ...line, [fk]: arr.filter((_, ti) => ti !== itemIdx) };
      }),
    });
    setIsSaved(false);
    setReportStatus('manuel');
  };

  // ── Generate ──────────────────────────────────────────────────────────────

  const generateReport = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    setIsSaved(false);
    try {
      const weekStart = getWeekStart();
      const h = { Authorization: `Bearer ${user.accessToken}` };

      let reviewerAiComments: AiReportComment[] = [];
      try {
        const rRes = await fetch(`${apiUrl}/api/weekly-reports/all-for-reviewer?weekStart=${weekStart}`, { headers: h });
        if (rRes.ok) {
          const reports: { id: string; username: string; weekStart: string; author: string; reportData?: { bullet_lines?: BulletLine[] } | null }[] = await rRes.json();
          for (const rep of reports) {
            if (!rep.reportData?.bullet_lines) continue;
            let cur = rep.author || rep.username;
            rep.reportData.bullet_lines.forEach((line, li) => {
              if (line.bullet0) cur = line.bullet0.replace(/^\[|\]$/g, '');
              [...(line.bullet1 ?? []), ...(line.bullet2 ?? []), ...(line.bullet3 ?? [])].forEach((txt, bi) => {
                if (!txt.trim()) return;
                reviewerAiComments.push({ commentId: `rv-${rep.id}-${li}-${bi}`, date: rep.weekStart, username: rep.author || rep.username, projectName: cur, userComment: txt });
              });
            });
          }
        }
      } catch (e) { console.warn('Reviewer raporları alınamadı:', e); }

      const threshold = sevenDaysAgoDate();
      const myComments: AiReportComment[] = [];
      for (const c of localComments) {
        if (!relevantProjectIds.has(c.projectId) || isSkippable(c.content)) continue;
        const d = safeParseDate(c.date);
        if (d && d < threshold) continue;
        const proj = allProjects.find(p => p.id === c.projectId);
        myComments.push({ commentId: c.id, date: c.date?.substring(0, 10) ?? weekStart, username: c.username, projectName: proj?.title ?? c.projectId, userComment: c.content });
      }

      const aiComments = [...reviewerAiComments, ...myComments];
      if (aiComments.length === 0) throw new Error('Hiç veri bulunamadı.');

      const res = await fetch(`${aiReportUrl}/generate_report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: aiComments, prompt: prompt || '' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data: AiReportResponse = await res.json();
      setReportData(data);
      setReportStatus('generated');
    } catch (err: unknown) {
      setGenerateError(`Rapor oluşturulamadı: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setIsGenerating(false); }
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const saveReport = async () => {
    if (!reportData) return;
    setIsSaving(true);
    try {
      const h = { Authorization: `Bearer ${user.accessToken}` };
      const reviewers: string[] = [];
      try { const tr = await fetch(`${apiUrl}/api/teams/my-teams`, { headers: h }); if (tr.ok) { const teams: { leader: string }[] = await tr.json(); for (const t of teams) if (t.leader && !reviewers.includes(t.leader)) reviewers.push(t.leader); } } catch { /* */ }
      try { const or = await fetch(`${apiUrl}/api/users/${user.username}/org-chart`, { headers: h }); if (or.ok) { const org = await or.json(); const mgr: string = org?.manager?.username ?? ''; if (mgr && !reviewers.includes(mgr)) reviewers.push(mgr); } } catch { /* */ }
      const res = await fetch(`${apiUrl}/api/weekly-reports`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify({ weekStart: getWeekStart(), reportData, author: user.username, reviewer: reviewers[0] ?? '', reviewers, readyToReview: false, status: reportStatus ?? 'generated' }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setIsSaved(true);
    } catch (e) { console.error('Kayıt hatası:', e); } finally { setIsSaving(false); }
  };

  const submitToManager = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/weekly-reports/submit`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.accessToken}` }, body: JSON.stringify({ weekStart: getWeekStart() }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setIsSubmitted(true);
    } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
  };

  const handleDownloadDocx = async () => {
    if (!reportData) return;
    setIsDownloading(true);
    try {
      const res = await fetch(`${aiReportUrl}/generate_docx`, { method: 'POST', headers: { accept: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Type': 'application/json' }, body: JSON.stringify({ bullet_lines: reportData.bullet_lines }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'haftalik_rapor.docx'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err: unknown) { setGenerateError(`Docx indirilemedi: ${err instanceof Error ? err.message : String(err)}`); }
    finally { setIsDownloading(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-700">

      {/* Prompt Modal */}
      {promptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPromptModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">AI Yönergesi</p>
                <p className="text-sm font-black text-white italic mt-0.5">Prompt Düzenle</p>
              </div>
              <button onClick={() => setPromptModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                ✕
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Rapor formatı, vurgu noktaları veya kapsam hakkında yönerge girin..."
              rows={6}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-blue-500/40 transition-colors resize-none leading-relaxed italic"
              autoFocus
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setPrompt('')}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all">
                Temizle
              </button>
              <button onClick={() => setPromptModalOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95">
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter italic">Haftalık Konsolide Rapor</h2>
          <p className="text-[9px] font-black text-blue-500/60 uppercase tracking-[0.4em] mt-1 border-l-2 border-blue-600 pl-3">Organizasyonel Zeka Merkezi</p>
        </div>
        <div className="flex items-center gap-3">
          {reportStatus && (
            <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${reportStatus === 'manuel' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'}`}>
              {reportStatus === 'manuel' ? 'Manuel' : 'AI Generated'}
            </span>
          )}
          <div className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
            Son 7 Gün · {getWeekStart()}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex gap-5 h-[calc(100vh-250px)]">

        {/* ── SOL: Ham yorumlar ── */}
        <div className="flex-1 flex flex-col bg-[#0f172a]/60 backdrop-blur-3xl rounded-3xl border border-white/5 overflow-hidden min-w-0">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Ham Yorumlar</p>
              <p className="text-sm font-black text-white italic mt-0.5">İlgili Projeler</p>
            </div>
            <div className="flex items-center gap-2">
              {totalCommentCount > 0 && (
                <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                  {totalCommentCount}
                </span>
              )}
              <button
                onClick={() => setLeftEditMode(p => !p)}
                className={`px-3 py-1.5 rounded-xl font-black text-[8px] uppercase tracking-widest transition-all border ${leftEditMode ? 'bg-blue-600/30 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'}`}
              >
                {leftEditMode ? '✅ Bitti' : '✏️ Düzenle'}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin" />
              </div>
            ) : projectGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
                  </svg>
                </div>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Yorum yok</p>
                <p className="text-[9px] text-slate-700 mt-1 leading-relaxed">Son 7 günde ilgili<br />projede yorum bulunamadı</p>
              </div>
            ) : (
              projectGroups.map((g, i) => (
                <GroupBlock key={i} group={g} editMode={leftEditMode}
                  onCommentSave={handleCommentSave} onCommentDelete={handleCommentDelete} />
              ))
            )}
          </div>
        </div>

        {/* ── SAĞ: Prompt + AI Summary ── */}
        <div className="flex-1 flex flex-col bg-[#0f172a]/60 backdrop-blur-3xl rounded-3xl border border-white/5 overflow-hidden min-w-0">
          {/* Header */}
          <div className="px-6 py-3.5 border-b border-white/5 flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">AI Çıktısı</p>
              <p className="text-sm font-black text-white italic mt-0.5">Haftalık Özet</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setRightEditMode(p => !p); if (!rightEditMode) setReportStatus('manuel'); }}
                disabled={!reportData}
                className={`px-3 py-1.5 rounded-xl font-black text-[8px] uppercase tracking-widest transition-all border disabled:opacity-40 ${rightEditMode ? 'bg-blue-600/30 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'}`}
              >
                {rightEditMode ? '✅ Bitti' : '✏️ Düzenle'}
              </button>
              <button
                onClick={generateReport}
                disabled={isGenerating || isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
              >
                {isGenerating ? (
                  <><div className="w-3 h-3 border border-t-white border-white/20 rounded-full animate-spin" />Üretiliyor...</>
                ) : reportData ? '↻ Yenile' : '✨ Generate'}
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center h-48 gap-4">
                <div className="w-8 h-8 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rapor üretiliyor...</p>
              </div>
            ) : !reportData ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                <div className="w-12 h-12 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-sm font-black text-slate-400 italic mb-2">Henüz rapor oluşturulmadı</p>
                <p className="text-[9px] text-slate-600 mb-5 leading-relaxed">Üstteki "Generate" butonuna<br />tıklayarak özet oluşturun</p>
                <button onClick={generateReport}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI Generate Etsin
                </button>
                {generateError && (
                  <div className="mt-4 px-4 py-3 bg-red-900/20 border border-red-500/30 rounded-xl w-full text-left">
                    <p className="text-[10px] text-red-400 italic">{generateError}</p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {generateError && (
                  <div className="px-4 py-3 mb-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                    <p className="text-[10px] text-red-400 italic">{generateError}</p>
                  </div>
                )}
                {reportData.bullet_lines.map((line, li) => (
                  <div key={`line-${li}`} className="mb-6">
                    {line.bullet0 && (
                      <div className="flex items-center gap-3 mb-3 pb-2 border-b border-white/10">
                        <h3 className="text-sm font-black text-white italic tracking-tight">
                          {line.bullet0.replace(/^\[|\]$/g, '')}
                        </h3>
                      </div>
                    )}
                    {line.bullet1?.map((t, i) => (
                      <BulletItem key={`${li}-1-${i}`} text={t} level={1} lineIdx={li} itemIdx={i}
                        editMode={rightEditMode} onEdit={handleBulletEdit} onDelete={handleBulletDelete} />
                    ))}
                    {line.bullet2?.map((t, i) => (
                      <BulletItem key={`${li}-2-${i}`} text={t} level={2} lineIdx={li} itemIdx={i}
                        editMode={rightEditMode} onEdit={handleBulletEdit} onDelete={handleBulletDelete} />
                    ))}
                    {line.bullet3?.map((t, i) => (
                      <BulletItem key={`${li}-3-${i}`} text={t} level={3} lineIdx={li} itemIdx={i}
                        editMode={rightEditMode} onEdit={handleBulletEdit} onDelete={handleBulletDelete} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <div className="w-44 flex-shrink-0 flex flex-col gap-3">
          {/* Durum */}
          <div className="bg-[#0f172a]/60 backdrop-blur-3xl rounded-2xl border border-white/5 p-4">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3">Durum</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400">Kayıt</span>
                <span className={`text-[9px] font-black ${isSaved ? 'text-emerald-400' : 'text-slate-600'}`}>{isSaved ? '✓' : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400">Gönderim</span>
                <span className={`text-[9px] font-black ${isSubmitted ? 'text-purple-400' : 'text-slate-600'}`}>{isSubmitted ? '✓' : '—'}</span>
              </div>
            </div>
          </div>

          {/* Aksiyonlar */}
          <div className="space-y-2">
            <button onClick={() => setPromptModalOpen(true)}
              className="w-full py-3 bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all border border-white/10 active:scale-95">
              ✍️ Prompt Düzenle
            </button>
            <button onClick={handleDownloadDocx} disabled={isDownloading || !reportData}
              className="w-full py-3 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all border border-white/5 active:scale-95">
              {isDownloading ? 'İndiriliyor...' : '⬇ Docx'}
            </button>
            <button onClick={saveReport} disabled={isSaving || !reportData}
              className="w-full py-3 bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
              {isSaving ? 'Kaydediliyor...' : isSaved ? '✅ Kaydedildi' : '💾 Kaydet'}
            </button>
            <button onClick={submitToManager} disabled={isSubmitting || !isSaved}
              className="w-full py-3 bg-purple-600/80 hover:bg-purple-500 disabled:opacity-40 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg active:scale-95">
              {isSubmitting ? 'Gönderiliyor...' : isSubmitted ? '✅ Gönderildi' : '📤 Yöneticime'}
            </button>
          </div>

          {/* Sistem */}
          <div className="mt-auto bg-[#0f172a]/60 backdrop-blur-3xl rounded-2xl border border-white/5 p-4">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Sistem</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-slate-500">Projeler</span>
                <span className="text-[8px] font-black text-slate-300">{relevantProjects.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-slate-500">Yorumlar</span>
                <span className="text-[8px] font-black text-slate-300">{totalCommentCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-slate-500">Hafta</span>
                <span className="text-[8px] font-black text-blue-400">{getWeekStart()}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
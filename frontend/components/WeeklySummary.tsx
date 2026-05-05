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

interface OrgUser {
  username: string;
  fullName: string;
  title: string;
  department: string;
  distinguishedName: string;
  manager: string;
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
  _reporter?: string;
}

interface AiReportResponse {
  title: string;
  instructions: string[];
  bullet_lines: BulletLine[];
  traceability: { project: string; bullet_field: string; text: string; sources: string[] }[];
  source_map: Record<string, AiReportComment>;
}

interface ProjectGroupData {
  id: string;
  name: string;
  projectIds: string[];
}

interface ProjectGroup {
  groupName: string | null;
  projects: { project: ProjectData; comments: CommentData[] }[];
}

// ─── Role Detection ───────────────────────────────────────────────────────────

type UserRole = 'direktor' | 'mudur' | 'ekip_lideri' | 'personel';

function detectRole(title: string, isTeamLeader: boolean): UserRole {
  const t = title.toLowerCase();
  if (
    t.includes('direktör') || t.includes('direktor') || t.includes('director') ||
    t.includes('başkan') || t.includes('baskan') || t.includes('head') ||
    t.includes('chief') || t.includes('genel müdür') || t.includes('genel mudur')
  ) return 'direktor';
  if (t.includes('müdür') || t.includes('mudur') || t.includes('manager')) return 'mudur';
  if (isTeamLeader) return 'ekip_lideri';
  return 'personel';
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

// ─── Yorum filtreleme: role bazlı ────────────────────────────────────────────

/**
 * Direktör: direct report'larının bu haftaki raporlarından gelen yorumları gösterir.
 * Müdür: manage ettiği tüm kullanıcıların (direct reports) proje yorumlarını gösterir.
 * Ekip lideri: lider olduğu ekiplerin ilgilendiği projelerdeki yorumları gösterir.
 * Personel: kendi ilgili projelerindeki yorumları gösterir.
 */
const buildRelevantProjectIds = (
  username: string,
  projects: ProjectData[],
  teams: TeamData[],
  role: UserRole
): Set<string> => {
  const ids = new Set<string>();

  if (role === 'ekip_lideri') {
    // Ekip liderinin lead ettiği ekiplerin ilgilendiği projeler
    const ledTeams = teams.filter(t => t.leader === username);
    const ledTeamIds = new Set(ledTeams.map(t => t.id));
    const ledProjectIds = new Set(ledTeams.filter(t => t.projectId).map(t => t.projectId!));
    for (const p of projects) {
      if ((p.ilgiliEkipIdleri ?? []).some(tid => ledTeamIds.has(tid))) { ids.add(p.id); continue; }
      if (ledProjectIds.has(p.id)) ids.add(p.id);
    }
    return ids;
  }

  if (role === 'personel') {
    const myTeamIds = new Set(teams.filter(t => t.leader === username || t.members.includes(username)).map(t => t.id));
    const myTeamProjectIds = new Set(teams.filter(t => myTeamIds.has(t.id) && t.projectId).map(t => t.projectId!));
    for (const p of projects) {
      if ((p.members ?? []).includes(username)) { ids.add(p.id); continue; }
      if (p.owner === username) { ids.add(p.id); continue; }
      if ((p.ilgiliEkipIdleri ?? []).some(tid => myTeamIds.has(tid))) { ids.add(p.id); continue; }
      if (myTeamProjectIds.has(p.id)) ids.add(p.id);
    }
    return ids;
  }

  // Müdür ve direktör için tüm proje id'leri — filtreleme comment seviyesinde yapılır
  for (const p of projects) ids.add(p.id);
  return ids;
};

/**
 * Direktör için: direct report'larının haftalık raporlarından türetilen yorumlar.
 * Müdür için: direct report'larının proje yorumları (allComments içinden).
 * Ekip lideri / personel için: ilgili projelerdeki son 7 gün yorumları.
 */
const buildCommentsByProject = (
  comments: CommentData[],
  relevantIds: Set<string>,
  role: UserRole,
  directReportUsernames: Set<string>
): Map<string, CommentData[]> => {
  const threshold = sevenDaysAgoDate();
  const map = new Map<string, CommentData[]>();

  for (const c of comments) {
    if (!relevantIds.has(c.projectId) || isSkippable(c.content)) continue;
    const d = safeParseDate(c.date);
    if (d && d < threshold) continue;

    // Müdür: sadece direct report'larının yorumlarını göster
    if (role === 'mudur' && !directReportUsernames.has(c.username)) continue;

    // Direktör: comment görmemeli — bu fonksiyon direktör için çağrılmaz
    if (role === 'direktor') continue;

    const list = map.get(c.projectId) ?? [];
    list.push(c);
    map.set(c.projectId, list);
  }
  return map;
};

const buildProjectGroups = (
  projects: ProjectData[],
  commentsByProject: Map<string, CommentData[]>,
  apiGroups: ProjectGroupData[]
): ProjectGroup[] => {
  const withComments = projects.filter(p => (commentsByProject.get(p.id) ?? []).length > 0);
  const projectToGroup = new Map<string, string>();
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

// ─── Left panel: read-only comment card ──────────────────────────────────────

const CommentCard: React.FC<{ comment: CommentData; projectTitle?: string }> = ({ comment, projectTitle }) => {
  const dateStr = comment.date?.substring(0, 10) ?? '';
  return (
    <div className="flex items-start gap-2 py-1.5 pl-4">
      <span className="text-blue-500 flex-shrink-0 text-xs mt-0.5">–</span>
      <div className="flex-1 min-w-0">
        {projectTitle && (
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{projectTitle}</p>
        )}
        <p className="text-sm text-slate-300 italic leading-relaxed">{comment.content}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[8px] font-black text-blue-400/70">{comment.username}</span>
          {dateStr && <span className="text-[8px] text-slate-600 font-mono">{dateStr}</span>}
        </div>
      </div>
    </div>
  );
};

const GroupBlock: React.FC<{ group: ProjectGroup }> = ({ group }) => {
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
                <CommentCard key={c.id} comment={c} />
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
          <CommentCard key={c.id} comment={c} />
        ))}
      </div>
    </div>
  );
};

// ─── Direktör için: müdür raporlarından gelen özet bullet view ────────────────

interface DirectorReportEntry {
  username: string;
  fullName?: string;
  reportData: AiReportResponse | null;
}

const DirectorCommentView: React.FC<{ entries: DirectorReportEntry[] }> = ({ entries }) => {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Rapor yok</p>
        <p className="text-[9px] text-slate-700 mt-1 leading-relaxed">Bu hafta için müdür raporu<br />bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {entries.map(entry => (
        <div key={entry.username} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-black text-white italic">[{entry.fullName || entry.username}]</span>
            <div className="flex-1 h-px bg-white/5" />
            {!entry.reportData && (
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Rapor yok</span>
            )}
          </div>
          {entry.reportData && (
            <div className="border-l border-white/5 pl-4 space-y-1">
              {entry.reportData.bullet_lines.map((line, li) => (
                <div key={li}>
                  {line.bullet0 && (
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 mb-1">
                      {line.bullet0.replace(/^\[|\]$/g, '')}
                    </p>
                  )}
                  {[...(line.bullet1 ?? []), ...(line.bullet2 ?? []), ...(line.bullet3 ?? [])].map((t, i) => (
                    <div key={i} className="flex items-start gap-2 py-1">
                      <span className="text-blue-500 flex-shrink-0 text-xs mt-0.5">–</span>
                      <p className="text-sm text-slate-300 italic leading-relaxed">{t}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Right panel bullet items ─────────────────────────────────────────────────

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
  const [allOrgUsers, setAllOrgUsers] = useState<OrgUser[]>([]);
  const [apiProjectGroups, setApiProjectGroups] = useState<ProjectGroupData[]>([]);
  const [reportData, setReportData] = useState<AiReportResponse | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingRaw, setIsFetchingRaw] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [rightEditMode, setRightEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [reportStatus, setReportStatus] = useState<'manuel' | 'generated' | null>(null);
  const [promptModalOpen, setPromptModalOpen] = useState(false);

  // Direktör için: direct report'larının raporları
  const [directorReports, setDirectorReports] = useState<DirectorReportEntry[]>([]);
  const [directorReportsLoading, setDirectorReportsLoading] = useState(false);

  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  const aiReportUrl = (import.meta.env.VITE_AI_REPORT_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

  // ── Rol tespiti ──────────────────────────────────────────────────────────

  const isTeamLeader = useMemo(
    () => allTeams.some(t => t.leader === user.username),
    [allTeams, user.username]
  );

  const userRole = useMemo(
    () => detectRole(user.title ?? '', isTeamLeader),
    [user.title, isTeamLeader]
  );

  // Müdür/direktör için: current user'ın distinguishedName'i
  const currentUserDN = useMemo(
    () => allOrgUsers.find(u => u.username === user.username)?.distinguishedName ?? '',
    [allOrgUsers, user.username]
  );

  // Direct report'lar (müdür/direktör için)
  const directReports = useMemo(
    () => allOrgUsers.filter(u => u.manager === currentUserDN),
    [allOrgUsers, currentUserDN]
  );

  const directReportUsernames = useMemo(
    () => new Set(directReports.map(u => u.username)),
    [directReports]
  );

  // ── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const h = { Authorization: `Bearer ${user.accessToken}` };
        const [cRes, pRes, tRes, gRes, orgRes] = await Promise.all([
          fetch(`${apiUrl}/api/comments`, { headers: h }),
          fetch(`${apiUrl}/api/projects`, { headers: h }),
          fetch(`${apiUrl}/api/teams`, { headers: h }),
          fetch(`${apiUrl}/api/project-groups`, { headers: h }),
          fetch(`${apiUrl}/api/users/all-org`, { headers: h }),
        ]);
        setAllComments(cRes.ok ? await cRes.json() : []);
        setAllProjects(pRes.ok ? await pRes.json() : []);
        setAllTeams(tRes.ok ? await tRes.json() : []);
        setApiProjectGroups(gRes.ok ? await gRes.json() : []);
        setAllOrgUsers(orgRes.ok ? await orgRes.json() : []);

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

  // ── Direktör için: direct report'larının bu haftaki raporlarını yükle ────

  useEffect(() => {
    if (userRole !== 'direktor' || directReports.length === 0) return;
    const loadDirectorReports = async () => {
      setDirectorReportsLoading(true);
      const h = { Authorization: `Bearer ${user.accessToken}` };
      const weekStart = getWeekStart();
      const entries: DirectorReportEntry[] = [];
      for (const dr of directReports) {
        try {
          const res = await fetch(
            `${apiUrl}/api/weekly-reports/by-user?username=${dr.username}&weekStart=${weekStart}`,
            { headers: h }
          );
          if (res.ok) {
            const dto = await res.json();
            entries.push({ username: dr.username, fullName: dr.fullName, reportData: dto.reportData ?? null });
          } else {
            entries.push({ username: dr.username, fullName: dr.fullName, reportData: null });
          }
        } catch {
          entries.push({ username: dr.username, fullName: dr.fullName, reportData: null });
        }
      }
      setDirectorReports(entries);
      setDirectorReportsLoading(false);
    };
    loadDirectorReports();
  }, [userRole, directReports, user.accessToken]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const relevantProjectIds = useMemo(
    () => buildRelevantProjectIds(user.username, allProjects, allTeams, userRole),
    [user.username, allProjects, allTeams, userRole]
  );

  const relevantProjects = useMemo(
    () => allProjects.filter(p => relevantProjectIds.has(p.id)),
    [allProjects, relevantProjectIds]
  );

  const commentsByProject = useMemo(
    () => buildCommentsByProject(allComments, relevantProjectIds, userRole, directReportUsernames),
    [allComments, relevantProjectIds, userRole, directReportUsernames]
  );

  const projectGroups = useMemo(
    () => buildProjectGroups(relevantProjects, commentsByProject, apiProjectGroups),
    [relevantProjects, commentsByProject, apiProjectGroups]
  );

  const totalCommentCount = useMemo(
    () => Array.from(commentsByProject.values()).reduce((a, l) => a + l.length, 0),
    [commentsByProject]
  );

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

  // ── Generate: AI ──────────────────────────────────────────────────────────

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
      for (const c of allComments) {
        if (!relevantProjectIds.has(c.projectId) || isSkippable(c.content)) continue;
        const d = safeParseDate(c.date);
        if (d && d < threshold) continue;
        if (userRole === 'mudur' && !directReportUsernames.has(c.username)) continue;
        if (userRole === 'direktor') continue;
        const proj = allProjects.find(p => p.id === c.projectId);
        myComments.push({ commentId: c.id, date: c.date?.substring(0, 10) ?? weekStart, username: c.username, projectName: proj?.title ?? c.projectId, userComment: c.content });
      }

      const aiComments = [...reviewerAiComments, ...myComments];
      if (aiComments.length === 0) throw new Error('Hiç veri bulunamadı.');

      const formatInstruction = `
Raporu aşağıdaki BulletLine[] JSON formatında üret. Her BulletLine bir objedir:
- Proje bir gruba AİT DEĞİLSE: { "bullet0": "[Proje Adı]", "bullet1": ["yorum1", "yorum2"], "bullet2": null, "bullet3": null }
- Proje bir gruba AİTSE: Önce grup başlığı bloğu: { "bullet0": "[Grup Adı]", "bullet1": null, "bullet2": null, "bullet3": null }, ardından her proje için: { "bullet0": null, "bullet1": ["Proje Adı"], "bullet2": ["yorum1", "yorum2"], "bullet3": null }
bullet3 daima null olmalı. Yorumları özetle ve grupla, tekrarları birleştir.
${prompt || ''}`.trim();

      const res = await fetch(`${aiReportUrl}/generate_report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: aiComments, prompt: formatInstruction }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data: AiReportResponse = await res.json();
      setReportData(data);
      setReportStatus('generated');
    } catch (err: unknown) {
      setGenerateError(`Rapor oluşturulamadı: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setIsGenerating(false); }
  };

  // ── Generate: Raw (Olduğu Gibi Getir) ────────────────────────────────────

  /**
   * Müdür & Direktör → astların kaydedilmiş raporlarından bullet_lines'ları birleştirir.
   * Her ast kendi adıyla [Ad Soyad] başlığı altında listelenir; raporun kendi yapısı korunur.
   *
   * Ekip Lideri & Personel → commentsByProject'ten proje grubu hiyerarşisine göre oluşturur.
   */
  const fetchRawReport = async () => {
    setIsFetchingRaw(true);
    setGenerateError(null);
    setIsSaved(false);

    try {
      // ── Müdür veya Direktör: astların raporlarından flatten ────────────
      if (userRole === 'mudur' || userRole === 'direktor') {
        const h = { Authorization: `Bearer ${user.accessToken}` };
        const weekStart = getWeekStart();

        // Direktör: directorReports zaten yüklü — tekrar fetch etme
        // Müdür: directReports listesinden her birinin raporunu çek
        let reportEntries: { username: string; fullName: string; reportData: AiReportResponse | null }[] = [];

        if (userRole === 'direktor') {
          reportEntries = directorReports.map(e => ({
            username: e.username,
            fullName: e.fullName ?? e.username,
            reportData: e.reportData,
          }));
        } else {
          // Müdür: tüm direct report'ların raporlarını çek
          for (const dr of directReports) {
            try {
              const res = await fetch(
                `${apiUrl}/api/weekly-reports/by-user?username=${dr.username}&weekStart=${weekStart}`,
                { headers: h }
              );
              const reportData = res.ok ? ((await res.json()).reportData ?? null) : null;
              reportEntries.push({ username: dr.username, fullName: dr.fullName, reportData });
            } catch {
              reportEntries.push({ username: dr.username, fullName: dr.fullName, reportData: null });
            }
          }
        }

        // Astların bullet_lines'larını flatten et — her satıra _reporter etiketi ekle
        const bullet_lines: BulletLine[] = [];
        for (const entry of reportEntries) {
          if (!entry.reportData?.bullet_lines?.length) continue;
          const reporterLabel = entry.fullName || entry.username;

          // Astın raporundaki bullet_lines'ları olduğu gibi ekle, _reporter ata
          for (const line of entry.reportData.bullet_lines) {
            bullet_lines.push({ ...line, _reporter: reporterLabel });
          }
        }

        if (bullet_lines.filter(l => l.bullet1 !== null || l.bullet2 !== null).length === 0) {
          setGenerateError('Astlardan bu hafta için kayıtlı rapor bulunamadı.');
          return;
        }

        setReportData({
          title: 'Konsolide Ast Raporu',
          instructions: [],
          bullet_lines,
          traceability: [],
          source_map: {},
        });
        setReportStatus('manuel');
        return;
      }

      // ── Ekip Lideri & Personel: commentsByProject'ten oluştur ─────────
      const projectToGroup = new Map<string, string>();
      for (const g of apiProjectGroups) {
        for (const pid of g.projectIds) {
          if (!projectToGroup.has(pid)) projectToGroup.set(pid, g.name);
        }
      }

      const projectTitleMap = new Map<string, string>(allProjects.map(p => [p.id, p.title]));

      const groupMap = new Map<string, Map<string, CommentData[]>>();
      const ungroupedMap = new Map<string, CommentData[]>();

      for (const [pid, comments] of commentsByProject.entries()) {
        const gName = projectToGroup.get(pid);
        if (gName) {
          if (!groupMap.has(gName)) groupMap.set(gName, new Map());
          groupMap.get(gName)!.set(pid, comments);
        } else {
          ungroupedMap.set(pid, comments);
        }
      }

      const bullet_lines: BulletLine[] = [];

      // Gruplu projeler: bullet0=[Grup], bullet1=[Proje], bullet2=[yorumlar]
      for (const [gName, projectMap] of [...groupMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        bullet_lines.push({ bullet0: `[${gName}]`, bullet1: null, bullet2: null, bullet3: null });

        for (const [pid, comments] of projectMap.entries()) {
          const pTitle = projectTitleMap.get(pid) ?? pid;
          const validComments = comments.filter(c => !isSkippable(c.content)).map(c => c.content);
          if (validComments.length === 0) continue;
          bullet_lines.push({ bullet0: null, bullet1: [pTitle], bullet2: validComments, bullet3: null });
        }
      }

      // Grupsuz projeler: bullet0=[Proje], bullet1=[yorumlar]
      for (const [pid, comments] of [...ungroupedMap.entries()].sort()) {
        const pTitle = projectTitleMap.get(pid) ?? pid;
        const validComments = comments.filter(c => !isSkippable(c.content)).map(c => c.content);
        if (validComments.length === 0) continue;
        bullet_lines.push({ bullet0: `[${pTitle}]`, bullet1: validComments, bullet2: null, bullet3: null });
      }

      if (bullet_lines.filter(l => l.bullet1 !== null || l.bullet2 !== null).length === 0) {
        setGenerateError('Gösterilecek yorum bulunamadı.');
        return;
      }

      setReportData({
        title: 'Ham Yorum Raporu',
        instructions: [],
        bullet_lines,
        traceability: [],
        source_map: {},
      });
      setReportStatus('manuel');
    } catch (err: unknown) {
      setGenerateError(`Rapor oluşturulamadı: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsFetchingRaw(false);
    }
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
      // reportStatus === 'manuel' → Olduğu Gibi Getir formatı → generate_docx_as_is
      // reportStatus === 'generated' veya null → AI raporu → generate_docx
      const endpoint = reportStatus === 'manuel'
        ? `${aiReportUrl}/generate_docx_as_is`
        : `${aiReportUrl}/generate_docx`;

      // _reporter alanını server'a göndermeden önce temizle (generate_docx için)
      // generate_docx_as_is zaten extra alanları ignore ediyor, ama yine de temiz tutalım
      const cleanLines = reportData.bullet_lines.map(({ _reporter, ...rest }) => rest);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          accept: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bullet_lines: cleanLines }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'haftalik_rapor.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err: unknown) {
      setGenerateError(`Docx indirilemedi: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // ── Sol panel içeriği (role göre) ─────────────────────────────────────────

  const renderLeftContent = () => {
    if (isLoading || directorReportsLoading) {
      return (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin" />
        </div>
      );
    }

    if (userRole === 'direktor') {
      return <DirectorCommentView entries={directorReports} />;
    }

    if (projectGroups.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
            </svg>
          </div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Yorum yok</p>
          <p className="text-[9px] text-slate-700 mt-1 leading-relaxed">Son 7 günde ilgili<br />projede yorum bulunamadı</p>
        </div>
      );
    }

    return projectGroups.map((g, i) => <GroupBlock key={i} group={g} />);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const roleBadgeMap: Record<UserRole, { label: string; color: string }> = {
    direktor: { label: 'Direktör', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    mudur: { label: 'Müdür', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
    ekip_lideri: { label: 'Ekip Lideri', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    personel: { label: 'Personel', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  };

  const roleBadge = roleBadgeMap[userRole];

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
          <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${roleBadge.color}`}>
            {roleBadge.label}
          </span>
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

        {/* ── SOL: Ham yorumlar (read-only) ── */}
        <div className="flex-1 flex flex-col bg-[#0f172a]/60 backdrop-blur-3xl rounded-3xl border border-white/5 overflow-hidden min-w-0">
          <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                {userRole === 'direktor' ? 'Müdür Raporları' : 'Ham Yorumlar'}
              </p>
              <p className="text-sm font-black text-white italic mt-0.5">
                {userRole === 'direktor' ? 'Direct Report Özetleri' : 'İlgili Projeler'}
              </p>
            </div>
            {userRole !== 'direktor' && totalCommentCount > 0 && (
              <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                {totalCommentCount}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
            {renderLeftContent()}
          </div>
        </div>

        {/* ── SAĞ: Rapor Çıktısı ── */}
        <div className="flex-1 flex flex-col bg-[#0f172a]/60 backdrop-blur-3xl rounded-3xl border border-white/5 overflow-hidden min-w-0">
          <div className="px-6 py-3.5 border-b border-white/5 flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Rapor Çıktısı</p>
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
              {/* Olduğu Gibi Getir */}
              <button
                onClick={fetchRawReport}
                disabled={isFetchingRaw || isLoading || (userRole === 'personel' || userRole === 'ekip_lideri' ? totalCommentCount === 0 : false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/70 hover:bg-slate-600/70 disabled:opacity-40 text-slate-200 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border border-white/10 active:scale-95"
              >
                {isFetchingRaw ? (
                  <><div className="w-3 h-3 border border-t-white border-white/20 rounded-full animate-spin" />Getiriliyor...</>
                ) : '📋 Olduğu Gibi'}
              </button>
              {/* AI Generate */}
              <button
                onClick={generateReport}
                disabled={isGenerating || isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
              >
                {isGenerating ? (
                  <><div className="w-3 h-3 border border-t-white border-white/20 rounded-full animate-spin" />Üretiliyor...</>
                ) : '✨ Yapay Zeka ile Oluştur'}
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
            {(isGenerating || isFetchingRaw) ? (
              <div className="flex flex-col items-center justify-center h-48 gap-4">
                <div className="w-8 h-8 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {isGenerating ? 'Rapor üretiliyor...' : 'Yorumlar getiriliyor...'}
                </p>
              </div>
            ) : !reportData ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                <div className="w-12 h-12 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-sm font-black text-slate-400 italic mb-2">Henüz rapor oluşturulmadı</p>
                <p className="text-[9px] text-slate-600 mb-5 leading-relaxed">
                  Yapay zeka ile özetleyin veya<br />yorumları ham halde getirin
                </p>
                <div className="flex gap-3">
                  <button onClick={fetchRawReport} disabled={(userRole === 'personel' || userRole === 'ekip_lideri') && totalCommentCount === 0}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/70 hover:bg-slate-600/70 disabled:opacity-40 text-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/10 active:scale-95">
                    📋 Olduğu Gibi Getir
                  </button>
                  <button onClick={generateReport}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Yapay Zeka ile Oluştur
                  </button>
                </div>
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
                  <div key={`line-${li}`} className="mb-4">
                    {/* bullet0: grup veya proje başlığı */}
                    {line.bullet0 && (
                      <div className="flex items-center gap-3 mt-5 mb-2 pb-2 border-b border-white/10">
                        <h3 className="text-sm font-black text-white italic tracking-tight flex-1">
                          {line.bullet0.replace(/^\[|\]$/g, '')}
                        </h3>
                        {line._reporter && (
                          <span className="text-[8px] font-black text-slate-500 italic tracking-wide whitespace-nowrap">
                            {line._reporter}&apos;ın raporundan
                          </span>
                        )}
                      </div>
                    )}

                    {/* bullet2 varsa → bullet1 proje alt-başlığı, bullet2 yorumlar */}
                    {line.bullet2 && line.bullet2.length > 0 ? (
                      <div className="pl-3">
                        {/* Proje adı (bullet1[0]) */}
                        {line.bullet1 && line.bullet1.length > 0 && (
                          <div className="flex items-center gap-2 mt-2 mb-1">
                            <span className="text-blue-500 flex-shrink-0">•</span>
                            <span className="text-[12px] font-black text-slate-200 italic tracking-tight">
                              {line.bullet1[0]}
                            </span>
                          </div>
                        )}
                        {/* Yorumlar (bullet2) */}
                        <div className="pl-4">
                          {line.bullet2.map((t, i) => (
                            <BulletItem key={`${li}-2-${i}`} text={t} level={2} lineIdx={li} itemIdx={i}
                              editMode={rightEditMode} onEdit={handleBulletEdit} onDelete={handleBulletDelete} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* bullet2 yok → bullet1 doğrudan yorumlar */
                      line.bullet1?.map((t, i) => (
                        <BulletItem key={`${li}-1-${i}`} text={t} level={1} lineIdx={li} itemIdx={i}
                          editMode={rightEditMode} onEdit={handleBulletEdit} onDelete={handleBulletDelete} />
                      ))
                    )}

                    {/* bullet3: her zaman yorum olarak render (AI çıktısı için) */}
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
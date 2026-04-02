import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../App';
import { UserAvatar } from './UserAvatar';
import { isElevatedTitle } from '../utils/titleHelpers';

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
}

interface OrgUser {
  username: string;
  fullName: string;
  title: string;
  distinguishedName: string;
  manager: string;
}

interface TeamDto {
  id: string;
  title: string;
  leader: string;
  members: string[];
  projectId: string;
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

interface TraceabilityEntry {
  project: string;
  bullet_field: string;
  text: string;
  sources: string[];
}

interface AiReportResponse {
  title: string;
  instructions: string[];
  bullet_lines: BulletLine[];
  traceability: TraceabilityEntry[];
  source_map: Record<string, AiReportComment>;
}

const BULLET_MARKER: Record<number, string> = { 1: '•', 2: '–', 3: '·' };
const BULLET_COLOR: Record<number, string> = { 1: 'text-slate-200', 2: 'text-slate-400', 3: 'text-slate-500' };
const BULLET_INDENT: Record<number, string> = { 1: '', 2: 'pl-6', 3: 'pl-12' };

export const ProjectSummary: React.FC<{ user: User }> = ({ user }) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  const aiReportUrl = (import.meta.env.VITE_AI_REPORT_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

  const [allUsers, setAllUsers] = useState<OrgUser[]>([]);
  const [allTeams, setAllTeams] = useState<TeamDto[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [reportData, setReportData] = useState<AiReportResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hoveredBullet, setHoveredBullet] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [usersRes, teamsRes, projectsRes] = await Promise.all([
          fetch(`${apiUrl}/api/users/all-org`, { headers: { Authorization: `Bearer ${user.accessToken}` } }),
          fetch(`${apiUrl}/api/teams`, { headers: { Authorization: `Bearer ${user.accessToken}` } }),
          fetch(`${apiUrl}/api/projects`, { headers: { Authorization: `Bearer ${user.accessToken}` } }),
        ]);
        setAllUsers(usersRes.ok ? await usersRes.json() : []);
        setAllTeams(teamsRes.ok ? await teamsRes.json() : []);
        setAllProjects(projectsRes.ok ? await projectsRes.json() : []);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [apiUrl, user.accessToken]);

  const isElevated = isElevatedTitle(user.title ?? '');

  // Find all subordinate usernames (direct reports and their descendants)
  const subordinateUsernames = useMemo((): Set<string> => {
    const currentUserDN = allUsers.find(u => u.username === user.username)?.distinguishedName ?? '';
    if (!currentUserDN) return new Set();

    const result = new Set<string>();
    const queue = [currentUserDN];
    while (queue.length > 0) {
      const dn = queue.shift()!;
      for (const u of allUsers) {
        if (u.manager === dn && u.username !== user.username) {
          result.add(u.username);
          if (u.distinguishedName) queue.push(u.distinguishedName);
        }
      }
    }
    return result;
  }, [allUsers, user.username]);

  // Teams where the current user is the leader
  const myLedTeams = useMemo(() => allTeams.filter(t => t.leader === user.username), [allTeams, user.username]);

  // Project IDs from teams the current user leads
  const myLedProjectIds = useMemo(
    () => new Set(myLedTeams.map(t => t.projectId).filter((id): id is string => Boolean(id))),
    [myLedTeams]
  );

  // Members of teams led by the current user, keyed by projectId
  const myTeamMembersByProject = useMemo((): Map<string, Set<string>> => {
    const map = new Map<string, Set<string>>();
    for (const team of myLedTeams) {
      if (!team.projectId) continue;
      const members = map.get(team.projectId) ?? new Set<string>();
      for (const m of team.members) members.add(m);
      if (team.leader) members.add(team.leader);
      map.set(team.projectId, members);
    }
    return map;
  }, [myLedTeams]);

  // Projects available for report generation.
  // Elevated users see all projects where their org-chart subordinates are involved.
  // Team leaders (non-elevated) see only projects from teams they lead.
  const relevantProjects = useMemo((): ProjectData[] => {
    if (isElevated) {
      if (subordinateUsernames.size === 0) return [];
      const projectIds = new Set<string>();
      for (const team of allTeams) {
        const hasSubordinate =
          subordinateUsernames.has(team.leader) ||
          team.members.some(m => subordinateUsernames.has(m));
        if (hasSubordinate && team.projectId) {
          projectIds.add(team.projectId);
        }
      }
      return allProjects.filter(p => projectIds.has(p.id));
    }
    // Non-elevated users (team leaders): only their own led teams' projects
    return allProjects.filter(p => myLedProjectIds.has(p.id));
  }, [allTeams, allProjects, subordinateUsernames, myLedProjectIds, isElevated]);

  const generateReport = async () => {
    if (!selectedProjectId) {
      setGenerateError('Lütfen önce bir proje seçin.');
      return;
    }
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const commentsRes = await fetch(`${apiUrl}/api/comments/by-project/${selectedProjectId}`, {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      if (!commentsRes.ok) throw new Error(`Yorumlar alınamadı: HTTP ${commentsRes.status}`);
      const projectComments: CommentData[] = await commentsRes.json();

      const selectedProject = allProjects.find(p => p.id === selectedProjectId);
      const projectName = selectedProject?.title ?? selectedProjectId;

      // Include comments from relevant users for the selected project.
      // Elevated users use their org-chart subordinates; team leaders use their team members.
      const allowedUsernames: Set<string> = isElevated
        ? new Set([...subordinateUsernames, user.username])
        : new Set([...(myTeamMembersByProject.get(selectedProjectId) ?? []), user.username]);

      const targetComments = projectComments.filter(c => allowedUsernames.has(c.username));

      if (targetComments.length === 0) {
        throw new Error(
          isElevated
            ? "Seçilen projede AST'larınızın yorumu bulunamadı. Önce proje yorumları ekleyin."
            : "Seçilen projede ekip üyelerinizin yorumu bulunamadı. Önce proje yorumları ekleyin."
        );
      }

      const aiComments: AiReportComment[] = targetComments.map(c => ({
        commentId: c.id,
        date: c.date ? c.date.substring(0, 10) : new Date().toISOString().substring(0, 10),
        username: c.username,
        projectName,
        userComment: c.content,
      }));

      const payload = { comments: aiComments, prompt: prompt || '' };

      const response = await fetch(`${aiReportUrl}/generate_report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const data: AiReportResponse = await response.json();
      setReportData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGenerateError(`Rapor oluşturulamadı: ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBulletEdit = (lineIdx: number, level: number, itemIdx: number, newText: string) => {
    if (!reportData) return;
    const fieldKey = `bullet${level}` as keyof BulletLine;
    const newBulletLines = reportData.bullet_lines.map((line, li) => {
      if (li !== lineIdx) return line;
      const arr = (line[fieldKey] as string[] | null) ?? [];
      const newArr = arr.map((t, ti) => (ti === itemIdx ? newText : t));
      return { ...line, [fieldKey]: newArr };
    });

    const oldLine = reportData.bullet_lines[lineIdx];
    const oldArr = (oldLine[fieldKey] as string[] | null) ?? [];
    const oldText = oldArr[itemIdx] ?? '';
    const bulletField = `bullet${level}`;
    const newTraceability = reportData.traceability.map(entry => {
      if (entry.bullet_field === bulletField && entry.text === oldText) {
        return { ...entry, text: newText, sources: ['MANUALLY_WRITTEN'] };
      }
      return entry;
    });
    const newSourceMap = {
      ...reportData.source_map,
      MANUALLY_WRITTEN: {
        commentId: 'MANUALLY_WRITTEN',
        date: '',
        username: 'MANUAL_EDIT',
        projectName: '',
        userComment: 'Bu alan manuel olarak düzenlenmiştir.',
      },
    };
    setReportData({ ...reportData, bullet_lines: newBulletLines, traceability: newTraceability, source_map: newSourceMap });
  };

  const traceabilityMap = useMemo((): Map<string, AiReportComment[]> => {
    const map = new Map<string, AiReportComment[]>();
    if (!reportData) return map;
    for (const entry of reportData.traceability) {
      map.set(entry.text, entry.sources.map(id => reportData.source_map[id]).filter(Boolean));
    }
    return map;
  }, [reportData]);

  const getSourceComments = (text: string): AiReportComment[] => traceabilityMap.get(text) ?? [];

  const renderBulletItem = (text: string, level: number, bulletKey: string, lineIdx: number, itemIdx: number): React.ReactNode => {
    const sources = getSourceComments(text);
    const marker = BULLET_MARKER[level] ?? '•';
    const color = BULLET_COLOR[level] ?? 'text-slate-200';
    const indent = BULLET_INDENT[level] ?? '';

    return (
      <div key={bulletKey}>
        <div
          className={`relative group/bullet ${indent}`}
          onMouseEnter={() => setHoveredBullet(bulletKey)}
          onMouseLeave={() => setHoveredBullet(null)}
        >
          <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-all cursor-default">
            <span className="text-purple-500 mt-1">{marker}</span>
            {isEditMode ? (
              <textarea
                key={text}
                defaultValue={text}
                onBlur={(e) => handleBulletEdit(lineIdx, level, itemIdx, e.target.value)}
                className="bg-slate-900/60 border border-purple-500/30 rounded-xl text-white text-sm italic p-2 w-full resize-none outline-none focus:border-purple-400/60"
                rows={2}
              />
            ) : (
              <span className={`${color} text-sm italic leading-relaxed flex-1`}>{text}</span>
            )}
            {sources.length > 0 && (
              <span className="text-[8px] font-black text-purple-500/40 uppercase tracking-widest self-center opacity-0 group-hover/bullet:opacity-100 transition-opacity">
                {sources.length} kaynak
              </span>
            )}
          </div>

          {hoveredBullet === bulletKey && sources.length > 0 && (
            <div className="absolute left-4 top-full mt-2 z-50 w-80 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="bg-[#0f172a] border border-purple-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
                <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest mb-3">Kaynak Yorumlar</p>
                {sources.map((c, i) => (
                  <div key={i} className="mb-3 last:mb-0 p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <UserAvatar username={c.username} displayName={c.username} accessToken={user.accessToken} size="sm" />
                      <span className="text-white font-black text-[10px] italic">{c.username}</span>
                      <span className="text-slate-600 text-[8px]">{c.date}</span>
                    </div>
                    <p className="text-slate-400 text-[10px] italic leading-relaxed">"{c.userComment}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBulletLines = (): React.ReactNode[] => {
    if (!reportData) return [];
    return reportData.bullet_lines.map((line, lineIdx) => (
      <div key={`line-${lineIdx}`} className="mb-8">
        {line.bullet0 && (
          <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-3">
            <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">======</span>
            <h3 className="text-base font-black text-white italic tracking-tight">
              {line.bullet0.replace(/^\[|\]$/g, '')}
            </h3>
            <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">======</span>
          </div>
        )}
        {line.bullet1?.map((text, i) => renderBulletItem(text, 1, `line-${lineIdx}-b1-${i}`, lineIdx, i))}
        {line.bullet2?.map((text, i) => renderBulletItem(text, 2, `line-${lineIdx}-b2-${i}`, lineIdx, i))}
        {line.bullet3?.map((text, i) => renderBulletItem(text, 3, `line-${lineIdx}-b3-${i}`, lineIdx, i))}
      </div>
    ));
  };

  const selectedProjectTitle = allProjects.find(p => p.id === selectedProjectId)?.title ?? '';

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter italic">Proje Bazlı Özetleme</h2>
          <p className="text-[9px] font-black text-purple-500/60 uppercase tracking-[0.4em] mt-1 border-l-2 border-purple-600 pl-3">
            AST Yorumlarından AI Özeti
          </p>
        </div>
        {selectedProjectId && (
          <div className="px-4 py-2 bg-purple-600/20 text-purple-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-purple-500/20">
            {selectedProjectTitle}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="flex gap-10 h-[calc(100vh-280px)]">
          {/* Sol Taraf: Rapor İçeriği */}
          <div className="flex-1 bg-[#1e293b]/20 backdrop-blur-3xl rounded-[3rem] border border-white/5 p-12 overflow-y-auto custom-scrollbar relative">
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="border-b border-white/5 pb-8 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-4xl font-black text-white italic tracking-tighter">Proje Faaliyet Özeti</h1>
                  <button
                    onClick={generateReport}
                    disabled={isGenerating || !selectedProjectId}
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-purple-600/20 active:scale-95 ml-4 shrink-0"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Üretiliyor...</span>
                      </>
                    ) : (
                      <span>✨ AI Generate Et</span>
                    )}
                  </button>
                </div>
                <div className="flex gap-4">
                  <div className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-purple-500/20">Gizli / Kurumsal</div>
                  <div className="px-3 py-1 bg-emerald-600/20 text-emerald-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">AI Tarafından Derlendi</div>
                </div>
              </div>

              {generateError && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-2xl">
                  <p className="text-red-400 text-xs font-bold">{generateError}</p>
                </div>
              )}

              {isGenerating && (
                <div className="flex justify-center py-10">
                  <div className="w-10 h-10 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin"></div>
                </div>
              )}

              {reportData?.instructions && reportData.instructions.length > 0 && (
                <div className="mb-6 p-4 bg-purple-900/10 border border-purple-500/20 rounded-2xl">
                  {reportData.instructions.map((inst, i) => (
                    <p key={i} className="text-purple-300/70 text-[10px] italic">{inst}</p>
                  ))}
                </div>
              )}

              {!reportData && !isGenerating ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                  <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">
                    {selectedProjectId ? 'AI Generate Et butonuna tıklayın.' : 'Lütfen önce bir proje seçin.'}
                  </p>
                </div>
              ) : (
                renderBulletLines()
              )}
            </div>
          </div>

          {/* Sağ Taraf: Proje Seçimi & AI Editor */}
          <div className="w-96 flex flex-col gap-6">
            <div className="bg-gradient-to-br from-[#0f172a] to-purple-900/10 rounded-[2.5rem] border border-white/5 p-8 flex flex-col h-full shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-white italic tracking-tight">Proje Özet Asistanı</h3>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">AST Bazlı AI Analiz</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-6">
                {/* Proje Seçimi */}
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Proje Seç</label>
                  {relevantProjects.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic px-1">Ekibinizin üyesi olduğu proje bulunamadı.</p>
                  ) : (
                    <select
                      value={selectedProjectId}
                      onChange={e => { setSelectedProjectId(e.target.value); setReportData(null); setGenerateError(null); }}
                      className="w-full bg-slate-900/50 border border-white/10 text-slate-300 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-widest outline-none focus:border-purple-500/50 transition-all"
                    >
                      <option value="">-- Proje Seçin --</option>
                      {relevantProjects.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Prompt */}
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Rapor Tonu & Kapsamı</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Örn: Raporu daha teknik bir dille revize et, finansal terimlere ağırlık ver..."
                    className="w-full h-36 bg-slate-900/50 border border-white/5 rounded-2xl p-5 text-white text-[11px] font-bold outline-none focus:border-purple-500/50 transition-all resize-none italic"
                  />
                </div>

                <div className="space-y-4">
                  <button
                    onClick={generateReport}
                    disabled={isGenerating || !selectedProjectId}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-purple-600/20 active:scale-95"
                  >
                    {isGenerating ? 'Üretiliyor...' : '✨ AI Generate Et'}
                  </button>
                  <button
                    onClick={() => setIsEditMode(prev => !prev)}
                    disabled={!reportData}
                    className="w-full py-4 bg-slate-700/50 hover:bg-slate-600/50 disabled:opacity-40 text-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/10 active:scale-95"
                  >
                    {isEditMode ? '✅ Düzenlemeyi Bitir' : '✏️ Düzenle'}
                  </button>
                </div>
              </div>

              <div className="mt-10 p-5 bg-black/20 rounded-3xl border border-white/5">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Sistem Durumu</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300 italic">Veri Kaynağı:</span>
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">TeamSync API</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-bold text-slate-300 italic">Kapsam:</span>
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">AST Yorumları</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

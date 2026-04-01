import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../App';
import { UserAvatar } from './UserAvatar';


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

export const WeeklySummary: React.FC<{ user: User }> = ({ user }) => {
  const [allComments, setAllComments] = useState<CommentData[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectData[]>([]);
  const [reportData, setReportData] = useState<AiReportResponse | null>(null);
  const [hoveredBullet, setHoveredBullet] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [reportStatus, setReportStatus] = useState<'manuel' | 'generated' | null>(null);

  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  const aiReportUrl = (import.meta.env.VITE_AI_REPORT_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

  const getWeekStart = (): string => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    return monday.toISOString().split('T')[0];
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [commentsRes, projectsRes] = await Promise.all([
          fetch(`${apiUrl}/api/comments`, { headers: { Authorization: `Bearer ${user.accessToken}` } }),
          fetch(`${apiUrl}/api/projects`, { headers: { Authorization: `Bearer ${user.accessToken}` } })
        ]);
        const comments = commentsRes.ok ? await commentsRes.json() : [];
        const projects = projectsRes.ok ? await projectsRes.json() : [];
        setAllComments(comments);
        setAllProjects(projects);

        // Load saved report for the current week
        const weekStart = getWeekStart();
        const savedReportRes = await fetch(
          `${apiUrl}/api/weekly-reports?weekStart=${weekStart}`,
          { headers: { Authorization: `Bearer ${user.accessToken}` } }
        );
        if (savedReportRes.ok) {
          const savedReport = await savedReportRes.json();
          if (savedReport.reportData) {
            setReportData(savedReport.reportData);
            setIsSaved(true);
          }
          if (savedReport.readyToReview) {
            setIsSubmitted(true);
          }
          if (savedReport.status) {
            setReportStatus(savedReport.status as 'manuel' | 'generated');
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user.accessToken]);

  const generateReport = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    setIsSaved(false);
    try {
      // Determine sub-users (members of teams where current user is leader)
      const teamsRes = await fetch(`${apiUrl}/api/teams`, {
        headers: { Authorization: `Bearer ${user.accessToken}` }
      });
      if (!teamsRes.ok) {
        throw new Error(`Takım verisi alınamadı: HTTP ${teamsRes.status}`);
      }
      const teams: { leader: string; members: string[]; projectId?: string }[] = await teamsRes.json();

      const subMembers: string[] = [];
      const teamProjectIds = new Set<string>();
      for (const team of teams) {
        if (team.leader === user.username) {
          subMembers.push(...team.members);
          if (team.projectId) teamProjectIds.add(team.projectId);
        }
      }
      const targetUsers = [...new Set([user.username, ...subMembers])];

      // Filter comments from the last 7 days for target users in the leader's team projects
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentComments = allComments.filter(c =>
        targetUsers.includes(c.username) &&
        new Date(c.date) >= oneWeekAgo &&
        (teamProjectIds.size === 0 || teamProjectIds.has(c.projectId))
      );

      // Map projectId to projectName and build AI request payload
      const aiComments: AiReportComment[] = recentComments.map(c => {
        const project = allProjects.find(p => p.id === c.projectId);
        return {
          commentId: c.id,
          date: c.date ? c.date.substring(0, 10) : new Date().toISOString().substring(0, 10),
          username: c.username,
          projectName: project ? project.title : c.projectId,
          userComment: c.content
        };
      });

      if (aiComments.length === 0) {
        throw new Error('Hiç yorum bulunamadı. Önce proje yorumları ekleyin.');
      }

      const payload = { comments: aiComments, prompt: prompt || '' };

      console.log('AI Report Payload:', JSON.stringify(payload, null, 2));

      // POST to AI report server (no Authorization header required)
      const response = await fetch(`${aiReportUrl}/generate_report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const data: AiReportResponse = await response.json();
      setReportData(data);
      setReportStatus('generated');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGenerateError(`Rapor oluşturulamadı: ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveReport = async () => {
    if (!reportData) return;
    setIsSaving(true);
    try {
      // Fetch manager (reviewer) from org-chart
      let reviewerUsername = '';
      try {
        const orgRes = await fetch(`${apiUrl}/api/users/${user.username}/org-chart`, {
          headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          reviewerUsername = orgData?.manager?.username ?? '';
        }
      } catch {
        // proceed without reviewer if fetch fails
      }

      const response = await fetch(`${apiUrl}/api/weekly-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`,
        },
        body: JSON.stringify({
          weekStart: getWeekStart(),
          reportData: reportData,
          author: user.username,
          reviewer: reviewerUsername,
          readyToReview: false,
          status: reportStatus ?? 'generated',
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setIsSaved(true);
    } catch (err) {
      console.error('Rapor kaydedilemedi:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const submitToManager = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/api/weekly-reports/submit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`,
        },
        body: JSON.stringify({ weekStart: getWeekStart() }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Yöneticiye gönderilemedi:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadDocx = async () => {
    if (!reportData) return;
    setIsDownloading(true);
    setGenerateError(null);
    try {
      const response = await fetch(`${aiReportUrl}/generate_docx`, {
        method: 'POST',
        headers: {
          'accept': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bullet_lines: reportData.bullet_lines }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'haftalik_rapor.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGenerateError(`Docx indirilemedi: ${msg}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBulletEdit = (lineIdx: number, level: number, itemIdx: number, newText: string) => {
    if (!reportData) return;

    const fieldKey = `bullet${level}` as keyof BulletLine;

    const newBulletLines = reportData.bullet_lines.map((line, li) => {
      if (li !== lineIdx) return line;
      const arr = (line[fieldKey] as string[] | null) ?? [];
      const newArr = arr.map((t, ti) => ti === itemIdx ? newText : t);
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
        username: 'Manually Written',
        projectName: '',
        userComment: 'Bu alan manuel olarak düzenlenmiştir.'
      }
    };

    setReportData({ ...reportData, bullet_lines: newBulletLines, traceability: newTraceability, source_map: newSourceMap });
    setIsSaved(false);
  };

  const traceabilityMap = useMemo((): Map<string, AiReportComment[]> => {
    const map = new Map<string, AiReportComment[]>();
    if (!reportData) return map;
    for (const entry of reportData.traceability) {
      map.set(entry.text, entry.sources.map(id => reportData.source_map[id]).filter(Boolean));
    }
    return map;
  }, [reportData]);

  const getSourceComments = (text: string): AiReportComment[] => {
    return traceabilityMap.get(text) ?? [];
  };

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
            <span className="text-blue-500 mt-1">{marker}</span>
            {isEditMode ? (
              <textarea
                key={text}
                defaultValue={text}
                onBlur={(e) => handleBulletEdit(lineIdx, level, itemIdx, e.target.value)}
                className="bg-slate-900/60 border border-blue-500/30 rounded-xl text-white text-sm italic p-2 w-full resize-none outline-none focus:border-blue-400/60"
                rows={2}
              />
            ) : (
              <span className={`${color} text-sm italic leading-relaxed flex-1`}>{text}</span>
            )}
            {sources.length > 0 && (
              <span className="text-[8px] font-black text-blue-500/40 uppercase tracking-widest self-center opacity-0 group-hover/bullet:opacity-100 transition-opacity">
                {sources.length} kaynak
              </span>
            )}
          </div>

          {hoveredBullet === bulletKey && sources.length > 0 && (
            <div className="absolute left-4 top-full mt-2 z-50 w-80 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="bg-[#0f172a] border border-blue-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
                <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-3">Kaynak Yorumlar</p>
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
            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">======</span>
            <h3 className="text-base font-black text-white italic tracking-tight">
              {/* AI server returns project titles wrapped in brackets e.g. "[Atlas CRM]" */}
              {line.bullet0.replace(/^\[|\]$/g, '')}
            </h3>
            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">======</span>
          </div>
        )}
        {line.bullet1?.map((text, i) => renderBulletItem(text, 1, `line-${lineIdx}-b1-${i}`, lineIdx, i))}
        {line.bullet2?.map((text, i) => renderBulletItem(text, 2, `line-${lineIdx}-b2-${i}`, lineIdx, i))}
        {line.bullet3?.map((text, i) => renderBulletItem(text, 3, `line-${lineIdx}-b3-${i}`, lineIdx, i))}
      </div>
    ));
  };

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter italic">Haftalık Konsolide Rapor</h2>
          <p className="text-[9px] font-black text-blue-500/60 uppercase tracking-[0.4em] mt-1 border-l-2 border-blue-600 pl-3">Organizasyonel Zeka Merkezi</p>
        </div>

        <div className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
          Son 7 Gün
        </div>
      </div>

      <div className="flex gap-10 h-[calc(100vh-280px)]">
        {/* Sol Taraf: Rapor İçeriği */}
        <div className="flex-1 bg-[#1e293b]/20 backdrop-blur-3xl rounded-[3rem] border border-white/5 p-12 overflow-y-auto custom-scrollbar relative">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="border-b border-white/5 pb-8 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-4xl font-black text-white italic tracking-tighter">Konsolide Faaliyet Özeti</h1>
                <button
                  onClick={generateReport}
                  disabled={isGenerating || isLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95 ml-4 shrink-0"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Üretiliyor...</span>
                    </>
                  ) : (
                    <span>✨ AI Generate Etsin</span>
                  )}
                </button>
              </div>
              <div className="flex gap-4">
                <div className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-blue-500/20">Gizli / Kurumsal</div>
                <div className="px-3 py-1 bg-emerald-600/20 text-emerald-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">AI Tarafından Derlendi</div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {isGenerating && (
                  <div className="flex justify-center py-10">
                    <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                )}
                {generateError && (
                  <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-2xl">
                    <p className="text-red-400 text-xs font-bold">{generateError}</p>
                  </div>
                )}
                {reportData?.instructions && reportData.instructions.length > 0 && (
                  <div className="mb-6 p-4 bg-blue-900/10 border border-blue-500/20 rounded-2xl">
                    {reportData.instructions.map((inst, i) => (
                      <p key={i} className="text-blue-300/70 text-[10px] italic">{inst}</p>
                    ))}
                  </div>
                )}
                {!reportData ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Henüz rapor bulunmuyor.</p>
                  </div>
                ) : (
                  renderBulletLines()
                )}
              </>
            )}
          </div>
        </div>

        {/* Sağ Taraf: AI Editor & Prompt */}
        <div className="w-96 flex flex-col gap-6">
          <div className="bg-gradient-to-br from-[#0f172a] to-blue-900/10 rounded-[2.5rem] border border-white/5 p-8 flex flex-col h-full shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <h3 className="text-sm font-black text-white italic tracking-tight">AI Rapor Asistanı</h3>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Prompt Engineering</p>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-6">
              <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Rapor Tonu & Kapsamı</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Örn: Raporu daha teknik bir dille revize et, finansal terimlere ağırlık ver..."
                  className="w-full h-40 bg-slate-900/50 border border-white/5 rounded-2xl p-5 text-white text-[11px] font-bold outline-none focus:border-blue-500/50 transition-all resize-none italic"
                />
              </div>

              <div className="space-y-4">
                <button
                  onClick={generateReport}
                  disabled={isGenerating || isLoading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                >
                  {isGenerating ? 'Üretiliyor...' : '✨ AI Generate Etsin'}
                </button>
                <button
                  onClick={handleDownloadDocx}
                  disabled={isDownloading || !reportData}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/5 active:scale-95"
                >
                  {isDownloading ? 'İndiriliyor...' : 'Docx İndir'}
                </button>
                {/* Düzenle Butonu */}
                <button
                  onClick={() => { setIsEditMode(prev => !prev); if (!isEditMode) setReportStatus('manuel'); }}
                  disabled={!reportData}
                  className="w-full py-4 bg-slate-700/50 hover:bg-slate-600/50 disabled:opacity-40 text-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/10 active:scale-95"
                >
                  {isEditMode ? '✅ Düzenlemeyi Bitir' : '✏️ Düzenle'}
                </button>
                {/* Kaydet Butonu */}
                <button
                  onClick={saveReport}
                  disabled={isSaving || !reportData}
                  className="w-full py-4 bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
                >
                  {isSaving ? 'Kaydediliyor...' : isSaved ? '✅ Kaydedildi' : '💾 Kaydet'}
                </button>
                {/* Yöneticime Gönder Butonu */}
                <button
                  onClick={submitToManager}
                  disabled={isSubmitting || !isSaved}
                  className="w-full py-4 bg-purple-600/80 hover:bg-purple-500 disabled:opacity-40 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95"
                >
                  {isSubmitting ? 'Gönderiliyor...' : isSubmitted ? '✅ Yöneticiye Gönderildi' : '📤 Yöneticime Gönder'}
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
                <span className="text-[10px] font-bold text-slate-300 italic">Son Güncelleme:</span>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Az Önce</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
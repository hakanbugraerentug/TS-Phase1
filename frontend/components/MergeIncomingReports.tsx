import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../App';

interface OrgUser {
  username: string;
  fullName: string;
  title: string;
  distinguishedName: string;
  manager: string;
}

interface TeamDto {
  id: string;
  leader: string;
  members: string[];
  projectId: string;
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
  traceability: unknown[];
  source_map: Record<string, unknown>;
}

interface SubordinateReportPayload {
  username: string;
  bullet_lines: BulletLine[];
}

type ManagerRole = 'mudur' | 'direktor' | 'baskan' | null;

function detectManagerRole(title: string): ManagerRole {
  const t = title.toLowerCase();
  if (t.includes('müdür') || t.includes('mudur') || t.includes('manager')) return 'mudur';
  if (t.includes('direktör') || t.includes('direktor') || t.includes('director')) return 'direktor';
  if (
    t.includes('başkan') || t.includes('baskan') || t.includes('head') ||
    t.includes('chief') || t.includes('genel müdür') || t.includes('genel mudur')
  ) return 'baskan';
  return null;
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

const BULLET_MARKER: Record<number, string> = { 1: '•', 2: '–', 3: '·' };
const BULLET_COLOR: Record<number, string> = { 1: 'text-slate-200', 2: 'text-slate-400', 3: 'text-slate-500' };
const BULLET_INDENT: Record<number, string> = { 1: '', 2: 'pl-6', 3: 'pl-12' };

export const MergeIncomingReports: React.FC<{ user: User }> = ({ user }) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  const aiReportUrl = (import.meta.env.VITE_AI_REPORT_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

  const managerRole = detectManagerRole(user.title ?? '');

  const [allUsers, setAllUsers] = useState<OrgUser[]>([]);
  const [allTeams, setAllTeams] = useState<TeamDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [reportData, setReportData] = useState<AiReportResponse | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<'manuel' | 'generated' | null>(null);

  const fetchOrgData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, teamsRes] = await Promise.all([
        fetch(`${apiUrl}/api/users/all-org`, { headers: { Authorization: `Bearer ${user.accessToken}` } }),
        fetch(`${apiUrl}/api/teams`, { headers: { Authorization: `Bearer ${user.accessToken}` } }),
      ]);
      setAllUsers(usersRes.ok ? await usersRes.json() : []);
      setAllTeams(teamsRes.ok ? await teamsRes.json() : []);

      // Load saved merged report for the current week
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
  }, [apiUrl, user.accessToken]);

  useEffect(() => { fetchOrgData(); }, [fetchOrgData]);

  const currentUserDN = allUsers.find(u => u.username === user.username)?.distinguishedName ?? '';
  const directReports = allUsers.filter(u => u.manager === currentUserDN);

  // Müdür sees only team leaders; higher roles see all direct reports
  const reporterList = managerRole === 'mudur'
    ? directReports.filter(u => allTeams.some(t => t.leader === u.username))
    : directReports;

  const generateReport = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    setIsSaved(false);
    try {
      const weekStart = getWeekStart();

      // Fetch submitted reports from each subordinate for the current week
      const subordinateReports: SubordinateReportPayload[] = [];
      await Promise.all(
        reporterList.map(async (reporter) => {
          try {
            const res = await fetch(
              `${apiUrl}/api/weekly-reports/by-user?username=${reporter.username}&weekStart=${weekStart}`,
              { headers: { Authorization: `Bearer ${user.accessToken}` } }
            );
            if (!res.ok) return;
            const dto = await res.json();
            const reportContent = dto.reportData as AiReportResponse | null;
            if (reportContent?.bullet_lines?.length) {
              subordinateReports.push({
                username: reporter.username,
                bullet_lines: reportContent.bullet_lines,
              });
            }
          } catch {
            // skip this subordinate if fetch fails
          }
        })
      );

      if (subordinateReports.length === 0) {
        throw new Error('Bu hafta için en az bir astın gönderilmiş raporu gereklidir.');
      }

      const payload = {
        subordinate_reports: subordinateReports,
        prompt: prompt || undefined,
      };

      const response = await fetch(`${aiReportUrl}/merge_reports`, {
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
      setReportStatus('generated');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGenerateError(`Rapor birleştirilemedi: ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveReport = async () => {
    if (!reportData) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      let reviewerUsername = '';
      const reviewers: string[] = [];
      try {
        const orgRes = await fetch(`${apiUrl}/api/users/${user.username}/org-chart`, {
          headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          // Direct manager (team leader)
          reviewerUsername = orgData?.manager?.username ?? '';
          if (reviewerUsername) reviewers.push(reviewerUsername);
          // Manager above the team leader (müdür)
          const seniorManagerUsername = orgData?.manager?.manager?.username ?? '';
          if (seniorManagerUsername && !reviewers.includes(seniorManagerUsername)) {
            reviewers.push(seniorManagerUsername);
          }
        }
      } catch {
        // proceed without reviewer
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
          reviewers: reviewers,
          readyToReview: false,
          status: reportStatus ?? 'generated',
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setIsSaved(true);
    } catch (err) {
      setSaveError('Rapor kaydedilemedi. Lütfen tekrar deneyin.');
      console.error('Rapor kaydedilemedi:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const submitToManager = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
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
      setSubmitError('Yöneticiye gönderilemedi. Lütfen tekrar deneyin.');
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
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `birlesik_rapor_${getWeekStart()}.docx`;
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
      const newArr = arr.map((t, ti) => (ti === itemIdx ? newText : t));
      return { ...line, [fieldKey]: newArr };
    });
    setReportData({ ...reportData, bullet_lines: newBulletLines });
    setIsSaved(false);
  };

  const renderBulletItem = (
    text: string,
    level: number,
    bulletKey: string,
    lineIdx: number,
    itemIdx: number
  ): React.ReactNode => {
    const marker = BULLET_MARKER[level] ?? '•';
    const color = BULLET_COLOR[level] ?? 'text-slate-200';
    const indent = BULLET_INDENT[level] ?? '';

    return (
      <div key={bulletKey} className={`relative ${indent}`}>
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

  if (!managerRole) {
    return (
      <div className="max-w-2xl mx-auto mt-20 flex flex-col items-center justify-center py-24 bg-[#1e293b]/20 rounded-[2.5rem] border border-white/5">
        <p className="text-slate-400 font-black text-sm uppercase tracking-widest">Bu sayfa yalnızca Müdür ve üstü pozisyonlar içindir.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter italic">Gelen Raporları Birleştir</h2>
          <p className="text-[9px] font-black text-purple-500/60 uppercase tracking-[0.4em] mt-1 border-l-2 border-purple-600 pl-3">
            Astlarından gelen raporları AI ile birleştir
          </p>
        </div>
        <div className="px-4 py-2 bg-purple-600/20 text-purple-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-purple-500/20">
          Bu Hafta · {reporterList.length} Ast
        </div>
      </div>

      <div className="flex gap-10 h-[calc(100vh-280px)]">
        {/* Sol Taraf: Rapor İçeriği */}
        <div className="flex-1 bg-[#1e293b]/20 backdrop-blur-3xl rounded-[3rem] border border-white/5 p-12 overflow-y-auto custom-scrollbar relative">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="border-b border-white/5 pb-8 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-4xl font-black text-white italic tracking-tighter">Birleşik Yönetici Raporu</h1>
                <button
                  onClick={generateReport}
                  disabled={isGenerating || isLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-purple-600/20 active:scale-95 ml-4 shrink-0"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Birleştiriliyor...</span>
                    </>
                  ) : (
                    <span>✨ AI Birleştirsin</span>
                  )}
                </button>
              </div>
              <div className="flex gap-4">
                <div className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-purple-500/20">Gizli / Kurumsal</div>
                <div className="px-3 py-1 bg-emerald-600/20 text-emerald-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">AI Tarafından Birleştirildi</div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {isGenerating && (
                  <div className="flex justify-center py-10">
                    <div className="w-10 h-10 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin"></div>
                  </div>
                )}
                {generateError && (
                  <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-2xl">
                    <p className="text-red-400 text-xs font-bold">{generateError}</p>
                  </div>
                )}
                {reportData?.instructions && reportData.instructions.length > 0 && (
                  <div className="mb-6 p-4 bg-purple-900/10 border border-purple-500/20 rounded-2xl">
                    {reportData.instructions.map((inst, i) => (
                      <p key={i} className="text-purple-300/70 text-[10px] italic">{inst}</p>
                    ))}
                  </div>
                )}
                {!reportData ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">
                      Henüz rapor bulunmuyor. AI birleştir butonuna tıklayın.
                    </p>
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
          <div className="bg-gradient-to-br from-[#0f172a] to-purple-900/10 rounded-[2.5rem] border border-white/5 p-8 flex flex-col h-full shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-black text-white italic tracking-tight">AI Birleştirme Asistanı</h3>
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
                  className="w-full h-40 bg-slate-900/50 border border-white/5 rounded-2xl p-5 text-white text-[11px] font-bold outline-none focus:border-purple-500/50 transition-all resize-none italic"
                />
              </div>

              <div className="space-y-4">
                <button
                  onClick={generateReport}
                  disabled={isGenerating || isLoading}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-purple-600/20 active:scale-95"
                >
                  {isGenerating ? 'Birleştiriliyor...' : '✨ AI Birleştirsin'}
                </button>
                <button
                  onClick={handleDownloadDocx}
                  disabled={isDownloading || !reportData}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/5 active:scale-95"
                >
                  {isDownloading ? 'İndiriliyor...' : 'Docx İndir'}
                </button>
                <button
                  onClick={() => { setIsEditMode(prev => !prev); if (!isEditMode) setReportStatus('manuel'); }}
                  disabled={!reportData}
                  className="w-full py-4 bg-slate-700/50 hover:bg-slate-600/50 disabled:opacity-40 text-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/10 active:scale-95"
                >
                  {isEditMode ? '✅ Düzenlemeyi Bitir' : '✏️ Düzenle'}
                </button>
                <button
                  onClick={saveReport}
                  disabled={isSaving || !reportData}
                  className="w-full py-4 bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
                >
                  {isSaving ? 'Kaydediliyor...' : isSaved ? '✅ Kaydedildi' : '💾 Kaydet'}
                </button>
                {saveError && (
                  <p className="text-red-400 text-[9px] font-bold text-center">{saveError}</p>
                )}
                <button
                  onClick={submitToManager}
                  disabled={isSubmitting || !isSaved}
                  className="w-full py-4 bg-purple-600/80 hover:bg-purple-500 disabled:opacity-40 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95"
                >
                  {isSubmitting ? 'Gönderiliyor...' : isSubmitted ? '✅ Yöneticiye Gönderildi' : '📤 Yöneticime Gönder'}
                </button>
                {submitError && (
                  <p className="text-red-400 text-[9px] font-bold text-center">{submitError}</p>
                )}
              </div>
            </div>

            <div className="mt-10 p-5 bg-black/20 rounded-3xl border border-white/5">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Sistem Durumu</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-300 italic">Veri Kaynağı:</span>
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Astların Raporları</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] font-bold text-slate-300 italic">Ast Sayısı:</span>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{reporterList.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

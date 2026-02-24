
import React, { useState, useEffect } from 'react';
import { User } from '../App';


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

interface BulletPoint {
  text: string;
  sourceComments: CommentData[];
}

interface ProjectSummary {
  project: ProjectData;
  bullets: BulletPoint[];
  hasActivity: boolean;
}

function buildProjectSummaries(
  comments: CommentData[],
  projects: ProjectData[],
  promptInstruction: string
): ProjectSummary[] {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  return projects.map(project => {
    const projectComments = comments.filter(c => {
      const commentDate = new Date(c.date);
      return c.projectId === project.id && commentDate >= oneWeekAgo;
    });

    if (projectComments.length === 0) {
      return { project, bullets: [], hasActivity: false };
    }

    const bullets: BulletPoint[] = projectComments.map(c => ({
      text: c.content,
      sourceComments: [c]
    }));

    return { project, bullets, hasActivity: true };
  });
}

export const WeeklySummary: React.FC<{ user: User }> = ({ user }) => {
  const [allComments, setAllComments] = useState<CommentData[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectData[]>([]);
  const [projectSummaries, setProjectSummaries] = useState<ProjectSummary[]>([]);
  const [hoveredBullet, setHoveredBullet] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReport, setAiReport] = useState<string>('');
  const [generateError, setGenerateError] = useState<string | null>(null);

  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

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
        setProjectSummaries(buildProjectSummaries(comments, projects, ''));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user.accessToken]);

  const generateReport = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    setAiReport('');
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weeklyComments = allComments.filter(c => new Date(c.date) >= oneWeekAgo);

      const commentList = weeklyComments.map(c =>
        `- ${c.username} (proje: ${c.projectId}, tarih: ${new Date(c.date).toLocaleDateString('tr-TR')}): ${c.content}`
      ).join('\n');

      const userMessage = [
        prompt ? `Talimat: ${prompt}\n` : '',
        `Yorumlar:\n${commentList || '(Bu hafta yorum bulunamadı.)'}`
      ].join('');

      const response = await fetch(`${apiUrl}/api/llm/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'Sen bir kurumsal rapor yazarısın. Aşağıdaki haftalık yorum verilerini analiz ederek kurumsal, profesyonel ve özlü bir haftalık faaliyet raporu oluştur. Türkçe yaz.'
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const content: string = data?.choices?.[0]?.message?.content ?? '';
      if (!content) throw new Error('Model yanıt vermedi.');
      setAiReport(content);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGenerateError(`Rapor oluşturulamadı: ${msg}`);
    } finally {
      setIsGenerating(false);
    }
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
              <h1 className="text-4xl font-black text-white italic tracking-tighter mb-4">Konsolide Faaliyet Özeti</h1>
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
                {aiReport && (
                  <div className="mb-8 p-6 bg-blue-900/10 border border-blue-500/20 rounded-2xl">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-3">AI Tarafından Oluşturulan Rapor</p>
                    <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{aiReport}</div>
                  </div>
                )}
                {projectSummaries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Henüz rapor bulunmuyor.</p>
                  </div>
                ) : (
                  projectSummaries.map((summary) => (
                    <div key={summary.project.id} className="mb-8">
                      <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-3">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">======</span>
                        <h3 className="text-base font-black text-white italic tracking-tight">{summary.project.title}</h3>
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">======</span>
                      </div>
                      {!summary.hasActivity ? (
                        <p className="text-slate-500 text-xs italic pl-4 border-l-2 border-slate-700">
                          Bu hafta henüz bir güncelleme girilmedi.
                        </p>
                      ) : (
                        summary.bullets.map((bullet, idx) => (
                          <div
                            key={idx}
                            className="relative group/bullet"
                            onMouseEnter={() => setHoveredBullet(`${summary.project.id}-${idx}`)}
                            onMouseLeave={() => setHoveredBullet(null)}
                          >
                            <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-all cursor-default">
                              <span className="text-blue-500 mt-1">•</span>
                              <span className="text-slate-300 text-sm italic leading-relaxed flex-1">{bullet.text}</span>
                              <span className="text-[8px] font-black text-blue-500/40 uppercase tracking-widest self-center opacity-0 group-hover/bullet:opacity-100 transition-opacity">
                                {bullet.sourceComments.length} kaynak
                              </span>
                            </div>

                            {hoveredBullet === `${summary.project.id}-${idx}` && (
                              <div className="absolute left-4 top-full mt-2 z-50 w-80 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="bg-[#0f172a] border border-blue-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
                                  <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-3">Kaynak Yorumlar</p>
                                  {bullet.sourceComments.map((c, i) => (
                                    <div key={i} className="mb-3 last:mb-0 p-3 bg-white/5 rounded-xl border border-white/5">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-5 h-5 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-[8px]">
                                          {c.username.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-white font-black text-[10px] italic">{c.username}</span>
                                        <span className="text-slate-600 text-[8px]">
                                          {new Date(c.date).toLocaleDateString('tr-TR')}
                                        </span>
                                      </div>
                                      <p className="text-slate-400 text-[10px] italic leading-relaxed">"{c.content}"</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  ))
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
                  disabled={isGenerating || allComments.length === 0}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                >
                  {isGenerating ? 'Derleniyor...' : 'Raporu Yeniden Derle'}
                </button>
                <button className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/5">
                  PDF Olarak Dışa Aktar
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


import React, { useState, useEffect } from 'react';
import { User } from '../App';

interface CommentData {
  id: string;
  username: string;
  content: string;
  date: string;
  projectId: string;
}

function getWeekLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(((date.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${year} - ${week}. Hafta`;
}

export const WeeklySummary: React.FC<{ user: User }> = ({ user }) => {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${apiUrl}/api/comments`, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${user.accessToken}`
          }
        });
        if (response.ok) {
          const data: CommentData[] = await response.json();
          setComments(data || []);

          const uniqueWeeks = Array.from(new Set((data || []).map(c => getWeekLabel(c.date)))).reverse();
          setWeeks(uniqueWeeks);
          if (uniqueWeeks.length > 0) setSelectedWeek(uniqueWeeks[0]);
        }
      } catch (err) {
        console.error('Yorumlar yüklenemedi:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [user.accessToken]);

  const filteredComments = selectedWeek
    ? comments.filter(c => getWeekLabel(c.date) === selectedWeek)
    : comments;

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* Üst Header ve Hafta Seçici */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter italic">Haftalık Konsolide Rapor</h2>
          <p className="text-[9px] font-black text-blue-500/60 uppercase tracking-[0.4em] mt-1 border-l-2 border-blue-600 pl-3">Organizasyonel Zeka Merkezi</p>
        </div>

        <div className="relative group">
          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest absolute -top-5 right-2">Rapor Dönemi</label>
          <select 
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="bg-[#1e293b]/50 border border-white/10 text-white text-[11px] font-black uppercase tracking-widest px-6 py-3.5 rounded-2xl outline-none focus:border-blue-500/50 appearance-none cursor-pointer pr-12 shadow-xl"
          >
            {weeks.map(week => <option key={week} value={week}>{week}</option>)}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
          </div>
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
            ) : filteredComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-40">
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Henüz rapor bulunmuyor.</p>
              </div>
            ) : (
              filteredComments.map((comment) => (
                <div 
                  key={comment.id}
                  onMouseEnter={() => setHoveredId(comment.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`relative p-6 rounded-3xl transition-all duration-500 cursor-default group ${
                    hoveredId === comment.id ? 'bg-white/5 shadow-2xl scale-[1.01] z-50' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <p className="text-slate-300 text-lg font-medium italic leading-relaxed">
                    {comment.content}
                  </p>

                  {hoveredId === comment.id && (
                    <div className="absolute left-0 top-full mt-4 w-full max-w-lg animate-in fade-in slide-in-from-top-2 duration-300 z-[100]">
                      <div className="bg-[#0f172a] border border-blue-500/30 rounded-[2rem] p-6 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)] backdrop-blur-3xl relative">
                         <div className="absolute -top-2 left-12 w-4 h-4 bg-[#0f172a] border-t border-l border-blue-500/30 rotate-45"></div>
                         
                         <div className="flex items-center gap-4 mb-4 border-b border-white/5 pb-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-white text-xl shadow-lg border border-white/20">
                              {comment.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white font-black italic text-sm">{comment.username}</p>
                              <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Personel</p>
                            </div>
                         </div>
                         <p className="text-slate-400 text-[11px] font-bold italic leading-relaxed">
                           "{comment.content}"
                         </p>
                         <div className="mt-4 flex items-center gap-2">
                            <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                            <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">
                              {new Date(comment.date).toLocaleString('tr-TR')}
                            </span>
                         </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
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
                   <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95">
                      Raporu Yeniden Derle
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

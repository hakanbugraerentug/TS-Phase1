
import React, { useState } from 'react';
import { User } from '../App';

interface Comment {
  id: string;
  author: string;
  text: string;
  date: string;
}

export const ProjectDetail: React.FC<{
  projectId: string;
  projectTitle: string;
  onBack: () => void;
  user: User;
}> = ({ projectTitle, onBack, user }) => {
  // Yorumlar State
  const [comments, setComments] = useState<Comment[]>([
    { id: '1', author: 'Hakan Buğra Erentuğ', text: 'Analiz çalışmaları planlandığı gibi devam ediyor. Gelecek hafta test sürecine geçiyoruz.', date: '2024-05-15 14:20' },
    { id: '2', author: 'Sistem Yöneticisi', text: 'Altyapı hazırlandı, API dökümantasyonu paylaşıldı.', date: '2024-05-14 10:05' }
  ]);
  const [newComment, setNewComment] = useState('');

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      author: user.name,
      text: newComment,
      date: new Date().toLocaleString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    };

    setComments([comment, ...comments]);
    setNewComment('');
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-5">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl hover:bg-white/10 transition-all text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-2xl font-black text-white italic tracking-tighter">{projectTitle}</h2>
            <p className="text-[8px] font-black text-blue-500/60 uppercase tracking-[0.3em] mt-1">Yorumlar & Tartışmalar</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col gap-6 h-[calc(100vh-220px)] animate-in fade-in duration-500">
        {/* Comments List */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-[#1e293b]/30 backdrop-blur-md rounded-3xl p-6 border border-white/5 hover:border-blue-500/20 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center font-black text-blue-400 border border-white/5 shadow-inner">
                    {comment.author.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-black text-white italic">{comment.author}</p>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                      {comment.author === 'Hakan Buğra Erentuğ' ? 'Proje Sahibi' : 'Personel'}
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-black text-slate-600 bg-black/20 px-3 py-1 rounded-full">{comment.date}</span>
              </div>
              <p className="text-slate-300 text-sm italic leading-relaxed border-l-2 border-blue-600/30 pl-4">
                {comment.text}
              </p>
            </div>
          ))}
          {comments.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-[10px] font-black uppercase tracking-widest">Henüz yorum yapılmamış</p>
            </div>
          )}
        </div>

        {/* New Comment Form */}
        <div className="bg-[#0f172a] rounded-3xl border border-white/10 p-6 shadow-2xl">
          <form onSubmit={handleAddComment} className="flex gap-4">
            <textarea 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ekibe bir not bırakın veya soru sorun..."
              className="flex-1 bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-4 text-white text-sm outline-none focus:border-blue-500/50 transition-all resize-none italic h-16"
            />
            <button 
              type="submit"
              disabled={!newComment.trim()}
              className="px-8 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Gönder
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

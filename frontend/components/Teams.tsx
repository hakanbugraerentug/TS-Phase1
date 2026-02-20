
import React, { useState, useEffect } from 'react';
import { User } from '../App';

interface Team {
  id: string;
  title: string;
  description: string;
  leader: string;
  members: string[]; 
}

export const Teams: React.FC<{ user: User }> = ({ user }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${apiUrl}/api/teams`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTeams(data || []);
      } else {
        setTeams([]);
      }
    } catch (err) {
      console.error(err);
      setTeams([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTeams(); }, [user.accessToken]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch(`${apiUrl}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          leader: user.username,
          members: [user.username],
          projectId: ''
        })
      });

      if (response.ok) {
        await fetchTeams();
        setIsModalOpen(false);
        setNewTitle('');
        setNewDescription('');
      }
    } catch (err) {
      console.error('Ekip oluşturulamadı:', err);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-40 animate-spin w-10 h-10 border-4 border-t-blue-600 border-white/10 rounded-full mx-auto"></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight italic">Ekiplerim</h2>
          <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-1 border-l-2 border-blue-600 pl-3">Bağlı Olduğunuz Birimler</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="group flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 px-6 py-3.5 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 border border-white/10"
        >
          <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center group-hover:rotate-90 transition-transform">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Yeni Ekip Oluştur</span>
        </button>
      </div>

      {/* Create Team Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/70 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#1e293b] border border-white/10 w-full max-w-xl rounded-[3rem] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h3 className="text-2xl font-black text-white italic tracking-tight">Ekip Oluştur</h3>
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1">Yeni Birim Kaydı</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 text-slate-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleCreateTeam} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Ekip Adı</label>
                  <input
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Örn: Yazılım Geliştirme"
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Açıklama</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Ekibin görev ve sorumluluklarını belirtin..."
                    rows={3}
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all resize-none italic"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-white/5 transition-all"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 transition-all disabled:opacity-50"
                  >
                    {isCreating ? 'Oluşturuluyor...' : 'Ekibi Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-40">
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Henüz ekip bulunmuyor.</p>
          </div>
        ) : (
          teams.map((team, idx) => (
            <div key={team.id || idx} onClick={() => setSelectedTeam(team)} className="bg-[#1e293b]/30 rounded-[2.5rem] p-8 border border-white/5 hover:border-blue-500/20 cursor-pointer transition-all">
              <div className="flex gap-8 items-center">
                <div className="w-20 h-20 rounded-3xl bg-slate-800 border-2 border-blue-500/20 flex items-center justify-center font-black text-2xl text-blue-400">{team.leader?.charAt(0)}</div>
                <div>
                  <h3 className="text-2xl font-black text-white italic">{team.title}</h3>
                  <p className="text-slate-500 text-xs font-medium italic mt-1">{team.description}</p>
                  <div className="flex gap-2 mt-4">
                    <span className="text-[9px] font-black text-slate-500 uppercase bg-white/5 px-4 py-1.5 rounded-full border border-white/5">{team.members?.length || 0} Üye</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedTeam && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-[#1e293b] border border-white/10 w-full max-w-xl rounded-[3rem] p-10">
            <h3 className="text-3xl font-black text-white italic mb-8">{selectedTeam.title} Kadrosu</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-3 custom-scrollbar">
              <div className="p-4 bg-blue-600/10 border border-blue-500/30 rounded-2xl flex justify-between items-center">
                <span className="text-white font-black text-sm italic">{selectedTeam.leader}</span>
                <span className="text-[8px] font-black bg-yellow-500 text-black px-3 py-1 rounded-full uppercase">Lider</span>
              </div>
              {selectedTeam.members?.filter(m => m !== selectedTeam.leader).map((m, i) => (
                <div key={i} className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex justify-between items-center text-slate-400 font-bold text-sm italic">
                  <span>{m}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setSelectedTeam(null)} className="w-full mt-8 py-4 bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl">Pencereyi Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { User } from '../App';

interface Team {
  title: string;
  description: string;
  leader: string;
  members: string[]; 
}

export const Teams: React.FC<{ user: User }> = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  const apiUrl = (process.env.API_URL || 'http://0.0.0.0:8000').replace(/\/$/, '');

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${apiUrl}/teams/`, { headers: { 'accept': 'application/json' } });
      const data = await response.json();
      setTeams(data.teams || []);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchTeams(); }, []);

  if (isLoading) return <div className="flex justify-center py-40 animate-spin w-10 h-10 border-4 border-t-blue-600 border-white/10 rounded-full mx-auto"></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="mb-4">
        <h2 className="text-2xl font-black text-white tracking-tight italic">Ekiplerim</h2>
        <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-1 border-l-2 border-blue-600 pl-3">Bağlı Olduğunuz Birimler</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {teams.map((team, idx) => (
          <div key={idx} onClick={() => setSelectedTeam(team)} className="bg-[#1e293b]/30 rounded-[2.5rem] p-8 border border-white/5 hover:border-blue-500/20 cursor-pointer transition-all">
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
        ))}
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


import React, { useState, useEffect, useRef } from 'react';
import { User } from '../App';
import { UserAvatar } from './UserAvatar';

interface Team {
  id: string;
  title: string;
  description: string;
  leader: string;
  members: string[];
}

interface AppUser {
  username: string;
  fullName: string;
}

export const Teams: React.FC<{ user: User }> = ({ user }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [leaderUsername, setLeaderUsername] = useState('');
  const [leaderInput, setLeaderInput] = useState('');
  const [leaderDropdownOpen, setLeaderDropdownOpen] = useState(false);
  const [memberInput, setMemberInput] = useState('');
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // selectedTeam modal: add member
  const [addMemberInput, setAddMemberInput] = useState('');
  const [addMemberDropdownOpen, setAddMemberDropdownOpen] = useState(false);
  const addMemberRef = useRef<HTMLDivElement>(null);

  const leaderRef = useRef<HTMLDivElement>(null);
  const memberRef = useRef<HTMLDivElement>(null);

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

  const fetchAllUsers = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/users`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAllUsers(
          (data || []).map((u: any) => ({
            username: u.username ?? u.Username ?? '',
            fullName: u.fullName ?? u.FullName ?? ''
          }))
        );
      }
    } catch (err) {
      console.error('Kullanıcılar yüklenemedi:', err);
    }
  };

  useEffect(() => { fetchTeams(); fetchAllUsers(); }, [user.accessToken]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (leaderRef.current && !leaderRef.current.contains(e.target as Node)) setLeaderDropdownOpen(false);
      if (memberRef.current && !memberRef.current.contains(e.target as Node)) setMemberDropdownOpen(false);
      if (addMemberRef.current && !addMemberRef.current.contains(e.target as Node)) setAddMemberDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getUserFullName = (username: string) => {
    const found = allUsers.find(u => u.username === username);
    return found?.fullName || username;
  };

  const filteredLeaderUsers = allUsers.filter(u =>
    u.username.toLowerCase().includes(leaderInput.toLowerCase()) ||
    u.fullName.toLowerCase().includes(leaderInput.toLowerCase())
  );

  const filteredMemberUsers = allUsers.filter(u =>
    (u.username.toLowerCase().includes(memberInput.toLowerCase()) ||
     u.fullName.toLowerCase().includes(memberInput.toLowerCase())) &&
    !selectedMembers.includes(u.username)
  );

  const filteredAddMemberUsers = selectedTeam
    ? allUsers.filter(u =>
        (u.username.toLowerCase().includes(addMemberInput.toLowerCase()) ||
         u.fullName.toLowerCase().includes(addMemberInput.toLowerCase())) &&
        !selectedTeam.members?.includes(u.username)
      )
    : [];

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setModalStep(1);
    setNewTitle('');
    setNewDescription('');
    setLeaderUsername('');
    setLeaderInput('');
    setMemberInput('');
    setSelectedMembers([]);
    setLeaderDropdownOpen(false);
    setMemberDropdownOpen(false);
  };

  const buildMembersList = (leader: string, selected: string[], currentUser: string): string[] => {
    const base = selected.length > 0 ? selected : [currentUser];
    return base.includes(leader) ? base : [leader, ...base];
  };

  const handleCreateTeam = async () => {
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const leader = leaderUsername || user.username;
      const members = buildMembersList(leader, selectedMembers, user.username);
      const response = await fetch(`${apiUrl}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          leader,
          members,
          projectId: ''
        })
      });
      if (response.ok) {
        await fetchTeams();
        setIsModalOpen(false);
        setNewTitle('');
        setNewDescription('');
        setLeaderUsername('');
        setLeaderInput('');
        setSelectedMembers([]);
        setModalStep(1);
      }
    } catch (err) {
      console.error('Ekip oluşturulamadı:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!window.confirm('Bu ekibi silmek istediğinize emin misiniz?')) return;
    try {
      const response = await fetch(`${apiUrl}/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.accessToken}` }
      });
      if (response.ok) {
        setSelectedTeam(null);
        await fetchTeams();
      }
    } catch (err) {
      console.error('Ekip silinemedi:', err);
    }
  };

  const handleRemoveMember = async (team: Team, memberUsername: string) => {
    if (!window.confirm(`${getUserFullName(memberUsername)} adlı üyeyi ekipten çıkarmak istediğinize emin misiniz?`)) return;
    try {
      const response = await fetch(`${apiUrl}/api/teams/${team.id}/members/${memberUsername}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.accessToken}`
        }
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedTeam(updated);
        setTeams(prev => prev.map(t => t.id === team.id ? updated : t));
      }
    } catch (err) {
      console.error('Üye çıkarılamadı:', err);
    }
  };

  const handleAddMember = async (team: Team, memberUsername: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/teams/${team.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`
        },
        body: JSON.stringify({ username: memberUsername })
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedTeam(updated);
        setTeams(prev => prev.map(t => t.id === team.id ? updated : t));
        setAddMemberInput('');
        setAddMemberDropdownOpen(false);
      }
    } catch (err) {
      console.error('Üye eklenemedi:', err);
    }
  };

  const handleTransferLeadership = async (team: Team, newLeaderUsername: string) => {
    if (!window.confirm(`Liderliği ${getUserFullName(newLeaderUsername)} adlı üyeye devretmek istediğinize emin misiniz?`)) return;
    try {
      const response = await fetch(`${apiUrl}/api/teams/${team.id}/leader`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`
        },
        body: JSON.stringify({ leaderUsername: newLeaderUsername })
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedTeam(updated);
        setTeams(prev => prev.map(t => t.id === team.id ? updated : t));
      }
    } catch (err) {
      console.error('Liderlik devredilemedi:', err);
    }
  };

  const handleLeaveTeam = async (team: Team) => {
    if (!window.confirm('Bu ekipten ayrılmak istediğinize emin misiniz?')) return;
    if (!window.confirm('Bu işlemi geri alamazsınız. Ekipten ayrılmak istediğinize gerçekten emin misiniz?')) return;
    try {
      const response = await fetch(`${apiUrl}/api/teams/${team.id}/members/${user.username}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.accessToken}`
        }
      });
      if (response.ok) {
        setSelectedTeam(null);
        await fetchTeams();
      }
    } catch (err) {
      console.error('Ekipten ayrılınamadı:', err);
    }
  };

  if (isLoading) return <div className="flex justify-center py-40 animate-spin w-10 h-10 border-4 border-t-blue-600 border-white/10 rounded-full mx-auto"></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight italic">Ekiplerim</h2>
          <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-1 border-l-2 border-blue-600 pl-3">Bağlı Olduğunuz Birimler</p>
        </div>

        <button
          onClick={handleOpenModal}
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

      {/* Create Team Modal - 2 Steps */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/70 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#1e293b] border border-white/10 w-full max-w-xl rounded-[3rem] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10">
              {/* Header */}
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-white italic tracking-tight">Ekip Oluştur</h3>
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1">Yeni Birim Kaydı</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 text-slate-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Step Indicator */}
              <div className="flex items-center justify-center gap-3 mb-10">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-sm transition-all ${modalStep === 1 ? 'bg-blue-600 text-white' : 'bg-blue-600/30 text-blue-400'}`}>1</div>
                <div className={`h-1 w-16 rounded-full transition-all ${modalStep === 2 ? 'bg-blue-600' : 'bg-white/10'}`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-sm transition-all ${modalStep === 2 ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-500'}`}>2</div>
                <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest ml-2">Adım {modalStep} / 2</span>
              </div>

              {/* Step 1: Basic Info */}
              {modalStep === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Ekip Adı</label>
                    <input
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
                      type="button"
                      disabled={!newTitle.trim()}
                      onClick={() => setModalStep(2)}
                      className="flex-1 py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      İleri <span>→</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Leader & Members */}
              {modalStep === 2 && (
                <div className="space-y-6">
                  {/* Leader Autocomplete */}
                  <div className="space-y-2" ref={leaderRef}>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Ekip Lideri</label>
                    <div className="relative">
                      <input
                        value={leaderInput}
                        onChange={(e) => {
                          setLeaderInput(e.target.value);
                          setLeaderUsername('');
                          setLeaderDropdownOpen(true);
                        }}
                        onFocus={() => setLeaderDropdownOpen(true)}
                        placeholder="Lider ara..."
                        className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all"
                      />
                      {leaderDropdownOpen && filteredLeaderUsers.length > 0 && (
                        <ul className="absolute z-10 left-0 right-0 mt-2 bg-[#1e293b] border border-white/10 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                          {filteredLeaderUsers.map(u => (
                            <li
                              key={u.username}
                              onMouseDown={() => {
                                setLeaderInput(u.fullName || u.username);
                                setLeaderUsername(u.username);
                                setLeaderDropdownOpen(false);
                              }}
                              className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-blue-600/20 transition-colors"
                            >
                              <UserAvatar username={u.username} displayName={u.fullName || u.username} accessToken={user.accessToken} size="sm" />
                              <div>
                                <p className="text-white font-bold text-sm">{u.fullName || u.username}</p>
                                <p className="text-slate-500 text-[10px]">{u.username}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Members Multi-select */}
                  <div className="space-y-2" ref={memberRef}>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Ekip Üyeleri</label>
                    <div className="relative">
                      <div className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-4 py-3 focus-within:border-blue-500/50 focus-within:bg-slate-900 transition-all">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {selectedMembers.map(m => {
                            const memberUser = allUsers.find(u => u.username === m);
                            return (
                              <span key={m} className="flex items-center gap-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-bold px-2 py-1 rounded-full">
                                <UserAvatar username={m} displayName={memberUser?.fullName || m} accessToken={user.accessToken} size="sm" />
                                <span>{memberUser?.fullName || m}</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedMembers(prev => prev.filter(x => x !== m))}
                                  className="ml-1 text-blue-400 hover:text-white transition-colors"
                                >×</button>
                              </span>
                            );
                          })}
                        </div>
                        <input
                          value={memberInput}
                          onChange={(e) => { setMemberInput(e.target.value); setMemberDropdownOpen(true); }}
                          onFocus={() => setMemberDropdownOpen(true)}
                          placeholder="Üye ara..."
                          className="w-full bg-transparent text-white font-bold outline-none placeholder:text-slate-600"
                        />
                      </div>
                      {memberDropdownOpen && filteredMemberUsers.length > 0 && (
                        <ul className="absolute z-10 left-0 right-0 mt-2 bg-[#1e293b] border border-white/10 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                          {filteredMemberUsers.map(u => (
                            <li
                              key={u.username}
                              onMouseDown={() => {
                                setSelectedMembers(prev => [...prev, u.username]);
                                setMemberInput('');
                                setMemberDropdownOpen(false);
                              }}
                              className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-blue-600/20 transition-colors"
                            >
                              <UserAvatar username={u.username} displayName={u.fullName || u.username} accessToken={user.accessToken} size="sm" />
                              <div>
                                <p className="text-white font-bold text-sm">{u.fullName || u.username}</p>
                                <p className="text-slate-500 text-[10px]">{u.username}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setModalStep(1)}
                      className="flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                    >
                      <span>←</span> Geri
                    </button>
                    <button
                      type="button"
                      disabled={isCreating}
                      onClick={handleCreateTeam}
                      className="flex-1 py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 transition-all disabled:opacity-50"
                    >
                      {isCreating ? 'Oluşturuluyor...' : 'Ekibi Kaydet'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team Cards */}
      <div className="grid grid-cols-1 gap-6">
        {teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-40">
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Henüz ekip bulunmuyor.</p>
          </div>
        ) : (
          teams.map((team, idx) => (
            <div
              key={team.id || idx}
              onClick={() => setSelectedTeam(team)}
              className="bg-[#1e293b]/30 rounded-[2.5rem] p-8 border border-white/5 hover:border-blue-500/20 cursor-pointer transition-all"
            >
              <div className="flex gap-8 items-center">
                {/* Leader Avatar */}
                <div className="relative flex-shrink-0">
                  <UserAvatar username={team.leader || ''} displayName={getUserFullName(team.leader || '')} accessToken={user.accessToken} size="lg" />
                  <span className="absolute -bottom-1 -right-1 bg-yellow-400 text-black text-[8px] font-black px-1.5 py-0.5 rounded-full leading-none">👑</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl font-black text-white italic">{team.title}</h3>
                  <p className="text-slate-500 text-xs font-medium italic mt-1">{team.description}</p>
                  <div className="flex gap-2 mt-4 items-center flex-wrap">
                    <span className="text-[9px] font-black text-slate-500 uppercase bg-white/5 px-4 py-1.5 rounded-full border border-white/5">{team.members?.length || 0} Üye</span>
                    {/* Other members avatars */}
                    {(() => {
                      const nonLeaderMembers = team.members?.filter(m => m !== team.leader) || [];
                      if (nonLeaderMembers.length === 0) return null;
                      return (
                        <div className="flex items-center gap-1 ml-2">
                          {nonLeaderMembers.slice(0, 5).map(m => (
                            <UserAvatar key={m} username={m} displayName={getUserFullName(m)} accessToken={user.accessToken} size="sm" />
                          ))}
                          {nonLeaderMembers.length > 5 && (
                            <span className="text-slate-500 text-[10px] font-bold ml-1">+{nonLeaderMembers.length - 5}</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Selected Team Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-[#1e293b] border border-white/10 w-full max-w-xl rounded-[3rem] p-10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-3xl font-black text-white italic">{selectedTeam.title} Kadrosu</h3>
              <button
                onClick={() => setSelectedTeam(null)}
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 text-slate-400 hover:text-white transition-colors flex-shrink-0"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {/* Leader row */}
              <div className="p-4 bg-blue-600/10 border border-blue-500/30 rounded-2xl flex items-center gap-3">
                <UserAvatar username={selectedTeam.leader} displayName={getUserFullName(selectedTeam.leader)} accessToken={user.accessToken} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-sm italic">{getUserFullName(selectedTeam.leader)}</p>
                  <p className="text-slate-500 text-[10px]">{selectedTeam.leader}</p>
                </div>
                <span className="text-[8px] font-black bg-yellow-500 text-black px-3 py-1 rounded-full uppercase flex-shrink-0">👑 Lider</span>
              </div>

              {/* Member rows */}
              {selectedTeam.members?.filter(m => m !== selectedTeam.leader).map((m, i) => (
                <div key={i} className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex items-center gap-3">
                  <UserAvatar username={m} displayName={getUserFullName(m)} accessToken={user.accessToken} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm italic">{getUserFullName(m)}</p>
                    <p className="text-slate-500 text-[10px]">{m}</p>
                  </div>
                  {/* Leader actions */}
                  {user.username === selectedTeam.leader && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleTransferLeadership(selectedTeam, m)}
                        title="Lider Yap"
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40 transition-colors text-xs"
                      >
                        👑
                      </button>
                      <button
                        onClick={() => handleRemoveMember(selectedTeam, m)}
                        title="Üyeyi Çıkar"
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-colors font-black text-sm"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Leader: Add member */}
            {user.username === selectedTeam.leader && (
              <div className="mb-6" ref={addMemberRef}>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 block mb-2">Üye Ekle</label>
                <div className="relative">
                  <input
                    value={addMemberInput}
                    onChange={(e) => { setAddMemberInput(e.target.value); setAddMemberDropdownOpen(true); }}
                    onFocus={() => setAddMemberDropdownOpen(true)}
                    placeholder="Üye ara ve ekle..."
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all"
                  />
                  {addMemberDropdownOpen && filteredAddMemberUsers.length > 0 && (
                    <ul className="absolute z-10 left-0 right-0 mt-2 bg-[#1e293b] border border-white/10 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                      {filteredAddMemberUsers.map(u => (
                        <li
                          key={u.username}
                          onMouseDown={() => handleAddMember(selectedTeam, u.username)}
                          className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-blue-600/20 transition-colors"
                        >
                          <UserAvatar username={u.username} displayName={u.fullName || u.username} accessToken={user.accessToken} size="sm" />
                          <div>
                            <p className="text-white font-bold text-sm">{u.fullName || u.username}</p>
                            <p className="text-slate-500 text-[10px]">{u.username}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              {user.username === selectedTeam.leader ? (
                <>
                  <button
                    onClick={() => handleDeleteTeam(selectedTeam.id)}
                    className="flex-1 py-4 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all"
                  >
                    Ekibi Sil
                  </button>
                  <button
                    onClick={() => setSelectedTeam(null)}
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all"
                  >
                    Kapat
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleLeaveTeam(selectedTeam)}
                    className="flex-1 py-4 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all"
                  >
                    Ekipten Ayrıl
                  </button>
                  <button
                    onClick={() => setSelectedTeam(null)}
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all"
                  >
                    Kapat
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

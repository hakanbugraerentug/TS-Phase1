
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../App';
import { UserAvatar } from './UserAvatar';

interface Sorumlu {
  etiket: string;
  isim: string;
}

interface Birim {
  birimTipi: string;
  birimAdi: string;
  sorumluKullanici: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  owner: string;
  members: string[];
  sorumlular?: Sorumlu[];
  birimler?: Birim[];
  ilgiliEkipIdleri?: string[];
  cardImage?: string;
  image?: string;
  baslamaTarihi?: string;
  bitisTarihi?: string;
  tfsLinki?: string;
  wikiLinki?: string;
}

interface TeamOption {
  id: string;
  title: string;
  leader: string;
  members: string[];
}

interface AppUser {
  username: string;
  fullName: string;
}

interface ProjectsProps {
  onNavigateToReports: () => void;
  onSelectProject: (id: string, title: string) => void;
  user: User;
}

const UNIT_TYPES = ['Yazılım', 'Donanım', 'Mekanik', 'Sistem'];

// Görsel havuzu
const IMAGE_POOL = [
  "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1558494949-ef010cbdcc51?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=800&auto=format&fit=crop"
];

export const Projects: React.FC<ProjectsProps> = ({ onSelectProject, user }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / wizard state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [isCreating, setIsCreating] = useState(false);

  // Step 1: Basic info
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Step 2: Birimler
  const [birimler, setBirimler] = useState<Birim[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [birimDropdowns, setBirimDropdowns] = useState<{ open: boolean; query: string }[]>([]);
  const birimDropdownRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Step 3: Teams
  const [availableTeams, setAvailableTeams] = useState<TeamOption[]>([]);
  const [ilgiliEkipIdleri, setIlgiliEkipIdleri] = useState<string[]>([]);

  // Step 4: Dates & extras
  const todayStr = new Date().toISOString().split('T')[0];
  const [baslamaTarihi, setBaslamaTarihi] = useState(todayStr);
  const [bitisTarihi, setBitisTarihi] = useState('');
  const [otomatikPipeline, setOtomatikPipeline] = useState(false);
  const [outsource, setOutsource] = useState(false);
  const [wikiLinki, setWikiLinki] = useState('');
  const [tfsLinki, setTfsLinki] = useState('');

  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${apiUrl}/api/projects`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const projectsWithImages = (data || []).map((p: any, idx: number) => ({
          ...p,
          cardImage: p.cardImage || p.card_image || null,
          image: (p.cardImage || p.card_image) ? null : IMAGE_POOL[idx % IMAGE_POOL.length]
        }));
        setProjects(projectsWithImages);
      } else {
        setProjects([]);
        setError('Projeler yüklenemedi.');
      }
    } catch (err) {
      setProjects([]);
      setError('Projeler yüklenemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const teamsRes = await fetch(`${apiUrl}/api/teams`, {
        headers: { 'Authorization': `Bearer ${user.accessToken}` }
      });
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        // Only show teams where user is member or a subordinate is team leader
        setAvailableTeams((teamsData || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          leader: t.leader,
          members: t.members || []
        })));
      }
    } catch {
      setAvailableTeams([]);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/users`, {
        headers: { 'Authorization': `Bearer ${user.accessToken}` }
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
    } catch {
      setAllUsers([]);
    }
  };

  const handleDeleteProject = async (projectId: string, projectTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`"${projectTitle}" projesini silmek istediğinize emin misiniz?`)) return;
    try {
      const response = await fetch(`${apiUrl}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.accessToken}` }
      });
      if (response.ok) {
        await fetchProjects();
      } else {
        alert('Proje silinemedi. Lütfen tekrar deneyin.');
      }
    } catch (err) {
      console.error('Proje silinemedi:', err);
      alert('Proje silinemedi. Lütfen tekrar deneyin.');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user.accessToken]);

  // Close birim dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      birimDropdownRefs.current.forEach((ref, i) => {
        if (ref && !ref.contains(e.target as Node)) {
          setBirimDropdowns(prev => prev.map((d, idx) => idx === i ? { ...d, open: false } : d));
        }
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openModal = () => {
    fetchTeams();
    fetchAllUsers();
    setIsModalOpen(true);
    setWizardStep(1);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewTitle('');
    setNewDescription('');
    setBirimler([]);
    setBirimDropdowns([]);
    setIlgiliEkipIdleri([]);
    setBaslamaTarihi(todayStr);
    setBitisTarihi('');
    setOtomatikPipeline(false);
    setOutsource(false);
    setWikiLinki('');
    setTfsLinki('');
    setWizardStep(1);
  };

  const addBirim = () => {
    setBirimler(prev => [...prev, { birimTipi: 'Yazılım', birimAdi: '', sorumluKullanici: '' }]);
    setBirimDropdowns(prev => [...prev, { open: false, query: '' }]);
  };

  const removeBirim = (i: number) => {
    setBirimler(prev => prev.filter((_, idx) => idx !== i));
    setBirimDropdowns(prev => prev.filter((_, idx) => idx !== i));
    birimDropdownRefs.current = birimDropdownRefs.current.filter((_, idx) => idx !== i);
  };

  const updateBirim = (i: number, field: keyof Birim, value: string) =>
    setBirimler(prev => prev.map((b, idx) => idx === i ? { ...b, [field]: value } : b));

  const getUserFullName = (username: string) => {
    const found = allUsers.find(u => u.username === username);
    return found?.fullName || username;
  };

  const getBirimInputValue = (i: number, b: Birim): string => {
    if (birimDropdowns[i]?.open) return birimDropdowns[i]?.query ?? '';
    return b.sorumluKullanici ? getUserFullName(b.sorumluKullanici) : '';
  };

  const filteredUsersForBirim = (query: string) => {
    if (!query.trim()) return allUsers.slice(0, 8);
    const q = query.toLowerCase();
    return allUsers.filter(u =>
      u.username.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q)
    ).slice(0, 8);
  };

  const handleCreateProject = async () => {
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch(`${apiUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          owner: user.username,
          members: [user.username],
          sorumlular: [],
          birimler: birimler.filter(b => b.birimAdi.trim()),
          ilgiliEkipIdleri,
          baslamaTarihi: baslamaTarihi || null,
          bitisTarihi: bitisTarihi || null,
          otomatikPipeline,
          outsource,
          wikiLinki: wikiLinki || null,
          tfsLinki: tfsLinki || null
        })
      });

      if (response.ok) {
        await fetchProjects();
        closeModal();
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(errData.message || 'Proje oluşturulamadı.');
      }
    } catch (err) {
      console.error('Proje oluşturulamadı:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const stepLabels = ['Temel Bilgiler', 'Birimler', 'Ekipler', 'Tarih & Detaylar'];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="mb-10 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight italic">Projelerim</h2>
          <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mt-1 border-l-2 border-blue-600 pl-3">Sorumluluğunuzdaki Kayıtlar</p>
        </div>
        
        <button 
          onClick={openModal}
          className="group flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 px-6 py-3.5 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 border border-white/10"
        >
          <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center group-hover:rotate-90 transition-transform">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Yeni Proje Ekle</span>
        </button>
      </div>

      {/* 4-Step Wizard Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#1e293b] border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="p-8 pb-0 flex-shrink-0">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-black text-white italic tracking-tight">Proje Tanımlama</h3>
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1">Yeni İnisiyatif Kaydı</p>
                </div>
                <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 text-slate-400 hover:text-white transition-colors flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-6">
                {stepLabels.map((label, idx) => {
                  const stepNum = (idx + 1) as 1 | 2 | 3 | 4;
                  const isActive = wizardStep === stepNum;
                  const isDone = wizardStep > stepNum;
                  return (
                    <React.Fragment key={idx}>
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                          isDone ? 'bg-blue-500 text-white' :
                          isActive ? 'bg-blue-600 text-white ring-2 ring-blue-400/40' :
                          'bg-white/5 text-slate-500'
                        }`}>
                          {isDone ? '✓' : stepNum}
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-wide text-center leading-tight ${isActive ? 'text-blue-400' : isDone ? 'text-slate-400' : 'text-slate-600'}`}>
                          {label}
                        </span>
                      </div>
                      {idx < 3 && <div className={`h-px flex-1 mb-4 transition-all ${isDone ? 'bg-blue-500' : 'bg-white/5'}`} />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Step Content (scrollable) */}
            <div className="flex-1 overflow-y-auto px-8 pb-4">

              {/* STEP 1: Name & Description */}
              {wizardStep === 1 && (
                <div className="space-y-5 py-2">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Proje Başlığı *</label>
                    <input
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Örn: Mobil Kredi Akış Modernizasyonu"
                      className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Proje Açıklaması *</label>
                    <textarea
                      required
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Projenin temel hedeflerini ve kapsamını kısaca belirtin..."
                      rows={5}
                      className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all resize-none italic"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Birimler */}
              {wizardStep === 2 && (
                <div className="space-y-4 py-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Projenin Birimleri</p>
                  <p className="text-xs text-slate-400 italic">Her birim için tipi, adı ve sorumlusunu belirleyin. Birden fazla birim eklenebilir.</p>

                  {birimler.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 opacity-40 border border-dashed border-white/10 rounded-2xl">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Henüz birim eklenmedi</p>
                    </div>
                  )}

                  {birimler.map((b, i) => (
                    <div key={i} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Birim {i + 1}</span>
                        <button type="button" onClick={() => removeBirim(i)} className="text-red-400 hover:text-red-300 text-xs font-black px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all">Sil</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Birim tipi */}
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Birim Tipi</label>
                          <select
                            value={b.birimTipi}
                            onChange={e => updateBirim(i, 'birimTipi', e.target.value)}
                            className="w-full bg-slate-900/70 border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs font-bold outline-none focus:border-blue-500/50 transition-all"
                          >
                            {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        {/* Birim adı */}
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Birim Adı</label>
                          <input
                            value={b.birimAdi}
                            onChange={e => updateBirim(i, 'birimAdi', e.target.value)}
                            placeholder="Ör: Gömülü Yazılım"
                            className="w-full bg-slate-900/70 border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs font-bold outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                      </div>
                      {/* Sorumlu inline search */}
                      <div className="space-y-1" ref={el => { birimDropdownRefs.current[i] = el; }}>
                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Birim Sorumlusu</label>
                        <div className="relative">
                          <input
                            value={getBirimInputValue(i, b)}
                            onChange={e => {
                              setBirimDropdowns(prev => prev.map((d, idx) => idx === i ? { open: true, query: e.target.value } : d));
                              if (!e.target.value) updateBirim(i, 'sorumluKullanici', '');
                            }}
                            onFocus={() => setBirimDropdowns(prev => prev.map((d, idx) => idx === i ? { ...d, open: true } : d))}
                            placeholder="Kullanıcı ara..."
                            className="w-full bg-slate-900/70 border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs font-bold outline-none focus:border-blue-500/50 transition-all"
                          />
                          {b.sorumluKullanici && !(birimDropdowns[i]?.open) && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <span className="text-[8px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">{b.sorumluKullanici}</span>
                            </div>
                          )}
                          {birimDropdowns[i]?.open && filteredUsersForBirim(birimDropdowns[i]?.query ?? '').length > 0 && (
                            <ul className="absolute z-20 left-0 right-0 mt-1 bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl max-h-44 overflow-y-auto">
                              {filteredUsersForBirim(birimDropdowns[i]?.query ?? '').map(u => (
                                <li
                                  key={u.username}
                                  onMouseDown={() => {
                                    updateBirim(i, 'sorumluKullanici', u.username);
                                    setBirimDropdowns(prev => prev.map((d, idx) => idx === i ? { open: false, query: '' } : d));
                                  }}
                                  className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-blue-600/20 transition-colors"
                                >
                                  <UserAvatar username={u.username} displayName={u.fullName || u.username} accessToken={user.accessToken} size="sm" />
                                  <div>
                                    <p className="text-white font-bold text-xs">{u.fullName || u.username}</p>
                                    <p className="text-slate-500 text-[9px]">{u.username}</p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addBirim}
                    className="flex items-center gap-2 text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors px-4 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20"
                  >
                    <span className="text-sm">+</span> Birim Ekle
                  </button>
                </div>
              )}

              {/* STEP 3: Teams */}
              {wizardStep === 3 && (
                <div className="space-y-4 py-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">İlgili Ekipler</p>
                  <p className="text-xs text-slate-400 italic">Projeyle ilgili ekipleri işaretleyin.</p>

                  {availableTeams.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 opacity-40">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Henüz ekip bulunmuyor.</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {availableTeams.map(team => {
                      const isChecked = ilgiliEkipIdleri.includes(team.id);
                      return (
                        <label
                          key={team.id}
                          className={`flex items-center gap-4 cursor-pointer p-4 rounded-2xl border transition-all ${
                            isChecked ? 'bg-blue-600/15 border-blue-500/40' : 'bg-slate-900/30 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              if (e.target.checked) setIlgiliEkipIdleri(prev => [...prev, team.id]);
                              else setIlgiliEkipIdleri(prev => prev.filter(id => id !== team.id));
                            }}
                            className="accent-blue-500 w-4 h-4 flex-shrink-0"
                          />
                          {/* Leader photo */}
                          <div className="flex-shrink-0">
                            <UserAvatar
                              username={team.leader}
                              displayName={getUserFullName(team.leader)}
                              accessToken={user.accessToken}
                              size="md"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-black text-sm italic">{team.title}</p>
                            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                              Lider: {getUserFullName(team.leader)}
                            </p>
                            <p className="text-slate-600 text-[8px] mt-0.5">{team.members.length} üye</p>
                          </div>
                          {isChecked && (
                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                            </div>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 4: Dates & Extras */}
              {wizardStep === 4 && (
                <div className="space-y-5 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Başlama Tarihi</label>
                      <input
                        type="date"
                        value={baslamaTarihi}
                        onChange={e => setBaslamaTarihi(e.target.value)}
                        className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Beklenen Bitiş Tarihi</label>
                      <input
                        type="date"
                        value={bitisTarihi}
                        onChange={e => setBitisTarihi(e.target.value)}
                        className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className={`flex items-center gap-3 cursor-pointer p-4 rounded-2xl border transition-all ${otomatikPipeline ? 'bg-blue-600/15 border-blue-500/40' : 'bg-slate-900/30 border-white/5 hover:border-white/10'}`}>
                      <input type="checkbox" checked={otomatikPipeline} onChange={e => setOtomatikPipeline(e.target.checked)} className="accent-blue-500 w-4 h-4 flex-shrink-0" />
                      <div>
                        <p className="text-white font-black text-xs">Otomatik Pipeline</p>
                        <p className="text-slate-500 text-[8px] italic">CI/CD süreci mevcut</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 cursor-pointer p-4 rounded-2xl border transition-all ${outsource ? 'bg-blue-600/15 border-blue-500/40' : 'bg-slate-900/30 border-white/5 hover:border-white/10'}`}>
                      <input type="checkbox" checked={outsource} onChange={e => setOutsource(e.target.checked)} className="accent-blue-500 w-4 h-4 flex-shrink-0" />
                      <div>
                        <p className="text-white font-black text-xs">Outsource</p>
                        <p className="text-slate-500 text-[8px] italic">Dışarıya temin edildi</p>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Wiki Linki</label>
                    <input
                      type="url"
                      value={wikiLinki}
                      onChange={e => setWikiLinki(e.target.value)}
                      placeholder="https://wiki.example.com/proje"
                      className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">TFS Linki</label>
                    <input
                      type="url"
                      value={tfsLinki}
                      onChange={e => setTfsLinki(e.target.value)}
                      placeholder="https://tfs.example.com/proje"
                      className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="p-8 pt-4 flex-shrink-0">
              <div className="flex gap-4">
                {wizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(prev => (prev - 1) as 1 | 2 | 3 | 4)}
                    className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                  >
                    ← Geri
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-white/5 transition-all"
                  >
                    Vazgeç
                  </button>
                )}

                {wizardStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardStep === 1 && !newTitle.trim()) { alert('Proje başlığı zorunludur.'); return; }
                      setWizardStep(prev => (prev + 1) as 1 | 2 | 3 | 4);
                    }}
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    İleri →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreateProject}
                    disabled={isCreating}
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 transition-all disabled:opacity-50"
                  >
                    {isCreating ? 'Oluşturuluyor...' : 'Projeyi Kaydet ✓'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40">
           <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4"></div>
           <p className="text-slate-500 font-black text-[9px] uppercase tracking-widest">Veritabanı Sorgulanıyor...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-40 opacity-40">
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 opacity-40">
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Henüz proje bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, idx) => (
            <div 
              key={project.id || idx} 
              onClick={() => onSelectProject(project.id, project.title)}
              className="group bg-[#1e293b]/30 backdrop-blur-md rounded-[2.5rem] shadow-2xl border border-white/5 overflow-hidden hover:bg-[#1e293b]/50 transition-all duration-500 flex flex-col cursor-pointer hover:border-blue-500/30 hover:shadow-blue-500/10"
            >
              <div className="relative h-48 overflow-hidden">
                {project.cardImage ? (
                  <img
                    src={project.cardImage}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent opacity-60"></div>
                
                <div className="absolute top-4 left-4">
                  <div className="px-3 py-1 bg-blue-600/80 backdrop-blur-md border border-white/20 rounded-full shadow-lg">
                    <span className="text-[8px] font-black text-white uppercase tracking-widest">Aktif</span>
                  </div>
                </div>

                <div className="absolute bottom-4 left-4">
                  <span className="text-[9px] font-black text-white/80 uppercase tracking-widest bg-black/40 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/10 italic">
                    Genel Proje
                  </span>
                </div>

                <div className="absolute top-4 right-4">
                  <button
                    onClick={(e) => handleDeleteProject(project.id, project.title, e)}
                    className="p-2 bg-red-600/80 hover:bg-red-500 backdrop-blur-md border border-white/20 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Projeyi Sil"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-8 flex flex-col h-full">
                <h3 className="text-xl font-black text-white mb-3 tracking-tighter group-hover:text-blue-400 transition-colors italic leading-tight">{project.title}</h3>
                <p className="text-slate-400 text-xs font-medium leading-relaxed italic line-clamp-2 mb-3 opacity-80">{project.description}</p>

                {/* TFS & Wiki Links */}
                {(project.tfsLinki || project.wikiLinki) && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {project.tfsLinki && (
                      <a
                        href={project.tfsLinki}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[9px] font-black uppercase tracking-widest hover:bg-orange-500/20 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        TFS
                      </a>
                    )}
                    {project.wikiLinki && (
                      <a
                        href={project.wikiLinki}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                        </svg>
                        Wiki
                      </a>
                    )}
                  </div>
                )}

                {/* Birimler with responsible persons */}
                {(project.birimler || []).length > 0 && (
                  <div className="mb-3 space-y-1">
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Birimler</p>
                    {(project.birimler || []).map((b, i) => (
                      <div key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <span className="text-[9px] font-black text-indigo-400">
                          {b.birimTipi}{b.birimAdi ? ` · ${b.birimAdi}` : ''}
                        </span>
                        {b.sorumluKullanici && (
                          <span title={b.sorumluKullanici} className="text-[8px] font-semibold text-slate-400 italic ml-2 truncate max-w-[80px]">
                            {b.sorumluKullanici}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Progress Bar */}
                {project.baslamaTarihi && project.bitisTarihi && (() => {
                  const start = new Date(project.baslamaTarihi);
                  const end = new Date(project.bitisTarihi);
                  const now = new Date();
                  const total = end.getTime() - start.getTime();
                  const elapsed = now.getTime() - start.getTime();
                  const notStarted = elapsed < 0;
                  const pct = notStarted || total <= 0 ? 0 : Math.min(100, Math.round((elapsed / total) * 100));
                  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                  return (
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">İlerleme</span>
                        <span className="text-[8px] font-black text-blue-400">
                          {notStarted ? 'Başlamadı' : `${pct}%`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[7px] text-slate-500 font-semibold">{fmt(start)}</span>
                        <span className="text-[7px] text-slate-500 font-semibold">{fmt(end)}</span>
                      </div>
                    </div>
                  );
                })()}
                
                <div className="mt-auto pt-5 border-t border-white/5 flex justify-between items-end">
                   <div>
                      <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-2">Proje Sorumluları</p>
                      <div className="flex -space-x-2">
                         {(project.members || [project.owner]).slice(0, 3).map((member, uIdx) => (
                           <UserAvatar key={uIdx} username={member} displayName={member} accessToken={user.accessToken} size="sm" className="border-2 border-[#1e293b] shadow-xl group-hover:border-blue-500/20 transition-all" />
                         ))}
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Sahip</p>
                      <p className="text-[10px] font-black text-blue-100 italic">{project.owner}</p>
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


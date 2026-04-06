import React, { useState, useEffect, useRef } from 'react';
import { User } from '../App';
import { UserAvatar } from './UserAvatar';
import { ProjectReportsTab } from './ProjectReportsTab';

interface Comment {
  id: string;
  author: string;
  rawAuthor: string;
  text: string;
  date: string;
  rawDate: Date;
}

interface Birim {
  birimTipi: string;
  birimAdi: string;
  sorumluKullanici: string;
}

interface TeamInfo {
  id: string;
  title: string;
  leader: string;
  members: string[];
}

interface AppUser {
  username: string;
  fullName: string;
}

const UNIT_TYPES = ['Yazılım', 'Donanım', 'Mekanik', 'Sistem'];

type DetailTab = 'comments' | 'details' | 'settings' | 'reports';
// Returns the Monday (00:00:00) of the week containing the given date
const getWeekStart = (d: Date): Date => {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

// Formats a week as "DD MMM – DD MMM YYYY" in Turkish locale
const formatWeekLabel = (monday: Date): string => {
  const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  const yearOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return `${monday.toLocaleDateString('tr-TR', opts)} – ${sunday.toLocaleDateString('tr-TR', yearOpts)}`;
};

export const ProjectDetail: React.FC<{
  projectId: string;
  projectTitle: string;
  onBack: () => void;
  onDelete?: () => void;
  user: User;
}> = ({ projectId, projectTitle, onBack, onDelete, user }) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('comments');

  // Comments tab
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [weekFilterOpen, setWeekFilterOpen] = useState(false);

  // Details tab
  const [birimler, setBirimler] = useState<Birim[]>([]);
  const [ilgiliEkipIdleri, setIlgiliEkipIdleri] = useState<string[]>([]);
  const [allTeams, setAllTeams] = useState<TeamInfo[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [detailsLoaded, setDetailsLoaded] = useState(false);

  // Settings tab
  const [settingsTitle, setSettingsTitle] = useState(projectTitle);
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsWikiLinki, setSettingsWikiLinki] = useState('');
  const [settingsTfsLinki, setSettingsTfsLinki] = useState('');
  const [projectOwner, setProjectOwner] = useState('');
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  // Birim user search dropdowns
  const [birimDropdowns, setBirimDropdowns] = useState<{ open: boolean; query: string }[]>([]);
  const birimDropdownRefs = useRef<(HTMLDivElement | null)[]>([]);
  const weekFilterRef = useRef<HTMLDivElement | null>(null);

  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  // Derive sorted list of unique weeks that have comments
  const availableWeeks: Date[] = React.useMemo(() => {
    const seen = new Map<string, Date>();
    comments.forEach(c => {
      const ws = getWeekStart(c.rawDate);
      const key = ws.toISOString();
      if (!seen.has(key)) seen.set(key, ws);
    });
    // Always include current week so there's at least one option
    const current = getWeekStart(new Date());
    if (!seen.has(current.toISOString())) seen.set(current.toISOString(), current);
    return Array.from(seen.values()).sort((a, b) => b.getTime() - a.getTime());
  }, [comments]);

  // Comments visible in the selected week
  const filteredComments = React.useMemo(() => {
    const start = selectedWeekStart;
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    return comments.filter(c => c.rawDate >= start && c.rawDate < end);
  }, [comments, selectedWeekStart]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/comments/project/${projectId}`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const mapped: Comment[] = (data || []).map((c: any) => {
          const rawDate = c.date ? new Date(c.date) : new Date(0);
          return {
            id: c.id,
            author: c.username,
            rawAuthor: c.username,
            text: c.content,
            date: c.date ? rawDate.toLocaleString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '',
            rawDate
          };
        });
        setComments(mapped);
      }
    } catch (err) {
      console.error('Yorumlar yüklenemedi:', err);
    }
  };

  const fetchProjectDetails = async () => {
    try {
      const [projectRes, teamsRes, usersRes] = await Promise.all([
        fetch(`${apiUrl}/api/projects/${projectId}`, {
          headers: { 'Authorization': `Bearer ${user.accessToken}` }
        }),
        fetch(`${apiUrl}/api/teams`, {
          headers: { 'Authorization': `Bearer ${user.accessToken}` }
        }),
        fetch(`${apiUrl}/api/users`, {
          headers: { 'Authorization': `Bearer ${user.accessToken}` }
        })
      ]);
      if (projectRes.ok) {
        const proj = await projectRes.json();
        setBirimler((proj.birimler || []).map((b: any) => ({
          birimTipi: b.birimTipi || 'Yazılım',
          birimAdi: b.birimAdi || '',
          sorumluKullanici: b.sorumluKullanici || ''
        })));
        setBirimDropdowns((proj.birimler || []).map(() => ({ open: false, query: '' })));
        setIlgiliEkipIdleri(proj.ilgiliEkipIdleri || []);
        setSettingsTitle(proj.title || projectTitle);
        setSettingsDescription(proj.description || '');
        setSettingsWikiLinki(proj.wikiLinki || '');
        setSettingsTfsLinki(proj.tfsLinki || '');
        setProjectOwner(proj.owner || '');
        setProjectMembers(proj.members || []);
      }
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setAllTeams((teamsData || []).map((t: any) => ({
          id: t.id, title: t.title, leader: t.leader, members: t.members || []
        })));
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setAllUsers((usersData || []).map((u: any) => ({
          username: u.username ?? u.Username ?? '',
          fullName: u.fullName ?? u.FullName ?? ''
        })));
      }
      setDetailsLoaded(true);
    } catch (err) {
      console.error('Proje detayları yüklenemedi:', err);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchComments();
      fetchProjectDetails();
    }
  }, [projectId, user.accessToken]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      birimDropdownRefs.current.forEach((ref, i) => {
        if (ref && !ref.contains(e.target as Node)) {
          setBirimDropdowns(prev => prev.map((d, idx) => idx === i ? { ...d, open: false } : d));
        }
      });
      if (weekFilterRef.current && !weekFilterRef.current.contains(e.target as Node)) {
        setWeekFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getUserFullName = (username: string) => {
    const found = allUsers.find(u => u.username === username);
    return found?.fullName || username;
  };

  const filteredUsersForBirim = (query: string) => {
    if (!query.trim()) return allUsers.slice(0, 8);
    const q = query.toLowerCase();
    return allUsers.filter(u =>
      u.username.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q)
    ).slice(0, 8);
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

  const getBirimInputValue = (i: number, b: Birim): string => {
    if (birimDropdowns[i]?.open) return birimDropdowns[i]?.query ?? '';
    return b.sorumluKullanici ? getUserFullName(b.sorumluKullanici) : '';
  };

  const handleSaveDetails = async () => {
    setIsSavingDetails(true);
    setSaveSuccess(false);
    try {
      const response = await fetch(`${apiUrl}/api/projects/${projectId}/details`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`
        },
        body: JSON.stringify({
          birimler: birimler.filter(b => b.birimAdi.trim()),
          ilgiliEkipIdleri
        })
      });
      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(errData.message || 'Detaylar kaydedilemedi.');
      }
    } catch (err) {
      console.error('Detaylar kaydedilemedi:', err);
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSettingsSaveSuccess(false);
    try {
      // Fetch the latest saved project data to avoid overwriting unsaved details-tab changes
      const currentProjectRes = await fetch(`${apiUrl}/api/projects/${projectId}`, {
        headers: { 'Authorization': `Bearer ${user.accessToken}` }
      });
      const currentProject = currentProjectRes.ok ? await currentProjectRes.json() : null;
      if (!currentProject) {
        alert('Proje verileri alınamadı. Lütfen tekrar deneyin.');
        setIsSavingSettings(false);
        return;
      }

      const [putRes, patchRes] = await Promise.all([
        fetch(`${apiUrl}/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.accessToken}` },
          body: JSON.stringify({
            title: settingsTitle.trim(),
            description: settingsDescription.trim(),
            owner: projectOwner,
            members: projectMembers
          })
        }),
        fetch(`${apiUrl}/api/projects/${projectId}/details`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.accessToken}` },
          body: JSON.stringify({
            birimler: currentProject?.birimler ?? [],
            ilgiliEkipIdleri: currentProject?.ilgiliEkipIdleri ?? [],
            wikiLinki: settingsWikiLinki.trim() || null,
            tfsLinki: settingsTfsLinki.trim() || null
          })
        })
      ]);
      if (putRes.ok && patchRes.ok) {
        setSettingsSaveSuccess(true);
        setTimeout(() => setSettingsSaveSuccess(false), 3000);
      } else {
        const errData = await (!putRes.ok ? putRes : patchRes).json().catch(() => ({}));
        alert(errData.message || 'Ayarlar kaydedilemedi.');
      }
    } catch (err) {
      console.error('Ayarlar kaydedilemedi:', err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`"${settingsTitle}" projesini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    setIsDeletingProject(true);
    try {
      const response = await fetch(`${apiUrl}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.accessToken}` }
      });
      if (response.ok) {
        if (onDelete) onDelete();
        else onBack();
      } else {
        alert('Proje silinemedi. Lütfen tekrar deneyin.');
      }
    } catch (err) {
      console.error('Proje silinemedi:', err);
      alert('Proje silinemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsDeletingProject(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`
        },
        body: JSON.stringify({
          projectId: projectId,
          text: newComment,
          author: user.username
        })
      });
      if (response.ok) {
        setNewComment('');
        await fetchComments();
      }
    } catch (err) {
      console.error('Yorum eklenemedi:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await fetch(`${apiUrl}/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.accessToken}` }
      });
      await fetchComments();
    } catch (err) {
      console.error('Yorum silinemedi:', err);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-5">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl hover:bg-white/10 transition-all text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-2xl font-black text-white italic tracking-tighter">{projectTitle}</h2>
            <p className="text-[8px] font-black text-blue-500/60 uppercase tracking-[0.3em] mt-1">Proje Detayları</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
            activeTab === 'comments'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Yorumlar
          {filteredComments.length > 0 && (
            <span className="bg-white/20 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">{filteredComments.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
            activeTab === 'details'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Birimler &amp; Ekipler
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
            activeTab === 'settings'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Ayarlar
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
            activeTab === 'reports'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Raporlar
        </button>
      </div>

      {/* REPORTS TAB */}
      {activeTab === 'reports' && (
        <ProjectReportsTab
          projectOwner={projectOwner}
          projectMembers={projectMembers}
          allUsers={allUsers}
          user={user}
          apiUrl={apiUrl}
        />
      )}

      {/* COMMENTS TAB */}
      {activeTab === 'comments' && (
        <div className="flex-1 overflow-hidden flex flex-col gap-4 h-[calc(100vh-280px)]">

          {/* Week filter */}
          <div className="flex justify-end">
            <div ref={weekFilterRef} className="relative">
              <button
                onClick={() => setWeekFilterOpen(prev => !prev)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-slate-300 uppercase tracking-widest transition-all"
              >
                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatWeekLabel(selectedWeekStart)}
                <svg className={`w-3 h-3 transition-transform ${weekFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {weekFilterOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 min-w-[240px] bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                  {availableWeeks.map(ws => {
                    const isSelected = ws.toISOString() === selectedWeekStart.toISOString();
                    return (
                      <button
                        key={ws.toISOString()}
                        onClick={() => { setSelectedWeekStart(ws); setWeekFilterOpen(false); }}
                        className={`w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {formatWeekLabel(ws)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {filteredComments.map((comment) => (
              <div key={comment.id} className="group bg-[#1e293b]/30 backdrop-blur-md rounded-3xl p-6 border border-white/5 hover:border-blue-500/20 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center font-black text-blue-400 border border-white/5 shadow-inner">
                      {comment.author.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-black text-white italic">{comment.author}</p>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Personel</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-600 bg-black/20 px-3 py-1 rounded-full">{comment.date}</span>
                    {comment.rawAuthor === user.username && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400"
                        title="Yorumu sil"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-slate-300 text-sm italic leading-relaxed border-l-2 border-blue-600/30 pl-4">
                  {comment.text}
                </p>
              </div>
            ))}
            {filteredComments.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-20">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-[10px] font-black uppercase tracking-widest">Bu haftaya ait yorum bulunamadı</p>
              </div>
            )}
          </div>

          {/* New Comment Form */}
          <div className="bg-[#0f172a] rounded-3xl border border-white/10 p-6 shadow-2xl flex-shrink-0">
            <form onSubmit={handleAddComment} className="flex gap-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ekibe bir not bırakın veya soru sorun..."
                className="flex-1 bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-4 text-white text-sm outline-none focus:border-blue-500/50 transition-all resize-none italic h-16"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
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
      )}

      {/* DETAILS TAB: Birimler & Ekipler */}
      {activeTab === 'details' && (
        <div className="flex-1 overflow-y-auto space-y-8 pr-1">
          {!detailsLoaded ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* Birimler Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-black text-white italic">Proje Birimleri</h3>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Yazılım / Donanım / Mekanik / Sistem</p>
                  </div>
                </div>

                {birimler.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 opacity-40 border border-dashed border-white/10 rounded-2xl mb-4">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Henüz birim tanımlanmamış</p>
                  </div>
                )}

                <div className="space-y-3 mb-4">
                  {birimler.map((b, i) => (
                    <div key={i} className="bg-[#1e293b]/50 border border-white/5 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Birim {i + 1}</span>
                        <button type="button" onClick={() => removeBirim(i)} className="text-red-400 hover:text-red-300 text-xs font-black px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all">Sil</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
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
                            className="w-full bg-slate-900/70 border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs font-bold outline-none focus:border-blue-500/50 transition-all pr-24"
                          />
                          {b.sorumluKullanici && !birimDropdowns[i]?.open && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
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
                        {b.sorumluKullanici && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <UserAvatar username={b.sorumluKullanici} displayName={getUserFullName(b.sorumluKullanici)} accessToken={user.accessToken} size="sm" />
                            <span className="text-xs text-slate-300 font-bold italic">{getUserFullName(b.sorumluKullanici)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addBirim}
                  className="flex items-center gap-2 text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors px-4 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20"
                >
                  <span className="text-sm leading-none">+</span> Birim Ekle
                </button>
              </div>

              {/* Teams Section */}
              <div>
                <div className="mb-4">
                  <h3 className="text-sm font-black text-white italic">İlgili Ekipler</h3>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Projeyle ilişkili ekipler</p>
                </div>

                {allTeams.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 opacity-40">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Henüz ekip bulunmuyor.</p>
                  </div>
                )}

                <div className="space-y-3">
                  {allTeams.map(team => {
                    const isChecked = ilgiliEkipIdleri.includes(team.id);
                    return (
                      <label
                        key={team.id}
                        className={`flex items-center gap-4 cursor-pointer p-4 rounded-2xl border transition-all ${
                          isChecked ? 'bg-blue-600/15 border-blue-500/40' : 'bg-[#1e293b]/30 border-white/5 hover:border-white/10'
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
                        <div className="relative flex-shrink-0">
                          <UserAvatar username={team.leader} displayName={getUserFullName(team.leader)} accessToken={user.accessToken} size="md" />
                          <span className="absolute -bottom-1 -right-1 text-[8px] leading-none">👑</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-black text-sm italic">{team.title}</p>
                          <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">Lider: {getUserFullName(team.leader)}</p>
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

              {/* Save Button */}
              <div className="flex justify-end items-center gap-4 pb-4">
                {saveSuccess && (
                  <span className="text-[9px] font-black text-green-400 uppercase tracking-widest flex items-center gap-1.5 animate-in fade-in duration-300">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    Kaydedildi
                  </span>
                )}
                <button
                  onClick={handleSaveDetails}
                  disabled={isSavingDetails}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 transition-all disabled:opacity-50"
                >
                  {isSavingDetails ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="flex-1 overflow-y-auto space-y-8 pr-1">
          {/* General Info */}
          <div className="bg-[#1e293b]/30 backdrop-blur-md rounded-3xl border border-white/5 p-6 space-y-5">
            <div>
              <h3 className="text-sm font-black text-white italic">Genel Bilgiler</h3>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Proje başlığı ve açıklaması</p>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Proje Başlığı</label>
              <input
                value={settingsTitle}
                onChange={e => setSettingsTitle(e.target.value)}
                className={`w-full bg-slate-900/70 border rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-blue-500/50 transition-all ${!settingsTitle.trim() ? 'border-red-500/50' : 'border-white/5'}`}
              />
              {!settingsTitle.trim() && (
                <p className="text-[9px] font-black text-red-400 mt-1">Proje başlığı zorunludur.</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Açıklama</label>
              <textarea
                value={settingsDescription}
                onChange={e => setSettingsDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-900/70 border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-blue-500/50 transition-all resize-none"
              />
            </div>
          </div>

          {/* Links */}
          <div className="bg-[#1e293b]/30 backdrop-blur-md rounded-3xl border border-white/5 p-6 space-y-5">
            <div>
              <h3 className="text-sm font-black text-white italic">Bağlantılar</h3>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Wiki ve TFS linkleri</p>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Wiki Linki</label>
              <input
                value={settingsWikiLinki}
                onChange={e => setSettingsWikiLinki(e.target.value)}
                placeholder="https://wiki.example.com/proje"
                className="w-full bg-slate-900/70 border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-blue-500/50 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">TFS Linki</label>
              <input
                value={settingsTfsLinki}
                onChange={e => setSettingsTfsLinki(e.target.value)}
                placeholder="https://tfs.example.com/proje"
                className="w-full bg-slate-900/70 border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-blue-500/50 transition-all"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end items-center gap-4">
            {settingsSaveSuccess && (
              <span className="text-[9px] font-black text-green-400 uppercase tracking-widest flex items-center gap-1.5 animate-in fade-in duration-300">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                Kaydedildi
              </span>
            )}
            <button
              onClick={handleSaveSettings}
              disabled={isSavingSettings || !settingsTitle.trim()}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 transition-all disabled:opacity-50"
            >
              {isSavingSettings ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-950/20 backdrop-blur-md rounded-3xl border border-red-500/20 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-black text-red-400 italic">Tehlikeli Bölge</h3>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Bu işlemler geri alınamaz</p>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-950/30 rounded-2xl border border-red-500/10">
              <div>
                <p className="text-sm font-black text-white italic">Projeyi Sil</p>
                <p className="text-[9px] text-slate-500 mt-0.5">Bu projeyi ve tüm ilgili verilerini kalıcı olarak sil.</p>
              </div>
              <button
                onClick={handleDeleteProject}
                disabled={isDeletingProject}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-red-600/20"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {isDeletingProject ? 'Siliniyor...' : 'Projeyi Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

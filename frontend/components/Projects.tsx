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

interface ProjectGroup {
  id: string;
  name: string;
  projectIds: string[];
  color: string;
  createdAt: string;
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

const IMAGE_POOL = [
  "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1558494949-ef010cbdcc51?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=800&auto=format&fit=crop"
];

const GROUP_COLORS = [
  { label: 'Kobalt', value: 'blue', bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-400', solid: '#3b82f6' },
  { label: 'Mor', value: 'violet', bg: 'bg-violet-500/20', border: 'border-violet-500/40', text: 'text-violet-400', solid: '#8b5cf6' },
  { label: 'Zümrüt', value: 'emerald', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400', solid: '#10b981' },
  { label: 'Amber', value: 'amber', bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-400', solid: '#f59e0b' },
  { label: 'Gül', value: 'rose', bg: 'bg-rose-500/20', border: 'border-rose-500/40', text: 'text-rose-400', solid: '#f43f5e' },
  { label: 'Cyan', value: 'cyan', bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', text: 'text-cyan-400', solid: '#06b6d4' },
];

const getGroupColor = (colorValue: string) =>
  GROUP_COLORS.find(c => c.value === colorValue) || GROUP_COLORS[0];

// ─── Folder Card ──────────────────────────────────────────────────────────────
const FolderCard: React.FC<{
  group: ProjectGroup;
  projectCount: number;
  previewProjects: Project[];
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragOver: boolean;
}> = ({ group, projectCount, previewProjects, onOpen, onDelete, onDragOver, onDrop, isDragOver }) => {
  const color = getGroupColor(group.color);

  return (
    <div
      onClick={onOpen}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={e => e.preventDefault()}
      className={`
        group relative cursor-pointer
        bg-[#1e293b]/30 backdrop-blur-md rounded-[2.5rem] shadow-2xl
        border transition-all duration-300 flex flex-col overflow-hidden
        hover:shadow-xl
        ${isDragOver
          ? `${color.border} ${color.bg} scale-[1.02] shadow-2xl`
          : 'border-white/5 hover:border-white/15'
        }
      `}
      style={{ minHeight: '280px' }}
    >
      {/* Top color bar */}
      <div
        className="h-1.5 w-full flex-shrink-0"
        style={{ background: `linear-gradient(90deg, ${color.solid}99, ${color.solid}22)` }}
      />

      {/* Folder icon area with stacked preview */}
      <div className="relative flex-1 px-8 pt-6 pb-4 flex flex-col">
        {/* Big folder icon */}
        <div className="mb-4 flex items-start justify-between">
          <div className={`w-14 h-14 rounded-2xl ${color.bg} border ${color.border} flex items-center justify-center`}>
            <svg className={`w-7 h-7 ${color.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
          </div>

          {/* Delete button */}
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/20"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <h3 className={`text-lg font-black text-white tracking-tight italic mb-1 group-hover:${color.text} transition-colors`}>
          {group.name}
        </h3>

        {/* Count badge */}
        <p className={`text-[9px] font-black uppercase tracking-widest ${color.text} mb-4`}>
          {projectCount} proje
        </p>

        {/* Mini project image previews */}
        {previewProjects.length > 0 ? (
          <div className="flex gap-2 mt-auto">
            {previewProjects.slice(0, 3).map((p, i) => (
              <div
                key={p.id}
                className="flex-1 h-16 rounded-xl overflow-hidden border border-white/10 relative"
                style={{ opacity: 1 - i * 0.15 }}
              >
                <img
                  src={p.cardImage || p.image || IMAGE_POOL[0]}
                  alt={p.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <p className="absolute bottom-1 left-1.5 right-1.5 text-[7px] font-black text-white truncate leading-tight">
                  {p.title}
                </p>
              </div>
            ))}
            {projectCount > 3 && (
              <div className={`w-16 h-16 rounded-xl ${color.bg} border ${color.border} flex items-center justify-center flex-shrink-0`}>
                <span className={`text-[11px] font-black ${color.text}`}>+{projectCount - 3}</span>
              </div>
            )}
          </div>
        ) : (
          <div className={`mt-auto flex items-center justify-center h-16 rounded-xl border border-dashed ${color.border} ${color.bg}`}>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Proje bırakın</p>
          </div>
        )}

        {/* Drag hint */}
        {isDragOver && (
          <div className={`absolute inset-0 rounded-[2.5rem] border-2 ${color.border} flex items-center justify-center bg-[#1e293b]/80 backdrop-blur-sm pointer-events-none`}>
            <div className={`flex flex-col items-center gap-2`}>
              <svg className={`w-8 h-8 ${color.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <p className={`text-[10px] font-black uppercase tracking-widest ${color.text}`}>Ekle</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export const Projects: React.FC<ProjectsProps> = ({ onSelectProject, user }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Groups (local state — no backend yet)
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null); // null = root
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);

  // New group modal
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('blue');

  // Project wizard modal / state (unchanged)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [birimler, setBirimler] = useState<Birim[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [birimDropdowns, setBirimDropdowns] = useState<{ open: boolean; query: string }[]>([]);
  const birimDropdownRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [availableTeams, setAvailableTeams] = useState<TeamOption[]>([]);
  const [ilgiliEkipIdleri, setIlgiliEkipIdleri] = useState<string[]>([]);
  const todayStr = new Date().toISOString().split('T')[0];
  const [baslamaTarihi, setBaslamaTarihi] = useState(todayStr);
  const [bitisTarihi, setBitisTarihi] = useState('');
  const [otomatikPipeline, setOtomatikPipeline] = useState(false);
  const [outsource, setOutsource] = useState(false);
  const [wikiLinki, setWikiLinki] = useState('');
  const [tfsLinki, setTfsLinki] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${apiUrl}/api/projects`, {
        headers: { accept: 'application/json', Authorization: `Bearer ${user.accessToken}` }
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
    } catch {
      setProjects([]);
      setError('Projeler yüklenemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const teamsRes = await fetch(`${apiUrl}/api/teams`, {
        headers: { Authorization: `Bearer ${user.accessToken}` }
      });
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setAvailableTeams((teamsData || []).map((t: any) => ({
          id: t.id, title: t.title, leader: t.leader, members: t.members || []
        })));
      }
    } catch { setAvailableTeams([]); }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/users`, {
        headers: { Authorization: `Bearer ${user.accessToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAllUsers((data || []).map((u: any) => ({
          username: u.username ?? u.Username ?? '',
          fullName: u.fullName ?? u.FullName ?? ''
        })));
      }
    } catch { setAllUsers([]); }
  };

  useEffect(() => { fetchProjects(); }, [user.accessToken]);

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

  // ── Delete project ────────────────────────────────────────────────────────
  const handleDeleteProject = async (projectId: string, projectTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`"${projectTitle}" projesini silmek istediğinize emin misiniz?`)) return;
    try {
      const response = await fetch(`${apiUrl}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.accessToken}` }
      });
      if (response.ok) {
        await fetchProjects();
        // also remove from groups
        setGroups(prev => prev.map(g => ({
          ...g, projectIds: g.projectIds.filter(id => id !== projectId)
        })));
      } else {
        alert('Proje silinemedi. Lütfen tekrar deneyin.');
      }
    } catch { alert('Proje silinemedi. Lütfen tekrar deneyin.'); }
  };

  // ── Group helpers ─────────────────────────────────────────────────────────
  const createGroup = () => {
    if (!newGroupName.trim()) return;
    const group: ProjectGroup = {
      id: `group_${Date.now()}`,
      name: newGroupName.trim(),
      projectIds: [],
      color: newGroupColor,
      createdAt: new Date().toISOString()
    };
    setGroups(prev => [...prev, group]);
    setNewGroupName('');
    setNewGroupColor('blue');
    setIsGroupModalOpen(false);
  };

  const deleteGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Bu grubu silmek istediğinize emin misiniz? Projeler silinmez, sadece gruptan çıkar.')) return;
    setGroups(prev => prev.filter(g => g.id !== groupId));
    if (activeGroupId === groupId) setActiveGroupId(null);
  };

  const removeProjectFromGroup = (projectId: string, groupId: string) => {
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, projectIds: g.projectIds.filter(id => id !== projectId) } : g
    ));
  };

  // The group a project is currently in (if any)
  const getProjectGroup = (projectId: string) =>
    groups.find(g => g.projectIds.includes(projectId));

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('projectId', projectId);
    setDraggingProjectId(projectId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingProjectId(null);
    setDragOverGroupId(null);
  };

  const handleDragOverGroup = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverGroupId(groupId);
  };

  const handleDropOnGroup = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('projectId');
    if (!projectId) return;
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        if (g.projectIds.includes(projectId)) return g;
        return { ...g, projectIds: [...g.projectIds, projectId] };
      }
      // Remove from other groups
      return { ...g, projectIds: g.projectIds.filter(id => id !== projectId) };
    }));
    setDragOverGroupId(null);
  };

  // ── Project wizard helpers (unchanged) ────────────────────────────────────
  const openModal = () => {
    fetchTeams();
    fetchAllUsers();
    setIsModalOpen(true);
    setWizardStep(1);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewTitle(''); setNewDescription('');
    setBirimler([]); setBirimDropdowns([]);
    setIlgiliEkipIdleri([]);
    setBaslamaTarihi(todayStr); setBitisTarihi('');
    setOtomatikPipeline(false); setOutsource(false);
    setWikiLinki(''); setTfsLinki('');
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

  const getUserFullName = (username: string) =>
    allUsers.find(u => u.username === username)?.fullName || username;

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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.accessToken}` },
        body: JSON.stringify({
          title: newTitle, description: newDescription, owner: user.username,
          members: [user.username], sorumlular: [],
          birimler: birimler.filter(b => b.birimAdi.trim()),
          ilgiliEkipIdleri,
          baslamaTarihi: baslamaTarihi || null, bitisTarihi: bitisTarihi || null,
          otomatikPipeline, outsource,
          wikiLinki: wikiLinki || null, tfsLinki: tfsLinki || null
        })
      });
      if (response.ok) { await fetchProjects(); closeModal(); }
      else {
        const errData = await response.json().catch(() => ({}));
        alert(errData.message || 'Proje oluşturulamadı.');
      }
    } catch { console.error('Proje oluşturulamadı'); }
    finally { setIsCreating(false); }
  };

  const stepLabels = ['Temel Bilgiler', 'Birimler', 'Ekipler', 'Tarih & Detaylar'];

  // ── Derived data ──────────────────────────────────────────────────────────
  const activeGroup = groups.find(g => g.id === activeGroupId) ?? null;

  // Projects to show in root view = not in any group
  const ungroupedProjects = projects.filter(p => !groups.some(g => g.projectIds.includes(p.id)));

  // Projects for current view
  const currentProjects = activeGroup
    ? projects.filter(p => activeGroup.projectIds.includes(p.id))
    : ungroupedProjects;

  const q = searchQuery.trim().toLowerCase();
  const filteredProjects = q
    ? currentProjects.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.owner || '').toLowerCase().includes(q)
      )
    : currentProjects;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">

      {/* ── Header ── */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          {activeGroup ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setActiveGroupId(null); setSearchQuery(''); }}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                </svg>
                Geri
              </button>
              <span className="text-slate-600">·</span>
              <div
                className="w-5 h-5 rounded-lg flex items-center justify-center"
                style={{ background: `${getGroupColor(activeGroup.color).solid}33`, border: `1px solid ${getGroupColor(activeGroup.color).solid}55` }}
              >
                <svg className="w-3 h-3" fill="none" stroke={getGroupColor(activeGroup.color).solid} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                    d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
              </div>
              <h2 className={`text-2xl font-black tracking-tight italic ${getGroupColor(activeGroup.color).text}`}>
                {activeGroup.name}
              </h2>
            </div>
          ) : (
            <h2 className="text-2xl font-black text-white tracking-tight italic">Projelerim</h2>
          )}
          <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mt-1 border-l-2 border-blue-600 pl-3">
            {activeGroup
              ? `${activeGroup.projectIds.length} proje · ${activeGroup.name} grubu`
              : 'Sorumluluğunuzdaki Kayıtlar'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* New group button — only on root */}
          {!activeGroup && (
            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="group flex items-center gap-2.5 bg-[#1e293b]/60 hover:bg-[#1e293b]/80 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/10 hover:border-white/20 transition-all active:scale-95"
            >
              <svg className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
              <span className="text-[10px] font-black text-slate-400 group-hover:text-white uppercase tracking-widest transition-colors">
                Yeni Grup
              </span>
              <div className="w-4 h-4 bg-white/10 rounded-md flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </button>
          )}

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
      </div>

      {/* ── Search ── */}
      <div className="mb-8 relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={activeGroup ? `${activeGroup.name} içinde ara...` : 'Proje ara...'}
          className="w-full pl-11 pr-4 py-3 bg-[#1e293b]/40 backdrop-blur-md border border-white/10 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-[#1e293b]/60 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-4 flex items-center text-slate-500 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Drag hint banner (root only, when dragging) ── */}
      {draggingProjectId && !activeGroup && groups.length > 0 && (
        <div className="mb-6 px-5 py-3 bg-blue-600/10 border border-blue-500/30 rounded-2xl flex items-center gap-3 animate-in fade-in duration-200">
          <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" />
          </svg>
          <p className="text-blue-300 text-[10px] font-black uppercase tracking-widest">
            Projeyi bir gruba eklemek için klasörün üzerine bırakın
          </p>
        </div>
      )}

      {/* ── New Group Modal ── */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-[#1e293b] border border-white/10 w-full max-w-md rounded-[2.5rem] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black text-white italic tracking-tight">Yeni Grup</h3>
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1">Proje Klasörü Oluştur</p>
                </div>
                <button
                  onClick={() => { setIsGroupModalOpen(false); setNewGroupName(''); setNewGroupColor('blue'); }}
                  className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Grup Adı *</label>
                  <input
                    autoFocus
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createGroup()}
                    placeholder="Örn: Q2 İnisiyatifleri"
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Renk</label>
                  <div className="flex gap-2 flex-wrap">
                    {GROUP_COLORS.map(c => (
                      <button
                        key={c.value}
                        onClick={() => setNewGroupColor(c.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-[9px] font-black uppercase tracking-wider ${
                          newGroupColor === c.value
                            ? `${c.bg} ${c.border} ${c.text}`
                            : 'bg-slate-900/40 border-white/5 text-slate-500 hover:border-white/15'
                        }`}
                      >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.solid }} />
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => { setIsGroupModalOpen(false); setNewGroupName(''); setNewGroupColor('blue'); }}
                  className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-white/5 transition-all"
                >
                  Vazgeç
                </button>
                <button
                  onClick={createGroup}
                  disabled={!newGroupName.trim()}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 transition-all"
                >
                  Grup Oluştur ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 4-Step Project Wizard Modal (unchanged) ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#1e293b] border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col">
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
              <div className="flex items-center gap-2 mb-6">
                {stepLabels.map((label, idx) => {
                  const stepNum = (idx + 1) as 1 | 2 | 3 | 4;
                  const isActive = wizardStep === stepNum;
                  const isDone = wizardStep > stepNum;
                  return (
                    <React.Fragment key={idx}>
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${isDone ? 'bg-blue-500 text-white' : isActive ? 'bg-blue-600 text-white ring-2 ring-blue-400/40' : 'bg-white/5 text-slate-500'}`}>
                          {isDone ? '✓' : stepNum}
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-wide text-center leading-tight ${isActive ? 'text-blue-400' : isDone ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
                      </div>
                      {idx < 3 && <div className={`h-px flex-1 mb-4 transition-all ${isDone ? 'bg-blue-500' : 'bg-white/5'}`} />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-4">
              {wizardStep === 1 && (
                <div className="space-y-5 py-2">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Proje Başlığı *</label>
                    <input required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Örn: Mobil Kredi Akış Modernizasyonu"
                      className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Proje Açıklaması *</label>
                    <textarea required value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Projenin temel hedeflerini ve kapsamını kısaca belirtin..." rows={5}
                      className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all resize-none italic" />
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4 py-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Projenin Birimleri</p>
                  <p className="text-xs text-slate-400 italic">Her birim için tipi, adı ve sorumlusunu belirleyin.</p>
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
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Birim Tipi</label>
                          <select value={b.birimTipi} onChange={e => updateBirim(i, 'birimTipi', e.target.value)}
                            className="w-full bg-slate-900/70 border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs font-bold outline-none focus:border-blue-500/50 transition-all">
                            {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Birim Adı</label>
                          <input value={b.birimAdi} onChange={e => updateBirim(i, 'birimAdi', e.target.value)} placeholder="Ör: Gömülü Yazılım"
                            className="w-full bg-slate-900/70 border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs font-bold outline-none focus:border-blue-500/50 transition-all" />
                        </div>
                      </div>
                      <div className="space-y-1" ref={el => { birimDropdownRefs.current[i] = el; }}>
                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Birim Sorumlusu</label>
                        <div className="relative">
                          <input value={getBirimInputValue(i, b)}
                            onChange={e => { setBirimDropdowns(prev => prev.map((d, idx) => idx === i ? { open: true, query: e.target.value } : d)); if (!e.target.value) updateBirim(i, 'sorumluKullanici', ''); }}
                            onFocus={() => setBirimDropdowns(prev => prev.map((d, idx) => idx === i ? { ...d, open: true } : d))}
                            placeholder="Kullanıcı ara..."
                            className="w-full bg-slate-900/70 border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs font-bold outline-none focus:border-blue-500/50 transition-all" />
                          {b.sorumluKullanici && !(birimDropdowns[i]?.open) && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <span className="text-[8px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">{b.sorumluKullanici}</span>
                            </div>
                          )}
                          {birimDropdowns[i]?.open && filteredUsersForBirim(birimDropdowns[i]?.query ?? '').length > 0 && (
                            <ul className="absolute z-20 left-0 right-0 mt-1 bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl max-h-44 overflow-y-auto">
                              {filteredUsersForBirim(birimDropdowns[i]?.query ?? '').map(u => (
                                <li key={u.username} onMouseDown={() => { updateBirim(i, 'sorumluKullanici', u.username); setBirimDropdowns(prev => prev.map((d, idx) => idx === i ? { open: false, query: '' } : d)); }}
                                  className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-blue-600/20 transition-colors">
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
                  <button type="button" onClick={addBirim} className="flex items-center gap-2 text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors px-4 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20">
                    <span className="text-sm">+</span> Birim Ekle
                  </button>
                </div>
              )}

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
                        <label key={team.id} className={`flex items-center gap-4 cursor-pointer p-4 rounded-2xl border transition-all ${isChecked ? 'bg-blue-600/15 border-blue-500/40' : 'bg-slate-900/30 border-white/5 hover:border-white/10'}`}>
                          <input type="checkbox" checked={isChecked} onChange={e => { if (e.target.checked) setIlgiliEkipIdleri(prev => [...prev, team.id]); else setIlgiliEkipIdleri(prev => prev.filter(id => id !== team.id)); }} className="accent-blue-500 w-4 h-4 flex-shrink-0" />
                          <div className="flex-shrink-0"><UserAvatar username={team.leader} displayName={getUserFullName(team.leader)} accessToken={user.accessToken} size="md" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-black text-sm italic">{team.title}</p>
                            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">Lider: {getUserFullName(team.leader)}</p>
                            <p className="text-slate-600 text-[8px] mt-0.5">{team.members.length} üye</p>
                          </div>
                          {isChecked && <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0"><svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></div>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-5 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Başlama Tarihi</label>
                      <input type="date" value={baslamaTarihi} onChange={e => setBaslamaTarihi(e.target.value)} className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-blue-500/50 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Beklenen Bitiş</label>
                      <input type="date" value={bitisTarihi} onChange={e => setBitisTarihi(e.target.value)} className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-blue-500/50 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`flex items-center gap-3 cursor-pointer p-4 rounded-2xl border transition-all ${otomatikPipeline ? 'bg-blue-600/15 border-blue-500/40' : 'bg-slate-900/30 border-white/5 hover:border-white/10'}`}>
                      <input type="checkbox" checked={otomatikPipeline} onChange={e => setOtomatikPipeline(e.target.checked)} className="accent-blue-500 w-4 h-4 flex-shrink-0" />
                      <div><p className="text-white font-black text-xs">Otomatik Pipeline</p><p className="text-slate-500 text-[8px] italic">CI/CD süreci mevcut</p></div>
                    </label>
                    <label className={`flex items-center gap-3 cursor-pointer p-4 rounded-2xl border transition-all ${outsource ? 'bg-blue-600/15 border-blue-500/40' : 'bg-slate-900/30 border-white/5 hover:border-white/10'}`}>
                      <input type="checkbox" checked={outsource} onChange={e => setOutsource(e.target.checked)} className="accent-blue-500 w-4 h-4 flex-shrink-0" />
                      <div><p className="text-white font-black text-xs">Outsource</p><p className="text-slate-500 text-[8px] italic">Dışarıya temin edildi</p></div>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Wiki Linki</label>
                    <input type="url" value={wikiLinki} onChange={e => setWikiLinki(e.target.value)} placeholder="https://wiki.example.com/proje" className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-blue-500/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">TFS Linki</label>
                    <input type="url" value={tfsLinki} onChange={e => setTfsLinki(e.target.value)} placeholder="https://tfs.example.com/proje" className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-blue-500/50 transition-all" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 pt-4 flex-shrink-0">
              <div className="flex gap-4">
                {wizardStep > 1 ? (
                  <button type="button" onClick={() => setWizardStep(prev => (prev - 1) as 1 | 2 | 3 | 4)} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all flex items-center justify-center gap-2">← Geri</button>
                ) : (
                  <button type="button" onClick={closeModal} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-white/5 transition-all">Vazgeç</button>
                )}
                {wizardStep < 4 ? (
                  <button type="button" onClick={() => { if (wizardStep === 1 && !newTitle.trim()) { alert('Proje başlığı zorunludur.'); return; } setWizardStep(prev => (prev + 1) as 1 | 2 | 3 | 4); }} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2">İleri →</button>
                ) : (
                  <button type="button" onClick={handleCreateProject} disabled={isCreating} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 transition-all disabled:opacity-50">
                    {isCreating ? 'Oluşturuluyor...' : 'Projeyi Kaydet ✓'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-black text-[9px] uppercase tracking-widest">Veritabanı Sorgulanıyor...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-40 opacity-40">
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{error}</p>
        </div>
      ) : (
        <>
          {/* ── Folder cards (root only, no search active) ── */}
          {!activeGroup && !searchQuery && groups.length > 0 && (
            <div className="mb-10">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-4 border-l-2 border-slate-600 pl-3">
                Gruplar · {groups.length}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map(group => {
                  const groupProjects = projects.filter(p => group.projectIds.includes(p.id));
                  return (
                    <FolderCard
                      key={group.id}
                      group={group}
                      projectCount={groupProjects.length}
                      previewProjects={groupProjects}
                      onOpen={() => { setActiveGroupId(group.id); setSearchQuery(''); }}
                      onDelete={e => deleteGroup(group.id, e)}
                      onDragOver={e => handleDragOverGroup(e, group.id)}
                      onDrop={e => handleDropOnGroup(e, group.id)}
                      isDragOver={dragOverGroupId === group.id}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Section label ── */}
          {!activeGroup && !searchQuery && ungroupedProjects.length > 0 && (
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-4 border-l-2 border-blue-600 pl-3">
              {groups.length > 0 ? `Grupsuz Projeler · ${ungroupedProjects.length}` : `Tüm Projeler · ${projects.length}`}
            </p>
          )}

          {/* ── Project grid ── */}
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 opacity-40">
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">
                {searchQuery ? 'Aramanızla eşleşen proje bulunamadı.' : activeGroup ? 'Bu grupta henüz proje yok. Sürükleyerek ekleyin.' : 'Henüz proje bulunmuyor.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProjects.map((project, idx) => {
                const inGroup = getProjectGroup(project.id);
                return (
                  <div
                    key={project.id || idx}
                    draggable={!activeGroup}
                    onDragStart={e => handleDragStart(e, project.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onSelectProject(project.id, project.title)}
                    className={`
                      group bg-[#1e293b]/30 backdrop-blur-md rounded-[2.5rem] shadow-2xl
                      border border-white/5 overflow-hidden
                      hover:bg-[#1e293b]/50 transition-all duration-500 flex flex-col cursor-pointer
                      hover:border-blue-500/30 hover:shadow-blue-500/10
                      ${draggingProjectId === project.id ? 'opacity-50 scale-95 rotate-1' : ''}
                      ${!activeGroup ? 'cursor-grab active:cursor-grabbing' : ''}
                    `}
                  >
                    <div className="relative h-48 overflow-hidden">
                      {project.cardImage ? (
                        <img src={project.cardImage} alt={project.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <img src={project.image} alt={project.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent opacity-60"></div>
                      <div className="absolute top-4 left-4">
                        <div className="px-3 py-1 bg-blue-600/80 backdrop-blur-md border border-white/20 rounded-full shadow-lg">
                          <span className="text-[8px] font-black text-white uppercase tracking-widest">Aktif</span>
                        </div>
                      </div>

                      {/* Drag handle hint (root view only) */}
                      {!activeGroup && (
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-7 h-7 bg-black/40 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10" title="Gruba taşımak için sürükleyin">
                            <svg className="w-3.5 h-3.5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                            </svg>
                          </div>
                        </div>
                      )}

                      <div className="absolute bottom-4 left-4">
                        <span className="text-[9px] font-black text-white/80 uppercase tracking-widest bg-black/40 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/10 italic">
                          Genel Proje
                        </span>
                      </div>
                    </div>

                    <div className="p-8 flex flex-col h-full">
                      <h3 className="text-xl font-black text-white mb-3 tracking-tighter group-hover:text-blue-400 transition-colors italic leading-tight">{project.title}</h3>
                      <p className="text-slate-400 text-xs font-medium leading-relaxed italic line-clamp-2 mb-3 opacity-80">{project.description}</p>

                      {(project.tfsLinki || project.wikiLinki) && (
                        <div className="flex gap-2 mb-3 flex-wrap">
                          {project.tfsLinki && (
                            <a href={project.tfsLinki} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[9px] font-black uppercase tracking-widest hover:bg-orange-500/20 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                              TFS
                            </a>
                          )}
                          {project.wikiLinki && (
                            <a href={project.wikiLinki} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                              Wiki
                            </a>
                          )}
                        </div>
                      )}

                      {(project.birimler || []).length > 0 && (
                        <div className="mb-3 space-y-1">
                          <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Birimler</p>
                          {(project.birimler || []).map((b, i) => (
                            <div key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                              <span className="text-[9px] font-black text-indigo-400">{b.birimTipi}{b.birimAdi ? ` · ${b.birimAdi}` : ''}</span>
                              {b.sorumluKullanici && <span className="text-[8px] font-semibold text-slate-400 italic ml-2 truncate max-w-[80px]">{b.sorumluKullanici}</span>}
                            </div>
                          ))}
                        </div>
                      )}

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
                              <span className="text-[8px] font-black text-blue-400">{notStarted ? 'Başlamadı' : `${pct}%`}</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700" style={{ width: `${pct}%` }} />
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
                        <div className="text-right flex flex-col items-end gap-1">
                          <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Sahip</p>
                          <p className="text-[10px] font-black text-blue-100 italic">{project.owner}</p>
                          {/* In-group badge (inside group view) */}
                          {activeGroup && (
                            <button
                              onClick={e => { e.stopPropagation(); removeProjectFromGroup(project.id, activeGroup.id); }}
                              className="mt-1 text-[8px] font-black text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-2 py-0.5 rounded-lg transition-all"
                            >
                              Gruptan Çıkar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
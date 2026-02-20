
import React, { useState, useEffect } from 'react';
import { User } from '../App';

interface Project {
  id: string;
  title: string;
  description: string;
  owner: string;
  members: string[];
  image?: string;
}

interface ProjectsProps {
  onNavigateToReports: () => void;
  onSelectProject: (id: string, title: string) => void;
  user: User;
}

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
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

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
        const data: Project[] = await response.json();
        const projectsWithImages = (data || []).map((p, idx) => ({
          ...p,
          image: IMAGE_POOL[idx % IMAGE_POOL.length]
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

  useEffect(() => {
    fetchProjects();
  }, [user.accessToken]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
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
          members: [user.username]
        })
      });

      if (response.ok) {
        await fetchProjects();
        setIsModalOpen(false);
        setNewTitle('');
        setNewDescription('');
      }
    } catch (err) {
      console.error('Proje oluşturulamadı:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="mb-10 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight italic">Projelerim</h2>
          <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mt-1 border-l-2 border-blue-600 pl-3">Sorumluluğunuzdaki Kayıtlar</p>
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
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Yeni Proje Ekle</span>
        </button>
      </div>

      {/* Modal / Pop-up */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/70 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#1e293b] border border-white/10 w-full max-w-xl rounded-[3rem] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                <div>
                   <h3 className="text-2xl font-black text-white italic tracking-tight">Proje Tanımlama</h3>
                   <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1">Yeni İnisiyatif Kaydı</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 text-slate-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Proje Başlığı</label>
                  <input 
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Örn: Mobil Kredi Akış Modernizasyonu"
                    className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-6 py-5 text-white font-bold outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Proje Açıklaması</label>
                  <textarea 
                    required
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Projenin temel hedeflerini ve kapsamını kısaca belirtin..."
                    rows={4}
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
                     {isCreating ? 'Oluşturuluyor...' : 'Projeyi Kaydet'}
                   </button>
                </div>
              </form>
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
                <img 
                  src={project.image} 
                  alt={project.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
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
              </div>

              <div className="p-8 flex flex-col h-full">
                <h3 className="text-xl font-black text-white mb-3 tracking-tighter group-hover:text-blue-400 transition-colors italic leading-tight">{project.title}</h3>
                <p className="text-slate-400 text-xs font-medium leading-relaxed italic line-clamp-2 mb-6 opacity-80">{project.description}</p>
                
                <div className="mt-auto pt-5 border-t border-white/5 flex justify-between items-end">
                   <div>
                      <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-2">Proje Sorumluları</p>
                      <div className="flex -space-x-2">
                         {(project.members || [project.owner]).slice(0, 3).map((member, uIdx) => (
                           <div key={uIdx} className="w-8 h-8 rounded-xl bg-slate-800 border-2 border-[#1e293b] flex items-center justify-center text-[9px] font-black text-blue-400 shadow-xl group-hover:border-blue-500/20 transition-all">
                             {member.charAt(0).toUpperCase()}
                           </div>
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

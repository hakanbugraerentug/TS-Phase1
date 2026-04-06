import React, { useState, useEffect } from 'react';
import { Projects } from './Projects';
import { ProjectDetail } from './ProjectDetail';
import { WeeklySummary } from './WeeklySummary';
import { OrgChart } from './OrgChart';
import { Teams } from './Teams';
import { User } from '../App';
import { UserAvatar } from './UserAvatar';
import { HowToUse } from './HowToUse';
import { HomePage } from './HomePage';
import { TfsPage } from './TfsPage';
import { MyReports } from './MyReports';
import { MeetingReport } from './MeetingReport';
import { isElevatedTitle } from '../utils/titleHelpers';
import { UserProfile } from './UserProfile';

const API_BASE = 'http://localhost:8000';

interface DashboardProps {
  onLogout: () => void;
  user: User;
}

const TsMiniLogo = () => (
  <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg border border-white/10">
    <span className="text-white font-black text-xl">Ts</span>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ onLogout, user }) => {
  const [activeTab, setActiveTab] = useState('Anasayfa');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showTfsModal, setShowTfsModal] = useState(false);
  const [selectedProjectTitle, setSelectedProjectTitle] = useState<string>('');
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [profileReturnTab, setProfileReturnTab] = useState<string>('Anasayfa');
  const hasElevatedTitle = isElevatedTitle(user.title ?? '');

  // TFS credential form state
  const [tfsBaseUrl, setTfsBaseUrl] = useState('');
  const [tfsPat, setTfsPat] = useState('');
  const [tfsSaving, setTfsSaving] = useState(false);
  const [tfsSaveError, setTfsSaveError] = useState<string | null>(null);
  const [tfsHasCredentials, setTfsHasCredentials] = useState(false);
  const [tfsConfiguredUrl, setTfsConfiguredUrl] = useState<string | null>(null);

  // Check existing TFS credentials on mount
  useEffect(() => {
    const checkCredentials = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/tfs/credentials/status`, {
          headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTfsHasCredentials(data.hasCredentials ?? false);
          setTfsConfiguredUrl(data.baseUrl ?? null);
        }
      } catch {
        // ignore network errors silently
      }
    };
    checkCredentials();
  }, [user.accessToken]);

  const handleProjectSelect = (id: string, title: string) => {
    setSelectedProjectId(id);
    setSelectedProjectTitle(title);
    setActiveTab('ProjeDetay');
  };

  const handleBackToProjects = () => {
    setSelectedProjectId(null);
    setActiveTab('Projelerim');
  };

  const handleViewProfile = (username: string) => {
    setProfileReturnTab(activeTab);
    setProfileUsername(username);
  };

  const handleBackFromProfile = () => {
    setProfileUsername(null);
    setActiveTab(profileReturnTab);
  };

  const handleTfsSave = async () => {
    if (!tfsBaseUrl.trim() || !tfsPat.trim()) {
      setTfsSaveError('BASE URL ve PAT alanları zorunludur.');
      return;
    }
    setTfsSaving(true);
    setTfsSaveError(null);
    try {
      const res = await fetch(`${API_BASE}/api/tfs/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.accessToken}`,
        },
        body: JSON.stringify({ baseUrl: tfsBaseUrl.trim(), pat: tfsPat.trim() }),
      });
      if (res.ok) {
        setTfsHasCredentials(true);
        setTfsConfiguredUrl(tfsBaseUrl.trim());
        setShowTfsModal(false);
        setTfsPat('');
        setActiveTab('TFS');
      } else {
        const err = await res.json().catch(() => ({ message: 'Bir hata oluştu.' }));
        setTfsSaveError(err.message ?? 'Bir hata oluştu.');
      }
    } catch {
      setTfsSaveError('Sunucuya ulaşılamadı.');
    } finally {
      setTfsSaving(false);
    }
  };

  const menuItems = [
    { id: 'Anasayfa', name: 'Anasayfa', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
    { id: 'Ekipler', name: 'Ekipler', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
    { id: 'Projelerim', name: 'Projelerim', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /> },
    { id: 'Sema', name: 'Organizasyon Şeması', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
    { id: 'Raporlar', name: 'Haftalık Raporlar', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 2v-6m-9 9h12" /> },
    { id: 'Raporlarim', name: 'Raporlarım', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /> },
    { id: 'ToplantıKaydi', name: 'Toplantı Kaydını Raporla', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.277A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /> },
    { id: 'NasilKullanilir', name: 'Nasıl Kullanılır', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.85-1.137.193-1.914.97-1.914 1.914v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 4h.008v.008H12v-.008z" /> },
    ...(tfsHasCredentials ? [{ id: 'TFS', name: 'TFS / Azure DevOps', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /> }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-200">
      <aside className="w-72 bg-[#0f172a] text-white flex flex-col shadow-2xl z-20 sticky top-0 h-screen border-r border-white/5">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <TsMiniLogo />
            <div>
              <h1 className="text-xl font-black tracking-tighter italic leading-none">TeamSync</h1>
              <p className="text-[8px] font-black text-blue-500/60 uppercase tracking-[0.3em] mt-1">Personel Portalı</p>
            </div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSelectedProjectId(null);
                  setProfileUsername(null);
                }}
                className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all duration-300 font-black text-[10px] uppercase tracking-widest border ${
                  activeTab === item.id && item.id === 'NasilKullanilir'
                    ? 'bg-violet-600 border-violet-400/50 shadow-lg text-white'
                    : activeTab === item.id && item.id === 'TFS'
                    ? 'bg-orange-600 border-orange-500/50 shadow-lg text-white'
                    : activeTab === item.id
                    ? 'bg-blue-600 border-blue-500/50 shadow-lg'
                    : item.id === 'NasilKullanilir'
                    ? 'text-violet-400 border-violet-500/20 hover:bg-violet-600/10 hover:text-violet-300'
                    : item.id === 'TFS'
                    ? 'text-orange-400 border-orange-500/20 hover:bg-orange-600/10 hover:text-orange-300'
                    : 'text-slate-500 border-transparent hover:bg-white/5 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {item.icon}
                </svg>
                <span className="truncate">{item.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="px-6 pb-4 flex flex-col gap-3">
          <button
            onClick={() => setShowTfsModal(true)}
            className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest border bg-orange-600/20 border-orange-500/30 text-orange-400 hover:bg-orange-600/30 hover:text-orange-300 transition-all duration-300"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="truncate flex-1">TFS ile Sync Et</span>
            {tfsHasCredentials && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" title="Bağlı" />
            )}
          </button>
        </div>

        <div className="mt-auto p-6 border-t border-white/5 bg-[#020617]/40">
          <div className="flex items-center gap-3 mb-6 px-1 group cursor-pointer" onClick={() => handleViewProfile(user.username)}>
            <UserAvatar username={user.username} displayName={user.name} accessToken={user.accessToken} size="md" />
            <div className="overflow-hidden">
              <p className="text-xs font-black truncate text-slate-200 group-hover:text-blue-300 transition-colors">{user.name}</p>
              <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Aktif Kullanıcı</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-slate-500 hover:text-red-500 font-black text-[9px] transition-all border border-white/5 uppercase tracking-widest"
          >
            Güvenli Çıkış
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="h-20 bg-[#0f172a]/90 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-10 shadow-sm sticky top-0 z-10 flex-shrink-0">
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
            {profileUsername ? `Profil / ${profileUsername}` : activeTab === 'ProjeDetay' ? `Projeler / ${selectedProjectTitle}` : activeTab === 'Sema' ? 'Organizasyon Şeması' : activeTab === 'Ekipler' ? 'Ekipler' : activeTab === 'NasilKullanilir' ? 'Nasıl Kullanılır' : activeTab === 'Anasayfa' ? 'Anasayfa' : activeTab === 'TFS' ? 'TFS / Azure DevOps' : activeTab === 'ToplantıKaydi' ? 'Toplantı Kaydını Raporla' : activeTab}
          </span>
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Yap%C4%B1_Kredi_logo.svg/1024px-Yap%C4%B1_Kredi_logo.svg.png" 
            alt="Yapı Kredi" 
            className="h-5 opacity-80"
          />
        </header>

        <main className="p-10 flex-grow relative overflow-y-auto bg-gradient-to-b from-[#0f172a] to-[#020617] scroll-smooth">
          {profileUsername ? (
            <UserProfile
              username={profileUsername}
              user={user}
              onBack={handleBackFromProfile}
              onViewProfile={handleViewProfile}
            />
          ) : activeTab === 'Anasayfa' ? (
            <HomePage user={user} onNavigateToProjects={() => setActiveTab('Projelerim')} onNavigateToTeams={() => setActiveTab('Ekipler')} isElevatedUser={hasElevatedTitle} />
          ) : activeTab === 'Projelerim' ? (
            <Projects user={user} onNavigateToReports={() => setActiveTab('Raporlar')} onSelectProject={handleProjectSelect} />
          ) : activeTab === 'Raporlar' ? (
            <WeeklySummary user={user} />
          ) : activeTab === 'Ekipler' ? (
            <Teams user={user} onViewProfile={handleViewProfile} />
          ) : activeTab === 'Sema' ? (
            <OrgChart user={user} onViewProfile={handleViewProfile} />
          ) : activeTab === 'ProjeDetay' ? (
            selectedProjectId ? <ProjectDetail projectId={selectedProjectId} projectTitle={selectedProjectTitle} onBack={handleBackToProjects} user={user} /> : null
          ) : activeTab === 'NasilKullanilir' ? (
            <HowToUse user={user} />
          ) : activeTab === 'TFS' ? (
            <TfsPage user={user} />
          ) : activeTab === 'ToplantıKaydi' ? (
            <MeetingReport user={user} />
          ) : null}
        </main>

        <footer className="p-8 border-t border-white/5 flex justify-between items-center text-slate-600 text-[8px] font-black uppercase tracking-[0.3em] flex-shrink-0 bg-[#020617]">
          <div>TeamSync Framework v4.0-S</div>
          <div>Developed by <span className="text-blue-500">Hakan Buğra Erentuğ</span></div>
        </footer>
      </div>

      {showTfsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => { setShowTfsModal(false); setTfsSaveError(null); }}
        >
          <div
            className="bg-[#0f172a] border border-orange-500/30 rounded-2xl p-10 shadow-2xl w-full max-w-md flex flex-col gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <h2 className="text-white font-black text-base tracking-tight">TFS ile Senkronize Et</h2>
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-0.5">
                  Azure DevOps / TFS bağlantısı kur
                </p>
              </div>
            </div>

            {/* Already configured notice */}
            {tfsHasCredentials && tfsConfiguredUrl && (
              <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <div className="min-w-0">
                  <p className="text-emerald-400 text-[9px] font-black uppercase tracking-widest">Bağlantı mevcut</p>
                  <p className="text-slate-400 text-[10px] truncate">{tfsConfiguredUrl}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 block mb-1.5">
                  BASE URL
                </label>
                <input
                  type="url"
                  value={tfsBaseUrl}
                  onChange={e => setTfsBaseUrl(e.target.value)}
                  placeholder="https://dev.azure.com/organizasyon"
                  className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-orange-500/50 focus:bg-slate-900 transition-all placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 block mb-1.5">
                  Personal Access Token (PAT)
                </label>
                <input
                  type="password"
                  value={tfsPat}
                  onChange={e => setTfsPat(e.target.value)}
                  placeholder="••••••••••••••••••••••••••••••••••••••••••"
                  className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-orange-500/50 focus:bg-slate-900 transition-all placeholder:text-slate-600 font-mono"
                />
                <p className="text-slate-600 text-[8px] mt-1.5 ml-1">
                  PAT şifrelenmiş olarak güvenle saklanır.
                </p>
              </div>
            </div>

            {/* Error */}
            {tfsSaveError && (
              <p className="text-red-400 text-[10px] font-black">{tfsSaveError}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowTfsModal(false); setTfsSaveError(null); }}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white font-black text-[9px] uppercase tracking-widest transition-all"
              >
                İptal
              </button>
              <button
                onClick={handleTfsSave}
                disabled={tfsSaving}
                className="flex-1 px-4 py-3 rounded-xl bg-orange-600/20 border border-orange-500/30 text-orange-400 hover:bg-orange-600/30 hover:text-orange-300 font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {tfsSaving ? 'Kaydediliyor...' : 'Bağlan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Projects } from './Projects';
import { ProjectDetail } from './ProjectDetail';
import { WeeklySummary } from './WeeklySummary';
import { OrgChart } from './OrgChart';
import { Teams } from './Teams';
import { User } from '../App';
import { UserAvatar } from './UserAvatar';
import { HowToUse } from './HowToUse';
import { ManagerPanel } from './ManagerPanel';
import { HomePage } from './HomePage';

interface DashboardProps {
  onLogout: () => void;
  user: User;
}

const TsMiniLogo = () => (
  <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg border border-white/10">
    <span className="text-white font-black text-xl">Ts</span>
  </div>
);

function isElevatedTitle(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes('müdür') || t.includes('mudur') || t.includes('manager') ||
    t.includes('direktör') || t.includes('direktor') || t.includes('director') ||
    t.includes('başkan') || t.includes('baskan') || t.includes('head') ||
    t.includes('chief') || t.includes('genel müdür') || t.includes('genel mudur')
  );
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout, user }) => {
  const [activeTab, setActiveTab] = useState('Anasayfa');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showTfsModal, setShowTfsModal] = useState(false);
  const [showSkypeModal, setShowSkypeModal] = useState(false);
  const [selectedProjectTitle, setSelectedProjectTitle] = useState<string>('');
  const [isTeamLeader, setIsTeamLeader] = useState(false);
  const [isRoleChecked, setIsRoleChecked] = useState(false);
  const [isDelegated, setIsDelegated] = useState(false);

  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  useEffect(() => {
    const checkTeamLeadership = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/teams`, {
          headers: { Authorization: `Bearer ${user.accessToken}` }
        });
        if (res.ok) {
          const teams: { leader: string }[] = await res.json();
          setIsTeamLeader(teams.some(t => t.leader === user.username));
        }
      } catch {
        // ignore errors; isTeamLeader stays false
      } finally {
        setIsRoleChecked(true);
      }
    };
    const checkDelegation = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/delegations/to-me`, {
          headers: { Authorization: `Bearer ${user.accessToken}` }
        });
        if (res.ok) {
          const delegations: unknown[] = await res.json();
          setIsDelegated(delegations.length > 0);
        }
      } catch {
        // ignore; isDelegated stays false
      }
    };
    checkTeamLeadership();
    checkDelegation();
  }, [user.username, user.accessToken, apiUrl]);

  // Users with elevated titles (Manager/Director/etc.) are identified synchronously from the JWT.
  // Team leadership requires an async API check; hide the tab until the check completes
  // to avoid a flicker for users who are team leaders but have no elevated title.
  const hasElevatedTitle = isElevatedTitle(user.title ?? '');
  const canSeeReports = hasElevatedTitle || (isRoleChecked && isTeamLeader);
  const canSeeManagerPanel = hasElevatedTitle || isDelegated;

  const handleProjectSelect = (id: string, title: string) => {
    setSelectedProjectId(id);
    setSelectedProjectTitle(title);
    setActiveTab('ProjeDetay');
  };

  const handleBackToProjects = () => {
    setSelectedProjectId(null);
    setActiveTab('Projelerim');
  };

  const menuItems = [
    { id: 'Anasayfa', name: 'Anasayfa', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
    { id: 'Projelerim', name: 'Projelerim', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /> },
    ...(canSeeReports ? [{ id: 'Raporlar', name: 'Haftalık Raporlar', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 2v-6m-9 9h12" /> }] : []),
    { id: 'Ekipler', name: 'Ekipler', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
    { id: 'Sema', name: 'Organizasyon Şeması', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
    { id: 'NasilKullanilir', name: 'Nasıl Kullanılır', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.85-1.137.193-1.914.97-1.914 1.914v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 4h.008v.008H12v-.008z" /> },
    ...(canSeeManagerPanel ? [{ id: 'YoneticPanel', name: 'Yönetici Paneli', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2z" /> }] : []),
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
                }}
                className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all duration-300 font-black text-[10px] uppercase tracking-widest border ${
                  activeTab === item.id && item.id === 'NasilKullanilir'
                    ? 'bg-violet-600 border-violet-400/50 shadow-lg text-white'
                    : activeTab === item.id
                    ? 'bg-blue-600 border-blue-500/50 shadow-lg'
                    : item.id === 'NasilKullanilir'
                    ? 'text-violet-400 border-violet-500/20 hover:bg-violet-600/10 hover:text-violet-300'
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
            <span className="truncate">TFS ile Sync Et</span>
          </button>
          <button
            onClick={() => setShowSkypeModal(true)}
            className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest border bg-[#00AFF0]/20 border-[#00AFF0]/30 text-[#00AFF0] hover:bg-[#00AFF0]/30 hover:text-[#33BFFF] transition-all duration-300"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.072 2.048C6.476 2.048 2 6.524 2 12.12a10.026 10.026 0 0 0 2.082 6.08 3.96 3.96 0 0 1-.346 1.742c-.017.07-.03.14-.035.208-.012.094-.021.19-.021.288 0 .95.662 1.682 1.678 1.682a1.72 1.72 0 0 0 .79-.197l.06-.03a4.13 4.13 0 0 1 1.55-.33c.323 0 .648.05.966.15A10.037 10.037 0 0 0 12 22.144c5.596 0 10.072-4.476 10.072-10.072S17.668 2.048 12.072 2.048zm3.44 13.667c-.497.708-1.214 1.254-2.15 1.637-.937.383-2.02.575-3.253.575-1.467 0-2.7-.246-3.697-.738a5.066 5.066 0 0 1-1.58-1.262 2.58 2.58 0 0 1-.642-1.658c0-.474.176-.882.527-1.222.351-.34.8-.51 1.346-.51.443 0 .826.108 1.149.323.323.215.598.53.825.945.255.453.533.835.835 1.146.302.311.675.563 1.12.756.444.193.99.289 1.638.289.93 0 1.685-.2 2.267-.6.582-.4.873-.886.873-1.458 0-.462-.145-.837-.436-1.124-.29-.288-.69-.52-1.2-.697-.509-.177-1.2-.349-2.073-.516-1.17-.215-2.156-.485-2.958-.81-.802-.325-1.427-.776-1.876-1.352-.448-.576-.673-1.286-.673-2.13 0-.805.234-1.51.7-2.116.467-.605 1.135-1.07 2.006-1.394.87-.324 1.892-.487 3.063-.487.935 0 1.748.113 2.438.338.69.225 1.265.524 1.724.898.46.374.8.771 1.02 1.193.22.421.33.843.33 1.265 0 .466-.17.872-.508 1.218-.339.346-.77.52-1.293.52-.468 0-.838-.115-1.11-.344-.272-.23-.537-.584-.794-1.063-.227-.44-.502-.8-.826-1.08-.324-.28-.787-.42-1.39-.42-.808 0-1.458.174-1.95.52-.491.347-.737.762-.737 1.245 0 .3.085.557.254.77.17.213.425.401.766.563.341.163.851.327 1.53.493l.72.166c1.048.236 1.948.496 2.7.78.752.284 1.378.626 1.876 1.025.498.4.87.87 1.117 1.41.247.54.37 1.163.37 1.87 0 .87-.249 1.627-.746 2.335z" />
            </svg>
            <span className="truncate">Skype Toplantılarını Raporlaştır</span>
          </button>
        </div>

        <div className="mt-auto p-6 border-t border-white/5 bg-[#020617]/40">
          <div className="flex items-center gap-3 mb-6 px-1 group cursor-pointer">
            <UserAvatar username={user.username} displayName={user.name} accessToken={user.accessToken} size="md" />
            <div className="overflow-hidden">
              <p className="text-xs font-black truncate text-slate-200">{user.name}</p>
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
            {activeTab === 'ProjeDetay' ? `Projeler / ${selectedProjectTitle}` : activeTab === 'Sema' ? 'Organizasyon Şeması' : activeTab === 'Ekipler' ? 'Ekipler' : activeTab === 'NasilKullanilir' ? 'Nasıl Kullanılır' : activeTab === 'YoneticPanel' ? 'Yönetici Paneli' : activeTab === 'Anasayfa' ? 'Anasayfa' : activeTab}
          </span>
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Yap%C4%B1_Kredi_logo.svg/1024px-Yap%C4%B1_Kredi_logo.svg.png" 
            alt="Yapı Kredi" 
            className="h-5 opacity-80"
          />
        </header>

        <main className="p-10 flex-grow relative overflow-y-auto bg-gradient-to-b from-[#0f172a] to-[#020617] scroll-smooth">
          {activeTab === 'Anasayfa' ? (
            <HomePage user={user} onNavigateToProjects={() => setActiveTab('Projelerim')} onNavigateToTeams={() => setActiveTab('Ekipler')} />
          ) : activeTab === 'Projelerim' ? (
            <Projects user={user} onNavigateToReports={() => setActiveTab('Raporlar')} onSelectProject={handleProjectSelect} />
          ) : activeTab === 'Raporlar' ? (
            <WeeklySummary user={user} />
          ) : activeTab === 'Ekipler' ? (
            <Teams user={user} />
          ) : activeTab === 'Sema' ? (
            <OrgChart user={user} />
          ) : activeTab === 'ProjeDetay' ? (
            selectedProjectId ? <ProjectDetail projectId={selectedProjectId} projectTitle={selectedProjectTitle} onBack={handleBackToProjects} user={user} /> : null
          ) : activeTab === 'NasilKullanilir' ? (
            <HowToUse user={user} />
          ) : activeTab === 'YoneticPanel' ? (
            <ManagerPanel user={user} />
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
          onClick={() => setShowTfsModal(false)}
        >
          <div
            className="bg-[#0f172a] border border-orange-500/30 rounded-2xl p-10 shadow-2xl flex flex-col items-center gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-slate-200 font-black text-lg tracking-wide">Çok Yakında Gelecek</p>
            <button
              onClick={() => setShowTfsModal(false)}
              className="px-8 py-2.5 rounded-xl bg-orange-600/20 border border-orange-500/30 text-orange-400 hover:bg-orange-600/30 hover:text-orange-300 font-black text-[10px] uppercase tracking-widest transition-all duration-300"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {showSkypeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowSkypeModal(false)}
        >
          <div
            className="bg-[#0f172a] border border-[#00AFF0]/30 rounded-2xl p-10 shadow-2xl flex flex-col items-center gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-[#00AFF0]/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#00AFF0]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.072 2.048C6.476 2.048 2 6.524 2 12.12a10.026 10.026 0 0 0 2.082 6.08 3.96 3.96 0 0 1-.346 1.742c-.017.07-.03.14-.035.208-.012.094-.021.19-.021.288 0 .95.662 1.682 1.678 1.682a1.72 1.72 0 0 0 .79-.197l.06-.03a4.13 4.13 0 0 1 1.55-.33c.323 0 .648.05.966.15A10.037 10.037 0 0 0 12 22.144c5.596 0 10.072-4.476 10.072-10.072S17.668 2.048 12.072 2.048zm3.44 13.667c-.497.708-1.214 1.254-2.15 1.637-.937.383-2.02.575-3.253.575-1.467 0-2.7-.246-3.697-.738a5.066 5.066 0 0 1-1.58-1.262 2.58 2.58 0 0 1-.642-1.658c0-.474.176-.882.527-1.222.351-.34.8-.51 1.346-.51.443 0 .826.108 1.149.323.323.215.598.53.825.945.255.453.533.835.835 1.146.302.311.675.563 1.12.756.444.193.99.289 1.638.289.93 0 1.685-.2 2.267-.6.582-.4.873-.886.873-1.458 0-.462-.145-.837-.436-1.124-.29-.288-.69-.52-1.2-.697-.509-.177-1.2-.349-2.073-.516-1.17-.215-2.156-.485-2.958-.81-.802-.325-1.427-.776-1.876-1.352-.448-.576-.673-1.286-.673-2.13 0-.805.234-1.51.7-2.116.467-.605 1.135-1.07 2.006-1.394.87-.324 1.892-.487 3.063-.487.935 0 1.748.113 2.438.338.69.225 1.265.524 1.724.898.46.374.8.771 1.02 1.193.22.421.33.843.33 1.265 0 .466-.17.872-.508 1.218-.339.346-.77.52-1.293.52-.468 0-.838-.115-1.11-.344-.272-.23-.537-.584-.794-1.063-.227-.44-.502-.8-.826-1.08-.324-.28-.787-.42-1.39-.42-.808 0-1.458.174-1.95.52-.491.347-.737.762-.737 1.245 0 .3.085.557.254.77.17.213.425.401.766.563.341.163.851.327 1.53.493l.72.166c1.048.236 1.948.496 2.7.78.752.284 1.378.626 1.876 1.025.498.4.87.87 1.117 1.41.247.54.37 1.163.37 1.87 0 .87-.249 1.627-.746 2.335z" />
              </svg>
            </div>
            <p className="text-slate-200 font-black text-lg tracking-wide">Çok Yakında</p>
            <button
              onClick={() => setShowSkypeModal(false)}
              className="px-8 py-2.5 rounded-xl bg-[#00AFF0]/20 border border-[#00AFF0]/30 text-[#00AFF0] hover:bg-[#00AFF0]/30 hover:text-[#33BFFF] font-black text-[10px] uppercase tracking-widest transition-all duration-300"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

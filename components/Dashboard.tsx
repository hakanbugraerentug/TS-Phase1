
import React, { useState } from 'react';
import { Projects } from './Projects';
import { ProjectDetail } from './ProjectDetail';
import { WeeklySummary } from './WeeklySummary';
import { OrgChart } from './OrgChart';
import { User } from '../App';

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
  const [activeTab, setActiveTab] = useState('Projelerim');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectTitle, setSelectedProjectTitle] = useState<string>('');

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
    { id: 'Projelerim', name: 'Projelerim', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /> },
    { id: 'Raporlar', name: 'Haftalık Raporlar', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 2v-6m-9 9h12" /> },
    { id: 'Sema', name: 'Organizasyon Şeması', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
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
                  activeTab === item.id 
                    ? 'bg-blue-600 border-blue-50 shadow-lg'
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

        <div className="mt-auto p-6 border-t border-white/5 bg-[#020617]/40">
          <div className="flex items-center gap-3 mb-6 px-1 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center font-black text-blue-400">
               {user.name.charAt(0)}
            </div>
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
            {activeTab === 'ProjeDetay' ? `Projeler / ${selectedProjectTitle}` : activeTab === 'Sema' ? 'Organizasyon Şeması' : activeTab}
          </span>
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Yap%C4%B1_Kredi_logo.svg/1024px-Yap%C4%B1_Kredi_logo.svg.png" 
            alt="Yapı Kredi" 
            className="h-5 opacity-80"
          />
        </header>

        <main className="p-10 flex-grow relative overflow-y-auto bg-gradient-to-b from-[#0f172a] to-[#020617] scroll-smooth">
          {activeTab === 'Projelerim' ? (
            <Projects userRole={user.role} onNavigateToReports={() => setActiveTab('Raporlar')} onSelectProject={handleProjectSelect} />
          ) : activeTab === 'Raporlar' ? (
            <WeeklySummary user={user} />
          ) : activeTab === 'Sema' ? (
            <OrgChart />
          ) : activeTab === 'ProjeDetay' ? (
            selectedProjectId ? <ProjectDetail projectId={selectedProjectId} projectTitle={selectedProjectTitle} onBack={handleBackToProjects} user={user} /> : null
          ) : null}
        </main>

        <footer className="p-8 border-t border-white/5 flex justify-between items-center text-slate-600 text-[8px] font-black uppercase tracking-[0.3em] flex-shrink-0 bg-[#020617]">
          <div>TeamSync Framework v4.0-S</div>
          <div>Developed by <span className="text-blue-500">Hakan Buğra Erentuğ</span></div>
        </footer>
      </div>
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { User } from '../App';

interface OrgChartNode {
  username: string;
  fullName: string;
  title: string;
  department: string;
  distinguishedName: string;
  isActiveUser: boolean;
  manager?: OrgChartNode;
  siblings: OrgChartNode[];
}

// Manager zincirini düz diziye çevirir (tepeden aşağıya)
function flattenManagerChain(node: OrgChartNode): OrgChartNode[] {
  const chain: OrgChartNode[] = [];
  let current: OrgChartNode | undefined = node.manager;
  while (current) {
    chain.unshift(current); // en üstten başla
    current = current.manager;
  }
  return chain;
}

const OrgNode: React.FC<{
  node: OrgChartNode;
  isActive?: boolean;
}> = ({ node, isActive }) => (
  <div className={`
    w-64 p-5 rounded-[2rem] border transition-all duration-500 cursor-default
    ${isActive
      ? 'bg-blue-600 border-blue-400 shadow-[0_0_40px_-10px_rgba(37,99,235,0.6)] scale-110 z-10'
      : 'bg-[#1e293b]/60 backdrop-blur-xl border-white/5 hover:border-blue-500/30 shadow-2xl'
    }
  `}>
    <div className="flex items-center gap-4">
      <div className={`
        w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border flex-shrink-0
        ${isActive ? 'bg-white text-blue-600 border-white' : 'bg-slate-800 text-blue-400 border-white/10'}
      `}>
        {node.fullName ? node.fullName.charAt(0) : '?'}
      </div>
      <div className="overflow-hidden">
        <h4 className={`font-black italic text-sm tracking-tight truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
          {node.fullName || node.username}
        </h4>
        <p className={`text-[8px] font-black uppercase tracking-widest truncate ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
          {node.title || '—'}
        </p>
        {node.department && (
          <p className={`text-[7px] font-bold tracking-wide mt-0.5 truncate ${isActive ? 'text-blue-200' : 'text-slate-600'}`}>
            {node.department}
          </p>
        )}
      </div>
    </div>
  </div>
);

export const OrgChart: React.FC<{ user: User }> = ({ user }) => {
  const [orgData, setOrgData] = useState<OrgChartNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(0.8);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOrgChart = async () => {
      try {
        setLoading(true);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/users/${user.username}/org-chart`, {
          headers: { Authorization: `Bearer ${user.accessToken}` }
        });
        if (!response.ok) throw new Error('Organizasyon şeması yüklenemedi');
        const data = await response.json();
        setOrgData(data);
      } catch (err: any) {
        setError(err.message || 'Bilinmeyen hata');
      } finally {
        setLoading(false);
      }
    };
    fetchOrgChart();
  }, [user.username, user.accessToken]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale(prev => Math.min(Math.max(prev + delta, 0.3), 2));
    }
  };
  const resetView = () => { setScale(0.8); setPosition({ x: 0, y: 0 }); };

  // Loading
  if (loading) return (
    <div className="w-full h-[calc(100vh-180px)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Organizasyon Şeması Yükleniyor</p>
      </div>
    </div>
  );

  // Error
  if (error) return (
    <div className="w-full h-[calc(100vh-180px)] flex items-center justify-center">
      <div className="bg-red-500/10 border border-red-500/30 rounded-[2rem] p-8 text-center">
        <p className="text-red-400 font-black text-sm italic">{error}</p>
        <p className="text-slate-500 text-[9px] uppercase tracking-widest mt-2">Lütfen tekrar deneyin</p>
      </div>
    </div>
  );

  // No data
  if (!orgData) return (
    <div className="w-full h-[calc(100vh-180px)] flex items-center justify-center opacity-20">
      <p className="text-[10px] font-black uppercase tracking-widest">Veri bulunamadı</p>
    </div>
  );

  const managerChain = flattenManagerChain(orgData);

  return (
    <div
      className="relative w-full h-[calc(100vh-180px)] overflow-hidden rounded-[3rem] bg-[#0f172a]/20 border border-white/5 cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      ref={containerRef}
    >
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Chart Canvas */}
      <div
        className="absolute inset-0 flex flex-col items-center pt-16 origin-center"
        style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
      >
        <div className="flex flex-col items-center gap-0">
          {/* Manager zinciri — tepeden aşağıya */}
          {managerChain.map((mgr, idx) => (
            <div key={mgr.username || idx} className="flex flex-col items-center">
              <OrgNode node={mgr} isActive={false} />
              <div className="w-px h-10 bg-gradient-to-b from-blue-500 to-blue-500/50" />
            </div>
          ))}

          {/* Aktif kullanıcı + sibling'ler yatay */}
          <div className="relative flex flex-col items-center">
            {/* Yatay çizgi — sibling'ler varsa */}
            {orgData.siblings.length > 0 && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
            )}

            <div className="flex items-start gap-8 mt-0">
              {/* Sol sibling'ler */}
              {orgData.siblings.slice(0, Math.ceil(orgData.siblings.length / 2)).map((sib, idx) => (
                <div key={sib.username || idx} className="flex flex-col items-center pt-6">
                  <div className="w-px h-6 bg-blue-500/40 mb-0" />
                  <OrgNode node={sib} isActive={false} />
                </div>
              ))}

              {/* Aktif kullanıcı */}
              <div className="flex flex-col items-center pt-2">
                <OrgNode node={orgData} isActive={true} />
              </div>

              {/* Sağ sibling'ler */}
              {orgData.siblings.slice(Math.ceil(orgData.siblings.length / 2)).map((sib, idx) => (
                <div key={sib.username || idx} className="flex flex-col items-center pt-6">
                  <div className="w-px h-6 bg-blue-500/40 mb-0" />
                  <OrgNode node={sib} isActive={false} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-10 right-10 flex flex-col gap-3 z-[200]">
        <div className="bg-[#1e293b]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex flex-col gap-2 shadow-2xl">
          <button onClick={() => setScale(prev => Math.min(prev + 0.1, 2))}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-blue-600 rounded-xl text-white transition-all shadow-lg border border-white/5"
            title="Yakınlaştır">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          </button>
          <button onClick={() => setScale(prev => Math.max(prev - 0.1, 0.3))}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-blue-600 rounded-xl text-white transition-all shadow-lg border border-white/5"
            title="Uzaklaştır">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
          </button>
          <div className="h-px bg-white/10 mx-2" />
          <button onClick={resetView}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-blue-600 rounded-xl text-white transition-all shadow-lg border border-white/5"
            title="Görünümü Sıfırla">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
        <div className="bg-blue-600/20 backdrop-blur-md border border-blue-500/30 rounded-xl px-4 py-2 text-center shadow-lg">
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">% {Math.round(scale * 100)}</span>
        </div>
      </div>

      {/* Guide Note */}
      <div className="absolute top-6 left-6 pointer-events-none">
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11" /></svg>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sürükle ve Gezin / Ctrl + Scroll Yakınlaştır</span>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useRef, useEffect } from 'react';

interface NodeData {
  name: string;
  role: string;
  isMain?: boolean;
}

const ORG_DATA = {
  activeUser: { distinguishedName: "Hakan", manager: "Serhat" },
  parents: [
    { distinguishedName: "Serhat", manager: "Hasan", level: 0, role: "Bölüm Müdürü" },
    { distinguishedName: "Hasan", manager: "Bora", level: 1, role: "Direktör" },
    { distinguishedName: "Bora", manager: "Ahmet", level: 2, role: "Genel Müdür Yardımcısı" }
  ],
  siblings: [
    { distinguishedName: "Berkcan", manager: "Serhat", role: "Kıdemli Yazılım Geliştirici" },
    { distinguishedName: "Beyza", manager: "Serhat", role: "UX Tasarımcısı" }
  ],
  topManager: { distinguishedName: "Ahmet", role: "Genel Müdür" }
};

const OrgNode: React.FC<{ name: string; role: string; isActive?: boolean; isSecondary?: boolean }> = ({ name, role, isActive, isSecondary }) => (
  <div className={`relative flex flex-col items-center group`}>
    {/* Bağlantı Çizgisi (Üst) */}
    {!isActive && !isSecondary && name !== ORG_DATA.topManager.distinguishedName && (
      <div className="absolute -top-10 w-px h-10 bg-gradient-to-b from-blue-500/50 to-blue-500"></div>
    )}
    
    <div className={`
      w-64 p-5 rounded-[2rem] border transition-all duration-500
      ${isActive 
        ? 'bg-blue-600 border-blue-400 shadow-[0_0_40px_-10px_rgba(37,99,235,0.6)] scale-110 z-10' 
        : 'bg-[#1e293b]/60 backdrop-blur-xl border-white/5 hover:border-blue-500/30 shadow-2xl'
      }
    `}>
      <div className="flex items-center gap-4">
        <div className={`
          w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border
          ${isActive ? 'bg-white text-blue-600 border-white' : 'bg-slate-800 text-blue-400 border-white/10'}
        `}>
          {name.charAt(0)}
        </div>
        <div>
          <h4 className={`font-black italic text-sm tracking-tight ${isActive ? 'text-white' : 'text-slate-200'}`}>
            {name}
          </h4>
          <p className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
            {role}
          </p>
        </div>
      </div>
    </div>

    {/* Bağlantı Çizgisi (Alt) */}
    {name !== "Hakan" && !isSecondary && (
       <div className="w-px h-10 bg-gradient-to-b from-blue-500 to-blue-500/50"></div>
    )}
  </div>
);

export const OrgChart: React.FC = () => {
  const [scale, setScale] = useState(0.8);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const hierarchy = [
    { name: ORG_DATA.topManager.distinguishedName, role: ORG_DATA.topManager.role },
    { name: ORG_DATA.parents[2].distinguishedName, role: ORG_DATA.parents[2].role },
    { name: ORG_DATA.parents[1].distinguishedName, role: ORG_DATA.parents[1].role },
    { name: ORG_DATA.parents[0].distinguishedName, role: ORG_DATA.parents[0].role },
  ];

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Sadece sol tık
    setIsDragging(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale(prev => Math.min(Math.max(prev + delta, 0.3), 2));
    }
  };

  const resetView = () => {
    setScale(0.8);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-[calc(100vh-180px)] overflow-hidden rounded-[3rem] bg-[#0f172a]/20 border border-white/5 cursor-grab active:cursor-grabbing select-none"
         onMouseDown={handleMouseDown}
         onMouseMove={handleMouseMove}
         onMouseUp={handleMouseUp}
         onMouseLeave={handleMouseUp}
         onWheel={handleWheel}
         ref={containerRef}>
      
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ 
             backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', 
             backgroundSize: '40px 40px',
             transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)` 
           }}></div>

      {/* Main Chart Canvas */}
      <div 
        className="absolute inset-0 flex flex-col items-center pt-20 transition-transform duration-75 ease-out origin-center"
        style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
      >
        <div className="flex flex-col items-center">
            {/* Üst Yönetim Hattı */}
            {hierarchy.map((person) => (
              <OrgNode key={person.name} name={person.name} role={person.role} />
            ))}

            {/* Alt Ekip (Siblings + Active User) */}
            <div className="relative pt-10 flex flex-col items-center w-full">
               <div className="absolute top-0 w-[80%] h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
               
               <div className="flex flex-wrap justify-center gap-10 mt-10">
                  <div className="flex flex-col items-center">
                    <div className="absolute -top-10 w-px h-10 bg-blue-500"></div>
                    <OrgNode name="Hakan" role="Yazılım Geliştirme Uzmanı" isActive={true} />
                  </div>

                  {ORG_DATA.siblings.map(sib => (
                    <div key={sib.distinguishedName} className="flex flex-col items-center">
                      <div className="absolute -top-10 w-px h-10 bg-blue-500/50"></div>
                      <OrgNode name={sib.distinguishedName} role={sib.role} isSecondary={true} />
                    </div>
                  ))}
               </div>
            </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="absolute bottom-10 right-10 flex flex-col gap-3 z-[200]">
        <div className="bg-[#1e293b]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex flex-col gap-2 shadow-2xl">
          <button 
            onClick={() => setScale(prev => Math.min(prev + 0.1, 2))}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-blue-600 rounded-xl text-white transition-all shadow-lg border border-white/5"
            title="Yakınlaştır"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          </button>
          
          <button 
            onClick={() => setScale(prev => Math.max(prev - 0.1, 0.3))}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-blue-600 rounded-xl text-white transition-all shadow-lg border border-white/5"
            title="Uzaklaştır"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
          </button>
          
          <div className="h-px bg-white/10 mx-2"></div>
          
          <button 
            onClick={resetView}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-blue-600 rounded-xl text-white transition-all shadow-lg border border-white/5"
            title="Görünümü Sıfırla"
          >
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

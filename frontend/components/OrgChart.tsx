
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User } from '../App';
import { UserAvatar } from './UserAvatar';

interface OrgUser {
  username: string;
  fullName: string;
  title: string;
  department: string;
  sector: string;
  directorate: string;
  distinguishedName: string;
  manager: string;
}

interface NodePosition {
  x: number;
  y: number;
}

const OU_W = 220;
const OU_H = 80;
const USER_W = 180;
const USER_H = 90;

function getOUName(u: OrgUser): string {
  return u.department || u.sector || u.directorate || 'Diğer';
}

export const OrgChart: React.FC<{ user: User }> = ({ user }) => {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOUs, setExpandedOUs] = useState<Set<string>>(new Set());
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = useState(0.8);

  // All drag/pan state kept in a ref to avoid re-renders during drag
  const activeRef = useRef<{
    kind: 'node' | 'pan';
    nodeId?: string;
    startMX: number;
    startMY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Add non-passive wheel listener so we can preventDefault and prevent page scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setCanvasScale(s => Math.min(Math.max(s + delta, 0.3), 2.0));
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/api/users/all-org`, {
          headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        if (!res.ok) throw new Error('Kullanıcılar yüklenemedi');
        const data: OrgUser[] = await res.json();
        setUsers(data);

        // Build initial positions
        const ouMap = new Map<string, OrgUser[]>();
        data.forEach(u => {
          const n = getOUName(u);
          if (!ouMap.has(n)) ouMap.set(n, []);
          ouMap.get(n)!.push(u);
        });

        const positions: Record<string, NodePosition> = {};
        Array.from(ouMap.entries()).forEach(([ouName, ouUsers], idx) => {
          const col = idx % 3;
          const row = Math.floor(idx / 3);
          const ox = 100 + col * 260;
          const oy = 100 + row * 300;
          positions[`ou:${ouName}`] = { x: ox, y: oy };
          ouUsers.forEach((u, i) => {
            positions[`user:${u.username}`] = {
              x: ox + 10,
              y: oy + OU_H + 20 + i * (USER_H + 20),
            };
          });
        });
        setNodePositions(positions);
      } catch (e: any) {
        setError(e.message || 'Hata');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.accessToken]);

  const ouMap = useMemo(() => {
    const m = new Map<string, OrgUser[]>();
    users.forEach(u => {
      const n = getOUName(u);
      if (!m.has(n)) m.set(n, []);
      m.get(n)!.push(u);
    });
    return m;
  }, [users]);

  const dnToUser = useMemo(() => {
    const m = new Map<string, OrgUser>();
    users.forEach(u => { if (u.distinguishedName) m.set(u.distinguishedName, u); });
    return m;
  }, [users]);

  const arrows = useMemo(() => {
    const result: { key: string; d: string }[] = [];
    users.forEach(u => {
      if (!u.manager) return;
      const mgr = dnToUser.get(u.manager);
      if (!mgr) return;
      const userOU = getOUName(u);
      const mgrOU = getOUName(mgr);
      if (!expandedOUs.has(userOU) || !expandedOUs.has(mgrOU)) return;
      const fp = nodePositions[`user:${mgr.username}`];
      const tp = nodePositions[`user:${u.username}`];
      if (!fp || !tp) return;
      const x1 = fp.x + USER_W / 2;
      const y1 = fp.y + USER_H;
      const x2 = tp.x + USER_W / 2;
      const y2 = tp.y;
      result.push({
        key: `${mgr.username}->${u.username}`,
        d: `M ${x1},${y1} C ${x1},${y1 + 60} ${x2},${y2 - 60} ${x2},${y2}`,
      });
    });
    return result;
  }, [users, dnToUser, expandedOUs, nodePositions]);

  const onContainerMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    activeRef.current = {
      kind: 'pan',
      startMX: e.clientX,
      startMY: e.clientY,
      startX: canvasOffset.x,
      startY: canvasOffset.y,
      moved: false,
    };
    if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
  };

  const onNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const pos = nodePositions[nodeId] || { x: 0, y: 0 };
    activeRef.current = {
      kind: 'node',
      nodeId,
      startMX: e.clientX,
      startMY: e.clientY,
      startX: pos.x,
      startY: pos.y,
      moved: false,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const a = activeRef.current;
    if (!a) return;
    const dx = e.clientX - a.startMX;
    const dy = e.clientY - a.startMY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      a.moved = true;
    }
    if (!a.moved) return;
    if (a.kind === 'pan') {
      setCanvasOffset({ x: a.startX + dx, y: a.startY + dy });
    } else if (a.kind === 'node' && a.nodeId) {
      setNodePositions(prev => ({
        ...prev,
        [a.nodeId!]: {
          x: a.startX + dx / canvasScale,
          y: a.startY + dy / canvasScale,
        },
      }));
    }
  };

  const onMouseUp = () => {
    const a = activeRef.current;
    if (a && !a.moved && a.kind === 'node' && a.nodeId?.startsWith('ou:')) {
      const ouName = a.nodeId.slice(3);
      setExpandedOUs(prev => {
        const n = new Set(prev);
        if (n.has(ouName)) n.delete(ouName);
        else n.add(ouName);
        return n;
      });
    }
    activeRef.current = null;
    if (containerRef.current) containerRef.current.style.cursor = 'grab';
  };

  if (loading) return (
    <div className="w-full h-[calc(100vh-180px)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Organizasyon Şeması Yükleniyor</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="w-full h-[calc(100vh-180px)] flex items-center justify-center">
      <div className="bg-red-500/10 border border-red-500/30 rounded-[2rem] p-8 text-center">
        <p className="text-red-400 font-black text-sm italic">{error}</p>
        <p className="text-slate-500 text-[9px] uppercase tracking-widest mt-2">Lütfen tekrar deneyin</p>
      </div>
    </div>
  );

  const ouNames = Array.from(ouMap.keys());

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-180px)] overflow-hidden rounded-[3rem] bg-[#0f172a]/20 border border-white/5 select-none cursor-grab"
      onMouseDown={onContainerMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Background Grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Canvas */}
      <div
        className="absolute"
        style={{
          transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})`,
          transformOrigin: '0 0',
          width: '10000px',
          height: '10000px',
        }}
      >
        {/* SVG arrow layer */}
        <svg
          className="absolute inset-0 pointer-events-none overflow-visible"
          width="10000"
          height="10000"
        >
          <defs>
            <marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
            </marker>
          </defs>
          {arrows.map(a => (
            <path
              key={a.key}
              d={a.d}
              stroke="#3b82f6"
              strokeWidth="1.5"
              fill="none"
              markerEnd="url(#arr)"
            />
          ))}
        </svg>

        {/* OU nodes and person nodes */}
        {ouNames.map(ouName => {
          const ouKey = `ou:${ouName}`;
          const pos = nodePositions[ouKey] || { x: 0, y: 0 };
          const ouUsers = ouMap.get(ouName) || [];
          const isExpanded = expandedOUs.has(ouName);

          return (
            <React.Fragment key={ouKey}>
              {/* OU Node */}
              <div
                className="absolute bg-[#1e293b] border-2 border-blue-500/60 rounded-2xl cursor-move flex items-center justify-between px-4 hover:border-blue-400 transition-colors"
                style={{ left: pos.x, top: pos.y, width: OU_W, height: OU_H, zIndex: 10 }}
                onMouseDown={(e) => onNodeMouseDown(e, ouKey)}
              >
                <div className="overflow-hidden pointer-events-none">
                  <p className="text-white font-black text-sm italic truncate">{ouName}</p>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    {ouUsers.length} kişi
                  </p>
                </div>
                <div
                  className={`w-6 h-6 flex items-center justify-center text-blue-400 flex-shrink-0 transition-transform pointer-events-none ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Person nodes (when expanded) */}
              {isExpanded && ouUsers.map(u => {
                const userKey = `user:${u.username}`;
                const uPos = nodePositions[userKey] || {
                  x: pos.x + 10,
                  y: pos.y + OU_H + 20,
                };
                return (
                  <div
                    key={userKey}
                    className="absolute bg-[#0f172a] border border-slate-700 rounded-xl cursor-move hover:border-slate-500 transition-colors"
                    style={{ left: uPos.x, top: uPos.y, width: USER_W, height: USER_H, zIndex: 20 }}
                    onMouseDown={(e) => onNodeMouseDown(e, userKey)}
                  >
                    <div className="flex items-center gap-2 p-3 h-full pointer-events-none">
                      <UserAvatar
                        username={u.username}
                        displayName={u.fullName || u.username}
                        accessToken={user.accessToken}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <div className="overflow-hidden flex-1">
                        <p className="text-slate-200 font-black text-xs italic truncate">
                          {u.fullName || u.username}
                        </p>
                        <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest truncate">
                          {u.title || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-10 right-10 flex flex-col gap-3 z-[200]">
        <div className="bg-[#1e293b]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex flex-col gap-2 shadow-2xl">
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setCanvasScale(s => Math.min(s + 0.1, 2.0))}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-blue-600 rounded-xl text-white transition-all shadow-lg border border-white/5"
            title="Yakınlaştır"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setCanvasScale(s => Math.max(s - 0.1, 0.3))}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-blue-600 rounded-xl text-white transition-all shadow-lg border border-white/5"
            title="Uzaklaştır"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
            </svg>
          </button>
          <div className="h-px bg-white/10 mx-2" />
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => { setCanvasScale(0.8); setCanvasOffset({ x: 0, y: 0 }); }}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-blue-600 rounded-xl text-white transition-all shadow-lg border border-white/5"
            title="Görünümü Sıfırla"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <div className="bg-blue-600/20 backdrop-blur-md border border-blue-500/30 rounded-xl px-4 py-2 text-center shadow-lg">
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
            % {Math.round(canvasScale * 100)}
          </span>
        </div>
      </div>

      {/* Guide Note */}
      <div className="absolute top-6 left-6 pointer-events-none">
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11" />
          </svg>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
            Sürükle ve Gezin / Scroll Yakınlaştır • OU'ya Tıkla: Aç/Kapat
          </span>
        </div>
      </div>
    </div>
  );
};

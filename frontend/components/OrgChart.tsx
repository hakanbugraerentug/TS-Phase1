
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

interface OuNode {
  id: string;
  label: string;
  parentId: string | null;
  childIds: string[];
  usernames: string[];
}

interface NodePosition {
  x: number;
  y: number;
}

const OU_W = 220;
const OU_H = 72;
const USER_W = 190;
const USER_H = 80;
const OU_EXPAND_RADIUS = 300;
const USER_EXPAND_RADIUS = 250;
const ZOOM_SENSITIVITY = 0.001;

function parseDNtoOuPath(dn: string): string[] {
  return dn
    .split(',')
    .filter(p => p.trim().toUpperCase().startsWith('OU='))
    .map(p => p.trim().slice(3))
    .reverse();
}

function buildOuTree(users: OrgUser[]): Map<string, OuNode> {
  const tree = new Map<string, OuNode>();

  const getOrCreate = (id: string, label: string, parentId: string | null) => {
    if (!tree.has(id)) {
      tree.set(id, { id, label, parentId, childIds: [], usernames: [] });
    }
    return tree.get(id)!;
  };

  for (const u of users) {
    const path = u.distinguishedName ? parseDNtoOuPath(u.distinguishedName) : ['Diğer'];
    if (path.length === 0) path.push('Diğer');

    for (let i = 0; i < path.length; i++) {
      const id = 'ou:' + path.slice(0, i + 1).join('/');
      const parentId = i === 0 ? null : 'ou:' + path.slice(0, i).join('/');
      const node = getOrCreate(id, path[i], parentId);

      if (parentId) {
        const parent = tree.get(parentId)!;
        if (!parent.childIds.includes(id)) parent.childIds.push(id);
      }

      if (i === path.length - 1) {
        if (!node.usernames.includes(u.username)) node.usernames.push(u.username);
      }
    }
  }

  return tree;
}

export const OrgChart: React.FC<{ user: User }> = ({ user }) => {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [ouTree, setOuTree] = useState<Map<string, OuNode>>(new Map());
  const [expandedOUs, setExpandedOUs] = useState<Set<string>>(new Set());
  const [visibleUsers, setVisibleUsers] = useState<Set<string>>(new Set());
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = useState(0.8);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<{
    kind: 'pan' | 'node';
    nodeId?: string;
    startMX: number;
    startMY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  // Non-passive wheel listener to prevent page scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setCanvasScale(s => Math.min(Math.max(s - e.deltaY * ZOOM_SENSITIVITY, 0.3), 2.0));
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const toggleOU = useCallback((ouId: string, currentExpandedOUs: Set<string>, currentNodePositions: Record<string, NodePosition>, currentOuTree: Map<string, OuNode>) => {
    const node = currentOuTree.get(ouId);
    if (!node) return;

    const isExpanded = currentExpandedOUs.has(ouId);

    if (isExpanded) {
      // Recursively collapse all descendants
      const toCollapse = new Set<string>();
      const collectDesc = (id: string) => {
        const n = currentOuTree.get(id);
        if (!n) return;
        n.childIds.forEach(c => { toCollapse.add(c); collectDesc(c); });
      };
      collectDesc(ouId);
      toCollapse.add(ouId);

      setExpandedOUs(prev => {
        const s = new Set(prev);
        toCollapse.forEach(id => s.delete(id));
        return s;
      });
      setVisibleUsers(prev => {
        const s = new Set(prev);
        toCollapse.forEach(id => {
          currentOuTree.get(id)?.usernames.forEach(u => s.delete(`user:${u}`));
        });
        node.usernames.forEach(u => s.delete(`user:${u}`));
        return s;
      });
    } else {
      // Expand: radially position children or users
      const pos = currentNodePositions[ouId] || { x: 150, y: 150 };
      const cx = pos.x + OU_W / 2;
      const cy = pos.y + OU_H / 2;

      const newPositions: Record<string, NodePosition> = {};

      if (node.childIds.length > 0) {
        const radius = OU_EXPAND_RADIUS;
        node.childIds.forEach((cid, i) => {
          const angle = -Math.PI / 2 + (2 * Math.PI * i) / node.childIds.length;
          newPositions[cid] = {
            x: cx + radius * Math.cos(angle) - OU_W / 2,
            y: cy + radius * Math.sin(angle) - OU_H / 2,
          };
        });
      } else if (node.usernames.length > 0) {
        const radius = USER_EXPAND_RADIUS;
        node.usernames.forEach((u, i) => {
          const angle = -Math.PI / 2 + (2 * Math.PI * i) / node.usernames.length;
          newPositions[`user:${u}`] = {
            x: cx + radius * Math.cos(angle) - USER_W / 2,
            y: cy + radius * Math.sin(angle) - USER_H / 2,
          };
        });
        setVisibleUsers(prev => {
          const s = new Set(prev);
          node.usernames.forEach(u => s.add(`user:${u}`));
          return s;
        });
      }

      setNodePositions(prev => ({ ...prev, ...newPositions }));
      setExpandedOUs(prev => { const s = new Set(prev); s.add(ouId); return s; });
    }
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

        const tree = buildOuTree(data);
        setOuTree(tree);

        // Place root OUs in a 3-column grid
        const roots = Array.from(tree.values()).filter(n => n.parentId === null);
        const positions: Record<string, NodePosition> = {};
        roots.forEach((rootNode, idx) => {
          const col = idx % 3;
          const row = Math.floor(idx / 3);
          positions[rootNode.id] = {
            x: 150 + col * 300,
            y: 150 + row * 220,
          };
        });
        setNodePositions(positions);

        // Auto-expand: find current user's OU chain
        let activeOuId: string | null = null;
        tree.forEach((n) => {
          if (n.usernames.includes(user.username)) activeOuId = n.id;
        });

        if (activeOuId) {
          // Collect chain from leaf to root
          const chain: string[] = [];
          let cur: string | null = activeOuId;
          while (cur) {
            chain.unshift(cur);
            cur = tree.get(cur)?.parentId ?? null;
          }

          // Expand chain from root down, computing positions on the fly
          let runningPositions = { ...positions };
          let runningExpanded = new Set<string>();
          let runningVisible = new Set<string>();

          for (const ouId of chain) {
            const node = tree.get(ouId);
            if (!node) continue;
            const pos = runningPositions[ouId] || { x: 150, y: 150 };
            const cx = pos.x + OU_W / 2;
            const cy = pos.y + OU_H / 2;
            runningExpanded.add(ouId);

            if (node.childIds.length > 0) {
              const radius = OU_EXPAND_RADIUS;
              node.childIds.forEach((cid, i) => {
                const angle = -Math.PI / 2 + (2 * Math.PI * i) / node.childIds.length;
                runningPositions[cid] = {
                  x: cx + radius * Math.cos(angle) - OU_W / 2,
                  y: cy + radius * Math.sin(angle) - OU_H / 2,
                };
              });
            } else if (node.usernames.length > 0) {
              const radius = USER_EXPAND_RADIUS;
              node.usernames.forEach((u, i) => {
                const angle = -Math.PI / 2 + (2 * Math.PI * i) / node.usernames.length;
                runningPositions[`user:${u}`] = {
                  x: cx + radius * Math.cos(angle) - USER_W / 2,
                  y: cy + radius * Math.sin(angle) - USER_H / 2,
                };
                runningVisible.add(`user:${u}`);
              });
            }
          }

          // Also expand manager's OU chain
          const dnToUserMap = new Map<string, OrgUser>();
          data.forEach(u => { if (u.distinguishedName) dnToUserMap.set(u.distinguishedName, u); });
          const activeUser = data.find(u => u.username === user.username);
          if (activeUser?.manager) {
            const mgrUser = dnToUserMap.get(activeUser.manager);
            if (mgrUser) {
              let mgrOuId: string | null = null;
              tree.forEach(n => {
                if (n.usernames.includes(mgrUser.username)) mgrOuId = n.id;
              });
              if (mgrOuId) {
                const mgrChain: string[] = [];
                let cur2: string | null = mgrOuId;
                while (cur2) {
                  mgrChain.unshift(cur2);
                  cur2 = tree.get(cur2)?.parentId ?? null;
                }
                for (const ouId of mgrChain) {
                  if (runningExpanded.has(ouId)) continue;
                  const node = tree.get(ouId);
                  if (!node) continue;
                  const pos = runningPositions[ouId] || { x: 150, y: 150 };
                  const cx = pos.x + OU_W / 2;
                  const cy = pos.y + OU_H / 2;
                  runningExpanded.add(ouId);
                  if (node.childIds.length > 0) {
                    const radius = OU_EXPAND_RADIUS;
                    node.childIds.forEach((cid, i) => {
                      if (runningPositions[cid]) return;
                      const angle = -Math.PI / 2 + (2 * Math.PI * i) / node.childIds.length;
                      runningPositions[cid] = {
                        x: cx + radius * Math.cos(angle) - OU_W / 2,
                        y: cy + radius * Math.sin(angle) - OU_H / 2,
                      };
                    });
                  } else if (node.usernames.length > 0) {
                    const radius = USER_EXPAND_RADIUS;
                    node.usernames.forEach((u, i) => {
                      if (runningPositions[`user:${u}`]) return;
                      const angle = -Math.PI / 2 + (2 * Math.PI * i) / node.usernames.length;
                      runningPositions[`user:${u}`] = {
                        x: cx + radius * Math.cos(angle) - USER_W / 2,
                        y: cy + radius * Math.sin(angle) - USER_H / 2,
                      };
                      runningVisible.add(`user:${u}`);
                    });
                  }
                }
              }
            }
          }

          setNodePositions(runningPositions);
          setExpandedOUs(runningExpanded);
          setVisibleUsers(runningVisible);
        }
      } catch (e: any) {
        setError(e.message || 'Hata');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.accessToken, user.username]);

  const dnToUser = useMemo(() => {
    const m = new Map<string, OrgUser>();
    users.forEach(u => { if (u.distinguishedName) m.set(u.distinguishedName, u); });
    return m;
  }, [users]);

  const arrows = useMemo(() => {
    const result: { key: string; d: string; type: 'ou' | 'mgr'; labelX: number; labelY: number }[] = [];

    // OU → Child OU arrows
    expandedOUs.forEach(ouId => {
      const node = ouTree.get(ouId);
      if (!node) return;
      node.childIds.forEach(cid => {
        if (!nodePositions[ouId] || !nodePositions[cid]) return;
        const p = nodePositions[ouId];
        const c = nodePositions[cid];
        const x1 = p.x + OU_W / 2;
        const y1 = p.y + OU_H / 2;
        const x2 = c.x + OU_W / 2;
        const y2 = c.y + OU_H / 2;
        const cy1 = y1 + 80;
        const cy2 = y2 - 80;
        result.push({
          key: `ou:${ouId}->${cid}`,
          d: `M ${x1},${y1} C ${x1},${cy1} ${x2},${cy2} ${x2},${y2}`,
          type: 'ou',
          labelX: (x1 + x2) / 2,
          labelY: (y1 + y2) / 2 - 8,
        });
      });
    });

    // User → Manager arrows
    users.forEach(u => {
      if (!u.manager) return;
      const mgr = dnToUser.get(u.manager);
      if (!mgr) return;
      const uKey = `user:${u.username}`;
      const mKey = `user:${mgr.username}`;
      if (!visibleUsers.has(uKey) || !visibleUsers.has(mKey)) return;
      const fp = nodePositions[mKey];
      const tp = nodePositions[uKey];
      if (!fp || !tp) return;
      const x1 = fp.x + USER_W / 2;
      const y1 = fp.y + USER_H;
      const x2 = tp.x + USER_W / 2;
      const y2 = tp.y;
      result.push({
        key: `mgr:${mgr.username}->${u.username}`,
        d: `M ${x1},${y1} C ${x1},${y1 + 60} ${x2},${y2 - 60} ${x2},${y2}`,
        type: 'mgr',
        labelX: (x1 + x2) / 2,
        labelY: (y1 + y2) / 2 - 8,
      });
    });

    return result;
  }, [users, ouTree, expandedOUs, visibleUsers, nodePositions, dnToUser]);

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
    const rawDx = e.clientX - a.startMX;
    const rawDy = e.clientY - a.startMY;
    if (Math.abs(rawDx) > 3 || Math.abs(rawDy) > 3) a.moved = true;
    if (!a.moved) return;
    if (a.kind === 'pan') {
      setCanvasOffset({ x: a.startX + rawDx, y: a.startY + rawDy });
    } else if (a.kind === 'node' && a.nodeId) {
      setNodePositions(prev => ({
        ...prev,
        [a.nodeId!]: { x: a.startX + rawDx / canvasScale, y: a.startY + rawDy / canvasScale },
      }));
    }
  };

  const onMouseUp = () => {
    const a = activeRef.current;
    if (a && !a.moved && a.kind === 'node' && a.nodeId?.startsWith('ou:')) {
      toggleOU(a.nodeId, expandedOUs, nodePositions, ouTree);
    }
    activeRef.current = null;
  };

  if (loading) return (
    <div className="w-full h-[calc(100vh-180px)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
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

  // Which OU nodes to render
  const visibleOuIds = (Array.from(ouTree.keys()) as string[]).filter(id => {
    const node = ouTree.get(id)!;
    if (node.parentId === null) return true; // root always visible
    return expandedOUs.has(node.parentId);
  });

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
        <svg className="absolute inset-0 pointer-events-none overflow-visible" width="10000" height="10000">
          <defs>
            <marker id="arr-mgr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
            </marker>
            <marker id="arr-ou" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
            </marker>
          </defs>
          {arrows.map(a => (
            <React.Fragment key={a.key}>
              <path
                d={a.d}
                stroke={a.type === 'mgr' ? '#3b82f6' : '#6366f1'}
                strokeWidth="1.5"
                fill="none"
                strokeDasharray={a.type === 'ou' ? '6 3' : undefined}
                markerEnd={a.type === 'mgr' ? 'url(#arr-mgr)' : 'url(#arr-ou)'}
              />
              <text
                x={a.labelX}
                y={a.labelY}
                fill="#94a3b8"
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
                fontStyle="italic"
              >
                {a.type === 'mgr' ? 'Yönetici' : 'Organizational Unit'}
              </text>
            </React.Fragment>
          ))}
        </svg>

        {/* OU nodes */}
        {visibleOuIds.map(ouId => {
          const node = ouTree.get(ouId)!;
          const pos = nodePositions[ouId] || { x: 0, y: 0 };
          const isExpanded = expandedOUs.has(ouId);

          return (
            <div
              key={ouId}
              className={`absolute rounded-2xl border-2 cursor-move flex items-center justify-between px-4 transition-colors
                ${isExpanded
                  ? 'bg-[#1e293b] border-indigo-400 shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)]'
                  : 'bg-[#1e293b] border-indigo-500/60 hover:border-indigo-400'
                }`}
              style={{ left: pos.x, top: pos.y, width: OU_W, height: OU_H, zIndex: 10 }}
              onMouseDown={(e) => onNodeMouseDown(e, ouId)}
            >
              <div className="pointer-events-none overflow-hidden">
                <p className="text-white font-black text-sm italic truncate">{node.label}</p>
                <p className="text-indigo-300/70 text-[9px] font-bold uppercase tracking-widest">
                  {node.childIds.length > 0
                    ? `${node.childIds.length} alt birim`
                    : `${node.usernames.length} kişi`}
                </p>
              </div>
              <div className={`w-6 h-6 flex items-center justify-center text-indigo-400 flex-shrink-0 transition-transform pointer-events-none ${isExpanded ? 'rotate-180' : ''}`}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          );
        })}

        {/* Person nodes */}
        {(Array.from(visibleUsers) as string[]).map(userKey => {
          const username = userKey.slice(5);
          const u = users.find(x => x.username === username);
          if (!u) return null;
          const uPos = nodePositions[userKey];
          if (!uPos) return null;

          return (
            <div
              key={userKey}
              className={`absolute rounded-xl border cursor-move hover:border-blue-500/50 transition-colors
                ${u.username === user.username
                  ? 'border-blue-500 bg-[#0f172a] shadow-[0_0_15px_-3px_rgba(59,130,246,0.5)]'
                  : 'border-slate-700 bg-[#0f172a]'
                }`}
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
                  <p className="text-slate-200 font-black text-xs italic truncate">{u.fullName || u.username}</p>
                  <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest truncate">{u.title || '—'}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-10 right-10 flex flex-col gap-3 z-[200]">
        <div className="bg-[#1e293b]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex flex-col gap-2 shadow-2xl">
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setCanvasScale(s => Math.min(s + 0.1, 2))}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-indigo-600 rounded-xl text-white transition-all"
          >+</button>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setCanvasScale(s => Math.max(s - 0.1, 0.3))}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-indigo-600 rounded-xl text-white transition-all"
          >-</button>
          <div className="h-px bg-white/10 mx-2" />
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => { setCanvasScale(0.8); setCanvasOffset({ x: 0, y: 0 }); }}
            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-indigo-600 rounded-xl text-white transition-all text-xs"
          >↺</button>
        </div>
        <div className="bg-indigo-600/20 backdrop-blur-md border border-indigo-500/30 rounded-xl px-4 py-2 text-center">
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">%{Math.round(canvasScale * 100)}</span>
        </div>
      </div>

      {/* Guide Note */}
      <div className="absolute top-6 left-6 pointer-events-none z-[200]">
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
            OU'ya Tıkla: Aç/Kapat • Sürükle: Taşı / Pan • Scroll: Yakınlaştır
          </span>
        </div>
      </div>
    </div>
  );
};

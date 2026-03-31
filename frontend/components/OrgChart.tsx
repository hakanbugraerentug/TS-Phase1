
import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../App';
import { UserAvatar } from './UserAvatar';

// ─── Constants ───────────────────────────────────────────────────────────────

const NODE_W = 200;
const NODE_H = 88;
const H_GAP = 24;
const V_GAP = 56;
const CONNECTOR_H = 28;

// ─── Color Palette ───────────────────────────────────────────────────────────

const GROUP_COLORS = [
  { bg: 'bg-blue-900/60',    border: 'border-blue-500',    text: 'text-blue-300',    dot: 'bg-blue-500',    hex: '#3b82f6' },
  { bg: 'bg-emerald-900/60', border: 'border-emerald-500', text: 'text-emerald-300', dot: 'bg-emerald-500', hex: '#10b981' },
  { bg: 'bg-violet-900/60',  border: 'border-violet-500',  text: 'text-violet-300',  dot: 'bg-violet-500',  hex: '#8b5cf6' },
  { bg: 'bg-amber-900/60',   border: 'border-amber-500',   text: 'text-amber-300',   dot: 'bg-amber-500',   hex: '#f59e0b' },
  { bg: 'bg-rose-900/60',    border: 'border-rose-500',    text: 'text-rose-300',    dot: 'bg-rose-500',    hex: '#f43f5e' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgChartData {
  username: string;
  fullName: string;
  title: string;
  sector: string;
  directorate: string;
  department: string;
  distinguishedName: string;
  isActiveUser: boolean;
  manager: OrgChartData | null;
  siblings: OrgChartData[];
}

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

interface NodeData {
  username: string;
  fullName: string;
  title: string;
  department: string;
  sector: string;
  directorate: string;
  distinguishedName: string;
  isActiveUser: boolean;
  colorStyle?: { bg: string; border: string; text: string };
}

type RoleType = 'department_manager' | 'directorate_director' | 'sector_head' | 'other';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectRole(title: string): RoleType {
  const t = title.toLowerCase();
  if (t.includes('müdür') || t.includes('mudur') || t.includes('manager')) return 'department_manager';
  if (t.includes('direktör') || t.includes('direktor') || t.includes('director')) return 'directorate_director';
  if (t.includes('başkan') || t.includes('baskan') || t.includes('head') || t.includes('chief')) return 'sector_head';
  return 'other';
}

function getGroupKey(u: { department: string; directorate: string; sector: string }, role: RoleType): string {
  if (role === 'department_manager') return u.department;
  if (role === 'directorate_director') return u.directorate;
  if (role === 'sector_head') return u.sector;
  return u.department;
}

function flattenManagerChain(node: OrgChartData): OrgChartData[] {
  const chain: OrgChartData[] = [];
  let cur: OrgChartData | null | undefined = node.manager;
  while (cur) {
    chain.unshift(cur);
    cur = cur.manager;
  }
  return chain;
}

// ─── PersonNode ───────────────────────────────────────────────────────────────

const PersonNode: React.FC<{ node: NodeData; accessToken: string }> = ({ node, accessToken }) => {
  const style = node.colorStyle;
  return (
    <div
      className={`rounded-2xl border-2 p-3 flex flex-col gap-2 transition-all
        ${style
          ? `${style.bg} ${style.border}`
          : node.isActiveUser
            ? 'bg-[#1e293b] border-blue-500 shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)]'
            : 'bg-[#1e293b]/80 border-white/10'
        }`}
      style={{ width: NODE_W, minHeight: NODE_H }}
    >
      <div className="flex items-center gap-2">
        <UserAvatar
          username={node.username}
          displayName={node.fullName || node.username}
          accessToken={accessToken}
          size="sm"
          className="flex-shrink-0"
        />
        <div className="overflow-hidden flex-1 min-w-0">
          <p className={`font-black text-xs italic truncate ${style ? style.text : node.isActiveUser ? 'text-white' : 'text-slate-200'}`}>
            {node.fullName || node.username}
          </p>
          <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest truncate">
            {node.title || '—'}
          </p>
          {node.department && (
            <p className="text-slate-600 text-[8px] truncate">{node.department}</p>
          )}
        </div>
        {node.isActiveUser && (
          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
        )}
      </div>
    </div>
  );
};

// ─── OrgChart ─────────────────────────────────────────────────────────────────

export const OrgChart: React.FC<{ user: User }> = ({ user }) => {
  const [orgData, setOrgData] = useState<OrgChartData | null>(null);
  const [allUsers, setAllUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
        const headers = { Authorization: `Bearer ${user.accessToken}` };

        const [orgRes, allRes] = await Promise.all([
          fetch(`${apiUrl}/api/users/${user.username}/org-chart`, { headers }),
          fetch(`${apiUrl}/api/users/all-org`, { headers }),
        ]);

        if (!orgRes.ok) throw new Error('Org chart yüklenemedi');
        const orgJson = await orgRes.json();
        const allJson = allRes.ok ? await allRes.json() : [];

        setOrgData(orgJson);
        setAllUsers(Array.isArray(allJson) ? allJson : []);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Hata';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.username, user.accessToken]);

  // 1st-degree subordinates
  const subordinates = useMemo((): OrgUser[] => {
    if (!orgData) return [];
    return allUsers.filter(u => u.manager === orgData.distinguishedName);
  }, [orgData, allUsers]);

  // Role-based color assignments
  const colorData = useMemo(() => {
    if (!orgData) return { groupColorMap: new Map<string, number>(), roleType: 'other' as RoleType, colorGroups: [] as { groupKey: string; colorIdx: number; label: string }[] };

    const roleType = detectRole(orgData.title);
    const activeGroupKey = getGroupKey(orgData, roleType);

    const groupColorMap = new Map<string, number>();
    const colorGroups: { groupKey: string; colorIdx: number; label: string }[] = [];
    let colorIdx = 0;

    const getLabel = (key: string) => {
      if (roleType === 'department_manager') return `${key} Müdürlüğü`;
      if (roleType === 'directorate_director') return `${key} Direktörlüğü`;
      if (roleType === 'sector_head') return `${key} Sektör Başkanlığı`;
      return key;
    };

    if (activeGroupKey) {
      groupColorMap.set(activeGroupKey, 0);
      colorGroups.push({ groupKey: activeGroupKey, colorIdx: 0, label: getLabel(activeGroupKey) });
      colorIdx = 1;
    }

    orgData.siblings.forEach(s => {
      const gk = getGroupKey(s, roleType);
      if (gk && !groupColorMap.has(gk)) {
        const ci = colorIdx % GROUP_COLORS.length;
        groupColorMap.set(gk, ci);
        colorGroups.push({ groupKey: gk, colorIdx: ci, label: getLabel(gk) });
        colorIdx++;
      }
    });

    subordinates.forEach(s => {
      const gk = getGroupKey(s, roleType);
      if (gk && !groupColorMap.has(gk)) {
        const ci = colorIdx % GROUP_COLORS.length;
        groupColorMap.set(gk, ci);
        colorGroups.push({ groupKey: gk, colorIdx: ci, label: getLabel(gk) });
        colorIdx++;
      }
    });

    return { groupColorMap, roleType, colorGroups };
  }, [orgData, subordinates]);

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

  if (!orgData) return null;

  const { groupColorMap, roleType, colorGroups } = colorData;

  const getNodeColorStyle = (node: { department: string; directorate: string; sector: string }) => {
    const gk = getGroupKey(node, roleType);
    const ci = groupColorMap.get(gk);
    if (ci === undefined) return undefined;
    const c = GROUP_COLORS[ci];
    return { bg: c.bg, border: c.border, text: c.text };
  };

  // Manager chain
  const managerChain = flattenManagerChain(orgData);

  // Siblings split — active user centered
  const siblings = orgData.siblings;
  const leftSiblings = siblings.slice(0, Math.ceil(siblings.length / 2));
  const rightSiblings = siblings.slice(Math.ceil(siblings.length / 2));

  const activeNodeData: NodeData = {
    ...orgData,
    isActiveUser: true,
    colorStyle: getNodeColorStyle(orgData),
  };

  const hasSubordinates = subordinates.length > 0;

  return (
    <div className="relative w-full h-[calc(100vh-180px)] overflow-auto">
      {/* Legend */}
      {colorGroups.length > 0 && (
        <div className="absolute top-6 right-6 bg-[#1e293b]/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-2 z-10 min-w-[180px]">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Renk Göstergesi</p>
          {colorGroups.map(g => (
            <div key={g.groupKey} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${GROUP_COLORS[g.colorIdx].dot}`} />
              <span className="text-[10px] font-bold text-slate-300 italic truncate">{g.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tree */}
      <div className="min-w-max min-h-max flex flex-col items-center py-12 px-16">

        {/* Manager chain */}
        {managerChain.map((mgr, idx) => (
          <React.Fragment key={mgr.username || idx}>
            <PersonNode
              node={{ ...mgr, isActiveUser: false }}
              accessToken={user.accessToken}
            />
            <div
              className="bg-slate-700"
              style={{ width: 1, height: V_GAP + CONNECTOR_H }}
            />
          </React.Fragment>
        ))}

        {/* Sibling row — horizontal line connector */}
        <div className="relative flex items-start" style={{ gap: H_GAP }}>
          {/* Horizontal connecting line across all nodes in the row */}
          {siblings.length > 0 && (() => {
            const totalNodes = siblings.length + 1; // siblings + active user
            const totalWidth = totalNodes * NODE_W + (totalNodes - 1) * H_GAP;
            return (
              <div
                className="absolute bg-slate-700 pointer-events-none"
                style={{
                  top: -1,
                  left: NODE_W / 2,
                  width: totalWidth - NODE_W,
                  height: 1,
                }}
              />
            );
          })()}

          {/* Left siblings */}
          {leftSiblings.map((s, idx) => (
            <div key={s.username || idx} className="flex flex-col items-center">
              <div className="bg-slate-700" style={{ width: 1, height: CONNECTOR_H }} />
              <PersonNode
                node={{
                  ...s,
                  isActiveUser: false,
                  colorStyle: getNodeColorStyle(s),
                }}
                accessToken={user.accessToken}
              />
            </div>
          ))}

          {/* Active user */}
          <div className="flex flex-col items-center">
            <div className="bg-blue-500/60" style={{ width: 1, height: CONNECTOR_H }} />
            <PersonNode node={activeNodeData} accessToken={user.accessToken} />
          </div>

          {/* Right siblings */}
          {rightSiblings.map((s, idx) => (
            <div key={s.username || idx} className="flex flex-col items-center">
              <div className="bg-slate-700" style={{ width: 1, height: CONNECTOR_H }} />
              <PersonNode
                node={{
                  ...s,
                  isActiveUser: false,
                  colorStyle: getNodeColorStyle(s),
                }}
                accessToken={user.accessToken}
              />
            </div>
          ))}
        </div>

        {/* Subordinates */}
        {hasSubordinates && (
          <>
            {/* Vertical line from active user down */}
            <div className="bg-slate-700/60" style={{ width: 1, height: V_GAP }} />

            {/* Horizontal distributor line + subordinate nodes */}
            <div className="relative flex items-start" style={{ gap: H_GAP }}>
              {subordinates.length > 1 && (() => {
                const totalWidth = subordinates.length * NODE_W + (subordinates.length - 1) * H_GAP;
                return (
                  <div
                    className="absolute bg-slate-700/60 pointer-events-none"
                    style={{
                      top: -1,
                      left: NODE_W / 2,
                      width: totalWidth - NODE_W,
                      height: 1,
                    }}
                  />
                );
              })()}
              {subordinates.map((sub, idx) => (
                <div key={sub.username || idx} className="flex flex-col items-center">
                  <div className="bg-slate-700/60" style={{ width: 1, height: CONNECTOR_H }} />
                  <PersonNode
                    node={{
                      ...sub,
                      isActiveUser: false,
                      colorStyle: getNodeColorStyle(sub),
                    }}
                    accessToken={user.accessToken}
                  />
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
};


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

interface TeamDto {
  id: string;
  title: string;
  description: string;
  leader: string;
  members: string[];
  projectId: string;
}

interface BulletLine {
  bullet0: string | null;
  bullet1: string[] | null;
  bullet2: string[] | null;
  bullet3: string[] | null;
}

interface TraceabilityEntry {
  project: string;
  bullet_field: string;
  text: string;
  sources: string[];
}

interface AiReportResponse {
  title: string;
  instructions: string[];
  bullet_lines: BulletLine[];
  traceability: TraceabilityEntry[];
  source_map: Record<string, unknown>;
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

const MS_PER_DAY = 86400000;

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekNumber(date: Date): number {
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const firstDayOfYear = yearStart.getDay();
  const firstMonday = firstDayOfYear <= 1
    ? new Date(yearStart.getTime() - (firstDayOfYear === 0 ? 6 : firstDayOfYear - 1) * MS_PER_DAY)
    : new Date(yearStart.getTime() + (8 - firstDayOfYear) * MS_PER_DAY);
  const weekStartDate = getWeekStart(date);
  const diff = weekStartDate.getTime() - firstMonday.getTime();
  return Math.max(1, Math.floor(diff / (7 * MS_PER_DAY)) + 1);
}

function getWeekLabel(weekStartStr: string): string {
  const d = new Date(weekStartStr + 'T00:00:00');
  const weekNum = getWeekNumber(d);
  return `${d.getFullYear()} - ${weekNum}. Hafta`;
}

function generateWeekOptions(count: number = 16): { value: string; label: string }[] {
  const options = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const ws = getWeekStart(d);
    const value = ws.toISOString().split('T')[0];
    const weekNum = getWeekNumber(ws);
    const label = `${ws.getFullYear()} - ${weekNum}. Hafta`;
    options.push({ value, label });
  }
  return options;
}

function getLeadersForMember(
  memberUsername: string,
  leaderSubs: OrgUser[],
  allTeams: TeamDto[]
): string[] {
  const leaderUsernames = new Set<string>();
  for (const team of allTeams) {
    if (
      team.members.includes(memberUsername) &&
      leaderSubs.some(ls => ls.username === team.leader)
    ) {
      leaderUsernames.add(team.leader);
    }
  }
  return Array.from(leaderUsernames);
}

// ─── PersonNode ───────────────────────────────────────────────────────────────

interface PersonNodeProps {
  node: NodeData;
  accessToken: string;
  isSubordinate?: boolean;
  onViewReport?: (username: string) => void;
  allTeams?: TeamDto[];
}

const PersonNode: React.FC<PersonNodeProps> = ({ node, accessToken, isSubordinate, onViewReport, allTeams }) => {
  const style = node.colorStyle;
  const leaderTeams = allTeams ? allTeams.filter(t => t.leader === node.username) : [];

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
        {isSubordinate && onViewReport && (
          <button
            onClick={() => onViewReport(node.username)}
            className="ml-auto flex-shrink-0 p-1.5 rounded-lg bg-slate-700/50 hover:bg-blue-600/40 border border-white/10 hover:border-blue-500/50 transition-all"
            title={`${node.fullName} raporunu gör`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-400 hover:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        )}
      </div>
      {leaderTeams.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {leaderTeams.map(t => (
            <span key={t.id} className="text-[8px] font-black bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-2 py-0.5 rounded-full" aria-label={`Ekip Lideri: ${t.title}`}>
              👑 {t.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── OrgChart ─────────────────────────────────────────────────────────────────

export const OrgChart: React.FC<{ user: User }> = ({ user }) => {
  const [orgData, setOrgData] = useState<OrgChartData | null>(null);
  const [allUsers, setAllUsers] = useState<OrgUser[]>([]);
  const [allTeams, setAllTeams] = useState<TeamDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedWeek, setSelectedWeek] = useState<string>(() => {
    const now = new Date();
    return getWeekStart(now).toISOString().split('T')[0];
  });

  const [reportModal, setReportModal] = useState<{
    username: string;
    fullName: string;
    loading: boolean;
    data: AiReportResponse | null;
    error: string | null;
    notFound: boolean;
  } | null>(null);

  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const headers = { Authorization: `Bearer ${user.accessToken}` };

        const [orgRes, allRes, teamsRes] = await Promise.all([
          fetch(`${apiUrl}/api/users/${user.username}/org-chart`, { headers }),
          fetch(`${apiUrl}/api/users/all-org`, { headers }),
          fetch(`${apiUrl}/api/teams`, { headers }),
        ]);

        if (!orgRes.ok) throw new Error('Org chart yüklenemedi');
        const orgJson = await orgRes.json();
        const allJson = allRes.ok ? await allRes.json() : [];
        const teamsJson = teamsRes.ok ? await teamsRes.json() : [];

        setOrgData(orgJson);
        setAllUsers(Array.isArray(allJson) ? allJson : []);
        setAllTeams(Array.isArray(teamsJson) ? teamsJson : []);
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

  // Leader layer computations — kept before early returns so hooks are unconditional
  const isDeptManagerPre = colorData.roleType === 'department_manager';
  const leaderSubsPre = isDeptManagerPre
    ? subordinates.filter(s => allTeams.some(t => t.leader === s.username))
    : [];
  const nonLeaderSubsPre = isDeptManagerPre
    ? subordinates.filter(s => !allTeams.some(t => t.leader === s.username))
    : subordinates;
  const hasLeaderLayerPre = isDeptManagerPre && leaderSubsPre.length > 0;

  const membersByLeader = useMemo(() => {
    if (!hasLeaderLayerPre) return new Map<string, OrgUser[]>();
    const map = new Map<string, OrgUser[]>();
    leaderSubsPre.forEach(ls => map.set(ls.username, []));
    nonLeaderSubsPre.forEach(sub => {
      const leaders = getLeadersForMember(sub.username, leaderSubsPre, allTeams);
      leaders.forEach(lu => {
        const arr = map.get(lu) || [];
        arr.push(sub);
        map.set(lu, arr);
      });
    });
    return map;
  }, [leaderSubsPre, nonLeaderSubsPre, allTeams, hasLeaderLayerPre]);

  const handleViewReport = async (username: string) => {
    const sub = allUsers.find(u => u.username === username);
    const fullName = sub?.fullName || username;

    setReportModal({ username, fullName, loading: true, data: null, error: null, notFound: false });

    try {
      const res = await fetch(
        `${apiUrl}/api/weekly-reports/by-user?username=${encodeURIComponent(username)}&weekStart=${selectedWeek}`,
        { headers: { Authorization: `Bearer ${user.accessToken}` } }
      );

      if (res.status === 404) {
        setReportModal(prev => prev ? { ...prev, loading: false, notFound: true } : null);
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setReportModal(prev => prev ? { ...prev, loading: false, data: data.reportData || null } : null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setReportModal(prev => prev ? { ...prev, loading: false, error: msg } : null);
    }
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

  // Leader layer logic (only for department_manager) — reuse pre-computed values
  const isDeptManager = isDeptManagerPre;
  const leaderSubs = leaderSubsPre;
  const nonLeaderSubs = nonLeaderSubsPre;
  const hasLeaderLayer = hasLeaderLayerPre;

  // Non-leader subs that have no leader connection → direct under manager
  const directSubs = isDeptManager
    ? nonLeaderSubs.filter(sub => getLeadersForMember(sub.username, leaderSubs, allTeams).length === 0)
    : [];

  const weekOptions = generateWeekOptions(16);

  return (
    <div className="relative w-full h-[calc(100vh-180px)] overflow-auto">
      {/* Top-right panel: week selector + legend */}
      <div className="absolute top-6 right-6 z-20 flex flex-col gap-3">
        {/* Week Selector */}
        <div className="bg-[#1e293b]/90 backdrop-blur-md border border-white/10 rounded-2xl p-3">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Hafta Seç</p>
          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(e.target.value)}
            className="bg-slate-800 text-slate-200 text-xs rounded-xl border border-white/10 px-3 py-1.5 focus:outline-none focus:border-blue-500 w-full"
          >
            {weekOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Legend */}
        {colorGroups.length > 0 && (
          <div className="bg-[#1e293b]/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-2 min-w-[180px]">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Renk Göstergesi</p>
            {colorGroups.map(g => (
              <div key={g.groupKey} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${GROUP_COLORS[g.colorIdx].dot}`} />
                <span className="text-[10px] font-bold text-slate-300 italic truncate">{g.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

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
          {siblings.length > 0 && (() => {
            const totalNodes = siblings.length + 1;
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
                node={{ ...s, isActiveUser: false, colorStyle: getNodeColorStyle(s) }}
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
                node={{ ...s, isActiveUser: false, colorStyle: getNodeColorStyle(s) }}
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

            {hasLeaderLayer ? (
              <>
                {/* Leader layer */}
                <div className="relative flex items-start" style={{ gap: H_GAP }}>
                  {leaderSubs.length > 1 && (() => {
                    const totalWidth = leaderSubs.length * NODE_W + (leaderSubs.length - 1) * H_GAP;
                    return (
                      <div
                        className="absolute bg-slate-700/60 pointer-events-none"
                        style={{ top: -1, left: NODE_W / 2, width: totalWidth - NODE_W, height: 1 }}
                      />
                    );
                  })()}
                  {leaderSubs.map((ls, idx) => (
                    <div key={ls.username || idx} className="flex flex-col items-center">
                      <div className="bg-slate-700/60" style={{ width: 1, height: CONNECTOR_H }} />
                      <PersonNode
                        node={{ ...ls, isActiveUser: false, colorStyle: getNodeColorStyle(ls) }}
                        accessToken={user.accessToken}
                        isSubordinate
                        onViewReport={handleViewReport}
                        allTeams={allTeams}
                      />
                      {/* Leader's team members */}
                      {(membersByLeader.get(ls.username) || []).length > 0 && (
                        <>
                          <div className="bg-slate-700/40" style={{ width: 1, height: V_GAP }} />
                          <div className="relative flex items-start" style={{ gap: H_GAP }}>
                            {(membersByLeader.get(ls.username) || []).length > 1 && (() => {
                              const members = membersByLeader.get(ls.username) || [];
                              const totalWidth = members.length * NODE_W + (members.length - 1) * H_GAP;
                              return (
                                <div
                                  className="absolute bg-slate-700/40 pointer-events-none"
                                  style={{ top: -1, left: NODE_W / 2, width: totalWidth - NODE_W, height: 1 }}
                                />
                              );
                            })()}
                            {(membersByLeader.get(ls.username) || []).map((member, midx) => (
                              <div key={member.username || midx} className="flex flex-col items-center">
                                <div className="bg-slate-700/40" style={{ width: 1, height: CONNECTOR_H }} />
                                <PersonNode
                                  node={{ ...member, isActiveUser: false, colorStyle: getNodeColorStyle(member) }}
                                  accessToken={user.accessToken}
                                  isSubordinate
                                  onViewReport={handleViewReport}
                                />
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Direct subordinates (no leader connection) */}
                {directSubs.length > 0 && (
                  <>
                    <div className="bg-slate-700/40 mt-4" style={{ width: 1, height: V_GAP }} />
                    <div className="relative flex items-start" style={{ gap: H_GAP }}>
                      {directSubs.length > 1 && (() => {
                        const totalWidth = directSubs.length * NODE_W + (directSubs.length - 1) * H_GAP;
                        return (
                          <div
                            className="absolute bg-slate-700/40 pointer-events-none"
                            style={{ top: -1, left: NODE_W / 2, width: totalWidth - NODE_W, height: 1 }}
                          />
                        );
                      })()}
                      {directSubs.map((sub, idx) => (
                        <div key={sub.username || idx} className="flex flex-col items-center">
                          <div className="bg-slate-700/40" style={{ width: 1, height: CONNECTOR_H }} />
                          <PersonNode
                            node={{ ...sub, isActiveUser: false, colorStyle: getNodeColorStyle(sub) }}
                            accessToken={user.accessToken}
                            isSubordinate
                            onViewReport={handleViewReport}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              /* Flat subordinate list (non-manager roles) */
              <div className="relative flex items-start" style={{ gap: H_GAP }}>
                {subordinates.length > 1 && (() => {
                  const totalWidth = subordinates.length * NODE_W + (subordinates.length - 1) * H_GAP;
                  return (
                    <div
                      className="absolute bg-slate-700/60 pointer-events-none"
                      style={{ top: -1, left: NODE_W / 2, width: totalWidth - NODE_W, height: 1 }}
                    />
                  );
                })()}
                {subordinates.map((sub, idx) => (
                  <div key={sub.username || idx} className="flex flex-col items-center">
                    <div className="bg-slate-700/60" style={{ width: 1, height: CONNECTOR_H }} />
                    <PersonNode
                      node={{ ...sub, isActiveUser: false, colorStyle: getNodeColorStyle(sub) }}
                      accessToken={user.accessToken}
                      isSubordinate
                      onViewReport={handleViewReport}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>

      {/* Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-white font-black text-lg">{reportModal.fullName}</h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {getWeekLabel(selectedWeek)} · Haftalık Rapor
                </p>
              </div>
              <button
                onClick={() => setReportModal(null)}
                className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {reportModal.loading && (
                <div className="flex items-center justify-center h-32">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {reportModal.notFound && (
                <div className="flex flex-col items-center justify-center h-32 gap-3">
                  <div className="text-4xl">📭</div>
                  <p className="text-slate-400 text-sm font-bold">Bu hafta için rapor bulunamadı.</p>
                  <p className="text-slate-600 text-xs">{reportModal.fullName} henüz bu haftaki raporunu kaydetmemiş.</p>
                </div>
              )}

              {reportModal.error && (
                <div className="text-red-400 text-sm p-4 bg-red-900/20 rounded-xl border border-red-500/20">
                  Hata: {reportModal.error}
                </div>
              )}

              {reportModal.data && !reportModal.loading && (
                <div className="space-y-1">
                  {reportModal.data.instructions?.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/20 rounded-xl">
                      {reportModal.data.instructions.map((inst, i) => (
                        <p key={i} className="text-blue-300 text-xs">{inst}</p>
                      ))}
                    </div>
                  )}
                  {reportModal.data.bullet_lines?.map((line, idx) => {
                    if (line.bullet0) {
                      return (
                        <div key={idx} className="mt-4 mb-2">
                          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            ══ {line.bullet0} ══
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div key={idx}>
                        {line.bullet1?.map((b1, i) => (
                          <p key={i} className="text-slate-200 text-xs font-bold pl-0">• {b1}</p>
                        ))}
                        {line.bullet2?.map((b2, i) => (
                          <p key={i} className="text-slate-300 text-xs pl-4">– {b2}</p>
                        ))}
                        {line.bullet3?.map((b3, i) => (
                          <p key={i} className="text-slate-400 text-xs pl-8">· {b3}</p>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

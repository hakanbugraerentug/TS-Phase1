
import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../App';
import { UserAvatar } from './UserAvatar';

// ─── Constants ───────────────────────────────────────────────────────────────

const NODE_W = 200;
const NODE_H = 88;
const H_GAP = 24;
const V_GAP = 56;
const CONNECTOR_H = 28;
const MAX_PER_ROW = 5;

// ─── Layer Color Palette ─────────────────────────────────────────────────────
// Each hierarchical layer gets its own distinct color.

const LAYER_COLORS = {
  manager:     { bg: 'bg-amber-900/60',   border: 'border-amber-500',   text: 'text-amber-300',   dot: 'bg-amber-500',   connector: 'bg-amber-700/60',   hex: '#f59e0b', label: 'Yöneticiler' },
  teamLeader:  { bg: 'bg-violet-900/60',  border: 'border-violet-500',  text: 'text-violet-300',  dot: 'bg-violet-500',  connector: 'bg-violet-700/60',  hex: '#8b5cf6', label: 'Ekip Liderleri' },
  sibling:     { bg: 'bg-slate-800/80',   border: 'border-slate-600',   text: 'text-slate-300',   dot: 'bg-slate-500',   connector: 'bg-slate-700',      hex: '#64748b', label: 'Aynı Seviye' },
  subordinate: { bg: 'bg-emerald-900/60', border: 'border-emerald-500', text: 'text-emerald-300', dot: 'bg-emerald-500', connector: 'bg-emerald-700/40', hex: '#10b981', label: 'Astlar' },
  teamMember:  { bg: 'bg-rose-900/60',    border: 'border-rose-500',    text: 'text-rose-300',    dot: 'bg-rose-500',    connector: 'bg-rose-700/40',    hex: '#f43f5e', label: 'Ekip Üyeleri' },
} as const;

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
  teamLabels?: string[];
}

interface TeamDto {
  id: string;
  title: string;
  description: string;
  leader: string;
  members: string[];
  projectId: string;
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

function flattenManagerChain(node: OrgChartData): OrgChartData[] {
  const chain: OrgChartData[] = [];
  let cur: OrgChartData | null | undefined = node.manager;
  while (cur) {
    chain.unshift(cur);
    cur = cur.manager;
  }
  return chain;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
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
  allTeams?: TeamDto[];
}

const PersonNode: React.FC<PersonNodeProps> = ({ node, accessToken, allTeams }) => {
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
      {node.teamLabels && node.teamLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {node.teamLabels.map((label, i) => (
            <span key={i} className="text-[8px] font-black bg-violet-500/20 text-violet-300 border border-violet-500/40 px-2 py-0.5 rounded-full">
              🔗 {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── NodeRow ─────────────────────────────────────────────────────────────────
// Renders a list of nodes in wrapped rows, max MAX_PER_ROW per row.

interface NodeRowProps {
  nodes: NodeData[];
  connectorClass: string;
  accessToken: string;
  allTeams?: TeamDto[];
}

const NodeRow: React.FC<NodeRowProps> = ({ nodes, connectorClass, accessToken, allTeams }) => {
  const chunks = chunkArray<NodeData>(nodes, MAX_PER_ROW);
  return (
    <div className="flex flex-col items-center">
      {chunks.map((chunk, ci) => (
        <React.Fragment key={ci}>
          {ci > 0 && <div className={connectorClass} style={{ width: 1, height: V_GAP }} />}
          <div className="relative flex items-start" style={{ gap: H_GAP }}>
            {chunk.length > 1 && (() => {
              const totalWidth = chunk.length * NODE_W + (chunk.length - 1) * H_GAP;
              return (
                <div
                  className={`absolute pointer-events-none ${connectorClass}`}
                  style={{ top: -1, left: NODE_W / 2, width: totalWidth - NODE_W, height: 1 }}
                />
              );
            })()}
            {chunk.map((node, idx) => (
              <div key={node.username || idx} className="flex flex-col items-center">
                <div className={connectorClass} style={{ width: 1, height: CONNECTOR_H }} />
                <PersonNode
                  node={node}
                  accessToken={accessToken}
                  allTeams={allTeams}
                />
              </div>
            ))}
          </div>
        </React.Fragment>
      ))}
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

  // Role detection only — layer colors are now fixed per level
  const roleType = useMemo((): RoleType => {
    if (!orgData) return 'other';
    return detectRole(orgData.title);
  }, [orgData]);

  // Leader layer computations — kept before early returns so hooks are unconditional
  const isDeptManagerPre = roleType === 'department_manager';
  const leaderSubsPre = isDeptManagerPre
    ? subordinates.filter(s => allTeams.some(t => t.leader === s.username))
    : [];
  const nonLeaderSubsPre = isDeptManagerPre
    ? subordinates.filter(s => !allTeams.some(t => t.leader === s.username))
    : subordinates;
  const hasLeaderLayerPre = isDeptManagerPre && leaderSubsPre.length > 0;

  // For engineers: find teams where this user is a member and surface their leaders
  interface TeamLeaderInfo {
    user: OrgUser;
    teamTitles: string[];
  }

  const myTeamLeaderInfos = useMemo((): TeamLeaderInfo[] => {
    if (!orgData || roleType !== 'other') return [];
    const leaderMap = new Map<string, string[]>();
    for (const team of allTeams) {
      if (team.members.includes(orgData.username) && team.leader !== orgData.username) {
        const titles = leaderMap.get(team.leader) || [];
        titles.push(team.title);
        leaderMap.set(team.leader, titles);
      }
    }
    const result: TeamLeaderInfo[] = [];
    for (const [leaderUsername, teamTitles] of leaderMap.entries()) {
      const leaderUser = allUsers.find(u => u.username === leaderUsername);
      if (leaderUser) result.push({ user: leaderUser, teamTitles });
    }
    return result;
  }, [orgData, allTeams, allUsers, roleType]);

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

  // Manager chain
  const managerChain = flattenManagerChain(orgData);

  // Siblings split — active user centered (when total fits in a row)
  const siblings = orgData.siblings;
  const totalSiblingRow = siblings.length + 1;
  const centeringActive = totalSiblingRow <= MAX_PER_ROW;
  const leftSiblings = centeringActive ? siblings.slice(0, Math.ceil(siblings.length / 2)) : [];
  const rightSiblings = centeringActive ? siblings.slice(Math.ceil(siblings.length / 2)) : [];
  // When too many siblings, render all together with wrapping (active user first)
  const allSiblingNodes: NodeData[] = centeringActive
    ? []
    : [
        { ...orgData, isActiveUser: true },
        ...siblings.map(s => ({ ...s, isActiveUser: false, colorStyle: { bg: LAYER_COLORS.sibling.bg, border: LAYER_COLORS.sibling.border, text: LAYER_COLORS.sibling.text } })),
      ];

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

  // Build the legend layers visible in this chart (no duplicates)
  const showTeamLeader = myTeamLeaderInfos.length > 0 || hasLeaderLayer;
  const legendLayers: Array<{ key: keyof typeof LAYER_COLORS; label: string }> = [
    { key: 'manager', label: LAYER_COLORS.manager.label },
    ...(showTeamLeader ? [{ key: 'teamLeader' as const, label: LAYER_COLORS.teamLeader.label }] : []),
    ...(siblings.length > 0 ? [{ key: 'sibling' as const, label: LAYER_COLORS.sibling.label }] : []),
    ...(hasSubordinates ? [{ key: 'subordinate' as const, label: LAYER_COLORS.subordinate.label }] : []),
    ...(hasLeaderLayer ? [{ key: 'teamMember' as const, label: LAYER_COLORS.teamMember.label }] : []),
  ];

  return (
    <div className="relative w-full h-[calc(100vh-180px)] overflow-auto">
      {/* Top-right panel: legend */}
      <div className="absolute top-6 right-6 z-20 flex flex-col gap-3">
        {/* Legend — hierarchical layers */}
        {legendLayers.length > 0 && (
          <div className="bg-[#1e293b]/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-2 min-w-[180px]">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Renk Göstergesi</p>
            {/* Active user row */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0 bg-blue-500" />
              <span className="text-[10px] font-bold text-slate-300 italic truncate">Sen</span>
            </div>
            {legendLayers.map(l => (
              <div key={l.key} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${LAYER_COLORS[l.key].dot}`} />
                <span className="text-[10px] font-bold text-slate-300 italic truncate">{l.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tree */}
      <div className="min-w-max min-h-max flex flex-col items-center py-12 px-16">

        {/* Manager chain — amber layer */}
        {managerChain.map((mgr, idx) => (
          <React.Fragment key={mgr.username || idx}>
            <PersonNode
              node={{ ...mgr, isActiveUser: false, colorStyle: { bg: LAYER_COLORS.manager.bg, border: LAYER_COLORS.manager.border, text: LAYER_COLORS.manager.text } }}
              accessToken={user.accessToken}
            />
            <div
              className={LAYER_COLORS.manager.connector}
              style={{ width: 1, height: V_GAP + CONNECTOR_H }}
            />
          </React.Fragment>
        ))}

        {/* Intermediate team-leader layer (engineer case) — violet layer */}
        {myTeamLeaderInfos.length > 0 && (
          <>
            <NodeRow
              nodes={myTeamLeaderInfos.map(info => ({
                ...info.user,
                isActiveUser: false,
                colorStyle: { bg: LAYER_COLORS.teamLeader.bg, border: LAYER_COLORS.teamLeader.border, text: LAYER_COLORS.teamLeader.text },
                teamLabels: info.teamTitles,
              }))}
              connectorClass={LAYER_COLORS.teamLeader.connector}
              accessToken={user.accessToken}
            />
            <div className={LAYER_COLORS.teamLeader.connector} style={{ width: 1, height: V_GAP }} />
          </>
        )}

        {/* Sibling row — slate layer for siblings, blue for active user */}
        {centeringActive ? (
          <div className="relative flex items-start" style={{ gap: H_GAP }}>
            {siblings.length > 0 && (() => {
              const totalNodes = siblings.length + 1;
              const totalWidth = totalNodes * NODE_W + (totalNodes - 1) * H_GAP;
              return (
                <div
                  className={`absolute ${LAYER_COLORS.sibling.connector} pointer-events-none`}
                  style={{ top: -1, left: NODE_W / 2, width: totalWidth - NODE_W, height: 1 }}
                />
              );
            })()}

            {/* Left siblings */}
            {leftSiblings.map((s, idx) => (
              <div key={s.username || idx} className="flex flex-col items-center">
                <div className={LAYER_COLORS.sibling.connector} style={{ width: 1, height: CONNECTOR_H }} />
                <PersonNode
                  node={{ ...s, isActiveUser: false, colorStyle: { bg: LAYER_COLORS.sibling.bg, border: LAYER_COLORS.sibling.border, text: LAYER_COLORS.sibling.text } }}
                  accessToken={user.accessToken}
                />
              </div>
            ))}

            {/* Active user */}
            <div className="flex flex-col items-center">
              <div className="bg-blue-500/60" style={{ width: 1, height: CONNECTOR_H }} />
              <PersonNode node={{ ...orgData, isActiveUser: true }} accessToken={user.accessToken} />
            </div>

            {/* Right siblings */}
            {rightSiblings.map((s, idx) => (
              <div key={s.username || idx} className="flex flex-col items-center">
                <div className={LAYER_COLORS.sibling.connector} style={{ width: 1, height: CONNECTOR_H }} />
                <PersonNode
                  node={{ ...s, isActiveUser: false, colorStyle: { bg: LAYER_COLORS.sibling.bg, border: LAYER_COLORS.sibling.border, text: LAYER_COLORS.sibling.text } }}
                  accessToken={user.accessToken}
                />
              </div>
            ))}
          </div>
        ) : (
          /* Too many siblings — wrapped rows, active user first */
          <NodeRow
            nodes={allSiblingNodes}
            connectorClass={LAYER_COLORS.sibling.connector}
            accessToken={user.accessToken}
          />
        )}

        {/* Subordinates */}
        {hasSubordinates && (
          <>
            {/* Vertical line from active user down */}
            <div className={LAYER_COLORS.subordinate.connector} style={{ width: 1, height: V_GAP }} />

            {hasLeaderLayer ? (
              <>
                {/* Leader layer — violet */}
                <NodeRow
                  nodes={leaderSubs.map(ls => ({
                    ...ls,
                    isActiveUser: false,
                    colorStyle: { bg: LAYER_COLORS.teamLeader.bg, border: LAYER_COLORS.teamLeader.border, text: LAYER_COLORS.teamLeader.text },
                  }))}
                  connectorClass={LAYER_COLORS.teamLeader.connector}
                  accessToken={user.accessToken}
                  allTeams={allTeams}
                />

                {/* Each leader's team members — rose */}
                {leaderSubs.map(ls => {
                  const members = membersByLeader.get(ls.username) || [];
                  if (members.length === 0) return null;
                  return (
                    <React.Fragment key={ls.username}>
                      <div className={LAYER_COLORS.teamMember.connector} style={{ width: 1, height: V_GAP }} />
                      <NodeRow
                        nodes={members.map(m => ({
                          ...m,
                          isActiveUser: false,
                          colorStyle: { bg: LAYER_COLORS.teamMember.bg, border: LAYER_COLORS.teamMember.border, text: LAYER_COLORS.teamMember.text },
                        }))}
                        connectorClass={LAYER_COLORS.teamMember.connector}
                        accessToken={user.accessToken}
                        allTeams={allTeams}
                      />
                    </React.Fragment>
                  );
                })}

                {/* Direct subordinates (no leader connection) — emerald */}
                {directSubs.length > 0 && (
                  <>
                    <div className={`${LAYER_COLORS.subordinate.connector} mt-4`} style={{ width: 1, height: V_GAP }} />
                    <NodeRow
                      nodes={directSubs.map(sub => ({
                        ...sub,
                        isActiveUser: false,
                        colorStyle: { bg: LAYER_COLORS.subordinate.bg, border: LAYER_COLORS.subordinate.border, text: LAYER_COLORS.subordinate.text },
                      }))}
                      connectorClass={LAYER_COLORS.subordinate.connector}
                      accessToken={user.accessToken}
                    />
                  </>
                )}
              </>
            ) : (
              /* Flat subordinate list (non-manager roles) — emerald */
              <NodeRow
                nodes={subordinates.map(sub => ({
                  ...sub,
                  isActiveUser: false,
                  colorStyle: { bg: LAYER_COLORS.subordinate.bg, border: LAYER_COLORS.subordinate.border, text: LAYER_COLORS.subordinate.text },
                }))}
                connectorClass={LAYER_COLORS.subordinate.connector}
                accessToken={user.accessToken}
              />
            )}
          </>
        )}

      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User } from '../App';
import { UserAvatar } from './UserAvatar';

interface AppUser {
  username: string;
  fullName: string;
}

interface OrgUserFull {
  username: string;
  fullName: string;
  title: string;
  department: string;
  distinguishedName: string;
  manager: string;
}

interface ProjectTeam {
  id: string;
  title: string;
  leader: string;
  members: string[];
}

interface WeeklyReportDto {
  id: string;
  username: string;
  weekStart: string;
  reportData: unknown;
  savedAt: string;
  author: string;
  reviewer: string;
  readyToReview: boolean;
  status: string;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const NODE_W = 200;
const NODE_H = 110;
const H_GAP = 24;
const V_GAP = 56;
const CONNECTOR_H = 28;
const MAX_PER_ROW = 5;

// ─── Layer color palette ──────────────────────────────────────────────────────

const LAYER_COLORS = {
  owner:      { bg: 'bg-amber-900/60',   border: 'border-amber-500',   text: 'text-amber-300',   dot: 'bg-amber-500',   connector: 'bg-amber-700/60',   label: 'Proje Sahibi' },
  teamLeader: { bg: 'bg-violet-900/60',  border: 'border-violet-500',  text: 'text-violet-300',  dot: 'bg-violet-500',  connector: 'bg-violet-700/60',  label: 'Ekip Liderleri' },
  teamMember: { bg: 'bg-rose-900/60',    border: 'border-rose-500',    text: 'text-rose-300',    dot: 'bg-rose-500',    connector: 'bg-rose-700/40',    label: 'Ekip Üyeleri' },
  member:     { bg: 'bg-emerald-900/60', border: 'border-emerald-500', text: 'text-emerald-300', dot: 'bg-emerald-500', connector: 'bg-emerald-700/40', label: 'Proje Üyeleri' },
} as const;

// ─── Utility ──────────────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// ─── Week helpers ─────────────────────────────────────────────────────────────

const getWeekStart = (d: Date): Date => {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const toWeekStartStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatWeekLabel = (monday: Date): string => {
  const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  const yearOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return `${monday.toLocaleDateString('tr-TR', opts)} – ${sunday.toLocaleDateString('tr-TR', yearOpts)}`;
};

// ─── Report content renderer ──────────────────────────────────────────────────

const renderReportData = (data: unknown): React.ReactNode => {
  if (data == null) return <p className="text-slate-500 italic text-sm">Rapor verisi bulunamadı.</p>;

  if (typeof data === 'string') {
    return <pre className="text-slate-300 text-xs whitespace-pre-wrap font-mono">{data}</pre>;
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    if ('title' in obj || 'bullet_lines' in obj) {
      return (
        <div className="space-y-4">
          {obj['title'] && (
            <h3 className="text-lg font-black text-slate-200 tracking-wide">{String(obj['title'])}</h3>
          )}
          {Array.isArray(obj['instructions']) && (obj['instructions'] as string[]).length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Talimatlar</p>
              <ul className="space-y-1">
                {(obj['instructions'] as string[]).map((instr, i) => (
                  <li key={i} className="text-slate-400 text-sm">• {instr}</li>
                ))}
              </ul>
            </div>
          )}
          {Array.isArray(obj['bullet_lines']) && (obj['bullet_lines'] as unknown[]).length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Rapor İçeriği</p>
              <div className="space-y-1">
                {(obj['bullet_lines'] as Record<string, unknown>[]).map((line, i) => (
                  <div key={i} className="space-y-0.5">
                    {line['bullet0'] && (
                      <p className="text-slate-200 text-sm font-bold">{String(line['bullet0'])}</p>
                    )}
                    {Array.isArray(line['bullet1']) && (line['bullet1'] as string[]).map((b, j) => (
                      <p key={j} className="text-slate-400 text-sm pl-4">• {b}</p>
                    ))}
                    {Array.isArray(line['bullet2']) && (line['bullet2'] as string[]).map((b, j) => (
                      <p key={j} className="text-slate-500 text-xs pl-8">– {b}</p>
                    ))}
                    {Array.isArray(line['bullet3']) && (line['bullet3'] as string[]).map((b, j) => (
                      <p key={j} className="text-slate-600 text-xs pl-12">· {b}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <pre className="text-slate-300 text-xs whitespace-pre-wrap font-mono bg-black/20 p-4 rounded-xl overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  return <p className="text-slate-400 text-sm">{String(data)}</p>;
};

// ─── Status color helper ─────────────────────────────────────────────────────

interface StatusColors {
  border: string;
  bg: string;
  dot: string;
  pill: string;
  pillText: string;
}

const getStatusColors = (report: WeeklyReportDto | null | undefined): StatusColors => {
  if (!report) {
    return {
      border: 'border-red-500/60',
      bg: 'bg-red-950/15',
      dot: 'bg-red-500',
      pill: 'text-red-400 bg-red-500/10 border-red-500/20',
      pillText: 'Rapor Yok',
    };
  }
  if (report.status === 'reviewed') {
    return {
      border: 'border-emerald-500/60',
      bg: 'bg-emerald-900/10',
      dot: 'bg-emerald-400',
      pill: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      pillText: 'İncelendi',
    };
  }
  if (report.readyToReview) {
    return {
      border: 'border-amber-500/60',
      bg: 'bg-amber-900/10',
      dot: 'bg-amber-400',
      pill: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      pillText: 'İncelemede',
    };
  }
  // draft / generated / manual – saved but not yet submitted
  return {
    border: 'border-blue-500/60',
    bg: 'bg-blue-900/10',
    dot: 'bg-blue-400',
    pill: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    pillText: 'Taslak',
  };
};

// ─── ProjectPersonNode ────────────────────────────────────────────────────────
// A single org-chart card showing avatar, name, title and report status.

type LayerColor = typeof LAYER_COLORS[keyof typeof LAYER_COLORS];

const ProjectPersonNode: React.FC<{
  username: string;
  orgUser: OrgUserFull | undefined;
  displayName: string;
  report: WeeklyReportDto | null | undefined;
  colorStyle: LayerColor;
  onViewReport: (username: string) => void;
  accessToken: string;
  isOwner?: boolean;
  teamTitle?: string;
}> = ({ username, orgUser, displayName, report, colorStyle, onViewReport, accessToken, isOwner, teamTitle }) => {
  const statusColors = getStatusColors(report);

  return (
    <div
      onClick={() => onViewReport(username)}
      className={`rounded-2xl border-2 p-3 flex flex-col gap-2 cursor-pointer transition-all hover:brightness-125
        ${colorStyle.bg} ${colorStyle.border}`}
      style={{ width: NODE_W, minHeight: NODE_H }}
    >
      {/* Avatar + name row */}
      <div className="flex items-center gap-2">
        <UserAvatar
          username={username}
          displayName={displayName}
          accessToken={accessToken}
          size="sm"
          className="flex-shrink-0"
        />
        <div className="overflow-hidden flex-1 min-w-0">
          <p className={`font-black text-xs italic truncate ${colorStyle.text}`}>
            {displayName}
          </p>
          <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest truncate">
            {orgUser?.title || '—'}
          </p>
          {orgUser?.department && (
            <p className="text-slate-600 text-[8px] truncate">{orgUser.department}</p>
          )}
        </div>
        {isOwner && (
          <span className="flex-shrink-0 text-[7px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
            Sahip
          </span>
        )}
      </div>

      {/* Report status */}
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors.dot}`} />
        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusColors.pill}`}>
          {statusColors.pillText}
        </span>
      </div>

      {/* Team badge (leader only) */}
      {teamTitle && (
        <span className="text-[8px] font-black bg-violet-500/20 text-violet-300 border border-violet-500/40 px-2 py-0.5 rounded-full truncate">
          👑 {teamTitle}
        </span>
      )}
    </div>
  );
};

// ─── ProjectNodeRow ───────────────────────────────────────────────────────────
// Renders a horizontal row of ProjectPersonNode cards with connector lines.

const ProjectNodeRow: React.FC<{
  usernames: string[];
  orgUsers: OrgUserFull[];
  allUsers: AppUser[];
  userReports: Record<string, WeeklyReportDto | null>;
  colorStyle: LayerColor;
  onViewReport: (username: string) => void;
  accessToken: string;
  teamTitleByUsername?: Record<string, string>;
}> = ({ usernames, orgUsers, allUsers, userReports, colorStyle, onViewReport, accessToken, teamTitleByUsername }) => {
  const chunks = chunkArray(usernames, MAX_PER_ROW);
  const getDisplayName = (u: string) => allUsers.find(a => a.username === u)?.fullName ?? u;
  const getOrgUser = (u: string) => orgUsers.find(a => a.username === u);

  return (
    <div className="flex flex-col items-center">
      {chunks.map((chunk, ci) => (
        <React.Fragment key={ci}>
          {ci > 0 && <div className={colorStyle.connector} style={{ width: 1, height: V_GAP }} />}
          <div className="relative flex items-start" style={{ gap: H_GAP }}>
            {/* Horizontal connector bar */}
            {chunk.length > 1 && (() => {
              const totalWidth = chunk.length * NODE_W + (chunk.length - 1) * H_GAP;
              return (
                <div
                  className={`absolute pointer-events-none ${colorStyle.connector}`}
                  style={{ top: -1, left: NODE_W / 2, width: totalWidth - NODE_W, height: 1 }}
                />
              );
            })()}
            {chunk.map((username, idx) => (
              <div key={username || idx} className="flex flex-col items-center">
                <div className={colorStyle.connector} style={{ width: 1, height: CONNECTOR_H }} />
                <ProjectPersonNode
                  username={username}
                  orgUser={getOrgUser(username)}
                  displayName={getDisplayName(username)}
                  report={userReports[username]}
                  colorStyle={colorStyle}
                  onViewReport={onViewReport}
                  accessToken={accessToken}
                  teamTitle={teamTitleByUsername?.[username]}
                />
              </div>
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ProjectReportsTab: React.FC<{
  projectOwner: string;
  projectMembers: string[];
  ilgiliEkipIdleri?: string[];
  allUsers: AppUser[];
  user: User;
  apiUrl: string;
}> = ({ projectOwner, projectMembers, ilgiliEkipIdleri = [], allUsers, user, apiUrl }) => {
  const [selectedWeek, setSelectedWeek] = useState<Date>(() => getWeekStart(new Date()));
  const [weekFilterOpen, setWeekFilterOpen] = useState(false);
  const weekFilterRef = useRef<HTMLDivElement | null>(null);

  const [popupUsername, setPopupUsername] = useState<string | null>(null);
  const [userReports, setUserReports] = useState<Record<string, WeeklyReportDto | null>>({});
  const [fetching, setFetching] = useState(false);

  const [orgUsers, setOrgUsers] = useState<OrgUserFull[]>([]);
  const [projectTeams, setProjectTeams] = useState<ProjectTeam[]>([]);

  // Last 12 weeks (newest first)
  const availableWeeks = useMemo(() => {
    const weeks: Date[] = [];
    const current = getWeekStart(new Date());
    for (let i = 0; i < 12; i++) {
      weeks.push(new Date(current.getTime() - i * 7 * 24 * 60 * 60 * 1000));
    }
    return weeks;
  }, []);

  // Derive unique team leaders (excluding owner to avoid duplication)
  const uniqueLeaders = useMemo(() => {
    const seen = new Set<string>();
    const leaders: string[] = [];
    for (const team of projectTeams) {
      if (team.leader && !seen.has(team.leader) && team.leader !== projectOwner) {
        seen.add(team.leader);
        leaders.push(team.leader);
      }
    }
    return leaders;
  }, [projectTeams, projectOwner]);

  // Map leader username → team title (for badge on leader node)
  const teamTitleByLeader = useMemo(() => {
    const map: Record<string, string> = {};
    for (const team of projectTeams) {
      if (team.leader && !map[team.leader]) {
        map[team.leader] = team.title;
      }
    }
    return map;
  }, [projectTeams]);

  // Collect all unique personnel from teams + owner for report fetching
  const accessUsers = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    const add = (u: string) => { if (u && !seen.has(u)) { seen.add(u); list.push(u); } };

    add(projectOwner);

    if (projectTeams.length > 0) {
      // Use team-based personnel
      for (const team of projectTeams) {
        add(team.leader);
        for (const m of team.members) add(m);
      }
    } else {
      // Fallback: use projectMembers when no teams are linked yet
      for (const m of projectMembers) add(m);
    }
    return list;
  }, [projectOwner, projectTeams, projectMembers]);

  const getUserInfo = (username: string): AppUser =>
    allUsers.find(u => u.username === username) ?? { username, fullName: username };

  // Fetch reports for all personnel when week or user list changes
  useEffect(() => {
    if (accessUsers.length === 0) return;
    let cancelled = false;
    const fetchReports = async () => {
      setFetching(true);
      const weekStr = toWeekStartStr(selectedWeek);
      const results: Record<string, WeeklyReportDto | null> = {};
      await Promise.all(
        accessUsers.map(async (username) => {
          try {
            const res = await fetch(
              `${apiUrl}/api/weekly-reports/by-user?username=${encodeURIComponent(username)}&weekStart=${weekStr}`,
              { headers: { Authorization: `Bearer ${user.accessToken}` } }
            );
            results[username] = res.ok ? await res.json() : null;
          } catch {
            results[username] = null;
          }
        })
      );
      if (!cancelled) {
        setUserReports(results);
        setFetching(false);
      }
    };
    fetchReports();
    return () => { cancelled = true; };
  }, [selectedWeek, accessUsers, apiUrl, user.accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close week dropdown on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (weekFilterRef.current && !weekFilterRef.current.contains(e.target as Node)) {
        setWeekFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Fetch org users (for title / department info on each node)
  useEffect(() => {
    let cancelled = false;
    const fetchOrgUsers = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/users/all-org`, {
          headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setOrgUsers(Array.isArray(data) ? data : []);
        }
      } catch {
        // non-critical
      }
    };
    fetchOrgUsers();
    return () => { cancelled = true; };
  }, [apiUrl, user.accessToken]);

  // Fetch teams registered to this project
  useEffect(() => {
    if (ilgiliEkipIdleri.length === 0) return;
    let cancelled = false;
    const fetchTeams = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/teams`, {
          headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        if (res.ok && !cancelled) {
          const data: ProjectTeam[] = await res.json();
          setProjectTeams(Array.isArray(data) ? data.filter(t => ilgiliEkipIdleri.includes(t.id)) : []);
        }
      } catch {
        // non-critical
      }
    };
    fetchTeams();
    return () => { cancelled = true; };
  }, [ilgiliEkipIdleri, apiUrl, user.accessToken]);

  const popupReport = popupUsername !== null ? userReports[popupUsername] : undefined;
  const popupUser = popupUsername ? getUserInfo(popupUsername) : null;

  const totalPersonnel = accessUsers.length;

  // Derived flags used in both legend and rendering
  const teamsWithMembers = useMemo(
    () => projectTeams.filter(t => t.members.some(m => m !== t.leader && m !== projectOwner)),
    [projectTeams, projectOwner]
  );

  return (
    <div className="flex-1 overflow-y-auto pr-1">
      {/* Top bar: description + week selector */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
          Organizasyonel Şema · {totalPersonnel} personel
        </p>

        {/* Week selector */}
        <div ref={weekFilterRef} className="relative">
          <button
            onClick={() => setWeekFilterOpen(prev => !prev)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-slate-300 uppercase tracking-widest transition-all"
          >
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatWeekLabel(selectedWeek)}
            <svg className={`w-3 h-3 transition-transform ${weekFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {weekFilterOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 min-w-[240px] bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {availableWeeks.map(ws => {
                const isSelected = toWeekStartStr(ws) === toWeekStartStr(selectedWeek);
                return (
                  <button
                    key={toWeekStartStr(ws)}
                    onClick={() => { setSelectedWeek(ws); setWeekFilterOpen(false); }}
                    className={`w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                      isSelected ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {formatWeekLabel(ws)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Loading */}
      {fetching ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : accessUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-40">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Projeye kayıtlı personel bulunamadı
          </p>
        </div>
      ) : (
        /* ── Org chart layout ────────────────────────────────────── */
        <div className="relative">
          {/* Legend */}
          <div className="absolute top-0 right-0 z-10 bg-[#1e293b]/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-2 min-w-[160px]">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Renk Göstergesi</p>
            {([
              { key: 'owner', show: true },
              { key: 'teamLeader', show: uniqueLeaders.length > 0 },
              { key: 'teamMember', show: teamsWithMembers.length > 0 },
              { key: 'member', show: projectTeams.length === 0 },
            ] as const).filter(l => l.show).map(l => (
              <div key={l.key} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${LAYER_COLORS[l.key].dot}`} />
                <span className="text-[10px] font-bold text-slate-300 italic">{LAYER_COLORS[l.key].label}</span>
              </div>
            ))}
            <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5">
              {[
                { dot: 'bg-emerald-400', label: 'İncelendi' },
                { dot: 'bg-amber-400',   label: 'İncelemede' },
                { dot: 'bg-blue-400',    label: 'Taslak' },
                { dot: 'bg-red-500',     label: 'Rapor Yok' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                  <span className="text-[9px] text-slate-400">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tree canvas */}
          <div className="overflow-auto">
            <div className="min-w-max min-h-max flex flex-col items-center py-12 px-16">

              {/* ── Level 1: Project owner ── */}
              <ProjectPersonNode
                username={projectOwner}
                orgUser={orgUsers.find(u => u.username === projectOwner)}
                displayName={getUserInfo(projectOwner).fullName || projectOwner}
                report={userReports[projectOwner]}
                colorStyle={LAYER_COLORS.owner}
                onViewReport={setPopupUsername}
                accessToken={user.accessToken}
                isOwner={true}
              />

              {projectTeams.length > 0 ? (
                <>
                  {/* ── Level 2: Team leaders ── */}
                  {uniqueLeaders.length > 0 && (
                    <>
                      <div className={LAYER_COLORS.teamLeader.connector} style={{ width: 1, height: V_GAP }} />
                      <ProjectNodeRow
                        usernames={uniqueLeaders}
                        orgUsers={orgUsers}
                        allUsers={allUsers}
                        userReports={userReports}
                        colorStyle={LAYER_COLORS.teamLeader}
                        onViewReport={setPopupUsername}
                        accessToken={user.accessToken}
                        teamTitleByUsername={teamTitleByLeader}
                      />
                    </>
                  )}

                  {/* ── Level 3: Team members (grouped per team) ── */}
                  {teamsWithMembers.map(team => {
                    const members = team.members.filter(m => m !== team.leader && m !== projectOwner);
                    if (members.length === 0) return null;
                    return (
                      <React.Fragment key={team.id}>
                        <div className={LAYER_COLORS.teamMember.connector} style={{ width: 1, height: V_GAP / 2 }} />
                        {/* Team label */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-px w-8 bg-violet-500/40" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-violet-400 bg-violet-900/40 border border-violet-500/30 px-3 py-1 rounded-full">
                            {team.title}
                          </span>
                          <div className="h-px w-8 bg-violet-500/40" />
                        </div>
                        <ProjectNodeRow
                          usernames={members}
                          orgUsers={orgUsers}
                          allUsers={allUsers}
                          userReports={userReports}
                          colorStyle={LAYER_COLORS.teamMember}
                          onViewReport={setPopupUsername}
                          accessToken={user.accessToken}
                        />
                      </React.Fragment>
                    );
                  })}
                </>
              ) : (
                /* ── Fallback: project members (no teams linked) ── */
                <>
                  {projectMembers.filter(m => m !== projectOwner).length > 0 && (
                    <>
                      <div className={LAYER_COLORS.member.connector} style={{ width: 1, height: V_GAP }} />
                      <ProjectNodeRow
                        usernames={projectMembers.filter(m => m !== projectOwner)}
                        orgUsers={orgUsers}
                        allUsers={allUsers}
                        userReports={userReports}
                        colorStyle={LAYER_COLORS.member}
                        onViewReport={setPopupUsername}
                        accessToken={user.accessToken}
                      />
                    </>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Report popup modal */}
      {popupUsername !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPopupUsername(null)}
        >
          <div
            className="bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <UserAvatar
                  username={popupUsername}
                  displayName={popupUser?.fullName || popupUsername}
                  accessToken={user.accessToken}
                  size="md"
                />
                <div>
                  <p className="text-white font-black text-sm italic">{popupUser?.fullName || popupUsername}</p>
                  <p className="text-slate-500 text-[9px] uppercase tracking-widest">{popupUsername} · {formatWeekLabel(selectedWeek)}</p>
                </div>
              </div>
              <button
                onClick={() => setPopupUsername(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {popupReport === null || popupReport === undefined ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Bu hafta rapor yazılmamış</p>
                    <p className="text-slate-600 text-xs mt-1">{formatWeekLabel(selectedWeek)}</p>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Status badge row */}
                  <div className="flex items-center gap-2 mb-5">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                      popupReport.status === 'reviewed'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : popupReport.readyToReview
                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                    }`}>
                      {popupReport.status === 'reviewed'
                        ? 'İncelendi'
                        : popupReport.readyToReview
                        ? 'İncelemede'
                        : 'Taslak'}
                    </span>
                    {popupReport.savedAt && (
                      <span className="text-[9px] text-slate-600">
                        Kaydedildi: {new Date(popupReport.savedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {/* Report content */}
                  {renderReportData(popupReport.reportData)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

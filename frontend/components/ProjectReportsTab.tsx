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

interface ReportTreeNode {
  username: string;
  children: ReportTreeNode[];
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

// ─── Tree builder ─────────────────────────────────────────────────────────────

function buildReportTree(accessUsernames: string[], orgUsers: OrgUserFull[]): ReportTreeNode[] {
  const usernameSet = new Set(accessUsernames);

  // Map from DN → username, only for project members
  const dnToUsername = new Map<string, string>();
  for (const u of orgUsers) {
    if (usernameSet.has(u.username)) {
      dnToUsername.set(u.distinguishedName, u.username);
    }
  }

  // Create a node for every project member
  const nodeMap = new Map<string, ReportTreeNode>();
  for (const username of accessUsernames) {
    nodeMap.set(username, { username, children: [] });
  }

  // Wire up parent → child relationships within the project
  const childSet = new Set<string>();
  for (const orgUser of orgUsers) {
    if (!usernameSet.has(orgUser.username)) continue;
    const parentUsername = dnToUsername.get(orgUser.manager);
    if (parentUsername && parentUsername !== orgUser.username) {
      nodeMap.get(parentUsername)!.children.push(nodeMap.get(orgUser.username)!);
      childSet.add(orgUser.username);
    }
  }

  // Root nodes = members that are not anyone's child
  const roots: ReportTreeNode[] = [];
  for (const username of accessUsernames) {
    if (!childSet.has(username)) {
      roots.push(nodeMap.get(username)!);
    }
  }

  return roots;
}

// ─── TreePersonRow ─────────────────────────────────────────────────────────────

const TreePersonRow: React.FC<{
  node: ReportTreeNode;
  depth: number;
  orgUsers: OrgUserFull[];
  userReports: Record<string, WeeklyReportDto | null>;
  getUserInfo: (username: string) => AppUser;
  onViewReport: (username: string) => void;
  projectOwner: string;
  accessToken: string;
}> = ({ node, depth, orgUsers, userReports, getUserInfo, onViewReport, projectOwner, accessToken }) => {
  const info = getUserInfo(node.username);
  const report = userReports[node.username];
  const isOwner = node.username === projectOwner;
  const orgUser = orgUsers.find(u => u.username === node.username);
  const colors = getStatusColors(report);

  return (
    <div>
      {/* Person row card */}
      <div className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${colors.border} ${colors.bg}`}>
        {/* Status indicator */}
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`} />

        {/* Avatar */}
        <UserAvatar
          username={node.username}
          displayName={info.fullName || node.username}
          accessToken={accessToken}
          size="sm"
        />

        {/* Name, username, title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-black text-xs italic truncate">{info.fullName || node.username}</p>
            {isOwner && (
              <span className="text-[7px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-widest flex-shrink-0">
                Sahip
              </span>
            )}
          </div>
          <p className="text-slate-500 text-[9px]">{node.username}</p>
          {orgUser?.title && <p className="text-slate-600 text-[8px]">{orgUser.title}</p>}
        </div>

        {/* Report status pill */}
        <div className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border flex-shrink-0 ${colors.pill}`}>
          {colors.pillText}
        </div>

        {/* View button */}
        <button
          onClick={() => onViewReport(node.username)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-400 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Raporu Gör
        </button>
      </div>

      {/* Children rendered below with indentation */}
      {node.children.length > 0 && (
        <div className="ml-10 mt-2 border-l-2 border-slate-700/60 pl-4 space-y-2">
          {node.children.map(child => (
            <TreePersonRow
              key={child.username}
              node={child}
              depth={depth + 1}
              orgUsers={orgUsers}
              userReports={userReports}
              getUserInfo={getUserInfo}
              onViewReport={onViewReport}
              projectOwner={projectOwner}
              accessToken={accessToken}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ProjectReportsTab: React.FC<{
  projectOwner: string;
  projectMembers: string[];
  allUsers: AppUser[];
  user: User;
  apiUrl: string;
}> = ({ projectOwner, projectMembers, allUsers, user, apiUrl }) => {
  const [selectedWeek, setSelectedWeek] = useState<Date>(() => getWeekStart(new Date()));
  const [weekFilterOpen, setWeekFilterOpen] = useState(false);
  const weekFilterRef = useRef<HTMLDivElement | null>(null);

  const [popupUsername, setPopupUsername] = useState<string | null>(null);
  const [userReports, setUserReports] = useState<Record<string, WeeklyReportDto | null>>({});
  const [fetching, setFetching] = useState(false);

  const [orgUsers, setOrgUsers] = useState<OrgUserFull[]>([]);

  // Last 12 weeks (newest first)
  const availableWeeks = useMemo(() => {
    const weeks: Date[] = [];
    const current = getWeekStart(new Date());
    for (let i = 0; i < 12; i++) {
      weeks.push(new Date(current.getTime() - i * 7 * 24 * 60 * 60 * 1000));
    }
    return weeks;
  }, []);

  // Users who have project access (owner + members, deduplicated)
  const accessUsers = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    if (projectOwner) { seen.add(projectOwner); list.push(projectOwner); }
    for (const m of projectMembers) {
      if (m && !seen.has(m)) { seen.add(m); list.push(m); }
    }
    return list;
  }, [projectOwner, projectMembers]);

  const getUserInfo = (username: string): AppUser =>
    allUsers.find(u => u.username === username) ?? { username, fullName: username };

  // Fetch reports for all access users when week or user list changes
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

  // Fetch all org users once to build the hierarchy tree
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
        // non-critical: tree will show flat list of roots
      }
    };
    fetchOrgUsers();
    return () => { cancelled = true; };
  }, [apiUrl, user.accessToken]);

  // Build the report hierarchy tree from project members + org relationships
  const reportTree = useMemo(
    () => buildReportTree(accessUsers, orgUsers),
    [accessUsers, orgUsers]
  );

  const popupReport = popupUsername !== null ? userReports[popupUsername] : undefined;
  const popupUser = popupUsername ? getUserInfo(popupUsername) : null;

  return (
    <div className="flex-1 overflow-y-auto pr-1">
      {/* Top bar: description + week selector */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
          Projeye erişim hakkı olan kullanıcılar · {accessUsers.length} kişi
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
            Projeye erişim hakkı olan kullanıcı bulunamadı
          </p>
        </div>
      ) : (
        /* Personnel report tree */
        <div className="space-y-3">
          {reportTree.map(node => (
            <TreePersonRow
              key={node.username}
              node={node}
              depth={0}
              orgUsers={orgUsers}
              userReports={userReports}
              getUserInfo={getUserInfo}
              onViewReport={setPopupUsername}
              projectOwner={projectOwner}
              accessToken={user.accessToken}
            />
          ))}
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


import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../App';
import { UserAvatar } from './UserAvatar';
import { ManagerPanel } from './ManagerPanel';

interface Project {
  id: string;
  title: string;
  description: string;
  owner: string;
  members: string[];
  ilgiliEkipIdleri?: string[];
}

interface Team {
  id: string;
  title: string;
  description: string;
  leader: string;
  members: string[];
  projectId?: string;
}

interface WeeklyComment {
  id: string;
  username: string;
  content: string;
  date: string;
  projectId: string;
  projectTitle?: string;
}

interface UserOrgInfo {
  directorate: string;
  department: string;
  sector: string;
}

interface HomePageProps {
  user: User;
  onNavigateToProjects: () => void;
  onNavigateToTeams: () => void;
  isElevatedUser?: boolean;
}

// Returns the next Wednesday at 23:59:00 from a given date.
// If today IS Wednesday and it's before 23:59, it returns today's Wednesday 23:59.
function getNextWednesdayDeadline(from: Date): Date {
  const target = new Date(from);
  // Clear sub-minute precision (setSeconds(sec, ms))
  target.setSeconds(0, 0);

  // Day index: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const todayDay = target.getDay();
  // daysUntilWed: 0 if today is Wednesday, otherwise how many days until next Wednesday
  let daysUntilWed = (3 - todayDay + 7) % 7;

  // If today is Wednesday but we're past 23:59, roll to next week
  if (daysUntilWed === 0) {
    const todayWed = new Date(target);
    todayWed.setHours(23, 59, 0, 0);
    if (from > todayWed) {
      daysUntilWed = 7;
    }
  }

  const deadline = new Date(target);
  deadline.setDate(target.getDate() + daysUntilWed);
  deadline.setHours(23, 59, 0, 0);
  return deadline;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function getThisWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // Offset to Monday: Sunday needs -6, Mon=0, Tue=-1, ..., Sat=-5
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

export const HomePage: React.FC<HomePageProps> = ({ user, onNavigateToProjects, onNavigateToTeams, isElevatedUser = false }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [weeklyComments, setWeeklyComments] = useState<WeeklyComment[]>([]);
  const [orgInfo, setOrgInfo] = useState<UserOrgInfo | null>(null);
  const [countdown, setCountdown] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  // Countdown timer
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const deadline = getNextWednesdayDeadline(now);
      const diff = deadline.getTime() - now.getTime();
      setCountdown(formatCountdown(diff));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = {
        'accept': 'application/json',
        'Authorization': `Bearer ${user.accessToken}`,
      };

      // Fetch all in parallel
      const [projRes, teamRes, orgRes] = await Promise.all([
        fetch(`${apiUrl}/api/projects`, { headers }),
        fetch(`${apiUrl}/api/teams`, { headers }),
        fetch(`${apiUrl}/api/users/${user.username}/org-chart`, { headers }),
      ]);

      // Derive teams the user belongs to first (needed for project filtering)
      let myTeamIds = new Set<string>();
      if (teamRes.ok) {
        const teamData: Team[] = await teamRes.json();
        const myTeams = (teamData || []).filter(
          t => t.leader === user.username || (t.members || []).includes(user.username)
        );
        myTeamIds = new Set(myTeams.map(t => t.id));

        if (!isElevatedUser) {
          setTeams(myTeams);
        }
      }

      // Projects where user is owner, direct member, or a member of an assigned team
      if (projRes.ok) {
        const data: Project[] = await projRes.json();
        const myProjects = (data || []).filter(
          p =>
            p.owner === user.username ||
            (p.members || []).includes(user.username) ||
            (p.ilgiliEkipIdleri || []).some(teamId => myTeamIds.has(teamId))
        );
        setProjects(myProjects);

        // Only fetch comments for non-elevated users
        if (!isElevatedUser) {
          const { start, end } = getThisWeekRange();
          const commentsRes = await fetch(
            `${apiUrl}/api/comments/by-date?startDate=${start.toISOString()}&endDate=${end.toISOString()}`,
            { headers }
          );

          if (commentsRes.ok) {
            const allComments: WeeklyComment[] = await commentsRes.json();
            const myComments = (allComments || []).filter(c => c.username === user.username);

            // Attach project titles
            const projectMap: Record<string, string> = {};
            for (const p of data || []) {
              projectMap[p.id] = p.title;
            }
            const commentsWithTitles = myComments.map(c => ({
              ...c,
              projectTitle: projectMap[c.projectId] || c.projectId,
            }));
            setWeeklyComments(commentsWithTitles);
          }
        }
      }

      // Org chart info for directorate
      if (orgRes.ok) {
        const data = await orgRes.json();
        setOrgInfo({
          directorate: data.directorate || '',
          department: data.department || '',
          sector: data.sector || '',
        });
      }
    } catch (err) {
      console.error('Anasayfa verileri yüklenemedi:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user.username, user.accessToken, apiUrl, isElevatedUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasNoComments = !isElevatedUser && !isLoading && weeklyComments.length === 0;

  return (
    <div className="space-y-8">

      {/* ── Welcome banner ── */}
      <div className="text-5xl font-black tracking-tight text-white leading-tight">
        Hoşgeldin,{' '}
        <span className="text-blue-300">
          {user.name}
        </span>{' '}
        👋
      </div>

      {/* ── Profile + countdown row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Profile card */}
        <div className="lg:col-span-2 bg-[#0f172a] border border-white/5 rounded-2xl p-8 flex items-center gap-8 shadow-xl">
          <UserAvatar
            username={user.username}
            displayName={user.name}
            accessToken={user.accessToken}
            size="lg"
          />
          <div className="overflow-hidden">
            <p className="text-2xl font-black text-white truncate">{user.name}</p>
            <p className="text-base text-blue-400 font-bold mt-1 truncate">{user.title || '—'}</p>
            {orgInfo?.directorate && (
              <p className="text-sm text-slate-400 font-semibold mt-1 truncate">{orgInfo.directorate}</p>
            )}
            {orgInfo?.department && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{orgInfo.department}</p>
            )}
          </div>
        </div>

        {/* Countdown card */}
        <div className="bg-[#0f172a] border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 shadow-xl">
          <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Haftalık Rapor Bitiş Süresi
          </div>
          <div className="text-4xl font-black text-amber-400 tracking-widest tabular-nums">
            {countdown}
          </div>
          <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest text-center">
            Çarşamba 23:59'a kalan HH:MM:SS
          </div>
        </div>
      </div>

      {/* ── No-comment alarm ── */}
      {hasNoComments && (
        <div className="flex items-center gap-4 bg-red-900/30 border border-red-500/40 rounded-2xl px-6 py-5 shadow-lg">
          <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-red-400 font-black text-sm uppercase tracking-widest">Dikkat!</p>
            <p className="text-slate-300 text-sm mt-0.5">
              Bu hafta hiçbir projeye yorum yapmadınız. Haftalık rapor için en az bir yorum girmeyi unutmayın!
            </p>
          </div>
        </div>
      )}

      {/* ── Three info columns (non-elevated) / Projects + Manager Panel (elevated) ── */}
      {isElevatedUser ? (
        <div className="space-y-6">
          {/* Manager Panel embedded */}
          <ManagerPanel user={user} />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* My Projects */}
          <div className="bg-[#0f172a] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">İlgilendiğim Projeler</span>
              </div>
              <span className="text-xs font-black text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full">
                {projects.length}
              </span>
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">Yükleniyor…</div>
            ) : projects.length === 0 ? (
              <p className="text-slate-600 text-xs text-center flex-1 flex items-center justify-center">Henüz kayıtlı proje yok.</p>
            ) : (
              <ul className="space-y-2 flex-1 overflow-y-auto max-h-64">
                {projects.map(p => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3 bg-white/3 rounded-xl border border-white/5 hover:bg-blue-600/10 hover:border-blue-500/20 transition-all">
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-200 truncate">{p.title}</span>
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={onNavigateToProjects}
              className="mt-4 w-full py-2.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20 hover:text-blue-300 font-black text-[9px] uppercase tracking-widest transition-all"
            >
              Tüm Projeler
            </button>
          </div>

          {/* My Teams */}
          <div className="bg-[#0f172a] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kayıtlı Olduğum Ekipler</span>
              </div>
              <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                {teams.length}
              </span>
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">Yükleniyor…</div>
            ) : teams.length === 0 ? (
              <p className="text-slate-600 text-xs text-center flex-1 flex items-center justify-center">Henüz kayıtlı ekip yok.</p>
            ) : (
              <ul className="space-y-2 flex-1 overflow-y-auto max-h-64">
                {teams.map(t => (
                  <li key={t.id} className="px-4 py-3 bg-white/3 rounded-xl border border-white/5 hover:bg-emerald-600/10 hover:border-emerald-500/20 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span className="text-sm font-semibold text-slate-200 truncate">{t.title}</span>
                      {t.leader === user.username && (
                        <span className="ml-auto text-[8px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full flex-shrink-0">
                          Lider
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={onNavigateToTeams}
              className="mt-4 w-full py-2.5 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20 hover:text-emerald-300 font-black text-[9px] uppercase tracking-widest transition-all"
            >
              Tüm Ekipler
            </button>
          </div>

          {/* Weekly Comments */}
          <div className="bg-[#0f172a] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
                </svg>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bu Haftaki Yorumlarım</span>
              </div>
              <span className={`text-xs font-black px-2.5 py-1 rounded-full ${weeklyComments.length === 0 && !isLoading ? 'text-red-400 bg-red-500/10' : 'text-violet-400 bg-violet-500/10'}`}>
                {weeklyComments.length}
              </span>
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">Yükleniyor…</div>
            ) : weeklyComments.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-red-400 text-xs font-bold">Bu hafta yorum yok!</p>
              </div>
            ) : (
              <ul className="space-y-3 flex-1 overflow-y-auto max-h-64">
                {weeklyComments.map(c => (
                  <li key={c.id} className="px-4 py-3 bg-white/3 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-violet-400 mb-1 truncate">
                      {c.projectTitle}
                    </p>
                    <p className="text-sm text-slate-300 line-clamp-2">{c.content}</p>
                    <p className="text-[9px] text-slate-600 mt-1.5">
                      {new Date(c.date).toLocaleString('tr-TR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

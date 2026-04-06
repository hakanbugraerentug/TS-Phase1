
import React, { useState, useEffect } from 'react';
import { User } from '../App';
import { UserAvatar } from './UserAvatar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgUserInfo {
  username: string;
  fullName: string;
  title: string;
  department: string;
  sector: string;
  directorate: string;
  distinguishedName: string;
  manager: string;
}

interface TeamInfo {
  id: string;
  title: string;
  description: string;
  leader: string;
  members: string[];
  projectId: string;
}

interface ProjectInfo {
  id: string;
  title: string;
  description: string;
  owner: string;
  members: string[];
  baslamaTarihi?: string;
  bitisTarihi?: string;
}

interface Superior {
  person: OrgUserInfo;
  role: 'Lider' | 'Yönetici';
  teamTitle: string;
}

interface UserProfileProps {
  username: string;
  user: User;
  onBack: () => void;
  onViewProfile: (username: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const UserProfile: React.FC<UserProfileProps> = ({ username, user, onBack, onViewProfile }) => {
  const [profileUser, setProfileUser] = useState<OrgUserInfo | null>(null);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [allUsers, setAllUsers] = useState<OrgUserInfo[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'ustleri' | 'projeleri'>('ustleri');

  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  const headers = { Authorization: `Bearer ${user.accessToken}` };

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      try {
        const [usersRes, teamsRes, projectsRes] = await Promise.all([
          fetch(`${apiUrl}/api/users/all-org`, { headers }),
          fetch(`${apiUrl}/api/teams`, { headers }),
          fetch(`${apiUrl}/api/projects`, { headers }),
        ]);

        const allUsersData: OrgUserInfo[] = usersRes.ok ? await usersRes.json() : [];
        const allTeamsData: TeamInfo[] = teamsRes.ok ? await teamsRes.json() : [];
        const allProjectsData: ProjectInfo[] = projectsRes.ok ? await projectsRes.json() : [];

        setAllUsers(allUsersData);
        setAllProjects(allProjectsData);

        const foundUser = allUsersData.find(u => u.username === username) ?? null;
        setProfileUser(foundUser);

        const userTeams = allTeamsData.filter(t => t.members?.includes(username));
        setTeams(userTeams);

        const userProjects = allProjectsData.filter(
          p => p.members?.includes(username) || p.owner === username
        );
        setProjects(userProjects);
      } catch (e) {
        console.error('Profil yüklenemedi:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username, user.accessToken]);

  const getUserInfo = (uname: string): OrgUserInfo | undefined =>
    allUsers.find(u => u.username === uname);

  // Build superiors list: leaders and project owners for each team the user belongs to
  const buildSuperiors = (): Superior[] => {
    const result: Superior[] = [];
    const seen = new Set<string>();

    for (const team of teams) {
      // Team leader
      if (team.leader && team.leader !== username) {
        const leaderInfo = getUserInfo(team.leader);
        if (leaderInfo) {
          const key = `leader-${team.leader}-${team.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            result.push({ person: leaderInfo, role: 'Lider', teamTitle: team.title });
          }
        }
      }

      // Project owner (manager) — only if team has a project
      if (team.projectId) {
        const project = allProjects.find(p => p.id === team.projectId);
        if (project && project.owner && project.owner !== username && project.owner !== team.leader) {
          const ownerInfo = getUserInfo(project.owner);
          if (ownerInfo) {
            const key = `manager-${project.owner}-${team.id}`;
            if (!seen.has(key)) {
              seen.add(key);
              result.push({ person: ownerInfo, role: 'Yönetici', teamTitle: team.title });
            }
          }
        }
      }
    }

    return result;
  };

  const superiors = buildSuperiors();
  const isOwnProfile = username === user.username;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors font-black text-[10px] uppercase tracking-widest group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        Geri Dön
      </button>

      {/* Profile Card */}
      <div className="bg-[#1e293b]/60 border border-white/10 rounded-[2.5rem] p-10 flex flex-col sm:flex-row items-center sm:items-start gap-8">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <UserAvatar
            username={username}
            displayName={profileUser?.fullName || username}
            accessToken={user.accessToken}
            size="lg"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <h1 className="text-3xl font-black text-white italic tracking-tight leading-tight">
            {profileUser?.fullName || username}
          </h1>
          <p className="text-blue-400 font-black text-sm mt-1">{profileUser?.title || '—'}</p>
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-1">
            @{username}
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profileUser?.department && (
              <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Departman</p>
                <p className="text-white text-xs font-bold">{profileUser.department}</p>
              </div>
            )}
            {profileUser?.directorate && (
              <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Direktörlük</p>
                <p className="text-white text-xs font-bold">{profileUser.directorate}</p>
              </div>
            )}
            {profileUser?.sector && (
              <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Sektör</p>
                <p className="text-white text-xs font-bold">{profileUser.sector}</p>
              </div>
            )}
            {isOwnProfile && (
              <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl px-4 py-3">
                <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Durum</p>
                <p className="text-blue-300 text-xs font-bold">Aktif Kullanıcı</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-0">
        <button
          onClick={() => setActiveSection('ustleri')}
          className={`px-6 py-3.5 font-black text-[10px] uppercase tracking-widest rounded-t-xl transition-all border-b-2 ${
            activeSection === 'ustleri'
              ? 'text-white border-blue-500 bg-blue-600/10'
              : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'
          }`}
        >
          Üstleri
          <span className="ml-2 text-[8px] bg-white/10 px-1.5 py-0.5 rounded-full">{superiors.length}</span>
        </button>
        <button
          onClick={() => setActiveSection('projeleri')}
          className={`px-6 py-3.5 font-black text-[10px] uppercase tracking-widest rounded-t-xl transition-all border-b-2 ${
            activeSection === 'projeleri'
              ? 'text-white border-blue-500 bg-blue-600/10'
              : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'
          }`}
        >
          Projeleri
          <span className="ml-2 text-[8px] bg-white/10 px-1.5 py-0.5 rounded-full">{projects.length}</span>
        </button>
      </div>

      {/* Üstleri Section */}
      {activeSection === 'ustleri' && (
        <div className="space-y-3">
          {superiors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 opacity-40">
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">
                Kayıtlı ekip üstü bulunamadı.
              </p>
            </div>
          ) : (
            superiors.map((sup, idx) => (
              <button
                key={idx}
                onClick={() => onViewProfile(sup.person.username)}
                className="w-full text-left p-4 bg-[#1e293b]/40 border border-white/5 rounded-2xl flex items-center gap-4 hover:border-blue-500/30 hover:bg-blue-600/5 transition-all group"
              >
                <UserAvatar
                  username={sup.person.username}
                  displayName={sup.person.fullName || sup.person.username}
                  accessToken={user.accessToken}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-sm italic truncate group-hover:text-blue-300 transition-colors">
                    {sup.person.fullName || sup.person.username}
                  </p>
                  <p className="text-slate-500 text-[10px] font-bold truncate">{sup.person.title || '—'}</p>
                  <p className="text-slate-600 text-[9px] font-bold uppercase tracking-wider mt-0.5">
                    {sup.teamTitle}
                  </p>
                </div>
                <span
                  className={`flex-shrink-0 text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                    sup.role === 'Lider'
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                      : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  }`}
                >
                  {sup.role === 'Lider' ? '👑 ' : '🏢 '}{sup.role}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Projeleri Section */}
      {activeSection === 'projeleri' && (
        <div className="space-y-4">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 opacity-40">
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">
                Kayıtlı proje bulunamadı.
              </p>
            </div>
          ) : (
            projects.map(project => (
              <div
                key={project.id}
                className="bg-[#1e293b]/40 border border-white/5 rounded-2xl p-6 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-black text-base italic truncate">{project.title}</h3>
                    {project.description && (
                      <p className="text-slate-500 text-xs mt-1 line-clamp-2">{project.description}</p>
                    )}
                  </div>
                  {project.owner === username && (
                    <span className="flex-shrink-0 text-[8px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full uppercase tracking-widest">
                      Sahibi
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Owner */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewProfile(project.owner)}
                      className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                      title={`${project.owner} profilini görüntüle`}
                    >
                      <UserAvatar
                        username={project.owner}
                        displayName={getUserInfo(project.owner)?.fullName || project.owner}
                        accessToken={user.accessToken}
                        size="sm"
                      />
                      <span className="text-slate-400 text-[10px] font-bold">
                        {getUserInfo(project.owner)?.fullName || project.owner}
                      </span>
                    </button>
                    <span className="text-[8px] font-black text-slate-600 uppercase">Proje Sahibi</span>
                  </div>

                  {/* Members count */}
                  <span className="text-[9px] font-black text-slate-600 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                    {project.members?.length || 0} Üye
                  </span>

                  {/* Dates */}
                  {project.baslamaTarihi && (
                    <span className="text-[9px] font-bold text-slate-600">
                      {project.baslamaTarihi}
                      {project.bitisTarihi ? ` → ${project.bitisTarihi}` : ''}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};


import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../App';
import { UserAvatar } from './UserAvatar';
import { DelegationModal } from './DelegationModal';

interface DelegationDto {
  id: string;
  delegatorUsername: string;
  delegateUsername: string;
  durationType: string;
  expiresAt: string | null;
  createdAt: string;
  isActive: boolean;
}

const DURATION_LABEL: Record<string, string> = {
  '1_gun': '1 Gün',
  '1_hafta': '1 Hafta',
  'suresiz': 'Süresiz',
};

interface OrgUser {
  username: string;
  fullName: string;
  title: string;
  department: string;
  directorate: string;
  sector: string;
  distinguishedName: string;
  manager: string;
}

interface TeamDto {
  id: string;
  title: string;
  description: string;
  leader: string;
  members: string[];
  projectId: string;
}

interface WeeklyReportDto {
  id: string;
  username: string;
  weekStart: string;
  savedAt: string;
  author: string;
  reviewer: string;
  readyToReview: boolean;
  status: string;
  reportData?: unknown;
}

interface BulletLine {
  bullet0: string | null;
  bullet1: string[] | null;
  bullet2: string[] | null;
  bullet3: string[] | null;
}

interface AiReportResponse {
  title: string;
  instructions: string[];
  bullet_lines: BulletLine[];
  traceability: unknown[];
  source_map: Record<string, unknown>;
}

type ManagerRole = 'mudur' | 'direktor' | 'baskan' | null;

function detectManagerRole(title: string): ManagerRole {
  const t = title.toLowerCase();
  if (t.includes('müdür') || t.includes('mudur') || t.includes('manager')) return 'mudur';
  if (t.includes('direktör') || t.includes('direktor') || t.includes('director')) return 'direktor';
  if (t.includes('başkan') || t.includes('baskan') || t.includes('head') || t.includes('chief') || t.includes('genel müdür') || t.includes('genel mudur')) return 'baskan';
  return null;
}

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function generateWeekOptions(count: number = 8): { value: string; label: string }[] {
  const options = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const ws = getWeekStart(d);
    const d2 = new Date(ws + 'T00:00:00');
    const label = `${d2.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}`;
    options.push({ value: ws, label: i === 0 ? `Bu Hafta (${label})` : label });
  }
  return options;
}

const BULLET_MARKER: Record<number, string> = { 1: '•', 2: '–', 3: '·' };
const BULLET_COLOR: Record<number, string> = { 1: 'text-slate-200', 2: 'text-slate-400', 3: 'text-slate-500' };
const BULLET_INDENT: Record<number, string> = { 1: '', 2: 'pl-6', 3: 'pl-12' };

const BulletRenderer: React.FC<{ reportData: AiReportResponse }> = ({ reportData }) => {
  return (
    <div className="space-y-6">
      {reportData.bullet_lines.map((line, lineIdx) => (
        <div key={`line-${lineIdx}`} className="mb-6">
          {line.bullet0 && (
            <div className="flex items-center gap-3 mb-3 border-b border-white/10 pb-2">
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">======</span>
              <h3 className="text-base font-black text-white italic tracking-tight">
                {line.bullet0.replace(/^\[|\]$/g, '')}
              </h3>
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">======</span>
            </div>
          )}
          {line.bullet1?.map((text, i) => (
            <div key={`b1-${i}`} className={`flex items-start gap-3 p-2 rounded-xl ${BULLET_INDENT[1]}`}>
              <span className="text-blue-500 mt-1">{BULLET_MARKER[1]}</span>
              <span className={`${BULLET_COLOR[1]} text-sm italic leading-relaxed`}>{text}</span>
            </div>
          ))}
          {line.bullet2?.map((text, i) => (
            <div key={`b2-${i}`} className={`flex items-start gap-3 p-2 rounded-xl ${BULLET_INDENT[2]}`}>
              <span className="text-blue-500 mt-1">{BULLET_MARKER[2]}</span>
              <span className={`${BULLET_COLOR[2]} text-sm italic leading-relaxed`}>{text}</span>
            </div>
          ))}
          {line.bullet3?.map((text, i) => (
            <div key={`b3-${i}`} className={`flex items-start gap-3 p-2 rounded-xl ${BULLET_INDENT[3]}`}>
              <span className="text-blue-500 mt-1">{BULLET_MARKER[3]}</span>
              <span className={`${BULLET_COLOR[3]} text-sm italic leading-relaxed`}>{text}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const ManagerPanel: React.FC<{ user: User }> = ({ user }) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  const managerRole = detectManagerRole(user.title ?? '');

  const [allUsers, setAllUsers] = useState<OrgUser[]>([]);
  const [allTeams, setAllTeams] = useState<TeamDto[]>([]);
  const [inboxReports, setInboxReports] = useState<WeeklyReportDto[]>([]);
  const [allForReviewer, setAllForReviewer] = useState<WeeklyReportDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<string>(getWeekStart());
  const [weekOptions] = useState(generateWeekOptions(8));
  const [modalReport, setModalReport] = useState<{ username: string; reportData: AiReportResponse } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [activeDelegations, setActiveDelegations] = useState<DelegationDto[]>([]);

  const fetchDelegations = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/delegations/by-me`, {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      if (res.ok) {
        const all: DelegationDto[] = await res.json();
        const now = new Date();
        setActiveDelegations(
          all.filter(d => d.isActive && (!d.expiresAt || new Date(d.expiresAt) > now))
        );
      }
    } catch {
      // ignore
    }
  }, [apiUrl, user.accessToken]);

  const revokeDelegate = async (id: string) => {
    try {
      await fetch(`${apiUrl}/api/delegations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.accessToken}` },
      });
      await fetchDelegations();
    } catch {
      // ignore
    }
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, teamsRes, inboxRes, allRes] = await Promise.all([
        fetch(`${apiUrl}/api/users/all-org`, { headers: { Authorization: `Bearer ${user.accessToken}` } }),
        fetch(`${apiUrl}/api/teams`, { headers: { Authorization: `Bearer ${user.accessToken}` } }),
        fetch(`${apiUrl}/api/weekly-reports/inbox`, { headers: { Authorization: `Bearer ${user.accessToken}` } }),
        fetch(`${apiUrl}/api/weekly-reports/all-for-reviewer`, { headers: { Authorization: `Bearer ${user.accessToken}` } }),
      ]);
      setAllUsers(usersRes.ok ? await usersRes.json() : []);
      setAllTeams(teamsRes.ok ? await teamsRes.json() : []);
      setInboxReports(inboxRes.ok ? await inboxRes.json() : []);
      setAllForReviewer(allRes.ok ? await allRes.json() : []);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, user.accessToken]);

  useEffect(() => { fetchData(); fetchDelegations(); }, [fetchData, fetchDelegations]);

  if (!managerRole) {
    return (
      <div className="max-w-2xl mx-auto mt-20 flex flex-col items-center justify-center py-24 bg-[#1e293b]/20 rounded-[2.5rem] border border-white/5">
        <p className="text-slate-400 font-black text-sm uppercase tracking-widest">Bu panel yalnızca yöneticiler içindir.</p>
      </div>
    );
  }

  const currentUserDN = allUsers.find(u => u.username === user.username)?.distinguishedName ?? '';
  const directReports = allUsers.filter(u => u.manager === currentUserDN);

  // Müdür only reviews team leaders (who aggregate their team's report),
  // while higher roles (Direktör, Başkan) see all their direct reports.
  const reporterList = managerRole === 'mudur'
    ? directReports.filter(u => allTeams.some(t => t.leader === u.username))
    : directReports;

  const sentReportsForWeek = allForReviewer.filter(r =>
    r.weekStart === selectedWeek &&
    r.readyToReview &&
    reporterList.some(u => u.username === r.username)
  );

  const pendingReporters = reporterList.filter(
    u => !sentReportsForWeek.some(r => r.username === u.username)
  );

  const openModal = async (username: string) => {
    setModalLoading(true);
    setModalError(null);
    setModalReport(null);
    try {
      const res = await fetch(
        `${apiUrl}/api/weekly-reports/by-user?username=${username}&weekStart=${selectedWeek}`,
        { headers: { Authorization: `Bearer ${user.accessToken}` } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const dto: WeeklyReportDto = await res.json();
      setModalReport({ username, reportData: dto.reportData as AiReportResponse });
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Rapor yüklenemedi');
    } finally {
      setModalLoading(false);
    }
  };

  const roleLabelMap: Record<NonNullable<ManagerRole>, string> = {
    mudur: 'Müdür',
    direktor: 'Direktör',
    baskan: 'Sektör Başkanı / Genel Müdür',
  };
  const roleLabel = managerRole ? roleLabelMap[managerRole] : '';

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter italic">Yönetici Paneli</h2>
          <p className="text-[9px] font-black text-purple-500/60 uppercase tracking-[0.4em] mt-1 border-l-2 border-purple-600 pl-3">
            Hoşgeldin {user.name} &gt; {roleLabel}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(e.target.value)}
            className="bg-[#0f172a] border border-white/10 text-slate-300 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest outline-none focus:border-purple-500/50 transition-all"
          >
            {weekOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            onClick={() => setShowDelegationModal(true)}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-900/40 transition-all active:scale-95 border border-blue-400/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Delege Et
          </button>
        </div>
      </div>

      {/* Active Delegations */}
      {activeDelegations.length > 0 && (
        <div className="mb-8 bg-blue-600/5 border border-blue-500/20 rounded-2xl p-6">
          <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Aktif Delegeler</h3>
          <div className="flex flex-wrap gap-3">
            {activeDelegations.map(d => (
              <div
                key={d.id}
                className="flex items-center gap-3 bg-[#0f172a] border border-blue-500/20 rounded-xl px-4 py-2"
              >
                <UserAvatar username={d.delegateUsername} displayName={d.delegateUsername} accessToken={user.accessToken} size="sm" />
                <div>
                  <p className="text-xs font-black text-white">{d.delegateUsername}</p>
                  <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest">
                    {DURATION_LABEL[d.durationType] || d.durationType}
                    {d.expiresAt ? ` · ${new Date(d.expiresAt).toLocaleDateString('tr-TR')}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => revokeDelegate(d.id)}
                  className="ml-2 text-slate-600 hover:text-red-400 transition-colors"
                  title="Delgeyi Kaldır"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Gönderilmiş Raporlar', value: sentReportsForWeek.length, color: 'text-emerald-400', bg: 'bg-emerald-600/10 border-emerald-500/20' },
          { label: 'Beklenen Raporlar', value: pendingReporters.length, color: 'text-amber-400', bg: 'bg-amber-600/10 border-amber-500/20' },
          { label: 'Toplam', value: reporterList.length, color: 'text-blue-400', bg: 'bg-blue-600/10 border-blue-500/20' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} border rounded-2xl p-6 flex flex-col items-center justify-center`}>
            <span className={`text-4xl font-black ${stat.color}`}>{stat.value}</span>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Person List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      ) : reporterList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-40">
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Doğrudan rapor göndermeniz gereken kişi bulunamadı.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reporterList.map(reporter => {
            const hasSent = sentReportsForWeek.some(r => r.username === reporter.username);
            return (
              <div
                key={reporter.username}
                className="bg-[#1e293b]/30 backdrop-blur-xl rounded-[2rem] border border-white/5 p-6 flex flex-col gap-4 transition-all hover:border-white/10"
              >
                <div className="flex items-center gap-4">
                  <UserAvatar username={reporter.username} displayName={reporter.fullName} accessToken={user.accessToken} size="md" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-black text-white italic truncate">{reporter.fullName}</p>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate">{reporter.title}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${hasSent ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {hasSent ? '✅ Rapor Gönderildi' : '⏳ Bekleniyor'}
                  </span>
                  <button
                    onClick={() => openModal(reporter.username)}
                    disabled={!hasSent}
                    className="px-4 py-2 bg-purple-600/80 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95"
                  >
                    Raporu Görüntüle
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Modal */}
      {(modalReport || modalLoading || modalError) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => { setModalReport(null); setModalError(null); }}
        >
          <div
            className="relative bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-10 max-w-2xl w-full mx-6 max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => { setModalReport(null); setModalError(null); }}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors font-black text-lg"
            >
              ✕
            </button>
            {modalLoading && (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin"></div>
              </div>
            )}
            {modalError && (
              <p className="text-red-400 text-sm font-bold text-center py-10">{modalError}</p>
            )}
            {modalReport && (
              <>
                <div className="mb-6">
                  <h3 className="text-xl font-black text-white italic tracking-tight">{modalReport.username} — Haftalık Rapor</h3>
                  <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest mt-1">{selectedWeek}</p>
                </div>
                {modalReport.reportData ? (
                  <BulletRenderer reportData={modalReport.reportData} />
                ) : (
                  <p className="text-slate-500 text-sm italic">Rapor içeriği bulunamadı.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Delegation Modal */}
      {showDelegationModal && (
        <DelegationModal
          user={user}
          onClose={() => setShowDelegationModal(false)}
          onSuccess={fetchDelegations}
        />
      )}
    </div>
  );
};

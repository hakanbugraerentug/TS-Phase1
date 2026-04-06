import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../App';

interface WeeklyReportDto {
  id: string;
  username: string;
  weekStart: string;
  reportData: unknown;
  savedAt: string;
  author: string;
  reviewer: string;
  reviewers?: string[];
  readyToReview: boolean;
  status: string;
}

const isReviewed = (r: WeeklyReportDto) => r.status === 'reviewed';
const isInReview = (r: WeeklyReportDto) => r.readyToReview && r.status !== 'reviewed';
const isDraft = (r: WeeklyReportDto) => (r.status === 'draft' || r.status === '') && !r.readyToReview;

const statusLabel = (r: WeeklyReportDto) => {
  if (isReviewed(r)) return { text: 'İncelendi', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
  if (isInReview(r)) return { text: 'İncelemede', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
  if (isDraft(r)) return { text: 'Taslak', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
  return { text: r.status, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const renderReportData = (data: unknown): React.ReactNode => {
  if (data == null) return <p className="text-slate-500 italic">Rapor verisi bulunamadı.</p>;

  if (typeof data === 'string') {
    return <pre className="text-slate-300 text-xs whitespace-pre-wrap font-mono">{data}</pre>;
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    // Handle AI report structure (bullet_lines, title, etc.)
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

    // Fallback: render as pretty JSON
    return (
      <pre className="text-slate-300 text-xs whitespace-pre-wrap font-mono bg-black/20 p-4 rounded-xl overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  return <p className="text-slate-400 text-sm">{String(data)}</p>;
};

type SortField = 'weekStart' | 'savedAt';
type SortDir = 'desc' | 'asc';
type StatusFilter = 'all' | 'draft' | 'inReview' | 'reviewed';

const SortIcon: React.FC<{ field: SortField; active: SortField; dir: SortDir }> = ({ field, active, dir }) => {
  if (field !== active) {
    return (
      <svg className="w-3 h-3 text-slate-700 ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  return dir === 'desc' ? (
    <svg className="w-3 h-3 text-blue-400 ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
    </svg>
  ) : (
    <svg className="w-3 h-3 text-blue-400 ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
    </svg>
  );
};

export const MyReports: React.FC<{ user: User }> = ({ user }) => {
  const [reports, setReports] = useState<WeeklyReportDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<WeeklyReportDto | null>(null);
  const [sortField, setSortField] = useState<SortField>('weekStart');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiUrl}/api/weekly-reports/my-reports`, {
          headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        if (!res.ok) throw new Error(`Sunucu hatası: ${res.status}`);
        const data: WeeklyReportDto[] = await res.json();
        setReports(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Bilinmeyen hata');
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, [apiUrl, user.accessToken]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const stats = useMemo(() => ({
    total: reports.length,
    draft: reports.filter(isDraft).length,
    inReview: reports.filter(isInReview).length,
    reviewed: reports.filter(isReviewed).length,
  }), [reports]);

  const filteredAndSorted = useMemo(() => {
    let result = [...reports];

    if (statusFilter !== 'all') {
      result = result.filter((r) => {
        if (statusFilter === 'reviewed') return isReviewed(r);
        if (statusFilter === 'inReview') return isInReview(r);
        if (statusFilter === 'draft') return isDraft(r);
        return true;
      });
    }

    result.sort((a, b) => {
      const aTime = new Date(a[sortField]).getTime();
      const bTime = new Date(b[sortField]).getTime();
      return sortDir === 'desc' ? bTime - aTime : aTime - bTime;
    });

    return result;
  }, [reports, sortField, sortDir, statusFilter]);

  const statusFilters: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Tümü', count: stats.total },
    { key: 'draft', label: 'Taslak', count: stats.draft },
    { key: 'inReview', label: 'İncelemede', count: stats.inReview },
    { key: 'reviewed', label: 'İncelendi', count: stats.reviewed },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">Raporlarım</h2>
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-1">
            Geçmişteki tüm haftalık raporlarınız
          </p>
        </div>
        {!isLoading && !error && reports.length > 0 && (
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
            {filteredAndSorted.length} / {stats.total} rapor
          </p>
        )}
      </div>

      {/* Stats Cards */}
      {!isLoading && !error && reports.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Toplam', value: stats.total, color: 'text-slate-200', dot: 'bg-slate-500' },
            { label: 'Taslak', value: stats.draft, color: 'text-slate-400', dot: 'bg-slate-500' },
            { label: 'İncelemede', value: stats.inReview, color: 'text-yellow-400', dot: 'bg-yellow-400' },
            { label: 'İncelendi', value: stats.reviewed, color: 'text-green-400', dot: 'bg-green-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#0f172a] border border-white/5 rounded-2xl px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-1.5 h-1.5 rounded-full ${stat.dot}`} />
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">{stat.label}</p>
              </div>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Status Filter Bar */}
      {!isLoading && !error && reports.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          {statusFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all duration-200 ${
                statusFilter === f.key
                  ? 'bg-blue-600 border-blue-500/50 text-white shadow-lg'
                  : 'border-white/5 text-slate-500 hover:bg-white/5 hover:text-slate-300'
              }`}
            >
              {f.label}
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${
                statusFilter === f.key ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-600'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Raporlar yükleniyor…</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
          <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-red-400 text-sm font-black">Raporlar yüklenemedi</p>
            <p className="text-red-400/60 text-xs font-black mt-1">{error}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && reports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-600 bg-[#0f172a] border border-white/5 rounded-2xl">
          <svg className="w-14 h-14 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-black uppercase tracking-widest">Henüz rapor bulunmuyor</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-700 mt-2">Haftalık raporunuzu oluşturmak için Raporlar sayfasına gidin</p>
        </div>
      )}

      {!isLoading && !error && reports.length > 0 && filteredAndSorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600 bg-[#0f172a] border border-white/5 rounded-2xl">
          <p className="text-sm font-black uppercase tracking-widest">Bu filtreyle eşleşen rapor yok</p>
        </div>
      )}

      {!isLoading && !error && filteredAndSorted.length > 0 && (
        <div className="bg-[#0f172a] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('weekStart')}
                    className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest transition-colors ${
                      sortField === 'weekStart' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Hafta Başlangıcı
                    <SortIcon field="weekStart" active={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('savedAt')}
                    className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest transition-colors ${
                      sortField === 'savedAt' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Kaydedilme Tarihi
                    <SortIcon field="savedAt" active={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500">Durum</th>
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500">İnceleyen</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAndSorted.map((report) => {
                const badge = statusLabel(report);
                return (
                  <tr
                    key={report.id}
                    className="hover:bg-white/5 transition-colors duration-200 cursor-pointer group"
                    onClick={() => setSelectedReport(report)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-black text-slate-200">{formatDate(report.weekStart)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 font-black">
                      {formatDate(report.savedAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${badge.color}`}>
                        {badge.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-black">
                      {(report.reviewers && report.reviewers.length > 0) ? report.reviewers.join(', ') : (report.reviewer || '-')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-blue-500 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        Görüntüle →
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100 tracking-tight">
                    Haftalık Rapor
                  </h3>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-0.5">
                    {formatDate(selectedReport.weekStart)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {(() => {
                  const badge = statusLabel(selectedReport);
                  return (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${badge.color}`}>
                      {badge.text}
                    </span>
                  );
                })()}
                <button
                  onClick={() => setSelectedReport(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Meta */}
            <div className="flex gap-6 px-8 py-4 border-b border-white/5 flex-shrink-0 bg-white/[0.02]">
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Kaydeden</p>
                <p className="text-xs font-black text-slate-300 mt-1">{selectedReport.author || selectedReport.username}</p>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">İnceleyen</p>
                <p className="text-xs font-black text-slate-300 mt-1">{(selectedReport.reviewers && selectedReport.reviewers.length > 0) ? selectedReport.reviewers.join(', ') : (selectedReport.reviewer || '-')}</p>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Kaydedilme</p>
                <p className="text-xs font-black text-slate-300 mt-1">{formatDate(selectedReport.savedAt)}</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {renderReportData(selectedReport.reportData)}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 border-t border-white/5 flex-shrink-0">
              <button
                onClick={() => setSelectedReport(null)}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 font-black text-[10px] uppercase tracking-widest transition-all border border-white/5"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

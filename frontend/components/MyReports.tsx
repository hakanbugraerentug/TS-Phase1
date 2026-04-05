import React, { useState, useEffect } from 'react';
import { User } from '../App';

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

const statusLabel = (status: string, readyToReview: boolean) => {
  if (status === 'reviewed') return { text: 'İncelendi', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
  if (readyToReview) return { text: 'İncelemede', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
  if (status === 'draft' || status === '') return { text: 'Taslak', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
  return { text: status, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
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

export const MyReports: React.FC<{ user: User }> = ({ user }) => {
  const [reports, setReports] = useState<WeeklyReportDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<WeeklyReportDto | null>(null);

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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-100 tracking-tight">Raporlarım</h2>
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-1">
          Geçmişteki tüm haftalık raporlarınız
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-400 text-sm font-black">
          {error}
        </div>
      )}

      {!isLoading && !error && reports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-600">
          <svg className="w-12 h-12 mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 2v-6m-9 9h12M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <p className="text-sm font-black uppercase tracking-widest">Henüz rapor bulunmuyor</p>
        </div>
      )}

      {!isLoading && !error && reports.length > 0 && (
        <div className="bg-[#0f172a] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500">Hafta Başlangıcı</th>
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500">Kaydedilme Tarihi</th>
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500">Durum</th>
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500">İnceleyen</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reports.map((report) => {
                const badge = statusLabel(report.status, report.readyToReview);
                return (
                  <tr
                    key={report.id}
                    className="hover:bg-white/5 transition-colors duration-200 cursor-pointer group"
                    onClick={() => setSelectedReport(report)}
                  >
                    <td className="px-6 py-4 text-sm font-black text-slate-200">
                      {formatDate(report.weekStart)}
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
                      {report.reviewer || '-'}
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
              <div>
                <h3 className="text-lg font-black text-slate-100 tracking-tight">
                  Haftalık Rapor
                </h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-0.5">
                  {formatDate(selectedReport.weekStart)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {(() => {
                  const badge = statusLabel(selectedReport.status, selectedReport.readyToReview);
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
                <p className="text-xs font-black text-slate-300 mt-1">{selectedReport.reviewer || '-'}</p>
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

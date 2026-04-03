import React, { useState, useRef, useCallback } from 'react';
import { User } from '../App';

interface MeetingReportProps {
  user: User;
}

export const MeetingReport: React.FC<MeetingReportProps> = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('video/') && file.type !== 'video/mp4') return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [videoUrl]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); }
    else { v.pause(); setIsPlaying(false); }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (v) setCurrentTime(v.currentTime);
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (v) setDuration(v.duration);
  };

  const handleEnded = () => setIsPlaying(false);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    const val = parseFloat(e.target.value);
    if (v) { v.currentTime = val; setCurrentTime(val); }
  };

  const formatTime = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const removeFile = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoFile(null);
    setVideoUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 bg-[#00AFF0]/15 rounded-xl flex items-center justify-center border border-[#00AFF0]/20">
          <svg className="w-4 h-4 text-[#00AFF0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.277A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-black text-slate-200 tracking-tight">Toplantı Kaydını Raporla</h2>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Ses kaydını yükle · Transkript ve rapor oluştur</p>
        </div>
      </div>

      {/* Upload Area */}
      {!videoFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 py-14
            ${isDragging
              ? 'border-[#00AFF0] bg-[#00AFF0]/10 scale-[1.01]'
              : 'border-white/10 bg-[#0f172a] hover:border-[#00AFF0]/40 hover:bg-[#00AFF0]/5'
            }`}
        >
          <div className="w-16 h-16 bg-[#00AFF0]/10 rounded-2xl flex items-center justify-center border border-[#00AFF0]/20">
            <svg className="w-8 h-8 text-[#00AFF0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-slate-200 mb-1">MP4 dosyanızı buraya sürükleyin</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">veya tıklayarak seçin · yalnızca .mp4</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/*"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      ) : (
        /* Player */
        <div className="bg-[#0f172a] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          {/* Hidden video element for audio/playback */}
          <video
            ref={videoRef}
            src={videoUrl ?? undefined}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            className="hidden"
          />

          {/* File info bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 bg-[#00AFF0]/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-[#00AFF0]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15 10l4.553-2.277A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
              </div>
              <span className="text-xs font-black text-slate-300 truncate max-w-xs">{videoFile.name}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex-shrink-0">
                ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
              </span>
            </div>
            <button
              onClick={removeFile}
              className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-red-400 transition-colors flex-shrink-0 ml-4"
            >
              Kaldır
            </button>
          </div>

          {/* Player controls */}
          <div className="px-5 py-4 space-y-3">
            {/* Seek bar */}
            <div className="relative group">
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-[#00AFF0]"
                style={{
                  background: duration
                    ? `linear-gradient(to right, #00AFF0 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.1) ${(currentTime / duration) * 100}%)`
                    : 'rgba(255,255,255,0.1)',
                }}
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="w-9 h-9 bg-[#00AFF0]/20 hover:bg-[#00AFF0]/30 border border-[#00AFF0]/30 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0"
              >
                {isPlaying ? (
                  <svg className="w-3.5 h-3.5 text-[#00AFF0]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-[#00AFF0] ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <span className="text-[10px] font-black tracking-widest text-slate-400 tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Jump buttons */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => { const v = videoRef.current; if (v) { v.currentTime = Math.max(0, v.currentTime - 10); setCurrentTime(v.currentTime); } }}
                  className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-[#00AFF0] transition-colors px-2 py-1 rounded-lg hover:bg-[#00AFF0]/10"
                >
                  ‹‹ 10s
                </button>
                <button
                  onClick={() => { const v = videoRef.current; if (v) { v.currentTime = Math.min(duration, v.currentTime + 10); setCurrentTime(v.currentTime); } }}
                  className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-[#00AFF0] transition-colors px-2 py-1 rounded-lg hover:bg-[#00AFF0]/10"
                >
                  10s ››
                </button>
                <button
                  onClick={() => { const v = videoRef.current; if (v) { v.currentTime = Math.min(duration, v.currentTime + 30); setCurrentTime(v.currentTime); } }}
                  className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-[#00AFF0] transition-colors px-2 py-1 rounded-lg hover:bg-[#00AFF0]/10"
                >
                  30s ››
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transcript + Notes split */}
      <div className="flex gap-5" style={{ minHeight: '420px' }}>
        {/* Transcript — 66% */}
        <div className="flex flex-col bg-[#0f172a] border border-white/5 rounded-2xl shadow-xl overflow-hidden" style={{ flex: '2' }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transkript</span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Diyalog</span>
          </div>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Transkript burada görünecek...&#10;&#10;Backend entegrasyonu tamamlandıktan sonra ses kaydı gönderildiğinde toplantı diyalogu otomatik olarak bu alana yüklenecektir."
            className="flex-1 w-full bg-transparent text-sm text-slate-300 placeholder-slate-600 resize-none outline-none px-5 py-4 leading-relaxed font-mono"
          />
        </div>

        {/* Meeting Notes — 33% */}
        <div className="flex flex-col bg-[#0f172a] border border-white/5 rounded-2xl shadow-xl overflow-hidden" style={{ flex: '1' }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-[#00AFF0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#00AFF0]">Toplantı Notları</span>
            </div>
            <button
              className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-[#00AFF0] transition-colors px-2.5 py-1 rounded-lg hover:bg-[#00AFF0]/10 border border-transparent hover:border-[#00AFF0]/20"
              title="Backend entegrasyonu bekleniyor"
            >
              Rapor Oluştur
            </button>
          </div>
          <textarea
            value={meetingNotes}
            onChange={(e) => setMeetingNotes(e.target.value)}
            placeholder="Toplantı notları burada görünecek...&#10;&#10;Ses kaydı analiz edildikten sonra özet, karar noktaları ve aksiyon maddeleri otomatik olarak oluşturulacaktır."
            className="flex-1 w-full bg-transparent text-sm text-slate-300 placeholder-slate-600 resize-none outline-none px-5 py-4 leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
};

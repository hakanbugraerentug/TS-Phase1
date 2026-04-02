
import React, { useState, useMemo } from 'react';
import { User } from '../App';

function isElevatedTitle(title: string): boolean {
  const t = title.toLowerCase();
  return (
    t.includes('müdür') || t.includes('mudur') || t.includes('manager') ||
    t.includes('direktör') || t.includes('direktor') || t.includes('director') ||
    t.includes('başkan') || t.includes('baskan') || t.includes('head') ||
    t.includes('chief') || t.includes('genel müdür') || t.includes('genel mudur')
  );
}

interface Slide {
  image: string;
  title: string;
  description: string;
}

// Buraya kendi slayt içeriklerinizi ekleyebilirsiniz
const managerSlides: Slide[] = [
  {
    image: '',
    title: 'Yönetici Paneline Hoş Geldiniz',
    description: 'Ekip liderliği, haftalık raporlar ve organizasyon şemasına buradan erişebilirsiniz.'
  },
  {
    image: '',
    title: 'Ekip Yönetimi',
    description: 'Ekipler sekmesinden yeni ekip oluşturabilir, üye ekleyip çıkarabilir ve liderlik devri yapabilirsiniz.'
  },
  {
    image: '',
    title: 'Haftalık Raporlar',
    description: 'Haftalık Raporlar sekmesinde ekibinizin aktivitelerini AI destekli özetleyebilirsiniz.'
  },
  {
    image: '',
    title: 'Organizasyon Şeması',
    description: 'Organizasyon Şeması sekmesinde kurumsal hiyerarşiyi görüntüleyebilirsiniz.'
  }
];

// Buraya kendi slayt içeriklerinizi ekleyebilirsiniz
const personnelSlides: Slide[] = [
  {
    image: '',
    title: 'Portala Hoş Geldiniz',
    description: 'TeamSync ile projelerinizi takip edebilir, ekibinizle işbirliği yapabilirsiniz.'
  },
  {
    image: '',
    title: 'Projelerim',
    description: 'Projelerim sekmesinde size atanan projeleri görüntüleyebilir ve detaylarına ulaşabilirsiniz.'
  },
  {
    image: '',
    title: 'Ekipler',
    description: 'Ekipler sekmesinde bağlı olduğunuz ekipleri görebilir ve ekipten ayrılma işlemi yapabilirsiniz.'
  },
  {
    image: '',
    title: 'Haftalık Raporlar',
    description: 'Haftalık Raporlar sekmesinde çalışma özetlerinizi görebilirsiniz.'
  }
];

const placeholderGradients = [
  'from-blue-600 to-indigo-700',
  'from-indigo-600 to-purple-700',
  'from-cyan-600 to-blue-700',
  'from-violet-600 to-indigo-700',
];

interface HowToUseProps {
  user: User;
}

export const HowToUse: React.FC<HowToUseProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const isManager = useMemo(() => isElevatedTitle(user.title ?? ''), [user.title]);
  const activeSlides = isManager ? managerSlides : personnelSlides;
  const presentationLabel = isManager ? 'Yönetici Sunumu' : 'Mühendis Sunumu';

  const handlePrev = () => setCurrentSlide(prev => Math.max(0, prev - 1));
  const handleNext = () => setCurrentSlide(prev => Math.min(activeSlides.length - 1, prev + 1));
  const handleClose = () => { setIsOpen(false); setCurrentSlide(0); };
  const handleOpen = () => { setCurrentSlide(0); setIsOpen(true); };

  const slide = activeSlides[currentSlide];
  const isFirst = currentSlide === 0;
  const isLast = currentSlide === activeSlides.length - 1;

  return (
    <>
      {/* Karşılama ekranı */}
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl border border-white/10 ${isManager ? 'bg-gradient-to-br from-yellow-500 to-orange-600' : 'bg-gradient-to-br from-violet-600 to-indigo-700'}`}>
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.85-1.137.193-1.914.97-1.914 1.914v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 4h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tight text-slate-100 mb-2">Nasıl Kullanılır</h2>
          <p className="text-slate-400 text-sm font-black uppercase tracking-widest">
            Unvanınıza göre hazırlanan sunum yüklenmeye hazır
          </p>
          <span className={`inline-block mt-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${isManager ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-violet-500/10 border-violet-500/30 text-violet-400'}`}>
            {presentationLabel}
          </span>
        </div>
        <button
          onClick={handleOpen}
          className={`flex items-center gap-3 px-8 py-4 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all duration-300 shadow-lg border ${isManager ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 border-yellow-400/30' : 'bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 border-violet-500/30'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Sunumu Başlat
        </button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal kart */}
          <div className="relative z-10 w-full max-w-2xl mx-4 bg-[#1e293b] rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden">
            {/* Kapat butonu */}
            <button
              onClick={handleClose}
              className="absolute top-5 right-5 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Slayt görseli */}
            <div className="h-64 w-full relative overflow-hidden">
              {slide.image ? (
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${placeholderGradients[currentSlide % placeholderGradients.length]} flex flex-col items-center justify-center transition-all duration-300`}>
                  <span className="text-white/20 font-black text-8xl leading-none select-none">{currentSlide + 1}</span>
                </div>
              )}
              {/* Slayt sayacı */}
              <div className="absolute bottom-3 right-5 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 text-white text-[10px] font-black uppercase tracking-widest">
                {currentSlide + 1} / {activeSlides.length}
              </div>
            </div>

            {/* İçerik */}
            <div className="p-8 pb-6">
              {isFirst && (
                <span className={`inline-block mb-3 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isManager ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-violet-500/10 border-violet-500/30 text-violet-400'}`}>
                  {presentationLabel}
                </span>
              )}
              <h3 className="text-xl font-black text-slate-100 mb-3 tracking-tight transition-all duration-300">
                {slide.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed font-medium transition-all duration-300">
                {slide.description}
              </p>
            </div>

            {/* Dot indicator */}
            <div className="flex justify-center gap-2 pb-4">
              {activeSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentSlide ? 'bg-blue-500 w-5' : 'bg-white/20 hover:bg-white/40'}`}
                />
              ))}
            </div>

            {/* Navigasyon butonları */}
            <div className="flex items-center justify-between px-8 pb-8 gap-4">
              <button
                onClick={handlePrev}
                disabled={isFirst}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-white hover:bg-white/5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Geri
              </button>

              {isLast ? (
                <button
                  onClick={handleClose}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/50 transition-all duration-300 shadow-lg"
                >
                  Tamamla
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/50 transition-all duration-300 shadow-lg"
                >
                  İleri
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

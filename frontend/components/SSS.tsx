import React, { useState } from 'react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'TeamSync nedir?',
    answer:
      'TeamSync, ekip liderlerinin ve yöneticilerin haftalık rapor oluşturmasını, proje takibini ve organizasyon şemasını yönetmesini kolaylaştıran bir kurumsal portaldır.',
  },
  {
    question: 'Haftalık raporumu nasıl oluşturabilirim?',
    answer:
      '"Haftalık Raporlar" sekmesine gidin, hafta için yorumlarınızı girin ve "Rapor Oluştur" düğmesine tıklayın. Yapay zeka destekli sistem yorumlarınızı otomatik olarak düzenlenmiş bir rapora dönüştürür.',
  },
  {
    question: 'Yönetici raporlarını nasıl birleştirebilirim?',
    answer:
      'Yükseltilmiş yetkiye (Müdür veya üstü) sahip kullanıcılar, "Haftalık Raporlar" ekranındaki "Astların Raporlarını Birleştir" özelliği ile ekip liderlerinin raporlarını tek bir yönetici raporuna dönüştürebilir.',
  },
  {
    question: 'Raporumu DOCX olarak nasıl indirebilirim?',
    answer:
      'Rapor oluşturulduktan sonra "DOCX İndir" düğmesine tıklayın. Rapor, kurumsal formatta Word belgesi olarak bilgisayarınıza kaydedilir.',
  },
  {
    question: 'TFS / Azure DevOps entegrasyonu nasıl çalışır?',
    answer:
      'Sol alt köşedeki "TFS ile Sync Et" düğmesine tıklayın, Azure DevOps kuruluş URL\'nizi ve Personal Access Token (PAT) bilgilerinizi girin. Bağlantı kurulduktan sonra "TFS / Azure DevOps" sekmesinden tamamlanan ve devam eden iş öğelerinizi ve commitlori görebilirsiniz.',
  },
  {
    question: 'Yeni bir proje nasıl oluşturabilirim?',
    answer:
      '"Projelerim" sekmesine gidin ve "Yeni Proje" düğmesine tıklayın. Projeye başlık, açıklama ve ekip üyeleri atayabilirsiniz.',
  },
  {
    question: 'Ekip üyesi nasıl eklerim veya çıkarım?',
    answer:
      '"Ekipler" sekmesinden ilgili ekibi seçin. Üye eklemek için "Üye Ekle" düğmesini, çıkarmak için üyenin yanındaki kaldır simgesini kullanın.',
  },
  {
    question: 'Organizasyon şemasını nasıl görüntüleyebilirim?',
    answer:
      '"Organizasyon Şeması" sekmesini açın. Kendi pozisyonunuz ve yönetici zinciriniz ile aynı yöneticiye bağlı çalışma arkadaşlarınız otomatik olarak görüntülenir.',
  },
  {
    question: 'Toplantı kayıt raporunu nasıl kullanabilirim?',
    answer:
      '"Toplantı Kaydını Raporla" sekmesinde toplantı metnini veya notlarınızı yapıştırın; sistem bu içeriği otomatik olarak yapılandırılmış bir rapora dönüştürür.',
  },
  {
    question: 'Şifremi veya hesap bilgilerimi nasıl güncellerim?',
    answer:
      'Şifre ve hesap bilgisi güncellemeleri kurumsal Active Directory üzerinden yapılmaktadır. Lütfen BT destek ekibinize başvurun.',
  },
];

export const SSS: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-10">
        <h2 className="text-2xl font-black text-white tracking-tight mb-2">
          Sıkça Sorulan Sorular
        </h2>
        <p className="text-slate-500 text-sm font-medium">
          TeamSync kullanımı hakkında merak ettiğiniz soruların cevaplarını burada bulabilirsiniz.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {FAQ_ITEMS.map((item, index) => (
          <div
            key={index}
            className="bg-[#0f172a] border border-white/5 rounded-2xl overflow-hidden transition-all duration-200"
          >
            <button
              className="w-full flex items-center justify-between px-6 py-5 text-left group"
              onClick={() => toggle(index)}
            >
              <span className="text-sm font-black text-slate-200 group-hover:text-white transition-colors pr-4">
                {item.question}
              </span>
              <svg
                className={`w-5 h-5 flex-shrink-0 text-slate-500 transition-transform duration-200 ${
                  openIndex === index ? 'rotate-180 text-blue-400' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openIndex === index && (
              <div className="px-6 pb-5">
                <p className="text-slate-400 text-sm leading-relaxed">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

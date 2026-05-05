# TeamSync AI Server

FastAPI tabanlı rapor üretim servisi.

## Kurulum

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # .env dosyasını düzenle
```

## Çalıştırma

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Endpointler

| Method | Path | Açıklama |
|--------|------|----------|
| POST | /generate_report | Yorumları alır, LLM ile rapor üretir |
| POST | /generate_docx | bullet_lines alır, .docx döndürür |
| GET | /health | Sağlık kontrolü |

## Thinking model kullanımı

`.env` dosyasında:
```
LLM_ENABLE_THINKING=true
LLM_THINKING_BUDGET=4096
LLM_MODEL=Qwen/Qwen3-32B
```

## Request örneği — /generate_report

```json
{
  "comments": [
    {
      "commentId": "c1",
      "date": "2025-04-21",
      "username": "ahmet",
      "projectName": "Atlas CRM",
      "projectGroup": "CRM Ailesi",
      "userComment": "Müşteri modülü tamamlandı."
    },
    {
      "commentId": "c2",
      "date": "2025-04-22",
      "username": "fatma",
      "projectName": "Atlas CRM",
      "projectGroup": "CRM Ailesi",
      "userComment": "Performans testleri yapıldı, sonuçlar iyi."
    },
    {
      "commentId": "c3",
      "date": "2025-04-22",
      "username": "mehmet",
      "projectName": "İç Portal",
      "userComment": "Anasayfa yeniden tasarlandı."
    }
  ],
  "prompt": ""
}
```

Beklenen çıktı yapısı (grup varsa):
```
[CRM Ailesi]          ← bullet0, grup header
  [Atlas CRM]         ← bullet0, proje (girintili)
  • Genel             ← bullet1
  – Müşteri modülü tamamlandı   ← bullet2
  – Performans testleri yapıldı

[İç Portal]           ← bullet0, direkt proje (grup yok)
  • Genel
  – Anasayfa yeniden tasarlandı
```

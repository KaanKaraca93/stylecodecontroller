# 📧 PLM Monitoring System

Infor Fashion PLM'deki Style kayıtlarını izleyen ve hata tespit eden otomatik monitoring sistemi.

## 🎯 Özellikler

### Kontrol Edilen Hatalar:

**1. Duplicate Hatası (Kritik)**
- Yeni Style kayıtlarının StyleCode'unun son 11 hanesi unique olmalı
- Hata tespit edildiğinde **anında mail gönderilir**

**2. Zıplama Hatası (Önemli)**
- Aynı Season ve ProductSubSubCategory'deki Style'ların kodları sıralı olmalı
- Hata tespit edildiğinde **gün sonu raporuna eklenir**

### Schedule:
- ⏰ **Her 5 dakikada bir** PLM kontrolü
- 📊 **Her gün 20:00'de** gün sonu özet raporu

## 🚀 Kurulum

1. Gerekli paketleri yükle:
```bash
npm install
```

2. `.env` dosyası oluştur:
```env
EMAIL_USER=gonderici@gmail.com
EMAIL_PASS=gmail-app-password
EMAIL_TO=alici@email.com
PORT=3000
```

## 🧪 Test

Lokal olarak çalıştırma:
```bash
npm start
```

### Manuel Test Endpoint'leri:

```bash
# Ana sayfa - Status kontrolü
http://localhost:3000/

# Manuel PLM kontrolü
http://localhost:3000/check-now

# Manuel gün sonu raporu
http://localhost:3000/send-report

# Günlük raporu görüntüle
http://localhost:3000/daily-report
```

## 🌍 Heroku Deploy

```bash
# Git commit
git add .
git commit -m "PLM Monitoring System"
git push origin main

# Heroku otomatik deploy edecek (GitHub entegrasyonu varsa)
```

### Heroku Config Vars:
```
EMAIL_USER    = gonderici@gmail.com
EMAIL_PASS    = gmail-app-password
EMAIL_TO      = alici@email.com
```

## 📊 Sistem Mimarisi

```
services/
├── auth.service.js       - OAuth2 token yönetimi
├── plm.service.js        - PLM API istekleri
└── validator.service.js  - Duplicate + Zıplama kontrolleri

utils/
├── logger.util.js        - Günlük rapor yönetimi
└── mail.util.js          - Mail gönderme

data/
└── daily-report.json     - Günlük log (otomatik oluşturulur)
```

## 📧 Mail Senaryoları

### 1. Anında Mail (Duplicate Hatası)
```
Konu: 🚨 KRİTİK - PLM Duplicate Hata: TW6240057038

- StyleId, StyleCode detayları
- Duplicate olan kayıtların listesi
- Tespit zamanı
```

### 2. Gün Sonu Raporu (20:00)
```
Konu: 📊 PLM Günlük Rapor - 09.02.2026

- Toplam kontrol sayısı
- Başarılı/Hatalı kayıt istatistikleri
- Duplicate hatalar (anında mail atılanlar)
- Zıplama hataları (detaylı liste)
```

## 🔧 Teknik Detaylar

### API Authentication:
- Infor OAuth2 token kullanır
- Token otomatik cache'lenir
- Expiry öncesi otomatik yenilenir

### StyleCode Validasyonu:
- Sadece 12 haneli kodlar kontrol edilir
- 12 haneli olmayan kayıtlar otomatik atlanır

### Zıplama Kontrolü:
- Aynı SeasonId + ProductSubSubCategoryId gruplandırır
- Son 11 hanenin numerik kısmını sıralar
- Eksik kod varsa raporlar

## 📝 Notlar

- Günlük rapor dosyası her gün sonu mail sonrası silinir
- Duplicate hatası kritik olduğu için anında mail gönderilir
- Zıplama hatası gün sonu raporunda topluca bildirilir
- Tüm zamanlar GMT+0 (UTC) olarak işlenir

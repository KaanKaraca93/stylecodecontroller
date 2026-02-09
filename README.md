# 📧 Scheduled Mail Sender

Office 365 ile düzenli mail gönderen Node.js uygulaması.

## 🚀 Kurulum

1. Gerekli paketleri yükle:
```bash
npm install
```

2. `.env` dosyası oluştur (`.env.example` dosyasını kopyala):
```bash
cp .env.example .env
```

3. `.env` dosyasını düzenle:
```env
EMAIL_USER=sizin-email@outlook.com
EMAIL_PASS=sifreniz
EMAIL_TO=alici-email@example.com
PORT=3000
```

## 📨 Office 365 Şifre Ayarları

**Önemli:** Office 365'te iki faktörlü doğrulama varsa:
1. https://account.microsoft.com/security adresine git
2. "Advanced security options" tıkla
3. "App passwords" oluştur
4. Bu şifreyi `.env` dosyasında kullan

## 🧪 Test

Lokal olarak mail gönderme testi:
```bash
npm test
```

## 🏃 Çalıştırma

```bash
npm start
```

Tarayıcıdan manuel test:
```
http://localhost:3000/send-test-mail
```

## 🌍 Heroku Deploy

```bash
# Git init (eğer yoksa)
git init
git add .
git commit -m "Initial commit"

# Heroku oluştur
heroku create

# Environment variables ayarla
heroku config:set EMAIL_USER=sizin-email@outlook.com
heroku config:set EMAIL_PASS=sifreniz
heroku config:set EMAIL_TO=alici-email@example.com

# Deploy
git push heroku main
```

## ⏰ Zamanlama

`index.js` içinde cron schedule'ı aktif et:
- Her gün 09:00: `'0 9 * * *'`
- Her 5 dakika: `'*/5 * * * *'`
- Her Pazartesi 10:00: `'0 10 * * 1'`

## 📝 Notlar

- Heroku free tier 30 dakika aktivite yoksa uyur
- Heroku Scheduler addon'u kullanılabilir
- Production'da schedule ayarlarını aktif et

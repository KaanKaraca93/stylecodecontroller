require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// SMTP ayarları - Gmail veya Office 365 otomatik algılama
const isGmail = process.env.EMAIL_USER?.includes('gmail.com');

const transporter = nodemailer.createTransport(isGmail ? {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
} : {
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    ciphers: 'SSLv3'
  }
});

// Mail gönderme fonksiyonu
async function sendScheduledMail() {
  try {
    console.log('📧 Zamanlanmış mail gönderiliyor...', new Date().toLocaleString('tr-TR'));
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: `⏰ Zamanlanmış Mail - ${new Date().toLocaleString('tr-TR')}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #0078d4;">⏰ Zamanlanmış Mail</h2>
          <p>Bu mail otomatik olarak zamanlanmış şekilde gönderilmiştir.</p>
          <p><strong>Gönderilme Zamanı:</strong> ${new Date().toLocaleString('tr-TR')}</p>
          <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Bu mail Node.js Schedule Mail Sender tarafından gönderilmiştir.</p>
        </div>
      `
    });

    console.log('✅ Mail gönderildi! Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Mail gönderilirken hata:', error.message);
  }
}

// Her gün saat 09:00'da mail gönder (örnek)
// Format: saniye dakika saat gün ay haftanıngünü
// cron.schedule('0 9 * * *', sendScheduledMail);

// Test için: Her 5 dakikada bir (Heroku'da test için)
// cron.schedule('*/5 * * * *', sendScheduledMail);

// Express routes
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'Scheduled Mail Sender çalışıyor!',
    time: new Date().toLocaleString('tr-TR')
  });
});

// Manuel mail gönderme endpoint'i
app.get('/send-test-mail', async (req, res) => {
  try {
    await sendScheduledMail();
    res.json({ 
      success: true, 
      message: 'Mail gönderildi!',
      time: new Date().toLocaleString('tr-TR')
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portunda çalışıyor`);
  console.log(`📧 Mail Sender hazır!`);
  console.log(`🌐 Test için: http://localhost:${PORT}/send-test-mail`);
});

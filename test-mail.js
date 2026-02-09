require('dotenv').config();
const nodemailer = require('nodemailer');

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

async function testMail() {
  try {
    console.log('📧 Mail gönderiliyor...');
    console.log('Gönderen:', process.env.EMAIL_USER);
    console.log('Alıcı:', process.env.EMAIL_TO);
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: '✅ Test Mail - Office 365 SMTP Çalışıyor!',
      text: 'Bu bir test mailidir. Node.js uygulamanız başarıyla mail gönderiyor!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #0078d4;">✅ Test Mail Başarılı!</h2>
          <p>Tebrikler! Node.js uygulamanız Office 365 üzerinden başarıyla mail gönderiyor.</p>
          <p><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR')}</p>
          <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Bu mail otomatik olarak gönderilmiştir.</p>
        </div>
      `
    });

    console.log('✅ Mail başarıyla gönderildi!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (error) {
    console.error('❌ Mail gönderilirken hata oluştu:');
    console.error('Hata:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('\n💡 Çözüm önerileri:');
      console.error('1. Email adresiniz ve şifreniz doğru mu kontrol edin');
      console.error('2. Office 365 hesabınızda "Less secure app access" açık olmalı');
      console.error('3. İki faktörlü doğrulama varsa "App Password" oluşturun');
    }
  }
}

testMail();

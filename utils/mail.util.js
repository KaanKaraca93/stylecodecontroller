const nodemailer = require('nodemailer');
require('dotenv').config();

// Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Anında hata maili - Duplicate hatası için
 */
async function sendDuplicateAlert(duplicateError) {
  try {
    const { style, last11, duplicates } = duplicateError;
    
    const duplicatesList = duplicates.map(d => 
      `<li>StyleId: ${d.StyleId}, StyleCode: <strong>${d.StyleCode}</strong></li>`
    ).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #fff3cd; border-left: 5px solid #ff0000;">
        <h2 style="color: #d9534f;">🚨 KRİTİK - PLM Duplicate Hata!</h2>
        
        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Hatalı Kayıt:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>StyleId:</strong> ${style.StyleId}</li>
            <li><strong>StyleCode:</strong> <span style="color: #d9534f; font-size: 18px;">${style.StyleCode}</span></li>
            <li><strong>Son 11 Hane:</strong> ${last11}</li>
            <li><strong>Season:</strong> ${style.Season?.Name || 'N/A'}</li>
            <li><strong>Brand:</strong> ${style.Brand?.Name || 'N/A'}</li>
            <li><strong>Category:</strong> ${style.ProductSubSubCategory?.Name || 'N/A'}</li>
            <li><strong>Create Date:</strong> ${new Date(style.CreateDate).toLocaleString('tr-TR')}</li>
          </ul>
        </div>

        <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px;">
          <h3>Duplicate Olan Kayıtlar (${duplicates.length}):</h3>
          <ul>${duplicatesList}</ul>
        </div>

        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          <strong>Tespit Zamanı:</strong> ${new Date().toLocaleString('tr-TR')}<br>
          Bu mail otomatik olarak PLM Monitoring sistemi tarafından gönderilmiştir.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: `🚨 KRİTİK - PLM Duplicate Hata: ${style.StyleCode}`,
      html: html
    });

    console.log('✅ Duplicate alert maili gönderildi:', style.StyleCode);
  } catch (error) {
    console.error('❌ Duplicate mail gönderme hatası:', error.message);
  }
}

/**
 * Gün sonu özet raporu
 */
async function sendDailyReport(report) {
  try {
    const totalErrors = report.duplicateErrors.length + report.jumpErrors.length;
    
    // Hata yoksa mail atma
    if (report.totalChecked === 0) {
      console.log('ℹ️ Bugün kontrol yapılmadı, mail gönderilmedi');
      return;
    }

    const duplicateSection = report.duplicateErrors.length > 0 ? `
      <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #d9534f;">🚨 Duplicate Hatalar (${report.duplicateErrors.length}):</h3>
        ${report.duplicateErrors.map(err => `
          <div style="margin: 10px 0; padding: 10px; background-color: white; border-radius: 3px;">
            <strong>StyleCode:</strong> ${err.style.StyleCode}<br>
            <strong>StyleId:</strong> ${err.style.StyleId}<br>
            <strong>Son 11 Hane:</strong> ${err.last11}<br>
            <strong>Duplicate Sayısı:</strong> ${err.duplicates.length}<br>
            <small style="color: #666;">✅ Anında mail gönderildi</small>
          </div>
        `).join('')}
      </div>
    ` : '<p style="color: #28a745;">✅ Duplicate hata yok</p>';

    const jumpSection = report.jumpErrors.length > 0 ? `
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #856404;">⚠️ Zıplama Hataları (${report.jumpErrors.length}):</h3>
        ${report.jumpErrors.map(err => `
          <div style="margin: 10px 0; padding: 10px; background-color: white; border-radius: 3px;">
            <strong>StyleCode:</strong> ${err.style.StyleCode}<br>
            <strong>Mevcut Kod:</strong> ${err.currentCode} (${err.currentNumber})<br>
            <strong>Beklenen Kod:</strong> ${err.expectedCode} (${err.expectedNumber})<br>
            <strong>Son Bulunan:</strong> ${err.lastFoundNumber}<br>
            <strong>Zıplama Miktarı:</strong> ${err.jumpSize} sayı<br>
            <strong>Season:</strong> ${err.style.Season?.Name || 'N/A'}<br>
            <strong>Category:</strong> ${err.style.ProductSubSubCategory?.Name || 'N/A'}
          </div>
        `).join('')}
      </div>
    ` : '<p style="color: #28a745;">✅ Zıplama hatası yok</p>';

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #0078d4;">📊 PLM Günlük Rapor</h2>
        <p style="font-size: 14px; color: #666;">${report.date} - ${new Date().toLocaleString('tr-TR')}</p>

        <div style="background-color: #e7f3ff; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Özet</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px;"><strong>Toplam Kontrol:</strong></td>
              <td style="padding: 8px;">${report.totalChecked} kayıt</td>
            </tr>
            <tr>
              <td style="padding: 8px;"><strong>✅ Başarılı:</strong></td>
              <td style="padding: 8px; color: #28a745;">${report.successCount} kayıt</td>
            </tr>
            <tr>
              <td style="padding: 8px;"><strong>❌ Hatalı:</strong></td>
              <td style="padding: 8px; color: #d9534f;">${totalErrors} kayıt</td>
            </tr>
            <tr>
              <td style="padding: 8px;"><strong>Son Kontrol:</strong></td>
              <td style="padding: 8px;">${report.lastCheckTime ? new Date(report.lastCheckTime).toLocaleString('tr-TR') : 'N/A'}</td>
            </tr>
          </table>
        </div>

        ${duplicateSection}
        ${jumpSection}

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; font-size: 12px;">
          Bu mail otomatik olarak her gün 20:00'de PLM Monitoring sistemi tarafından gönderilir.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: `📊 PLM Günlük Rapor - ${report.date}`,
      html: html
    });

    console.log('✅ Günlük rapor maili gönderildi');
  } catch (error) {
    console.error('❌ Günlük rapor mail gönderme hatası:', error.message);
  }
}

module.exports = {
  sendDuplicateAlert,
  sendDailyReport
};

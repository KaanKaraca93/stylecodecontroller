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

// Mail gönderilen duplicate StyleId'leri takip et (aynı maili tekrar göndermemek için)
const sentDuplicateAlerts = new Set();

/**
 * Anında hata maili - Duplicate hatası için
 * NOT: Aynı StyleId için sadece 1 kere mail gönderir
 */
async function sendDuplicateAlert(duplicateError) {
  try {
    const { style, last11, duplicates } = duplicateError;
    
    // Bu StyleId için daha önce mail gönderildi mi?
    if (sentDuplicateAlerts.has(style.StyleId)) {
      console.log(`ℹ️ Duplicate alert zaten gönderildi: ${style.StyleCode} (StyleId: ${style.StyleId})`);
      return false;
    }
    
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

    // Mail gönderildi olarak işaretle
    sentDuplicateAlerts.add(style.StyleId);
    
    console.log('✅ Duplicate alert maili gönderildi:', style.StyleCode);
    return true;
    
  } catch (error) {
    console.error('❌ Duplicate mail gönderme hatası:', error.message);
    return false;
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
    
    // Oranları hesapla
    const successRate = report.totalChecked > 0 
      ? ((report.successCount / report.totalChecked) * 100).toFixed(2)
      : 0;
    const errorRate = report.totalChecked > 0
      ? ((totalErrors / report.totalChecked) * 100).toFixed(2)
      : 0;

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
          <h3>📊 Özet İstatistikler</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px;"><strong>Toplam Model:</strong></td>
              <td style="padding: 8px; font-size: 18px;">${report.totalChecked} adet</td>
            </tr>
            <tr style="background-color: #d4edda;">
              <td style="padding: 8px;"><strong>✅ Başarılı:</strong></td>
              <td style="padding: 8px; color: #155724; font-weight: bold;">${report.successCount} adet (${successRate}%)</td>
            </tr>
            <tr style="background-color: #f8d7da;">
              <td style="padding: 8px;"><strong>❌ Hatalı:</strong></td>
              <td style="padding: 8px; color: #721c24; font-weight: bold;">${totalErrors} adet (${errorRate}%)</td>
            </tr>
            <tr>
              <td style="padding: 8px; padding-left: 30px;">└ Duplicate:</td>
              <td style="padding: 8px;">${report.duplicateErrors.length} adet</td>
            </tr>
            <tr>
              <td style="padding: 8px; padding-left: 30px;">└ Zıplama:</td>
              <td style="padding: 8px;">${report.jumpErrors.length} adet</td>
            </tr>
            <tr>
              <td style="padding: 8px;"><strong>Son Kontrol:</strong></td>
              <td style="padding: 8px;">${report.lastCheckTime ? new Date(report.lastCheckTime).toLocaleString('tr-TR') : 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px;"><strong>Kontrol Sayısı:</strong></td>
              <td style="padding: 8px;">${report.checks?.length || 0} kez</td>
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

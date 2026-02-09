require('dotenv').config();
const express = require('express');
const cron = require('node-cron');

// Services
const { getTodayStyles, getAllStyles } = require('./services/plm.service');
const { checkDuplicates, checkJumps } = require('./services/validator.service');
const { updateReport, loadDailyReport, clearReport } = require('./utils/logger.util');
const { sendDuplicateAlert, sendDailyReport } = require('./utils/mail.util');

const app = express();
const PORT = process.env.PORT || 3000;

// PLM Monitoring Ana Fonksiyon
async function runPLMCheck() {
  try {
    console.log('\n🔍 ========== PLM KONTROL BAŞLADI ==========');
    console.log('⏰ Zaman:', new Date().toLocaleString('tr-TR'));

    // 1. Bugün create edilmiş Style'ları çek
    const todayStyles = await getTodayStyles();
    
    if (todayStyles.length === 0) {
      console.log('ℹ️ Bugün create edilmiş Style bulunamadı');
      return;
    }

    // 2. Tüm Style'ları çek (Duplicate kontrolü için)
    const allStyles = await getAllStyles();

    // 3. Senaryo 1: Duplicate Kontrolü
    console.log('\n🔍 Senaryo 1: Duplicate Kontrolü...');
    const duplicateErrors = checkDuplicates(todayStyles, allStyles);
    
    // Duplicate hatası varsa ANINDA MAIL GÖNDER
    for (const error of duplicateErrors) {
      await sendDuplicateAlert(error);
    }

    // 4. Senaryo 2: Zıplama Kontrolü
    console.log('\n🔍 Senaryo 2: Zıplama Kontrolü...');
    const jumpErrors = checkJumps(todayStyles, allStyles);

    // 5. Sonuçları kaydet
    const totalErrors = duplicateErrors.length + jumpErrors.length;
    const checkResult = {
      totalChecked: todayStyles.length,
      successCount: todayStyles.length - totalErrors,
      duplicateErrors: duplicateErrors,
      jumpErrors: jumpErrors
    };

    await updateReport(checkResult);

    console.log('\n📊 Kontrol Özeti:');
    console.log(`   Toplam: ${checkResult.totalChecked}`);
    console.log(`   ✅ Başarılı: ${checkResult.successCount}`);
    console.log(`   🚨 Duplicate: ${duplicateErrors.length}`);
    console.log(`   ⚠️ Zıplama: ${jumpErrors.length}`);
    console.log('========== PLM KONTROL BİTTİ ==========\n');

  } catch (error) {
    console.error('❌ PLM kontrol hatası:', error.message);
  }
}

// Gün Sonu Raporu Gönder
async function sendEndOfDayReport() {
  try {
    console.log('\n📊 ========== GÜN SONU RAPORU ==========');
    
    const report = await loadDailyReport();
    await sendDailyReport(report);
    
    // Rapor gönderildikten sonra dosyayı sil
    await clearReport();
    
    console.log('========== GÜN SONU RAPORU TAMAMLANDI ==========\n');
  } catch (error) {
    console.error('❌ Gün sonu rapor hatası:', error.message);
  }
}

// ========== SCHEDULE AYARLARI ==========

// 1. PLM Monitoring - Her 5 dakikada bir kontrol
cron.schedule('*/5 * * * *', () => {
  console.log('🕐 PLM Monitoring Cron tetiklendi:', new Date().toLocaleString('tr-TR'));
  runPLMCheck();
});

// 2. Gün Sonu Raporu - Her gün 20:00'de
cron.schedule('0 20 * * *', () => {
  console.log('🕐 Gün Sonu Raporu Cron tetiklendi:', new Date().toLocaleString('tr-TR'));
  sendEndOfDayReport();
});

console.log('⏰ Schedule aktif:');
console.log('   - PLM Kontrol: Her 5 dakikada bir');
console.log('   - Gün Sonu Rapor: Her gün 20:00');

// ========================================

// ========== EXPRESS ROUTES ==========

app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'PLM Monitoring System çalışıyor!',
    time: new Date().toLocaleString('tr-TR'),
    schedules: {
      plmCheck: 'Her 5 dakikada bir',
      dailyReport: 'Her gün 20:00'
    }
  });
});

// Manuel PLM kontrolü
app.get('/check-now', async (req, res) => {
  try {
    await runPLMCheck();
    res.json({ 
      success: true, 
      message: 'PLM kontrolü tamamlandı!',
      time: new Date().toLocaleString('tr-TR')
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Manuel gün sonu raporu
app.get('/send-report', async (req, res) => {
  try {
    await sendEndOfDayReport();
    res.json({ 
      success: true, 
      message: 'Gün sonu raporu gönderildi!',
      time: new Date().toLocaleString('tr-TR')
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Günlük raporu görüntüle
app.get('/daily-report', async (req, res) => {
  try {
    const report = await loadDailyReport();
    res.json(report);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log('\n🚀 ========================================');
  console.log(`   PLM MONITORING SYSTEM BAŞLATILDI`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Zaman: ${new Date().toLocaleString('tr-TR')}`);
  console.log('========================================');
  console.log('\n📡 Endpoints:');
  console.log(`   GET /              - Status`);
  console.log(`   GET /check-now     - Manuel PLM kontrolü`);
  console.log(`   GET /send-report   - Manuel gün sonu raporu`);
  console.log(`   GET /daily-report  - Günlük raporu görüntüle`);
  console.log('\n');
});

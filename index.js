require('dotenv').config();
const express = require('express');
const cron = require('node-cron');

// Services
const { getStylesSinceLastCheck, getStylesSince, getAllStyles, lockDuplicateStyles } = require('./services/plm.service');
const { checkDuplicates, checkJumps } = require('./services/validator.service');
const { updateReport, loadDailyReport, clearReport } = require('./utils/logger.util');
const { sendDuplicateAlert, sendDailyReport } = require('./utils/mail.util');

const app = express();
app.use(express.json()); // JSON body parser
const PORT = process.env.PORT || 3000;

const { validateSingleStyle } = require('./services/style-validator.service');

// PLM Monitoring Ana Fonksiyon
async function runPLMCheck() {
  try {
    console.log('\n🔍 ========== PLM KONTROL BAŞLADI ==========');
    console.log('⏰ Zaman:', new Date().toLocaleString('tr-TR'));

    // 1. Son kontrol zamanını al
    const report = await loadDailyReport();
    const lastCheckTime = report.lastCheckTime;
    
    // 2. Son kontrolden sonra create edilmiş Style'ları çek
    const newStyles = await getStylesSinceLastCheck(lastCheckTime);
    
    if (newStyles.length === 0) {
      console.log('ℹ️ Yeni Style bulunamadı');
      
      // Boş check kaydet
      await updateReport({
        totalChecked: 0,
        successCount: 0,
        duplicateErrors: [],
        jumpErrors: []
      });
      
      return;
    }

    // 3. Tüm Style'ları çek (Karşılaştırma için)
    const allStyles = await getAllStyles();

    // 4. Senaryo 1: Duplicate Kontrolü
    console.log('\n🔍 Senaryo 1: Duplicate Kontrolü...');
    const duplicateErrors = checkDuplicates(newStyles, allStyles);
    
    // Duplicate hatası varsa:
    if (duplicateErrors.length > 0) {
      // 1. ANINDA MAIL GÖNDER (sadece daha önce gönderilmemişse)
      for (const error of duplicateErrors) {
        await sendDuplicateAlert(error);
      }
      
      // 2. Duplicate Style'ları KİLİTLE (MarketField4Id = 1)
      const duplicateStyleIds = duplicateErrors.map(e => e.style.StyleId);
      await lockDuplicateStyles(duplicateStyleIds);
    }

    // 5. Senaryo 2: Zıplama Kontrolü
    console.log('\n🔍 Senaryo 2: Zıplama Kontrolü...');
    const jumpErrors = checkJumps(newStyles, allStyles);

    // 6. Sonuçları kaydet
    const totalErrors = duplicateErrors.length + jumpErrors.length;
    const checkResult = {
      totalChecked: newStyles.length,
      successCount: newStyles.length - totalErrors,
      duplicateErrors: duplicateErrors,
      jumpErrors: jumpErrors
    };

    await updateReport(checkResult);

    console.log('\n📊 Kontrol Özeti:');
    console.log(`   Toplam: ${checkResult.totalChecked}`);
    console.log(`   ✅ Başarılı: ${checkResult.successCount}`);
    console.log(`   🚨 Duplicate: ${duplicateErrors.length} ${duplicateErrors.length > 0 ? '(KİLİTLENDİ)' : ''}`);
    console.log(`   ⚠️ Zıplama: ${jumpErrors.length}`);
    console.log('========== PLM KONTROL BİTTİ ==========\n');

  } catch (error) {
    console.error('❌ PLM kontrol hatası:', error.message);
    console.error(error.stack);
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

// ========== ARALIK KONTROL ENDPOİNT ==========

/**
 * Belirli saat/gün aralığı için tek seferlik kontrol
 * GET /check-range?hours=48
 * GET /check-range?days=2
 * Sadece rapor döner, mail atmaz, PLM'e yazma yapmaz
 */
app.get('/check-range', async (req, res) => {
  try {
    const hours = req.query.hours ? parseInt(req.query.hours) : null;
    const days  = req.query.days  ? parseInt(req.query.days)  : null;

    if (!hours && !days) {
      return res.status(400).json({ success: false, error: 'hours veya days parametresi gerekli. Örnek: /check-range?days=2' });
    }

    const totalHours = hours || (days * 24);
    const sinceDate  = new Date(Date.now() - totalHours * 60 * 60 * 1000);

    console.log(`\n📅 ===== ARALIK KONTROL: Son ${totalHours} saat =====`);
    console.log(`   Başlangıç: ${sinceDate.toLocaleString('tr-TR')}`);
    console.log(`   Bitiş    : ${new Date().toLocaleString('tr-TR')}`);

    // 1. Aralıktaki Style'ları çek
    const rangeStyles = await getStylesSince(sinceDate);

    if (rangeStyles.length === 0) {
      return res.json({
        success: true,
        summary: { period: `Son ${totalHours} saat`, since: sinceDate, total: 0, success: 0, duplicates: 0, jumps: 0 },
        duplicateErrors: [],
        jumpErrors: [],
        message: 'Bu aralıkta yeni model bulunamadı'
      });
    }

    // 2. Tüm Style'ları çek (karşılaştırma için)
    const allStyles = await getAllStyles();

    // 3. Kontroller
    const duplicateErrors = checkDuplicates(rangeStyles, allStyles);
    const jumpErrors      = checkJumps(rangeStyles, allStyles);

    const totalErrors  = duplicateErrors.length + jumpErrors.length;
    const successCount = rangeStyles.length - totalErrors;

    const summary = {
      period    : `Son ${totalHours} saat`,
      since     : sinceDate,
      until     : new Date(),
      total     : rangeStyles.length,
      success   : successCount,
      duplicates: duplicateErrors.length,
      jumps     : jumpErrors.length,
      successRate: `${((successCount / rangeStyles.length) * 100).toFixed(1)}%`,
      errorRate  : `${((totalErrors  / rangeStyles.length) * 100).toFixed(1)}%`
    };

    console.log(`\n📊 Sonuç: ${rangeStyles.length} model | ✅ ${successCount} başarılı | 🚨 ${duplicateErrors.length} duplicate | ⚠️ ${jumpErrors.length} zıplama`);
    console.log('===== ARALIK KONTROL BİTTİ =====\n');

    res.json({
      success: true,
      summary,
      duplicateErrors: duplicateErrors.map(e => ({
        StyleCode  : e.style.StyleCode,
        StyleId    : e.style.StyleId,
        last11     : e.last11,
        Season     : e.style.Season?.Name || 'N/A',
        Brand      : e.style.Brand?.Name  || 'N/A',
        Category   : e.style.ProductSubSubCategory?.Name || 'N/A',
        CreateDate : e.style.CreateDate,
        duplicates : e.duplicates
      })),
      jumpErrors: jumpErrors.map(e => ({
        StyleCode      : e.style.StyleCode,
        StyleId        : e.style.StyleId,
        currentCode    : e.currentCode,
        expectedCode   : e.expectedCode,
        jumpSize       : e.jumpSize,
        Season         : e.style.Season?.Name || 'N/A',
        Category       : e.style.ProductSubSubCategory?.Name || 'N/A',
        CreateDate     : e.style.CreateDate
      }))
    });

  } catch (error) {
    console.error('❌ Aralık kontrol hatası:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== ENTİGRASYON VALİDASYON ENDPOİNT ==========

/**
 * Entegrasyon için Style validasyonu
 * POST /validate-style
 * 
 * Request Body:
 * {
 *   "BatchId": "...",
 *   "Events": [
 *     { "EntityId": "36", ... }
 *   ]
 * }
 * 
 * Response:
 * - Duplicate varsa: Status = "Duplicate"
 * - Hata yoksa: Gelen JSON aynen döner
 */
app.post('/validate-style', async (req, res) => {
  try {
    const requestBody = req.body;

    console.log('\n🔍 ========== ENTEGRASYON VALIDASYON ==========');
    console.log('Request alındı:', JSON.stringify(requestBody, null, 2));

    // 1. EntityId'yi al (StyleCode)
    if (!requestBody.Events || requestBody.Events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Events array boş veya eksik'
      });
    }

    const event = requestBody.Events[0];
    const styleCode = event.EntityId;

    if (!styleCode) {
      return res.status(400).json({
        success: false,
        error: 'EntityId bulunamadı'
      });
    }

    console.log(`📋 EntityId (StyleCode): ${styleCode}`);

    // 2. Style validasyonu yap
    const validation = await validateSingleStyle(styleCode);

    // 3. Response hazırla - SADECE orijinal JSON, ekstra alan yok
    let response = { ...requestBody };

    if (!validation.found) {
      // StyleCode bulunamadı
      response.Events[0].Status = 'NotFound';
      console.log('❌ STYLE BULUNAMADI');
    } else if (validation.isDuplicate) {
      // Duplicate hatası var - SADECE Status değiştir
      response.Events[0].Status = 'Duplicate';
      console.log('🚨 DUPLICATE TESPİT EDİLDİ!');
      console.log(`   StyleCode: ${validation.style.StyleCode}`);
      console.log(`   Last 11: ${validation.last11}`);
      console.log(`   Duplicate sayısı: ${validation.duplicates.length}`);
    } else {
      // Hata yok, geçerli - Gelen JSON aynen döner
      console.log('✅ STYLE GEÇERLİ');
      console.log(`   StyleCode: ${validation.style.StyleCode}`);
      console.log(`   Last 11: ${validation.last11}`);
    }

    console.log('Response:', JSON.stringify(response, null, 2));
    console.log('========== VALIDASYON TAMAMLANDI ==========\n');

    res.json(response);

  } catch (error) {
    console.error('❌ Validasyon endpoint hatası:', error.message);
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
  console.log(`   GET  /              - Status`);
  console.log(`   GET  /check-now     - Manuel PLM kontrolü`);
  console.log(`   GET  /send-report   - Manuel gün sonu raporu`);
  console.log(`   GET  /daily-report  - Günlük raporu görüntüle`);
  console.log(`   POST /validate-style - Entegrasyon validasyonu`);
  console.log('\n');
});

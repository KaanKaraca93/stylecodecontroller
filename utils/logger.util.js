const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const LOG_FILE = path.join(DATA_DIR, 'daily-report.json');

/**
 * Data klasörünü oluştur
 */
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Data klasörü oluşturulamadı:', error);
  }
}

/**
 * Günlük rapor yükle veya yeni oluştur
 */
async function loadDailyReport() {
  await ensureDataDir();

  try {
    const data = await fs.readFile(LOG_FILE, 'utf8');
    const report = JSON.parse(data);
    
    // Eğer farklı gün ise yeni rapor başlat
    const today = new Date().toISOString().split('T')[0];
    if (report.date !== today) {
      return createNewReport();
    }
    
    return report;
  } catch (error) {
    // Dosya yoksa yeni oluştur
    return createNewReport();
  }
}

/**
 * Yeni günlük rapor oluştur
 */
function createNewReport() {
  const today = new Date().toISOString().split('T')[0];
  return {
    date: today,
    totalChecked: 0,
    successCount: 0,
    duplicateErrors: [],
    jumpErrors: [],
    lastCheckTime: null,
    checks: []
  };
}

/**
 * Günlük raporu kaydet
 */
async function saveDailyReport(report) {
  await ensureDataDir();
  await fs.writeFile(LOG_FILE, JSON.stringify(report, null, 2), 'utf8');
  console.log('📝 Günlük rapor kaydedildi');
}

/**
 * Raporu güncelle - yeni kontrol sonuçlarını ekle
 */
async function updateReport(checkResult) {
  const report = await loadDailyReport();
  
  report.totalChecked += checkResult.totalChecked;
  report.successCount += checkResult.successCount;
  report.lastCheckTime = new Date().toISOString();
  
  // Duplicate hatalarını ekle - SADECE YENİ OLANLARI (StyleId'ye göre unique)
  if (checkResult.duplicateErrors && checkResult.duplicateErrors.length > 0) {
    const existingDuplicateIds = new Set(report.duplicateErrors.map(e => e.style.StyleId));
    const newDuplicates = checkResult.duplicateErrors.filter(e => !existingDuplicateIds.has(e.style.StyleId));
    
    if (newDuplicates.length > 0) {
      report.duplicateErrors.push(...newDuplicates);
      console.log(`📝 ${newDuplicates.length} yeni duplicate hatası rapora eklendi`);
    }
  }
  
  // Zıplama hatalarını ekle - SADECE YENİ OLANLARI (StyleId'ye göre unique)
  if (checkResult.jumpErrors && checkResult.jumpErrors.length > 0) {
    const existingJumpIds = new Set(report.jumpErrors.map(e => e.style.StyleId));
    const newJumps = checkResult.jumpErrors.filter(e => !existingJumpIds.has(e.style.StyleId));
    
    if (newJumps.length > 0) {
      report.jumpErrors.push(...newJumps);
      console.log(`📝 ${newJumps.length} yeni zıplama hatası rapora eklendi`);
    }
  }

  // Kontrol geçmişi
  report.checks.push({
    time: new Date().toISOString(),
    totalChecked: checkResult.totalChecked,
    duplicates: checkResult.duplicateErrors?.length || 0,
    jumps: checkResult.jumpErrors?.length || 0
  });

  await saveDailyReport(report);
  return report;
}

/**
 * Raporu sil (gün sonu mail sonrası)
 */
async function clearReport() {
  try {
    await fs.unlink(LOG_FILE);
    console.log('🗑️ Günlük rapor dosyası silindi');
  } catch (error) {
    console.log('ℹ️ Silinecek rapor dosyası bulunamadı');
  }
}

module.exports = {
  loadDailyReport,
  saveDailyReport,
  updateReport,
  clearReport,
  createNewReport
};

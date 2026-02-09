const { getAllStyles } = require('./plm.service');
const { isValidStyleCode, getLast11Digits } = require('./validator.service');

/**
 * Tek bir StyleId için duplicate kontrolü yap
 */
async function validateSingleStyle(styleId) {
  try {
    console.log(`🔍 StyleId ${styleId} için validasyon başladı...`);

    // 1. Tüm Style'ları çek
    const allStyles = await getAllStyles();

    // 2. İlgili Style'ı bul
    const targetStyle = allStyles.find(s => s.StyleId === parseInt(styleId));

    if (!targetStyle) {
      console.log(`❌ StyleId ${styleId} bulunamadı`);
      return {
        found: false,
        error: 'StyleId bulunamadı'
      };
    }

    console.log(`✅ Style bulundu: ${targetStyle.StyleCode}`);

    // 3. StyleCode kontrolü - 12 hane mi?
    if (!isValidStyleCode(targetStyle.StyleCode)) {
      console.log(`⚠️ StyleCode 12 haneli değil: ${targetStyle.StyleCode}`);
      return {
        found: true,
        style: targetStyle,
        isValid: true, // 12 haneli olmayan gerçek model değil, validate olarak geç
        isDuplicate: false,
        message: 'StyleCode 12 haneli değil, gerçek model değil'
      };
    }

    // 4. Son 11 haneyi al
    const last11 = getLast11Digits(targetStyle.StyleCode);
    if (!last11) {
      return {
        found: true,
        style: targetStyle,
        isValid: true,
        isDuplicate: false,
        message: 'StyleCode format hatası'
      };
    }

    // 5. Duplicate kontrolü - başka bir Style'da aynı son 11 hane var mı?
    const duplicates = allStyles.filter(s => {
      if (s.StyleId === targetStyle.StyleId) return false; // Kendini hariç tut
      if (!isValidStyleCode(s.StyleCode)) return false; // 12 haneli olmayanları atla

      const sLast11 = getLast11Digits(s.StyleCode);
      return sLast11 === last11;
    });

    if (duplicates.length > 0) {
      console.log(`🚨 DUPLICATE BULUNDU! StyleCode: ${targetStyle.StyleCode}, Son 11: ${last11}`);
      console.log(`   Duplicate olan kayıtlar: ${duplicates.map(d => d.StyleCode).join(', ')}`);

      return {
        found: true,
        style: targetStyle,
        isValid: false,
        isDuplicate: true,
        last11: last11,
        duplicates: duplicates.map(d => ({
          StyleId: d.StyleId,
          StyleCode: d.StyleCode
        })),
        message: `Duplicate hata: Son 11 hane (${last11}) başka Style'larda kullanılmış`
      };
    }

    // 6. Hata yok, başarılı
    console.log(`✅ Style geçerli, duplicate yok: ${targetStyle.StyleCode}`);
    return {
      found: true,
      style: targetStyle,
      isValid: true,
      isDuplicate: false,
      last11: last11,
      message: 'Style geçerli'
    };

  } catch (error) {
    console.error('❌ Style validasyon hatası:', error.message);
    throw error;
  }
}

module.exports = {
  validateSingleStyle
};

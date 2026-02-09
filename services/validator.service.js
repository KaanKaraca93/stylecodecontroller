/**
 * StyleCode validasyonu - 12 hane kontrolü
 */
function isValidStyleCode(styleCode) {
  return styleCode && styleCode.length === 12;
}

/**
 * StyleCode'dan son 11 haneyi al
 */
function getLast11Digits(styleCode) {
  if (!styleCode || styleCode.length < 11) return null;
  return styleCode.slice(-11);
}

/**
 * Senaryo 1: DUPLICATE Kontrolü
 * Son 11 hane unique mi?
 */
function checkDuplicates(todayStyles, allStyles) {
  const duplicateErrors = [];

  // Sadece 12 haneli kodları kontrol et
  const validTodayStyles = todayStyles.filter(s => isValidStyleCode(s.StyleCode));

  for (const style of validTodayStyles) {
    const last11 = getLast11Digits(style.StyleCode);
    if (!last11) continue;

    // Tüm Style'larda son 11 haneyi ara
    const duplicates = allStyles.filter(s => {
      if (s.StyleId === style.StyleId) return false; // Kendini hariç tut
      if (!isValidStyleCode(s.StyleCode)) return false; // 12 haneli olmayanları atla
      
      const sLast11 = getLast11Digits(s.StyleCode);
      return sLast11 === last11;
    });

    if (duplicates.length > 0) {
      duplicateErrors.push({
        style: style,
        last11: last11,
        duplicates: duplicates.map(d => ({
          StyleId: d.StyleId,
          StyleCode: d.StyleCode
        }))
      });

      console.log(`🚨 DUPLICATE BULUNDU! StyleCode: ${style.StyleCode}, Son 11: ${last11}`);
    }
  }

  return duplicateErrors;
}

/**
 * Senaryo 2: ZIPLAMA Kontrolü
 * Aynı SeasonId ve ProductSubSubCategoryId olan kayıtlar sıralı mı?
 */
function checkJumps(todayStyles, allStyles) {
  const jumpErrors = [];

  // Sadece 12 haneli kodları kontrol et
  const validTodayStyles = todayStyles.filter(s => isValidStyleCode(s.StyleCode));

  for (const style of validTodayStyles) {
    const { SeasonId, ProductSubSubCategoryId, StyleCode } = style;
    
    // SeasonId veya ProductSubSubCategoryId yoksa kontrol etme
    if (!SeasonId || !ProductSubSubCategoryId) continue;

    const last11 = getLast11Digits(StyleCode);
    if (!last11) continue;

    // Son 11 hanenin numerik kısmını çıkar (örn: W6240057038 -> 6240057038)
    const numericPart = last11.replace(/\D/g, '');
    if (!numericPart) continue;

    const currentNumber = parseInt(numericPart, 10);

    // Aynı Season ve Category'deki tüm Style'ları bul
    const relatedStyles = allStyles.filter(s => {
      return s.SeasonId === SeasonId && 
             s.ProductSubSubCategoryId === ProductSubSubCategoryId &&
             isValidStyleCode(s.StyleCode);
    });

    // Son 11 hanelerin numerik kısımlarını çıkar ve sırala
    const existingNumbers = relatedStyles
      .map(s => {
        const l11 = getLast11Digits(s.StyleCode);
        if (!l11) return null;
        const num = l11.replace(/\D/g, '');
        return num ? parseInt(num, 10) : null;
      })
      .filter(n => n !== null && n < currentNumber) // Sadece mevcut sayıdan küçük olanlar
      .sort((a, b) => a - b);

    // Bir önceki sayı olmalı (veya daha eskiler)
    if (existingNumbers.length > 0) {
      const lastNumber = existingNumbers[existingNumbers.length - 1];
      const expectedNumber = currentNumber - 1;

      // Zıplama var mı?
      if (lastNumber < expectedNumber) {
        // Prefix'i bul (örn: W -> harfler)
        const prefix = last11.replace(/\d/g, '');
        const expectedCode = prefix + expectedNumber.toString().padStart(numericPart.length, '0');
        
        jumpErrors.push({
          style: style,
          currentCode: last11,
          currentNumber: currentNumber,
          expectedCode: expectedCode,
          expectedNumber: expectedNumber,
          lastFoundNumber: lastNumber,
          jumpSize: currentNumber - lastNumber
        });

        console.log(`⚠️ ZIPLAMA BULUNDU! StyleCode: ${StyleCode}, Eksik: ${expectedCode}, Zıplama: ${currentNumber - lastNumber}`);
      }
    }
  }

  return jumpErrors;
}

module.exports = {
  isValidStyleCode,
  getLast11Digits,
  checkDuplicates,
  checkJumps
};

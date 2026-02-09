const axios = require('axios');
const { getAccessToken } = require('./auth.service');

const PLM_API_BASE = 'https://mingle-ionapi.eu1.inforcloudsuite.com/ATJZAMEWEF5P4SNV_TST/FASHIONPLM/odata2/api/odata2';

/**
 * Son kontrolden sonra create edilmiş Style kayıtlarını çek
 */
async function getStylesSinceLastCheck(lastCheckTime) {
  try {
    const token = await getAccessToken();
    
    // Eğer lastCheckTime yoksa bugünün başlangıcını kullan
    let sinceTime;
    if (lastCheckTime) {
      sinceTime = new Date(lastCheckTime);
    } else {
      sinceTime = new Date();
      sinceTime.setUTCHours(0, 0, 0, 0);
    }
    
    const sinceTimeISO = sinceTime.toISOString();

    console.log('📊 PLM API çağrısı yapılıyor...');
    console.log('Son kontrol zamanı:', lastCheckTime || 'İlk kontrol');
    console.log('Filtreleme (UTC):', sinceTimeISO);

    const url = `${PLM_API_BASE}/Style`;
    const params = {
      $select: 'StyleId,StyleCode,Name,BrandId,SeasonId,ProductSubSubCategoryId,ModifyDate,CreateDate',
      $expand: 'Season,Brand,ProductSubSubCategory',
      $filter: `CreateDate ge ${sinceTimeISO}`
    };

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      params
    });

    const styles = response.data.value || [];
    console.log(`✅ ${styles.length} adet yeni Style bulundu (${sinceTimeISO} sonrası)`);

    return styles;

  } catch (error) {
    console.error('❌ PLM API hatası:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Tüm Style kayıtlarını çek (Duplicate kontrolü için)
 */
async function getAllStyles() {
  try {
    const token = await getAccessToken();

    console.log('📊 Tüm Style kayıtları çekiliyor (Duplicate kontrolü için)...');

    const url = `${PLM_API_BASE}/Style`;
    const params = {
      $select: 'StyleId,StyleCode,SeasonId,ProductSubSubCategoryId'
    };

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      params
    });

    const styles = response.data.value || [];
    console.log(`✅ Toplam ${styles.length} Style kaydı alındı`);

    return styles;

  } catch (error) {
    console.error('❌ Tüm Style çekme hatası:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Duplicate Style'lara kilit koy (MarketField4Id = 1)
 */
async function lockDuplicateStyles(styleIds) {
  try {
    if (!styleIds || styleIds.length === 0) {
      console.log('ℹ️ Kilitlenecek Style yok');
      return;
    }

    const token = await getAccessToken();
    const url = `${PLM_API_BASE}/Style`;

    // Patch payload - her StyleId için MarketField4Id = 1
    const payload = styleIds.map(id => ({
      StyleId: id,
      MarketField4Id: 1
    }));

    console.log(`🔒 ${styleIds.length} adet Style kilitleniyor...`);

    const response = await axios.patch(url, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log(`✅ ${styleIds.length} Style kilitlendi (MarketField4Id=1)`);
    return response.data;

  } catch (error) {
    console.error('❌ Style kilitleme hatası:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  getStylesSinceLastCheck,
  getAllStyles,
  lockDuplicateStyles
};

const axios = require('axios');
const { getAccessToken } = require('./auth.service');

const PLM_API_BASE = 'https://mingle-ionapi.eu1.inforcloudsuite.com/ATJZAMEWEF5P4SNV_TST/FASHIONPLM/odata2/api/odata2';

/**
 * Bugün create edilmiş Style kayıtlarını çek
 */
async function getTodayStyles() {
  try {
    const token = await getAccessToken();
    
    // Bugünün başlangıcı (UTC)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayStartISO = todayStart.toISOString();

    console.log('📊 PLM API çağrısı yapılıyor...');
    console.log('Bugün (UTC):', todayStartISO);

    const url = `${PLM_API_BASE}/Style`;
    const params = {
      $select: 'StyleId,StyleCode,Name,BrandId,SeasonId,ProductSubSubCategoryId,ModifyDate,CreateDate',
      $expand: 'Season,Brand,ProductSubSubCategory',
      $filter: `CreateDate ge ${todayStartISO}`
    };

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      params
    });

    const styles = response.data.value || [];
    console.log(`✅ ${styles.length} adet bugün create edilmiş Style bulundu`);

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

module.exports = {
  getTodayStyles,
  getAllStyles
};

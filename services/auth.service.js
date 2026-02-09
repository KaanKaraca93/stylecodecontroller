const axios = require('axios');

// Infor PLM OAuth2 Credentials (Hard-coded)
const AUTH_CONFIG = {
  tokenUrl: 'https://mingle-sso.eu1.inforcloudsuite.com:443/ATJZAMEWEF5P4SNV_TST/as/token.oauth2',
  clientId: 'ATJZAMEWEF5P4SNV_TST~vlWkwz2P74KAmRFfihVsdK5yjnHvnfPUrcOt4nl6gkI',
  clientSecret: 'HU1TUcBOX1rkp-uuYKUQ3simFEYzPKNM-XIyf4ewIxe-TYUZOK7RAlXUPd_FwSZMAslt8I9RZmv23xItVKY8EQ',
  username: 'ATJZAMEWEF5P4SNV_TST#wRJ7YQKSo12wG4id-Z3INRAKK-8Sc3OOy469Cdx0JX_BmoI8UVYn-QE0-mu_XeBHXhBIIqNco_B9rJB6o_PVeA',
  password: 'CQvOTffe-th5p4Hzjq6VPz9pHYJuI3QtW_HhSu2FCyBcbvlJI0p-udS-1AQINB9nSUt1ISHb2u5dh1cjgLDScQ'
};

let cachedToken = null;
let tokenExpiry = null;

/**
 * OAuth2 Token alma
 */
async function getAccessToken() {
  // Cache kontrolü - token varsa ve geçerliyse kullan
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    console.log('✅ Cached token kullanılıyor');
    return cachedToken;
  }

  try {
    console.log('🔑 Yeni OAuth2 token alınıyor...');
    
    const params = new URLSearchParams({
      grant_type: 'password',
      username: AUTH_CONFIG.username,
      password: AUTH_CONFIG.password
    });

    const response = await axios.post(AUTH_CONFIG.tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${AUTH_CONFIG.clientId}:${AUTH_CONFIG.clientSecret}`).toString('base64')
      }
    });

    cachedToken = response.data.access_token;
    
    // Token expiry (genellikle 3600 saniye) - 5 dakika önce yenile
    const expiresIn = response.data.expires_in || 3600;
    tokenExpiry = Date.now() + ((expiresIn - 300) * 1000);

    console.log('✅ Token alındı, geçerlilik:', expiresIn, 'saniye');
    return cachedToken;

  } catch (error) {
    console.error('❌ Token alma hatası:', error.response?.data || error.message);
    throw new Error('OAuth2 token alınamadı');
  }
}

module.exports = {
  getAccessToken
};

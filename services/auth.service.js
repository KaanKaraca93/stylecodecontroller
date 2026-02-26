const axios = require('axios');

// Infor PLM OAuth2 Credentials (Hard-coded) - PRD Environment
const AUTH_CONFIG = {
  tokenUrl: 'https://mingle-sso.eu1.inforcloudsuite.com:443/ATJZAMEWEF5P4SNV_PRD/as/token.oauth2',
  clientId: 'ATJZAMEWEF5P4SNV_PRD~zWbsEgkMBlqdSXoSAXBiM8V1POA0-2Mkn1qkORhxma0',
  clientSecret: 'Ll2ehfOJ14uXzyLwR-6BIUmnQNFfhSFRadOzhfzIgK8DBs0x8_AQ3vqbiNrCVOfTyN3_v_Vyf1Yq4WMA7F68hg',
  username: 'ATJZAMEWEF5P4SNV_PRD#i8eNjPXq0sB98qp-1D4PwM9-044cZfI-qI59A1qw1L3X55uUgNkAi4TYO8kl9tzCrU8e-kY6tNbocEvsz3wPkw',
  password: 'N_WIyl8NlBrP53LI5JX3YVkbplqXDzk3dvMlRWsbIVJe261D8qluZHfJeGqHRoUa8vgncqVpEryN6k7YTGuhiw'
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

// linkedinOIDC.js – v3 | 03-jun-2025 – Expanded profile capture
const axios = require('axios');
const { jwtVerify, createRemoteJWKSet } = require('jose');

class LinkedInOIDC {
  constructor () {
    this.clientId     = process.env.LINKEDIN_CLIENT_ID;
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

    // *** use http://localhost:3000 ou o host público EXACTO cadastrado no LinkedIn ***
    this.baseUrl     = process.env.BASE_URL || 'http://localhost:3000';
    this.redirectUri = `${this.baseUrl}/callback`;

    /* ---------- endpoints OIDC ---------- */
    this.authEndpoint   = 'https://www.linkedin.com/oauth/v2/authorization';
    this.tokenEndpoint  = 'https://www.linkedin.com/oauth/v2/accessToken';
    this.userInfoEndpoint = 'https://api.linkedin.com/v2/userinfo';

    /* ---------- endpoints adicionais para perfil completo ------ */
    this.meEndpoint = 'https://api.linkedin.com/v2/me';

    /* ---------- escopos necessários ------ */
    this.scopes = ['openid', 'profile', 'email'];  // Apenas OIDC básico
  }

  /* ------------------------------------------------------------------------ */
  getAuthorizationUrl (state, nonce) {
    const p = new URLSearchParams({
      response_type : 'code',
      client_id     : this.clientId,
      redirect_uri  : this.redirectUri,
      scope         : this.scopes.join(' '),             // URLSearchParams tratará do encode
      state,                                            // prevenção CSRF
      nonce                                            // prevenção replay
    });

    return `${this.authEndpoint}?${p.toString()}`;
  }

  /* ------------------------------------------------------------------------ */
  async exchangeCodeForToken (code) {
    // LinkedIn exige application/x-www-form-urlencoded
    const body = new URLSearchParams({
      grant_type    : 'authorization_code',
      code,
      redirect_uri  : this.redirectUri,
      client_id     : this.clientId,
      client_secret : this.clientSecret
    });

    console.log('🔄 Tentando trocar código por token...');
    console.log('- Código:', code?.substring(0, 10) + '...');
    console.log('- Redirect URI:', this.redirectUri);
    console.log('- Client ID:', this.clientId);

    try {
      const { data } = await axios.post(this.tokenEndpoint, body.toString(), {
        headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      console.log('✅ Token obtido com sucesso');
      return data;   // { access_token, id_token, expires_in, … }
    } catch (e) {
      console.error('❌ Token request LinkedIn falhou:', e.response?.data || e.message);
      console.error('📝 Dados enviados:', body.toString());
      throw new Error('Falha na troca de código pelo token');
    }
  }

  /* ------------------------------------------------------------------------ */
  async getUserProfile (accessToken) {
    try {
      /* ------------------------------------------------------------------
         1. /userinfo (OIDC) já devolve:
            { sub, name, email, picture, locale, profile, ... }
         ------------------------------------------------------------------ */
      const { data: userInfo } = await axios.get(
        this.userInfoEndpoint,
        { headers:{ Authorization:`Bearer ${accessToken}` } }
      );

      /* ------------------------------------------------------------------
         2. Tentar /me para dados básicos expandidos
         ------------------------------------------------------------------ */
      let vanityName = '';
      let meHeadline = '';
      try {
        const { data: me } = await axios.get(this.meEndpoint, {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { projection: '(id,vanityName,localizedHeadline)' }
        });
        vanityName = me.vanityName || '';
        meHeadline = me.localizedHeadline || '';
      } catch(err) {
        // Continua sem quebrar
      }

      /* ------------------------------------------------------------------
         3. Tentar buscar posições atuais (pode falhar sem escopos específicos)
         ------------------------------------------------------------------ */
      let currentCompany = '';
      let currentJobTitle = '';
      try {
        const { data: positions } = await axios.get(
          'https://api.linkedin.com/v2/positions',
          { 
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { person: `urn:li:person:${userInfo.sub}` }
          }
        );
        
        // Buscar posição atual (isCurrent = true)
        const currentPosition = positions.elements?.find(pos => pos.isCurrent);
        if (currentPosition) {
          currentJobTitle = currentPosition.title || '';
          currentCompany = currentPosition.companyName || '';
        }
      } catch(err) {
        // Continua sem quebrar - usará headline
      }

      /* ------------------------------------------------------------------
         4. Construir URL do perfil (preferência: userInfo.profile > vanityName > NENHUMA)
         ------------------------------------------------------------------ */
      let profileUrl = '';
      if (userInfo.profile) {
        // LinkedIn forneceu URL direta (melhor caso)
        profileUrl = userInfo.profile;
      } else if (vanityName) {
        // Conseguimos vanityName via /me (segundo melhor)
        profileUrl = `https://www.linkedin.com/in/${vanityName}`;
      }

      /* ------------------------------------------------------------------
         5. Headline e empresa (usa dados da API se disponível, senão básico)
         ------------------------------------------------------------------ */
      let headline = meHeadline || userInfo.headline || '';
      let company = currentCompany; // Prioriza dados da API
      let jobTitle = currentJobTitle; // Prioriza dados da API
      
      // Se não conseguiu via API, usa headline como está (sem parsing)
      if (!jobTitle && headline) {
        jobTitle = headline;
      }

      return {
        linkedin_id: userInfo.sub,
        name: userInfo.name,
        email: userInfo.email,
        headline: jobTitle,           // cargo direto ou headline completo
        company: company,             // empresa da API ou vazio
        profile_url: profileUrl,      // apenas URL pública
        avatar: userInfo.picture || '',
        locale: userInfo.locale || 'pt_BR'
      };
    } catch (e) {
      console.error('Erro ao obter perfil:', e.response?.data || e.message);
      throw new Error('Falha ao obter perfil do LinkedIn');
    }
  }

  /* ------------------------------------------------------------------------ */
  async validateIdToken (idToken, nonce) {
    const JWKS = createRemoteJWKSet(
      new URL('https://www.linkedin.com/oauth/openid/jwks')
    );

    try {
      const { payload } = await jwtVerify(idToken, JWKS, {
        issuer   : 'https://www.linkedin.com',
        audience : this.clientId
      });

      if (payload.nonce !== nonce)
        throw new Error('Nonce divergente');

      return payload;          // payload.sub, .email, etc.
    } catch (e) {
      console.error('ID token inválido:', e.message);
      throw new Error('Token de identidade inválido');
    }
  }
}

module.exports = LinkedInOIDC;

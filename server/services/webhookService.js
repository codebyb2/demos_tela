const axios = require('axios');
const crypto = require('crypto');

class WebhookService {
  constructor() {
    this.webhookUrl = process.env.WEBHOOK_URL || 'https://meistrari.app.n8n.cloud/webhook-test/48c40119-d9a4-448c-9fcf-e7e247093d40';
    console.log('🔗 Webhook configurado:', this.webhookUrl);
  }

  // Hash do IP para privacidade (LGPD compliance)
  hashIP(ip) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(ip + process.env.SESSION_SECRET || 'default-salt').digest('hex').substring(0, 16);
  }

  async logDemoAccess(userData) {
    try {
      // Validação rigorosa dos dados
      const {
        name,
        email,
        demoId,
        demoTitle,
        event = 'C-Law Experience 2025',
        ipAddress
      } = userData;

      // Validações de segurança
      if (!name || typeof name !== 'string' || name.length > 100) {
        throw new Error('Nome inválido');
      }
      if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 100) {
        throw new Error('Email inválido');
      }
      if (!demoId || typeof demoId !== 'string' || demoId.length > 50) {
        throw new Error('Demo ID inválido');
      }
      if (!demoTitle || typeof demoTitle !== 'string' || demoTitle.length > 100) {
        throw new Error('Demo título inválido');
      }

      const timestamp = new Date().toISOString();
      const ipHash = ipAddress ? this.hashIP(ipAddress) : 'unknown';
      
      // Limpar dados
      const cleanData = {
        timestamp,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        demo_id: demoId,
        demo_title: demoTitle,
        event: event.trim(),
        ip_hash: ipHash,
        source: 'demo_tela_claw_2025'
      };

      // Enviar via webhook
      const response = await axios.get(this.webhookUrl, {
        params: cleanData, // Envia como query parameters para GET
        headers: {
          'User-Agent': 'Tela-Demo-System/1.0'
        },
        timeout: 5000 // 5 segundos timeout
      });

      console.log(`📡 Demo enviada via webhook: ${cleanData.name} - ${cleanData.demo_title}`);
      
      return { success: true, response: response.status };
    } catch (error) {
      console.error('❌ Erro ao enviar webhook:', error.message);
      
      // Log local em caso de falha (fallback)
      console.log(`📝 [FALLBACK] Demo acessada: ${userData.name} - ${userData.demoTitle}`);
      
      return { success: false, error: error.message };
    }
  }

  // Método para compatibilidade (não usado em webhook)
  readLogs() {
    console.warn('⚠️ readLogs não disponível com webhook - consulte n8n');
    return 'Logs disponíveis via n8n dashboard';
  }

  // Verificar conectividade com webhook
  async verifyWebhook() {
    try {
      const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Teste de conectividade'
      };
      
      const response = await axios.get(this.webhookUrl, {
        params: testData,
        headers: { 'User-Agent': 'Tela-Demo-System/1.0' },
        timeout: 3000
      });
      
      return {
        success: true,
        status: response.status,
        webhook: this.webhookUrl
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        webhook: this.webhookUrl
      };
    }
  }
}

module.exports = WebhookService; 
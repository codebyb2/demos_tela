const fs = require('fs');
const path = require('path');

class CSVService {
  constructor() {
    // Criar pasta logs fora do diretório web
    this.logsDir = path.join(__dirname, '../../logs');
    this.csvPath = path.join(this.logsDir, 'demo_access.csv');
    this.ensureLogsDirectory();
    this.initializeCSV();
  }

  ensureLogsDirectory() {
    // Criar diretório de logs se não existir
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true, mode: 0o700 }); // Apenas owner pode ler/escrever
      console.log('📁 Diretório de logs criado:', this.logsDir);
    }
  }

  initializeCSV() {
    // Verificar se o arquivo existe, se não, criar com cabeçalho
    if (!fs.existsSync(this.csvPath)) {
      const header = 'timestamp,name,email,demo_id,demo_title,event,ip_hash\n';
      fs.writeFileSync(this.csvPath, header, { mode: 0o600 }); // Apenas owner pode ler/escrever
      console.log('📊 Arquivo CSV criado com segurança:', this.csvPath);
    }
  }

  // Hash do IP para privacidade (LGPD compliance)
  hashIP(ip) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(ip + process.env.SESSION_SECRET || 'default-salt').digest('hex').substring(0, 16);
  }

  logDemoAccess(userData) {
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
      
      // Escapar vírgulas e aspas nos dados
      const escapeCsvField = (field) => {
        if (!field) return '';
        const str = String(field).trim();
        // Remover caracteres perigosos
        const cleaned = str.replace(/[<>\"'&]/g, '');
        if (cleaned.includes(',') || cleaned.includes('"') || cleaned.includes('\n')) {
          return `"${cleaned.replace(/"/g, '""')}"`;
        }
        return cleaned;
      };

      const csvLine = [
        timestamp,
        escapeCsvField(name),
        escapeCsvField(email),
        escapeCsvField(demoId),
        escapeCsvField(demoTitle),
        escapeCsvField(event),
        ipHash
      ].join(',') + '\n';

      // Append ao arquivo CSV de forma atômica
      fs.appendFileSync(this.csvPath, csvLine, { flag: 'a' });
      
      console.log(`📝 Demo registrada no CSV: ${escapeCsvField(name)} - ${escapeCsvField(demoTitle)}`);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao salvar no CSV:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Método para ler dados do CSV (apenas para admin)
  readLogs() {
    try {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Acesso negado em produção');
      }
      if (fs.existsSync(this.csvPath)) {
        return fs.readFileSync(this.csvPath, 'utf8');
      }
      return '';
    } catch (error) {
      console.error('❌ Erro ao ler CSV:', error.message);
      return '';
    }
  }

  // Verificar integridade do arquivo
  verifyIntegrity() {
    try {
      const stats = fs.statSync(this.csvPath);
      return {
        exists: true,
        size: stats.size,
        lastModified: stats.mtime,
        permissions: stats.mode.toString(8)
      };
    } catch (error) {
      return { exists: false, error: error.message };
    }
  }
}

module.exports = CSVService; 
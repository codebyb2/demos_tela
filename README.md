# 🚀 Tela Demo System - C-Law Experience 2025

Sistema de demonstrações exclusivas da Tela para o evento C-Law Experience 2025.

## ✨ Funcionalidades

- 🔐 **Autenticação LinkedIn** via OIDC
- 📱 **QR Codes únicos** para cada demo
- 🎥 **Vídeos YouTube embeddados** 
- 📡 **Logging via webhook** (n8n integration)
- 🛡️ **Segurança robusta** (LGPD compliance)
- ⏰ **Sessões de 24 horas**

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# Servidor
BASE_URL=https://demos-tela.onrender.com
NODE_ENV=production

# LinkedIn OIDC
LINKEDIN_CLIENT_ID=sua_client_id
LINKEDIN_CLIENT_SECRET=sua_client_secret

# Webhook para dados
WEBHOOK_URL=https://meistrari.app.n8n.cloud/webhook-test/[id]

# Segurança
SESSION_SECRET=chave_segura_64_caracteres
```

### LinkedIn Developer Setup

1. Crie app em [LinkedIn Developer Console](https://developer.linkedin.com/)
2. Configure redirect URI: `https://demos-tela.onrender.com/callback`
3. Ative scopes: `openid`, `profile`, `email`

## 📡 Webhook Data

Dados enviados para n8n:
```json
{
  "timestamp": "2025-01-10T14:30:45.123Z",
  "name": "João Silva",
  "email": "joao@empresa.com", 
  "demo_id": "tela_transcrição",
  "demo_title": "Transcrição de Audiência",
  "event": "C-Law Experience 2025",
  "ip_hash": "a1b2c3d4...",
  "source": "demo_tela_claw_2025"
}
```

## 🚀 Deploy

### Render
1. Configure variáveis de ambiente
2. Deploy automático via Git
3. Health check: `/healthz`

### Demos Disponíveis
- `tela_transcrição` - Transcrição de Audiência  
- `tela_interpretação` - Interpretação de Imagens
- `tela_resumo` - Resumo de Inicial
- `tela_extração` - Extração de Dados Inicial

## 🔒 Segurança

- ✅ Content Security Policy
- ✅ Rate limiting (50 req/15min produção)
- ✅ CSRF protection via state tokens
- ✅ IP hashing (LGPD compliance)
- ✅ Input sanitization & validation
- ✅ HTTPS enforcement

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+ 
- NPM ou Yarn
- Conta LinkedIn Developer
- Webhook endpoint (n8n ou similar)

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/your-org/tela-claw-demos.git
cd tela-claw-demos

# 2. Instale dependências
npm install

# 3. Configure ambiente
cp .env.example .env
# Edite .env com suas credenciais

# 4. Configure demos
# Edite demos.json com suas demonstrações

# 5. Inicie servidor
npm start
```

## 🏗️ Estrutura do Projeto

```
tela-claw-demos/
├── server/
│   ├── index.js              # Servidor principal
│   └── services/
│       ├── webhookService.js # Logging via webhook
│       └── linkedinOIDC.js   # Autenticação LinkedIn
├── views/
│   ├── index.ejs            # Página inicial
│   ├── login.ejs            # Página de login
│   ├── watch.ejs            # Visualização da demo
│   ├── demos.ejs            # Lista de demos
│   ├── callback.ejs         # Processamento OAuth
│   └── error.ejs            # Páginas de erro
├── demos.json               # Configuração das demos
├── package.json
├── .env.example
└── README.md
```

## 🔄 Fluxo de Uso

1. **👤 Visitante** escaneia QR code no estande
2. **📱 Mobile** abre página de login da demo (`/login?demo=demo_id`)
3. **🔐 LinkedIn** autentica via OAuth 2.0 + OIDC
4. **📊 Sistema** captura dados profissionais
5. **📡 Webhook** envia dados para n8n automaticamente
6. **🎥 Usuário** assiste demonstração exclusiva (`/watch?demo=demo_id`)
7. **🔄 Acesso 24h** - Pode assistir todas as outras demos
8. **📞 CTA** direcionamento para agendamento

## 🚢 Deploy no Render

1. Configure variáveis de ambiente no Render
2. Deploy automático via Git
3. Health check disponível em `/healthz`

## 🔧 Troubleshooting

### Erro: "Demo não encontrada"
- Verifique se `demos.json` está correto
- Confirme se demo ID no QR code existe

### Erro: "LinkedIn auth error"  
- Verifique credenciais LinkedIn
- Confirme redirect URI no LinkedIn Developer Console
- Teste em HTTPS (obrigatório em produção)

### Erro: "Webhook failed"
- Verifique URL do webhook em `WEBHOOK_URL`
- Teste conectividade com endpoint

## 🤝 Suporte

- **📧 Email**: tech@tela.com
- **📖 Docs**: [docs.tela.com](https://docs.tela.com)

---

**🎯 Sistema desenvolvido para C-Law Experience 2025**

*Transformando visitantes em leads qualificados através de demonstrações interativas e tecnologia de ponta.* 
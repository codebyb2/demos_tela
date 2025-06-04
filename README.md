# 🎬 Tela - Sistema de Demonstrações C-Law Experience 2025

Sistema completo para demonstrações interativas da Tela durante o evento C-Law Experience 2025. Permite que visitantes acessem demos exclusivas via QR codes e autenticação LinkedIn, com logging automático em CSV.

## 📋 Funcionalidades

- **🔐 Autenticação LinkedIn OIDC**: Login seguro via LinkedIn
- **📱 QR Codes**: Acesso rápido às demos via smartphone
- **🎥 Demonstrações em Vídeo**: Player integrado do YouTube
- **📊 CSV Logging**: Dados automáticos salvos em arquivo CSV
- **🔄 Sessão 24h**: Acesso a todas as demos após login único
- **🛡️ Segurança**: Rate limiting, sanitização, proteção CSRF
- **📱 Design Responsivo**: Otimizado para mobile e desktop

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+ 
- NPM ou Yarn
- Conta LinkedIn Developer

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

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```bash
# Servidor
PORT=3000
NODE_ENV=production
BASE_URL=https://yourdomain.com

# LinkedIn OIDC
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret

# Segurança
SESSION_SECRET=your_32_char_random_secret
```

### 2. LinkedIn Developer App

1. Acesse [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Crie nova aplicação
3. Configure redirect URI: `https://yourdomain.com/callback`
4. Adicione produtos: "Sign In with LinkedIn using OpenID Connect"
5. Copie Client ID e Client Secret

### 3. Demos Configuration

Configure suas demos em `demos.json`:

```json
{
  "demo_id": {
    "title": "Nome da Demo",
    "youtubeUrl": "https://www.youtube.com/watch?v=VIDEO_ID"
  }
}
```

### 4. QR Codes

Os QR codes devem apontar para as URLs das demos no formato:
```
https://yourdomain.com/login?demo=demo_id
```

Exemplo:
- Demo ID: `tela_transcricao`
- URL do QR: `https://yourdomain.com/login?demo=tela_transcricao`

## 🏗️ Estrutura do Projeto

```
tela-claw-demos/
├── server/
│   ├── index.js              # Servidor principal
│   └── services/
│       ├── csvService.js     # Logging em CSV
│       └── linkedinOIDC.js   # Autenticação LinkedIn
├── views/
│   ├── index.ejs            # Página inicial
│   ├── login.ejs            # Página de login
│   ├── watch.ejs            # Visualização da demo
│   ├── demos.ejs            # Lista de demos
│   ├── callback.ejs         # Processamento OAuth
│   └── error.ejs            # Páginas de erro
├── demos.json               # Configuração das demos
├── demo_logs.csv            # Logs de acesso (gerado automaticamente)
├── package.json
├── .env.example
└── README.md
```

## 🔄 Fluxo de Uso

1. **👤 Visitante** escaneia QR code no estande
2. **📱 Mobile** abre página de login da demo (`/login?demo=demo_id`)
3. **🔐 LinkedIn** autentica via OAuth 2.0 + OIDC
4. **📊 Sistema** captura dados profissionais
5. **💾 CSV** salva dados automaticamente em `demo_logs.csv`
6. **🎥 Usuário** assiste demonstração exclusiva (`/watch?demo=demo_id`)
7. **🔄 Acesso 24h** - Pode assistir todas as outras demos
8. **📞 CTA** direcionamento para agendamento

## 🛡️ Segurança

- **Rate Limiting**: 100 req/15min por IP
- **CSRF Protection**: State validation
- **Input Sanitization**: XSS prevention
- **Helmet.js**: Security headers
- **Session Security**: HttpOnly, Secure, SameSite
- **HTTPS Only**: Produção apenas SSL
- **Content Security Policy**: Strict CSP

## 📊 Dados Salvos (CSV)

O sistema automaticamente salva em `demo_logs.csv`:

- **timestamp**: Data/hora do acesso
- **name**: Nome do usuário
- **email**: Email do LinkedIn
- **demo_id**: ID da demo assistida
- **demo_title**: Título da demo
- **event**: C-Law Experience 2025

### Formato do CSV:
```csv
timestamp,name,email,demo_id,demo_title,event
2025-06-04T12:00:00.000Z,João Silva,joao@empresa.com,tela_transcricao,Transcrição de Audiência,C-Law Experience 2025
```

## 🚢 Deploy

### Docker

```bash
# Build
docker build -t tela-demos .

# Run
docker run -p 3000:3000 --env-file .env tela-demos
```

### Vercel/Netlify

1. Configure variáveis de ambiente
2. Configure build command: `npm run build`
3. Configure start command: `npm start`

### VPS/Servidor

```bash
# PM2
npm install -g pm2
pm2 start server/index.js --name tela-demos
pm2 startup
pm2 save

# Nginx reverse proxy
# Configure SSL com Let's Encrypt
```

## 📋 Scripts Disponíveis

```bash
npm start           # Iniciar servidor
npm run dev         # Desenvolvimento com nodemon
npm test           # Executar testes
npm run lint       # Verificar código
```

## 🔧 Troubleshooting

### Erro: "Demo não encontrada"
- Verifique se `demos.json` está correto
- Confirme se demo ID no QR code existe
- Teste a URL manualmente: `https://yourdomain.com/login?demo=demo_id`

### Erro: "LinkedIn auth error"
- Verifique credenciais em `.env`
- Confirme redirect URI no LinkedIn
- Teste em HTTPS (obrigatório em produção)

### Erro: "Attio webhook failed"
- Verifique token Attio em `.env`
- Confirme workspace ID
- Teste conectividade com API

### Performance Lenta
- Verifique rate limiting
- Monitore uso de CPU/memória
- Configure cache se necessário

## 🤝 Suporte

- **📧 Email**: tech@tela.com
- **💬 Slack**: #tela-dev
- **📖 Docs**: [docs.tela.com](https://docs.tela.com)
- **🐛 Issues**: GitHub Issues

## 📄 Licença

© 2025 Tela. Todos os direitos reservados.

---

**🎯 Sistema desenvolvido especialmente para C-Law Experience 2025**

*Transformando visitantes em leads qualificados através de demonstrações interativas e tecnologia de ponta.* 
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const fs = require('fs');

// Carregamento dinâmico de demos
function loadDemos() {
  try {
    // Limpar cache do require para recarregar o arquivo
    delete require.cache[require.resolve('../demos.json')];
    return require('../demos.json');
  } catch (error) {
    console.error('Erro ao carregar demos.json:', error.message);
    return {};
  }
}

// Getter dinâmico para demos
function getDemos() {
  return loadDemos();
}

const WebhookService = require('./services/webhookService');
const LinkedInOIDC = require('./services/linkedinOIDC');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting mais rígido
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutos
const RATE_LIMIT_MAX = process.env.NODE_ENV === 'production' ? 50 : 100; // Mais restritivo em produção

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  } else {
    const record = requestCounts.get(ip);
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + RATE_LIMIT_WINDOW;
    } else {
      record.count++;
      if (record.count > RATE_LIMIT_MAX) {
        console.warn(`⚠️ Rate limit exceeded for IP: ${ip.substring(0, 8)}...`);
        return res.status(429).json({ 
          error: 'Muitas requisições. Tente novamente em 15 minutos.',
          retryAfter: Math.ceil((record.resetTime - now) / 1000)
        });
      }
    }
  }
  
  next();
}

// Sanitização de entrada mais rigorosa
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim()
    .replace(/[<>"/\\&'`]/g, '') // Remover caracteres perigosos
    .substring(0, 200); // Limitar tamanho
}

// Middlewares de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.youtube.com", "https://youtube.com"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://youtube.com", "https://www.youtube-nocookie.com"],
      imgSrc: ["'self'", "data:", "https:", "https://www.tela.com", "https://tela.com"],
      connectSrc: ["'self'", "https://www.linkedin.com", "https://api.linkedin.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https://www.youtube.com", "https://youtube.com"],
      framAncestors: ["'none'"]
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'sameorigin' }, // Permite iframes do mesmo site
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Remover headers que revelam tecnologia
app.disable('x-powered-by');
// app.disable('etag'); // Reabilitado para YouTube

// Headers de segurança adicionais
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy para obter IP real
app.set('trust proxy', 1);

// Rate limiting
app.use(rateLimit);

// Configuração de sessão
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: 'strict'
  },
  name: 'tela_session'
}));

// Inicializar serviços
const webhookService = new WebhookService();
const linkedinOIDC = new LinkedInOIDC();

// Estado em memória para mapear state -> demoId (proteção CSRF)
const stateStore = new Map();

// Utility functions
function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

function validateDemoId(demoId) {
  if (!demoId || typeof demoId !== 'string') return false;
  return getDemos().hasOwnProperty(sanitizeInput(demoId));
}

// Validação de entrada
function validateInput(req, res, next) {
  // Não sanitizar parâmetros OAuth que podem ter caracteres especiais
  const skipSanitization = ['/callback'];
  if (skipSanitization.some(path => req.path.includes(path))) {
    return next();
  }
  
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    }
  }
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeInput(req.query[key]);
      }
    }
  }
  next();
}

app.use(validateInput);

// Middleware de verificação de autenticação
function requireAuth(req, res, next) {
  if (!req.session.authenticated) {
    const { demo } = req.query;
    if (demo && validateDemoId(demo)) {
      // Redirecionar para login com o demo correto
      return res.redirect(`/login?demo=${encodeURIComponent(demo)}`);
    } else {
      return res.status(401).render('error', { 
        message: 'Acesso negado. Faça login para acessar esta demonstração.' 
      });
    }
  }
  next();
}

// ROTAS

// Página de login
app.get('/login', (req, res) => {
  const { demo } = req.query;
  
  if (!demo || !validateDemoId(demo)) {
    return res.status(404).render('error', { 
      message: 'Demo não encontrada. Verifique o QR code e tente novamente.' 
    });
  }

  const state = generateState();
  const nonce = generateState();
  
  // Armazenar estado temporariamente
  stateStore.set(state, { demoId: demo, nonce, timestamp: Date.now() });
  
  // Limpar estados antigos (mais de 10 minutos)
  for (const [key, value] of stateStore.entries()) {
    if (Date.now() - value.timestamp > 10 * 60 * 1000) {
      stateStore.delete(key);
    }
  }

  const authUrl = linkedinOIDC.getAuthorizationUrl(state, nonce);
  
  res.render('login', {
    demo: getDemos()[demo],
    demoId: demo,
    authUrl,
    logoUrl: 'https://www.tela.com/_vercel/image?url=%2Ftela-logo.png&w=320&q=100'
  });
});

// Callback do LinkedIn OIDC - GET (mostra página de processamento)
app.get('/callback', async (req, res) => {
  const { error } = req.query;
  
  if (error) {
    console.error('LinkedIn auth error:', error);
    return res.status(400).render('error', { 
      message: 'Erro na autenticação com LinkedIn. Tente novamente.' 
    });
  }

  // Renderizar página de callback que processará via JavaScript
  res.render('callback');
});

// Callback do LinkedIn OIDC - POST (processa o código via JavaScript)
app.post('/callback', async (req, res) => {
  const { code, state } = req.body;
  
  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    return res.status(400).json({ 
      error: 'Parâmetros de autenticação inválidos.' 
    });
  }

  // Validar state (proteção CSRF)
  const stateData = stateStore.get(state);
  if (!stateData) {
    return res.status(400).json({ 
      error: 'Estado de autenticação inválido ou expirado.' 
    });
  }

  const { demoId, nonce } = stateData;
  stateStore.delete(state); // Limpar estado usado

  try {
    // Trocar código por token de acesso
    const tokens = await linkedinOIDC.exchangeCodeForToken(code);
    
    // Obter dados do perfil
    const profile = await linkedinOIDC.getUserProfile(tokens.access_token);
    
    // Validar dados do perfil
    if (!profile.email || !profile.name) {
      throw new Error('Dados de perfil incompletos');
    }
    
    // Salvar dados no CSV
    webhookService.logDemoAccess({
      name: profile.name,
      email: profile.email,
      demoId,
      demoTitle: getDemos()[demoId].title,
      event: 'C-Law Experience 2025',
      ipAddress: req.ip || req.connection.remoteAddress
    });

    // Marcar usuário como autenticado na sessão ANTES da resposta
    req.session.authenticated = true;
    req.session.userProfile = {
      name: profile.name,
      email: profile.email
    };
    req.session.authenticatedAt = new Date().toISOString();
    req.session.lastDemoAccessed = demoId;

    // Retornar sucesso com URL de redirecionamento
    res.json({
      success: true,
      redirectUrl: `/watch?demo=${encodeURIComponent(demoId)}`,
      profile: {
        name: profile.name,
        email: profile.email
      }
    });
  } catch (error) {
    console.error('Erro no callback:', error);
    res.status(500).json({ 
      error: 'Erro interno. Nossa equipe foi notificada.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Página de visualização da demo
app.get('/watch', requireAuth, (req, res) => {
  const { demo } = req.query;
  
  if (!demo || !validateDemoId(demo)) {
    return res.status(404).render('error', { 
      message: 'Demo não encontrada.' 
    });
  }

  const demoData = getDemos()[demo];
  const youtubeId = extractYouTubeId(demoData.youtubeUrl);
  
  if (!youtubeId) {
    return res.status(400).render('error', { 
      message: 'URL do vídeo inválida.' 
    });
  }
  
  // Atualizar último demo acessado
  req.session.lastDemoAccessed = demo;
  
  // Registrar acesso à demo no CSV
  if (req.session.userProfile) {
    webhookService.logDemoAccess({
      name: req.session.userProfile.name,
      email: req.session.userProfile.email,
      demoId: demo,
      demoTitle: demoData.title,
      event: 'C-Law Experience 2025',
      ipAddress: req.ip || req.connection.remoteAddress
    });
  }
  
  res.render('watch', {
    demo: demoData,
    demoId: demo,
    youtubeId,
    userProfile: req.session.userProfile,
    authenticatedAt: req.session.authenticatedAt,
    logoUrl: 'https://www.tela.com/_vercel/image?url=%2Ftela-logo.png&w=320&q=100'
  });
});

// Página de demos (lista todas as demos para usuários autenticados)
app.get('/demos', requireAuth, (req, res) => {
  const demos = getDemos();
  res.render('demos', {
    demos: demos,
    userProfile: req.session.userProfile,
    authenticatedAt: req.session.authenticatedAt,
    logoUrl: 'https://www.tela.com/_vercel/image?url=%2Ftela-logo.png&w=320&q=100'
  });
});

// Rota de logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao fazer logout:', err);
      return res.status(500).render('error', { 
        message: 'Erro ao fazer logout. Tente novamente.' 
      });
    }
    res.redirect('/');
  });
});

// Health check
app.get('/healthz', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Página inicial
app.get('/', (req, res) => {
  res.render('index');
});

// Página de erro personalizada
app.get('/error', (req, res) => {
  const { message } = req.query;
  res.status(400).render('error', { 
    message: message || 'Ocorreu um erro inesperado.' 
  });
});

// Middleware de erro 404
app.use((req, res) => {
  res.status(404).render('error', { 
    message: 'Página não encontrada.' 
  });
});

// Middleware de erro geral
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  res.status(500).render('error', { 
    message: 'Erro interno do servidor.' 
  });
});

// Utility para extrair ID do YouTube
function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Configurar view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, encerrando gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, encerrando gracefully...');
  process.exit(0);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📱 Demos: ${Object.keys(getDemos()).join(', ')}`);
});

module.exports = app; 
# 🚀 Deploy Seguro no Render

## 📋 Checklist de Segurança

### ✅ **Pré-Deploy**
- [ ] Variáveis de ambiente configuradas
- [ ] NODE_ENV=production
- [ ] SESSION_SECRET forte gerado
- [ ] LinkedIn credentials validadas
- [ ] Rate limiting testado

### ✅ **Configuração no Render**

1. **Criar Web Service**
   - Repository: Conectar seu repositório
   - Branch: `main` ou `production`
   - Build Command: `npm install`
   - Start Command: `npm start`

2. **Variáveis de Ambiente** (Environment Variables)
   ```
   NODE_ENV=production
   PORT=10000
   BASE_URL=https://seu-app.onrender.com
   LINKEDIN_CLIENT_ID=sua_client_id_real
   LINKEDIN_CLIENT_SECRET=sua_client_secret_real
   SESSION_SECRET=sua_chave_secreta_super_forte_32_chars_minimo
   ```

3. **Configurações de Segurança**
   - Auto-Deploy: ✅ Enabled
   - Health Check Path: `/healthz`
   - Docker: ❌ Disabled (usar Node.js nativo)

### ⚠️ **CRÍTICO - LinkedIn Configuration**

No LinkedIn Developer Console:
1. Vá em Authentication
2. **Authorized redirect URLs for your app:**
   ```
   https://seu-app.onrender.com/callback
   ```
3. **Scopes necessários:**
   - `openid`
   - `profile` 
   - `email`

### 🔒 **Segurança dos Dados**

- ✅ **CSV protegido**: Arquivo em `/logs/` (fora do web root)
- ✅ **IPs hasheados**: Compliance com LGPD
- ✅ **Validação rigorosa**: Todos os inputs sanitizados
- ✅ **Rate limiting**: 50 req/15min em produção
- ✅ **Headers seguros**: HSTS, CSP, etc.

### 📊 **Monitoramento**

- **Health Check**: `https://seu-app.onrender.com/healthz`
- **Logs**: Render Dashboard > Logs
- **Métricas**: Render Dashboard > Metrics

### 🚨 **Troubleshooting**

#### Erro 502/503
- Verificar se porta está correta (10000)
- Checar logs no Render Dashboard

#### LinkedIn Auth Error
- Verificar URL de callback
- Confirmar CLIENT_ID e CLIENT_SECRET
- Testar em HTTPS apenas

#### CSV não salvando
- Verificar permissões da pasta `/logs/`
- Conferir espaço em disco no Render

### 🔧 **Comandos de Deploy**

```bash
# 1. Preparar repositório
git add .
git commit -m "feat: deploy production ready"
git push origin main

# 2. Render fará deploy automático
# 3. Verificar health check
curl https://seu-app.onrender.com/healthz

# 4. Testar autenticação
# Acesse: https://seu-app.onrender.com/login?demo=tela_transcrição
```

### 📋 **Checklist Pós-Deploy**

- [ ] Health check respondendo
- [ ] Autenticação LinkedIn funcionando
- [ ] QR codes testados
- [ ] CSV sendo gerado em `/logs/`
- [ ] Rate limiting ativo
- [ ] Headers de segurança presentes
- [ ] HTTPS forçado

### 🆘 **Suporte**

- **Render Docs**: https://render.com/docs
- **LinkedIn Docs**: https://docs.microsoft.com/en-us/linkedin/
- **Logs**: Sempre verificar primeiro no Render Dashboard 
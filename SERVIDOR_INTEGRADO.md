# 🚀 INTEGRAÇÃO FRONTEND + BACKEND - SERVER.JS

## Resumo das Mudanças

O `server.js` foi atualizado para servir tanto a **API** quanto o **frontend React (Vite)** em um único servidor Express.

---

## 📝 3 Alterações Realizadas

### 1️⃣ Imports Adicionados

**Antes:**
```javascript
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import wwebjs from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
```

**Depois:**
```javascript
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';                    // ← Novo
import { fileURLToPath } from 'url';       // ← Novo
import wwebjs from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
```

**Por quê?**
- `path`: manipular caminhos de diretórios (multiplataforma)
- `fileURLToPath`: converter `import.meta.url` para caminho real

---

### 2️⃣ Configuração de __dirname

**Adicionado após os imports:**
```javascript
const { Client, LocalAuth, MessageMedia } = wwebjs;

const __filename = fileURLToPath(import.meta.url);    // ← Novo
const __dirname = path.dirname(__filename);           // ← Novo

const app = express();
const PORT = process.env.PORT || 3000;
```

**Por quê?**
- Em módulos ES6, não existe `__dirname` nativo
- Precisamos calcular manualmente o diretório do projeto
- Necessário para acessar a pasta `dist/` (build do Vite)

---

### 3️⃣ Servir Frontend + API

**Antes:**
```javascript
client.initialize();

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Express rodando na porta ${PORT}...`);
});
```

**Depois:**
```javascript
/* ============================================
   FRONTEND REACT / VITE
============================================ */

const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));         // ← Servir arquivos estáticos (CSS, JS, etc)

app.get(/^(?!\/api\/).*/, (req, res) => {  // ← Rota catch-all para SPA
    res.sendFile(path.join(distPath, 'index.html'));
});

/* ============================================
   INICIALIZAÇÃO DO WHATSAPP
============================================ */

client.initialize();

/* ============================================
   INICIALIZAÇÃO DO SERVIDOR
============================================ */

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Lar Forte rodando na porta ${PORT}`);
});
```

**O que faz cada parte:**

1. **`const distPath = path.join(__dirname, 'dist')`**
   - Define o caminho para a pasta `dist/` (gerada por `npm run build`)

2. **`app.use(express.static(distPath))`**
   - Serve todos os arquivos estáticos (HTML, CSS, JS, imagens, etc)
   - Exemplo: `/assets/index.js` vem de `dist/assets/index.js`

3. **`app.get(/^(?!\/api\/).*/, ...)`**
   - Rota "catch-all" com regex negativo
   - Captura: `/`, `/atendimento`, `/catalogo`, `/sobre`, etc
   - **Não captura:** `/api/atendimento`, `/api/status`
   - Retorna `index.html` para o React Router lidar

---

## 🎯 Como Funciona Agora

### Estrutura de Rotas

```
┌─────────────────────────────────────────┐
│   REQUISIÇÃO DO NAVEGADOR               │
└──────────────┬──────────────────────────┘
               │
               ├─ /api/atendimento ──→ [ Express API ]  ✅
               ├─ /api/status ───────→ [ Express API ]  ✅
               │
               ├─ / ────────────────→ [ dist/index.html ] → [ React ]  ✅
               ├─ /atendimento ──────→ [ dist/index.html ] → [ React ]  ✅
               ├─ /catalogo ────────→ [ dist/index.html ] → [ React ]  ✅
               └─ /sobre ───────────→ [ dist/index.html ] → [ React ]  ✅
```

---

## 📦 Fluxo de Build e Deploy

### Desenvolvimento
```bash
# Terminal 1: Frontend
npm run dev
# Abre http://localhost:5173

# Terminal 2: Backend
node server.js
# Backend na porta 3000
# Frontend conecta em http://localhost:3000/api/...
```

### Produção
```bash
# 1. Build do frontend
npm run build
# Gera: dist/index.html, dist/assets/*, etc

# 2. Inicia servidor (backend + frontend)
npm start
# Equivalente a: node server.js
# Servidor na porta 3000
# Frontend e API na mesma porta
```

---

## ✅ Verificação de Funcionalidade

### API continua funcionando

```bash
# Em produção, essas rotas funcionam como antes:
GET  http://seu-servidor:3000/api/status
POST http://seu-servidor:3000/api/atendimento
```

### Frontend funciona

```bash
# Essas rotas agora funcionam:
GET http://seu-servidor:3000/
GET http://seu-servidor:3000/atendimento
GET http://seu-servidor:3000/catalogo
GET http://seu-servidor:3000/sobre
```

---

## 🔒 Por Que o Regex Negativo?

```javascript
app.get(/^(?!\/api\/).*/, (req, res) => {
    // ...
})
```

**Sem o negativo `(?!...)`:**
```javascript
app.get(/.*/, ...) // Pegaria TUDO, incluindo /api/status
```

**Com o negativo `(?!\/api\/)`:**
```javascript
app.get(/^(?!\/api\/).*/, ...) // Pega tudo EXCETO /api/...
```

Assim:
- ✅ `/api/status` → Express trata normalmente
- ✅ `/atendimento` → React trata (SPA)

---

## 📊 Build e Deploy

### Tamanho da Build
```
dist/index.html                   0.46 kB
dist/assets/index-BhBEpm9O.css   31.22 kB
dist/assets/index-BoCQBlUj.js   283.06 kB

Total: ~314 kB
Comprimido (gzip): ~93 kB
```

### Comando para Deploy

```bash
# Instalar dependências
npm install

# Build do frontend
npm run build

# Inicia servidor (frontend + API)
npm start

# Seu servidor estará em: http://seu-servidor:3000
```

---

## 🚀 Próximos Passos

1. **Fazer commit das mudanças:**
   ```bash
   git add server.js
   git commit -m "feat: servir frontend React via Express"
   git push
   ```

2. **Deploy:**
   - Fazer upload do projeto
   - Rodar `npm install`
   - Rodar `npm run build`
   - Rodar `npm start`

3. **Verificar:**
   - Abrir `http://seu-servidor:3000/` → deve mostrar Home
   - Abrir `http://seu-servidor:3000/atendimento` → deve mostrar formulário
   - Abrir `http://seu-servidor:3000/api/status` → deve retornar JSON

---

## 🔧 Troubleshooting

### Erro: "Cannot find module 'path'"
- Solução: `npm install path` (já vem com Node)

### Erro: "dist not found"
- Solução: Rodar `npm run build` antes de `npm start`

### React Router não funciona (404 ao recarregar)
- Solução: Fazer isso remove `/` da URL e trata como SPA ✅

### API não responde
- Verificar se `/api/` está no começo da URL
- Regex pega tudo exceto `/api/`

---

**Status:** ✅ Integração Completa  
**Data:** 2026-09-01  
**Build:** ✓ built in 1.06s

# 🔐 CONFIGURAÇÃO DE VARIÁVEIS GLOBAIS - LAR FORTE

## Visão Geral

Este documento explica como usar as variáveis globais e configurações do projeto Lar Forte.

---

## 📂 Arquivos de Configuração

### 1. `.env.example` 
Arquivo de **documentação** (commitado no repositório).
- Mostra todas as variáveis disponíveis
- Inclui descrições e valores padrão
- **Nunca contém valores reais/sensíveis**

### 2. `.env.local`
Arquivo de **configuração local** (ignorado pelo git).
- Criado manualmente em cada máquina
- Contém valores reais para seu ambiente
- **Nunca faça commit deste arquivo**

### 3. `src/config/constants.js`
Arquivo de **constantes centralizadas**.
- Importa variáveis do `.env`
- Define constantes que não mudam
- Organiza configurações por categoria

---

## 🚀 Como Configurar

### Passo 1: Copiar arquivo de exemplo

```bash
# Windows (PowerShell)
Copy-Item .env.example .env.local

# macOS / Linux
cp .env.example .env.local
```

### Passo 2: Editar `.env.local`

Abra `.env.local` e configure para seu ambiente:

```env
# Desenvolvimento local
VITE_API_URL=http://localhost:3000
VITE_MODE=development
VITE_DEBUG_MODE=true

# Produção (exemplo)
# VITE_API_URL=https://api.larforte.com.br
# VITE_MODE=production
# VITE_DEBUG_MODE=false
```

### Passo 3: Usar no código

```javascript
// ✅ FORMA RECOMENDADA - usando constantes
import { API_CONFIG, STORAGE_KEYS } from '../config/constants';

const API_URL = API_CONFIG.BASE_URL;
const endpoint = API_CONFIG.ENDPOINTS.ATENDIMENTO;
const clientKey = STORAGE_KEYS.CLIENTE_PERFIL;

// ❌ NÃO FAÇA MAIS ASSIM
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
```

---

## 📋 Variáveis Disponíveis

### Frontend (`.env`)

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_API_URL` | URL da API backend | `http://localhost:3000` |
| `VITE_MODE` | Ambiente (dev/prod) | `development` |
| `VITE_DEBUG_MODE` | Ativa logs detalhados | `true` |
| `VITE_TIMEZONE` | Timezone padrão | `America/Sao_Paulo` |

### Backend (`server.js`)

Se configurar variáveis no backend também:

```javascript
// server.js
const PORT = process.env.PORT || 3000;
const WHATSAPP_GROUP_ID = process.env.WHATSAPP_GROUP_ID;
```

Exemplo `.env.local` para backend:
```env
PORT=3000
WHATSAPP_GROUP_ID=seu_id_aqui
DATABASE_URL=seu_banco_aqui
```

---

## 🔒 Segurança

### ✅ Melhorias Implementadas

1. **`.gitignore` atualizado**
   - Arquivos `*.local` são ignorados
   - Nenhuma senha/token é commitado

2. **Separação de responsabilidades**
   - `.env.example`: documentação pública
   - `.env.local`: configuração privada
   - `constants.js`: lógica centralizada

3. **Não commitar**
   ```
   ❌ .env.local
   ❌ .env.production
   ❌ .env.development
   ✅ .env.example
   ```

### 📝 Checklist Pré-Deploy

- [ ] `.env.local` está configurado corretamente
- [ ] `VITE_API_URL` aponta para o servidor correto
- [ ] `.env.local` **NÃO** está no repositório
- [ ] Variáveis sensíveis estão apenas em `.env.local`
- [ ] Build funciona: `npm run build`

---

## 📖 Exemplos de Uso

### Usar constantes no componente

```javascript
import { API_CONFIG, STORAGE_KEYS, MESSAGES } from '../config/constants';

// Fetch à API
const response = await fetch(
  `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ATENDIMENTO}`,
  { method: 'POST', body: JSON.stringify(data) }
);

// Persistir em localStorage
localStorage.setItem(
  STORAGE_KEYS.CLIENTE_PERFIL,
  JSON.stringify(perfil)
);

// Mostrar mensagem padronizada
alert(MESSAGES.SUCCESS.ORDER_SENT);
```

### Acessar valores de ambiente

```javascript
import { ENVIRONMENT } from '../config/constants';

if (ENVIRONMENT.IS_DEV) {
  console.log('🔧 Modo desenvolvimento ativo');
}

if (ENVIRONMENT.IS_PROD) {
  console.log('🚀 Modo produção ativo');
}
```

---

## ⚠️ Troubleshooting

### Variável retorna `undefined`

**Problema:** `import.meta.env.VITE_API_URL` retorna `undefined`

**Solução:**
1. Verifique se `.env.local` existe
2. Verifique se `VITE_` prefixo está correto
3. Reinicie o servidor dev: `npm run dev`

### Mudanças no `.env` não funcionam

**Problema:** Alterações em `.env.local` não têm efeito

**Solução:**
```bash
# Pare o servidor
# Aguarde 2 segundos
# Reinicie
npm run dev
```

---

## 🎯 Próximos Passos

1. **Criar `.env.local`:**
   ```bash
   cp .env.example .env.local
   ```

2. **Configurar valores:**
   - Abrir `.env.local` no editor
   - Preencher `VITE_API_URL` com URL real

3. **Testar:**
   ```bash
   npm run dev
   # Verificar console para logs de conexão
   ```

---

## 📚 Referências

- [Vite - Env Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Node.js - Process ENV](https://nodejs.org/en/learn/setting-up-a-nodejs-dev-environment/nodejs-and-dotenv)
- [OWASP - Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

**Última atualização:** 2026-09-01  
**Versão:** 1.0

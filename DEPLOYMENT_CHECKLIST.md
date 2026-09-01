# 📋 CHECKLIST PRÉ-DEPLOYMENT - LAR FORTE

## ✅ Preparação Concluída

Este documento lista todos os passos prontos para você fazer upload do projeto.

---

## 🎯 Arquivos Criados / Modificados

### ✨ Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `.env.example` | 📄 Documentação de variáveis de ambiente (commitado) |
| `src/config/constants.js` | 🔧 Constantes centralizadas do projeto |
| `README.CONFIG.md` | 📖 Guia completo de configuração |
| `DEPLOYMENT_CHECKLIST.md` | ✓ Este arquivo |

### 🔄 Arquivos Modificados

| Arquivo | Alterações |
|---------|-----------|
| `src/pages/Atendimento.jsx` | Usa `constants.js` em vez de hardcoded strings |
| `src/pages/Home.jsx` | Usa `STORAGE_KEYS` do `constants.js` |
| `vite.config.js` | Sem alterações (já estava correto) |

---

## 📦 Estrutura de Configuração

```
lar-forte-web/
├── .env.example              ← Documentação (commitar)
├── .env.local               ← Valores reais (NÃO commitar)
├── .gitignore               ← Já ignora *.local
├── src/
│   ├── config/
│   │   └── constants.js     ← Novidade: constantes centralizadas
│   └── pages/
│       ├── Atendimento.jsx  ← Usa constants.js
│       └── Home.jsx         ← Usa constants.js
└── ...
```

---

## 🚀 Antes de Fazer Upload

### 1️⃣ Criar `.env.local` Localmente

```bash
# Copie o arquivo de exemplo
Copy-Item .env.example .env.local  # Windows PowerShell
# ou
cp .env.example .env.local         # macOS/Linux

# Configure a URL correta
# Edite .env.local e defina:
VITE_API_URL=http://localhost:3000
```

### 2️⃣ Testar em Desenvolvimento

```bash
# Instale dependências (se necessário)
npm install

# Inicie o servidor de desenvolvimento
npm run dev

# Teste o fluxo completo:
# - Preencher formulário
# - Enviar pedido
# - Verificar se a Home mostra confirmação
```

### 3️⃣ Build de Produção

```bash
# Gere a build
npm run build

# Resultado esperado:
# ✓ built in 2.44s
```

### 4️⃣ Verificar Git Status

```bash
git status

# Esperado: .env.local NÃO deve aparecer
# ✅ Deve aparecer:
#   - .env.example
#   - src/config/constants.js
#   - src/pages/Atendimento.jsx (modificado)
#   - src/pages/Home.jsx (modificado)
#   - README.CONFIG.md
```

### 5️⃣ Fazer Commit

```bash
git add .

# Revise antes de commitar
git status

# Commit
git commit -m "refactor: centralizar configurações em constants.js"

# Push
git push
```

---

## 🔐 Segurança - Verificar

- [x] `.gitignore` ignora `*.local` ✅
- [x] `.env.local` **não está** no repositório ✅
- [x] `.env.example` contém **apenas** estrutura (sem valores sensíveis) ✅
- [x] Senha/tokens **nunca** são hardcoded no código ✅
- [x] API_URL vem de variável de ambiente ✅

---

## 📝 Variáveis Globais Disponíveis

Usar em qualquer componente:

```javascript
import {
  API_CONFIG,          // URLs e endpoints
  STORAGE_KEYS,        // Chaves de localStorage/sessionStorage
  VALIDATION,          // Regras de validação
  MESSAGES,            // Mensagens padrão
  ENVIRONMENT          // Dados do ambiente (dev/prod)
} from '../config/constants';
```

### Exemplo de Uso

```javascript
// API
const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.ATENDIMENTO;

// Storage
localStorage.setItem(STORAGE_KEYS.CLIENTE_PERFIL, data);

// Mensagens
alert(MESSAGES.SUCCESS.ORDER_SENT);
```

---

## 🧪 Testes Manuais Recomendados

### Cenário 1: Novo Cliente

1. Abrir `/atendimento`
2. Preencher formulário completo
3. Avançar até etapa 5
4. Selecionar foto/vídeo
5. Enviar
6. Verificar se Home mostra confirmação

### Cenário 2: Cliente Retornante

1. Abrir `/atendimento` novamente
2. Verificar se dados da etapa 1 estão preenchidos
3. Modificar algo e avançar
4. Pausar em etapa 3
5. Fazer F5 (refresh)
6. Verificar se retorna para etapa 1 (correto)

### Cenário 3: Etapa 5 Persistência

1. Avançar até etapa 5
2. Selecionar foto
3. Fazer F5 (refresh)
4. Verificar se voltou para etapa 1 (correto, etapa 5 não persiste)
5. Avançar de novo até etapa 5
6. Enviar pedido
7. Verificar confirmação na Home

---

## ❌ Não Fazer

```bash
# ❌ NUNCA commitar .env.local
git add .env.local              # NÃO FAÇA
git commit .env.local           # NÃO FAÇA

# ❌ NUNCA fazer push com variáveis sensíveis
git push  # Verificar antes com git status

# ❌ NUNCA hardcode URLs
const API_URL = 'http://192.168.1.100:3000';  # NÃO FAÇA

# ❌ NUNCA salvar senhas no código
const PASSWORD = 'admin123';    # NÃO FAÇA
```

---

## ✅ Checklist Final

- [ ] `.env.local` criado e preenchido
- [ ] Build passou sem erros: `npm run build` ✓
- [ ] Testes manuais realizados
- [ ] `.gitignore` está correto
- [ ] `.env.local` **não** está nos arquivos do git
- [ ] `.env.example` está no repositório
- [ ] Commit feito com mensagem clara
- [ ] Push realizado com sucesso
- [ ] Código pronto para produção

---

## 📞 Suporte

Se encontrar erros ao fazer upload:

1. **Build falha?**
   - Verifique: `npm install`
   - Limpe cache: `rm -r node_modules && npm install`

2. **Variáveis não funcionam?**
   - Verifique se `.env.local` existe
   - Reinicie `npm run dev`
   - Confirme prefixo `VITE_`

3. **Código tem erros de import?**
   - Verifique path de `constants.js`
   - Confirme que arquivo existe: `src/config/constants.js`

---

## 🎉 Pronto para Upload!

Seu projeto agora está:
- ✅ Bem estruturado
- ✅ Seguro (variáveis sensíveis não commitadas)
- ✅ Escalável (constantes centralizadas)
- ✅ Documentado (README.CONFIG.md)
- ✅ Profissional (segue best practices)

**Data:** 2026-09-01  
**Status:** ✅ PRONTO

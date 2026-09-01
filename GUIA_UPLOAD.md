# 📤 GUIA DE UPLOAD - ARQUIVOS A COMMITAR

## 🎯 O que Fazer Commit?

### ✅ COMMITAR ESTES ARQUIVOS

#### Novos Arquivos
```
✅ .env.example                    # Documentação de variáveis
✅ src/config/constants.js         # Constantes centralizadas
✅ README.CONFIG.md               # Guia de configuração
✅ DEPLOYMENT_CHECKLIST.md        # Checklist de deployment
✅ RESUMO_MELHORIAS.md            # Resumo do que foi feito
✅ GUIA_UPLOAD.md                 # Este arquivo
```

#### Arquivos Modificados
```
✅ src/pages/Atendimento.jsx      # Usa constants.js
✅ src/pages/Home.jsx             # Usa constants.js
✅ package.json                   # Se houver mudanças
```

---

## ❌ NÃO COMMITAR ESTES ARQUIVOS

### 🔒 NUNCA COMMITAR (Segurança)
```
❌ .env.local                     # Valores reais (use localmente)
❌ .env.production                # Configuração de produção
❌ .env.development               # Configuração local
❌ node_modules/                  # Dependências (já em .gitignore)
❌ dist/                          # Build gerado (já em .gitignore)
```

---

## 🚀 Passo a Passo para Fazer Commit

### 1️⃣ Verificar Status

```bash
cd c:\Users\bruco\OneDrive\Desktop\LarForte\lar-forte-web
git status
```

**Esperado ver:**
```
On branch main
Changes not staged for commit:
  modified:   src/pages/Atendimento.jsx
  modified:   src/pages/Home.jsx

Untracked files:
  .env.example
  src/config/constants.js
  README.CONFIG.md
  DEPLOYMENT_CHECKLIST.md
  RESUMO_MELHORIAS.md
  GUIA_UPLOAD.md
```

**NÃO deve conter:**
```
❌ .env.local (não deve aparecer)
❌ dist/ (não deve aparecer)
❌ node_modules/ (não deve aparecer)
```

---

### 2️⃣ Adicionar Arquivos

#### Opção A: Adicionar Tudo (Recomendado)
```bash
git add .
```

Depois revisar:
```bash
git status
```

---

#### Opção B: Adicionar Individualmente (Mais Seguro)
```bash
# Novos arquivos
git add .env.example
git add src/config/constants.js
git add README.CONFIG.md
git add DEPLOYMENT_CHECKLIST.md
git add RESUMO_MELHORIAS.md
git add GUIA_UPLOAD.md

# Modificados
git add src/pages/Atendimento.jsx
git add src/pages/Home.jsx

# Revisar
git status
```

---

### 3️⃣ Verificar `.gitignore`

Confirme que `.env.local` está sendo ignorado:

```bash
git status --ignored
```

Deve conter:
```
Ignored files:
  .env.local
  ...outros já ignorados...
```

---

### 4️⃣ Fazer Commit

```bash
git commit -m "refactor: centralizar configurações globais em constants.js

- Criar src/config/constants.js com constantes do projeto
- Adicionar .env.example para documentação
- Atualizar Atendimento.jsx para usar constants
- Atualizar Home.jsx para usar constants
- Adicionar README.CONFIG.md com guia de configuração
- Adicionar DEPLOYMENT_CHECKLIST.md
- Adicionar RESUMO_MELHORIAS.md"
```

---

### 5️⃣ Fazer Push

```bash
git push
```

Se tiver conflitos:
```bash
git pull
# Resolver conflitos
git push
```

---

## 🔍 Verificação Final

### Antes de Fazer Push

```bash
# 1. Confirmar que não há .env.local
git status | findstr ".env.local"

# Esperado: nenhuma linha com .env.local

# 2. Confirmar commits
git log --oneline -5

# Esperado: novo commit com a mensagem de refactor

# 3. Confirmar que build passa
npm run build

# Esperado: ✓ built in 2.x s
```

---

## 📊 Resumo do Que Será Enviado

| Arquivo | Status | Tipo |
|---------|--------|------|
| `.env.example` | ✅ Novo | Documentação |
| `src/config/constants.js` | ✅ Novo | Código |
| `README.CONFIG.md` | ✅ Novo | Documentação |
| `DEPLOYMENT_CHECKLIST.md` | ✅ Novo | Documentação |
| `RESUMO_MELHORIAS.md` | ✅ Novo | Documentação |
| `GUIA_UPLOAD.md` | ✅ Novo | Documentação |
| `src/pages/Atendimento.jsx` | 🔄 Modificado | Código |
| `src/pages/Home.jsx` | 🔄 Modificado | Código |

**Total de mudanças:** 8 arquivos  
**Linhas adicionadas:** ~500  
**Segurança:** ✅ Mantida  

---

## ⚠️ Avisos Importantes

### ❌ Não Faça Isto

```bash
# ❌ NUNCA fazer commit de .env.local
git add .env.local              # ERRADO!
git commit -m "add env"          # ERRADO!

# ❌ NUNCA fazer commit de dist/
git add dist/                    # ERRADO! (já em .gitignore)

# ❌ NUNCA fazer commit de node_modules/
git add node_modules/            # ERRADO! (já em .gitignore)

# ❌ NUNCA fazer force push sem revisar
git push --force                 # PERIGOSO!
```

### ✅ Faça Assim

```bash
# ✅ Sempre revisar antes
git status

# ✅ Sempre testar antes
npm run build

# ✅ Sempre revisar commit
git diff --cached

# ✅ Sempre usar mensagens claras
git commit -m "feature: descrição clara"

# ✅ Sempre fazer pull antes
git pull

# ✅ Depois fazer push
git push
```

---

## 🔐 Segurança Final

### Checklist Pré-Push

- [ ] `.env.local` **não** está nos arquivos a commitar
- [ ] `dist/` não está nos arquivos a commitar
- [ ] `node_modules/` não está nos arquivos a commitar
- [ ] Nenhuma senha está no código
- [ ] Nenhuma API_KEY está no código
- [ ] `.env.example` contém **apenas** estrutura
- [ ] Build passa: `npm run build` ✅
- [ ] Git status mostra o esperado
- [ ] Mensagem de commit é clara
- [ ] Revisei os diffs: `git diff --cached`

Se todas as caixas estão marcadas ✅, seu push é seguro!

---

## 🎯 Procedimento Rápido (TL;DR)

```bash
# 1. Verificar
git status

# 2. Adicionar
git add .

# 3. Revisar
git status

# 4. Confirmar que .env.local não está lá
# (deve estar vazio quando rodar:)
git status | findstr ".env.local"

# 5. Commitar
git commit -m "refactor: centralizar configurações globais"

# 6. Push
git push
```

---

## 📚 Recursos

- [Git Basics](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository)
- [Commit Best Practices](https://chris.beams.io/posts/git-commit/)
- [.gitignore Documentation](https://git-scm.com/docs/gitignore)

---

**Criado em:** 2026-09-01  
**Status:** ✅ Pronto para Upload  
**Segurança:** 🔒 Verificada  

Qualquer dúvida, revise `README.CONFIG.md` ou `DEPLOYMENT_CHECKLIST.md`!

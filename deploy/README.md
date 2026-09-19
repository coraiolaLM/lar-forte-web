# Deploy na VPS

Arquitetura: um **Traefik** compartilhado na VPS faz o roteamento e o HTTPS de
todos os projetos. Cada projeto é um `docker-compose.yml` independente que entra
na network Docker `proxy` e se anuncia por labels. Projeto novo = pasta nova,
sem tocar em configuração de proxy.

```
/srv
├── traefik/                 # proxy compartilhado (uma vez só)
│   ├── docker-compose.yml
│   └── .env
└── lar-forte-web/           # este projeto (git clone)
    ├── docker-compose.yml
    ├── .env
    ├── backend/Dockerfile
    └── frontend/Dockerfile + nginx.conf
```

Backend e frontend têm contextos de build separados: a imagem da API instala
apenas as dependências do `backend/package.json`, sem React nem Vite.

## 1. Preparar a VPS (uma vez)

```bash
# Docker + Compose plugin
curl -fsSL https://get.docker.com | sh

# Network compartilhada por todos os projetos
docker network create proxy
```

## 2. Subir o Traefik (uma vez)

```bash
mkdir -p /srv/traefik
# copie deploy/traefik/docker-compose.yml para /srv/traefik/
cd /srv/traefik
cp .env.example .env   # preencha ACME_EMAIL
docker compose up -d
```

## 3. DNS

Aponte um registro `A` do domínio para o IP da VPS **antes** de subir o projeto —
o Let's Encrypt valida via TLS-ALPN e falha se o DNS ainda não resolver.

## 4. Subir o projeto

```bash
cd /srv
git clone <url-do-repo> lar-forte-web
cd lar-forte-web

cp .env.example .env
nano .env    # DOMAIN, VITE_API_URL, VITE_SITE_URL, WHATSAPP_GROUP_ID, QRCODE_AUTH

docker compose up -d --build
```

Gerar o hash do basic auth do `/qrcode`:

```bash
docker run --rm httpd:alpine htpasswd -nbB admin 'suaSenha'
```

Cole no `.env` **dobrando cada `$`** (`$2y$05$...` vira `$$2y$$05$$...`).

## 5. Parear o WhatsApp (primeira subida)

```bash
docker compose logs -f api
```

Acesse `https://SEU-DOMINIO/qrcode` (vai pedir usuário e senha) e leia o QR.
A sessão fica no volume `whatsapp_auth`, montado em `/data/auth` via `AUTH_DIR`,
e **sobrevive a deploys** — você só repete isso se o volume for apagado ou o
WhatsApp deslogar o dispositivo.

## Atualizar depois de um push

```bash
cd /srv/lar-forte-web
git pull
docker compose up -d --build
docker image prune -f
```

## Comandos úteis

```bash
docker compose ps                  # status
docker compose logs -f api         # logs da API
docker compose restart api         # reiniciar só a API
docker stats                       # consumo de RAM
```

## Backup da sessão do WhatsApp

```bash
docker run --rm \
  -v lar-forte-web_whatsapp_auth:/data:ro \
  -v "$PWD":/backup alpine \
  tar czf /backup/whatsapp-auth-$(date +%F).tar.gz -C /data .
```

## Rodando local sem Docker

Dois terminais, já que o `concurrently` saiu junto com a separação:

```bash
cd backend  && cp .env.example .env && npm install && npm run dev
cd frontend && cp .env.example .env && npm install && npm run dev
```

## Adicionando o próximo projeto

1. `git clone` em `/srv/<projeto>`.
2. `docker-compose.yml` com `networks: proxy (external: true)` e as labels do
   Traefik apontando para o domínio dele.
3. `docker compose up -d --build`. O HTTPS sai automático.

Os nomes de router/service/middleware nas labels precisam ser **únicos por
projeto** (aqui são prefixados com `lar-forte-`).

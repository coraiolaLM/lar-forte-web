# Deploy na VPS

Este projeto **não sobe proxy nenhum**. Ele entra na rede `web` do stack
central (`~/Developer/central`), que já roda o Traefik com HTTPS automático.

```
Internet ──► Traefik (central, 80/443) ──► rede "web" ──┬─► lar-forte-web  (:80)
                                                        └─► lar-forte-api  (:3000)
```

Roteamento dentro do mesmo domínio:

| Caminho | Container |
|---|---|
| `/api`, `/health` | `api` |
| `/qrcode` | `api` (com basic auth) |
| todo o resto | `web` (SPA) |

O projeto não usa banco, então **não entra na rede `database`** e não depende
de nada do `db/init` do central.

## Pré-requisitos

- Stack central no ar e rede `web` criada (`docker network create web`).
- Registro A do subdomínio → IP da VPS, na **sua** zona DNS (a mesma conta
  Hostinger do token que o central já usa). O certificado sai pelo resolver
  `letsencrypt` do central, via DNS-01, sem nenhuma configuração extra.

## Subir

```bash
cd /srv
git clone <url-do-repo> lar-forte-web
cd lar-forte-web

cp .env.example .env
nano .env    # DOMAIN, VITE_API_URL, VITE_SITE_URL, WHATSAPP_GROUP_ID, QRCODE_AUTH

docker compose up -d --build
```

`VITE_API_URL` e `VITE_SITE_URL` são **build-time** (entram no bundle do Vite).
Trocar depois exige `docker compose up -d --build`.

### Basic auth do /qrcode

A rota expõe o pareamento do WhatsApp — quem a acessa no momento certo vincula
o próprio aparelho à conta. Gere o hash:

```bash
docker run --rm httpd:alpine htpasswd -nbB admin 'suaSenha'
```

No `.env`, **dobre cada `$`** do hash (`$2y$05$...` vira `$$2y$$05$$...`),
senão o Compose tenta interpolar o valor e o middleware sobe quebrado.

## Parear o WhatsApp

```bash
docker compose logs -f api
```

Acesse `https://SEU-SUBDOMINIO/qrcode`, informe usuário e senha, leia o QR.
A sessão fica no volume `lar-forte_whatsapp_auth` (montado em `/data/auth` via
`AUTH_DIR`) e sobrevive a deploys — só repete se o volume for apagado ou o
WhatsApp deslogar o aparelho.

## Atualizar

```bash
cd /srv/lar-forte-web
git pull
docker compose up -d --build
docker image prune -f
```

## Comandos úteis

```bash
docker compose ps
docker compose logs -f api
docker compose restart api
docker stats
```

## Backup da sessão do WhatsApp

```bash
docker run --rm \
  -v lar-forte_whatsapp_auth:/data:ro \
  -v "$PWD":/backup alpine \
  tar czf /backup/whatsapp-auth-$(date +%F).tar.gz -C /data .
```

## Rodando local sem Docker

```bash
cd backend  && cp .env.example .env && npm install && npm run dev
cd frontend && cp .env.example .env && npm install && npm run dev
```

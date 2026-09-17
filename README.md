# Lar Forte

Sistema web da Lar Forte para apresentação dos serviços, catálogo e solicitação de atendimentos.

O projeto possui um frontend desenvolvido com React e Vite e uma API em Node.js com Express, responsável pela comunicação com o WhatsApp através do Baileys.

## Funcionalidades

* Página inicial da Lar Forte
* Catálogo de serviços
* Página institucional
* Formulário de solicitação de atendimento
* Consulta de CEP
* Envio de pedidos pelo WhatsApp
* Envio de imagens e vídeos
* Envio de pedidos para o cliente e para o grupo de funcionários
* Resposta automática no WhatsApp
* Controle de intervalo entre envios
* Indicador de digitação no WhatsApp
* QR Code para conexão do WhatsApp
* Verificação do status da API e do WhatsApp
* Validação de arquivos antes do envio

## Tecnologias

### Frontend

* React
* Vite
* React Router
* Tailwind CSS
* Lucide React

### Backend

* Node.js
* Express
* Baileys
* Multer
* Pino
* QRCode

### Serviços utilizados

* Serviço de hospedagem do frontend
* Serviço de túnel para disponibilização da API
* ViaCEP

## Pré-requisitos

Antes de instalar o projeto, é necessário ter instalado:

* Node.js 22.x
* npm
* Git
* Um navegador de internet
* Uma conta do WhatsApp para conectar o sistema

O Node.js deve estar disponível no terminal.

Para verificar a instalação:

```bash
node --version
```

```bash
npm --version
```

Para verificar o Git:

```bash
git --version
```

O projeto utiliza Node.js 22.x conforme especificado no `package.json`.

Para disponibilizar a API externamente durante o desenvolvimento, também pode ser utilizado um serviço de túnel, como o Cloudflare Tunnel.

## Estrutura do projeto

```text
lar-forte-web/
├── public/
├── src/
│   ├── components/
│   ├── config/
│   ├── data/
│   ├── pages/
│   ├── App.jsx
│   └── main.jsx
├── uploads/
├── auth_larforte/
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

## Configuração

Crie um arquivo `.env.local` com base no `.env.example`.

As variáveis de ambiente devem ser preenchidas de acordo com o ambiente em que o sistema será executado.

### Frontend

```env
VITE_API_URL=
VITE_SITE_URL=
VITE_TIMEZONE=America/Sao_Paulo
```

### Backend

```env
WHATSAPP_GROUP_ID=
```

O `WHATSAPP_GROUP_ID` deve conter o identificador do grupo que receberá os pedidos.

## Instalação

Clone o repositório:

```bash
git clone URL_DO_REPOSITORIO
```

Entre na pasta do projeto:

```bash
cd lar-forte-web
```

Instale as dependências:

```bash
npm install
```

## Desenvolvimento

Para iniciar o frontend:

```bash
npm run dev:frontend
```

Para iniciar a API:

```bash
npm run dev:api
```

Também é possível iniciar os dois processos juntos:

```bash
npm run dev
```

## API

A API utiliza a porta `3000` por padrão.

### Health Check

```text
GET /health
```

Essa rota informa o estado atual da API e da conexão com o WhatsApp.

### QR Code

```text
GET /qrcode
```

Essa rota disponibiliza o QR Code necessário para conectar o WhatsApp quando uma nova autenticação for necessária.

### Atendimento

```text
POST /api/atendimento
```

A rota recebe os dados do atendimento através de `multipart/form-data`.

Os principais campos utilizados são:

```text
nome
telefone
numero
numeroEndereco
endereco
bairro
cidade
cep
categoria
servico
estimativa
descricao
observacoes
arquivo
```

O campo `arquivo` pode receber imagens ou vídeos.

O limite máximo configurado no projeto é de **100 MB por arquivo**.

Arquivos maiores são bloqueados no frontend antes do envio e também rejeitados pelo backend.

## WhatsApp

O backend utiliza o Baileys para realizar a conexão com o WhatsApp.

As credenciais da sessão ficam armazenadas na pasta:

```text
auth_larforte/
```

A sessão pode ser reutilizada enquanto permanecer válida.

## Grupo de funcionários

O grupo utilizado para receber os pedidos é definido pela variável de ambiente:

```env
WHATSAPP_GROUP_ID=
```

Dessa forma, o identificador do grupo não precisa ficar diretamente exposto no código ou no README.

## Fila de envio

Os envios do WhatsApp passam por uma fila global.

O intervalo atual entre os envios varia entre 4 e 8 segundos.

Quando configurado, o sistema também apresenta o status de digitação antes do envio de mensagens.

O tempo de digitação varia entre 2 e 4 segundos.

## Resposta automática

Quando uma nova mensagem é recebida no WhatsApp, o sistema pode enviar uma resposta automática.

A resposta automática possui um período de controle de 18 horas por contato.

Mensagens recebidas em grupos são ignoradas pelo sistema de resposta automática.

## Uploads

Os arquivos enviados pelo formulário são armazenados temporariamente na pasta:

```text
uploads/
```

O arquivo é processado pelo servidor e removido após o processamento do atendimento.

Os tipos aceitos atualmente são:

```text
JPEG
PNG
WEBP
GIF
MP4
WEBM
MOV
```

O limite máximo é de 100 MB por arquivo.

## Build

Para gerar o build do frontend:

```bash
npm run build
```

Para visualizar o build localmente:

```bash
npm run preview
```

Para iniciar a API:

```bash
npm start
```

## Segurança

Os arquivos de ambiente não devem ser enviados para o repositório.

As credenciais do WhatsApp também não devem ser versionadas.

Arquivos temporários enviados pelos clientes não devem ser mantidos no repositório.

Dados internos, identificadores de grupos, credenciais e informações de infraestrutura devem permanecer somente nas variáveis de ambiente ou na configuração privada do servidor.

## Objetivo do projeto

O Lar Forte foi desenvolvido para facilitar o contato entre clientes e a equipe responsável pelos serviços, centralizando as informações do atendimento e utilizando o WhatsApp como canal de comunicação.

## Autor

Bruno Coraiola

Engenharia de Software

```
```

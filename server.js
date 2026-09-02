import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import wwebjs from 'whatsapp-web.js';
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';

const {
    Client,
    LocalAuth,
    MessageMedia
} = wwebjs;

// =====================================================
// CAMINHOS
// =====================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================================
// EXPRESS
// =====================================================

const app = express();

const PORT =
    Number(process.env.PORT) || 3000;

// =====================================================
// BODY
// =====================================================

app.use(
    express.json({
        limit: '15mb'
    })
);

app.use(
    express.urlencoded({
        limit: '15mb',
        extended: true
    })
);

// =====================================================
// CORS
// =====================================================

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {

            if (
                !origin ||
                allowedOrigins.includes(origin)
            ) {
                return callback(null, true);
            }

            console.log(
                '⚠️ CORS bloqueado:',
                origin
            );

            return callback(
                new Error(
                    `Origem não permitida: ${origin}`
                )
            );
        },

        methods: [
            'GET',
            'POST',
            'OPTIONS'
        ],

        allowedHeaders: [
            'Content-Type',
            'Authorization'
        ]
    })
);

// =====================================================
// RATE LIMIT
// =====================================================

const limitador = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        erro:
            'Muitas solicitações. Tente novamente mais tarde.'
    }
});

// =====================================================
// ESTADO WHATSAPP
// =====================================================

let whatsappPronto = false;
let whatsappInicializando = false;

let qrSvg = null;
let qrGeradoEm = null;

// =====================================================
// CHROME
// =====================================================

console.log('');
console.log('🚀 Preparando WhatsApp...');

let chromePath = '';

try {

    chromePath =
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        puppeteer.executablePath();

    console.log(
        '🌐 Chrome:',
        chromePath
    );

    if (
        !fs.existsSync(chromePath)
    ) {

        console.error(
            '❌ Chrome não encontrado:',
            chromePath
        );

    } else {

        console.log(
            '✅ Chrome encontrado.'
        );

    }

} catch (error) {

    console.error(
        '❌ Erro ao localizar Chrome:',
        error?.message || error
    );

}

// =====================================================
// AUTENTICAÇÃO
// =====================================================

// Windows:
// tira a sessão de dentro do OneDrive.
//
// Render/Linux:
// mantém dentro do diretório do serviço.

const authPath =
    process.platform === 'win32'

        ? path.join(
            process.env.LOCALAPPDATA ||
            process.env.APPDATA ||
            __dirname,
            'LarForteWhatsAppAuth'
        )

        : path.join(
            __dirname,
            '.wwebjs_auth'
        );

console.log(
    '📁 Sessão WhatsApp:',
    authPath
);

try {

    fs.mkdirSync(
        authPath,
        {
            recursive: true
        }
    );

} catch (error) {

    console.error(
        '⚠️ Erro criando pasta da sessão:',
        error?.message || error
    );

}

// =====================================================
// CLIENTE WHATSAPP
// =====================================================

const client = new Client({

    authStrategy: new LocalAuth({
        clientId: 'lar-forte',
        dataPath: authPath
    }),

    puppeteer: {

        headless: true,

        executablePath: chromePath,

        timeout: 120000,

        protocolTimeout: 120000,

        args: [

            '--no-sandbox',

            '--disable-setuid-sandbox',

            '--disable-dev-shm-usage',

            '--disable-gpu',

            '--disable-software-rasterizer',

            '--disable-extensions',

            '--disable-default-apps',

            '--disable-background-networking',

            '--disable-background-timer-throttling',

            '--disable-backgrounding-occluded-windows',

            '--disable-renderer-backgrounding',

            '--disable-breakpad',

            '--disable-component-update',

            '--disable-sync',

            '--disable-notifications',

            '--disable-popup-blocking',

            '--disable-translate',

            '--disable-features=Translate,MediaRouter,OptimizationHints',

            '--mute-audio',

            '--no-first-run',

            '--no-zygote',

            // IMPORTANTE PARA O LIMITE DE 512 MB
            '--single-process',

            '--renderer-process-limit=1',

            '--disable-site-isolation-trials',

            '--disk-cache-size=1',

            '--media-cache-size=1',

            '--window-size=800,600'

        ]

    }

});

// =====================================================
// GRUPO
// =====================================================

const ID_GRUPO_FUNCIONARIOS =
    '120363409125356830@g.us';

// =====================================================
// TIMEOUT
// =====================================================

async function comTimeout(
    promise,
    tempo,
    nome
) {

    let timer;

    const timeout =
        new Promise(
            (_, reject) => {

                timer = setTimeout(
                    () => {

                        reject(
                            new Error(
                                `Timeout em ${nome}`
                            )
                        );

                    },
                    tempo
                );

            }
        );

    try {

        return await Promise.race([
            promise,
            timeout
        ]);

    } finally {

        clearTimeout(timer);

    }

}

// =====================================================
// STATUS WHATSAPP
// =====================================================

async function verificarWhatsApp() {

    if (!whatsappPronto) {
        return false;
    }

    try {

        const state =
            await comTimeout(
                client.getState(),
                5000,
                'getState'
            );

        return (
            state === 'CONNECTED'
        );

    } catch {

        return false;

    }

}

// =====================================================
// TELEFONE
// =====================================================

function analisarTelefone(telefone) {

    if (!telefone) {

        return {
            valido: false,
            motivo: 'NUMERO_INVALIDO',
            numero: null
        };

    }

    let numero =
        String(telefone)
            .replace(/\D/g, '');

    if (
        numero.startsWith('00')
    ) {

        numero =
            numero.substring(2);

    }

    if (
        !numero.startsWith('55')
    ) {

        numero =
            `55${numero}`;

    }

    if (
        numero.length !== 12 &&
        numero.length !== 13
    ) {

        return {
            valido: false,
            motivo: 'NUMERO_INVALIDO',
            numero
        };

    }

    const ddd =
        Number(
            numero.substring(2, 4)
        );

    if (
        Number.isNaN(ddd) ||
        ddd < 11 ||
        ddd > 99
    ) {

        return {
            valido: false,
            motivo: 'NUMERO_INVALIDO',
            numero
        };

    }

    if (
        numero.length === 13
    ) {

        if (
            !numero
                .substring(4)
                .startsWith('9')
        ) {

            return {
                valido: false,
                motivo: 'NUMERO_INVALIDO',
                numero
            };

        }

    }

    return {

        valido: true,

        motivo: 'VALIDO',

        numero,

        idDireto:
            `${numero}@c.us`

    };

}

// =====================================================
// CLASSIFICAÇÃO DE ERROS
// =====================================================

function classificarErroWhatsApp(
    error
) {

    const texto =
        String(
            error?.message ||
            error ||
            ''
        ).toLowerCase();

    if (
        texto.includes('no lid for user') ||
        texto.includes('lid')
    ) {

        return 'LID_ERROR';

    }

    if (
        texto.includes('not registered') ||
        texto.includes('not a whatsapp user')
    ) {

        return 'NUMERO_NAO_ENCONTRADO';

    }

    if (
        texto.includes('invalid wid') ||
        texto.includes('invalid number')
    ) {

        return 'NUMERO_INVALIDO';

    }

    if (
        texto.includes('disconnected') ||
        texto.includes('not connected')
    ) {

        return 'WHATSAPP_OFFLINE';

    }

    return 'ERRO_ENVIO';

}

// =====================================================
// CONFIRMAÇÃO CLIENTE
// =====================================================

async function enviarConfirmacaoCliente(
    dados
) {

    const analise =
        analisarTelefone(
            dados.telefone
        );

    if (!analise.valido) {

        console.error(
            '❌ Telefone inválido:',
            dados.telefone
        );

        return {
            sucesso: false,
            motivo: 'NUMERO_INVALIDO'
        };

    }

    if (
        !await verificarWhatsApp()
    ) {

        console.log(
            '⚠️ WhatsApp offline.'
        );

        return {
            sucesso: false,
            motivo: 'WHATSAPP_OFFLINE'
        };

    }

    const mensagem =

        `Olá, *${dados.nome || 'cliente'}*! 👋\n\n` +

        `Recebemos com sucesso o seu pedido de orçamento ` +

        `para o serviço de *${dados.servicoEspecifico || 'sua solicitação'}*.\n\n` +

        `Nossa equipe já foi notificada e entrará em contato ` +

        `muito em breve para alinhar os próximos detalhes.\n\n` +

        `Agradecemos por escolher a *Lar Forte*! 🏠🛠️`;

    try {

        const contato =
            await comTimeout(
                client.getNumberId(
                    analise.numero
                ),
                10000,
                'getNumberId'
            );

        if (
            contato?._serialized
        ) {

            await comTimeout(

                client.sendMessage(
                    contato._serialized,
                    mensagem
                ),

                15000,

                'envio cliente'

            );

            console.log(
                '✅ Confirmação enviada ao cliente.'
            );

            return {
                sucesso: true,
                metodo: 'CONTACT_ID'
            };

        }

    } catch (error) {

        console.log(
            '⚠️ Busca de contato falhou:',
            error?.message || error
        );

    }

    // ================================================
    // FALLBACK DIRETO
    // ================================================

    try {

        await comTimeout(

            client.sendMessage(
                analise.idDireto,
                mensagem
            ),

            15000,

            'envio direto'

        );

        console.log(
            '✅ Confirmação enviada por número.'
        );

        return {
            sucesso: true,
            metodo: 'NUMERO_DIRETO'
        };

    } catch (error) {

        const tipo =
            classificarErroWhatsApp(
                error
            );

        console.error(
            `❌ Falha no envio [${tipo}]:`,
            error?.message || error
        );

        return {
            sucesso: false,
            motivo: tipo
        };

    }

}

// =====================================================
// QR CODE
// =====================================================

client.on(
    'qr',
    async (qr) => {

        whatsappPronto = false;

        qrGeradoEm =
            new Date().toISOString();

        try {

            // SVG é muito menor que PNG
            // e não precisa ficar guardado como Buffer.

            qrSvg =
                await QRCode.toString(
                    qr,
                    {
                        type: 'svg',
                        margin: 1,
                        width: 360,
                        errorCorrectionLevel: 'M'
                    }
                );

            console.log('');
            console.log(
                '========================================'
            );

            console.log(
                '📱 QR CODE GERADO!'
            );

            console.log(
                '🌐 Abra: /qrcode'
            );

            console.log(
                '========================================'
            );

            console.log('');

        } catch (error) {

            qrSvg = null;

            console.error(
                '❌ Erro gerando QR:',
                error?.message || error
            );

        }

    }
);

// =====================================================
// AUTHENTICATED
// =====================================================

client.on(
    'authenticated',
    () => {

        console.log(
            '🔐 WhatsApp autenticado.'
        );

    }
);

// =====================================================
// READY
// =====================================================

client.on(
    'ready',
    () => {

        whatsappPronto = true;

        whatsappInicializando =
            false;

        qrSvg = null;
        qrGeradoEm = null;

        console.log('');
        console.log(
            '========================================'
        );

        console.log(
            '✅ WHATSAPP CONECTADO!'
        );

        console.log(
            '========================================'
        );

        console.log('');

    }
);

// =====================================================
// AUTH FAILURE
// =====================================================

client.on(
    'auth_failure',
    (msg) => {

        whatsappPronto = false;

        whatsappInicializando =
            false;

        console.error(
            '❌ Falha de autenticação:',
            msg
        );

    }
);

// =====================================================
// DESCONECTADO
// =====================================================

client.on(
    'disconnected',
    (reason) => {

        whatsappPronto = false;

        whatsappInicializando =
            false;

        console.error(
            '⚠️ WhatsApp desconectado:',
            reason
        );

    }
);

// =====================================================
// BOT AUTOMÁTICO
// =====================================================

const controleSaudacao =
    new Map();

const tempoDeInicio =
    Math.floor(
        Date.now() / 1000
    );

client.on(
    'message',
    async (msg) => {

        try {

            if (
                msg.timestamp &&
                msg.timestamp <
                tempoDeInicio
            ) {

                return;

            }

            if (
                msg.from?.includes(
                    '@g.us'
                )
            ) {

                return;

            }

            if (
                msg.from ===
                'status@broadcast'
            ) {

                return;

            }

            if (msg.fromMe) {

                return;

            }

            const texto =
                String(
                    msg.body || ''
                )
                    .toLowerCase()
                    .trim();

            const remetente =
                msg.from;

            // ========================================
            // HUMANO
            // ========================================

            if (
                texto === '1'
            ) {

                await delay(
                    1500
                );

                await msg.reply(
                    '✅ *Certo!* Um de nossos profissionais já vai falar com você. Por favor, aguarde um instante.'
                );

                return;

            }

            const anterior =
                controleSaudacao.get(
                    remetente
                );

            const agora =
                Date.now();

            const limite =
                2 *
                60 *
                60 *
                1000;

            if (
                anterior &&
                agora - anterior <
                limite
            ) {

                return;

            }

            await delay(
                1500
            );

            const linkSite =
                'https://larforte.onrender.com/atendimento';

            const saudacao =

                `Olá! Tudo bem? 👋\n\n` +

                `Somos a *Lar Forte*, especialistas em soluções e manutenção para sua casa.\n\n` +

                `Para agilizar seu orçamento, acesse nosso site:\n` +

                `👉 ${linkSite}\n\n` +

                `Ou, se preferir falar com nossa equipe agora, *digite 1*.`;

            await msg.reply(
                saudacao
            );

            controleSaudacao.set(
                remetente,
                agora
            );

        } catch (error) {

            console.error(
                '❌ Erro no bot:',
                error?.message || error
            );

        }

    }
);

// =====================================================
// API ATENDIMENTO
// =====================================================

app.post(
    '/api/atendimento',
    limitador,
    async (req, res) => {

        try {

            const dados =
                req.body || {};

            // =========================================
            // SALVAR CSV
            // =========================================

            const banco =
                path.join(
                    __dirname,
                    'banco_de_dados.csv'
                );

            const novoArquivo =
                !fs.existsSync(
                    banco
                );

            if (novoArquivo) {

                fs.writeFileSync(

                    banco,

                    'Data,Nome,Telefone,Endereço,Categoria,Serviço,Preço,Observações\n',

                    'utf8'

                );

            }

            const limpar = (valor) =>
                String(valor || '')
                    .replace(/"/g, '""');

            const linha =

                `"${new Date().toLocaleString('pt-BR')}",` +

                `"${limpar(dados.nome)}",` +

                `"${limpar(dados.telefone)}",` +

                `"${limpar(dados.endereco)}",` +

                `"${limpar(dados.categoria)}",` +

                `"${limpar(dados.servicoEspecifico)}",` +

                `"${limpar(dados.orcamentoMedio)}",` +

                `"${limpar(dados.observacoes)}"\n`;

            fs.appendFileSync(
                banco,
                linha,
                'utf8'
            );

            // =========================================
            // RESPONDE IMEDIATAMENTE
            // =========================================

            res.status(200).json({

                sucesso: true,

                mensagem:
                    'Pedido registrado com sucesso!'

            });

            // =========================================
            // WHATSAPP EM SEGUNDO PLANO
            // =========================================

            setImmediate(
                async () => {

                    try {

                        if (
                            !await verificarWhatsApp()
                        ) {

                            console.log(
                                '⚠️ Pedido salvo. WhatsApp offline.'
                            );

                            return;

                        }

                        const relatorio =

                            `🚨 *NOVO CHAMADO VIA SITE* 🚨\n\n` +

                            `👤 *Cliente:* ${dados.nome || 'Não informado'}\n` +

                            `📱 *Contato:* ${dados.telefone || 'Não informado'}\n` +

                            `📍 *Endereço:* ${dados.endereco || 'Não informado'}\n\n` +

                            `🛠️ *Detalhes do Pedido*\n` +

                            `*Categoria:* ${dados.categoria || 'Não informado'}\n` +

                            `*Serviço:* ${dados.servicoEspecifico || 'Não informado'}\n` +

                            `*Previsão:* ${dados.orcamentoMedio || 'Não informado'}\n\n` +

                            `📌 *Observações:* ${dados.observacoes || 'Nenhuma'}`;

                        // ---------------------------------
                        // GRUPO
                        // ---------------------------------

                        await comTimeout(

                            client.sendMessage(
                                ID_GRUPO_FUNCIONARIOS,
                                relatorio
                            ),

                            15000,

                            'envio grupo'

                        );

                        console.log(
                            '✅ Relatório enviado ao grupo.'
                        );

                        // ---------------------------------
                        // FOTO
                        // ---------------------------------

                        if (

                            dados.enviouMidia === 'Sim' &&

                            dados.arquivoPreview

                        ) {

                            const base64 =
                                String(
                                    dados.arquivoPreview
                                )
                                    .split(
                                        ';base64,'
                                    )
                                    .pop();

                            const media =
                                new MessageMedia(

                                    dados.mimetype ||
                                    'image/jpeg',

                                    base64,

                                    dados.filename ||
                                    'arquivo.jpg'

                                );

                            await comTimeout(

                                client.sendMessage(

                                    ID_GRUPO_FUNCIONARIOS,

                                    media,

                                    {

                                        caption:
                                            `📸 Foto enviada pelo cliente *${dados.nome || 'Não informado'}*`

                                    }

                                ),

                                30000,

                                'envio mídia'

                            );

                            console.log(
                                '✅ Mídia enviada ao grupo.'
                            );

                        }

                        // ---------------------------------
                        // CLIENTE
                        // ---------------------------------

                        await enviarConfirmacaoCliente(
                            dados
                        );

                    } catch (error) {

                        console.error(
                            '❌ Erro no processamento WhatsApp:',
                            error?.message || error
                        );

                    }

                }
            );

        } catch (error) {

            console.error(
                '💥 Erro na API:',
                error?.stack ||
                error?.message ||
                error
            );

            if (
                !res.headersSent
            ) {

                res.status(500).json({

                    erro:
                        'Falha ao processar o pedido.'

                });

            }

        }

    }
);

// =====================================================
// API QR CODE
// =====================================================

app.get(
    '/api/qrcode',
    (req, res) => {

        res.setHeader(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, max-age=0'
        );

        if (!qrSvg) {

            return res
                .status(503)
                .send(
                    'QR Code ainda não foi gerado.'
                );

        }

        res.setHeader(
            'Content-Type',
            'image/svg+xml'
        );

        return res.send(
            qrSvg
        );

    }
);

// =====================================================
// PÁGINA QR
// =====================================================

app.get(
    '/qrcode',
    (req, res) => {

        res.setHeader(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, max-age=0'
        );

        res.send(`

<!DOCTYPE html>

<html lang="pt-BR">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width,initial-scale=1.0">

<meta http-equiv="refresh"
content="5">

<title>Lar Forte - WhatsApp</title>

<style>

* {
    box-sizing: border-box;
}

body {

    margin: 0;

    min-height: 100vh;

    display: flex;

    justify-content: center;

    align-items: center;

    background: #111;

    color: #fff;

    font-family: Arial, sans-serif;

}

.card {

    width: min(92vw, 560px);

    text-align: center;

    padding: 30px;

}

h1 {

    margin-bottom: 10px;

}

p {

    color: #aaa;

    line-height: 1.5;

}

.qr {

    width: min(85vw, 420px);

    height: auto;

    background: #fff;

    padding: 14px;

    border-radius: 12px;

    margin: 20px auto;

    display: block;

}

.info {

    color: #999;

    font-size: 14px;

}

</style>

</head>

<body>

<div class="card">

<h1>📱 Conectar WhatsApp</h1>

<p>
Abra o WhatsApp da empresa e escaneie o QR Code abaixo.
</p>

<img
    class="qr"
    src="/api/qrcode"
    alt="QR Code WhatsApp"
>

<p class="info">
A página atualiza automaticamente.
</p>

</div>

</body>

</html>

        `);

    }
);

// =====================================================
// STATUS
// =====================================================

app.get(
    '/api/status',
    async (req, res) => {

        let state =
            'OFFLINE';

        try {

            state =
                await comTimeout(

                    client.getState(),

                    5000,

                    'getState'

                );

        } catch {

            state =
                'OFFLINE';

        }

        const memoria =
            process.memoryUsage();

        res.json({

            servidor:
                'online',

            whatsapp:
                whatsappPronto,

            estadoWhatsapp:
                state,

            qrDisponivel:
                Boolean(qrSvg),

            qrGeradoEm:
                qrGeradoEm,

            memoria: {

                rssMB:
                    Math.round(
                        memoria.rss /
                        1024 /
                        1024
                    ),

                heapMB:
                    Math.round(
                        memoria.heapUsed /
                        1024 /
                        1024
                    )

            },

            data:
                new Date().toISOString()

        });

    }
);

// =====================================================
// HEALTH
// =====================================================

app.get(
    '/health',
    (req, res) => {

        res.status(200).json({

            status:
                'ok',

            whatsapp:
                whatsappPronto

        });

    }
);

// =====================================================
// FRONTEND
// =====================================================

const distPath =
    path.join(
        __dirname,
        'dist'
    );

if (
    fs.existsSync(
        distPath
    )
) {

    app.use(
        express.static(
            distPath
        )
    );

    app.get(
        /^(?!\/api\/|\/health|\/qrcode).*/,
        (req, res) => {

            res.sendFile(
                path.join(
                    distPath,
                    'index.html'
                )
            );

        }
    );

}

// =====================================================
// INICIALIZAÇÃO WHATSAPP
// =====================================================

async function iniciarWhatsApp() {

    if (
        whatsappInicializando ||
        whatsappPronto
    ) {

        return;

    }

    whatsappInicializando =
        true;

    console.log('');
    console.log(
        '⏳ Inicializando WhatsApp...'
    );
    console.log('');

    try {

        await client.initialize();

    } catch (error) {

        whatsappInicializando =
            false;

        console.error('');

        console.error(
            '❌ Erro ao inicializar WhatsApp:'
        );

        console.error(
            error?.stack ||
            error?.message ||
            error
        );

        console.error('');

    }

}

// =====================================================
// SERVIDOR
// =====================================================

app.listen(
    PORT,
    '0.0.0.0',
    () => {

        console.log('');
        console.log(
            `🚀 Servidor Lar Forte na porta ${PORT}`
        );
        console.log('');

        // Pequeno atraso para o Render detectar
        // a porta antes de iniciar o Chromium.

        setTimeout(
            iniciarWhatsApp,
            1500
        );

    }
);
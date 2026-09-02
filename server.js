import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import wwebjs from 'whatsapp-web.js';
import puppeteer from 'puppeteer';
import qrcode from 'qrcode-terminal';

const { Client, LocalAuth, MessageMedia } = wwebjs;

// ============================================
// CONFIGURAÇÃO INICIAL
// ============================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 3000;

// ============================================
// MEMÓRIA
// ============================================

// Limita a memória usada pelo heap do Node.
// Deixamos memória disponível para o Chrome.
if (!process.env.NODE_OPTIONS) {
    process.env.NODE_OPTIONS = '--max-old-space-size=192';
}

// ============================================
// EXPRESS
// ============================================

app.use(express.json({
    limit: '15mb'
}));

app.use(express.urlencoded({
    limit: '15mb',
    extended: true
}));

// ============================================
// CORS
// ============================================

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {

        // Permite:
        // - Render health check
        // - Postman
        // - chamadas sem Origin
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.log(`⚠️ Origem bloqueada pelo CORS: ${origin}`);

        return callback(
            new Error(`Origem não permitida pelo CORS: ${origin}`)
        );
    },

    methods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS'
    ],

    allowedHeaders: [
        'Content-Type',
        'Authorization'
    ]
}));

// ============================================
// RATE LIMIT
// ============================================

const limitador = rateLimit({

    windowMs: 15 * 60 * 1000,

    max: 10,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
        erro: 'Muitas solicitações. Tente novamente mais tarde.'
    }

});

// ============================================
// WHATSAPP
// ============================================

let whatsappPronto = false;
let whatsappInicializando = false;

// ============================================
// CAMINHO DO CHROME
// ============================================

console.log('🚀 Servidor iniciando...');

let chromePath = process.env.PUPPETEER_EXECUTABLE_PATH;

if (!chromePath) {
    chromePath = puppeteer.executablePath();
}

console.log('🌐 Chrome configurado em:', chromePath);

if (!fs.existsSync(chromePath)) {

    console.error('❌ ARQUIVO DO CHROME NÃO EXISTE:', chromePath);

} else {

    console.log('✅ Arquivo do Chrome encontrado!');
}

// ============================================
// CLIENTE WHATSAPP
// ============================================

const client = new Client({

    authStrategy: new LocalAuth({
        clientId: 'lar-forte',
        dataPath: path.join(__dirname, '.wwebjs_auth')
    }),

    puppeteer: {

        headless: true,

        executablePath: chromePath,

        // Tentativa de reduzir consumo de memória
        args: [

            '--no-sandbox',

            '--disable-setuid-sandbox',

            '--disable-dev-shm-usage',

            '--disable-gpu',

            '--disable-software-rasterizer',

            '--disable-extensions',

            '--disable-default-apps',

            '--disable-sync',

            '--disable-background-networking',

            '--disable-background-timer-throttling',

            '--disable-backgrounding-occluded-windows',

            '--disable-renderer-backgrounding',

            '--disable-breakpad',

            '--disable-component-update',

            '--disable-domain-reliability',

            '--disable-features=Translate,BackForwardCache,AcceptCHFrame,MediaRouter',

            '--disable-hang-monitor',

            '--disable-ipc-flooding-protection',

            '--disable-popup-blocking',

            '--disable-prompt-on-repost',

            '--disable-session-crashed-bubble',

            '--disable-client-side-phishing-detection',

            '--metrics-recording-only',

            '--mute-audio',

            '--no-first-run',

            '--no-default-browser-check',

            '--no-zygote',

            '--password-store=basic',

            '--use-mock-keychain',

            '--hide-scrollbars',

            '--force-color-profile=srgb'
        ]
    }

});

const ID_GRUPO_FUNCIONARIOS =
    '120363409125356830@g.us';

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

const delay = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

async function comTimeout(
    promise,
    tempoMs,
    nomeOperacao = 'operação'
) {

    let timeoutId;

    const timeoutPromise = new Promise((_, reject) => {

        timeoutId = setTimeout(() => {

            reject(
                new Error(
                    `Tempo limite excedido em ${nomeOperacao} (${tempoMs}ms)`
                )
            );

        }, tempoMs);

    });

    try {

        return await Promise.race([
            promise,
            timeoutPromise
        ]);

    } finally {

        clearTimeout(timeoutId);

    }

}

async function verificarWhatsApp() {

    if (!whatsappPronto) {
        return false;
    }

    try {

        const state = await comTimeout(
            client.getState(),
            5000,
            'client.getState()'
        );

        return state === 'CONNECTED';

    } catch (error) {

        return false;

    }

}

// ============================================
// ANÁLISE DO TELEFONE
// ============================================

function analisarTelefone(telefone) {

    if (!telefone) {

        return {
            valido: false,
            motivo: 'NUMERO_INVALIDO',
            numero: null
        };

    }

    let numero = String(telefone)
        .replace(/\D/g, '');

    // Remove prefixo internacional 00
    if (numero.startsWith('00')) {
        numero = numero.substring(2);
    }

    // Adiciona Brasil
    if (!numero.startsWith('55')) {
        numero = `55${numero}`;
    }

    // 55 + DDD + 8 ou 9 dígitos
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

    const ddd = Number(
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

    // Celular brasileiro
    if (numero.length === 13) {

        const celular = numero.substring(4);

        if (!celular.startsWith('9')) {

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
        idDireto: `${numero}@c.us`
    };

}

// ============================================
// CLASSIFICAÇÃO DE ERROS
// ============================================

function classificarErroWhatsApp(error) {

    const texto = String(
        error?.message || error || ''
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

// ============================================
// ENVIO PARA GRUPO
// ============================================

async function enviarMensagemGrupo(mensagem) {

    if (!await verificarWhatsApp()) {

        console.log(
            '⚠️ WhatsApp offline. Mensagem do grupo não enviada.'
        );

        return false;

    }

    try {

        await comTimeout(

            client.sendMessage(
                ID_GRUPO_FUNCIONARIOS,
                mensagem
            ),

            15000,

            'envio para grupo'

        );

        return true;

    } catch (erro) {

        console.error(
            '❌ Erro ao enviar mensagem para grupo:',
            erro?.message || erro
        );

        return false;

    }

}

// ============================================
// CONFIRMAÇÃO PARA CLIENTE
// ============================================

async function enviarConfirmacaoCliente(dados) {

    console.log('');
    console.log('=================================');
    console.log('📨 CONFIRMAÇÃO PARA CLIENTE');
    console.log('=================================');

    const analiseTelefone =
        analisarTelefone(dados.telefone);

    if (!analiseTelefone.valido) {

        console.log(
            '❌ Número inválido:',
            dados.telefone
        );

        return {
            sucesso: false,
            motivo: 'NUMERO_INVALIDO'
        };

    }

    const numero =
        analiseTelefone.numero;

    const idDireto =
        analiseTelefone.idDireto;

    if (!await verificarWhatsApp()) {

        console.log(
            '❌ WhatsApp offline.'
        );

        return {
            sucesso: false,
            motivo: 'WHATSAPP_OFFLINE'
        };

    }

    const mensagemCliente =
        `Olá, *${dados.nome || 'cliente'}*! 👋\n\n` +
        `Recebemos com sucesso o seu pedido de orçamento ` +
        `para o serviço de *${dados.servicoEspecifico || 'sua solicitação'}*.\n\n` +
        `Nossa equipe já foi notificada e entrará em contato ` +
        `muito em breve.\n\n` +
        `Agradecemos por escolher a *Lar Forte*! 🏠🛠️`;

    let contactId = null;

    // ----------------------------------------
    // TENTATIVA 1
    // ----------------------------------------

    try {

        console.log(
            `🔎 Procurando número: ${numero}`
        );

        contactId = await comTimeout(

            client.getNumberId(numero),

            10000,

            'getNumberId'

        );

    } catch (erro) {

        console.log(
            '⚠️ getNumberId falhou:',
            erro?.message || erro
        );

    }

    // ----------------------------------------
    // TENTATIVA 2
    // ----------------------------------------

    if (contactId?._serialized) {

        try {

            console.log(
                '📤 Enviando pelo Contact ID...'
            );

            await comTimeout(

                client.sendMessage(
                    contactId._serialized,
                    mensagemCliente
                ),

                15000,

                'sendMessage contactId'

            );

            console.log(
                `✅ Mensagem enviada para ${numero}`
            );

            return {
                sucesso: true,
                motivo: 'ENVIADO',
                metodo: 'CONTACT_ID'
            };

        } catch (erro) {

            console.log(
                '⚠️ Falha no Contact ID:',
                erro?.message || erro
            );

        }

    }

    // ----------------------------------------
    // TENTATIVA 3
    // ----------------------------------------

    try {

        console.log(
            `📤 Envio direto: ${idDireto}`
        );

        await comTimeout(

            client.sendMessage(
                idDireto,
                mensagemCliente
            ),

            15000,

            'sendMessage número direto'

        );

        console.log(
            `✅ Mensagem enviada diretamente para ${numero}`
        );

        return {
            sucesso: true,
            motivo: 'ENVIADO',
            metodo: 'NUMERO_DIRETO'
        };

    } catch (erro) {

        const tipoErro =
            classificarErroWhatsApp(erro);

        console.error(
            `❌ Falha no envio [${tipoErro}]:`,
            erro?.message || erro
        );

        // LID
        if (tipoErro === 'LID_ERROR') {

            await enviarMensagemGrupo(

                `⚠️ *FALHA NO ENVIO AO CLIENTE*\n\n` +
                `Cliente: *${dados.nome || 'Não informado'}*\n` +
                `Telefone: ${dados.telefone || 'Não informado'}\n` +
                `Serviço: ${dados.servicoEspecifico || 'Não informado'}\n\n` +
                `O número parece válido, mas o WhatsApp ` +
                `não conseguiu resolver o identificador interno.`

            );

        }

        return {
            sucesso: false,
            motivo: tipoErro
        };

    }

}

// ============================================
// EVENTOS WHATSAPP
// ============================================

client.on('qr', (qr) => {

    whatsappPronto = false;

    console.log('');
    console.log('📱 NOVO QR CODE GERADO');
    console.log('');

    qrcode.generate(qr, {
        small: true
    });

    console.log('');
    console.log(
        '📱 Escaneie o QR Code com o WhatsApp da empresa!'
    );
    console.log('');

});

client.on('authenticated', () => {

    console.log(
        '🔐 WhatsApp autenticado.'
    );

});

client.on('ready', () => {

    whatsappPronto = true;
    whatsappInicializando = false;

    console.log(
        '✅ Bot do WhatsApp conectado e pronto para enviar mensagens!'
    );

});

client.on('auth_failure', (msg) => {

    whatsappPronto = false;
    whatsappInicializando = false;

    console.error(
        '❌ Falha na autenticação:',
        msg
    );

});

client.on('disconnected', (reason) => {

    whatsappPronto = false;
    whatsappInicializando = false;

    console.error(
        '⚠️ WhatsApp desconectado:',
        reason
    );

});

// ============================================
// BOT AUTOMÁTICO
// ============================================

const controleSaudacao = new Map();

const tempoDeInicio =
    Math.floor(Date.now() / 1000);

client.on('message', async (msg) => {

    try {

        // Ignora mensagens antigas
        if (
            msg.timestamp &&
            msg.timestamp < tempoDeInicio
        ) {
            return;
        }

        // Ignora grupos
        if (msg.from.includes('@g.us')) {
            return;
        }

        // Ignora status
        if (msg.from === 'status@broadcast') {
            return;
        }

        // Ignora mensagens próprias
        if (msg.fromMe) {
            return;
        }

        const texto =
            String(msg.body || '')
                .toLowerCase()
                .trim();

        const remetente =
            msg.from;

        // Pessoa escolheu atendimento humano
        if (texto === '1') {

            await delay(1500);

            await msg.reply(
                '✅ *Certo!* Um de nossos profissionais já vai falar com você. Aguarde um instante.'
            );

            return;
        }

        const ultimaMensagem =
            controleSaudacao.get(remetente);

        const agora =
            Date.now();

        const tempoLimite =
            2 * 60 * 60 * 1000;

        if (
            ultimaMensagem &&
            agora - ultimaMensagem < tempoLimite
        ) {
            return;
        }

        await delay(1500);

        const linkSite =
            'https://larforte.onrender.com/atendimento';

        const saudacao =
            `Olá! Tudo bem? 👋\n\n` +
            `Somos a *Lar Forte*, especialistas em soluções e manutenção para sua casa.\n\n` +
            `Para solicitar um orçamento, acesse:\n` +
            `👉 ${linkSite}\n\n` +
            `Ou, se preferir falar com nossa equipe agora, *digite 1*.`;

        await msg.reply(saudacao);

        controleSaudacao.set(
            remetente,
            agora
        );

    } catch (erro) {

        console.error(
            '❌ Erro no processamento do bot:',
            erro?.message || erro
        );

    }

});

// ============================================
// API ATENDIMENTO
// ============================================

app.post(
    '/api/atendimento',
    limitador,
    async (req, res) => {

        try {

            const dados =
                req.body || {};

            // =================================
            // SALVAR CSV
            // =================================

            const caminhoBanco =
                path.join(
                    __dirname,
                    'banco_de_dados.csv'
                );

            const cabecalho =
                !fs.existsSync(caminhoBanco)
                    ? 'Data,Nome,Telefone,Endereço,Categoria,Serviço,Preço,Observações\n'
                    : '';

            const escapeCsv = (valor) =>
                String(valor || '')
                    .replace(/"/g, '""');

            const linhaCsv =
                `"${new Date().toLocaleString('pt-BR')}",` +
                `"${escapeCsv(dados.nome)}",` +
                `"${escapeCsv(dados.telefone)}",` +
                `"${escapeCsv(dados.endereco)}",` +
                `"${escapeCsv(dados.categoria)}",` +
                `"${escapeCsv(dados.servicoEspecifico)}",` +
                `"${escapeCsv(dados.orcamentoMedio)}",` +
                `"${escapeCsv(dados.observacoes)}"\n`;

            fs.appendFileSync(
                caminhoBanco,
                cabecalho + linhaCsv,
                'utf8'
            );

            // =================================
            // RESPOSTA IMEDIATA AO FRONTEND
            // =================================

            res.status(200).json({

                sucesso: true,

                mensagem:
                    'Pedido registrado com sucesso!'

            });

            // =================================
            // PROCESSAMENTO EM BACKGROUND
            // =================================

            setImmediate(async () => {

                try {

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

                    // Grupo
                    await enviarMensagemGrupo(
                        relatorio
                    );

                    // Foto
                    if (
                        dados.enviouMidia === 'Sim' &&
                        dados.arquivoPreview &&
                        await verificarWhatsApp()
                    ) {

                        const base64Data =
                            String(
                                dados.arquivoPreview
                            )
                                .split(';base64,')
                                .pop();

                        const media =
                            new MessageMedia(

                                dados.mimetype ||
                                    'image/jpeg',

                                base64Data,

                                dados.filename ||
                                    'arquivo.jpg'

                            );

                        await comTimeout(

                            client.sendMessage(
                                ID_GRUPO_FUNCIONARIOS,
                                media,
                                {
                                    caption:
                                        `📸 Foto enviada pelo cliente *${dados.nome || ''}*`
                                }
                            ),

                            30000,

                            'envio de mídia'

                        );

                    }

                    // Cliente
                    await enviarConfirmacaoCliente(
                        dados
                    );

                } catch (erro) {

                    console.error(
                        '❌ Erro no processamento em background:',
                        erro?.message || erro
                    );

                }

            });

        } catch (error) {

            console.error(
                '💥 ERRO NA ROTA /api/atendimento:',
                error?.stack ||
                error?.message ||
                error
            );

            if (!res.headersSent) {

                res.status(500).json({

                    sucesso: false,

                    erro:
                        'Falha ao processar o pedido.'

                });

            }

        }

    }
);

// ============================================
// STATUS
// ============================================

app.get(
    '/api/status',
    async (req, res) => {

        let state = 'OFFLINE';

        if (whatsappPronto) {

            try {

                state = await comTimeout(

                    client.getState(),

                    3000,

                    'getState'

                );

            } catch {

                state = 'OFFLINE';

            }

        }

        res.json({

            servidor: 'online',

            whatsapp: whatsappPronto,

            inicializando:
                whatsappInicializando,

            estadoWhatsapp:
                state,

            memoria: {

                rssMB:
                    Math.round(
                        process.memoryUsage().rss /
                        1024 /
                        1024
                    ),

                heapUsedMB:
                    Math.round(
                        process.memoryUsage().heapUsed /
                        1024 /
                        1024
                    )

            },

            data:
                new Date().toISOString()

        });

    }
);

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {

    res.status(200).json({

        status: 'ok',

        whatsapp:
            whatsappPronto

    });

});

// ============================================
// FRONTEND REACT
// ============================================

const distPath =
    path.join(
        __dirname,
        'dist'
    );

app.use(
    express.static(
        distPath
    )
);

// React Router
app.get(
    /^(?!\/api\/|\/health).*/,
    (req, res) => {

        res.sendFile(
            path.join(
                distPath,
                'index.html'
            )
        );

    }
);

// ============================================
// PROTEÇÃO CONTRA ERROS
// ============================================

process.on(
    'uncaughtException',
    (err) => {

        console.error(
            '⚠️ Erro crítico:',
            err?.stack ||
            err?.message ||
            err
        );

    }
);

process.on(
    'unhandledRejection',
    (reason) => {

        console.error(
            '⚠️ Promessa rejeitada:',
            reason
        );

    }
);

// ============================================
// INICIALIZAÇÃO WHATSAPP
// ============================================

async function iniciarWhatsApp() {

    if (
        whatsappInicializando ||
        whatsappPronto
    ) {

        return;

    }

    whatsappInicializando = true;

    console.log(
        '🚀 Iniciando cliente do WhatsApp...'
    );

    try {

        await client.initialize();

    } catch (erro) {

        whatsappInicializando = false;

        console.error(
            '❌ Erro ao inicializar WhatsApp:',
            erro?.message || erro
        );

    }

}

// ============================================
// INICIAR SERVIDOR PRIMEIRO
// ============================================

app.listen(
    PORT,
    '0.0.0.0',
    () => {

        console.log(
            `🚀 Servidor Lar Forte rodando na porta ${PORT}`
        );

        // Espera um pouco antes de abrir o Chrome.
        // Isso permite ao Render detectar a porta primeiro.
        setTimeout(() => {

            iniciarWhatsApp();

        }, 3000);

    }
);
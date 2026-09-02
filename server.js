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

// =====================================================
// CONFIGURAÇÃO INICIAL
// =====================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.json({
    limit: '25mb'
}));

app.use(express.urlencoded({
    limit: '25mb',
    extended: true
}));

// =====================================================
// CORS
// =====================================================

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {

        // Permite Render, health checks, Postman etc.
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.log('⚠️ Origem bloqueada pelo CORS:', origin);

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
    ],

    credentials: true
}));

// =====================================================
// RATE LIMIT
// =====================================================

const limitador = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        erro: 'Muitas solicitações. Tente novamente mais tarde.'
    }
});

// =====================================================
// WHATSAPP - CONFIGURAÇÃO LEVE
// =====================================================

console.log('');
console.log('🚀 Iniciando cliente do WhatsApp...');

// Caminho definido no Render
const chromePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    puppeteer.executablePath();

console.log('🌐 Chrome configurado em:', chromePath);

// Verifica se Chrome existe
if (!fs.existsSync(chromePath)) {

    console.error('');
    console.error('❌ ARQUIVO DO CHROME NÃO EXISTE!');
    console.error('📍 Caminho:', chromePath);
    console.error('');

} else {

    console.log('✅ Arquivo do Chrome encontrado!');
}

// =====================================================
// CONTROLE DE ESTADO
// =====================================================

let whatsappPronto = false;
let whatsappInicializando = false;

// Controla o QR
let qrJaExibido = false;
let qrAtual = null;
let quantidadeQr = 0;

// =====================================================
// CLIENTE WHATSAPP
// =====================================================

const client = new Client({

    authStrategy: new LocalAuth({
        clientId: 'lar-forte',

        // Evita caminhos desnecessários
        dataPath: path.join(
            __dirname,
            '.wwebjs_auth'
        )
    }),

    puppeteer: {

        headless: true,

        executablePath: chromePath,

        args: [

            // Essenciais para Render
            '--no-sandbox',
            '--disable-setuid-sandbox',

            // Memória compartilhada
            '--disable-dev-shm-usage',

            // GPU
            '--disable-gpu',

            // Inicialização
            '--no-first-run',
            '--no-zygote',

            // Reduz processos extras
            '--disable-extensions',

            // Evita componentes extras
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',

            '--disable-breakpad',
            '--disable-component-update',

            '--disable-default-apps',
            '--disable-domain-reliability',

            '--disable-features=Translate,BackForwardCache,MediaRouter,OptimizationHints',

            '--disable-sync',

            // Chrome mais leve
            '--metrics-recording-only',

            '--mute-audio',

            // Evita uso de notificações
            '--disable-notifications'
        ]

    }

});

// =====================================================
// CONFIGURAÇÃO DO GRUPO
// =====================================================

const ID_GRUPO_FUNCIONARIOS =
    '120363409125356830@g.us';

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

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

// =====================================================
// STATUS DO WHATSAPP
// =====================================================

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

    } catch {

        return false;

    }

}

// =====================================================
// MEMÓRIA
// =====================================================

setInterval(() => {

    const memoria = process.memoryUsage();

    const rss =
        Math.round(memoria.rss / 1024 / 1024);

    const heap =
        Math.round(memoria.heapUsed / 1024 / 1024);

    console.log(
        `🧠 Memória Node | RSS: ${rss} MB | Heap: ${heap} MB`
    );

}, 5 * 60 * 1000);

// =====================================================
// ANÁLISE DO TELEFONE
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
        String(telefone).replace(/\D/g, '');

    // Remove prefixo 00
    if (numero.startsWith('00')) {

        numero = numero.substring(2);

    }

    // Adiciona Brasil
    if (!numero.startsWith('55')) {

        numero = `55${numero}`;

    }

    // Brasil:
    // 55 + DDD + 8/9 dígitos
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
        Number(numero.substring(2, 4));

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

    // Celular de 9 dígitos
    if (numero.length === 13) {

        const celular =
            numero.substring(4);

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

        idDireto:
            `${numero}@c.us`

    };

}

// =====================================================
// CLASSIFICAR ERROS
// =====================================================

function classificarErroWhatsApp(error) {

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
        texto.includes('invalid') ||
        texto.includes('invalid wid') ||
        texto.includes('invalid number')
    ) {

        return 'NUMERO_INVALIDO';

    }

    if (
        texto.includes('disconnected') ||
        texto.includes('not connected') ||
        texto.includes('session')
    ) {

        return 'WHATSAPP_OFFLINE';

    }

    return 'ERRO_ENVIO';

}

// =====================================================
// ENVIO PARA CLIENTE
// =====================================================

async function enviarConfirmacaoCliente(dados) {

    console.log('');
    console.log('========================================');
    console.log('📨 CONFIRMAÇÃO PARA O CLIENTE');
    console.log('========================================');

    const analise =
        analisarTelefone(dados.telefone);

    if (!analise.valido) {

        console.error(
            '❌ Número inválido:',
            dados.telefone
        );

        return {
            sucesso: false,
            motivo: 'NUMERO_INVALIDO'
        };

    }

    const {
        numero,
        idDireto
    } = analise;

    const whatsappDisponivel =
        await verificarWhatsApp();

    if (!whatsappDisponivel) {

        console.error(
            '❌ WhatsApp offline. Confirmação não enviada.'
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
        `em breve para alinhar os próximos detalhes.\n\n` +

        `Agradecemos por escolher a *Lar Forte*! 🏠🛠️`;

    // -----------------------------------------------
    // TENTATIVA 1 - RESOLVER NÚMERO
    // -----------------------------------------------

    try {

        console.log(
            '🔎 Procurando contato:',
            numero
        );

        const contactId =
            await comTimeout(

                client.getNumberId(numero),

                10000,

                'getNumberId'

            );

        if (contactId?._serialized) {

            console.log(
                '📤 Enviando para:',
                contactId._serialized
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
                '✅ Confirmação enviada!'
            );

            return {
                sucesso: true,
                motivo: 'ENVIADO',
                metodo: 'CONTACT_ID'
            };

        }

    } catch (erro) {

        console.error(
            '⚠️ Falha ao localizar contato:',
            erro?.message || erro
        );

    }

    // -----------------------------------------------
    // TENTATIVA 2 - NÚMERO DIRETO
    // -----------------------------------------------

    try {

        console.log(
            '📤 Tentando envio direto:',
            idDireto
        );

        await comTimeout(

            client.sendMessage(
                idDireto,
                mensagemCliente
            ),

            15000,

            'sendMessage direto'

        );

        console.log(
            '✅ Mensagem enviada diretamente!'
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
            `❌ Erro no envio [${tipoErro}]:`,
            erro?.message || erro
        );

        return {
            sucesso: false,
            motivo: tipoErro
        };

    }

}

// =====================================================
// EVENTOS DO WHATSAPP
// =====================================================

client.on('qr', (qr) => {

    whatsappPronto = false;

    qrAtual = qr;
    quantidadeQr++;

    // =================================================
    // EXIBE APENAS O PRIMEIRO QR NO LOG
    // =================================================

    if (!qrJaExibido) {

        qrJaExibido = true;

        console.log('');
        console.log('========================================');
        console.log('📱 QR CODE DO WHATSAPP');
        console.log('========================================');

        qrcode.generate(qr, {
            small: true
        });

        console.log('');
        console.log(
            '📱 Escaneie este QR Code com o WhatsApp da empresa.'
        );

        console.log(
            '⚠️ Após escanear, aguarde a mensagem de conexão.'
        );

        console.log('========================================');
        console.log('');

    } else {

        console.log(
            `🔄 WhatsApp gerou um novo QR (${quantidadeQr}), mas o QR não será repetido no log.`
        );

    }

});

// =====================================================
// READY
// =====================================================

client.on('ready', () => {

    whatsappPronto = true;
    whatsappInicializando = false;

    // Limpa QR da memória
    qrAtual = null;

    console.log('');
    console.log(
        '========================================'
    );

    console.log(
        '✅ BOT DO WHATSAPP CONECTADO!'
    );

    console.log(
        '========================================'
    );

    console.log('');

});

// =====================================================
// AUTHENTICATED
// =====================================================

client.on('authenticated', () => {

    console.log(
        '🔐 WhatsApp autenticado com sucesso.'
    );

});

// =====================================================
// AUTH FAILURE
// =====================================================

client.on('auth_failure', (msg) => {

    whatsappPronto = false;
    whatsappInicializando = false;

    console.error(
        '❌ Falha na autenticação:',
        msg
    );

});

// =====================================================
// DISCONNECTED
// =====================================================

client.on('disconnected', (reason) => {

    whatsappPronto = false;
    whatsappInicializando = false;

    console.error(
        '⚠️ WhatsApp desconectado:',
        reason
    );

});

// =====================================================
// PROTEÇÃO CONTRA ERROS
// =====================================================

process.on('uncaughtException', (erro) => {

    console.error(
        '💥 Erro crítico:',
        erro?.stack ||
        erro?.message ||
        erro
    );

});

process.on('unhandledRejection', (erro) => {

    console.error(
        '⚠️ Promise rejeitada:',
        erro?.message ||
        erro
    );

});

// =====================================================
// RESPOSTA AUTOMÁTICA
// =====================================================

const controleSaudacao = new Map();

const tempoDeInicio =
    Math.floor(Date.now() / 1000);

client.on('message', async (msg) => {

    try {

        // Ignora mensagens antigas
        if (msg.timestamp < tempoDeInicio) {
            return;
        }

        // Ignora grupos
        if (msg.from.includes('@g.us')) {
            return;
        }

        // Ignora status
        if (
            msg.from === 'status@broadcast'
        ) {
            return;
        }

        // Ignora mensagens próprias
        if (msg.fromMe) {
            return;
        }

        const texto =
            (msg.body || '')
                .toLowerCase()
                .trim();

        const remetente =
            msg.from;

        // ------------------------------------------------
        // FALAR COM EQUIPE
        // ------------------------------------------------

        if (texto === '1') {

            await delay(2000);

            await msg.reply(

                '✅ *Certo!* Um de nossos profissionais ' +
                'já vai falar com você. Aguarde um instante.'

            );

            return;

        }

        // ------------------------------------------------
        // CONTROLE DE SAUDAÇÃO
        // ------------------------------------------------

        const ultimaMensagem =
            controleSaudacao.get(remetente);

        const agora =
            Date.now();

        const duasHoras =
            2 * 60 * 60 * 1000;

        if (
            !ultimaMensagem ||
            agora - ultimaMensagem > duasHoras
        ) {

            await delay(2000);

            const linkSite =
                'https://larforte.onrender.com/atendimento';

            const saudacao =

                'Olá! Tudo bem? 👋\n\n' +

                'Somos a *Lar Forte*, especialistas em ' +
                'soluções e manutenção para sua casa.\n\n' +

                'Para solicitar um orçamento, acesse:\n' +

                `👉 ${linkSite}\n\n` +

                'Ou, se preferir falar com nossa equipe agora, ' +
                '*digite 1*.';

            await msg.reply(saudacao);

            controleSaudacao.set(
                remetente,
                agora
            );

        }

    } catch (erro) {

        console.error(
            '❌ Erro na resposta automática:',
            erro?.message || erro
        );

    }

});

// =====================================================
// API DE ATENDIMENTO
// =====================================================

app.post(
    '/api/atendimento',

    limitador,

    async (req, res) => {

        try {

            const dados =
                req.body || {};

            // =============================================
            // SALVA CSV
            // =============================================

            const caminhoBanco =
                path.join(
                    __dirname,
                    'banco_de_dados.csv'
                );

            const cabecalho =
                !fs.existsSync(caminhoBanco)
                    ? 'Data,Nome,Telefone,Endereço,Categoria,Serviço,Preço,Observações\n'
                    : '';

            const limpar = (valor) =>
                String(valor || '')
                    .replace(/"/g, '""');

            const linhaCsv =

                `"${new Date().toLocaleString('pt-BR')}",` +

                `"${limpar(dados.nome)}",` +

                `"${limpar(dados.telefone)}",` +

                `"${limpar(dados.endereco)}",` +

                `"${limpar(dados.categoria)}",` +

                `"${limpar(dados.servicoEspecifico)}",` +

                `"${limpar(dados.orcamentoMedio)}",` +

                `"${limpar(dados.observacoes)}"\n`;

            fs.appendFileSync(
                caminhoBanco,
                cabecalho + linhaCsv,
                'utf8'
            );

            // =============================================
            // RESPOSTA IMEDIATA
            // =============================================

            res.status(200).json({

                sucesso: true,

                mensagem:
                    'Pedido registrado com sucesso!',

                whatsapp:
                    whatsappPronto

            });

            // =============================================
            // ENVIO WHATSAPP EM BACKGROUND
            // =============================================

            setImmediate(async () => {

                try {

                    if (
                        await verificarWhatsApp()
                    ) {

                        const relatorio =

                            '🚨 *NOVO CHAMADO VIA SITE* 🚨\n\n' +

                            `👤 *Cliente:* ${dados.nome || 'Não informado'}\n` +

                            `📱 *Contato:* ${dados.telefone || 'Não informado'}\n` +

                            `📍 *Endereço:* ${dados.endereco || 'Não informado'}\n\n` +

                            '🛠️ *Detalhes do Pedido*\n' +

                            `*Categoria:* ${dados.categoria || 'Não informado'}\n` +

                            `*Serviço:* ${dados.servicoEspecifico || 'Não informado'}\n` +

                            `*Previsão:* ${dados.orcamentoMedio || 'Não informado'}\n\n` +

                            `📌 *Observações:* ${dados.observacoes || 'Nenhuma'}`;

                        await comTimeout(

                            client.sendMessage(
                                ID_GRUPO_FUNCIONARIOS,
                                relatorio
                            ),

                            15000,

                            'envio grupo'

                        );

                        // -------------------------------------
                        // MÍDIA
                        // -------------------------------------

                        if (
                            dados.enviouMidia === 'Sim' &&
                            dados.arquivoPreview
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
                                            `📸 Foto enviada por *${dados.nome || 'cliente'}*`
                                    }

                                ),

                                30000,

                                'envio mídia'

                            );

                        }

                    } else {

                        console.log(
                            '⚠️ Pedido salvo, mas WhatsApp está offline.'
                        );

                    }

                    // Confirmação privada
                    await enviarConfirmacaoCliente(
                        dados
                    );

                } catch (erro) {

                    console.error(
                        '❌ Erro no processamento WhatsApp:',
                        erro?.message || erro
                    );

                }

            });

        } catch (erro) {

            console.error(
                '💥 ERRO NA ROTA /api/atendimento:',
                erro?.stack ||
                erro?.message ||
                erro
            );

            if (!res.headersSent) {

                res.status(500).json({
                    erro:
                        'Falha ao processar o pedido.'
                });

            }

        }

    }

);

// =====================================================
// API STATUS
// =====================================================

app.get(
    '/api/status',

    async (req, res) => {

        let state = 'OFFLINE';

        try {

            state =
                await comTimeout(

                    client.getState(),

                    5000,

                    'getState'

                );

        } catch {

            state = 'OFFLINE';

        }

        const memoria =
            process.memoryUsage();

        res.json({

            servidor: 'online',

            whatsapp:
                whatsappPronto,

            estadoWhatsapp:
                state,

            qrPendente:
                Boolean(qrAtual),

            qrExibido:
                qrJaExibido,

            memoria: {

                rss:
                    Math.round(
                        memoria.rss /
                        1024 /
                        1024
                    ) + ' MB',

                heap:
                    Math.round(
                        memoria.heapUsed /
                        1024 /
                        1024
                    ) + ' MB'

            },

            data:
                new Date().toISOString()

        });

    }

);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
    '/health',

    (req, res) => {

        res.status(200).json({
            status: 'ok'
        });

    }

);

// =====================================================
// FRONTEND VITE
// =====================================================

const distPath =
    path.join(
        __dirname,
        'dist'
    );

if (fs.existsSync(distPath)) {

    app.use(
        express.static(distPath)
    );

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

}

// =====================================================
// INICIALIZAÇÃO DO WHATSAPP
// =====================================================

async function iniciarWhatsApp() {

    if (whatsappInicializando) {

        console.log(
            '⚠️ WhatsApp já está inicializando.'
        );

        return;

    }

    whatsappInicializando = true;

    console.log('');
    console.log('⏳ Inicializando WhatsApp...');
    console.log('');

    try {

        await client.initialize();

    } catch (erro) {

        whatsappInicializando = false;

        console.error('');
        console.error(
            '❌ Erro ao inicializar WhatsApp:'
        );

        console.error(
            erro?.stack ||
            erro?.message ||
            erro
        );

        console.error('');

    }

}

// =====================================================
// INICIA SERVIDOR PRIMEIRO
// =====================================================

app.listen(
    PORT,
    '0.0.0.0',

    () => {

        console.log(
            `🚀 Servidor Lar Forte rodando na porta ${PORT}`
        );

        // Inicializa WhatsApp uma única vez
        iniciarWhatsApp();

    }
);
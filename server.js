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

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({
    limit: '50mb'
}));

app.use(express.urlencoded({
    limit: '50mb',
    extended: true
}));

// ============================================================
// CORS
// ============================================================

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {

        // Permite Render health check, Postman e chamadas sem Origin
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

// ============================================================
// RATE LIMIT
// ============================================================

const limitador = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
        erro: 'Muitas solicitações. Tente novamente mais tarde.'
    }
});

// ============================================================
// LOG DE MEMÓRIA
// ============================================================

function logMemoria() {

    const memoria = process.memoryUsage();

    console.log(
        `🧠 Memória Node | RSS: ${Math.round(memoria.rss / 1024 / 1024)} MB | ` +
        `Heap: ${Math.round(memoria.heapUsed / 1024 / 1024)} MB`
    );
}

setInterval(logMemoria, 60000);

// ============================================================
// CHROME / PUPPETEER
// ============================================================

console.log('🚀 Iniciando cliente do WhatsApp...');

const chromePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    puppeteer.executablePath();

console.log('🌐 Chrome configurado em:', chromePath);

if (!fs.existsSync(chromePath)) {

    console.error(
        '❌ ARQUIVO DO CHROME NÃO EXISTE:',
        chromePath
    );

} else {

    console.log('✅ Arquivo do Chrome encontrado!');
}

// ============================================================
// WHATSAPP
// ============================================================

let whatsappPronto = false;
let whatsappInicializando = false;

const client = new Client({

    authStrategy: new LocalAuth({
        clientId: 'lar-forte',

        // Reduz arquivos desnecessários de autenticação
        dataPath: path.join(
            __dirname,
            '.wwebjs_auth'
        )
    }),

    puppeteer: {

        headless: true,

        executablePath: chromePath,

        args: [

            // Necessário no Render
            '--no-sandbox',
            '--disable-setuid-sandbox',

            // Economia de memória
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--disable-default-apps',
            '--disable-sync',

            // Processos e serviços extras
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-breakpad',
            '--disable-component-update',

            // Recursos desnecessários
            '--disable-notifications',
            '--disable-popup-blocking',
            '--disable-translate',
            '--mute-audio',

            // Inicialização
            '--no-first-run',
            '--no-zygote',

            // Economia de cache
            '--disk-cache-size=1',
            '--media-cache-size=1',

            // Menor uso gráfico
            '--window-size=800,600'
        ]
    }
});

const ID_GRUPO_FUNCIONARIOS =
    '120363409125356830@g.us';

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

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
            8000,
            'client.getState()'
        );

        return state === 'CONNECTED';

    } catch (error) {

        console.error(
            '⚠️ Não foi possível confirmar estado do WhatsApp:',
            error?.message || error
        );

        return false;
    }
}

// ============================================================
// TELEFONE
// ============================================================

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

    if (numero.startsWith('00')) {
        numero = numero.substring(2);
    }

    if (!numero.startsWith('55')) {
        numero = `55${numero}`;
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
        idDireto: `${numero}@c.us`
    };
}

// ============================================================
// CLASSIFICAÇÃO DE ERROS
// ============================================================

function classificarErroWhatsApp(error) {

    const texto =
        String(error?.message || error || '')
            .toLowerCase();

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

// ============================================================
// ENVIO DE CONFIRMAÇÃO AO CLIENTE
// ============================================================

async function enviarConfirmacaoCliente(dados) {

    console.log('');
    console.log('================================');
    console.log('📨 CONFIRMAÇÃO PARA CLIENTE');
    console.log('================================');

    const analise =
        analisarTelefone(dados.telefone);

    if (!analise.valido) {

        console.log(
            '❌ Número inválido:',
            dados.telefone
        );

        return {
            sucesso: false,
            motivo: 'NUMERO_INVALIDO'
        };
    }

    const numero = analise.numero;

    if (!await verificarWhatsApp()) {

        return {
            sucesso: false,
            motivo: 'WHATSAPP_OFFLINE'
        };
    }

    const mensagem =

        `Olá, *${dados.nome}*! 👋\n\n` +

        `Recebemos com sucesso o seu pedido de orçamento ` +
        `para o serviço de *${dados.servicoEspecifico}*.\n\n` +

        `Nossa equipe já foi notificada e entrará em contato ` +
        `em breve para alinhar os próximos detalhes.\n\n` +

        `Agradecemos por escolher a *Lar Forte*! 🏠🛠️`;

    try {

        // Primeiro tenta localizar o contato
        const contactId =
            await comTimeout(
                client.getNumberId(numero),
                10000,
                'getNumberId'
            );

        if (contactId?._serialized) {

            await comTimeout(

                client.sendMessage(
                    contactId._serialized,
                    mensagem
                ),

                15000,

                'sendMessage contactId'
            );

            console.log(
                `✅ Confirmação enviada para ${numero}`
            );

            return {
                sucesso: true,
                metodo: 'CONTACT_ID'
            };
        }

    } catch (error) {

        console.log(
            '⚠️ Falha na busca do contato:',
            error?.message || error
        );
    }

    // Fallback pelo número
    try {

        await comTimeout(

            client.sendMessage(
                `${numero}@c.us`,
                mensagem
            ),

            15000,

            'sendMessage numero'
        );

        return {
            sucesso: true,
            metodo: 'NUMERO_DIRETO'
        };

    } catch (error) {

        const tipo =
            classificarErroWhatsApp(error);

        console.error(
            `❌ Erro no envio [${tipo}]:`,
            error?.message || error
        );

        return {
            sucesso: false,
            motivo: tipo
        };
    }
}

// ============================================================
// EVENTOS WHATSAPP
// ============================================================

client.on('qr', (qr) => {

    whatsappPronto = false;

    console.log('');
    console.log('================================');
    console.log('📱 QR CODE GERADO');
    console.log('================================');

    qrcode.generate(qr, {
        small: true
    });

    console.log('');
    console.log('📱 Escaneie o QR Code!');
    console.log('');

    logMemoria();
});

client.on('authenticated', () => {

    console.log('🔐 WhatsApp autenticado.');

});

client.on('ready', () => {

    whatsappPronto = true;
    whatsappInicializando = false;

    console.log(
        '✅ Bot do WhatsApp conectado e pronto!'
    );

    logMemoria();
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

    console.error(
        '⚠️ WhatsApp desconectado:',
        reason
    );
});

// ============================================================
// PROTEÇÃO CONTRA ERROS
// ============================================================

process.on('uncaughtException', (err) => {

    console.error(
        '💥 Erro crítico:',
        err?.stack || err
    );
});

process.on('unhandledRejection', (reason) => {

    console.error(
        '💥 Promise rejeitada:',
        reason
    );
});

// ============================================================
// BOT AUTOMÁTICO
// ============================================================

const controleSaudacao =
    new Map();

const tempoDeInicio =
    Math.floor(Date.now() / 1000);

client.on('message', async (msg) => {

    try {

        if (
            msg.timestamp &&
            msg.timestamp < tempoDeInicio
        ) {
            return;
        }

        if (
            msg.from.includes('@g.us') ||
            msg.from === 'status@broadcast' ||
            msg.fromMe
        ) {
            return;
        }

        const texto =
            (msg.body || '')
                .toLowerCase()
                .trim();

        const remetente =
            msg.from;

        if (texto === '1') {

            await delay(1500);

            await msg.reply(
                '✅ *Certo!* Um de nossos profissionais ' +
                'já vai falar com você. Por favor, aguarde.'
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
            !ultimaMensagem ||
            agora - ultimaMensagem > tempoLimite
        ) {

            await delay(1500);

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

    } catch (error) {

        console.error(
            '❌ Erro no bot:',
            error?.message || error
        );
    }
});

// ============================================================
// API ATENDIMENTO
// ============================================================

app.post(
    '/api/atendimento',
    limitador,

    async (req, res) => {

        try {

            const dados =
                req.body || {};

            // Responde imediatamente ao frontend
            res.status(200).json({
                sucesso: true,
                mensagem: 'Pedido registrado com sucesso!'
            });

            // Tudo abaixo acontece em segundo plano
            setImmediate(async () => {

                try {

                    // CSV
                    const caminhoBanco =
                        path.join(
                            __dirname,
                            'banco_de_dados.csv'
                        );

                    const cabecalho =
                        !fs.existsSync(caminhoBanco)
                            ? 'Data,Nome,Telefone,Endereço,Categoria,Serviço,Preço,Observações\n'
                            : '';

                    const limparCsv = (valor) =>
                        String(valor || '')
                            .replace(/"/g, '""');

                    const linhaCsv =

                        `"${new Date().toLocaleString('pt-BR')}",` +
                        `"${limparCsv(dados.nome)}",` +
                        `"${limparCsv(dados.telefone)}",` +
                        `"${limparCsv(dados.endereco)}",` +
                        `"${limparCsv(dados.categoria)}",` +
                        `"${limparCsv(dados.servicoEspecifico)}",` +
                        `"${limparCsv(dados.orcamentoMedio)}",` +
                        `"${limparCsv(dados.observacoes)}"\n`;

                    fs.appendFileSync(
                        caminhoBanco,
                        cabecalho + linhaCsv,
                        'utf8'
                    );

                    // Se WhatsApp estiver offline,
                    // não tenta enviar mensagens
                    if (!await verificarWhatsApp()) {

                        console.log(
                            '⚠️ Pedido salvo, mas WhatsApp offline.'
                        );

                        return;
                    }

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

                    // FOTO
                    if (
                        dados.enviouMidia === 'Sim' &&
                        dados.arquivoPreview
                    ) {

                        const base64Data =
                            String(dados.arquivoPreview)
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
                                        `📸 Foto enviada por *${dados.nome}*`
                                }
                            ),

                            30000,

                            'envio mídia'
                        );
                    }

                    // Confirmação ao cliente
                    await enviarConfirmacaoCliente(dados);

                } catch (error) {

                    console.error(
                        '❌ Erro no processamento em background:',
                        error?.message || error
                    );
                }
            });

        } catch (error) {

            console.error(
                '💥 Erro na rota atendimento:',
                error?.message || error
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

// ============================================================
// STATUS
// ============================================================

app.get('/api/status', async (req, res) => {

    let state = 'OFFLINE';

    if (whatsappPronto) {

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
    }

    const memoria =
        process.memoryUsage();

    res.json({

        servidor: 'online',

        whatsapp: whatsappPronto,

        estadoWhatsapp: state,

        memoria: {

            rssMB:
                Math.round(
                    memoria.rss / 1024 / 1024
                ),

            heapMB:
                Math.round(
                    memoria.heapUsed / 1024 / 1024
                )
        },

        data:
            new Date().toISOString()
    });
});

// ============================================================
// FRONTEND VITE
// ============================================================

const distPath =
    path.join(__dirname, 'dist');

app.use(
    express.static(distPath)
);

// Não interfere nas rotas da API
app.get(
    /^(?!\/api\/).*/,
    (req, res) => {

        res.sendFile(
            path.join(
                distPath,
                'index.html'
            )
        );
    }
);

// ============================================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================================

app.listen(
    PORT,
    '0.0.0.0',
    () => {

        console.log(
            `🚀 Servidor Lar Forte rodando na porta ${PORT}`
        );

        logMemoria();
    }
);

// ============================================================
// INICIALIZAÇÃO DO WHATSAPP
// ============================================================

async function iniciarWhatsApp() {

    if (whatsappInicializando) {

        console.log(
            '⚠️ WhatsApp já está inicializando.'
        );

        return;
    }

    whatsappInicializando = true;

    try {

        console.log(
            '⏳ Inicializando WhatsApp...'
        );

        await client.initialize();

    } catch (erro) {

        whatsappInicializando = false;

        console.error(
            '❌ Erro ao inicializar WhatsApp:',
            erro?.message || erro
        );
    }
}

iniciarWhatsApp();
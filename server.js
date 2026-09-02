import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import wwebjs from 'whatsapp-web.js';
import puppeteer from 'puppeteer';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';

const { Client, LocalAuth, MessageMedia } = wwebjs;

// =====================================================
// CONFIGURAÇÃO INICIAL
// =====================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// CONFIGURAÇÃO EXPRESS
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

        // Permite Render health checks, Postman
        // e chamadas sem header Origin
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.log(
            `⚠️ Origem bloqueada pelo CORS: ${origin}`
        );

        return callback(
            new Error(
                `Origem não permitida pelo CORS: ${origin}`
            )
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
// VARIÁVEIS DO QR CODE
// =====================================================

// QR original fornecido pelo WhatsApp
let qrAtual = null;

// Imagem PNG do QR
let qrImagem = null;

// Momento da geração
let qrGeradoEm = null;

// Controle de estado
let whatsappPronto = false;
let whatsappInicializando = false;

// =====================================================
// CHROME / PUPPETEER
// =====================================================

console.log('');
console.log('🚀 Iniciando cliente do WhatsApp...');

const chromePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    puppeteer.executablePath();

console.log(
    '🌐 Chrome configurado em:',
    chromePath
);

if (!fs.existsSync(chromePath)) {

    console.error('');
    console.error(
        '❌ ARQUIVO DO CHROME NÃO EXISTE!'
    );

    console.error(
        '📍 Caminho:',
        chromePath
    );

    console.error('');

} else {

    console.log(
        '✅ Arquivo do Chrome encontrado!'
    );
}

// =====================================================
// CLIENTE WHATSAPP
// =====================================================

const client = new Client({

    authStrategy: new LocalAuth({

        clientId: 'lar-forte',

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

            // Evita problemas de memória compartilhada
            '--disable-dev-shm-usage',

            // Não usamos GPU
            '--disable-gpu',

            // Inicialização
            '--no-first-run',
            '--no-zygote',

            // Redução de processos extras
            '--disable-extensions',
            '--disable-default-apps',
            '--disable-sync',

            // Reduz atividades em segundo plano
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-component-update',
            '--disable-domain-reliability',

            // Recursos não utilizados
            '--disable-breakpad',
            '--disable-notifications',
            '--disable-popup-blocking',

            '--mute-audio',

            '--metrics-recording-only',

            '--disable-features=Translate,MediaRouter,OptimizationHints'

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

    const timeoutPromise =
        new Promise((_, reject) => {

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
// VERIFICAR WHATSAPP
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

                'client.getState'

            );

        return state === 'CONNECTED';

    } catch {

        return false;

    }

}


// =====================================================
// MEMÓRIA
// =====================================================

// Mostra memória somente a cada 5 minutos
// para não poluir o log

setInterval(() => {

    const memoria =
        process.memoryUsage();

    const rss =
        Math.round(
            memoria.rss / 1024 / 1024
        );

    const heap =
        Math.round(
            memoria.heapUsed / 1024 / 1024
        );

    console.log(
        `🧠 Memória Node | RSS: ${rss} MB | Heap: ${heap} MB`
    );

}, 5 * 60 * 1000);


// =====================================================
// ANALISAR TELEFONE
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

    // Remove prefixo internacional 00
    if (numero.startsWith('00')) {

        numero =
            numero.substring(2);

    }

    // Adiciona código do Brasil
    if (!numero.startsWith('55')) {

        numero =
            `55${numero}`;

    }

    // Brasil:
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

    // Celular com 9 dígitos
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
        texto.includes('not a whatsapp user') ||
        texto.includes('not registered in whatsapp')
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
// ENVIAR CONFIRMAÇÃO AO CLIENTE
// =====================================================

async function enviarConfirmacaoCliente(dados) {

    console.log('');
    console.log(
        '========================================'
    );

    console.log(
        '📨 ENVIO DE CONFIRMAÇÃO AO CLIENTE'
    );

    console.log(
        '========================================'
    );

    const analise =
        analisarTelefone(
            dados.telefone
        );

    if (!analise.valido) {

        console.error(
            `❌ Número inválido: ${dados.telefone}`
        );

        return {
            sucesso: false,
            motivo: 'NUMERO_INVALIDO'
        };

    }

    const numero =
        analise.numero;

    const idDireto =
        analise.idDireto;

    console.log(
        `📱 Número normalizado: ${numero}`
    );

    const whatsappDisponivel =
        await verificarWhatsApp();

    if (!whatsappDisponivel) {

        console.error(
            '❌ WhatsApp está offline.'
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

        `Nossa equipe já foi notificada e entraremos em contato ` +

        `muito em breve para alinhar os próximos detalhes.\n\n` +

        `Agradecemos por escolher a *Lar Forte*! 🏠🛠️`;

    // =================================================
    // TENTATIVA 1
    // BUSCAR O ID DO CONTATO
    // =================================================

    try {

        console.log(
            '🔎 Procurando contato pelo número...'
        );

        const contactId =
            await comTimeout(

                client.getNumberId(
                    numero
                ),

                10000,

                'getNumberId'

            );

        if (contactId?._serialized) {

            console.log(
                '✅ Contato encontrado.'
            );

            console.log(
                '🆔 ID:',
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
                `✅ Mensagem enviada para ${dados.nome}`
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

    // =================================================
    // TENTATIVA 2
    // ENVIAR DIRETAMENTE PARA O NÚMERO
    // =================================================

    try {

        console.log(
            `📤 Tentando envio direto para ${idDireto}`
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
            `✅ Mensagem enviada diretamente para ${dados.nome}`
        );

        return {

            sucesso: true,

            motivo: 'ENVIADO',

            metodo: 'NUMERO_DIRETO'

        };

    } catch (erro) {

        const tipoErro =
            classificarErroWhatsApp(
                erro
            );

        console.error(
            `❌ Erro no envio [${tipoErro}]:`,
            erro?.message || erro
        );

        // Aviso especial para LID
        if (tipoErro === 'LID_ERROR') {

            try {

                if (
                    await verificarWhatsApp()
                ) {

                    await client.sendMessage(

                        ID_GRUPO_FUNCIONARIOS,

                        `⚠️ *FALHA NO ENVIO DO PV*\n\n` +

                        `Cliente: *${dados.nome || 'Não informado'}*\n` +

                        `📱 Número: ${dados.telefone || 'Não informado'}\n` +

                        `🛠️ Serviço: ${dados.servicoEspecifico || 'Não informado'}\n\n` +

                        `O pedido foi recebido, mas o WhatsApp não conseguiu resolver o LID do contato.`

                    );

                }

            } catch (erroAviso) {

                console.error(
                    '⚠️ Não foi possível avisar o grupo:',
                    erroAviso?.message || erroAviso
                );

            }

        }

        return {

            sucesso: false,

            motivo: tipoErro

        };

    }

}


// =====================================================
// EVENTO QR CODE
// =====================================================

client.on('qr', async (qr) => {

    try {

        whatsappPronto = false;

        // Guarda texto do QR
        qrAtual = qr;

        // Guarda data
        qrGeradoEm =
            new Date().toISOString();

        console.log('');
        console.log(
            '========================================'
        );

        console.log(
            '📱 NOVO QR CODE DO WHATSAPP GERADO'
        );

        console.log(
            '========================================'
        );

        // Gera PNG verdadeiro
        qrImagem =
            await QRCode.toBuffer(
                qr,
                {
                    type: 'png',

                    width: 500,

                    margin: 2,

                    errorCorrectionLevel: 'M'
                }
            );

        console.log(
            '✅ QR Code convertido para imagem PNG.'
        );

        console.log('');
        console.log(
            '🌐 Abra no navegador:'
        );

        console.log(
            '/qrcode'
        );

        console.log('');
        console.log(
            '📱 Escaneie o QR usando o WhatsApp da empresa.'
        );

        console.log(
            '========================================'
        );

        console.log('');

    } catch (erro) {

        console.error(
            '❌ Erro ao gerar imagem do QR Code:',
            erro?.message || erro
        );

    }

});


// =====================================================
// WHATSAPP AUTENTICADO
// =====================================================

client.on('authenticated', () => {

    console.log(
        '🔐 WhatsApp autenticado com sucesso.'
    );

});


// =====================================================
// WHATSAPP PRONTO
// =====================================================

client.on('ready', () => {

    whatsappPronto = true;

    whatsappInicializando = false;

    // QR não é mais necessário
    qrAtual = null;
    qrImagem = null;
    qrGeradoEm = null;

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
// FALHA DE AUTENTICAÇÃO
// =====================================================

client.on('auth_failure', (msg) => {

    whatsappPronto = false;

    whatsappInicializando = false;

    console.error(
        '❌ Falha na autenticação do WhatsApp:',
        msg
    );

});


// =====================================================
// DESCONECTADO
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
        erro?.stack ||
        erro?.message ||
        erro
    );

});


// =====================================================
// BOT DE RESPOSTA AUTOMÁTICA
// =====================================================

const controleSaudacao =
    new Map();

const tempoDeInicio =
    Math.floor(Date.now() / 1000);


client.on('message', async (msg) => {

    try {

        // Ignora mensagens antigas
        if (
            msg.timestamp < tempoDeInicio
        ) {
            return;
        }

        // Ignora grupos
        if (
            msg.from.includes('@g.us')
        ) {
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

        // Cliente quer falar com equipe
        if (texto === '1') {

            await delay(2000);

            await msg.reply(

                '✅ *Certo!* Um de nossos profissionais ' +

                'já vai falar com você. ' +

                'Por favor, aguarde um instante.'

            );

            return;

        }

        const ultimaMensagem =
            controleSaudacao.get(
                remetente
            );

        const agora =
            Date.now();

        const tempoLimite =
            2 * 60 * 60 * 1000;

        // Evita repetir saudação
        if (
            !ultimaMensagem ||
            agora - ultimaMensagem > tempoLimite
        ) {

            await delay(2000);

            const linkSite =
                'https://larforte.onrender.com/atendimento';

            const saudacao =

                'Olá! Tudo bem? 👋\n\n' +

                'Somos a *Lar Forte*, especialistas em soluções ' +

                'e manutenção para sua casa.\n\n' +

                'Para agilizar seu orçamento, acesse nosso site:\n' +

                `👉 ${linkSite}\n\n` +

                'Ou, se preferir falar com nossa equipe agora, ' +

                '*digite 1*.';

            await msg.reply(
                saudacao
            );

            controleSaudacao.set(
                remetente,
                agora
            );

        }

    } catch (erro) {

        console.error(
            '❌ Erro no processamento do bot:',
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
            // SALVAR CSV
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
            // RESPONDE IMEDIATAMENTE AO FRONTEND
            // =============================================

            res.status(200).json({

                sucesso: true,

                mensagem:
                    'Pedido registrado com sucesso!',

                whatsapp:
                    whatsappPronto

            });

            // =============================================
            // PROCESSAMENTO WHATSAPP EM BACKGROUND
            // =============================================

            setImmediate(async () => {

                try {

                    const whatsappDisponivel =
                        await verificarWhatsApp();

                    if (whatsappDisponivel) {

                        const relatorio =

                            '🚨 *NOVO CHAMADO VIA SITE* 🚨\n\n' +

                            `👤 *Cliente:* ${dados.nome || 'Não informado'}\n` +

                            `📱 *Contato:* ${dados.telefone || 'Não informado'}\n` +

                            `📍 *Endereço:* ${dados.endereco || 'Não informado'}\n\n` +

                            '🛠️ *DETALHES DO PEDIDO*\n' +

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

                            'envio relatório grupo'

                        );

                        console.log(
                            '✅ Relatório enviado ao grupo.'
                        );

                        // =====================================
                        // ENVIO DE FOTO
                        // =====================================

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

                                            `📸 Foto enviada pelo cliente *${dados.nome || 'Não informado'}*`

                                    }

                                ),

                                30000,

                                'envio de mídia'

                            );

                            console.log(
                                '✅ Foto enviada ao grupo.'
                            );

                        }

                    } else {

                        console.log(
                            '⚠️ Pedido salvo, mas WhatsApp está offline.'
                        );

                    }

                    // =========================================
                    // CONFIRMAÇÃO PARA CLIENTE
                    // =========================================

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
// API DO QR CODE - PNG
// =====================================================

app.get('/api/qrcode', (req, res) => {

    // Impede cache
    res.set({

        'Cache-Control':
            'no-store, no-cache, must-revalidate, max-age=0',

        'Pragma':
            'no-cache',

        'Expires':
            '0'

    });

    if (!qrImagem) {

        return res.status(503).json({

            sucesso: false,

            mensagem:
                'QR Code ainda não foi gerado. Aguarde alguns segundos.'

        });

    }

    res.set(
        'Content-Type',
        'image/png'
    );

    return res.send(
        qrImagem
    );

});


// =====================================================
// PÁGINA DO QR CODE
// =====================================================

app.get('/qrcode', (req, res) => {

    res.set(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, max-age=0'
    );

    res.send(`

<!DOCTYPE html>

<html lang="pt-BR">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>Lar Forte - Conectar WhatsApp</title>

    <style>

        * {
            box-sizing: border-box;
        }

        body {

            margin: 0;

            min-height: 100vh;

            display: flex;

            align-items: center;

            justify-content: center;

            font-family: Arial, sans-serif;

            background: #111;

            color: white;

        }

        .container {

            width: 100%;

            max-width: 600px;

            padding: 30px;

            text-align: center;

        }

        h1 {

            margin-bottom: 10px;

        }

        p {

            color: #bbb;

        }

        #qr {

            width: min(90vw, 500px);

            height: auto;

            background: white;

            padding: 12px;

            border-radius: 10px;

            margin-top: 25px;

        }

        #status {

            margin-top: 20px;

            color: #aaa;

        }

    </style>

</head>

<body>

    <div class="container">

        <h1>📱 Conectar WhatsApp</h1>

        <p>
            Abra o WhatsApp da empresa e escaneie o QR Code abaixo.
        </p>

        <img
            id="qr"
            src="/api/qrcode?${Date.now()}"
            alt="QR Code do WhatsApp"
        >

        <div id="status">
            Carregando QR Code...
        </div>

    </div>

    <script>

        const qr =
            document.getElementById('qr');

        const status =
            document.getElementById('status');


        async function atualizarStatus() {

            try {

                const resposta =
                    await fetch(
                        '/api/status?ts=' + Date.now()
                    );

                const dados =
                    await resposta.json();

                if (dados.whatsapp) {

                    status.textContent =
                        '✅ WhatsApp conectado com sucesso!';

                    qr.style.display =
                        'none';

                    return;

                }

                if (dados.qrPendente) {

                    status.textContent =
                        '📱 QR Code pronto. Escaneie com o WhatsApp.';

                } else {

                    status.textContent =
                        '⏳ Aguardando geração do QR Code...';

                }

            } catch {

                status.textContent =
                    '⚠️ Aguardando conexão com o servidor...';

            }

        }


        function atualizarImagem() {

            qr.src =
                '/api/qrcode?ts=' +
                Date.now();

        }


        setInterval(
            atualizarStatus,
            3000
        );


        setInterval(
            atualizarImagem,
            15000
        );


        atualizarStatus();

    </script>

</body>

</html>

    `);

});


// =====================================================
// API STATUS
// =====================================================

app.get('/api/status', async (req, res) => {

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

        qrPendente:
            Boolean(qrImagem),

        qrGeradoEm:
            qrGeradoEm,

        memoria: {

            rss:
                Math.round(
                    memoria.rss / 1024 / 1024
                ) + ' MB',

            heap:
                Math.round(
                    memoria.heapUsed / 1024 / 1024
                ) + ' MB'

        },

        data:
            new Date().toISOString()

    });

});


// =====================================================
// HEALTH CHECK
// =====================================================

app.get('/health', (req, res) => {

    res.status(200).json({

        status:
            'ok',

        whatsapp:
            whatsappPronto

    });

});


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
// INICIALIZAR WHATSAPP
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
    console.log(
        '⏳ Inicializando WhatsApp...'
    );

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
// INICIAR SERVIDOR
// =====================================================

app.listen(
    PORT,
    '0.0.0.0',

    () => {

        console.log(
            `🚀 Servidor Lar Forte rodando na porta ${PORT}`
        );

        iniciarWhatsApp();

    }
);
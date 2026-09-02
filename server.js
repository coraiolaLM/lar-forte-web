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

app.use(express.json({ limit: '50mb' }));

app.use(
    express.urlencoded({
        limit: '50mb',
        extended: true
    })
);

// ============================================
// CORS
// ============================================

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://larforte.onrender.com',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
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
        ],

        credentials: true
    })
);

// ============================================
// RATE LIMIT
// ============================================

const limitador = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        erro: 'Muitas solicitações. Tente novamente mais tarde.'
    }
});

// ============================================
// WHATSAPP / CHROME
// ============================================

console.log('🚀 Iniciando cliente do WhatsApp...');

let chromePath;

try {
    chromePath =
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        puppeteer.executablePath();

    console.log('🌐 Chrome configurado em:', chromePath);

    if (!chromePath) {
        console.error('❌ Caminho do Chrome não foi encontrado.');
    } else if (!fs.existsSync(chromePath)) {
        console.error(
            '❌ ARQUIVO DO CHROME NÃO EXISTE:',
            chromePath
        );
    } else {
        console.log('✅ Arquivo do Chrome encontrado!');
    }
} catch (erroChrome) {
    console.error(
        '❌ Erro ao localizar Chrome:',
        erroChrome?.message || erroChrome
    );
}

// ============================================
// AUTENTICAÇÃO WHATSAPP
// ============================================

const authPath = path.join(
    __dirname,
    '.wwebjs_auth'
);

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'lar-forte',
        dataPath: authPath
    }),

    puppeteer: {
        headless: true,

        ...(chromePath
            ? {
                executablePath: chromePath
            }
            : {}),

        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--disable-software-rasterizer'
        ]
    }
});

const ID_GRUPO_FUNCIONARIOS =
    '120363409125356830@g.us';

let whatsappPronto = false;
let whatsappInicializando = false;

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

const delay = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

async function comTimeout(
    promise,
    tempoMs,
    nomeOperacao = 'operação'
) {
    let timeoutId;

    const timeoutPromise = new Promise(
        (_, reject) => {
            timeoutId = setTimeout(() => {
                reject(
                    new Error(
                        `Tempo limite excedido em ${nomeOperacao} (${tempoMs}ms)`
                    )
                );
            }, tempoMs);
        }
    );

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
            '⚠️ Não foi possível confirmar o estado do WhatsApp:',
            error?.message || error
        );

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

    let numero = String(telefone).replace(/\D/g, '');

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

    const ddd = numero.substring(2, 4);
    const dddNumero = Number(ddd);

    if (
        Number.isNaN(dddNumero) ||
        dddNumero < 11 ||
        dddNumero > 99
    ) {
        return {
            valido: false,
            motivo: 'NUMERO_INVALIDO',
            numero
        };
    }

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
        texto.includes('not a whatsapp user') ||
        texto.includes('not registered in whatsapp')
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

// ============================================
// ENVIO DE CONFIRMAÇÃO AO CLIENTE
// ============================================

async function enviarConfirmacaoCliente(dados) {
    console.log('');
    console.log('============================================');
    console.log('📨 ENVIO DE CONFIRMAÇÃO AO CLIENTE');
    console.log('============================================');

    const analiseTelefone =
        analisarTelefone(dados.telefone);

    if (!analiseTelefone.valido) {
        console.error(
            `❌ ${dados.telefone} foi classificado como NUMERO_INVALIDO.`
        );

        return {
            sucesso: false,
            motivo: 'NUMERO_INVALIDO'
        };
    }

    const numero = analiseTelefone.numero;
    const idDireto = analiseTelefone.idDireto;

    console.log(`📱 Número recebido: ${dados.telefone}`);
    console.log(`📱 Número normalizado: ${numero}`);
    console.log(`🆔 ID direto: ${idDireto}`);

    const whatsappDisponivel =
        await verificarWhatsApp();

    if (!whatsappDisponivel) {
        console.error('❌ WhatsApp está offline.');

        return {
            sucesso: false,
            motivo: 'WHATSAPP_OFFLINE'
        };
    }

    const mensagemCliente =
        `Olá, *${dados.nome || 'cliente'}*! 👋\n\n` +
        `Recebemos com sucesso o seu pedido de orçamento ` +
        `para o serviço de *${dados.servicoEspecifico || 'solicitado'}*.\n\n` +
        `Nossa equipe já foi notificada e entraremos em contato ` +
        `muito em breve para agendar uma visita ou alinhar ` +
        `os próximos detalhes.\n\n` +
        `Agradecemos por escolher a *Lar Forte*! 🏠🛠️`;

    let contactId = null;

    try {
        console.log(
            '🔎 Tentativa 1: procurando contato pelo número...'
        );

        contactId = await comTimeout(
            client.getNumberId(numero),
            10000,
            'client.getNumberId()'
        );

        if (contactId) {
            console.log(
                '✅ WhatsApp encontrou o contato.'
            );

            console.log(
                '🆔 Contact ID:',
                contactId._serialized
            );
        } else {
            console.log(
                '⚠️ getNumberId não encontrou o contato.'
            );
        }
    } catch (erroGetId) {
        const tipoErro =
            classificarErroWhatsApp(erroGetId);

        console.error(
            `⚠️ getNumberId falhou [${tipoErro}]:`,
            erroGetId?.message || erroGetId
        );
    }

    if (contactId?._serialized) {
        try {
            console.log(
                '📤 Tentativa 2: enviando usando Contact ID...'
            );

            await comTimeout(
                client.sendMessage(
                    contactId._serialized,
                    mensagemCliente
                ),
                15000,
                'sendMessage(Contact ID)'
            );

            console.log(
                `✅ MENSAGEM ENVIADA PARA ${dados.nome} (${numero})`
            );

            return {
                sucesso: true,
                motivo: 'ENVIADO',
                metodo: 'CONTACT_ID'
            };
        } catch (erroEnvioId) {
            console.error(
                '❌ Falha enviando pelo Contact ID:',
                erroEnvioId?.message || erroEnvioId
            );
        }
    }

    try {
        console.log(
            '📤 Tentativa 3: enviando diretamente para:',
            idDireto
        );

        await comTimeout(
            client.sendMessage(
                idDireto,
                mensagemCliente
            ),
            15000,
            'sendMessage(numero@c.us)'
        );

        console.log(
            `✅ MENSAGEM ENVIADA POR NÚMERO PARA ${dados.nome}`
        );

        return {
            sucesso: true,
            motivo: 'ENVIADO',
            metodo: 'NUMERO_DIRETO'
        };
    } catch (erroEnvioDireto) {
        const tipoErro =
            classificarErroWhatsApp(erroEnvioDireto);

        console.error(
            `❌ Falha no envio direto [${tipoErro}]:`,
            erroEnvioDireto?.message || erroEnvioDireto
        );

        return {
            sucesso: false,
            motivo: tipoErro,
            erro:
                erroEnvioDireto?.message ||
                String(erroEnvioDireto)
        };
    }
}

// ============================================
// EVENTOS DO WHATSAPP
// ============================================

client.on('qr', (qr) => {
    whatsappPronto = false;

    console.log('');
    console.log('============================================');
    console.log('📱 NOVO QR CODE GERADO');
    console.log('============================================');

    qrcode.generate(qr, {
        small: true
    });

    console.log(
        '\n📱 Escaneie o QR Code com o WhatsApp da empresa!\n'
    );
});

client.on('ready', () => {
    whatsappPronto = true;
    whatsappInicializando = false;

    console.log(
        '============================================'
    );

    console.log(
        '✅ Bot do WhatsApp conectado e pronto para enviar mensagens!'
    );

    console.log(
        '============================================'
    );
});

client.on('authenticated', () => {
    console.log('🔐 WhatsApp autenticado com sucesso.');
});

client.on('auth_failure', (msg) => {
    whatsappPronto = false;
    whatsappInicializando = false;

    console.error(
        '❌ Falha na autenticação do WhatsApp:',
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
// PROTEÇÃO CONTRA ERROS
// ============================================

process.on('uncaughtException', (err) => {
    console.error(
        '⚠️ Erro crítico:',
        err?.stack || err?.message || err
    );
});

process.on('unhandledRejection', (reason) => {
    console.error(
        '⚠️ Promessa rejeitada:',
        reason
    );
});

// ============================================
// BOT DE RESPOSTA AUTOMÁTICA
// ============================================

const controleSaudacao = new Map();

const tempoDeInicio =
    Math.floor(Date.now() / 1000);

client.on('message', async (msg) => {
    try {
        if (msg.timestamp < tempoDeInicio) {
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

        const remetente = msg.from;

        if (texto === '1') {
            await delay(2500);

            await msg.reply(
                '✅ *Certo!* Um de nossos profissionais já vai falar com você. Por favor, aguarde um instante.'
            );

            return;
        }

        const ultimaMensagem =
            controleSaudacao.get(remetente);

        const agora = Date.now();

        const tempoLimite =
            2 * 60 * 60 * 1000;

        if (
            !ultimaMensagem ||
            agora - ultimaMensagem > tempoLimite
        ) {
            const tempoEspera =
                Math.floor(
                    Math.random() * 2000
                ) + 2000;

            await delay(tempoEspera);

            const linkSite =
                'https://larforte.onrender.com/atendimento';

            const saudacao =
                `Olá! Tudo bem? 👋\n\n` +
                `Somos a *Lar Forte*, especialistas em soluções e manutenção para sua casa em Curitiba e Região.\n\n` +
                `Para agilizar seu orçamento de forma rápida e prática, acesse nosso site:\n` +
                `👉 ${linkSite}\n\n` +
                `Ou, se preferir falar com a nossa equipe agora, *digite 1*.`;

            await msg.reply(saudacao);

            controleSaudacao.set(
                remetente,
                agora
            );
        }
    } catch (erroGeral) {
        console.error(
            '❌ Erro interno no processamento do bot:',
            erroGeral?.message || erroGeral
        );
    }
});

// ============================================
// API DE ATENDIMENTO
// ============================================

app.post(
    '/api/atendimento',
    limitador,
    async (req, res) => {
        try {
            const dados = req.body || {};

            console.log(
                '📨 Novo atendimento recebido:',
                dados.nome || 'Cliente não identificado'
            );

            // ----------------------------------------
            // SALVAR CSV
            // ----------------------------------------

            const caminhoBanco = path.join(
                __dirname,
                'banco_de_dados.csv'
            );

            const cabecalho =
                !fs.existsSync(caminhoBanco)
                    ? 'Data,Nome,Telefone,Endereço,Categoria,Serviço,Preço,Observações\n'
                    : '';

            const linhaCsv =
                `"${new Date().toLocaleString('pt-BR')}",` +
                `"${String(dados.nome || '').replace(/"/g, '""')}",` +
                `"${String(dados.telefone || '').replace(/"/g, '""')}",` +
                `"${String(dados.endereco || '').replace(/"/g, '""')}",` +
                `"${String(dados.categoria || '').replace(/"/g, '""')}",` +
                `"${String(dados.servicoEspecifico || '').replace(/"/g, '""')}",` +
                `"${String(dados.orcamentoMedio || '').replace(/"/g, '""')}",` +
                `"${String(dados.observacoes || '').replace(/"/g, '""')}"\n`;

            fs.appendFileSync(
                caminhoBanco,
                cabecalho + linhaCsv,
                'utf8'
            );

            // ----------------------------------------
            // RELATÓRIO PARA O GRUPO
            // ----------------------------------------

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

            try {
                const whatsappDisponivel =
                    await verificarWhatsApp();

                if (whatsappDisponivel) {
                    await comTimeout(
                        client.sendMessage(
                            ID_GRUPO_FUNCIONARIOS,
                            relatorio
                        ),
                        15000,
                        'envio relatório grupo'
                    );

                    console.log(
                        '✅ Relatório enviado para o grupo.'
                    );

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
                                        `📸 Foto enviada pelo cliente *${dados.nome || 'Cliente'}*`
                                }
                            ),
                            30000,
                            'envio de mídia grupo'
                        );

                        console.log(
                            '✅ Mídia enviada para o grupo.'
                        );
                    }
                } else {
                    console.log(
                        '⚠️ WhatsApp offline. Pedido salvo, mas relatório não enviado.'
                    );
                }
            } catch (erroGrupo) {
                console.error(
                    '❌ Erro ao enviar relatório para grupo:',
                    erroGrupo?.message || erroGrupo
                );
            }

            // ----------------------------------------
            // RESPONDE AO FRONTEND
            // ----------------------------------------

            res.status(200).json({
                sucesso: true,
                mensagem:
                    'Pedido registrado com sucesso!'
            });

            // ----------------------------------------
            // ENVIA CONFIRMAÇÃO EM BACKGROUND
            // ----------------------------------------

            setImmediate(async () => {
                try {
                    await enviarConfirmacaoCliente(
                        dados
                    );
                } catch (erroBackground) {
                    console.error(
                        '❌ Erro no envio em segundo plano:',
                        erroBackground?.message ||
                        erroBackground
                    );
                }
            });
        } catch (error) {
            console.error(
                '💥 ERRO INESPERADO NA ROTA /api/atendimento:',
                error?.stack ||
                error?.message ||
                error
            );

            if (!res.headersSent) {
                return res.status(500).json({
                    erro:
                        'Falha ao processar o pedido.'
                });
            }
        }
    }
);

// ============================================
// STATUS DA API
// ============================================

app.get(
    '/api/status',
    async (req, res) => {
        let state = 'UNKNOWN';

        try {
            state = await comTimeout(
                client.getState(),
                5000,
                'getState'
            );
        } catch {
            state = 'OFFLINE';
        }

        res.json({
            servidor: 'online',
            whatsapp: whatsappPronto,
            estadoWhatsapp: state,
            chrome: chromePath || null,
            data: new Date().toISOString()
        });
    }
);

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        whatsapp: whatsappPronto
    });
});

// ============================================
// FRONTEND REACT / VITE
// ============================================

const distPath =
    path.join(__dirname, 'dist');

app.use(express.static(distPath));

app.get(
    /^\/(?!api\/|health$).*/,
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
// INICIALIZAÇÃO DO WHATSAPP
// ============================================

async function iniciarWhatsApp() {
    if (whatsappInicializando) {
        console.log(
            '⚠️ WhatsApp já está sendo inicializado.'
        );

        return;
    }

    whatsappInicializando = true;

    try {
        console.log(
            '🚀 Inicializando conexão com WhatsApp...'
        );

        await client.initialize();
    } catch (erro) {
        whatsappInicializando = false;

        console.error(
            '❌ Erro ao inicializar WhatsApp:',
            erro?.stack ||
            erro?.message ||
            erro
        );
    }
}

// ============================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================

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
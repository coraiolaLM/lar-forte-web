import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import wwebjs from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const { Client, LocalAuth, MessageMedia } = wwebjs;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', process.env.FRONTEND_URL].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        console.log(`⚠️ Origem bloqueada pelo CORS: ${origin}`);
        callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.options(/.*/, cors());

const limitador = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: 'Muitas solicitações. Tente novamente mais tarde.' }
});

console.log('🚀 Iniciando cliente do WhatsApp...');

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'lar-forte'
    }),

    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ]
    }
});

const ID_GRUPO_FUNCIONARIOS = '120363409125356830@g.us';
let whatsappPronto = false;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function comTimeout(promise, tempoMs, nomeOperacao = 'operação') {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Tempo limite excedido em ${nomeOperacao} (${tempoMs}ms)`)), tempoMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        clearTimeout(timeoutId);
    }
}

async function verificarWhatsApp() {
    if (!whatsappPronto) return false;

    try {
        const state = await comTimeout(client.getState(), 8000, 'client.getState()');
        return state === 'CONNECTED';
    } catch (error) {
        console.error('⚠️ Não foi possível confirmar o estado do WhatsApp:', error.message || error);
        return false;
    }
}

function analisarTelefone(telefone) {
    if (!telefone) {
        return { valido: false, motivo: 'NUMERO_INVALIDO', numero: null };
    }

    let numero = String(telefone).replace(/\D/g, '');

    if (numero.startsWith('00')) {
        numero = numero.substring(2);
    }

    if (!numero.startsWith('55')) {
        numero = `55${numero}`;
    }

    if (numero.length !== 12 && numero.length !== 13) {
        return { valido: false, motivo: 'NUMERO_INVALIDO', numero };
    }

    const ddd = numero.substring(2, 4);
    const dddNumero = Number(ddd);

    if (Number.isNaN(dddNumero) || dddNumero < 11 || dddNumero > 99) {
        return { valido: false, motivo: 'NUMERO_INVALIDO', numero };
    }

    if (numero.length === 13) {
        const celular = numero.substring(4);
        if (!celular.startsWith('9')) {
            return { valido: false, motivo: 'NUMERO_INVALIDO', numero };
        }
    }

    return { valido: true, motivo: 'VALIDO', numero, idDireto: `${numero}@c.us` };
}

function classificarErroWhatsApp(error) {
    const texto = String(error?.message || error || '').toLowerCase();

    if (texto.includes('no lid for user') || texto.includes('lid')) {
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

async function enviarConfirmacaoCliente(dados) {
    console.log('');
    console.log('============================================');
    console.log('📨 ENVIO DE CONFIRMAÇÃO AO CLIENTE');
    console.log('============================================');

    const analiseTelefone = analisarTelefone(dados.telefone);

    if (!analiseTelefone.valido) {
        console.error(`❌ ${dados.telefone} foi classificado como NUMERO_INVALIDO.`);
        return { sucesso: false, motivo: 'NUMERO_INVALIDO' };
    }

    const numero = analiseTelefone.numero;
    const idDireto = analiseTelefone.idDireto;

    console.log(`📱 Número recebido: ${dados.telefone}`);
    console.log(`📱 Número normalizado: ${numero}`);
    console.log(`🆔 ID direto: ${idDireto}`);

    const whatsappDisponivel = await verificarWhatsApp();

    if (!whatsappDisponivel) {
        console.error('❌ WhatsApp está offline.');
        return { sucesso: false, motivo: 'WHATSAPP_OFFLINE' };
    }

    const mensagemCliente =
        `Olá, *${dados.nome}*! 👋\n\n` +
        `Recebemos com sucesso o seu pedido de orçamento ` +
        `para o serviço de *${dados.servicoEspecifico}*.\n\n` +
        `Nossa equipe já foi notificada e entraremos em contato ` +
        `muito em breve para agendar uma visita ou alinhar ` +
        `os próximos detalhes.\n\n` +
        `Agradecemos por escolher a *Lar Forte*! 🏠🛠️`;

    let contactId = null;

    try {
        console.log('🔎 Tentativa 1: procurando contato pelo número...');
        contactId = await comTimeout(client.getNumberId(numero), 10000, 'client.getNumberId()');

        if (contactId) {
            console.log('✅ WhatsApp encontrou o contato.');
            console.log('🆔 Contact ID:', contactId._serialized);
            console.log('👤 User:', contactId.user);
            console.log('🌐 Server:', contactId.server);
        } else {
            console.log('⚠️ getNumberId não encontrou o contato.');
        }
    } catch (erroGetId) {
        const tipoErro = classificarErroWhatsApp(erroGetId);
        console.error(`⚠️ getNumberId falhou [${tipoErro}]:`, erroGetId?.message || erroGetId);
    }

    if (contactId?._serialized) {
        try {
            console.log('📤 Tentativa 2: enviando usando contactId._serialized...');
            await comTimeout(client.sendMessage(contactId._serialized, mensagemCliente), 15000, 'sendMessage(contactId._serialized)');
            console.log(`✅ MENSAGEM ENVIADA PARA ${dados.nome} (${numero})`);
            return { sucesso: true, motivo: 'ENVIADO', metodo: 'CONTACT_ID' };
        } catch (erroEnvioId) {
            const tipoErro = classificarErroWhatsApp(erroEnvioId);
            console.error(`❌ Falha enviando pelo contactId [${tipoErro}]:`, erroEnvioId?.message || erroEnvioId);
        }
    }

    try {
        console.log('📤 Tentativa 3: enviando diretamente para:', idDireto);
        await comTimeout(client.sendMessage(idDireto, mensagemCliente), 15000, 'sendMessage(numero@c.us)');
        console.log(`✅ MENSAGEM ENVIADA POR NÚERO PARA ${dados.nome} (${numero})`);
        return { sucesso: true, motivo: 'ENVIADO', metodo: 'NUMERO_DIRETO' };
    } catch (erroEnvioDireto) {
        const tipoErro = classificarErroWhatsApp(erroEnvioDireto);
        console.error(`❌ Falha no envio direto [${tipoErro}]:`, erroEnvioDireto?.message || erroEnvioDireto);

        if (tipoErro === 'LID_ERROR') {
            console.error('');
            console.error('⚠️ O NÚERO É VÁLIDO, MAS O WHATSAPP NÃO CONSEGUIU RESOLVER O LID.');
            console.error(`⚠️ Cliente: ${dados.nome}`);
            console.error(`⚠️ Número: ${numero}`);
            console.error('');

            try {
                await comTimeout(
                    client.sendMessage(
                        ID_GRUPO_FUNCIONARIOS,
                        `⚠️ *FALHA NO ENVIO DO PV*\n\n` +
                        `O pedido de *${dados.nome}* foi recebido normalmente, ` +
                        `porém o WhatsApp não conseguiu resolver o identificador ` +
                        `interno (LID) desse contato.\n\n` +
                        `📱 Número: ${dados.telefone}\n` +
                        `🛠️ Serviço: ${dados.servicoEspecifico}\n\n` +
                        `⚠️ *O número NÃO foi classificado como inválido.*`
                    ),
                    10000,
                    'aviso LID no grupo'
                );
            } catch (erroAviso) {
                console.error('⚠️ Não foi possível enviar aviso de LID ao grupo:', erroAviso?.message || erroAviso);
            }

            return { sucesso: false, motivo: 'LID_ERROR' };
        }

        if (tipoErro === 'NUMERO_NAO_ENCONTRADO') {
            console.error(`⚠️ Número ${numero} não possui WhatsApp ou não pôde ser localizado.`);

            try {
                await comTimeout(
                    client.sendMessage(
                        ID_GRUPO_FUNCIONARIOS,
                        `⚠️ *WHATSAPP NÃO LOCALIZADO*\n\n` +
                        `Cliente: *${dados.nome}*\n` +
                        `Telefone: ${dados.telefone}\n` +
                        `Serviço: ${dados.servicoEspecifico}\n\n` +
                        `O número foi validado, mas não foi localizado como usuário WhatsApp.`
                    ),
                    10000,
                    'aviso número não encontrado'
                );
            } catch (erroAviso) {
                console.error('⚠️ Falha ao enviar aviso ao grupo:', erroAviso?.message || erroAviso);
            }

            return { sucesso: false, motivo: 'NUMERO_NAO_ENCONTRADO' };
        }

        if (tipoErro === 'WHATSAPP_OFFLINE') {
            console.error('❌ WhatsApp ficou indisponível durante o envio.');
            return { sucesso: false, motivo: 'WHATSAPP_OFFLINE' };
        }

        console.error(`❌ Erro de envio não classificado para ${numero}.`);
        return { sucesso: false, motivo: 'ERRO_ENVIO', erro: erroEnvioDireto?.message || String(erroEnvioDireto) };
    }
}

client.on('qr', (qr) => {
    whatsappPronto = false;
    qrcode.generate(qr, { small: true });
    console.log('\n--> Escaneie o QR Code com o WhatsApp da empresa!\n');
});

client.on('ready', () => {
    whatsappPronto = true;
    console.log('Bot do WhatsApp conectado e pronto para enviar mensagens!');
});

client.on('authenticated', () => console.log('🔐 WhatsApp autenticado.'));
client.on('auth_failure', (msg) => {
    whatsappPronto = false;
    console.error('❌ Falha na autenticação do WhatsApp:', msg);
});
client.on('disconnected', (reason) => {
    whatsappPronto = false;
    console.error('⚠️ WhatsApp desconectado:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('⚠️ Erro Crítico ignorado para manter o servidor online:', err.message || err);
});
process.on('unhandledRejection', (reason) => {
    console.error('⚠️ Promessa rejeitada ignorada:', reason);
});

const controleSaudacao = new Map();
const tempoDeInicio = Math.floor(Date.now() / 1000);

client.on('message', async msg => {
    try {
        if (msg.timestamp < tempoDeInicio) return;
        if (msg.from.includes('@g.us') || msg.from === 'status@broadcast' || msg.fromMe) return;

        const texto = (msg.body || '').toLowerCase().trim();
        const remetente = msg.from;

        if (texto === '1') {
            await delay(2500);
            await msg.reply('✅ *Certo!* Um de nossos profissionais já vai falar com você. Por favor, aguarde um instante.');
            return;
        }

        const ultimaMensagem = controleSaudacao.get(remetente);
        const agora = Date.now();
        const tempoLimite = 2 * 60 * 60 * 1000;

        if (!ultimaMensagem || (agora - ultimaMensagem > tempoLimite)) {
            const tempoEspera = Math.floor(Math.random() * (4000 - 2000 + 1)) + 2000;
            await delay(tempoEspera);
            const linkSite = 'https://larforte.onrender.com/atendimento';
            const saudacao = `Olá! Tudo bem? 👋\n\nSomos a *Lar Forte*, especialistas em soluções e manutenção para sua casa em Curitiba e Região.\n\nPara agilizar seu orçamento de forma rápida e prática, acesse nosso site:\n👉 ${linkSite}\n\nOu, se preferir falar com a nossa equipe agora, *digite 1*.`;
            await msg.reply(saudacao);
            controleSaudacao.set(remetente, agora);
        }
    } catch (erroGeral) {
        console.error('❌ Erro interno no processamento do bot:', erroGeral?.message || erroGeral);
    }
});

app.post('/api/atendimento', limitador, async (req, res) => {
    try {
        const dados = req.body || {};

        const cabecalho = !fs.existsSync('banco_de_dados.csv') ? 'Data,Nome,Telefone,Endereço,Categoria,Serviço,Preço,Observações\n' : '';
        const linhaCsv = `"${new Date().toLocaleString('pt-BR')}","${String(dados.nome || '').replace(/"/g, '""')}","${String(dados.telefone || '').replace(/"/g, '""')}","${String(dados.endereco || '').replace(/"/g, '""')}","${String(dados.categoria || '').replace(/"/g, '""')}","${String(dados.servicoEspecifico || '').replace(/"/g, '""')}","${String(dados.orcamentoMedio || '').replace(/"/g, '""')}","${String(dados.observacoes || '').replace(/"/g, '""')}"\n`;
        fs.appendFileSync('banco_de_dados.csv', cabecalho + linhaCsv, 'utf8');

        const relatorio = `🚨 *NOVO CHAMADO VIA SITE* 🚨\n\n` +
            `👤 *Cliente:* ${dados.nome || 'Não informado'}\n` +
            `📱 *Contato:* ${dados.telefone || 'Não informado'}\n` +
            `📍 *Endereço:* ${dados.endereco || 'Não informado'}\n\n` +
            `🛠️ *Detalhes do Pedido*\n` +
            `*Categoria:* ${dados.categoria || 'Não informado'}\n` +
            `*Serviço:* ${dados.servicoEspecifico || 'Não informado'}\n` +
            `*Previsão:* ${dados.orcamentoMedio || 'Não informado'}\n\n` +
            `📌 *Observações:* ${dados.observacoes || 'Nenhuma'}`;

        try {
            const whatsappDisponivel = await verificarWhatsApp();
            if (whatsappDisponivel) {
                await comTimeout(client.sendMessage(ID_GRUPO_FUNCIONARIOS, relatorio), 15000, 'envio relatório grupo');
                if (dados.enviouMidia === 'Sim' && dados.arquivoPreview) {
                    const base64Data = String(dados.arquivoPreview).split(';base64,').pop();
                    const media = new MessageMedia(dados.mimetype || 'image/jpeg', base64Data, dados.filename || 'arquivo.jpg');
                    await comTimeout(client.sendMessage(ID_GRUPO_FUNCIONARIOS, media, { caption: `📸 Foto enviada pelo cliente *${dados.nome}*` }), 30000, 'envio de mídia grupo');
                }
            }
        } catch (erroGrupo) {
            console.error('❌ Erro ao enviar relatório para grupo:', erroGrupo?.message || erroGrupo);
        }

        res.status(200).json({ sucesso: true, mensagem: 'Pedido registrado com sucesso!' });

        setImmediate(async () => {
            try {
                await enviarConfirmacaoCliente(dados);
            } catch (erroBackground) {
                console.error('❌ Erro no envio em segundo plano:', erroBackground?.message || erroBackground);
            }
        });
    } catch (error) {
        console.error('💥 ERRO INESPERADO NA ROTA /api/atendimento:', error?.stack || error?.message || error);
        if (!res.headersSent) {
            return res.status(500).json({ erro: 'Falha ao processar o pedido.' });
        }
    }
});

app.get('/api/status', async (req, res) => {
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
        data: new Date().toISOString()
    });
});

/* ============================================
   FRONTEND REACT / VITE
============================================ */

const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));

app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

/* ============================================
   INICIALIZAÇÃO DO WHATSAPP
============================================ */

client.initialize();

/* ============================================
   INICIALIZAÇÃO DO SERVIDOR
============================================ */

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Lar Forte rodando na porta ${PORT}`);
});
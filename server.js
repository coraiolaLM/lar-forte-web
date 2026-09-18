import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import P from 'pino';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = Number(process.env.PORT) || 3000;

const API_BASE_URL =
    process.env.VITE_API_URL ||
    'http://localhost:3000';

const FRONTEND_URL =
    process.env.VITE_SITE_URL ||
    'http://localhost:5173';

const WHATSAPP_GROUP_ID =
    process.env.WHATSAPP_GROUP_ID ||
    '120363409125356830@g.us';

const NOME_GRUPO_CHAMADOS = 'CHAMADOS';

const TEMPO_TRAVA_MS = 18 * 60 * 60 * 1000;
const DELAY_MIN_MS = 4000;
const DELAY_MAX_MS = 8000;
const DIGITANDO_MIN_MS = 2000;
const DIGITANDO_MAX_MS = 4000;

let sock = null;
let currentQRDataURL = null;
let isConnected = false;
let idGrupoChamados = null;
let filaEnviosWhatsApp = Promise.resolve();

const cooldownsAutoResposta = new Map();

const uploadsDir = path.join(
    __dirname,
    'uploads'
);

const AUTH_DIR = process.env.AUTH_DIR
    ? path.resolve(process.env.AUTH_DIR)
    : path.join(
        __dirname,
        'auth_larforte'
    );

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(
        uploadsDir,
        {
            recursive: true
        }
    );
}

if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(
        AUTH_DIR,
        {
            recursive: true
        }
    );
}

app.use(cors());

app.use(
    express.json({
        limit: '2mb'
    })
);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(
            null,
            uploadsDir
        );
    },

    filename: (req, file, cb) => {
        const nomeSeguro =
            file.originalname.replace(
                /[^a-zA-Z0-9._-]/g,
                '_'
            );

        cb(
            null,
            `${Date.now()}-${Math.random()
                .toString(36)
                .substring(2)}-${nomeSeguro}`
        );
    }
});

const upload = multer({
    storage,

    limits: {
        fileSize:
            100 * 1024 * 1024
    },

    fileFilter: (
        req,
        file,
        cb
    ) => {
        const tiposPermitidos = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'video/mp4',
            'video/webm',
            'video/quicktime'
        ];

        if (
            tiposPermitidos.includes(
                file.mimetype
            )
        ) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    'Tipo de arquivo não permitido.'
                )
            );
        }
    }
});

function esperar(ms) {
    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}

function tempoAleatorio(
    min,
    max
) {
    return Math.floor(
        Math.random() *
            (max - min + 1)
    ) + min;
}

function formatarDestino(
    destino
) {
    if (
        String(destino).endsWith(
            '@g.us'
        )
    ) {
        return '📞 CHAMADOS🚨';
    }

    return 'cliente';
}

function adicionarEnvioNaFila(
    funcaoEnvio
) {
    const envio =
        filaEnviosWhatsApp
            .catch(() => {})
            .then(
                async () => {
                    const atraso =
                        tempoAleatorio(
                            DELAY_MIN_MS,
                            DELAY_MAX_MS
                        );

                    console.log(
                        `⏳ Fila: aguardando ${(atraso / 1000).toFixed(
                            1
                        )}s antes do próximo envio...`
                    );

                    await esperar(
                        atraso
                    );

                    return await funcaoEnvio();
                }
            );

    filaEnviosWhatsApp =
        envio.catch(
            () => {}
        );

    return envio;
}

async function enviarMensagemWhatsApp(
    destino,
    mensagem,
    arquivo = null,
    mostrarDigitando = false
) {
    return adicionarEnvioNaFila(
        async () => {
            if (
                !sock ||
                !isConnected
            ) {
                throw new Error(
                    'WhatsApp não está conectado.'
                );
            }

            if (
                mostrarDigitando
            ) {
                try {
                    await sock.presenceSubscribe(
                        destino
                    );

                    await sock.sendPresenceUpdate(
                        'composing',
                        destino
                    );

                    const tempoDigitando =
                        tempoAleatorio(
                            DIGITANDO_MIN_MS,
                            DIGITANDO_MAX_MS
                        );

                    console.log(
                        `⌨️ Digitando por ${(tempoDigitando / 1000).toFixed(
                            1
                        )}s...`
                    );

                    await esperar(
                        tempoDigitando
                    );

                    await sock.sendPresenceUpdate(
                        'paused',
                        destino
                    );
                } catch (
                    erroPresence
                ) {
                    console.log(
                        '⚠️ Não foi possível atualizar o status de digitação:',
                        erroPresence.message
                    );
                }
            }

            if (arquivo) {
                if (
                    !fs.existsSync(
                        arquivo.path
                    )
                ) {
                    throw new Error(
                        'Arquivo temporário não encontrado.'
                    );
                }

                const buffer =
                    fs.readFileSync(
                        arquivo.path
                    );

                if (
                    arquivo.mimetype.startsWith(
                        'image/'
                    )
                ) {
                    await sock.sendMessage(
                        destino,
                        {
                            image: buffer,
                            mimetype:
                                arquivo.mimetype,
                            caption:
                                mensagem
                        }
                    );
                } else if (
                    arquivo.mimetype.startsWith(
                        'video/'
                    )
                ) {
                    await sock.sendMessage(
                        destino,
                        {
                            video: buffer,
                            mimetype:
                                arquivo.mimetype,
                            caption:
                                mensagem
                        }
                    );
                } else {
                    await sock.sendMessage(
                        destino,
                        {
                            text: mensagem
                        }
                    );
                }
            } else {
                await sock.sendMessage(
                    destino,
                    {
                        text: mensagem
                    }
                );
            }

            console.log(
                `✅ Mensagem enviada para ${formatarDestino(
                    destino
                )}.`
            );
        }
    );
}

const mensagemBoasVindas = `Olá! Tudo bem? 👋

Somos a Lar Forte e estamos prontos para ajudar!

Para solicitar um orçamento, acesse:
${FRONTEND_URL}/atendimento

Ou, se preferir falar com nossa equipe agora, digite 1.`;

async function processarMensagemRecebida(
    message
) {
    try {
        if (
            !message?.message ||
            message.key?.fromMe
        ) {
            return;
        }

        const remoteJid =
            message.key?.remoteJid;

        if (
            !remoteJid ||
            remoteJid ===
                'status@broadcast' ||
            remoteJid.endsWith(
                '@g.us'
            )
        ) {
            return;
        }

        let textoRecebido = '';

        if (
            message.message
                .conversation
        ) {
            textoRecebido =
                message.message
                    .conversation;
        } else if (
            message.message
                .extendedTextMessage
                ?.text
        ) {
            textoRecebido =
                message.message
                    .extendedTextMessage
                    .text;
        } else if (
            message.message
                .ephemeralMessage
                ?.message
                ?.conversation
        ) {
            textoRecebido =
                message.message
                    .ephemeralMessage
                    .message
                    .conversation;
        } else if (
            message.message
                .ephemeralMessage
                ?.message
                ?.extendedTextMessage
                ?.text
        ) {
            textoRecebido =
                message.message
                    .ephemeralMessage
                    .message
                    .extendedTextMessage
                    .text;
        }

        textoRecebido =
            String(
                textoRecebido || ''
            ).trim();

        if (
            !textoRecebido
        ) {
            return;
        }

        const numeroFormatado =
            remoteJid.split(
                '@'
            )[0];

        const agora =
            Date.now();

        const ultimoEnvio =
            cooldownsAutoResposta.get(
                numeroFormatado
            );

        if (
            ultimoEnvio &&
            agora -
                ultimoEnvio <
                TEMPO_TRAVA_MS
        ) {
            console.log(
                `⏱️ Resposta automática bloqueada para ${numeroFormatado}.`
            );

            return;
        }

        cooldownsAutoResposta.set(
            numeroFormatado,
            agora
        );

        console.log(
            `📩 Nova mensagem recebida de ${numeroFormatado}.`
        );

        try {
            await enviarMensagemWhatsApp(
                remoteJid,
                mensagemBoasVindas,
                null,
                true
            );

            console.log(
                '🤖 Resposta automática enviada.'
            );
        } catch (erro) {
            cooldownsAutoResposta.delete(
                numeroFormatado
            );

            console.error(
                '❌ Erro ao enviar resposta automática:',
                erro?.message || erro
            );
        }
    } catch (erro) {
        console.error(
            '❌ Erro ao processar mensagem recebida:',
            erro?.message || erro
        );
    }
}

async function descobrirGrupoChamados() {
    try {
        if (
            !sock ||
            !isConnected
        ) {
            return false;
        }

        if (
            WHATSAPP_GROUP_ID
        ) {
            try {
                const grupoConfigurado =
                    await sock.groupMetadata(
                        WHATSAPP_GROUP_ID
                    );

                if (
                    grupoConfigurado?.id
                ) {
                    idGrupoChamados =
                        grupoConfigurado.id;

                    console.log(
                        '📞 CHAMADOS🚨: grupo configurado pelo WHATSAPP_GROUP_ID.'
                    );

                    return true;
                }
            } catch (
                erroGrupoConfigurado
            ) {
                console.log(
                    '⚠️ Não foi possível localizar o grupo pelo WHATSAPP_GROUP_ID. Tentando localizar pelo nome...'
                );
            }
        }

        const grupos =
            await sock.groupFetchAllParticipating();

        const grupoChamados =
            Object.values(
                grupos
            ).find(
                grupo => {
                    const nome =
                        String(
                            grupo.subject ||
                                ''
                        )
                            .trim()
                            .toUpperCase();

                    return nome.startsWith(
                        NOME_GRUPO_CHAMADOS
                    );
                }
            );

        if (
            !grupoChamados
        ) {
            idGrupoChamados =
                null;

            console.log(
                '⚠️ 📞 CHAMADOS🚨: grupo não encontrado.'
            );

            return false;
        }

        idGrupoChamados =
            grupoChamados.id;

        console.log(
            '📞 CHAMADOS🚨: grupo localizado pelo nome e pronto.'
        );

        return true;
    } catch (erro) {
        idGrupoChamados =
            null;

        console.error(
            '❌ Erro ao localizar 📞 CHAMADOS🚨:',
            erro?.message || erro
        );

        return false;
    }
}

async function iniciarWhatsApp() {
    try {
        const {
            state,
            saveCreds
        } =
            await useMultiFileAuthState(
                AUTH_DIR
            );

        console.log(
            `🔐 AUTENTICAÇÃO: ${AUTH_DIR}`
        );

        sock = makeWASocket({
            auth: state,

            logger: P({
                level: 'silent'
            }),

            browser: [
                'Lar Forte Atendimento',
                'Chrome',
                '1.0.0'
            ],

            markOnlineOnConnect:
                false
        });

        sock.ev.on(
            'creds.update',
            saveCreds
        );

        sock.ev.on(
            'connection.update',
            async update => {
                const {
                    connection,
                    lastDisconnect,
                    qr
                } = update;

                if (qr) {
                    try {
                        currentQRDataURL =
                            await QRCode.toDataURL(
                                qr
                            );

                        console.log('');
                        console.log(
                            '📱 QR CODE DISPONÍVEL'
                        );
                        console.log(
                            `🔗 ${API_BASE_URL}/qrcode`
                        );
                        console.log('');
                    } catch (erro) {
                        console.error(
                            '❌ Erro ao gerar QR Code:',
                            erro?.message ||
                                erro
                        );
                    }
                }

                if (
                    connection === 'open'
                ) {
                    isConnected =
                        true;

                    currentQRDataURL =
                        null;

                    console.log('');
                    console.log(
                        '════════════════════════════════════════════════════'
                    );
                    console.log(
                        '              ✅ WHATSAPP CONECTADO'
                    );
                    console.log(
                        '════════════════════════════════════════════════════'
                    );
                    console.log('');

                    await descobrirGrupoChamados();

                    console.log('');
                    console.log(
                        '🤖 WHATSAPP:     ✅ CONECTADO'
                    );

                    console.log(
                        `📞 CHAMADOS🚨:   ${
                            idGrupoChamados
                                ? '✅ CONECTADO'
                                : '❌ NÃO ENCONTRADO'
                        }`
                    );

                    console.log('');

                    console.log(
                        `🔗 QR CODE:      ${API_BASE_URL}/qrcode`
                    );

                    console.log(
                        `❤️  HEALTH:      ${API_BASE_URL}/health`
                    );

                    console.log(
                        `💻 SITE:         ${FRONTEND_URL}`
                    );

                    console.log(
                        `🏠 ATENDIMENTO: ${FRONTEND_URL}/atendimento`
                    );

                    console.log('');

                    console.log(
                        '════════════════════════════════════════════════════'
                    );

                    console.log('');
                }

                if (
                    connection ===
                    'close'
                ) {
                    isConnected =
                        false;

                    idGrupoChamados =
                        null;

                    const statusCode =
                        new Boom(
                            lastDisconnect?.error
                        )?.output
                            ?.statusCode;

                    const deveReconectar =
                        statusCode !==
                        DisconnectReason.loggedOut;

                    console.log(
                        '⚠️ WhatsApp desconectado.'
                    );

                    if (
                        deveReconectar
                    ) {
                        console.log(
                            '🔄 Tentando reconectar...'
                        );

                        setTimeout(
                            iniciarWhatsApp,
                            5000
                        );
                    } else {
                        console.log(
                            '🚪 WhatsApp saiu da sessão.'
                        );

                        console.log(
                            '📱 Será necessário escanear o QR Code novamente.'
                        );
                    }
                }
            }
        );

        sock.ev.on(
            'messages.upsert',
            async ({
                messages,
                type
            }) => {
                if (
                    type !== 'notify'
                ) {
                    return;
                }

                for (
                    const message of messages
                ) {
                    await processarMensagemRecebida(
                        message
                    );
                }
            }
        );
    } catch (erro) {
        isConnected =
            false;

        idGrupoChamados =
            null;

        console.error(
            '❌ ERRO AO INICIAR WHATSAPP:',
            erro?.message ||
                erro
        );

        setTimeout(
            iniciarWhatsApp,
            5000
        );
    }
}

app.get(
    '/health',
    (req, res) => {
        res.json({
            status: 'ok',

            whatsapp:
                isConnected
                    ? 'connected'
                    : 'disconnected',

            chamados:
                Boolean(
                    idGrupoChamados
                ),

            timestamp:
                new Date().toISOString()
        });
    }
);

app.get(
    '/qrcode',
    (req, res) => {
        if (
            isConnected
        ) {
            return res
                .status(200)
                .send(`
                    <!DOCTYPE html>
                    <html lang="pt-BR">

                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Lar Forte - WhatsApp</title>
                    </head>

                    <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;background:#f8fafc;">

                        <div style="background:white;padding:40px;border-radius:20px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.1);">

                            <h2 style="color:#16a34a;">
                                ✅ WhatsApp conectado!
                            </h2>

                            <p>
                                O bot da Lar Forte está pronto para uso.
                            </p>

                        </div>

                    </body>
                    </html>
                `);
        }

        if (
            !currentQRDataURL
        ) {
            return res
                .status(200)
                .send(`
                    <!DOCTYPE html>
                    <html lang="pt-BR">

                    <head>
                        <meta charset="UTF-8">
                        <meta http-equiv="refresh" content="3">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Lar Forte - QR Code</title>
                    </head>

                    <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;background:#f8fafc;">

                        <div style="background:white;padding:40px;border-radius:20px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.1);">

                            <h2>
                                ⏳ Aguardando QR Code...
                            </h2>

                            <p>
                                Esta página será atualizada automaticamente.
                            </p>

                        </div>

                    </body>
                    </html>
                `);
        }

        return res
            .status(200)
            .send(`
                <!DOCTYPE html>
                <html lang="pt-BR">

                <head>
                    <meta charset="UTF-8">
                    <meta http-equiv="refresh" content="15">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                    <title>
                        Lar Forte - QR Code WhatsApp
                    </title>
                </head>

                <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;background:#f8fafc;">

                    <div style="background:white;padding:40px;border-radius:20px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.1);">

                        <h2>
                            📱 Leia o QR Code com o WhatsApp
                        </h2>

                        <img
                            src="${currentQRDataURL}"
                            alt="QR Code WhatsApp"
                            style="width:300px;height:300px;margin-top:20px;"
                        >

                        <p style="color:#64748b;margin-top:20px;">
                            A página será atualizada automaticamente.
                        </p>

                    </div>

                </body>
                </html>
            `);
    }
);

app.post(
    '/api/atendimento',
    upload.single('arquivo'),
    async (
        req,
        res
    ) => {
        const arquivoRecebido =
            req.file || null;

        try {
            if (
                !sock ||
                !isConnected
            ) {
                return res
                    .status(503)
                    .json({
                        sucesso: false,
                        mensagem:
                            'WhatsApp não está conectado no momento.'
                    });
            }

            const {
                nome,
                telefone,
                numero,
                numeroEndereco,
                endereco,
                bairro,
                cidade,
                cep,
                categoria,
                servico,
                estimativa,
                descricao,
                observacoes
            } = req.body;

            const telefoneRecebido =
                numero ||
                telefone;

            if (
                !telefoneRecebido
            ) {
                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        mensagem:
                            'Número de WhatsApp não informado.'
                    });
            }

            const numeroLimpo =
                String(
                    telefoneRecebido
                ).replace(
                    /\D/g,
                    ''
                );

            if (
                numeroLimpo.length <
                    10 ||
                numeroLimpo.length >
                    15
            ) {
                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        mensagem:
                            'Número de WhatsApp inválido.'
                    });
            }

            const numeroCom55 =
                numeroLimpo.startsWith(
                    '55'
                )
                    ? numeroLimpo
                    : `55${numeroLimpo}`;

            const jid =
                `${numeroCom55}@s.whatsapp.net`;

            console.log('');

            console.log(
                '────────────────────────────────────────────────────'
            );

            console.log(
                '📋 NOVO PEDIDO RECEBIDO'
            );

            console.log(
                `👤 Cliente: ${
                    nome ||
                    'Não informado'
                }`
            );

            console.log(
                `📱 WhatsApp: ${numeroCom55}`
            );

            console.log(
                `🔧 Serviço: ${
                    servico ||
                    'Não informado'
                }`
            );

            console.log(
                '────────────────────────────────────────────────────'
            );

            let contatos;

            try {
                contatos =
                    await sock.onWhatsApp(
                        numeroCom55
                    );
            } catch (erro) {
                console.error(
                    '❌ Erro ao verificar WhatsApp:',
                    erro?.message ||
                        erro
                );

                return res
                    .status(500)
                    .json({
                        sucesso: false,
                        mensagem:
                            'Não foi possível verificar o número do WhatsApp.'
                    });
            }

            if (
                !contatos?.length ||
                !contatos[0]?.exists
            ) {
                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        mensagem:
                            'Este número não possui WhatsApp.'
                    });
            }

            const destinoCliente =
                contatos[0].jid ||
                jid;

            const enderecoCompleto =
                [
                    endereco || '',

                    numeroEndereco
                        ? `Nº ${numeroEndereco}`
                        : '',

                    bairro
                        ? `Bairro: ${bairro}`
                        : '',

                    cidade || '',

                    cep
                        ? `CEP: ${cep}`
                        : ''
                ]
                    .filter(Boolean)
                    .join(', ');

            const mensagem = `🏠 *NOVO PEDIDO - LAR FORTE*

👤 *Cliente:* ${
                nome ||
                'Não informado'
            }

📱 *WhatsApp:* ${
                telefoneRecebido ||
                'Não informado'
            }

📍 *Endereço:*
${
    enderecoCompleto ||
    'Não informado'
}

🔧 *Categoria:* ${
                categoria ||
                'Não informado'
            }

🛠️ *Serviço:* ${
                servico ||
                'Não informado'
            }

💰 *Estimativa:* ${
                estimativa ||
                'Não informado'
            }

📝 *Descrição:*
${
    descricao ||
    'Não informado'
}

💬 *Observações:*
${
    observacoes ||
    'Nenhuma'
}

📎 *Mídia:* ${
                arquivoRecebido
                    ? 'Sim'
                    : 'Não'
            }`;

            let clienteEnviado =
                false;

            let grupoEnviado =
                false;

            try {
                console.log(
                    '📤 Enviando pedido para o cliente...'
                );

                await enviarMensagemWhatsApp(
                    destinoCliente,
                    mensagem,
                    arquivoRecebido,
                    false
                );

                clienteEnviado =
                    true;

                console.log(
                    '✅ Pedido enviado para o cliente.'
                );
            } catch (
                erroCliente
            ) {
                console.error(
                    '❌ ERRO NO ENVIO AO CLIENTE:',
                    erroCliente?.message ||
                        erroCliente
                );
            }

            try {
                if (
                    !idGrupoChamados
                ) {
                    await descobrirGrupoChamados();
                }

                if (
                    !idGrupoChamados
                ) {
                    console.log(
                        '⚠️ 📞 CHAMADOS🚨: envio não realizado.'
                    );
                } else {
                    console.log(
                        '📤 Enviando pedido para 📞 CHAMADOS🚨...'
                    );

                    await enviarMensagemWhatsApp(
                        idGrupoChamados,
                        mensagem,
                        arquivoRecebido,
                        false
                    );

                    grupoEnviado =
                        true;

                    console.log(
                        '✅ Pedido enviado para 📞 CHAMADOS🚨.'
                    );
                }
            } catch (
                erroGrupo
            ) {
                console.error(
                    '❌ ERRO NO ENVIO AO 📞 CHAMADOS🚨:',
                    erroGrupo?.message ||
                        erroGrupo
                );
            }

            if (
                !clienteEnviado &&
                !grupoEnviado
            ) {
                return res
                    .status(500)
                    .json({
                        sucesso: false,
                        mensagem:
                            'Não foi possível enviar o pedido.'
                    });
            }

            return res.json({
                sucesso: true,
                clienteEnviado,
                grupoEnviado,
                mensagem:
                    'Pedido enviado com sucesso!'
            });
        } catch (erro) {
            console.error(
                '❌ ERRO FINAL NO ATENDIMENTO:',
                erro?.message ||
                    erro
            );

            return res
                .status(500)
                .json({
                    sucesso: false,
                    mensagem:
                        'Erro interno ao processar o atendimento.'
                });
        } finally {
            if (
                arquivoRecebido?.path &&
                fs.existsSync(
                    arquivoRecebido.path
                )
            ) {
                try {
                    fs.unlinkSync(
                        arquivoRecebido.path
                    );

                    console.log(
                        '🗑️ Arquivo temporário removido.'
                    );
                } catch (
                    erroArquivo
                ) {
                    console.error(
                        '⚠️ Erro ao remover arquivo temporário:',
                        erroArquivo?.message ||
                            erroArquivo
                    );
                }
            }
        }
    }
);

app.use(
    (
        erro,
        req,
        res,
        next
    ) => {
        if (
            erro instanceof
            multer.MulterError
        ) {
            if (
                erro.code ===
                'LIMIT_FILE_SIZE'
            ) {
                return res
                    .status(400)
                    .json({
                        sucesso: false,
                        mensagem:
                            'O arquivo não pode ultrapassar 100 MB.'
                    });
            }

            return res
                .status(400)
                .json({
                    sucesso: false,
                    mensagem:
                        erro.message
                });
        }

        if (erro) {
            console.error(
                '❌ Erro do servidor:',
                erro?.message ||
                    erro
            );

            return res
                .status(500)
                .json({
                    sucesso: false,
                    mensagem:
                        erro.message ||
                        'Erro interno do servidor.'
                });
        }

        next();
    }
);

app.listen(
    PORT,
    '0.0.0.0',
    () => {
        console.log('');

        console.log(
            '════════════════════════════════════════════════════'
        );

        console.log(
            '               🚀 LAR FORTE'
        );

        console.log(
            '════════════════════════════════════════════════════'
        );

        console.log('');

        console.log(
            `🌐 API:          ${API_BASE_URL}`
        );

        console.log(
            `📱 QR CODE:      ${API_BASE_URL}/qrcode`
        );

        console.log(
            `❤️  HEALTH:       ${API_BASE_URL}/health`
        );

        console.log(
            `💻 SITE:          ${FRONTEND_URL}`
        );

        console.log(
            `🏠 ATENDIMENTO:  ${FRONTEND_URL}/atendimento`
        );

        console.log('');

        console.log(
            '────────────────────────────────────────────────────'
        );

        console.log(
            `📞 CHAMADOS🚨:   ${
                WHATSAPP_GROUP_ID
                    ? 'ID CONFIGURADO'
                    : 'aguardando grupo...'
            }`
        );

        console.log(
            `🔐 AUTH:          ${AUTH_DIR}`
        );

        console.log(
            '🤖 WHATSAPP:     iniciando...'
        );

        console.log(
            '────────────────────────────────────────────────────'
        );

        console.log('');

        iniciarWhatsApp();
    }
);
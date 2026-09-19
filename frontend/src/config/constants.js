const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV
        ? 'http://localhost:3000'
        : 'https://lar-forte-api.onrender.com');

const SITE_URL =
    import.meta.env.VITE_SITE_URL ||
    (import.meta.env.DEV
        ? 'http://localhost:5173'
        : 'https://larforte-web.vercel.app');

export const API_CONFIG = {
    BASE_URL: API_BASE_URL,

    TIMEOUT: 60000,

    ENDPOINTS: {
        QR_CODE: '/qrcode',
        ATENDIMENTO: '/api/atendimento',
        HEALTH: '/health'
    }
};

export const LINKS = {
    SITE: SITE_URL,

    ATENDIMENTO:
        `${SITE_URL}/atendimento`,

    QR_CODE:
        `${API_BASE_URL}/qrcode`
};

export const ROUTES = {
    HOME: '/',
    CATALOGO: '/catalogo',
    SOBRE: '/sobre',
    ATENDIMENTO: '/atendimento'
};

export const STORAGE_KEYS = {
    CLIENTE_PERFIL: '@larForteCliente',
    SESSAO_ATIVA: '@larForteSessao',
    PEDIDO_ENVIADO: '@larFortePedidoEnviado'
};

export const VALIDATION = {
    TELEFONE: {
        MIN_LENGTH: 14,
        MAX_LENGTH: 15,
        REGEX: /^\(\d{2}\) \d{4,5}-\d{4}$/
    },

    CEP: {
        LENGTH: 8,
        REGEX: /^\d{8}$/
    },

    NOME: {
        MIN_LENGTH: 3,
        MAX_LENGTH: 100
    },

    OBSERVACOES: {
        MAX_LENGTH: 500
    }
};

export const FILE_CONFIG = {
    MAX_SIZE_MB: 100,
    MAX_SIZE_BYTES: 100 * 1024 * 1024,

    ACCEPTED_TYPES: {
        IMAGE: 'image/*',
        VIDEO: 'video/*'
    },

    ALLOWED_EXTENSIONS: [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'webp',
        'mp4',
        'webm',
        'mov'
    ]
};

export const MESSAGES = {
    ERROR: {
        SERVER: '❌ Erro ao enviar o pedido.',
        CONNECTION: '❌ Não foi possível conectar ao servidor.',
        UPLOAD: '❌ Erro ao fazer upload do arquivo.',
        VALIDATION: '❌ Preencha todos os campos obrigatórios.'
    },

    SUCCESS: {
        ORDER_SENT: '✅ Pedido recebido com sucesso!',
        PROFILE_SAVED: '💾 Perfil salvo.'
    },

    WARNING: {
        SESSION_EXPIRED: '⚠️ Sua sessão expirou.',
        LARGE_FILE: '⚠️ O arquivo não pode ultrapassar 100 MB.'
    }
};

export const EXTERNAL_APIS = {
    VIACEP: {
        BASE_URL: 'https://viacep.com.br/ws',
        TIMEOUT: 10000
    }
};

export const ENVIRONMENT = {
    IS_DEV: import.meta.env.DEV,
    IS_PROD: import.meta.env.PROD,
    MODE: import.meta.env.MODE,

    TIMEZONE:
        import.meta.env.VITE_TIMEZONE ||
        'America/Sao_Paulo'
};

export default {
    API_CONFIG,
    LINKS,
    ROUTES,
    STORAGE_KEYS,
    VALIDATION,
    FILE_CONFIG,
    MESSAGES,
    EXTERNAL_APIS,
    ENVIRONMENT
};

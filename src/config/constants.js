/**
 * ============================================
 * CONFIGURAÇÕES GLOBAIS - LAR FORTE
 * ============================================
 *
 * Arquivo: src/config/constants.js
 * Propósito: Centralizar todas as constantes
 *            e configurações da aplicação
 *
 * Nota: As variáveis sensíveis devem estar
 *       definidas no .env.local (não commitado)
 */

// ============================================
// API E ENDPOINTS
// ============================================

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  TIMEOUT: 30000, // 30 segundos
  ENDPOINTS: {
    ATENDIMENTO: '/api/atendimento',
    HEALTH: '/api/health',
  }
};

// ============================================
// STORAGE - CHAVES DO LOCALSTORAGE E SESSIONSTORAGE
// ============================================

export const STORAGE_KEYS = {
  // Cliente (permanente em localStorage)
  CLIENTE_PERFIL: '@larForteCliente',

  // Sessão (temporário em sessionStorage)
  SESSAO_ATIVA: '@larForteSessao',
  PEDIDO_ENVIADO: '@larFortePedidoEnviado',
};

// ============================================
// VALIDAÇÕES E LIMITES
// ============================================

export const VALIDATION = {
  TELEFONE: {
    MIN_LENGTH: 14, // (XX) 9XXXX-XXXX
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

// ============================================
// ARQUIVO - UPLOAD
// ============================================

export const FILE_CONFIG = {
  MAX_SIZE_MB: 10,
  MAX_SIZE_BYTES: 10 * 1024 * 1024,
  ACCEPTED_TYPES: {
    IMAGE: 'image/*',
    VIDEO: 'video/*',
  },
  ALLOWED_EXTENSIONS: [
    'jpg', 'jpeg', 'png', 'gif', 'webp',
    'mp4', 'webm', 'mov'
  ]
};

// ============================================
// MENSAGENS - PADRÕES
// ============================================

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
    LARGE_FILE: '⚠️ Arquivo muito grande.'
  }
};

// ============================================
// ENDPOINTS EXTERNOS
// ============================================

export const EXTERNAL_APIs = {
  VIACEP: {
    BASE_URL: 'https://viacep.com.br/ws',
    TIMEOUT: 10000
  }
};

// ============================================
// AMBIENTE
// ============================================

export const ENVIRONMENT = {
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
  MODE: import.meta.env.MODE,
  TIMEZONE: import.meta.env.VITE_TIMEZONE || 'America/Sao_Paulo'
};

// ============================================
// EXPORT PADRÃO
// ============================================

export default {
  API_CONFIG,
  STORAGE_KEYS,
  VALIDATION,
  FILE_CONFIG,
  MESSAGES,
  EXTERNAL_APIs,
  ENVIRONMENT
};

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogoServicos } from '../data/catalogo';
import {
    API_CONFIG,
    STORAGE_KEYS,
    MESSAGES,
    EXTERNAL_APIS,
    ROUTES,
    FILE_CONFIG
} from '../config/constants';

export default function Atendimento() {
    const navigate = useNavigate();

    const getPerfilSalvo = () => {
        try {
            const salvo = localStorage.getItem(
                STORAGE_KEYS.CLIENTE_PERFIL
            );

            if (salvo) {
                return JSON.parse(salvo);
            }
        } catch (error) {
            console.error(
                '❌ Erro ao ler perfil salvo:',
                error
            );

            localStorage.removeItem(
                STORAGE_KEYS.CLIENTE_PERFIL
            );
        }

        return {
            nome: '',
            telefone: '',
            cep: '',
            logradouro: '',
            numero: '',
            bairro: '',
            cidade: ''
        };
    };

    const criarEstadoInicial = (
        perfilAtual = getPerfilSalvo()
    ) => ({
        etapa: 1,

        dados: {
            rotaEscolhida: 'Bot',
            nome: perfilAtual.nome || '',
            telefone: perfilAtual.telefone || '',
            cep: perfilAtual.cep || '',
            logradouro: perfilAtual.logradouro || '',
            numero: perfilAtual.numero || '',
            bairro: perfilAtual.bairro || '',
            cidade: perfilAtual.cidade || '',
            categoriaKey: '',
            categoria: '',
            servicoEspecifico: '',
            descricaoServico: '',
            orcamentoMedio: '',
            observacoes: '',
            enviouMidia: 'Não',
            arquivoPreview: null,
            arquivo: null,
            mimetype: '',
            filename: '',
            lgpd: false
        }
    });

    const [sessao, setSessao] = useState(() => {
        try {
            const salvo = sessionStorage.getItem(
                STORAGE_KEYS.SESSAO_ATIVA
            );

            if (salvo) {
                const sessaoSalva =
                    JSON.parse(salvo);

                if (sessaoSalva.etapa === 5) {
                    sessionStorage.removeItem(
                        STORAGE_KEYS.SESSAO_ATIVA
                    );

                    return criarEstadoInicial();
                }

                if (
                    sessaoSalva.etapa >= 1 &&
                    sessaoSalva.etapa <= 4
                ) {
                    return sessaoSalva;
                }
            }
        } catch (error) {
            console.error(
                '❌ Erro ao recuperar sessão:',
                error
            );

            sessionStorage.removeItem(
                STORAGE_KEYS.SESSAO_ATIVA
            );
        }

        return criarEstadoInicial();
    });

    const [enviando, setEnviando] =
        useState(false);

    useEffect(() => {
        try {
            if (sessao.etapa === 5) {
                sessionStorage.removeItem(
                    STORAGE_KEYS.SESSAO_ATIVA
                );

                return;
            }

            const {
                arquivo,
                arquivoPreview,
                mimetype,
                filename,
                ...dadosPersistiveis
            } = sessao.dados;

            const sessaoPersistivel = {
                etapa: sessao.etapa,
                dados: {
                    ...dadosPersistiveis,
                    arquivoPreview: null,
                    mimetype: '',
                    filename: ''
                }
            };

            sessionStorage.setItem(
                STORAGE_KEYS.SESSAO_ATIVA,
                JSON.stringify(
                    sessaoPersistivel
                )
            );
        } catch (error) {
            console.error(
                '❌ Erro ao salvar sessão:',
                error
            );
        }
    }, [sessao]);

    const atualizarDados = (
        chave,
        valor
    ) => {
        setSessao(prev => ({
            ...prev,
            dados: {
                ...prev.dados,
                [chave]: valor
            }
        }));
    };

    const aplicarMascaraTelefone = (
        valor
    ) => {
        const apenasNumeros =
            valor.replace(/\D/g, '');

        let formatado =
            apenasNumeros.replace(
                /^(\d{2})(\d)/g,
                '($1) $2'
            );

        formatado =
            formatado.replace(
                /(\d{5})(\d)/,
                '$1-$2'
            );

        atualizarDados(
            'telefone',
            formatado.substring(0, 15)
        );
    };

    const proximaEtapa = nova => {
        setSessao(prev => ({
            ...prev,
            etapa: nova
        }));
    };

    const voltarEtapa = nova => {
        setSessao(prev => ({
            ...prev,
            etapa: nova
        }));
    };

    const buscarCep = async cepDigitado => {
        const cepLimpo =
            cepDigitado.replace(/\D/g, '');

        atualizarDados(
            'cep',
            cepLimpo
        );

        if (cepLimpo.length === 8) {
            try {
                const res = await fetch(
                    `${EXTERNAL_APIS.VIACEP.BASE_URL}/${cepLimpo}/json/`
                );

                const data =
                    await res.json();

                if (!data.erro) {
                    atualizarDados(
                        'logradouro',
                        data.logradouro
                    );

                    atualizarDados(
                        'bairro',
                        data.bairro
                    );

                    atualizarDados(
                        'cidade',
                        `${data.localidade}/${data.uf}`
                    );

                    document
                        .getElementById(
                            'numero-input'
                        )
                        ?.focus();
                }
            } catch (erro) {
                console.error(
                    '❌ Erro ao consultar CEP:',
                    erro
                );
            }
        }
    };

    const limparArquivo = () => {
        if (
            sessao.dados.arquivoPreview
        ) {
            URL.revokeObjectURL(
                sessao.dados.arquivoPreview
            );
        }

        atualizarDados(
            'enviouMidia',
            'Não'
        );

        atualizarDados(
            'arquivo',
            null
        );

        atualizarDados(
            'arquivoPreview',
            null
        );

        atualizarDados(
            'mimetype',
            ''
        );

        atualizarDados(
            'filename',
            ''
        );
    };

    const handleFileUpload = e => {
        const file =
            e.target.files?.[0];

        if (!file) {
            limparArquivo();
            return;
        }

        if (
            file.size >
            FILE_CONFIG.MAX_SIZE_BYTES
        ) {
            window.alert(
                `❌ O arquivo selecionado possui ${(file.size / 1024 / 1024).toFixed(2)} MB e ultrapassa o limite de ${FILE_CONFIG.MAX_SIZE_MB} MB.`
            );

            e.target.value = '';

            limparArquivo();
            return;
        }

        const tipoPermitido =
            file.type.startsWith('image/') ||
            file.type.startsWith('video/');

        if (!tipoPermitido) {
            window.alert(
                '❌ Selecione uma imagem ou vídeo válido.'
            );

            e.target.value = '';

            limparArquivo();
            return;
        }

        const previewUrl =
            URL.createObjectURL(file);

        limparArquivo();

        atualizarDados(
            'enviouMidia',
            'Sim'
        );

        atualizarDados(
            'arquivo',
            file
        );

        atualizarDados(
            'arquivoPreview',
            previewUrl
        );

        atualizarDados(
            'mimetype',
            file.type
        );

        atualizarDados(
            'filename',
            file.name
        );
    };

    const finalizarAtendimento =
        async e => {
            e.preventDefault();

            if (enviando) {
                return;
            }

            if (
                sessao.dados.arquivo &&
                sessao.dados.arquivo.size >
                    FILE_CONFIG.MAX_SIZE_BYTES
            ) {
                window.alert(
                    MESSAGES.WARNING
                        .LARGE_FILE
                );

                return;
            }

            setEnviando(true);

            const endereco =
                `${sessao.dados.logradouro}, ` +
                `${sessao.dados.numero} - ` +
                `${sessao.dados.bairro}, ` +
                `${sessao.dados.cidade}`;

            try {
                const formData =
                    new FormData();

                formData.append(
                    'nome',
                    sessao.dados.nome || ''
                );

                formData.append(
                    'telefone',
                    sessao.dados.telefone || ''
                );

                formData.append(
                    'numero',
                    sessao.dados.telefone || ''
                );

                formData.append(
                    'cep',
                    sessao.dados.cep || ''
                );

                formData.append(
                    'logradouro',
                    sessao.dados.logradouro || ''
                );

                formData.append(
                    'numeroEndereco',
                    sessao.dados.numero || ''
                );

                formData.append(
                    'bairro',
                    sessao.dados.bairro || ''
                );

                formData.append(
                    'cidade',
                    sessao.dados.cidade || ''
                );

                formData.append(
                    'endereco',
                    endereco
                );

                formData.append(
                    'categoriaKey',
                    sessao.dados.categoriaKey || ''
                );

                formData.append(
                    'categoria',
                    sessao.dados.categoria || ''
                );

                formData.append(
                    'servicoEspecifico',
                    sessao.dados.servicoEspecifico || ''
                );

                formData.append(
                    'descricaoServico',
                    sessao.dados.descricaoServico || ''
                );

                formData.append(
                    'orcamentoMedio',
                    sessao.dados.orcamentoMedio || ''
                );

                formData.append(
                    'observacoes',
                    sessao.dados.observacoes || ''
                );

                formData.append(
                    'enviouMidia',
                    sessao.dados.enviouMidia ||
                        'Não'
                );

                if (
                    sessao.dados.arquivo
                ) {
                    formData.append(
                        'arquivo',
                        sessao.dados.arquivo,
                        sessao.dados.arquivo.name
                    );
                }

                const controller =
                    new AbortController();

                const timeout =
                    setTimeout(() => {
                        controller.abort();
                    }, API_CONFIG.TIMEOUT);

                let response;

                try {
                    response = await fetch(
                        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ATENDIMENTO}`,
                        {
                            method: 'POST',
                            body: formData,
                            signal: controller.signal
                        }
                    );
                } finally {
                    clearTimeout(timeout);
                }

                let result = {};

                try {
                    result =
                        await response.json();
                } catch {
                    result = {};
                }

                if (response.ok) {
                    const perfilParaSalvar = {
                        nome:
                            sessao.dados.nome ||
                            '',
                        telefone:
                            sessao.dados.telefone ||
                            '',
                        cep:
                            sessao.dados.cep ||
                            '',
                        logradouro:
                            sessao.dados
                                .logradouro ||
                            '',
                        numero:
                            sessao.dados.numero ||
                            '',
                        bairro:
                            sessao.dados.bairro ||
                            '',
                        cidade:
                            sessao.dados.cidade ||
                            ''
                    };

                    localStorage.setItem(
                        STORAGE_KEYS.CLIENTE_PERFIL,
                        JSON.stringify(
                            perfilParaSalvar
                        )
                    );

                    sessionStorage.removeItem(
                        STORAGE_KEYS.SESSAO_ATIVA
                    );

                    sessionStorage.setItem(
                        STORAGE_KEYS.PEDIDO_ENVIADO,
                        'true'
                    );

                    navigate(
                        ROUTES.HOME,
                        {
                            state: {
                                pedidoEnviado: true
                            }
                        }
                    );

                    return;
                }

                window.alert(
                    MESSAGES.ERROR.SERVER +
                    '\n\n' +
                    (
                        result.erro ||
                        result.mensagem ||
                        'Tente novamente.'
                    )
                );

            } catch (error) {
                console.error(
                    '💥 ERRO DE CONEXÃO:',
                    error
                );

                if (
                    error.name ===
                    'AbortError'
                ) {
                    window.alert(
                        'O envio demorou muito para responder. Tente novamente.'
                    );
                } else {
                    window.alert(
                        MESSAGES.ERROR.CONNECTION
                    );
                }
            } finally {
                setEnviando(false);
            }
        };

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4">
            <div
                className="
                    max-w-3xl
                    mx-auto
                    bg-white
                    p-6
                    md:p-10
                    rounded-2xl
                    shadow-xl
                    border
                    border-gray-100
                "
            >
                <div
                    className="
                        mb-8
                        border-b
                        border-gray-100
                        pb-6
                        flex
                        justify-between
                        items-start
                        md:items-center
                        gap-4
                    "
                >
                    <h1
                        className="
                            text-2xl
                            md:text-3xl
                            font-black
                            text-slate-900
                            leading-tight
                        "
                    >
                        Solicitar Orçamento
                    </h1>

                    <span
                        className="
                            text-sm
                            font-bold
                            text-slate-900
                            bg-amber-400
                            px-4
                            py-2
                            rounded-full
                            shadow-sm
                            whitespace-nowrap
                            flex-shrink-0
                        "
                    >
                        Passo {sessao.etapa} de 5
                    </span>
                </div>

                {sessao.etapa === 1 && (
                    <div
                        className="
                            space-y-6
                            animate-fade-in
                        "
                    >
                        <h2
                            className="
                                text-xl
                                font-bold
                                text-slate-800
                            "
                        >
                            Seus dados básicos
                        </h2>

                        <div
                            className="
                                grid
                                grid-cols-1
                                md:grid-cols-2
                                gap-5
                            "
                        >
                            <div>
                                <label
                                    className="
                                        block
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                        mb-1
                                    "
                                >
                                    Nome Completo
                                </label>

                                <input
                                    type="text"
                                    value={
                                        sessao.dados.nome
                                    }
                                    onChange={e =>
                                        atualizarDados(
                                            'nome',
                                            e.target.value
                                        )
                                    }
                                    className="
                                        w-full
                                        p-3.5
                                        bg-slate-50
                                        border
                                        border-gray-200
                                        rounded-xl
                                        focus:ring-2
                                        focus:ring-amber-500
                                        focus:border-amber-500
                                        focus:bg-white
                                        outline-none
                                        transition-all
                                        shadow-sm
                                    "
                                />
                            </div>

                            <div>
                                <label
                                    className="
                                        block
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                        mb-1
                                    "
                                >
                                    WhatsApp para Contato
                                </label>

                                <input
                                    type="text"
                                    placeholder="(41) 99999-9999"
                                    value={
                                        sessao.dados.telefone
                                    }
                                    onChange={e =>
                                        aplicarMascaraTelefone(
                                            e.target.value
                                        )
                                    }
                                    className="
                                        w-full
                                        p-3.5
                                        bg-slate-50
                                        border
                                        border-gray-200
                                        rounded-xl
                                        focus:ring-2
                                        focus:ring-amber-500
                                        focus:border-amber-500
                                        focus:bg-white
                                        outline-none
                                        transition-all
                                        shadow-sm
                                    "
                                />
                            </div>
                        </div>

                        <div
                            className="
                                grid
                                grid-cols-1
                                md:grid-cols-4
                                gap-5
                            "
                        >
                            <div
                                className="md:col-span-1"
                            >
                                <label
                                    className="
                                        block
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                        mb-1
                                    "
                                >
                                    CEP
                                </label>

                                <input
                                    type="text"
                                    maxLength="8"
                                    placeholder="00000-000"
                                    value={
                                        sessao.dados.cep
                                    }
                                    onChange={e =>
                                        buscarCep(
                                            e.target.value
                                        )
                                    }
                                    className="
                                        w-full
                                        p-3.5
                                        bg-slate-50
                                        border
                                        border-gray-200
                                        rounded-xl
                                        focus:ring-2
                                        focus:ring-amber-500
                                        focus:border-amber-500
                                        focus:bg-white
                                        outline-none
                                        transition-all
                                        shadow-sm
                                        font-medium
                                    "
                                />
                            </div>

                            <div
                                className="md:col-span-3"
                            >
                                <label
                                    className="
                                        block
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                        mb-1
                                    "
                                >
                                    Logradouro / Rua
                                </label>

                                <input
                                    type="text"
                                    value={
                                        sessao.dados.logradouro
                                    }
                                    onChange={e =>
                                        atualizarDados(
                                            'logradouro',
                                            e.target.value
                                        )
                                    }
                                    className="
                                        w-full
                                        p-3.5
                                        bg-gray-100
                                        border
                                        border-gray-200
                                        rounded-xl
                                        outline-none
                                        text-gray-600
                                        cursor-not-allowed
                                    "
                                    readOnly
                                />
                            </div>
                        </div>

                        <div
                            className="
                                grid
                                grid-cols-1
                                md:grid-cols-4
                                gap-5
                            "
                        >
                            <div
                                className="md:col-span-1"
                            >
                                <label
                                    className="
                                        block
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                        mb-1
                                    "
                                >
                                    Número
                                </label>

                                <input
                                    id="numero-input"
                                    type="text"
                                    placeholder="Ex: 123"
                                    value={
                                        sessao.dados.numero
                                    }
                                    onChange={e =>
                                        atualizarDados(
                                            'numero',
                                            e.target.value
                                        )
                                    }
                                    className="
                                        w-full
                                        p-3.5
                                        bg-slate-50
                                        border
                                        border-gray-200
                                        rounded-xl
                                        focus:ring-2
                                        focus:ring-amber-500
                                        focus:border-amber-500
                                        focus:bg-white
                                        outline-none
                                        transition-all
                                        shadow-sm
                                        font-bold
                                    "
                                />
                            </div>

                            <div
                                className="md:col-span-1"
                            >
                                <label
                                    className="
                                        block
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                        mb-1
                                    "
                                >
                                    Bairro
                                </label>

                                <input
                                    type="text"
                                    value={
                                        sessao.dados.bairro
                                    }
                                    onChange={e =>
                                        atualizarDados(
                                            'bairro',
                                            e.target.value
                                        )
                                    }
                                    className="
                                        w-full
                                        p-3.5
                                        bg-gray-100
                                        border
                                        border-gray-200
                                        rounded-xl
                                        outline-none
                                        text-gray-600
                                        cursor-not-allowed
                                    "
                                    readOnly
                                />
                            </div>

                            <div
                                className="md:col-span-2"
                            >
                                <label
                                    className="
                                        block
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                        mb-1
                                    "
                                >
                                    Cidade / UF
                                </label>

                                <input
                                    type="text"
                                    value={
                                        sessao.dados.cidade
                                    }
                                    onChange={e =>
                                        atualizarDados(
                                            'cidade',
                                            e.target.value
                                        )
                                    }
                                    className="
                                        w-full
                                        p-3.5
                                        bg-gray-100
                                        border
                                        border-gray-200
                                        rounded-xl
                                        outline-none
                                        text-gray-600
                                        cursor-not-allowed
                                    "
                                    readOnly
                                />
                            </div>
                        </div>

                        <button
                            onClick={() =>
                                proximaEtapa(2)
                            }
                            disabled={
                                !sessao.dados.nome ||
                                !sessao.dados.telefone ||
                                !sessao.dados.logradouro ||
                                !sessao.dados.numero
                            }
                            className="
                                w-full
                                bg-slate-900
                                text-amber-400
                                font-bold
                                text-lg
                                py-4
                                rounded-xl
                                hover:bg-slate-800
                                focus:ring-4
                                focus:ring-slate-300
                                disabled:opacity-50
                                disabled:cursor-not-allowed
                                transition-all
                                mt-6
                                shadow-md
                            "
                        >
                            Avançar para Serviços
                        </button>
                    </div>
                )}

                {sessao.etapa === 2 && (
                    <div
                        className="
                            space-y-6
                            animate-fade-in
                        "
                    >
                        <h2
                            className="
                                text-xl
                                font-bold
                                text-slate-800
                            "
                        >
                            O que você precisa hoje?
                        </h2>

                        <div
                            className="
                                grid
                                grid-cols-1
                                md:grid-cols-2
                                gap-4
                            "
                        >
                            {Object.entries(
                                catalogoServicos
                            ).map(
                                ([chave, cat]) => (
                                    <button
                                        key={chave}
                                        onClick={() => {
                                            atualizarDados(
                                                'categoriaKey',
                                                chave
                                            );

                                            atualizarDados(
                                                'categoria',
                                                cat.nome
                                            );

                                            if (
                                                Object.keys(
                                                    cat.itens
                                                ).length === 1
                                            ) {
                                                const unico =
                                                    cat.itens['1'];

                                                atualizarDados(
                                                    'servicoEspecifico',
                                                    unico.nome
                                                );

                                                atualizarDados(
                                                    'descricaoServico',
                                                    unico.desc
                                                );

                                                atualizarDados(
                                                    'orcamentoMedio',
                                                    unico.preco
                                                );

                                                proximaEtapa(
                                                    4
                                                );
                                            } else {
                                                proximaEtapa(
                                                    3
                                                );
                                            }
                                        }}
                                        className="
                                            p-5
                                            border-2
                                            border-gray-100
                                            rounded-xl
                                            text-left
                                            hover:border-amber-500
                                            hover:bg-amber-50
                                            hover:shadow-md
                                            transition-all
                                            group
                                        "
                                    >
                                        <span
                                            className="
                                                font-bold
                                                text-lg
                                                text-slate-700
                                                group-hover:text-slate-900
                                            "
                                        >
                                            {cat.nome}
                                        </span>
                                    </button>
                                )
                            )}
                        </div>

                        <button
                            onClick={() =>
                                voltarEtapa(1)
                            }
                            className="
                                text-slate-500
                                font-medium
                                text-sm
                                mt-4
                                hover:text-slate-800
                                hover:underline
                                transition-colors
                            "
                        >
                            ← Voltar
                        </button>
                    </div>
                )}

                {sessao.etapa === 3 && (
                    <div
                        className="
                            space-y-6
                            animate-fade-in
                        "
                    >
                        <h2
                            className="
                                text-xl
                                font-bold
                                text-slate-800
                            "
                        >
                            Escolha o serviço de{' '}
                            {sessao.dados.categoria}:
                        </h2>

                        <div
                            className="
                                grid
                                grid-cols-1
                                gap-4
                            "
                        >
                            {Object.entries(
                                catalogoServicos[
                                    sessao.dados
                                        .categoriaKey
                                ]?.itens || {}
                            ).map(
                                ([key, serv]) => (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            atualizarDados(
                                                'servicoEspecifico',
                                                serv.nome
                                            );

                                            atualizarDados(
                                                'descricaoServico',
                                                serv.desc
                                            );

                                            atualizarDados(
                                                'orcamentoMedio',
                                                serv.preco
                                            );

                                            proximaEtapa(
                                                4
                                            );
                                        }}
                                        className="
                                            p-5
                                            border-2
                                            border-gray-100
                                            rounded-xl
                                            text-left
                                            hover:border-amber-500
                                            hover:bg-amber-50
                                            hover:shadow-md
                                            transition-all
                                            flex
                                            flex-col
                                            md:flex-row
                                            justify-between
                                            gap-3
                                            group
                                        "
                                    >
                                        <div>
                                            <p
                                                className="
                                                    font-bold
                                                    text-slate-800
                                                    group-hover:text-slate-900
                                                "
                                            >
                                                {serv.nome}
                                            </p>

                                            <p
                                                className="
                                                    text-sm
                                                    text-slate-500
                                                    mt-1
                                                "
                                            >
                                                {serv.desc}
                                            </p>
                                        </div>

                                        <span
                                            className="
                                                font-bold
                                                text-amber-600
                                                bg-amber-100/50
                                                px-3
                                                py-1
                                                rounded-lg
                                                h-fit
                                                whitespace-nowrap
                                            "
                                        >
                                            {serv.preco}
                                        </span>
                                    </button>
                                )
                            )}
                        </div>

                        <button
                            onClick={() =>
                                voltarEtapa(2)
                            }
                            className="
                                text-slate-500
                                font-medium
                                text-sm
                                mt-4
                                hover:text-slate-800
                                hover:underline
                                transition-colors
                            "
                        >
                            ← Voltar
                        </button>
                    </div>
                )}

                {sessao.etapa === 4 && (
                    <div
                        className="
                            space-y-6
                            animate-fade-in
                        "
                    >
                        <div
                            className="
                                bg-slate-900
                                p-5
                                rounded-xl
                                border
                                border-slate-800
                                text-white
                                shadow-md
                                mb-6
                            "
                        >
                            <p
                                className="
                                    text-amber-400
                                    font-bold
                                    mb-1
                                "
                            >
                                Resumo do Serviço:
                            </p>

                            <p
                                className="
                                    font-medium
                                    text-lg
                                "
                            >
                                {
                                    sessao.dados
                                        .servicoEspecifico
                                }
                            </p>

                            <p
                                className="
                                    text-sm
                                    text-slate-300
                                    mt-1
                                "
                            >
                                Estimativa:{' '}
                                {
                                    sessao.dados
                                        .orcamentoMedio
                                }
                            </p>
                        </div>

                        <h2
                            className="
                                text-xl
                                font-bold
                                text-slate-800
                            "
                        >
                            Detalhes extras (Opcional):
                        </h2>

                        <p
                            className="
                                text-sm
                                text-slate-500
                                mb-2
                            "
                        >
                            Se quiser, descreva um pouco
                            mais sobre o problema.
                        </p>

                        <textarea
                            rows="4"
                            placeholder="Ex: O chuveiro desarmou a chave e tem cheiro de queimado..."
                            value={
                                sessao.dados
                                    .observacoes
                            }
                            onChange={e =>
                                atualizarDados(
                                    'observacoes',
                                    e.target.value
                                )
                            }
                            className="
                                w-full
                                p-4
                                bg-slate-50
                                border
                                border-gray-200
                                rounded-xl
                                focus:ring-2
                                focus:ring-amber-500
                                focus:border-amber-500
                                outline-none
                                transition-all
                                resize-none
                                shadow-sm
                            "
                        />

                        <div
                            className="
                                flex
                                gap-4
                                pt-4
                            "
                        >
                            <button
                                onClick={() =>
                                    voltarEtapa(
                                        sessao.dados
                                            .categoriaKey ===
                                            '6' ||
                                        sessao.dados
                                            .categoriaKey ===
                                            '7'
                                            ? 2
                                            : 3
                                    )
                                }
                                className="
                                    px-6
                                    py-4
                                    border-2
                                    border-gray-200
                                    rounded-xl
                                    text-slate-600
                                    font-bold
                                    hover:bg-gray-50
                                    transition-colors
                                "
                            >
                                Voltar
                            </button>

                            <button
                                onClick={() =>
                                    proximaEtapa(5)
                                }
                                className="
                                    flex-1
                                    bg-amber-500
                                    text-slate-900
                                    font-bold
                                    text-lg
                                    py-4
                                    rounded-xl
                                    hover:bg-amber-400
                                    shadow-md
                                    transition-all
                                "
                            >
                                Avançar
                            </button>
                        </div>
                    </div>
                )}

                {sessao.etapa === 5 && (
                    <form
                        onSubmit={
                            finalizarAtendimento
                        }
                        className="
                            space-y-6
                            animate-fade-in
                        "
                    >
                        <h2
                            className="
                                text-xl
                                font-bold
                                text-slate-800
                            "
                        >
                            Deseja enviar uma foto do local?
                        </h2>

                        <p
                            className="
                                text-sm
                                text-slate-500
                            "
                        >
                            Isso ajuda muito na
                            precisão do orçamento.
                            (Opcional)
                        </p>

                        <div
                            className="
                                border-2
                                border-dashed
                                border-gray-300
                                rounded-2xl
                                p-8
                                text-center
                                bg-slate-50
                                relative
                                hover:bg-amber-50
                                hover:border-amber-400
                                transition-all
                                cursor-pointer
                                group
                            "
                        >
                            <input
                                type="file"
                                onChange={
                                    handleFileUpload
                                }
                                accept="image/*,video/*"
                                className="
                                    absolute
                                    inset-0
                                    w-full
                                    h-full
                                    opacity-0
                                    cursor-pointer
                                "
                            />

                            {sessao.dados
                                .arquivoPreview ? (
                                <div className="relative z-10 pointer-events-none">
                                    {sessao.dados
                                        .mimetype
                                        ?.startsWith(
                                            'video/'
                                        ) ? (
                                        <video
                                            src={
                                                sessao
                                                    .dados
                                                    .arquivoPreview
                                            }
                                            controls
                                            className="
                                                h-48
                                                w-full
                                                max-w-md
                                                mx-auto
                                                rounded-lg
                                                object-cover
                                                shadow-md
                                                mb-3
                                                border-4
                                                border-white
                                                bg-black
                                            "
                                        />
                                    ) : (
                                        <img
                                            src={
                                                sessao
                                                    .dados
                                                    .arquivoPreview
                                            }
                                            alt="Preview"
                                            className="
                                                h-48
                                                w-full
                                                max-w-md
                                                mx-auto
                                                rounded-lg
                                                object-cover
                                                shadow-md
                                                mb-3
                                                border-4
                                                border-white
                                            "
                                        />
                                    )}

                                    <span
                                        className="
                                            text-sm
                                            text-amber-600
                                            font-bold
                                        "
                                    >
                                        {sessao.dados.filename}
                                    </span>

                                    <div
                                        className="
                                            text-xs
                                            text-slate-500
                                            mt-2
                                        "
                                    >
                                        Clique para trocar
                                        o arquivo
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 pointer-events-none">
                                    <div
                                        className="
                                            bg-white
                                            w-16
                                            h-16
                                            rounded-full
                                            flex
                                            items-center
                                            justify-center
                                            mx-auto
                                            mb-4
                                            shadow-sm
                                            text-amber-500
                                            text-2xl
                                            font-bold
                                        "
                                    >
                                        +
                                    </div>

                                    <p
                                        className="
                                            font-bold
                                            text-lg
                                            text-slate-700
                                        "
                                    >
                                        Clique para adicionar
                                        uma imagem ou vídeo
                                    </p>

                                    <p
                                        className="
                                            text-sm
                                            text-slate-500
                                            mt-2
                                        "
                                    >
                                        Limite máximo:
                                        {' '}
                                        {FILE_CONFIG.MAX_SIZE_MB}
                                        {' '}
                                        MB
                                    </p>
                                </div>
                            )}
                        </div>

                        <div
                            className="
                                bg-amber-50/50
                                p-5
                                rounded-xl
                                border
                                border-amber-100
                                text-sm
                            "
                        >
                            <label
                                className="
                                    flex
                                    items-start
                                    gap-3
                                    cursor-pointer
                                "
                            >
                                <input
                                    type="checkbox"
                                    required
                                    checked={
                                        sessao.dados
                                            .lgpd
                                    }
                                    onChange={e =>
                                        atualizarDados(
                                            'lgpd',
                                            e.target.checked
                                        )
                                    }
                                    className="
                                        mt-1
                                        w-5
                                        h-5
                                        text-amber-500
                                        border-gray-300
                                        rounded
                                        focus:ring-amber-500
                                    "
                                />

                                <span
                                    className="
                                        text-slate-700
                                        leading-relaxed
                                    "
                                >
                                    <strong>
                                        Consentimento (LGPD):
                                    </strong>{' '}
                                    Autorizo a coleta e uso
                                    dos meus dados (nome,
                                    telefone e endereço)
                                    exclusivamente para a
                                    realização do orçamento
                                    e contato referente a
                                    este serviço.
                                </span>
                            </label>
                        </div>

                        <div
                            className="
                                flex
                                gap-4
                                pt-4
                            "
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    voltarEtapa(4)
                                }
                                disabled={enviando}
                                className="
                                    px-6
                                    py-4
                                    border-2
                                    border-gray-200
                                    rounded-xl
                                    text-slate-600
                                    font-bold
                                    hover:bg-gray-50
                                    disabled:opacity-50
                                    transition-colors
                                "
                            >
                                Voltar
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    enviando ||
                                    !sessao.dados.lgpd
                                }
                                className="
                                    flex-1
                                    bg-green-600
                                    text-white
                                    font-bold
                                    text-lg
                                    py-4
                                    rounded-xl
                                    shadow-lg
                                    hover:bg-green-500
                                    hover:shadow-green-500/30
                                    transition-all
                                    disabled:opacity-50
                                    disabled:grayscale
                                    flex
                                    justify-center
                                    items-center
                                "
                            >
                                {enviando
                                    ? 'Processando e Enviando...'
                                    : 'Finalizar e Enviar via WhatsApp'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogoServicos } from '../data/catalogo';
import { API_CONFIG, STORAGE_KEYS, MESSAGES } from '../config/constants';

export default function Atendimento() {
  const navigate = useNavigate();

  /* =========================================================
     PERFIL DO CLIENTE
     Guarda SOMENTE os dados da primeira etapa.
  ========================================================= */

  const getPerfilSalvo = () => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEYS.CLIENTE_PERFIL);

      if (salvo) {
        return JSON.parse(salvo);
      }
    } catch (error) {
      console.error('❌ Erro ao ler perfil salvo:', error);
      localStorage.removeItem(STORAGE_KEYS.CLIENTE_PERFIL);
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


  /* =========================================================
     PERFIL INICIAL
  ========================================================= */

  const perfil = getPerfilSalvo();


  /* =========================================================
     CRIA ESTADO LIMPO
     
     A primeira etapa vem preenchida com o perfil salvo.
     Todas as outras etapas começam vazias.
  ========================================================= */

  const criarEstadoInicial = (perfilAtual = getPerfilSalvo()) => ({
    etapa: 1,

    dados: {
      rotaEscolhida: 'Bot',

      // PRIMEIRA ETAPA — fica salva
      nome: perfilAtual.nome || '',
      telefone: perfilAtual.telefone || '',
      cep: perfilAtual.cep || '',
      logradouro: perfilAtual.logradouro || '',
      numero: perfilAtual.numero || '',
      bairro: perfilAtual.bairro || '',
      cidade: perfilAtual.cidade || '',

      // DEMAIS ETAPAS — sempre zeradas
      categoriaKey: '',
      categoria: '',
      servicoEspecifico: '',
      descricaoServico: '',
      orcamentoMedio: '',
      observacoes: '',
      enviouMidia: 'Não',
      arquivoPreview: null,
      mimetype: '',
      filename: '',
      lgpd: false
    }
  });


  const estadoInicial = criarEstadoInicial(perfil);


  /* =========================================================
     SESSÃO
  ========================================================= */

  const [sessao, setSessao] = useState(() => {

    try {

      const salvo =
        sessionStorage.getItem(
          STORAGE_KEYS.SESSAO_ATIVA
        );

      if (salvo) {

        const sessaoSalva =
          JSON.parse(salvo);

        if (sessaoSalva.etapa === 5) {

          console.log(
            '🧹 Sessão antiga da etapa 5 descartada.'
          );

          sessionStorage.removeItem(
            STORAGE_KEYS.SESSAO_ATIVA
          );

          return criarEstadoInicial(
            getPerfilSalvo()
          );
        }

        if (
          sessaoSalva.etapa >= 1 &&
          sessaoSalva.etapa <= 4
        ) {

          console.log(
            `🔄 Recuperando sessão na etapa ${sessaoSalva.etapa}`
          );

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

    return criarEstadoInicial(
      getPerfilSalvo()
    );
  });


  /* =========================================================
     ESTADOS DA INTERFACE
  ========================================================= */

  const [enviando, setEnviando] = useState(false);


  /* =========================================================
     SALVAR SESSÃO

     IMPORTANTE:
     A sessão continua sendo salva enquanto o usuário
     preenche o formulário.

     Depois da finalização, será substituída por uma
     sessão limpa na etapa 1.
  ========================================================= */

  useEffect(() => {

    try {

      /*
       * A etapa 5 NÃO deve ser gravada como sessão recuperável.
       *
       * Porém, isso NÃO muda o estado atual da tela.
       * Então o usuário pode escolher a foto normalmente
       * e continuar na etapa 5.
       */

      if (sessao.etapa === 5) {

        sessionStorage.removeItem(
          STORAGE_KEYS.SESSAO_ATIVA
        );

        console.log(
          '📌 Etapa 5 ativa: sessão temporária não persistida.'
        );

        return;
      }

      /*
       * Etapas 1, 2, 3 e 4 podem ser recuperadas.
       */

      const sessaoPersistivel = {
        etapa: sessao.etapa,

        dados: {
          ...sessao.dados,

          /*
           * Nunca salvar a foto Base64.
           */
          arquivoPreview: null,
          mimetype: '',
          filename: ''
        }
      };

      sessionStorage.setItem(
        STORAGE_KEYS.SESSAO_ATIVA,
        JSON.stringify(sessaoPersistivel)
      );

    } catch (error) {

      console.error(
        '❌ Erro ao salvar sessão:',
        error
      );
    }

  }, [sessao]);



  /* =========================================================
     ATUALIZAR DADOS
  ========================================================= */

  const atualizarDados = (chave, valor) => {

    setSessao(prev => ({
      ...prev,
      dados: {
        ...prev.dados,
        [chave]: valor
      }
    }));

  };


  /* =========================================================
     MÁSCARA TELEFONE
  ========================================================= */

  const aplicarMascaraTelefone = (valor) => {

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


  /* =========================================================
     NAVEGAÇÃO ENTRE ETAPAS
  ========================================================= */

  const proximaEtapa = (nova) => {

    setSessao(prev => ({
      ...prev,
      etapa: nova
    }));

  };


  const voltarEtapa = (nova) => {

    setSessao(prev => ({
      ...prev,
      etapa: nova
    }));

  };


  /* =========================================================
     RESET DO FORMULÁRIO
     
     MUITO IMPORTANTE:
     
     Depois de enviar um pedido:
     - mantém primeira etapa
     - apaga serviço
     - apaga categoria
     - apaga observações
     - apaga foto
     - apaga LGPD
     - volta para etapa 1
     
     O perfil continua salvo em @larForteCliente.
  ========================================================= */




  /* =========================================================
     CONFIRMAÇÃO DO MODAL
     
     Depois do OK:
     → fecha modal
     → vai para HOME
  ========================================================= */




  /* =========================================================
     BUSCA CEP
  ========================================================= */

  const buscarCep = async (cepDigitado) => {

    const cepLimpo =
      cepDigitado.replace(/\D/g, '');

    atualizarDados(
      'cep',
      cepLimpo
    );

    if (cepLimpo.length === 8) {

      try {

        const res = await fetch(
          `https://viacep.com.br/ws/${cepLimpo}/json/`
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
            .getElementById('numero-input')
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


  /* =========================================================
     UPLOAD DE ARQUIVO
  ========================================================= */

  const handleFileUpload = (e) => {

    const file =
      e.target.files[0];

    if (file) {

      const reader =
        new FileReader();

      reader.onloadend = () => {

        atualizarDados(
          'enviouMidia',
          'Sim'
        );

        atualizarDados(
          'arquivoPreview',
          reader.result
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

      reader.readAsDataURL(file);

    } else {

      atualizarDados(
        'enviouMidia',
        'Não'
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

    }
  };


  /* =========================================================
     FINALIZAR ATENDIMENTO
  ========================================================= */

  const finalizarAtendimento = async (e) => {

    e.preventDefault();

    if (enviando) {
      return;
    }

    setEnviando(true);

    console.log('');
    console.log('======================================');
    console.log('➡️ INICIANDO ENVIO DO ORÇAMENTO');
    console.log('======================================');

    const payloadParaBot = {
      ...sessao.dados,

      endereco:
        `${sessao.dados.logradouro}, ` +
        `${sessao.dados.numero} - ` +
        `${sessao.dados.bairro}, ` +
        `${sessao.dados.cidade}`
    };

    try {

      console.log(
        '📤 Enviando para:',
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ATENDIMENTO}`
      );

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ATENDIMENTO}`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify(payloadParaBot)
        }
      );

      console.log(
        '📦 Status:',
        response.status
      );

      let result = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      console.log(
        '📄 Resposta:',
        result
      );

      if (response.ok) {

        console.log(
          '✅ PEDIDO RECEBIDO PELO SERVIDOR.'
        );

        /* =================================================
           SALVAR PERFIL
        ================================================= */

        const perfilParaSalvar = {
          nome: sessao.dados.nome || '',
          telefone: sessao.dados.telefone || '',
          cep: sessao.dados.cep || '',
          logradouro: sessao.dados.logradouro || '',
          numero: sessao.dados.numero || '',
          bairro: sessao.dados.bairro || '',
          cidade: sessao.dados.cidade || ''
        };

        localStorage.setItem(
          STORAGE_KEYS.CLIENTE_PERFIL,
          JSON.stringify(perfilParaSalvar)
        );

        console.log(
          '💾 Perfil salvo.'
        );

        /* =================================================
           FINALIZOU O ORÇAMENTO
        ================================================= */

        sessionStorage.removeItem(
          STORAGE_KEYS.SESSAO_ATIVA
        );

        sessionStorage.setItem(
          STORAGE_KEYS.PEDIDO_ENVIADO,
          'true'
        );

        console.log(
          '🧹 Sessão removida.'
        );

        console.log(
          '📢 Aviso preparado para a Home.'
        );

        /* =================================================
           HOME
        ================================================= */

        navigate('/');

        return;
      }

      /* =====================================================
         ERRO DO SERVIDOR
      ===================================================== */

      console.error(
        '❌ SERVIDOR RETORNOU ERRO:',
        result.erro
      );

      window.alert(
        MESSAGES.ERROR.SERVER + '\n\n' +
        (
          result.erro ||
          'Tente novamente.'
        )
      );

    } catch (error) {

      console.error(
        '💥 ERRO DE CONEXÃO:',
        error
      );

      window.alert(
        MESSAGES.ERROR.CONNECTION
      );

    } finally {

      setEnviando(false);

      console.log(
        '🏁 Processo de envio encerrado.'
      );
    }
  };


  /* =========================================================
     RENDER
  ========================================================= */

  return (

    <div className="min-h-screen bg-slate-50 py-10 px-4">

      {/* =====================================================
          FORMULÁRIO
      ===================================================== */}

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


        {/* ===================================================
            CABEÇALHO
        =================================================== */}

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
              mt-1
              md:mt-0
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


        {/* ===================================================
            ETAPA 1
        =================================================== */}

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
                  value={sessao.dados.nome}
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
                  value={sessao.dados.telefone}
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
                  value={sessao.dados.cep}
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
                  value={sessao.dados.logradouro}
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
                  value={sessao.dados.numero}
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
                  value={sessao.dados.bairro}
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
                  value={sessao.dados.cidade}
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


        {/* ===================================================
            ETAPA 2
        =================================================== */}

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
                          cat.itens["1"];

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

                        proximaEtapa(4);

                      } else {

                        proximaEtapa(3);

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


        {/* ===================================================
            ETAPA 3
        =================================================== */}

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
              Escolha o serviço de {sessao.dados.categoria}:
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
                  sessao.dados.categoriaKey
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

                      proximaEtapa(4);

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


        {/* ===================================================
            ETAPA 4
        =================================================== */}

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
                {sessao.dados.servicoEspecifico}
              </p>

              <p
                className="
                  text-sm
                  text-slate-300
                  mt-1
                "
              >
                Estimativa: {sessao.dados.orcamentoMedio}
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
              Se quiser, descreva um pouco mais sobre o problema.
            </p>


            <textarea
              rows="4"
              placeholder="Ex: O chuveiro desarmou a chave e tem cheiro de queimado..."
              value={
                sessao.dados.observacoes
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
                    sessao.dados.categoriaKey === '6' ||
                    sessao.dados.categoriaKey === '7'
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


        {/* ===================================================
            ETAPA 5
        =================================================== */}

        {sessao.etapa === 5 && (

          <form
            onSubmit={finalizarAtendimento}
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
              Isso ajuda muito na precisão do orçamento. (Opcional)
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
                onChange={handleFileUpload}
                accept="image/*,video/*"
                className="
                  absolute
                  inset-0
                  w-full
                  h-full
                  opacity-0
                  cursor-pointer
                  z-10
                "
              />


              {sessao.dados.arquivoPreview ? (

                <div
                  className="
                    flex
                    flex-col
                    items-center
                  "
                >

                  {sessao.dados.mimetype?.startsWith('video/') ? (

                    <video
                      src={sessao.dados.arquivoPreview}
                      controls
                      className="
                        h-48
                        w-full
                        max-w-md
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
                        sessao.dados.arquivoPreview
                      }
                      alt="Preview"
                      className="
                        h-48
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
                      group-hover:underline
                    "
                  >
                    Clique para trocar o arquivo
                  </span>

                </div>

              ) : (

                <div className="py-8">

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
                      text-slate-400
                      group-hover:text-amber-500
                      transition-colors
                    "
                  >

                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >

                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />

                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />

                    </svg>

                  </div>


                  <p
                    className="
                      text-slate-700
                      font-bold
                    "
                  >
                    Toque aqui para anexar
                  </p>


                  <p
                    className="
                      text-sm
                      text-slate-400
                      mt-1
                    "
                  >
                    Formatos suportados: JPG, PNG, MP4
                  </p>

                </div>

              )}

            </div>


            {/* LGPD */}

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
                    sessao.dados.lgpd
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

                  Autorizo a coleta e uso dos meus
                  dados (nome, telefone e endereço)
                  exclusivamente para a realização
                  do orçamento e contato referente
                  a este serviço.

                </span>

              </label>

            </div>


            {/* BOTÕES */}

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
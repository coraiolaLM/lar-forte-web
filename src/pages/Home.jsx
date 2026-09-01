import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Droplets, PaintRoller, Hammer, PenTool, CheckCircle, ShieldCheck, Clock } from 'lucide-react';
import { STORAGE_KEYS } from '../config/constants';

export default function Home() {
  const [pedidoEnviado, setPedidoEnviado] = useState(false);

  useEffect(() => {
    const pedidoEnviadoAgora = sessionStorage.getItem(STORAGE_KEYS.PEDIDO_ENVIADO);

    if (pedidoEnviadoAgora === 'true') {
      console.log('✅ Pedido enviado detectado na Home.');
      sessionStorage.removeItem(STORAGE_KEYS.PEDIDO_ENVIADO);
      setPedidoEnviado(true);
    }
  }, []);

  const servicosDestaque = [
    { icone: <Zap size={32} />, titulo: "Elétrica", desc: "Chuveiros, tomadas, quadros de distribuição." },
    { icone: <Droplets size={32} />, titulo: "Hidráulica", desc: "Vazamentos, torneiras e reparos gerais." },
    { icone: <PaintRoller size={32} />, titulo: "Pintura", desc: "Acabamento impecável interno e externo." },
    { icone: <Hammer size={32} />, titulo: "Serralheria", desc: "Portões, grades e estruturas metálicas." },
    { icone: <PenTool size={32} />, titulo: "Montagens", desc: "Móveis, prateleiras e suportes de TV." }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {pedidoEnviado && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 3" />
              </svg>
            </div>

            <h2 className="text-3xl font-black text-slate-900">
              Pedido enviado!
            </h2>

            <p className="mt-4 text-slate-600 leading-relaxed">
              Recebemos seu pedido de orçamento com sucesso.
              <br />
              <br />
              Nossa equipe já foi avisada e entrará em contato em breve pelo WhatsApp.
            </p>

            <button
              type="button"
              onClick={() => setPedidoEnviado(false)}
              className="mt-7 w-full rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-emerald-500"
            >
              OK
            </button>
          </div>
        </div>
      )}
      
      {/* Hero Section */}
      <section className="bg-slate-900 text-white py-16 md:py-24 px-4 relative overflow-hidden">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-10 relative z-10">
          <div className="md:w-1/2 space-y-6">
            <div className="inline-block bg-amber-500 text-slate-900 font-bold px-3 py-1 rounded-full text-sm mb-2">
              Curitiba e Região
            </div>
            <h1 className="text-4xl md:text-6xl font-black leading-tight">
              MARIDO DE <span className="text-amber-500">ALUGUEL</span>
            </h1>
            <p className="text-xl text-gray-300 border-l-4 border-amber-500 pl-4">
              A solução completa para sua casa. Soluções rápidas, práticas e confiáveis para qualquer problema.
            </p>
            <div className="pt-4">
              <Link to="/atendimento" className="bg-amber-500 text-slate-900 text-lg font-bold px-8 py-4 rounded-xl shadow-lg hover:bg-amber-400 transition-all flex items-center justify-center gap-2 inline-flex">
                Chama no WhatsApp
              </Link>
            </div>
          </div>
          
          <div className="md:w-1/2 flex justify-center">
            {/* Aqui você pode colocar uma das imagens ilustrativas da equipe trabalhando */}
            <div className="bg-slate-800 p-6 rounded-2xl border-2 border-slate-700 shadow-2xl transform rotate-2">
              <div className="grid grid-cols-2 gap-4 text-center text-sm font-bold text-amber-500">
                <div className="bg-slate-900 p-4 rounded-lg flex flex-col items-center gap-2">
                  <ShieldCheck size={28} /> Confiança
                </div>
                <div className="bg-slate-900 p-4 rounded-lg flex flex-col items-center gap-2">
                  <CheckCircle size={28} /> Qualidade
                </div>
                <div className="bg-slate-900 p-4 rounded-lg flex flex-col items-center gap-2 col-span-2">
                  <Clock size={28} /> Atendimento Rápido
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Serviços Section */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Nossos Principais Serviços</h2>
          <p className="text-gray-600">Pequenos reparos, grandes soluções!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicosDestaque.map((serv, index) => (
            <div key={index} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-500 transition group">
              <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center text-slate-900 group-hover:bg-amber-500 group-hover:text-white transition mb-4">
                {serv.icone}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{serv.titulo}</h3>
              <p className="text-gray-600 mb-4">{serv.desc}</p>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <Link to="/catalogo" className="text-slate-900 font-bold underline hover:text-amber-500 transition">
            Ver catálogo completo de serviços &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}
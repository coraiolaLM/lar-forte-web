import { Link } from 'react-router-dom';
import { ShieldCheck, Target, Clock, Wrench, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Sobre() {
  const valores = [
    {
      icone: <ShieldCheck className="w-10 h-10 text-amber-500" />,
      titulo: "Confiança Absoluta",
      desc: "Sabemos que sua casa é seu porto seguro. Trabalhamos com transparência, respeito e total segurança em cada visita."
    },
    {
      icone: <Wrench className="w-10 h-10 text-amber-500" />,
      titulo: "Qualidade Garantida",
      desc: "Não fazemos 'gambiarras'. Utilizamos ferramentas adequadas e materiais de primeira para um acabamento impecável e duradouro."
    },
    {
      icone: <Clock className="w-10 h-10 text-amber-500" />,
      titulo: "Agilidade e Pontualidade",
      desc: "Seu tempo é valioso. Chegamos no horário combinado e entregamos as soluções com rapidez, sem enrolação."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* Hero Section - Sobre */}
      <section className="bg-slate-900 text-white py-16 md:py-24 px-4 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold px-4 py-1.5 rounded-full text-sm mb-6">
            <Target size={18} /> Muito mais que pequenos reparos
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-6">
            A Solução Completa para <span className="text-amber-500">Sua Casa</span>
          </h1>
          <p className="text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
            A Lar Forte nasceu para transformar a maneira como você cuida do seu imóvel em Curitiba e Região Metropolitana.
          </p>
        </div>
      </section>

      {/* Nossa História / Missão */}
      <section className="py-16 md:py-20 px-4 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row gap-12 items-center">
          <div className="md:w-1/2 space-y-6">
            <h2 className="text-3xl font-bold text-slate-900">Por que escolher a Lar Forte?</h2>
            <div className="space-y-4 text-slate-600 leading-relaxed text-lg">
              <p>
                Encontrar mão de obra qualificada, pontual e de confiança sempre foi um desafio. Foi entendendo essa dor que a <strong>Lar Forte</strong> surgiu.
              </p>
              <p>
                Nosso objetivo é simples: ser o seu contato de emergência e de confiança para qualquer necessidade do lar. Desde uma simples troca de chuveiro até a montagem de móveis e pintura completa.
              </p>
              <ul className="space-y-3 pt-2">
                <li className="flex items-center gap-3 text-slate-800 font-medium">
                  <CheckCircle2 className="text-green-500 w-6 h-6 flex-shrink-0" />
                  Profissionais altamente qualificados.
                </li>
                <li className="flex items-center gap-3 text-slate-800 font-medium">
                  <CheckCircle2 className="text-green-500 w-6 h-6 flex-shrink-0" />
                  Atendimento em toda Curitiba e Região.
                </li>
                <li className="flex items-center gap-3 text-slate-800 font-medium">
                  <CheckCircle2 className="text-green-500 w-6 h-6 flex-shrink-0" />
                  Preço justo e sem surpresas no final.
                </li>
              </ul>
            </div>
          </div>
          
          <div className="md:w-1/2 relative">
            <div className="absolute inset-0 bg-amber-500 rounded-2xl transform translate-x-4 translate-y-4 opacity-50"></div>
            <div className="bg-slate-800 rounded-2xl p-8 relative z-10 border border-slate-700 shadow-xl flex flex-col justify-center items-center h-full min-h-[300px] text-center">
               <h3 className="text-2xl font-black text-white mb-2">Nossa Missão</h3>
               <p className="text-amber-500 font-medium text-lg mb-6">Simplificar a sua vida.</p>
               <p className="text-slate-300 italic">
                 "Garantir que cada cliente sinta orgulho e tranquilidade de estar em casa, sabendo que tudo está funcionando perfeitamente."
               </p>
            </div>
          </div>
        </div>
      </section>

      {/* Nossos Pilares (Cards) */}
      <section className="bg-slate-100 py-16 md:py-24 px-4 border-t border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Os Pilares da Lar Forte</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">O que nos guia todos os dias para entregar o melhor serviço para a sua família.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {valores.map((valor, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-amber-300 transition-all group">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {valor.icone}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{valor.titulo}</h3>
                <p className="text-slate-600 leading-relaxed">{valor.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto bg-slate-900 rounded-3xl p-8 md:p-12 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4 relative z-10">Precisa de ajuda agora?</h2>
          <p className="text-lg text-slate-300 mb-8 relative z-10 max-w-xl mx-auto">
            Não adie mais aquele reparo. Fale com a gente e descubra como é fácil resolver os problemas da sua casa.
          </p>
          <Link to="/atendimento" className="inline-flex items-center justify-center gap-2 bg-amber-500 text-slate-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-amber-400 transition-all shadow-lg hover:shadow-amber-500/30 transform hover:-translate-y-1 relative z-10">
            Chamar no WhatsApp <ArrowRight size={22} />
          </Link>
        </div>
      </section>
      
    </div>
  );
}
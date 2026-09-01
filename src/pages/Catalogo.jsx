import { useState } from 'react';
import { catalogoServicos } from '../data/catalogo';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

export default function Catalogo() {
  // Estado para controlar quais categorias estão abertas (sanfona/accordion)
  const [categoriasAbertas, setCategoriasAbertas] = useState({});

  const toggleCategoria = (chave) => {
    setCategoriasAbertas(prev => ({
      ...prev,
      [chave]: !prev[chave]
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header do Catálogo */}
      <div className="bg-slate-900 text-white py-12 px-4 text-center border-b-4 border-amber-500">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 animate-fade-in">Catálogo de Serviços</h1>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Transparência nos preços e qualidade no serviço. Utilizamos materiais de qualidade e técnicas profissionais.
        </p>
      </div>

      {/* Lista de Serviços */}
      <div className="max-w-4xl mx-auto mt-12 px-4 space-y-6">
        {Object.entries(catalogoServicos).map(([chave, categoria]) => {
          const isOpen = categoriasAbertas[chave];

          return (
            <div key={chave} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-md">
              {/* Botão da Categoria */}
              <button 
                onClick={() => toggleCategoria(chave)}
                className="w-full bg-slate-100 px-6 py-5 flex justify-between items-center hover:bg-amber-50 transition-colors focus:outline-none"
              >
                <h2 className="text-xl font-bold text-slate-900">{categoria.nome}</h2>
                <div className="text-slate-500">
                  {isOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </div>
              </button>
              
              {/* Itens da Categoria (Exibidos apenas se isOpen for true) */}
              {isOpen && (
                <div className="p-0 animate-fade-in">
                  <ul className="divide-y divide-gray-100">
                    {Object.entries(categoria.itens).map(([keyItem, item]) => (
                      <li key={keyItem} className="flex flex-col md:flex-row justify-between p-6 hover:bg-slate-50 transition-colors">
                        <div className="md:w-2/3 mb-3 md:mb-0 pr-4">
                          <h3 className="text-lg font-semibold text-slate-800">{item.nome}</h3>
                          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                        </div>
                        <div className="md:w-1/3 flex items-center justify-start md:justify-end">
                          <span className="inline-block bg-amber-100 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm border border-amber-200 shadow-sm whitespace-nowrap">
                            {item.preco}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}

        {/* CTA Inferior */}
        <div className="mt-16 bg-slate-900 rounded-2xl p-8 text-center text-white shadow-xl transform transition-transform hover:-translate-y-1">
          <h3 className="text-2xl font-bold mb-4">Precisa de um orçamento específico?</h3>
          <p className="mb-6 text-gray-300">Pequenos reparos ou grandes soluções, pode contar com a Lar Forte!</p>
          <Link to="/atendimento" className="inline-flex items-center gap-2 bg-amber-500 text-slate-900 px-8 py-4 rounded-xl font-bold hover:bg-amber-400 transition-all shadow-lg">
            Agendar Atendimento <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Home,
  MessageSquare,
  Menu,
  X
} from 'lucide-react';
import { ROUTES } from '../config/constants';

export default function Navbar() {
  const [menuAberto, setMenuAberto] = useState(false);

  const fecharMenu = () => {
    setMenuAberto(false);
  };

  return (
    <nav className="relative bg-slate-900 text-white shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <Link
            to={ROUTES.HOME}
            onClick={fecharMenu}
            className="flex items-center gap-2"
          >
            <Home className="text-amber-500 w-8 h-8" />

            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-wider leading-none">
                LarForte
              </span>

              <span className="text-[0.65rem] tracking-[0.2em] text-amber-500 font-semibold uppercase">
                Soluções para casa
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8 font-medium">
            <Link
              to={ROUTES.HOME}
              className="hover:text-amber-500 transition"
            >
              Início
            </Link>

            <Link
              to={ROUTES.CATALOGO}
              className="hover:text-amber-500 transition"
            >
              Catálogo
            </Link>

            <Link
              to={ROUTES.SOBRE}
              className="hover:text-amber-500 transition"
            >
              Sobre Nós
            </Link>
          </div>

          <Link
            to={ROUTES.ATENDIMENTO}
            className="
              hidden
              md:flex
              items-center
              gap-2
              bg-amber-500
              text-slate-900
              px-5
              py-2.5
              rounded-lg
              font-bold
              hover:bg-amber-400
              transition
              transform
              hover:scale-105
            "
          >
            <MessageSquare className="w-5 h-5" />
            Solicitar Orçamento
          </Link>

          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() =>
                setMenuAberto(!menuAberto)
              }
              className="
                text-amber-500
                p-2
                focus:outline-none
                hover:bg-slate-800
                rounded-lg
                transition
              "
            >
              {menuAberto ? (
                <X className="w-8 h-8" />
              ) : (
                <Menu className="w-8 h-8" />
              )}
            </button>
          </div>
        </div>
      </div>

      {menuAberto && (
        <div
          className="
            md:hidden
            bg-slate-900
            border-t
            border-slate-800
            absolute
            w-full
            shadow-2xl
            animate-fade-in
          "
        >
          <div
            className="
              flex
              flex-col
              px-6
              pt-4
              pb-8
              space-y-2
            "
          >
            <Link
              to={ROUTES.HOME}
              onClick={fecharMenu}
              className="
                block
                text-lg
                font-medium
                text-white
                hover:text-amber-500
                py-3
                border-b
                border-slate-800
              "
            >
              Início
            </Link>

            <Link
              to={ROUTES.CATALOGO}
              onClick={fecharMenu}
              className="
                block
                text-lg
                font-medium
                text-white
                hover:text-amber-500
                py-3
                border-b
                border-slate-800
              "
            >
              Catálogo de Serviços
            </Link>

            <Link
              to={ROUTES.SOBRE}
              onClick={fecharMenu}
              className="
                block
                text-lg
                font-medium
                text-white
                hover:text-amber-500
                py-3
                border-b
                border-slate-800
              "
            >
              Sobre Nós
            </Link>

            <Link
              to={ROUTES.ATENDIMENTO}
              onClick={fecharMenu}
              className="
                flex
                items-center
                justify-center
                gap-2
                bg-amber-500
                text-slate-900
                px-5
                py-4
                rounded-xl
                font-bold
                hover:bg-amber-400
                transition
                mt-6
                text-lg
                shadow-lg
              "
            >
              <MessageSquare className="w-6 h-6" />
              Solicitar Orçamento
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Sobre from './pages/Sobre';
import Atendimento from './pages/Atendimento';
import Catalogo from './pages/Catalogo';
import { ROUTES } from './config/constants';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route
          path={ROUTES.HOME}
          element={<Home />}
        />

        <Route
          path={ROUTES.SOBRE}
          element={<Sobre />}
        />

        <Route
          path={ROUTES.ATENDIMENTO}
          element={<Atendimento />}
        />

        <Route
          path={ROUTES.CATALOGO}
          element={<Catalogo />}
        />
      </Routes>
    </BrowserRouter>
  );
}
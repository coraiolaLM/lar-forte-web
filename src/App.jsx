import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar"; // <-- Importando o novo Navbar
import Home from "./pages/Home";
import Sobre from "./pages/Sobre";
import Atendimento from "./pages/Atendimento";
import Catalogo from "./pages/Catalogo";

export default function App() {
  return (
    <BrowserRouter>
      {/* O Navbar fica fora do Routes para aparecer em todas as telas */}
      <Navbar />
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sobre" element={<Sobre />} />
        <Route path="/atendimento" element={<Atendimento />} />
        <Route path="/catalogo" element={<Catalogo />} />
      </Routes>
    </BrowserRouter>
  );
}
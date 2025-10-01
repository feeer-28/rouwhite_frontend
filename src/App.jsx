import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DashboardDespachador from "./pages/despachador/DashboardDespachador";
import GestionRutas from "./pages/despachador/GestionRutas"; // ✅ nueva vista

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta principal del despachador */}
        <Route path="/despachador" element={<DashboardDespachador />} />

        {/* Ruta para gestión de rutas */}
        <Route path="/despachador/rutas" element={<GestionRutas />} />
      </Routes>
    </Router>
  );
}

export default App;

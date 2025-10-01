import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DashboardDespachador from "./pages/despachador/DashboardDespachador";
import GestionRutas from "./pages/despachador/GestionRutas"; // ✅ vista de rutas
import GestionConductores from "./pages/despachador/GestionConductores"; // ✅ vista de conductores

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta principal del despachador */}
        <Route path="/despachador" element={<DashboardDespachador />} />

        {/* Ruta para gestión de rutas */}
        <Route path="/despachador/rutas" element={<GestionRutas />} />

        {/* Ruta para gestión de conductores */}
        <Route path="/despachador/conductores" element={<GestionConductores />} />
      </Routes>
    </Router>
  );
}

export default App;

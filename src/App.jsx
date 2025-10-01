import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DashboardDespachador from "./pages/despachador/DashboardDespachador";

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta principal del despachador */}
        <Route path="/despachador" element={<DashboardDespachador />} />
      </Routes>
    </Router>
  );
}

export default App;

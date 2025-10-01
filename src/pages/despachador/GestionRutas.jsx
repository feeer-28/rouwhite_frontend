import React, { useEffect, useState } from "react";
import { Button, Form, InputGroup } from "react-bootstrap";
import { FaEdit, FaPlus, FaSearch, FaEye, FaToggleOn, FaToggleOff } from "react-icons/fa";
import DataTable from "react-data-table-component";
import layoutStyles from "../../pages/despachador/sidebar/sidebar.module.css";
import SiderDespachador from "../../pages/despachador/sidebar/SiderDespachador";

const GestionRutas = () => {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setRutas([
        { id: 1, nombre: "Ruta Norte", destino: "Terminal de Popayán", estado: "activo" },
        { id: 2, nombre: "Ruta Sur", destino: "Universidad del Cauca", estado: "pendiente" },
        { id: 3, nombre: "Ruta Centro", destino: "Parque Caldas", estado: "activo" },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  const handleCrearRuta = async (nuevaRuta) => {
    try {
      // const response = await fetch("/api/rutas", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(nuevaRuta),
      // });
      // const data = await response.json();
      // setRutas([...rutas, data]);

      setRutas([...rutas, nuevaRuta]);
    } catch (error) {
      console.error("Error al crear ruta:", error);
    }
  };

  const rutasFiltradas = rutas.filter((r) => {
    const term = busqueda.toLowerCase();
    return (
      r.nombre.toLowerCase().includes(term) ||
      r.destino.toLowerCase().includes(term)
    );
  });

  const columns = [
    {
      name: "Nombre",
      selector: (row) => row.nombre,
      sortable: true,
    },
    {
      name: "Destino",
      selector: (row) => row.destino,
      sortable: true,
    },
    {
      name: "Estado",
      cell: (row) => (
        <span className={`badge ${row.estado === "activo" ? "bg-success" : "bg-secondary"}`}>
          {row.estado}
        </span>
      ),
    },
    {
      name: "Acciones",
      cell: (row) => (
        <div className="d-flex gap-2">
          <Button size="sm" variant="outline-info">
            <FaEye />
          </Button>
          <Button size="sm" variant="outline-primary">
            <FaEdit />
          </Button>
          <Button
            size="sm"
            variant={row.estado === "activo" ? "outline-danger" : "outline-success"}
          >
            {row.estado === "activo" ? <FaToggleOff /> : <FaToggleOn />}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <SiderDespachador onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className={`${layoutStyles.mainContent} ${sidebarOpen ? layoutStyles.withSidebar : ""}`}>
        <div className="container py-4">
          <div className="mb-4">
            <h2 className="fw-bold">Gestión de Rutas</h2>
            <p className="text-muted">
              Administra las rutas urbanas activas, pendientes y sus destinos.
            </p>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
            <div style={{ minWidth: "280px" }}>
              <InputGroup>
                <InputGroup.Text className="bg-white">
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="search"
                  placeholder="Buscar ruta o destino..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </InputGroup>
            </div>
            <Button variant="primary" onClick={() => setMostrarCrear(true)}>
              <FaPlus className="me-2" /> Nueva Ruta
            </Button>
          </div>

          <div className="border rounded p-3 bg-white shadow-sm">
            <DataTable
              columns={columns}
              data={rutasFiltradas}
              progressPending={loading}
              progressComponent={<div className="text-center">Cargando rutas...</div>}
              noDataComponent={<div className="text-muted text-center py-3">No hay rutas registradas</div>}
              pagination
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default GestionRutas;

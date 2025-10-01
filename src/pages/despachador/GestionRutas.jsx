import React, { useEffect, useState, Suspense } from "react";
import { Button, Form, InputGroup } from "react-bootstrap";
import { FaEdit, FaPlus, FaSearch, FaEye, FaToggleOn, FaToggleOff } from "react-icons/fa";
import DataTable from "react-data-table-component";
import layoutStyles from "../../pages/despachador/sidebar/sidebar.module.css";
import SiderDespachador from "../../pages/despachador/sidebar/SiderDespachador";
import CrearRuta from "../../pages/despachador/components/CrearRuta";

// Modal de previsualización (lazy + seguro)
const PrevisualizarRutaLazy = React.lazy(() =>
  import("../../pages/despachador/components/PrevisualizarRuta").catch(() => ({ default: () => null }))
);

const GestionRutas = () => {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewRuta, setPreviewRuta] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setRutas([
        {
          id: 1,
          nombre: "Ruta Norte",
          destino: "Terminal de Popayán",
          estado: "activo",
          empresa: "TransPopayán S.A.",
          origen: "Terminal de Popayán",
          paraderos: [
            { idParadero: 11, orden: 1, tipo: "ida", nombre: "Terminal de Popayán" },
            { idParadero: 12, orden: 2, tipo: "ida", nombre: "Loma Alta" },
            { idParadero: 13, orden: 1, tipo: "retorno", nombre: "Loma Alta" },
          ],
        },
        { id: 2, nombre: "Ruta Sur", destino: "Universidad del Cauca", estado: "pendiente", empresa: "Rutas del Cauca Ltda.", origen: "Parque Central", paraderos: [] },
        { id: 3, nombre: "Ruta Centro", destino: "Parque Caldas", estado: "activo", empresa: "Express Norte SAS", origen: "Centro", paraderos: [] },
      ]);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, []);

  const handleCrearRuta = (nuevaRuta) => {
    const nueva = {
      id: nuevaRuta.id ?? Date.now(),
      nombre: nuevaRuta.nombreRuta ?? nuevaRuta.nombre ?? `Ruta ${rutas.length + 1}`,
      destino: nuevaRuta.destino ?? (nuevaRuta.paraderos?.length ? "Varios paraderos" : "Sin destino"),
      estado: nuevaRuta.estado ?? "activo",
      empresa: nuevaRuta.empresa ?? "—",
      origen: nuevaRuta.origen ?? "—",
      paraderos: nuevaRuta.paraderos || [],
    };
    setRutas((prev) => [...prev, nueva]);
    setMostrarCrear(false);
  };

  const rutasFiltradas = rutas.filter((r) => {
    const term = (busqueda || "").toLowerCase();
    return (r.nombre || "").toLowerCase().includes(term) || (r.destino || "").toLowerCase().includes(term);
  });

  const buildPreviewRuta = (row) => {
    if (!row) return null;
    return {
      id: row.id ?? row.idRuta ?? `route-${Date.now()}`,
      nombre: row.nombre ?? "—",
      estado: row.estado ?? "—",
      empresa: row.empresa ?? "—",
      origen: row.origen ?? "—",
      destino: row.destino ?? "—",
      paraderos: Array.isArray(row.paraderos)
        ? row.paraderos.map((p, i) => ({
            idParadero: p.idParadero ?? p.id ?? i,
            orden: p.orden ?? p.Orden ?? i + 1,
            tipo: (p.tipo || p.Tipo || "").toString().toLowerCase(),
            nombre: p.nombre ?? p.nombreParadero ?? `Paradero ${p.idParadero ?? i + 1}`,
            lat: p.lat ?? p.latitude ?? null,
            lng: p.lng ?? p.longitude ?? null,
          }))
        : [],
    };
  };

  const handleView = (row) => {
    const preview = buildPreviewRuta(row);
    if (!preview) return alert("No hay datos para previsualizar.");
    setPreviewRuta(preview);
    setShowPreview(true);
  };

  const handleEdit = (row) => {
    console.log("Editar:", row);
  };

  const handleToggleEstado = (row) => {
    setRutas((prev) => prev.map((r) => (r.id === row.id ? { ...r, estado: r.estado === "activo" ? "inactivo" : "activo" } : r)));
  };

  const columns = [
    { name: "Nombre", selector: (row) => row.nombre, sortable: true },
    { name: "Destino", selector: (row) => row.destino, sortable: true },
    {
      name: "Estado",
      cell: (row) => <span className={`badge ${row.estado === "activo" ? "bg-success" : "bg-secondary"}`}>{row.estado}</span>,
    },
    {
      name: "Acciones",
      cell: (row) => (
        <div className="d-flex gap-2">
          <Button size="sm" variant="outline-info" title="Ver / Previsualizar" onClick={() => handleView(row)}>
            <FaEye />
          </Button>
          <Button size="sm" variant="outline-primary" title="Editar" onClick={() => handleEdit(row)}>
            <FaEdit />
          </Button>
          <Button
            size="sm"
            variant={row.estado === "activo" ? "outline-danger" : "outline-success"}
            title={row.estado === "activo" ? "Desactivar" : "Activar"}
            onClick={() => handleToggleEstado(row)}
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
            <p className="text-muted">Administra las rutas urbanas activas, pendientes y sus destinos.</p>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
            <div style={{ minWidth: "280px" }}>
              <InputGroup>
                <InputGroup.Text className="bg-white"><FaSearch /></InputGroup.Text>
                <Form.Control type="search" placeholder="Buscar ruta o destino..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </InputGroup>
            </div>

            <Button variant="primary" onClick={() => setMostrarCrear(true)}><FaPlus className="me-2" /> Nueva Ruta</Button>
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

      <CrearRuta show={mostrarCrear} onClose={() => setMostrarCrear(false)} onCrear={handleCrearRuta} />

      <Suspense fallback={null}>
        <PrevisualizarRutaLazy
          show={showPreview}
          onClose={() => {
            setShowPreview(false);
            setPreviewRuta(null);
          }}
          ruta={previewRuta}
          mapComponent={null}
        />
      </Suspense>
    </>
  );
};

export default GestionRutas;

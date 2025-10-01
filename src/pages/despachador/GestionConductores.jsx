import React, { useEffect, useState } from "react";
import { Button, Form, InputGroup } from "react-bootstrap";
import { FaEdit, FaPlus, FaSearch, FaEye, FaToggleOn, FaToggleOff } from "react-icons/fa";
import DataTable from "react-data-table-component";
import layoutStyles from "../../pages/despachador/sidebar/sidebar.module.css";
import SiderDespachador from "../../pages/despachador/sidebar/SiderDespachador";

// CONFIG para Vite: define VITE_API_BASE en .env si quieres usar API real
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const ENABLE_CREATE = false;
const ENABLE_UPDATE = false;
const ENABLE_PREVIEW = false;

const GestionConductores = () => {
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [showPreview, setShowPreview] = useState(false);
  const [previewConductor, setPreviewConductor] = useState(null);
  const [showActualizar, setShowActualizar] = useState(false);
  const [conductorSeleccionado, setConductorSeleccionado] = useState(null);

  useEffect(() => {
    // 🔥 Datos quemados adaptados al script SQL
    const datosQuemados = [
      {
        id: 1,
        nombre: "Nicolás López",
        documento: "10000003",
        telefono: "3100000003",
        rutaId: 1,
        rutaNombre: "Ruta Norte-Centro",
        online: true,
        ultimaActualizacion: Date.now() - 10000,
      },
      {
        id: 2,
        nombre: "Laura Martínez",
        documento: "10000004",
        telefono: "3100000004",
        rutaId: 2,
        rutaNombre: "Ruta Sur-Oriente",
        online: false,
        ultimaActualizacion: null,
      },
      {
        id: 3,
        nombre: "Carlos Gómez",
        documento: "10000005",
        telefono: "3100000005",
        rutaId: null,
        rutaNombre: "—",
        online: true,
        ultimaActualizacion: Date.now() - 600000,
      },
    ];

    const t = setTimeout(() => {
      setConductores(datosQuemados);
      setLoading(false);
    }, 300);

    return () => clearTimeout(t);
  }, []);

  const conductoresFiltrados = conductores.filter((c) => {
    const term = (busqueda || "").toLowerCase();
    return (
      (c.nombre || "").toLowerCase().includes(term) ||
      (c.documento || "").toLowerCase().includes(term) ||
      (c.rutaNombre || "").toLowerCase().includes(term)
    );
  });

  const buildPreviewConductor = (row) => {
    if (!row) return null;
    return {
      id: row.id,
      nombre: row.nombre ?? "—",
      documento: row.documento ?? "—",
      telefono: row.telefono ?? "—",
      rutaNombre: row.rutaNombre ?? "—",
      online: !!row.online,
      ultimaActualizacion: row.ultimaActualizacion ?? null,
    };
  };

  const handleView = (row) => {
    const preview = buildPreviewConductor(row);
    if (!preview) return alert("No hay datos para previsualizar.");
    setPreviewConductor(preview);
    setShowPreview(true);
  };

  const handleEdit = (row) => {
    if (!ENABLE_UPDATE) {
      setConductorSeleccionado(null);
      setShowActualizar(false);
      return;
    }
    setConductorSeleccionado(row);
    setShowActualizar(true);
  };

  const handleToggleOnline = () => {};

  const columns = [
    { name: "Nombre", selector: (row) => row.nombre, sortable: true },
    { name: "Documento", selector: (row) => row.documento, sortable: true },
    { name: "Teléfono", selector: (row) => row.telefono },
    { name: "Ruta asignada", selector: (row) => row.rutaNombre || "—", sortable: true },
    {
      name: "Conexión",
      cell: (row) => (
        <span className={`badge ${row.online ? "bg-success" : "bg-secondary"}`}>
          {row.online ? "En línea" : "Offline"}
        </span>
      ),
    },
    {
      name: "Acciones",
      cell: (row) => (
        <div className="d-flex gap-2">
          <Button size="sm" variant="outline-info" title="Ver detalles" onClick={() => handleView(row)}>
            <FaEye />
          </Button>
          <Button
            size="sm"
            variant="outline-primary"
            title={ENABLE_UPDATE ? "Actualizar" : "Actualizar (deshabilitado por rama)"}
            onClick={() => handleEdit(row)}
            disabled={!ENABLE_UPDATE}
          >
            <FaEdit />
          </Button>
          <Button
            size="sm"
            variant={row.online ? "outline-danger" : "outline-success"}
            title={row.online ? "Desconectar" : "Conectar"}
            onClick={handleToggleOnline}
            disabled={!ENABLE_UPDATE}
          >
            {row.online ? <FaToggleOff /> : <FaToggleOn />}
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
            <h2 className="fw-bold">Gestión de Conductores</h2>
            <p className="text-muted">Visualiza los conductores, su estado de conexión y la ruta asignada.</p>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
            <div style={{ minWidth: "280px" }}>
              <InputGroup>
                <InputGroup.Text className="bg-white"><FaSearch /></InputGroup.Text>
                <Form.Control
                  type="search"
                  placeholder="Buscar conductor, documento o ruta..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </InputGroup>
            </div>

            <Button
              variant="primary"
              onClick={() => setMostrarCrear(true)}
              title={ENABLE_CREATE ? "Nuevo conductor" : "Nuevo conductor (deshabilitado por rama)"}
              disabled={!ENABLE_CREATE}
            >
              <FaPlus className="me-2" /> Nuevo Conductor
            </Button>
          </div>

          <div className="border rounded p-3 bg-white shadow-sm">
            <DataTable
              columns={columns}
              data={conductoresFiltrados}
              progressPending={loading}
              progressComponent={<div className="text-center">Cargando conductores...</div>}
              noDataComponent={<div className="text-muted text-center py-3">No hay conductores registrados</div>}
              pagination
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default GestionConductores;

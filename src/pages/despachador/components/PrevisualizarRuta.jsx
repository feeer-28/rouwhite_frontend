import React, { useState } from "react";
import { Modal, Button, ToggleButtonGroup, ToggleButton } from "react-bootstrap";

const PrevisualizarRuta = ({ show, onClose, ruta = {}, mapComponent: MapComponent = null }) => {
  const [tipoRecorrido, setTipoRecorrido] = useState("ida");
  const [mostrarMapa, setMostrarMapa] = useState(false);

  if (!show || !ruta) return null;

  const paraderosFiltrados = Array.isArray(ruta.paraderos)
    ? ruta.paraderos
        .filter((p) => (p.tipo || "").toLowerCase() === tipoRecorrido)
        .sort((a, b) => (a.orden || 0) - (b.orden || 0))
    : [];

  const origen = paraderosFiltrados[0]?.nombre ?? "—";
  const destino = paraderosFiltrados[paraderosFiltrados.length - 1]?.nombre ?? "—";

  return (
    <Modal show={true} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{ruta.nombre || ruta.nombreRuta || "Vista previa de ruta"}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p><strong>Empresa:</strong> {ruta.empresa || ruta.empresaNombre || "—"}</p>
        <p><strong>Estado:</strong> {ruta.estado ? ruta.estado.toUpperCase() : "—"}</p>
        <p><strong>Origen → Destino:</strong> {origen} → {destino}</p>

        <hr />

        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">Paraderos ({tipoRecorrido})</h6>
          <ToggleButtonGroup type="radio" name="recorrido" value={tipoRecorrido} onChange={setTipoRecorrido}>
            <ToggleButton id="recorrido-ida" variant="outline-primary" value="ida">Ida</ToggleButton>
            <ToggleButton id="recorrido-retorno" variant="outline-secondary" value="retorno">Retorno</ToggleButton>
          </ToggleButtonGroup>
        </div>

        <ol className="mb-3">
          {paraderosFiltrados.length === 0 && <li className="text-muted">Sin paraderos registrados</li>}
          {paraderosFiltrados.map((p, i) => (
            <li key={p.idParadero ?? i}>
              <strong>{p.orden}</strong> – {p.nombre || p.nombreParadero || `Paradero ${p.idParadero ?? i + 1}`}
            </li>
          ))}
        </ol>

        {mostrarMapa && MapComponent && (
          <>
            <hr />
            <MapComponent paraderos={paraderosFiltrados} tipo={tipoRecorrido} />
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline-secondary" onClick={() => setMostrarMapa((prev) => !prev)}>
          {mostrarMapa ? "Ocultar mapa" : "Visualizar mapa"}
        </Button>
        <Button variant="primary" onClick={onClose}>Cerrar</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PrevisualizarRuta;

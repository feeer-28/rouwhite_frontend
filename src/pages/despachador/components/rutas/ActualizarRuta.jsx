import React, { useState, useEffect, useCallback } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { FaToggleOn, FaToggleOff } from "react-icons/fa";

/**
 * ActualizarRuta.jsx
 *
 * Props:
 *  - show: boolean
 *  - onClose: () => void
 *  - onActualizar: (rutaActualizada) => void
 *  - ruta: { id, nombreRuta, empresaId, origenId, destinoId, paraderos: [{idParadero, orden, tipo}] }
 *
 * Asegura:
 *  - swap atómico origen/destino al alternar modo
 *  - paraderos separados por tipo (ida/retorno) y reordenamiento consistente
 *  - payload limpio: solo ids y paraderos normalizados
 *  - normaliza respuesta antes de devolverla a onActualizar
 */

const ActualizarRuta = ({ show, onClose, onActualizar, ruta }) => {
  const [nombreRuta, setNombreRuta] = useState("");
  const [origenId, setOrigenId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [paraderosDisponibles, setParaderosDisponibles] = useState([]);
  const [empresasDisponibles, setEmpresasDisponibles] = useState([]);
  const [paraderosSeleccionados, setParaderosSeleccionados] = useState([]); // { idParadero, orden, tipo }
  const [modoRuta, setModoRuta] = useState("ida");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Helpers
  const normalizeParaderosFromApi = (arr = []) =>
    arr.map((p, idx) => ({
      idParadero: p.idParadero ?? p.id ?? p.paraderoId,
      orden: p.orden ?? idx + 1,
      tipo: p.tipo ?? "ida",
    }));

  const normalizeRuta = (r) => ({
    id: r.id,
    nombreRuta: r.nombreRuta ?? r.nombre,
    empresaId: r.empresaId ?? r.empresa?.idEmpresa,
    origenId: r.origenId ?? r.origen?.idParadero,
    destinoId: r.destinoId ?? r.destino?.idParadero,
    paraderos: normalizeParaderosFromApi(r.paraderos || []),
  });

  const reorderTipo = (arr, tipo) => {
    const salida = [];
    let counter = 1;
    // mantener orden relativo entre tipos distintos; recalcular solo para el tipo dado
    arr.forEach((p) => {
      if (p.tipo === tipo) {
        salida.push({ ...p, orden: counter++ });
      } else {
        salida.push({ ...p });
      }
    });
    return salida;
  };

  // Carga paraderos y empresas al abrir modal
  useEffect(() => {
    if (!show) return;
    const abortCtrl = new AbortController();
    const fallbackParaderos = [
      { idParadero: 1, nombre: "Lomas de Granada" },
      { idParadero: 2, nombre: "Paradero Nueva Granada" },
      { idParadero: 3, nombre: "Paradero SENA Norte" },
      { idParadero: 4, nombre: "Paradero La Cabaña" },
    ];
    const fallbackEmpresas = [
      { idEmpresa: 1, nombre: "TransPopayán S.A." },
      { idEmpresa: 2, nombre: "Rutas del Cauca Ltda." },
      { idEmpresa: 3, nombre: "Express Norte SAS" },
    ];

    fetch("https://api.rouwhite.com/paraderos", { signal: abortCtrl.signal })
      .then((r) => r.json())
      .then((data) => setParaderosDisponibles(Array.isArray(data) && data.length ? data : fallbackParaderos))
      .catch(() => setParaderosDisponibles(fallbackParaderos));

    fetch("https://api.rouwhite.com/empresas?ciudad=Popayán", { signal: abortCtrl.signal })
      .then((r) => r.json())
      .then((data) => setEmpresasDisponibles(Array.isArray(data) && data.length ? data : fallbackEmpresas))
      .catch(() => setEmpresasDisponibles(fallbackEmpresas));

    return () => abortCtrl.abort();
  }, [show]);

  // Prellenado seguro al abrir modal con la ruta
  useEffect(() => {
    if (!show) return;
    if (!ruta) {
      setNombreRuta("");
      setOrigenId("");
      setDestinoId("");
      setEmpresaId("");
      setParaderosSeleccionados([]);
      setModoRuta("ida");
      setError("");
      return;
    }

    const n = normalizeRuta(ruta);
    setNombreRuta(n.nombreRuta ?? "");
    setEmpresaId(n.empresaId ? String(n.empresaId) : "");
    setOrigenId(n.origenId ? String(n.origenId) : "");
    setDestinoId(n.destinoId ? String(n.destinoId) : "");
    setParaderosSeleccionados(n.paraderos);
    setModoRuta("ida");
    setError("");
  }, [show, ruta]);

  useEffect(() => {
    if (!show) {
      setLoading(false);
      setError("");
    }
  }, [show]);

  // Swap atómico origen<->destino y toggle modo
  const toggleModoRuta = useCallback(() => {
    const o = origenId;
    const d = destinoId;
    setOrigenId(d ?? "");
    setDestinoId(o ?? "");
    setModoRuta((m) => (m === "ida" ? "retorno" : "ida"));
  }, [origenId, destinoId]);

  const handleSelectParadero = (paradero) => {
    setParaderosSeleccionados((prev) => {
      const existeIndex = prev.findIndex((p) => p.idParadero === paradero.idParadero && p.tipo === modoRuta);
      if (existeIndex !== -1) {
        // eliminar y reordenar solo para este tipo
        const removed = prev.filter((p) => !(p.idParadero === paradero.idParadero && p.tipo === modoRuta));
        return reorderTipo(removed, modoRuta);
      } else {
        const ordenActual = prev.filter((p) => p.tipo === modoRuta).length + 1;
        return [...prev, { idParadero: paradero.idParadero, orden: ordenActual, tipo: modoRuta }];
      }
    });
  };

  const getOrden = (idParadero, tipo = modoRuta) => {
    const item = paraderosSeleccionados.find((p) => p.idParadero === idParadero && p.tipo === tipo);
    return item ? item.orden : null;
  };

  const handleActualizar = async (e) => {
    e && e.preventDefault && e.preventDefault();
    setError("");
    if (!ruta || !ruta.id) {
      setError("Ruta inválida o no seleccionada.");
      return;
    }
    if (!nombreRuta.trim() || !origenId || !destinoId || !empresaId) {
      setError("Completa nombre, origen, destino y empresa antes de actualizar.");
      return;
    }
    if (String(origenId) === String(destinoId)) {
      setError("Origen y destino no pueden ser el mismo.");
      return;
    }

    // Payload limpio: solo ids y paraderos normalizados
    const payload = {
      nombreRuta: nombreRuta.trim(),
      empresaId: Number(empresaId),
      origenId: Number(origenId),
      destinoId: Number(destinoId),
      paraderos: paraderosSeleccionados.map((p) => ({
        idParadero: Number(p.idParadero),
        orden: Number(p.orden),
        tipo: p.tipo,
      })),
    };

    try {
      setLoading(true);
      const res = await fetch(`https://api.rouwhite.com/rutas/${ruta.id}`, {
        method: "PUT", // ajustar a PATCH si la API lo requiere
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || "Error al actualizar la ruta");
      }
      const respuesta = await res.json();
      const rutaActualizada = normalizeRuta(respuesta);
      onActualizar && onActualizar(rutaActualizada);
      onClose();
    } catch (err) {
      setError(err.message || "Error desconocido al actualizar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Actualizar Ruta</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form onSubmit={handleActualizar}>
          <Form.Group className="mb-3">
            <Form.Label>Nombre de la Ruta</Form.Label>
            <Form.Control
              type="text"
              value={nombreRuta}
              onChange={(e) => setNombreRuta(e.target.value)}
              placeholder="Ej. Ruta Norte"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Origen</Form.Label>
            <div className="d-flex">
              <Form.Select value={origenId} onChange={(e) => setOrigenId(e.target.value)} required>
                <option value="">Selecciona un paradero</option>
                {paraderosDisponibles.map((p) => (
                  <option key={p.idParadero} value={String(p.idParadero)}>
                    {p.nombre}
                  </option>
                ))}
              </Form.Select>
              <Button variant="outline-secondary" className="ms-2" onClick={() => setOrigenId("")}>
                X
              </Button>
            </div>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Destino</Form.Label>
            <div className="d-flex">
              <Form.Select value={destinoId} onChange={(e) => setDestinoId(e.target.value)} required>
                <option value="">Selecciona un paradero</option>
                {paraderosDisponibles.map((p) => (
                  <option key={p.idParadero} value={String(p.idParadero)}>
                    {p.nombre}
                  </option>
                ))}
              </Form.Select>
              <Button variant="outline-secondary" className="ms-2" onClick={() => setDestinoId("")}>
                X
              </Button>
            </div>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Empresa</Form.Label>
            <Form.Select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} required>
              <option value="">Selecciona una empresa de Popayán</option>
              {empresasDisponibles.map((emp) => (
                <option key={emp.idEmpresa} value={String(emp.idEmpresa)}>
                  {emp.nombre}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <div className="d-flex justify-content-between align-items-center">
              <Form.Label className="mb-0">Puntos de {modoRuta === "ida" ? "Ida" : "Retorno"}</Form.Label>
              <Button variant="outline-secondary" onClick={toggleModoRuta}>
                {modoRuta === "ida" ? <FaToggleOn /> : <FaToggleOff />} Cambiar a {modoRuta === "ida" ? "Retorno" : "Ida"}
              </Button>
            </div>

            <div className="d-flex flex-wrap gap-2 mt-3">
              {paraderosDisponibles.map((paradero) => {
                const orden = getOrden(paradero.idParadero, modoRuta);
                const seleccionado = orden !== null;
                return (
                  <div
                    key={`${paradero.idParadero}-${modoRuta}`}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 6,
                      border: seleccionado ? "2px solid #0d6efd" : "1px solid #dee2e6",
                      background: seleccionado ? "#e7f1ff" : "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                    onClick={() => handleSelectParadero(paradero)}
                  >
                    <span>{paradero.nombre}</span>
                    {seleccionado && (
                      <div
                        style={{
                          background: "#0d6efd",
                          color: "#fff",
                          borderRadius: 999,
                          padding: "2px 8px",
                          fontSize: 12,
                        }}
                      >
                        {orden}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Form.Group>

          {error && <p className="text-danger mt-3">{error}</p>}

          <div className="d-flex justify-content-end mt-4">
            <Button variant="secondary" onClick={onClose} className="me-2" disabled={loading}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar Ruta"}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default ActualizarRuta;

import React, { useState, useEffect, useCallback } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { FaToggleOn, FaToggleOff } from "react-icons/fa";

const CrearRuta = ({ show, onClose, onCrear }) => {
  const [nombreRuta, setNombreRuta] = useState("");
  const [origenId, setOrigenId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [paraderosDisponibles, setParaderosDisponibles] = useState([]);
  const [empresasDisponibles, setEmpresasDisponibles] = useState([]);
  const [paraderosSeleccionados, setParaderosSeleccionados] = useState([]); // { idParadero, orden, tipo }
  const [modoRuta, setModoRuta] = useState("ida"); // "ida" | "retorno"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setParaderosDisponibles(data);
        else setParaderosDisponibles(fallbackParaderos);
      })
      .catch(() => setParaderosDisponibles(fallbackParaderos));

    fetch("https://api.rouwhite.com/empresas?ciudad=Popayán", { signal: abortCtrl.signal })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setEmpresasDisponibles(data);
        else setEmpresasDisponibles(fallbackEmpresas);
      })
      .catch(() => setEmpresasDisponibles(fallbackEmpresas));

    return () => abortCtrl.abort();
  }, [show]);

  useEffect(() => {
    if (!show) {
      // limpiar estado al cerrar para evitar datos residuales
      setNombreRuta("");
      setOrigenId("");
      setDestinoId("");
      setEmpresaId("");
      setParaderosSeleccionados([]);
      setModoRuta("ida");
      setLoading(false);
      setError("");
    }
  }, [show]);

  const toggleModoRuta = useCallback(() => {
    // intercambiar origen/destino de forma segura
    setModoRuta((prevModo) => (prevModo === "ida" ? "retorno" : "ida"));
    setOrigenId((prevOrigen) => {
      // swap with current destino
      setDestinoId((prevDestino) => prevOrigen ?? prevDestino);
      return destinoId ?? prevOrigen;
    });
    // Nota: la lógica anterior intenta mantener origen/destino coherentes.
    // Para comportamiento determinista y sin race, hacemos un swap explícito:
    setOrigenId((prev) => {
      const oldOrigen = origenId;
      setDestinoId(oldOrigen);
      return destinoId;
    });
  }, [origenId, destinoId]);

  const handleSelectParadero = (paradero) => {
    setParaderosSeleccionados((prev) => {
      // trabajo sobre copia para evitar mutaciones
      const prevSameTipo = prev.filter((p) => p.tipo === modoRuta);
      const existeIndex = prev.findIndex((p) => p.idParadero === paradero.idParadero && p.tipo === modoRuta);

      if (existeIndex !== -1) {
        // eliminar el paradero para este modo y reordenar los restantes de ese modo
        const removed = prev.filter((p, i) => !(p.idParadero === paradero.idParadero && p.tipo === modoRuta));
        const reordenados = removed
          .map((p) => ({ ...p }))
          .map((p) => {
            if (p.tipo !== modoRuta) return p;
            return p; // mantendremos orden relativo; se puede recalcular si se desea
          });
        // recalcular ordenes para el tipo afectado
        let counter = 1;
        const recalculado = reordenados.map((p) => {
          if (p.tipo !== modoRuta) return p;
          const updated = { ...p, orden: counter };
          counter += 1;
          return updated;
        });
        return recalculado;
      } else {
        // agregar nuevo con orden al final para ese modo
        const ordenActual = prevSameTipo.length + 1;
        return [...prev, { idParadero: paradero.idParadero, orden: ordenActual, tipo: modoRuta }];
      }
    });
  };

  const getOrden = (idParadero, tipo = modoRuta) => {
    const item = paraderosSeleccionados.find((p) => p.idParadero === idParadero && p.tipo === tipo);
    return item ? item.orden : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // validar básico
    if (!nombreRuta.trim() || !origenId || !destinoId || !empresaId) {
      setError("Todos los campos son obligatorios: nombre, origen, destino y empresa.");
      return;
    }

    const paraderosParaGuardar = paraderosSeleccionados.length > 0 ? paraderosSeleccionados : [];
    if (paraderosParaGuardar.length === 0) {
      setError("Debes seleccionar al menos un paradero para ida o retorno.");
      return;
    }

    if (String(origenId) === String(destinoId)) {
      setError("Origen y destino no pueden ser el mismo paradero.");
      return;
    }

    const payload = {
      nombreRuta,
      empresaId: Number(empresaId),
      origenId: Number(origenId),
      destinoId: Number(destinoId),
      paraderos: paraderosParaGuardar,
    };

    try {
      setLoading(true);
      const response = await fetch("https://api.rouwhite.com/rutas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(text || "Error al crear la ruta");
      }

      const nuevaRuta = await response.json();
      onCrear(nuevaRuta);
      onClose();
      // limpieza por seguridad (el efecto de show=false ya limpia)
    } catch (err) {
      setError(err.message || "Error desconocido al crear la ruta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Crear Nueva Ruta</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
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
              {loading ? "Creando..." : "Crear Ruta"}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default CrearRuta;

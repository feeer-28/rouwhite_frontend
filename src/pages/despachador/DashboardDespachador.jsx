import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  ListGroup
} from "react-bootstrap";
import {
  BsCalendar3,
  BsPeople,
  BsGraphUp,
  BsArrowRight
} from "react-icons/bs";
import layoutStyles from "./sidebar/sidebar.module.css";
import styles from "./../../styles/despachador/Dashboard.module.css";
import SiderDespachador from "./sidebar/SiderDespachador";

const DashboardDespachador = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true); // ✅ estado dinámico

  // 🔥 Datos quemados para pruebas
  const mockConductores = [
    { id: 1, nombre: "Carlos Gómez", ruta: "Ruta Norte", estado: "activo" },
    { id: 2, nombre: "Luisa Martínez", ruta: "Ruta Centro", estado: "activo" }
  ];

  const mockRutas = [
    { id: 1, nombre: "Ruta Norte", destino: "Terminal de Popayán", tiempo: "12 min", estado: "activa" },
    { id: 2, nombre: "Ruta Sur", destino: "Universidad del Cauca", tiempo: "15 min", estado: "pendiente" }
  ];

  const mockParaderos = [
    { id: 1, nombre: "Campanario", ruta: "Ruta Norte", estado: "activo" },
    { id: 2, nombre: "La Esmeralda", ruta: "Ruta Sur", estado: "mantenimiento" }
  ];

  return (
    <>
      <SiderDespachador onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className={`${layoutStyles.mainContent} ${sidebarOpen ? layoutStyles.withSidebar : ""}`}>
        <Container fluid className="py-4">
          {/* Encabezado */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-2">Panel del Despachador</h1>
              <p className="text-muted mb-0">
                Gestión de rutas, conductores y paraderos urbanos
              </p>
            </div>
            <div
              className="bg-light rounded-circle p-2 shadow-sm"
              style={{ cursor: "pointer" }}
              onClick={() => console.log("Abrir menú del usuario")}
            >
              <BsPeople size={20} className="text-primary" />
            </div>
          </div>

          <Row className="g-4">
            <Col lg={8}>
              {/* Conductores */}
              <Card className={styles.customCard}>
                <Card.Body>
                  <h5 className="mb-3 fw-bold">Conductores Activos</h5>
                  <ListGroup variant="flush">
                    {mockConductores.map((c) => (
                      <ListGroup.Item key={c.id} className={styles.electionListItem}>
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-1 fw-bold">{c.nombre}</h6>
                            <p className="text-muted small mb-0">{c.ruta}</p>
                          </div>
                          <Badge bg="success">Activo</Badge>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card.Body>
              </Card>

              {/* Rutas */}
              <Card className={styles.customCard}>
                <Card.Body>
                  <h5 className="mb-3 fw-bold">Rutas Disponibles</h5>
                  <ListGroup variant="flush">
                    {mockRutas.map((r) => (
                      <ListGroup.Item key={r.id} className={styles.electionListItem}>
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-1 fw-bold">{r.nombre}</h6>
                            <p className="text-muted small mb-0">Destino: {r.destino} • {r.tiempo}</p>
                          </div>
                          <Badge bg={r.estado === "activa" ? "success" : "secondary"}>
                            {r.estado === "activa" ? "Activa" : "Pendiente"}
                          </Badge>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card.Body>
              </Card>

              {/* Paraderos */}
              <Card className={styles.customCard}>
                <Card.Body>
                  <h5 className="mb-3 fw-bold">Paraderos Registrados</h5>
                  <ListGroup variant="flush">
                    {mockParaderos.map((p) => (
                      <ListGroup.Item key={p.id} className={styles.electionListItem}>
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-1 fw-bold">{p.nombre}</h6>
                            <p className="text-muted small mb-0">{p.ruta}</p>
                          </div>
                          <Badge bg={p.estado === "activo" ? "success" : "warning"}>
                            {p.estado === "activo" ? "Activo" : "Mantenimiento"}
                          </Badge>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={4}>
              {/* Mapa urbano */}
              <div className="position-relative mb-4 rounded-3 overflow-hidden shadow-sm bg-light d-flex align-items-center justify-content-center" style={{ height: "200px" }}>
                <span className="text-muted">[ Mapa urbano en tiempo real ]</span>
              </div>

              {/* Acciones rápidas */}
              <Card className={styles.customCard}>
                <Card.Body>
                  <h5 className="mb-3 fw-bold">Acciones Rápidas</h5>
                  <ListGroup variant="flush">
                    <ListGroup.Item
                      action
                      className="d-flex align-items-center gap-3 px-0 py-3 border-0"
                      onClick={() => navigate("/despachador/programar-ruta")}
                    >
                      <div className="bg-light rounded p-2">
                        <BsCalendar3 className="text-primary" />
                      </div>
                      <span>Programar Ruta</span>
                      <BsArrowRight className="ms-auto text-muted" />
                    </ListGroup.Item>
                    <ListGroup.Item
                      action
                      className="d-flex align-items-center gap-3 px-0 py-3 border-0"
                      onClick={() => navigate("/despachador/conductores")}
                    >
                      <div className="bg-light rounded p-2">
                        <BsPeople className="text-primary" />
                      </div>
                      <span>Gestionar Conductores</span>
                      <BsArrowRight className="ms-auto text-muted" />
                    </ListGroup.Item>
                    <ListGroup.Item
                      action
                      className="d-flex align-items-center gap-3 px-0 py-3 border-0"
                      onClick={() => navigate("/despachador/estadisticas")}
                    >
                      <div className="bg-light rounded p-2">
                        <BsGraphUp className="text-primary" />
                      </div>
                      <span>Ver Estadísticas</span>
                      <BsArrowRight className="ms-auto text-muted" />
                    </ListGroup.Item>
                  </ListGroup>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </>
  );
};

export default DashboardDespachador;

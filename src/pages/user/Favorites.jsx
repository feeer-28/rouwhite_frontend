import { useEffect, useMemo, useState } from 'react'
import { Container, Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap'
import { FaStar, FaBusAlt } from 'react-icons/fa'
import { listFavoritos, deleteFavorito } from '../../services/favoritosService'
import { listAllRoutes } from '../../services/routesService'
import { listEmpresas } from '../../services/empresasService'
import { isAuthTokenValid } from '../../services/apiClient'

function UserFavorites() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [favs, setFavs] = useState([])
  const [routes, setRoutes] = useState([])
  const [removing, setRemoving] = useState(null)
  const [empresas, setEmpresas] = useState([])

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [fs, rs, emps] = await Promise.all([
        listFavoritos().catch(() => []),
        listAllRoutes().catch(() => []),
        listEmpresas().catch(() => []),
      ])
      setFavs(Array.isArray(fs) ? fs : [])
      setRoutes(Array.isArray(rs) ? rs : [])
      setEmpresas(Array.isArray(emps) ? emps : [])
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudieron cargar los favoritos')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!isAuthTokenValid()) return
    load()
  }, [])

  const routesById = useMemo(() => {
    const m = new Map()
    for (const r of (routes||[])) {
      const rid = Number(r.id_ruta ?? r.id)
      m.set(rid, r)
    }
    return m
  }, [routes])

  const empresasById = useMemo(() => {
    const m = new Map()
    for (const e of (empresas || [])) {
      const id = Number(e.id_empresa ?? e.id)
      m.set(id, e.nombre)
    }
    return m
  }, [empresas])

  const removeFav = async (fav) => {
    setRemoving(fav.id)
    try {
      const ok = await deleteFavorito(fav.id)
      if (ok === null) { setError('No autorizado. Vuelve a iniciar sesión.'); return }
      await load()
    } finally { setRemoving(null) }
  }

  return (
    <section>
      <Container className="py-3">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h4 className="m-0">Rutas favoritas</h4>
          <Badge pill bg="" style={{ backgroundColor: 'var(--c-sun)', color: '#1b1b1b' }}>{favs.length} guardadas</Badge>
        </div>

        {!isAuthTokenValid() && (
          <Alert variant="info">Inicia sesión para ver y administrar tus favoritos.</Alert>
        )}

        {error && <Alert variant="warning">{error}</Alert>}
        {loading && <Alert variant="info">Cargando...</Alert>}

        {(!loading && isAuthTokenValid()) && (
          favs.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-muted">Aún no tienes rutas favoritas.</Card.Body>
            </Card>
          ) : (
            <Row className="g-3">
              {favs.map((f, i) => {
                const rid = Number(f.ruta_id)
                const r = routesById.get(rid)
                const nombre = r?.nombre ?? r?.nombre_ruta ?? r?.codigo ?? `Ruta ${rid}`
                const empresaNombre = r?.empresa?.nombre 
                  ?? r?.empresa_nombre 
                  ?? ((r?.empresa_id != null || r?.empresaId != null) ? empresasById.get(Number(r?.empresa_id ?? r?.empresaId)) : null)
                  ?? '—'
                return (
                  <Col key={f.id ?? `${rid}-${i}`} xs={12} sm={6} md={4} lg={3}>
                    <Card className="h-100 border-0 shadow" style={{ borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ height: 76, background: 'linear-gradient(135deg, var(--c-sun), var(--c-orange))', display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
                        <div className="d-flex align-items-center gap-2 text-dark fw-bold">
                          <FaBusAlt/>
                          <span>Ruta</span>
                        </div>
                        <div className="ms-auto">
                          <FaStar style={{ color: 'gold' }}/>
                        </div>
                      </div>
                      <Card.Body>
                        <div className="fw-semibold mb-1">{nombre}</div>
                        <div className="text-muted small mb-2">{empresaNombre}</div>
                        <div className="d-flex gap-2">
                          <Button size="sm" variant="outline-danger" disabled={removing===f.id} onClick={()=>removeFav(f)}>Quitar</Button>
                          {/* Futuro: Ver detalle si hay página dedicada */}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                )
              })}
            </Row>
          )
        )}
      </Container>
    </section>
  )
}

export default UserFavorites

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Container, Row, Col, Card, Form } from 'react-bootstrap'
import { listAllRoutes } from '../../services/routesService'
import { listEmpresas } from '../../services/empresasService'

function PublicRoutes() {
  const [routes, setRoutes] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [rts, emps] = await Promise.all([
          listAllRoutes().catch(() => []),
          listEmpresas().catch(() => []),
        ])
        setRoutes(Array.isArray(rts) ? rts : [])
        setEmpresas(Array.isArray(emps) ? emps : [])
      } catch (e) {
        setError(e?.response?.data?.message || 'No se pudieron cargar las rutas')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const empresasById = useMemo(() => new Map((empresas || []).map((e) => [Number(e.id_empresa ?? e.id), e])), [empresas])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const arr = Array.isArray(routes) ? routes : []
    if (!q) return arr
    return arr.filter((r) => {
      const name = String(r.nombre_ruta ?? r.nombre ?? '').toLowerCase()
      const eid = Number(r.empresa_id ?? r.empresaId)
      const ename = String(empresasById.get(eid)?.nombre ?? '').toLowerCase()
      return name.includes(q) || ename.includes(q)
    })
  }, [routes, filter, empresasById])

  return (
    <section>
      <Container className="py-4">
        <Row className="align-items-center mb-3 g-2">
          <Col xs={12} md={6}>
            <h2 className="h4 m-0">Rutas</h2>
          </Col>
          <Col xs={12} md={6}>
            <Form.Control
              placeholder="Buscar por nombre de ruta o empresa"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </Col>
        </Row>

        {error && <div className="alert alert-danger">{error}</div>}

        <Card className="card-soft">
          <Card.Body>
            {loading ? (
              <div>Cargando...</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th style={{width: '60px'}}>#</th>
                      <th>Nombre</th>
                      <th>Empresa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center py-4 text-muted">Sin registros</td>
                      </tr>
                    ) : (
                      filtered.map((r, idx) => {
                        const eid = Number(r.empresa_id ?? r.empresaId)
                        const ename = empresasById.get(eid)?.nombre || (eid ? `Empresa ${eid}` : '—')
                        const name = r.nombre_ruta ?? r.nombre ?? `Ruta ${r.id_ruta ?? r.id ?? idx+1}`
                        return (
                          <tr key={r.id_ruta ?? r.id ?? idx}>
                            <td>{idx + 1}</td>
                            <td><Link to={`/rutas/${r.id_ruta ?? r.id}`}>{name}</Link></td>
                            <td>{ename}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>
    </section>
  )
}

export default PublicRoutes

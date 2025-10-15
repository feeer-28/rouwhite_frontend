import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import { listAllRoutes, showRoute } from '../../services/routesService'
import { listEmpresas } from '../../services/empresasService'
import { listRutaParaderos } from '../../services/routeParaderosService'
import { fetchAllParaderos } from '../../services/paraderosService'
import { osrmRoute } from '../../services/routingService'

function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (Array.isArray(points) && points.length > 1) {
      try { map.fitBounds(points, { padding: [20, 20] }) } catch {}
    }
  }, [points, map])
  return null
}

function PublicRouteDetail() {
  const { id } = useParams()
  const rid = Number(id)
  const [route, setRoute] = useState(null)
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ida, setIda] = useState([])
  const [retorno, setRetorno] = useState([])
  const [stopsIda, setStopsIda] = useState([])
  const [stopsRetorno, setStopsRetorno] = useState([])
  const [snapped, setSnapped] = useState({ ida: [], retorno: [] })
  const [view, setView] = useState('ambas')

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const [catalog, emps] = await Promise.all([
          listAllRoutes().catch(() => []),
          listEmpresas().catch(() => []),
        ])
        setEmpresas(Array.isArray(emps) ? emps : [])
        const byId = new Map((catalog||[]).map((r)=> [Number(r.id_ruta ?? r.id), r]))
        let r = byId.get(rid)
        if (!r) {
          // Intentar obtener solo esta ruta si no está en el catálogo
          try {
            const one = await showRoute(rid)
            if (one) {
              const it = one?.ruta || one?.data || one
              const id_ruta = it?.id_ruta ?? it?.idRuta ?? it?.id
              const empresa_id = it?.empresa_id ?? it?.empresaId
              const nombre_ruta = it?.nombre_ruta ?? it?.nombre
              r = { ...it, id_ruta: Number(id_ruta ?? rid), empresa_id, nombre_ruta }
            }
          } catch {}
        }
        setRoute(r || null)
        // cargar pivotes y paraderos
        const [pivots, allStops] = await Promise.all([
          listRutaParaderos().catch(() => []),
          fetchAllParaderos().catch(() => []),
        ])
        const own = (Array.isArray(pivots) ? pivots : []).filter((p) => Number(p.ruta_id ?? p.rutaId) === rid)
        const idaP = own.filter((p) => String(p.tipo).toLowerCase() === 'ida').sort((a,b)=> (a.orden ?? 0) - (b.orden ?? 0))
        const retP = own.filter((p) => String(p.tipo).toLowerCase() === 'retorno').sort((a,b)=> (a.orden ?? 0) - (b.orden ?? 0))
        const stopMap = new Map((allStops||[]).map((s)=> [String(s.id_paradero ?? s.id), s]))
        const toLatLngs = (arr) => arr.map((pv)=>{
          const st = stopMap.get(String(pv.paradero_id ?? pv.paraderoId))
          const lat = Number(st?.latitud); const lng = Number(st?.longitud)
          return (!isNaN(lat) && !isNaN(lng)) ? [lat, lng] : null
        }).filter(Boolean)
        const toStops = (arr) => arr.map((pv)=>{
          const st = stopMap.get(String(pv.paradero_id ?? pv.paraderoId))
          const lat = Number(st?.latitud); const lng = Number(st?.longitud)
          const nombre = st?.nombre || ''
          return (!isNaN(lat) && !isNaN(lng)) ? { lat, lng, nombre } : null
        }).filter(Boolean)
        const idaPts = toLatLngs(idaP)
        const retPts = toLatLngs(retP)
        setIda(idaPts)
        setRetorno(retPts)
        setStopsIda(toStops(idaP))
        setStopsRetorno(toStops(retP))
        try {
          const [snI, snR] = await Promise.all([
            osrmRoute(idaPts),
            osrmRoute(retPts),
          ])
          setSnapped({ ida: snI, retorno: snR })
        } catch {}
      } catch (e) {
        setError(e?.response?.data?.message || 'No se pudo cargar la ruta')
      } finally {
        setLoading(false)
      }
    }
    if (!isNaN(rid)) run()
  }, [rid])

  const empresasById = useMemo(() => new Map((empresas||[]).map((e)=> [Number(e.id_empresa ?? e.id), e])), [empresas])
  const empresaNombre = useMemo(() => {
    if (!route) return '—'
    const eid = Number(route.empresa_id ?? route.empresaId)
    return empresasById.get(eid)?.nombre || (eid ? `Empresa ${eid}` : '—')
  }, [route, empresasById])

  const lineAmbas = useMemo(() => ([...(snapped.ida?.length ? snapped.ida : ida), ...(snapped.retorno?.length ? snapped.retorno : retorno)]), [snapped, ida, retorno])
  const center = useMemo(() => {
    const pts = view==='ida' ? ida : (view==='retorno' ? retorno : lineAmbas)
    if (!pts.length) return [2.444, -76.614]
    return [pts.reduce((s,p)=>s+p[0],0)/pts.length, pts.reduce((s,p)=>s+p[1],0)/pts.length]
  }, [ida, retorno, lineAmbas, view])

  return (
    <section>
      <Container className="py-4">
        <Row className="align-items-center mb-3 g-2">
          <Col xs={12} md={8}>
            <h2 className="h5 m-0">Ruta {route?.nombre_ruta ?? route?.nombre ?? rid}</h2>
          </Col>
          <Col xs={12} md={4} className="text-md-end">
            <Link to="/rutas" className="btn btn-sm btn-outline-secondary">Volver</Link>
          </Col>
        </Row>
        {error && <Alert variant="danger">{error}</Alert>}
        {loading && <Alert variant="info">Cargando ruta...</Alert>}
        {!loading && !route && (
          <Alert variant="warning">No se encontró la ruta seleccionada.</Alert>
        )}
        {route && (
        <Row className="g-3">
          <Col xs={12} lg={4}>
            <Card className="h-100 card-soft">
              <Card.Body>
                <div className="mb-2"><strong>Nombre:</strong> {route?.nombre_ruta ?? route?.nombre ?? '—'}</div>
                <div className="mb-3"><strong>Empresa:</strong> {empresaNombre}</div>
                <div className="btn-group btn-group-sm" role="group" aria-label="Selector recorrido">
                  <Button variant={view==='ida'?'primary':'outline-primary'} onClick={() => setView('ida')}>Ver Ida</Button>
                  <Button variant={view==='retorno'?'primary':'outline-primary'} onClick={() => setView('retorno')}>Ver Retorno</Button>
                  <Button variant={view==='ambas'?'primary':'outline-primary'} onClick={() => setView('ambas')}>Ver Ambas</Button>
                </div>

                <Row className="mt-3 g-3">
                  <Col xs={12} sm={6}>
                    <h6 className="mb-2">Paraderos de ida ({stopsIda.length})</h6>
                    <div className="border rounded p-2" style={{ maxHeight: 180, overflowY: 'auto' }}>
                      {stopsIda.length === 0 ? (
                        <div className="text-muted small">Sin paraderos</div>
                      ) : (
                        <ul className="small m-0">
                          {stopsIda.map((s, i) => (<li key={`ida-${i}`}>{s.nombre || `Ida ${i+1}`}</li>))}
                        </ul>
                      )}
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <h6 className="mb-2">Paraderos de retorno ({stopsRetorno.length})</h6>
                    <div className="border rounded p-2" style={{ maxHeight: 180, overflowY: 'auto' }}>
                      {stopsRetorno.length === 0 ? (
                        <div className="text-muted small">Sin paraderos</div>
                      ) : (
                        <ul className="small m-0">
                          {stopsRetorno.map((s, i) => (<li key={`ret-${i}`}>{s.nombre || `Retorno ${i+1}`}</li>))}
                        </ul>
                      )}
                    </div>
                  </Col>
                </Row>

              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} lg={8}>
            <Card className="h-100 card-soft">
              <Card.Body>
                <div className="border rounded map-box" style={{ overflow: 'hidden' }}>
                  <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                    <FitBounds points={view==='ida' ? (snapped.ida.length?snapped.ida:ida) : (view==='retorno' ? (snapped.retorno.length?snapped.retorno:retorno) : (snapped.ida.length?snapped.ida:ida).concat(snapped.retorno.length?snapped.retorno:retorno))} />
                    {(view!=='retorno') && (snapped.ida.length ? snapped.ida : ida).length > 1 && (
                      <Polyline positions={snapped.ida.length ? snapped.ida : ida} pathOptions={{ color: '#0d6efd', weight: 5 }} />
                    )}
                    {(view!=='ida') && (snapped.retorno.length ? snapped.retorno : retorno).length > 1 && (
                      <Polyline positions={snapped.retorno.length ? snapped.retorno : retorno} pathOptions={{ color: '#dc3545', weight: 5 }} />
                    )}
                    {view !== 'retorno'
                      ? stopsIda.map((s, i) => (
                          <CircleMarker key={`ida-${i}`} center={[s.lat, s.lng]} radius={5} pathOptions={{ color: '#0d6efd', fillColor: '#0d6efd', fillOpacity: 0.9 }}>
                            <Tooltip>{s.nombre || `Ida ${i + 1}`}</Tooltip>
                          </CircleMarker>
                        ))
                      : null}
                    {view !== 'ida'
                      ? stopsRetorno.map((s, i) => (
                          <CircleMarker key={`ret-${i}`} center={[s.lat, s.lng]} radius={5} pathOptions={{ color: '#dc3545', fillColor: '#dc3545', fillOpacity: 0.9 }}>
                            <Tooltip>{s.nombre || `Retorno ${i + 1}`}</Tooltip>
                          </CircleMarker>
                        ))
                      : null}
                  </MapContainer>
                </div>
                <div className="small text-muted mt-2">Azul: ida · Rojo: retorno.</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        )}
      </Container>
    </section>
  )
}

export default PublicRouteDetail

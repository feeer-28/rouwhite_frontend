import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Container, Row, Col, Button, Form, Card, Alert, Badge } from 'react-bootstrap'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import { unifiedSearch } from '../../services/searchService'
import { fetchAllParaderos } from '../../services/paraderosService'
import { fetchAllBarrios } from '../../services/barriosService'
import { listRutaParaderos } from '../../services/routeParaderosService'
import { osrmRoute } from '../../services/routingService'
import { listEmpresas } from '../../services/empresasService'
import { listAllRoutes } from '../../services/routesService'
import { FaSearch, FaMapMarkedAlt, FaBusAlt, FaRoute } from 'react-icons/fa'
import About from './About'

function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (Array.isArray(points) && points.length > 1) {
      try {
        map.fitBounds(points, { padding: [20, 20] })
      } catch (_) {}
    }
  }, [points, map])
  return null
}

function Landing() {
  const { hash } = useLocation()
  const [query, setQuery] = useState('')
  const [routes, setRoutes] = useState([])
  const [allRoutes, setAllRoutes] = useState([])
  const [paraderos, setParaderos] = useState([])
  const [barrios, setBarrios] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [showingAllParaderos, setShowingAllParaderos] = useState(false)
  const [showingAllBarrios, setShowingAllBarrios] = useState(false)
  const [paraderosPage, setParaderosPage] = useState(1)
  const [barriosPage, setBarriosPage] = useState(1)
  const pageSize = 20
  const searchRef = useRef(null)

  useEffect(() => {
    setSelectedRoute(null)
  }, [query])

  // Enfocar buscador cuando llegamos a #inicio
  useEffect(() => {
    if (hash === '#inicio') {
      setTimeout(() => { try { searchRef.current?.focus() } catch {} }, 0)
    }
  }, [hash])

  useEffect(() => {
    // Cargar catálogo de empresas para mostrar nombre aunque la ruta no traiga objeto empresa
    ;(async () => {
      try { const emps = await listEmpresas().catch(() => []); setEmpresas(Array.isArray(emps) ? emps : []) } catch {}
    })()
  }, [])

  // Cargar todas las rutas para la sección "Todas las rutas"
  useEffect(() => {
    ;(async () => {
      try {
        const catalog = await listAllRoutes().catch(() => [])
        setAllRoutes(Array.isArray(catalog) ? catalog : [])
      } catch {}
    })()
  }, [])

  // Para tarjetas: conteo de paraderos por ruta (ida+retorno)
  const [routeStopCounts, setRouteStopCounts] = useState({})
  useEffect(() => {
    ;(async () => {
      try {
        const pivots = await listRutaParaderos().catch(() => [])
        const counts = {}
        for (const pv of (pivots||[])) {
          const rid = Number(pv.ruta_id ?? pv.rutaId)
          if (!isNaN(rid)) counts[rid] = (counts[rid] || 0) + 1
        }
        setRouteStopCounts(counts)
      } catch {}
    })()
  }, [])

  const handleUnifiedSearch = async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError('')
    try {
      const { rutas, paraderos, barrios, _fallback } = await unifiedSearch(q)
      const rts = Array.isArray(rutas) ? rutas : []
      const prs = Array.isArray(paraderos) ? paraderos : []
      const brs = Array.isArray(barrios) ? barrios : []
      if (_fallback) {
        // Mostrar aviso no bloqueante para el usuario
        setError('Búsqueda parcial: el servidor no respondió y se muestran resultados públicos.')
      }
      // Si hay barrios en el resultado, incluir rutas que pasan por paraderos de esos barrios
      // Determinar rutas estrictamente relacionadas según el tipo de resultado
      let finalRouteIds = new Set()
      if (prs.length > 0) {
        // Relacionar por paraderos encontrados
        try {
          const [allPivots] = await Promise.all([
            listRutaParaderos().catch(() => []),
          ])
          const searchStopIds = new Set(prs.map((p) => String(p.id_paradero ?? p.id)))
          ;(allPivots || []).forEach((pv) => {
            const pid = String(pv.paradero_id ?? pv.paraderoId)
            const rid = pv.ruta_id ?? pv.rutaId
            if (searchStopIds.has(pid) && rid != null) finalRouteIds.add(Number(rid))
          })
        } catch (_) {}
      } else if (brs.length > 0) {
        // Relacionar por barrios encontrados (paraderos dentro de esos barrios)
        try {
          const [allPivots, allStops] = await Promise.all([
            listRutaParaderos().catch(() => []),
            fetchAllParaderos().catch(() => []),
          ])
          const barrioIds = new Set(brs.map((b) => String(b.id_barrio ?? b.id)))
          const stopsById = new Map((allStops || []).map((p) => [String(p.id_paradero ?? p.id), p]))
          ;(allPivots || []).forEach((pv) => {
            const pid = String(pv.paradero_id ?? pv.paraderoId)
            const stop = stopsById.get(pid)
            const sbid = String(stop?.barrio_id ?? stop?.barrioId ?? '')
            if (stop && barrioIds.has(sbid)) {
              const rid = pv.ruta_id ?? pv.rutaId
              if (rid != null) finalRouteIds.add(Number(rid))
            }
          })
        } catch (_) {}
      } else {
        // Si solo se buscó por nombre de ruta, usar las rutas devueltas por la búsqueda
        finalRouteIds = new Set((rts || []).map((r) => Number(r.id_ruta ?? r.id)).filter((v) => !isNaN(v)))
      }

      // Construir lista final sin placeholders: solo rutas existentes
      let finalRoutes = []
      try {
        const catalog = await listAllRoutes().catch(() => [])
        const byId = new Map((catalog || []).map((r) => [Number(r.id_ruta ?? r.id), r]))
        finalRoutes = Array.from(finalRouteIds).map((rid) => byId.get(Number(rid))).filter(Boolean)
        // Como respaldo, si alguna ruta venía en rts con info válida y no está en catálogo, la usamos
        const fromSearchById = new Map((rts || []).map((r) => [Number(r.id_ruta ?? r.id), r]))
        Array.from(finalRouteIds).forEach((rid) => {
          if (!byId.get(Number(rid)) && fromSearchById.get(Number(rid))) finalRoutes.push(fromSearchById.get(Number(rid)))
        })
      } catch (_) {
        // Si falla el catálogo, usa lo que venga de la búsqueda filtrado por IDs
        const byIdSearch = new Map((rts || []).map((r) => [Number(r.id_ruta ?? r.id), r]))
        finalRoutes = Array.from(finalRouteIds).map((rid) => byIdSearch.get(Number(rid))).filter(Boolean)
      }
      setRoutes(finalRoutes)
      setParaderos(prs)
      setBarrios(brs)
      setShowingAllParaderos(false)
      setShowingAllBarrios(false)
      setParaderosPage(1)
      setBarriosPage(1)
      // Auto-seleccionar la primera ruta para mostrar el mapa de inmediato
      if (finalRoutes.length > 0) {
        const first = finalRoutes[0]
        setSelectedRoute(first)
        try { await loadRouteDetails(first) } catch {}
      } else {
        setSelectedRoute(null)
        setRouteDetails({ ida: [], retorno: [], loadedFor: null, stopsIda: [], stopsRetorno: [] })
        setSnapped({ ida: [], retorno: [] })
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo realizar la búsqueda')
    } finally {
      setLoading(false)
    }
  }

  const paginate = (arr, page, size) => {
    const start = (page - 1) * size
    return Array.isArray(arr) ? arr.slice(start, start + size) : []
  }

  const paraderosTotalPages = Math.max(1, Math.ceil((paraderos?.length || 0) / pageSize))
  const barriosTotalPages = Math.max(1, Math.ceil((barrios?.length || 0) / pageSize))
  const paraderosPageItems = paginate(paraderos, paraderosPage, pageSize)
  const barriosPageItems = paginate(barrios, barriosPage, pageSize)

  // Estado para detalles de ruta seleccionada (ida/retorno)
  const [routeDetails, setRouteDetails] = useState({ ida: [], retorno: [], loadedFor: null, stopsIda: [], stopsRetorno: [] })
  const [routePathView, setRoutePathView] = useState('ambas') // 'ambas' | 'ida' | 'retorno'
  const [snapped, setSnapped] = useState({ ida: [], retorno: [] })
  const [snapLoading, setSnapLoading] = useState(false)

  const loadRouteDetails = async (route) => {
    const rid = route?.id_ruta ?? route?.id
    // Si la búsqueda ya trajo los puntos (ida_points/retorno_points), úsalo directo
    if (Array.isArray(route?.ida_points) || Array.isArray(route?.retorno_points)) {
      const stopsIda = Array.isArray(route?.idaParaderos)
        ? route.idaParaderos.map((p) => ({
            lat: Number(p.latitud ?? p.lat),
            lng: Number(p.longitud ?? p.lng),
            nombre: p.nombre || '',
          })).filter((s) => !isNaN(s.lat) && !isNaN(s.lng))
        : []
      const stopsRet = Array.isArray(route?.retornoParaderos)
        ? route.retornoParaderos.map((p) => ({
            lat: Number(p.latitud ?? p.lat),
            lng: Number(p.longitud ?? p.lng),
            nombre: p.nombre || '',
          })).filter((s) => !isNaN(s.lat) && !isNaN(s.lng))
        : []
      setRouteDetails({
        ida: Array.isArray(route.ida_points) ? route.ida_points : [],
        retorno: Array.isArray(route.retorno_points) ? route.retorno_points : [],
        loadedFor: rid ?? null,
        stopsIda,
        stopsRetorno: stopsRet,
      })
      // Calcular "snapped" contra calles
      try {
        setSnapLoading(true)
        const [snI, snR] = await Promise.all([
          osrmRoute(Array.isArray(route.ida_points) ? route.ida_points : []),
          osrmRoute(Array.isArray(route.retorno_points) ? route.retorno_points : []),
        ])
        setSnapped({ ida: snI, retorno: snR })
      } finally {
        setSnapLoading(false)
      }
      return
    }
    if (!rid) return
    try {
      const [pivots, allStops] = await Promise.all([
        listRutaParaderos().catch(() => []),
        fetchAllParaderos().catch(() => []),
      ])
      const own = (Array.isArray(pivots) ? pivots : []).filter((p) => (p.ruta_id ?? p.rutaId) == rid)
      const ida = own.filter((p) => String(p.tipo).toLowerCase() === 'ida').sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      const retorno = own.filter((p) => String(p.tipo).toLowerCase() === 'retorno').sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      const stopsMap = new Map((allStops || []).map((s) => [String(s.id_paradero ?? s.id), s]))
      const toLatLngs = (arr) => arr
        .map((pv) => {
          const st = stopsMap.get(String(pv.paradero_id ?? pv.paraderoId))
          const lat = Number(st?.latitud)
          const lng = Number(st?.longitud)
          return (!isNaN(lat) && !isNaN(lng)) ? [lat, lng] : null
        })
        .filter(Boolean)
      const toStops = (arr) => arr
        .map((pv) => {
          const st = stopsMap.get(String(pv.paradero_id ?? pv.paraderoId))
          const lat = Number(st?.latitud); const lng = Number(st?.longitud)
          const nombre = st?.nombre || ''
          return (!isNaN(lat) && !isNaN(lng)) ? { lat, lng, nombre } : null
        }).filter(Boolean)
      const idaPts = toLatLngs(ida)
      const retPts = toLatLngs(retorno)
      setRouteDetails({ ida: idaPts, retorno: retPts, loadedFor: rid, stopsIda: toStops(ida), stopsRetorno: toStops(retorno) })
      // Calcular "snapped" contra calles
      try {
        setSnapLoading(true)
        const [snI, snR] = await Promise.all([
          osrmRoute(idaPts),
          osrmRoute(retPts),
        ])
        setSnapped({ ida: snI, retorno: snR })
      } finally {
        setSnapLoading(false)
      }
    } catch (_) {
      setRouteDetails({ ida: [], retorno: [], loadedFor: null, stopsIda: [], stopsRetorno: [] })
    }
  }

  const handleShowAllParaderos = async () => {
    setLoading(true)
    setError('')
    try {
      const all = await fetchAllParaderos()
      const ql = query.trim().toLowerCase()
      const filtered = ql ? all.filter((p) => (p.nombre || '').toLowerCase().includes(ql)) : all
      setParaderos(filtered)
      setShowingAllParaderos(true)
      setParaderosPage(1)
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudieron cargar todos los paraderos')
    } finally {
      setLoading(false)
    }
  }

  const handleShowAllBarrios = async () => {
    setLoading(true)
    setError('')
    try {
      const all = await fetchAllBarrios()
      const ql = query.trim().toLowerCase()
      const filtered = ql ? all.filter((b) => (b.nombre || '').toLowerCase().includes(ql)) : all
      setBarrios(filtered)
      setShowingAllBarrios(true)
      setBarriosPage(1)
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudieron cargar todos los barrios')
    } finally {
      setLoading(false)
    }
  }

  // Nota: búsqueda unificada ya devuelve resultados; no usamos filtros locales aquí

  return (
    <section>
      <Container fluid className="p-0">
        {/* Hero plano, sin degradado, centrado, con un único buscador */}
        <div
          className="hero hero-plain text-center p-0"
          id="inicio"
          style={{
            position: 'relative',
            backgroundImage: "url('https://media.traveler.es/photos/61376f8bd4923f67e298ef5b/master/w_1600%2Cc_limit/130738.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '420px'
          }}
        >
          {/* Overlay neutro para contraste sin tinte cálido */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,.6), rgba(0,0,0,.5))'
          }} />
          <Container style={{ paddingTop: '1.25rem' }}>
          <Row className="justify-content-center">
            <Col lg={10} xl={9}>
              <div className="hero-badge mb-3 mx-auto" style={{ position: 'relative', zIndex: 1 }}><FaMapMarkedAlt /> Plataforma de movilidad urbana</div>
              <h1 className="fw-bold text-white" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', position: 'relative', zIndex: 1 }}>Encuentra y visualiza rutas urbanas en tiempo real</h1>
              <p className="lead mt-2 text-light" style={{ position: 'relative', zIndex: 1 }}>Explora recorridos, empresas operadoras y ubica paraderos y barrios de interés.</p>
            </Col>
          </Row>
          {error && <Alert variant="warning" className="mt-3" style={{ position: 'relative', zIndex: 1 }}>{error}</Alert>}
          <Row className="justify-content-center mt-3">
            <Col md={10} lg={8} xl={7}>
              <Form.Label className="fw-semibold text-white" style={{ position: 'relative', zIndex: 1 }}>¿A dónde deseas ir o qué deseas buscar?</Form.Label>
              <div className="d-flex gap-2" style={{ position: 'relative', zIndex: 1 }}>
                <Form.Control
                  size="sm"
                  placeholder="Escribe una ruta, paradero o barrio..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleUnifiedSearch() }}
                  ref={searchRef}
                />
                <Button size="sm" variant="warning" className="btn-sun" onClick={handleUnifiedSearch} disabled={loading || !query.trim()}>
                  <FaSearch className="me-1"/>
                  {loading ? 'Buscando...' : 'Buscar'}
                </Button>
              </div>
            </Col>
          </Row>
          </Container>
        </div>

          {/* Resultados (solo si hay resultados o una ruta seleccionada) */}
          {(selectedRoute || routes.length>0 || paraderos.length>0 || barrios.length>0) && (
          <Container className="py-4" id="rutas">
          <Row className="g-3">
            <div className="col-12">
              <h3 className="h6">Ruta seleccionada</h3>
              {!selectedRoute && <div className="text-muted">Selecciona una ruta en el buscador para ver su recorrido</div>}
              {selectedRoute && (
                <Card className="card-soft border-0 shadow">
                  {/* Header decorativo */}
                  <div style={{
                    height: 80,
                    background: 'linear-gradient(135deg, var(--c-sun), var(--c-orange))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <div className="d-flex align-items-center gap-2 text-dark fw-bold">
                      <FaRoute/>
                      <span>Vista de ruta</span>
                    </div>
                  </div>
                  <Card.Body>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <div><strong>Nombre:</strong> {selectedRoute.nombre_ruta ?? selectedRoute.nombre ?? '—'}</div>
                        <div>
                          <strong>Empresa:</strong>{' '}
                          {(() => {
                            const en = selectedRoute.empresa?.nombre_empresa
                              ?? selectedRoute.empresa?.nombreEmpresa
                              ?? selectedRoute.empresa?.nombre
                              ?? null
                            if (en) return en
                            const eid = Number(selectedRoute.empresa_id ?? selectedRoute.empresaId)
                            if (!isNaN(eid) && eid) {
                              const byId = new Map((empresas||[]).map((e)=> [Number(e.id_empresa ?? e.id), e.nombre]))
                              return byId.get(eid) || `Empresa ${eid}`
                            }
                            return '—'
                          })()}
                        </div>
                      </div>
                      <div className="col-md-8">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <Badge pill bg="" style={{ backgroundColor: 'var(--c-sun)', color: '#1b1b1b' }}>Ida {routeDetails.ida?.length || 0}</Badge>
                            <Badge pill bg="" style={{ backgroundColor: 'var(--c-orange)', color: '#fff' }}>Retorno {routeDetails.retorno?.length || 0}</Badge>
                          </div>
                          <div className="d-inline-flex p-1 rounded-pill" style={{ background: '#f3f3f3' }}>
                            <Button size="sm" type="button"
                              style={{ border: 'none', borderRadius: '999px', backgroundColor: routePathView==='ida' ? '#ffb067' : 'transparent', color: routePathView==='ida' ? '#1b1b1b' : '#666', fontWeight: 600 }}
                              onClick={() => setRoutePathView('ida')}>Ida</Button>
                            <Button size="sm" type="button"
                              style={{ border: 'none', borderRadius: '999px', backgroundColor: routePathView==='retorno' ? '#ffb067' : 'transparent', color: routePathView==='retorno' ? '#1b1b1b' : '#666', fontWeight: 600 }}
                              onClick={() => setRoutePathView('retorno')}>Retorno</Button>
                            <Button size="sm" type="button"
                              style={{ border: 'none', borderRadius: '999px', backgroundColor: routePathView==='ambas' ? '#ffe083' : 'transparent', color: routePathView==='ambas' ? '#1b1b1b' : '#666', fontWeight: 600 }}
                              onClick={() => setRoutePathView('ambas')}>Ambas</Button>
                          </div>
                        </div>
                        <div className="border rounded map-box" style={{ overflow: 'hidden' }}>
                          {(() => {
                            const rawPts = routePathView==='ida'
                              ? (routeDetails.ida||[])
                              : routePathView==='retorno'
                                ? (routeDetails.retorno||[])
                                : [...(routeDetails.ida||[]), ...(routeDetails.retorno||[])]
                            const snappedPts = routePathView==='ida'
                              ? (snapped.ida?.length ? snapped.ida : routeDetails.ida)
                              : routePathView==='retorno'
                                ? (snapped.retorno?.length ? snapped.retorno : routeDetails.retorno)
                                : [
                                    ...(snapped.ida?.length ? snapped.ida : (routeDetails.ida||[])),
                                    ...(snapped.retorno?.length ? snapped.retorno : (routeDetails.retorno||[])),
                                  ]
                            const center = rawPts.length
                              ? [
                                  rawPts.reduce((s,p)=>s+p[0],0)/rawPts.length,
                                  rawPts.reduce((s,p)=>s+p[1],0)/rawPts.length,
                                ]
                              : [2.444, -76.614]
                            const idaLine = (snapped.ida?.length ? snapped.ida : routeDetails.ida) || []
                            const retLine = (snapped.retorno?.length ? snapped.retorno : routeDetails.retorno) || []
                            return (
                              <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                                <FitBounds points={snappedPts} />
                                {(routePathView!=='retorno') && idaLine.length > 1 && (
                                  <Polyline positions={idaLine} pathOptions={{ color: '#0d6efd', weight: 5 }} />
                                )}
                                {(routePathView!=='ida') && retLine.length > 1 && (
                                  <Polyline positions={retLine} pathOptions={{ color: '#dc3545', weight: 5 }} />
                                )}
                                {routePathView !== 'retorno'
                                  ? (routeDetails.stopsIda || []).map((s, i) => (
                                      <CircleMarker key={`ida-${i}`} center={[s.lat, s.lng]} radius={5} pathOptions={{ color: '#0d6efd', fillColor: '#0d6efd', fillOpacity: 0.9 }}>
                                        <Tooltip>{s.nombre || `Ida ${i + 1}`}</Tooltip>
                                      </CircleMarker>
                                    ))
                                  : null}
                                {routePathView !== 'ida'
                                  ? (routeDetails.stopsRetorno || []).map((s, i) => (
                                      <CircleMarker key={`ret-${i}`} center={[s.lat, s.lng]} radius={5} pathOptions={{ color: '#dc3545', fillColor: '#dc3545', fillOpacity: 0.9 }}>
                                        <Tooltip>{s.nombre || `Retorno ${i + 1}`}</Tooltip>
                                      </CircleMarker>
                                    ))
                                  : null}
                              </MapContainer>
                            )
                          })()}
                        </div>
                        <div className="small text-muted mt-1">Azul: ida · Rojo: retorno.</div>
                        {/* Listados de paraderos ida/retorno */}
                        <div className="row mt-3 g-3">
                          <div className="col-md-6">
                            <h6 className="mb-2">Paraderos de ida ({routeDetails.stopsIda?.length || 0})</h6>
                            <div className="border rounded p-2" style={{ maxHeight: 200, overflowY: 'auto' }}>
                              {(routeDetails.stopsIda || []).length === 0 ? (
                                <div className="text-muted small">Sin paraderos</div>
                              ) : (
                                <ul className="small m-0">
                                  {(routeDetails.stopsIda || []).map((s, i) => (<li key={`li-ida-${i}`}>{s.nombre || `Ida ${i+1}`}</li>))}
                                </ul>
                              )}
                            </div>
                          </div>
                          <div className="col-md-6">
                            <h6 className="mb-2">Paraderos de retorno ({routeDetails.stopsRetorno?.length || 0})</h6>
                            <div className="border rounded p-2" style={{ maxHeight: 200, overflowY: 'auto' }}>
                              {(routeDetails.stopsRetorno || []).length === 0 ? (
                                <div className="text-muted small">Sin paraderos</div>
                              ) : (
                                <ul className="small m-0">
                                  {(routeDetails.stopsRetorno || []).map((s, i) => (<li key={`li-ret-${i}`}>{s.nombre || `Retorno ${i+1}`}</li>))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              )}
            </div>

            <div className="col-12">
              <h3 className="h6 mb-2">Rutas</h3>
              {routes.length === 0 ? (
                <div className="text-muted">Sin resultados</div>
              ) : (
                <Row className="g-3">
                  {routes.map((r, i) => {
                    const name = r.nombre_ruta ?? r.nombre ?? `Ruta ${r.id_ruta ?? r.id ?? i+1}`
                    const eid = Number(r.empresa_id ?? r.empresaId)
                    const byId = new Map((empresas||[]).map((e)=> [Number(e.id_empresa ?? e.id), e.nombre]))
                    const ename = byId.get(eid) || '—'
                    return (
                      <Col key={r.id_ruta ?? r.id ?? i} xs={12} sm={6} md={4} lg={3}>
                        <Card className="h-100 card-soft" role="button" onClick={() => { setSelectedRoute(r); loadRouteDetails(r) }}>
                          <Card.Body>
                            <div className="fw-semibold mb-1">{name}</div>
                            <div className="text-muted small">{ename}</div>
                          </Card.Body>
                        </Card>
                      </Col>
                    )
                  })}
                </Row>
              )}
            </div>

            <div className="col-12">
              <Card className="border-0 shadow h-100">
                <Card.Header style={{ backgroundColor: 'var(--c-orange)', color: '#fff' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="fw-semibold">Paraderos</span>
                    <Button size="sm" variant="light" onClick={handleShowAllParaderos} disabled={loading}>
                      {showingAllParaderos ? 'Actualizados' : 'Mostrar todos'}
                    </Button>
                  </div>
                </Card.Header>
                <Card.Body>
                  {paraderos.length === 0 ? (
                    <div className="text-muted">Sin resultados</div>
                  ) : (
                    <ul className="list-unstyled mt-1 mb-0">
                      {paraderosPageItems.map((p, i) => (
                        <li key={p.id_paradero ?? p.id ?? i} className="text-accent">{p.nombre ?? '—'}</li>
                      ))}
                    </ul>
                  )}
                  {paraderos.length > pageSize && (
                    <div className="d-flex align-items-center justify-content-between mt-2">
                      <div className="small text-muted">Página {paraderosPage} de {paraderosTotalPages} — {paraderos.length} paraderos</div>
                      <div className="btn-group btn-group-sm">
                        <Button className="btn btn-outline-secondary" disabled={paraderosPage <= 1} onClick={() => setParaderosPage((p) => Math.max(1, p - 1))}>Anterior</Button>
                        <Button className="btn btn-outline-secondary" disabled={paraderosPage >= paraderosTotalPages} onClick={() => setParaderosPage((p) => Math.min(paraderosTotalPages, p + 1))}>Siguiente</Button>
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </div>

            <div className="col-12">
              <Card className="border-0 shadow h-100">
                <Card.Header style={{ backgroundColor: 'var(--c-sun)', color: '#1b1b1b' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="fw-semibold">Barrios</span>
                    <Button size="sm" variant="outline-dark" onClick={handleShowAllBarrios} disabled={loading}>
                      {showingAllBarrios ? 'Actualizados' : 'Mostrar todos'}
                    </Button>
                  </div>
                </Card.Header>
                <Card.Body>
                  {barrios.length === 0 ? (
                    <div className="text-muted">Sin resultados</div>
                  ) : (
                    <ul className="list-unstyled mt-1 mb-0">
                      {barriosPageItems.map((b, i) => (
                        <li key={b.id_barrio ?? b.id ?? i} className="text-accent">{b.nombre ?? '—'}</li>
                      ))}
                    </ul>
                  )}
                  {barrios.length > pageSize && (
                    <div className="d-flex align-items-center justify-content-between mt-2">
                      <div className="small text-muted">Página {barriosPage} de {barriosTotalPages} — {barrios.length} barrios</div>
                      <div className="btn-group btn-group-sm">
                        <Button className="btn btn-outline-secondary" disabled={barriosPage <= 1} onClick={() => setBarriosPage((p) => Math.max(1, p - 1))}>Anterior</Button>
                        <Button className="btn btn-outline-secondary" disabled={barriosPage >= barriosTotalPages} onClick={() => setBarriosPage((p) => Math.min(barriosTotalPages, p + 1))}>Siguiente</Button>
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </div>
          </Row>
          </Container>
          )}

        {/* Todas las rutas en tarjetas (scroll hacia abajo) */}
        <Container className="py-4" id="todas">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="h5 m-0">Todas las rutas</h2>
            <div className="text-muted small">{allRoutes?.length || 0} rutas</div>
          </div>
          <Row className="g-3">
            {(allRoutes || []).map((r, i) => {
              const eid = Number(r.empresa_id ?? r.empresaId)
              const byId = new Map((empresas||[]).map((e)=> [Number(e.id_empresa ?? e.id), e.nombre]))
              const ename = byId.get(eid) || (eid ? `Empresa ${eid}` : '—')
              const name = r.nombre_ruta ?? r.nombre ?? `Ruta ${r.id_ruta ?? r.id ?? i+1}`
              const rid = Number(r.id_ruta ?? r.id)
              const stops = routeStopCounts[rid] || 0
              return (
                <Col key={`all-${r.id_ruta ?? r.id ?? i}`} xs={12} sm={6} md={4} lg={3}>
                  <Card
                    className="h-100 border-0 shadow"
                    role="button"
                    onClick={() => { setSelectedRoute(r); loadRouteDetails(r) }}
                    style={{
                      borderRadius: 14,
                      overflow: 'hidden'
                    }}
                  >
                    {/* Header decorativo */}
                    <div style={{
                      height: 90,
                      background: 'linear-gradient(135deg, var(--c-sun), var(--c-orange))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FaRoute size={28} style={{ color: '#1b1b1b' }} />
                    </div>
                    <Card.Body className="pt-3">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <Badge pill bg="" style={{ backgroundColor: 'var(--c-sun)', color: '#1b1b1b' }} className="fw-semibold">
                          <FaBusAlt className="me-1"/> Ruta
                        </Badge>
                        <span className="small text-muted">{stops} paraderos</span>
                      </div>
                      <div className="fw-bold" style={{ fontSize: '1.1rem' }}>{name}</div>
                      <div className="text-muted small mb-2">{ename}</div>
                      <div className="d-flex">
                        <Button size="sm" className="btn-accent">Ver detalle</Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              )
            })}
          </Row>
        </Container>

        {/* Sobre anclado */}
        <Container id="sobre" className="py-4">
          <About />
        </Container>
      </Container>
    </section>
  )
}

export default Landing

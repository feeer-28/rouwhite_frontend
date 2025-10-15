import { useEffect, useMemo, useState } from 'react'
import { Container, Row, Col, Card, Button, Badge, Alert, Form } from 'react-bootstrap'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import { listAllRoutes } from '../../services/routesService'
import { fetchAllParaderos } from '../../services/paraderosService'
import { listRutaParaderos } from '../../services/routeParaderosService'
import { osrmRoute } from '../../services/routingService'
import { listFavoritos, createFavorito, deleteFavorito } from '../../services/favoritosService'
import { getAuthToken, isAuthTokenValid } from '../../services/apiClient'
import { createPqrs } from '../../services/pqrsService'
import { listEmpresas } from '../../services/empresasService'

function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (Array.isArray(points) && points.length > 1) {
      try { map.fitBounds(points, { padding: [20, 20] }) } catch {}
    }
  }, [points, map])
  return null
}

function haversine(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export default function UserRoutes() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [routes, setRoutes] = useState([])
  const [paraderos, setParaderos] = useState([])
  const [pivots, setPivots] = useState([])

  const [selectedRoute, setSelectedRoute] = useState(null)
  const [routeDetails, setRouteDetails] = useState({ ida: [], retorno: [], stopsIda: [], stopsRetorno: [] })
  const [snapped, setSnapped] = useState({ ida: [], retorno: [] })
  const [view, setView] = useState('ambas')

  const [favs, setFavs] = useState([])
  const [savingFav, setSavingFav] = useState(false)

  const [geo, setGeo] = useState({ enabled: false, coords: null, nearest: null })

  const [showPqrs, setShowPqrs] = useState(false)
  const [pqrs, setPqrs] = useState({ asunto: '', mensaje: '', empresaId: null })
  const [empresas, setEmpresas] = useState([])
  const [sendingPqrs, setSendingPqrs] = useState(false)

  // Filtros
  const [filterText, setFilterText] = useState('')
  const [empresaFilter, setEmpresaFilter] = useState('')

  useEffect(() => {
    const run = async () => {
      setLoading(true); setError('')
      try {
        const [rts, prs, pvs, emps] = await Promise.all([
          listAllRoutes().catch(() => []),
          fetchAllParaderos().catch(() => []),
          listRutaParaderos().catch(() => []),
          listEmpresas().catch(() => []),
        ])
        setRoutes(Array.isArray(rts) ? rts : [])
        setParaderos(Array.isArray(prs) ? prs : [])
        setPivots(Array.isArray(pvs) ? pvs : [])
        setEmpresas(Array.isArray(emps) ? emps : [])
      } catch (e) {
        setError(e?.response?.data?.message || 'No se pudieron cargar las rutas')
      } finally { setLoading(false) }
    }
    run()
  }, [])

  useEffect(() => {
    if (isAuthTokenValid()) {
      listFavoritos().then(setFavs).catch(() => setFavs([]))
    } else {
      setFavs([])
    }
  }, [])

  const grouped = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    const eidSel = empresaFilter ? Number(empresaFilter) : null
    const empresasById = new Map((empresas || []).map((e)=> [Number(e.id_empresa ?? e.id), e.nombre]))
    const filtered = routes.filter((r) => {
      const eid = r.empresa_id ?? r.empresaId
      if (eidSel != null && Number(eid) !== eidSel) return false
      if (!q) return true
      const name = `${r.nombre ?? r.nombre_ruta ?? ''} ${r.codigo ?? ''}`.toLowerCase()
      return name.includes(q)
    })
    const by = new Map()
    for (const r of filtered) {
      const eid = r.empresa_id ?? r.empresaId ?? 0
      const ename = r.empresa?.nombre 
        || r.empresa?.nombreEmpresa 
        || r.empresa?.nombre_empresa 
        || r.empresa_nombre 
        || empresasById.get(Number(eid)) 
        || null
      const key = String(eid || 'sin-empresa')
      if (!by.has(key)) by.set(key, { empresa_id: eid || null, empresa_nombre: ename || (eid ? `Empresa ${eid}` : 'Sin empresa'), rutas: [] })
      by.get(key).rutas.push(r)
    }
    return Array.from(by.values()).sort((a, b) => String(a.empresa_nombre).localeCompare(String(b.empresa_nombre)))
  }, [routes, filterText, empresaFilter, empresas])

  const openRoute = async (route) => {
    setSelectedRoute(route)
    const rid = route?.id_ruta ?? route?.id
    const own = (pivots || []).filter((p) => (p.ruta_id ?? p.rutaId) == rid)
    const ida = own.filter((p) => String(p.tipo).toLowerCase() === 'ida').sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    const ret = own.filter((p) => String(p.tipo).toLowerCase() === 'retorno').sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    const sMap = new Map((paraderos || []).map((s) => [String(s.id_paradero ?? s.id), s]))
    const toPts = (arr) => arr.map((pv) => {
      const st = sMap.get(String(pv.paradero_id ?? pv.paraderoId))
      const lat = Number(st?.latitud); const lng = Number(st?.longitud)
      return (!isNaN(lat) && !isNaN(lng)) ? [lat, lng] : null
    }).filter(Boolean)
    const toStops = (arr) => arr.map((pv) => {
      const st = sMap.get(String(pv.paradero_id ?? pv.paraderoId))
      const lat = Number(st?.latitud); const lng = Number(st?.longitud)
      const nombre = st?.nombre || ''
      return (!isNaN(lat) && !isNaN(lng)) ? { lat, lng, nombre } : null
    }).filter(Boolean)
    const idaPts = toPts(ida)
    const retPts = toPts(ret)
    setRouteDetails({ ida: idaPts, retorno: retPts, stopsIda: toStops(ida), stopsRetorno: toStops(ret) })
    try {
      const [snI, snR] = await Promise.all([ osrmRoute(idaPts), osrmRoute(retPts) ])
      setSnapped({ ida: snI, retorno: snR })
    } catch { setSnapped({ ida: [], retorno: [] }) }
  }

  const isFav = (route) => {
    const rid = Number(route?.id_ruta ?? route?.id)
    return favs.some(f => Number(f?.ruta_id) === rid)
  }

  const toggleFav = async (route) => {
    const rid = Number(route?.id_ruta ?? route?.id)
    if (!rid) return
    if (!isAuthTokenValid()) { setError('Debes iniciar sesión (o tu sesión expiró) para usar Favoritos.'); return }
    setSavingFav(true)
    try {
      const found = favs.find(f => Number(f?.ruta_id) === rid)
      if (found) {
        const resp = await deleteFavorito(found.id)
        if (resp === null) { setError('No autorizado. Vuelve a iniciar sesión.'); return }
        // Re-sincronizar lista desde servidor para asegurar estado consistente
        const fresh = await listFavoritos().catch(() => [])
        setFavs(fresh)
      } else {
        const created = await createFavorito({ rutaId: rid })
        if (created === null) { setError('No autorizado. Vuelve a iniciar sesión.'); return }
        // Si ya existía, o para obtener id_favorito real, re-sincronizar
        const fresh = await listFavoritos().catch(() => [])
        setFavs(fresh)
      }
    } finally { setSavingFav(false) }
  }

  const enableGeolocation = async () => {
    if (!navigator.geolocation) { setError('Geolocalización no soportada'); return }
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, maximumAge: 10000, timeout: 20000 })
      })
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      // Calcular paradero más cercano
      let nearest = null
      let best = Infinity
      for (const p of paraderos) {
        const plat = Number(p.latitud); const plng = Number(p.longitud)
        if (isNaN(plat) || isNaN(plng)) continue
        const d = haversine(coords, { lat: plat, lng: plng })
        if (d < best) { best = d; nearest = { paradero: p, distance: d } }
      }
      setGeo({ enabled: true, coords, nearest })
    } catch {
      setError('No se pudo obtener la ubicación')
    }
  }

  const openPqrs = (route) => {
    const empresaId = route?.empresa_id ?? route?.empresaId ?? null
    setPqrs({ asunto: `PQRS sobre ruta ${route?.nombre_ruta ?? route?.nombre ?? route?.codigo ?? ''}`, mensaje: '', empresaId })
    setShowPqrs(true)
  }

  const submitPqrs = async () => {
    if (!getAuthToken()) { setError('Debes iniciar sesión para enviar PQRS.'); return }
    if (!pqrs.empresaId) { setError('Selecciona la empresa destino.'); return }
    setSendingPqrs(true)
    try {
      await createPqrs({ asunto: pqrs.asunto, mensaje: pqrs.mensaje, tipo: 'PQRS', referencia: 'ruta', empresa_id: pqrs.empresaId })
      setShowPqrs(false)
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo enviar el PQRS')
    } finally { setSendingPqrs(false) }
  }

  const idaLine = (snapped.ida?.length ? snapped.ida : routeDetails.ida) || []
  const retLine = (snapped.retorno?.length ? snapped.retorno : routeDetails.retorno) || []
  const boundsPts = view==='ida' ? idaLine : view==='retorno' ? retLine : [ ...idaLine, ...retLine ]

  return (
    <section>
      {!getAuthToken() && (
        <Alert variant="info" className="d-flex justify-content-between align-items-center">
          <div>Para usar Favoritos y enviar PQRS debes iniciar sesión.</div>
          <a className="btn btn-sm btn-accent" href="/login">Iniciar sesión</a>
        </Alert>
      )}

      <Container className="py-3">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h5 className="m-0">Rutas por empresa</h5>
          <div className="d-flex gap-2">
            <Button size="sm" variant="outline-secondary" onClick={enableGeolocation}>Activar ubicación</Button>
            {geo.enabled && geo.nearest && (
              <Badge bg="success">Paradero cercano: {geo.nearest.paradero?.nombre} · {(geo.nearest.distance/1000).toFixed(2)} km</Badge>
            )}
          </div>
        </div>
        <Row className="g-2 mb-3">
          <Col md={6}>
            <Form.Control size="sm" placeholder="Filtrar por nombre o código de ruta" value={filterText} onChange={(e)=>setFilterText(e.target.value)} />
          </Col>
          <Col md={6}>
            <Form.Select size="sm" value={empresaFilter} onChange={(e)=>setEmpresaFilter(e.target.value)}>
              <option value="">Todas las empresas</option>
              {empresas.map((em)=> (
                <option key={em.id_empresa} value={em.id_empresa}>{em.nombre}</option>
              ))}
            </Form.Select>
          </Col>
        </Row>

        {error && <Alert variant="warning">{error}</Alert>}
        {loading && <Alert variant="info">Cargando...</Alert>}

        <Row className="g-3">
          <Col xs={12} lg={5}>
            {grouped.map((g, gi) => (
              <Card key={`grp-${gi}`} className="border-0 shadow mb-3">
                <div style={{ height: 60, background: 'linear-gradient(135deg, var(--c-sun), var(--c-orange))', display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
                  <div className="fw-semibold text-dark">{g.empresa_nombre}</div>
                </div>
                <Card.Body className="p-2">
                  <div className="border rounded">
                  <ul className="list-group">
                    {g.rutas.map((r, i) => {
                      const fav = isFav(r)
                      return (
                        <li key={r.id_ruta ?? r.id ?? i} className="list-group-item d-flex justify-content-between align-items-center">
                          <Button variant="link" size="sm" className="text-start p-0" style={{ color: 'var(--c-orange)', textDecoration: 'none', fontWeight: 600 }} onClick={() => openRoute(r)}>
                            {r.nombre ?? r.nombre_ruta ?? r.codigo ?? `Ruta ${r.id_ruta ?? r.id ?? ''}`}
                          </Button>
                          <Button size="sm" variant={fav ? 'warning' : 'outline-warning'} disabled={savingFav} onClick={() => toggleFav(r)} title={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
                            {/* Icono de favorito */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill={fav ? 'gold' : 'currentColor'} viewBox="0 0 16 16">
                              <path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.283-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 4.118l-4.898.696c-.443.062-.613.636-.283.95l3.522 3.356-.83 4.73z"/>
                            </svg>
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </Col>
          <Col xs={12} lg={7}>
            <Card className="border-0 shadow">
              <Card.Header className="d-flex align-items-center justify-content-between" style={{ backgroundColor: 'var(--c-sun)' }}>
                <div className="small">{selectedRoute ? (selectedRoute.nombre ?? selectedRoute.nombre_ruta ?? selectedRoute.codigo) : 'Selecciona una ruta para ver detalle'}</div>
                <div className="d-inline-flex p-1 rounded-pill" style={{ background: 'rgba(0,0,0,.06)' }}>
                  <Button size="sm" type="button"
                    style={{ border: 'none', borderRadius: '999px', backgroundColor: view==='ida' ? 'var(--c-orange)' : 'transparent', color: view==='ida' ? '#fff' : '#555' }}
                    onClick={()=>setView('ida')}>Ida</Button>
                  <Button size="sm" type="button"
                    style={{ border: 'none', borderRadius: '999px', backgroundColor: view==='retorno' ? 'var(--c-orange)' : 'transparent', color: view==='retorno' ? '#fff' : '#555' }}
                    onClick={()=>setView('retorno')}>Retorno</Button>
                  <Button size="sm" type="button"
                    style={{ border: 'none', borderRadius: '999px', backgroundColor: view==='ambas' ? 'var(--c-sun)' : 'transparent', color: view==='ambas' ? '#1b1b1b' : '#555' }}
                    onClick={()=>setView('ambas')}>Ambas</Button>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="border rounded map-box" style={{ overflow: 'hidden' }}>
                  <MapContainer center={[2.444, -76.614]} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                    <FitBounds points={boundsPts} />
                    {view!=='retorno' && idaLine.length>1 && (
                      <Polyline positions={idaLine} pathOptions={{ color: '#0d6efd', weight: 5 }} />
                    )}
                    {view!=='ida' && retLine.length>1 && (
                      <Polyline positions={retLine} pathOptions={{ color: '#dc3545', weight: 5 }} />
                    )}
                    {view!=='retorno' && (routeDetails.stopsIda||[]).map((s, i) => (
                      <CircleMarker key={`ida-${i}`} center={[s.lat, s.lng]} radius={5} pathOptions={{ color: '#0d6efd', fillColor: '#0d6efd', fillOpacity: 0.9 }}>
                        <Tooltip>{s.nombre || `Ida ${i+1}`}</Tooltip>
                      </CircleMarker>
                    ))}
                    {view!=='ida' && (routeDetails.stopsRetorno||[]).map((s, i) => (
                      <CircleMarker key={`ret-${i}`} center={[s.lat, s.lng]} radius={5} pathOptions={{ color: '#dc3545', fillColor: '#dc3545', fillOpacity: 0.9 }}>
                        <Tooltip>{s.nombre || `Retorno ${i+1}`}</Tooltip>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                </div>
                {selectedRoute && (
                  <Card className="mt-3">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="fw-semibold">{selectedRoute.nombre ?? selectedRoute.nombre_ruta ?? selectedRoute.codigo}</div>
                        <Button size="sm" variant="outline-warning" onClick={() => openPqrs(selectedRoute)}>PQRS</Button>
                      </div>
                      <Row className="small g-3">
                        <Col md={6}>
                          <div className="text-muted">Paraderos Ida: {routeDetails.stopsIda.length}</div>
                          <ol className="mb-0">
                            {routeDetails.stopsIda.map((s,i)=>(<li key={`li-ida-${i}`}>{s.nombre || `Ida ${i+1}`}</li>))}
                          </ol>
                        </Col>
                        <Col md={6}>
                          <div className="text-muted">Paraderos Retorno: {routeDetails.stopsRetorno.length}</div>
                          <ol className="mb-0">
                            {routeDetails.stopsRetorno.map((s,i)=>(<li key={`li-ret-${i}`}>{s.nombre || `Retorno ${i+1}`}</li>))}
                          </ol>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Modal PQRS */}
      <div className={`modal fade ${showPqrs ? 'show d-block' : ''}`} tabIndex="-1" role="dialog" aria-modal={showPqrs}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Enviar PQRS a la empresa</h5>
              <button type="button" className="btn-close" onClick={()=>setShowPqrs(false)}></button>
            </div>
            <div className="modal-body">
              <div className="mb-2">
                <label className="form-label">Empresa destino</label>
                {empresas.length > 0 ? (
                  <select className="form-select" value={pqrs.empresaId ?? ''} onChange={(e)=>setPqrs(prev=>({...prev, empresaId: Number(e.target.value)||null}))}>
                    <option value="">Selecciona una empresa</option>
                    {empresas.map((em)=> (
                      <option key={em.id_empresa} value={em.id_empresa}>{em.nombre}</option>
                    ))}
                  </select>
                ) : (
                  <input className="form-control" value={pqrs.empresaId ?? ''} onChange={(e)=>setPqrs(prev=>({...prev, empresaId: Number(e.target.value)||null}))} placeholder="ID de la empresa" />
                )}
                <div className="form-text">Si la ruta tiene empresa, se selecciona automáticamente.</div>
              </div>
              <div className="mb-2">
                <label className="form-label">Asunto</label>
                <input className="form-control" value={pqrs.asunto} onChange={(e)=>setPqrs(prev=>({...prev, asunto: e.target.value}))} />
              </div>
              <div className="mb-2">
                <label className="form-label">Mensaje</label>
                <textarea className="form-control" rows={4} value={pqrs.mensaje} onChange={(e)=>setPqrs(prev=>({...prev, mensaje: e.target.value}))}></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowPqrs(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={sendingPqrs} onClick={submitPqrs}>{sendingPqrs ? 'Enviando...' : 'Enviar'}</button>
            </div>
          </div>
        </div>
      </div>
      {showPqrs && <div className="modal-backdrop fade show" onClick={()=>setShowPqrs(false)}></div>}
    </section>
  )
}

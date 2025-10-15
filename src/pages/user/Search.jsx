import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Container, Row, Col, Card, Button, Badge, Alert, Form } from 'react-bootstrap'
import { FaMapMarkedAlt, FaStar, FaExclamationTriangle, FaMap, FaRoute, FaMapMarkerAlt } from 'react-icons/fa'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import { unifiedSearch } from '../../services/searchService'
import { osrmRoute } from '../../services/routingService'
import { listFavoritos, createFavorito, deleteFavorito } from '../../services/favoritosService'
import { createPqrs } from '../../services/pqrsService'
import { getAuthToken, isAuthTokenValid } from '../../services/apiClient'
import { listRutaParaderos } from '../../services/routeParaderosService'
import { fetchAllParaderos } from '../../services/paraderosService'
import { listAllRoutes } from '../../services/routesService'

function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (Array.isArray(points) && points.length > 1) {
      try { map.fitBounds(points, { padding: [20, 20] }) } catch {}
    }
  }, [points, map])
  return null
}

function UserSearch() {
  const loc = useLocation()
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState({ rutas: [], paraderos: [], barrios: [] })
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [routeDetails, setRouteDetails] = useState({ ida: [], retorno: [], stopsIda: [], stopsRetorno: [] })
  const [snapped, setSnapped] = useState({ ida: [], retorno: [] })
  const [view, setView] = useState('ambas')

  const [favs, setFavs] = useState([])
  const [savingFav, setSavingFav] = useState(false)

  const [showPqrs, setShowPqrs] = useState(false)
  const [pqrs, setPqrs] = useState({ asunto: '', mensaje: '', tipo: 'PQRS', referencia: '' })
  const [sendingPqrs, setSendingPqrs] = useState(false)

  useEffect(() => {
    // Cargar favoritos solo si token es válido para evitar 401 innecesarios
    if (isAuthTokenValid()) {
      listFavoritos().then(setFavs).catch(() => setFavs([]))
    } else {
      setFavs([])
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(loc.search)
    const term = (params.get('q') || '').trim()
    setQ(term)
    setSelectedRoute(null)
    setRouteDetails({ ida: [], retorno: [], stopsIda: [], stopsRetorno: [] })
    setSnapped({ ida: [], retorno: [] })
    if (!term) { setResults({ rutas: [], paraderos: [], barrios: [] }); return }
    const run = async () => {
      setLoading(true); setError('')
      try {
        const { rutas, paraderos, barrios } = await unifiedSearch(term)
        const rts = Array.isArray(rutas) ? rutas : []
        const prs = Array.isArray(paraderos) ? paraderos : []
        const brs = Array.isArray(barrios) ? barrios : []
        // Igual que Landing: si hay paraderos o barrios, relacionar rutas por pivotes; si no, usar rutas por nombre
        let finalRouteIds = new Set()
        if (prs.length > 0) {
          try {
            const pivots = await listRutaParaderos().catch(() => [])
            const searchStopIds = new Set(prs.map((p) => String(p.id_paradero ?? p.id)))
            ;(pivots || []).forEach((pv) => {
              const pid = String(pv.paradero_id ?? pv.paraderoId)
              const rid = pv.ruta_id ?? pv.rutaId
              if (searchStopIds.has(pid) && rid != null) finalRouteIds.add(Number(rid))
            })
          } catch (_) {}
        } else if (brs.length > 0) {
          try {
            const [pivots, stops] = await Promise.all([
              listRutaParaderos().catch(() => []),
              fetchAllParaderos().catch(() => []),
            ])
            const barrioIds = new Set(brs.map((b) => String(b.id_barrio ?? b.id)))
            const stopsById = new Map((stops || []).map((p) => [String(p.id_paradero ?? p.id), p]))
            ;(pivots || []).forEach((pv) => {
              const pid = String(pv.paradero_id ?? pv.paraderoId)
              const st = stopsById.get(pid)
              const sbid = String(st?.barrio_id ?? st?.barrioId ?? '')
              if (st && barrioIds.has(sbid)) {
                const rid = pv.ruta_id ?? pv.rutaId
                if (rid != null) finalRouteIds.add(Number(rid))
              }
            })
          } catch (_) {}
        } else {
          finalRouteIds = new Set((rts || []).map((r) => Number(r.id_ruta ?? r.id)).filter((v) => !isNaN(v)))
        }
        // Intersectar con catálogo real de rutas para evitar placeholders
        let finalRoutes = []
        try {
          const catalog = await listAllRoutes().catch(() => [])
          const byId = new Map((catalog || []).map((r) => [Number(r.id_ruta ?? r.id), r]))
          finalRoutes = Array.from(finalRouteIds).map((rid) => byId.get(Number(rid))).filter(Boolean)
          // Respaldo: si alguna ruta viene en rts y no está en catálogo, úsala
          const fromSearchById = new Map((rts || []).map((r) => [Number(r.id_ruta ?? r.id), r]))
          Array.from(finalRouteIds).forEach((rid) => {
            if (!byId.get(Number(rid)) && fromSearchById.get(Number(rid))) finalRoutes.push(fromSearchById.get(Number(rid)))
          })
        } catch (_) {
          const byIdSearch = new Map((rts || []).map((r) => [Number(r.id_ruta ?? r.id), r]))
          finalRoutes = Array.from(finalRouteIds).map((rid) => byIdSearch.get(Number(rid))).filter(Boolean)
        }
        setResults({ rutas: finalRoutes, paraderos: prs, barrios: brs })
      } catch (e) {
        setError(e?.response?.data?.message || 'No se pudo buscar')
      } finally { setLoading(false) }
    }
    run()
  }, [loc.search])

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
        const fresh = await listFavoritos().catch(() => [])
        setFavs(fresh)
      } else {
        const created = await createFavorito({ rutaId: rid })
        if (created === null) { setError('No autorizado. Vuelve a iniciar sesión.'); return }
        const fresh = await listFavoritos().catch(() => [])
        setFavs(fresh)
      }
    } finally { setSavingFav(false) }
  }

  const openRoute = async (route) => {
    setSelectedRoute(route)
    const rid = route?.id_ruta ?? route?.id
    // 1) Si ya vienen puntos en el objeto de ruta (búsqueda avanzada), úsalos directo
    const ida = Array.isArray(route?.ida_points) ? route.ida_points : []
    const ret = Array.isArray(route?.retorno_points) ? route.retorno_points : []
    const stopsIdaFromRoute = Array.isArray(route?.idaParaderos)
      ? route.idaParaderos.map(p => ({ lat: Number(p.latitud ?? p.lat), lng: Number(p.longitud ?? p.lng), nombre: p.nombre })).filter(s => !isNaN(s.lat) && !isNaN(s.lng))
      : []
    const stopsRetFromRoute = Array.isArray(route?.retornoParaderos)
      ? route.retornoParaderos.map(p => ({ lat: Number(p.latitud ?? p.lat), lng: Number(p.longitud ?? p.lng), nombre: p.nombre })).filter(s => !isNaN(s.lat) && !isNaN(s.lng))
      : []

    if ((ida.length > 1 || ret.length > 1)) {
      setRouteDetails({ ida, retorno: ret, stopsIda: stopsIdaFromRoute, stopsRetorno: stopsRetFromRoute })
      try {
        const [snI, snR] = await Promise.all([ osrmRoute(ida), osrmRoute(ret) ])
        setSnapped({ ida: snI, retorno: snR })
      } catch { setSnapped({ ida: [], retorno: [] }) }
      return
    }

    // 2) Fallback: construir puntos desde pivotes y paraderos (similar a Landing.jsx)
    if (!rid) {
      setRouteDetails({ ida: [], retorno: [], stopsIda: [], stopsRetorno: [] })
      setSnapped({ ida: [], retorno: [] })
      return
    }

    try {
      const [pivots, allStops] = await Promise.all([
        listRutaParaderos().catch(() => []),
        fetchAllParaderos().catch(() => []),
      ])
      const own = (Array.isArray(pivots) ? pivots : []).filter(p => (p.ruta_id ?? p.rutaId) == rid)
      const idaPv = own.filter(p => String(p.tipo).toLowerCase() === 'ida').sort((a,b)=> (a.orden ?? 0) - (b.orden ?? 0))
      const retPv = own.filter(p => String(p.tipo).toLowerCase() === 'retorno').sort((a,b)=> (a.orden ?? 0) - (b.orden ?? 0))
      const stopsMap = new Map((allStops || []).map(s => [String(s.id_paradero ?? s.id), s]))
      const toLatLngs = (arr) => arr
        .map(pv => {
          const st = stopsMap.get(String(pv.paradero_id ?? pv.paraderoId))
          const lat = Number(st?.latitud)
          const lng = Number(st?.longitud)
          return (!isNaN(lat) && !isNaN(lng)) ? [lat, lng] : null
        })
        .filter(Boolean)
      const toStops = (arr) => arr
        .map(pv => {
          const st = stopsMap.get(String(pv.paradero_id ?? pv.paraderoId))
          const lat = Number(st?.latitud); const lng = Number(st?.longitud)
          const nombre = st?.nombre || ''
          return (!isNaN(lat) && !isNaN(lng)) ? { lat, lng, nombre } : null
        })
        .filter(Boolean)

      const idaPts = toLatLngs(idaPv)
      const retPts = toLatLngs(retPv)
      const sIda = toStops(idaPv)
      const sRet = toStops(retPv)
      setRouteDetails({ ida: idaPts, retorno: retPts, stopsIda: sIda, stopsRetorno: sRet })
      try {
        const [snI, snR] = await Promise.all([
          osrmRoute(idaPts),
          osrmRoute(retPts),
        ])
        setSnapped({ ida: snI, retorno: snR })
      } catch { setSnapped({ ida: [], retorno: [] }) }
    } catch {
      setRouteDetails({ ida: [], retorno: [], stopsIda: [], stopsRetorno: [] })
      setSnapped({ ida: [], retorno: [] })
    }
  }

  const openPqrs = (route) => {
    const rid = route?.id_ruta ?? route?.id
    const eid = Number(route?.empresa_id ?? route?.empresaId)
    setPqrs({
      asunto: `PQRS sobre ruta ${route?.nombre ?? route?.nombre_ruta ?? route?.codigo ?? rid}`,
      mensaje: '',
      tipo: 'PQRS',
      referencia: `ruta:${rid}`,
      ...(eid && !isNaN(eid) ? { empresaId: eid } : {}),
    })
    setShowPqrs(true)
  }

  const submitPqrs = async () => {
    if (!getAuthToken()) { setError('Debes iniciar sesión para enviar PQRS.'); return }
    setSendingPqrs(true)
    try {
      const eidFromRoute = Number(selectedRoute?.empresa_id ?? selectedRoute?.empresaId) || Number(pqrs?.empresaId)
      const payload = {
        asunto: String(pqrs.asunto || '').trim(),
        mensaje: String(pqrs.mensaje || '').trim(),
        referencia: pqrs.referencia,
        ...(eidFromRoute && !isNaN(eidFromRoute) ? { empresaId: eidFromRoute } : {}),
      }
      if (pqrs.tipo && String(pqrs.tipo).trim()) {
        payload.tipo = String(pqrs.tipo).trim()
      }
      // Validaciones mínimas para evitar 500 por validación en backend
      if (!payload.asunto || !payload.mensaje) {
        setError('Asunto y mensaje son obligatorios')
        return
      }
      if (payload.asunto.length < 3) {
        setError('El asunto debe tener al menos 3 caracteres')
        return
      }
      if (payload.mensaje.length < 5) {
        setError('El mensaje debe tener al menos 5 caracteres')
        return
      }
      await createPqrs(payload)
      setShowPqrs(false)
    } catch (e) {
      setError(e?.message || e?.response?.data?.message || 'No se pudo enviar el PQRS')
    } finally { setSendingPqrs(false) }
  }

  const rawPts = view==='ida' ? (routeDetails.ida||[]) : view==='retorno' ? (routeDetails.retorno||[]) : [ ...(routeDetails.ida||[]), ...(routeDetails.retorno||[]) ]
  const idaLine = (snapped.ida?.length ? snapped.ida : routeDetails.ida) || []
  const retLine = (snapped.retorno?.length ? snapped.retorno : routeDetails.retorno) || []
  const boundsPts = view==='ida' ? idaLine : view==='retorno' ? retLine : [ ...idaLine, ...retLine ]

  return (
    <section>
      {!getAuthToken() && (
        <Alert variant="info" className="d-flex justify-content-between align-items-center">
          <div>Para agregar a favoritos o enviar PQRS debes iniciar sesión.</div>
          <a className="btn btn-sm btn-accent" href="/login">Iniciar sesión</a>
        </Alert>
      )}
      <Container className="py-3">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h5 className="m-0">Resultados de búsqueda</h5>
          <div className="text-muted">{q ? `"${q}"` : 'Ingresa un término en la barra superior'}</div>
        </div>
        {error && <Alert variant="warning">{error}</Alert>}
        {loading && <Alert variant="info">Buscando...</Alert>}

        <Row className="g-3">
          <Col xs={12} lg={5} className="order-2 order-lg-1">
            <Card className="border-0 shadow">
              <Card.Header style={{ backgroundColor: 'var(--c-sun)' }}>
                <div className="d-flex align-items-center gap-2"><FaRoute/> <span>Rutas</span></div>
              </Card.Header>
              <Card.Body className="p-2">
                <ul className="list-group">
                  {(results.rutas || []).length === 0 && <li className="list-group-item text-muted">Sin resultados</li>}
                  {(results.rutas || []).map((r, i) => {
                    const fav = isFav(r)
                    return (
                      <li key={r.id_ruta ?? r.id ?? i} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-semibold">{r.nombre ?? r.nombre_ruta ?? r.codigo ?? `Ruta ${r.id_ruta ?? r.id ?? ''}`}</div>
                          {r.empresa?.nombre && <div className="small text-muted">Empresa: {r.empresa?.nombre}</div>}
                        </div>
                        <div className="btn-group">
                          <Button size="sm" variant="outline-secondary" title="Ver en mapa" onClick={() => openRoute(r)}><FaMap/></Button>
                          <Button size="sm" variant={fav ? 'success' : 'outline-success'} title={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'} disabled={savingFav} onClick={() => toggleFav(r)}><FaStar/></Button>
                          <Button size="sm" variant="outline-warning" title="PQRS" onClick={() => openPqrs(r)}><FaExclamationTriangle/></Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </Card.Body>
            </Card>

            <Card className="border-0 shadow mt-3">
              <Card.Header style={{ backgroundColor: 'var(--c-orange)', color: '#fff' }}>Paraderos</Card.Header>
              <Card.Body className="p-2">
                <ul className="list-group">
                  {(results.paraderos || []).length === 0 && <li className="list-group-item text-muted">Sin resultados</li>}
                  {(results.paraderos || []).map((p, i) => (
                    <li key={p.id_paradero ?? p.id ?? i} className="list-group-item d-flex align-items-center gap-2">
                      <span className="text-danger" title="Paradero"><FaMapMarkerAlt/></span>
                      <span>{p.nombre ?? '—'}</span>
                    </li>
                  ))}
                </ul>
              </Card.Body>
            </Card>

            <Card className="border-0 shadow mt-3">
              <Card.Header style={{ backgroundColor: 'var(--c-sun)' }}>Barrios</Card.Header>
              <Card.Body className="p-2">
                <ul className="list-group">
                  {(results.barrios || []).length === 0 && <li className="list-group-item text-muted">Sin resultados</li>}
                  {(results.barrios || []).map((b, i) => (
                    <li key={b.id_barrio ?? b.id ?? i} className="list-group-item">{b.nombre ?? '—'}</li>
                  ))}
                </ul>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} lg={7} className="order-1 order-lg-2">
            <Card className="border-0 shadow">
              <Card.Header className="d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--c-sun)' }}>
                <div className="small">{selectedRoute ? (selectedRoute.nombre ?? selectedRoute.nombre_ruta ?? selectedRoute.codigo) : 'Selecciona una ruta para ver el mapa'}</div>
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
                      <Polyline positions={idaLine} pathOptions={{ color: 'var(--c-orange)', weight: 5 }} />
                    )}
                    {view!=='ida' && retLine.length>1 && (
                      <Polyline positions={retLine} pathOptions={{ color: '#dc3545', weight: 5 }} />
                    )}
                    {view!=='retorno' && (routeDetails.stopsIda||[]).map((s, i) => (
                      <CircleMarker key={`ida-${i}`} center={[s.lat, s.lng]} radius={5} pathOptions={{ color: 'var(--c-orange)', fillColor: 'var(--c-orange)', fillOpacity: 0.9 }}>
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

                {showPqrs && (
                  <Card className="mt-3 border-0 shadow">
                    <div style={{ height: 60, background: 'linear-gradient(135deg, var(--c-sun), var(--c-orange))', display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
                      <div className="d-flex align-items-center gap-2 text-dark fw-bold"><FaExclamationTriangle/> <span>Enviar PQRS</span></div>
                      <div className="ms-auto small text-dark">{pqrs.referencia || ''}</div>
                    </div>
                    <Card.Body>
                      <Row className="g-2">
                        <Col md={6}>
                          <Form.Group className="mb-2">
                            <Form.Label className="mb-1">Asunto</Form.Label>
                            <Form.Control size="sm" value={pqrs.asunto} onChange={(e)=>setPqrs(prev=>({...prev, asunto: e.target.value}))} />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-2">
                            <Form.Label className="mb-1">Referencia</Form.Label>
                            <Form.Control size="sm" value={pqrs.referencia} onChange={(e)=>setPqrs(prev=>({...prev, referencia: e.target.value}))} />
                          </Form.Group>
                        </Col>
                        <Col xs={12}>
                          <Form.Group className="mb-2">
                            <Form.Label className="mb-1">Mensaje</Form.Label>
                            <Form.Control as="textarea" rows={4} value={pqrs.mensaje} onChange={(e)=>setPqrs(prev=>({...prev, mensaje: e.target.value}))} />
                          </Form.Group>
                        </Col>
                        <Col xs={12} className="d-flex gap-2">
                          <Button size="sm" variant="outline-secondary" onClick={()=>setShowPqrs(false)}>Cancelar</Button>
                          <Button size="sm" className="btn-accent" disabled={sendingPqrs} onClick={submitPqrs}>{sendingPqrs ? 'Enviando...' : 'Enviar'}</Button>
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
    </section>
  )
}

export default UserSearch

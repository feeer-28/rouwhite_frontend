import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Container, Row, Col, Card, Button, Badge, Alert, Form } from 'react-bootstrap'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap, Marker } from 'react-leaflet'
import { FaMapMarkerAlt, FaRoute, FaStar, FaLocationArrow } from 'react-icons/fa'
import L from 'leaflet'
import { fetchAllParaderos } from '../../services/paraderosService'

const userIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
})

function makeStopIcon(isNearest = false) {
  const color = isNearest ? '#198754' : '#0d6efd'
  const html = `
    <div style="position:relative; transform: translate(-50%, -100%);">
      <div style="width:24px;height:24px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 0 0 2px #fff inset, 0 1px 4px rgba(0,0,0,.4);">
        <span style="font-size:14px;line-height:1">🚏</span>
      </div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);"></div>
    </div>`
  return L.divIcon({ className: 'stop-divicon', html, iconSize: [24, 32], iconAnchor: [12, 26], popupAnchor: [0, -24] })
}

function FitAll({ points }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (!Array.isArray(points) || points.length === 0) return
    if (done.current) return
    done.current = true
    try { map.fitBounds(points, { padding: [20, 20] }) } catch {}
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

function UserDashboard() {
  const [search, setSearch] = useState('')
  const [paraderos, setParaderos] = useState([])
  const [geo, setGeo] = useState({ enabled: false, coords: null, nearest: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      setLoading(true); setError('')
      try {
        const ps = await fetchAllParaderos().catch(() => [])
        setParaderos(Array.isArray(ps) ? ps : [])
      } catch (e) {
        setError(e?.response?.data?.message || 'No se pudieron cargar los paraderos')
      } finally { setLoading(false) }
    }
    run()
  }, [])

  const enableGeolocation = async () => {
    if (!navigator.geolocation) { setError('Geolocalización no soportada'); return }
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, maximumAge: 10000, timeout: 20000 })
      })
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      // Calcular más cercano
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

  const points = useMemo(() => {
    const pts = []
    if (geo.coords) pts.push([geo.coords.lat, geo.coords.lng])
    for (const p of paraderos) {
      const lat = Number(p.latitud); const lng = Number(p.longitud)
      if (!isNaN(lat) && !isNaN(lng)) pts.push([lat, lng])
    }
    return pts
  }, [geo.coords, paraderos])

  return (
    <section>
      <Container className="py-4">
        <Row className="align-items-center mb-3 g-2">
          <Col xs={12} md={8}>
            <h4 className="m-0">Tu panel</h4>
            <div className="text-muted">Buses en tiempo real, paraderos cercanos y rutas favoritas.</div>
          </Col>
          <Col xs={12} md={4} className="text-md-end">
            <Button size="sm" className="btn-accent" onClick={enableGeolocation}><FaLocationArrow className="me-1"/> Activar ubicación</Button>
          </Col>
        </Row>

        <Row className="g-3">
          <Col xs={12} lg={7}>
            <Card className="h-100 border-0 shadow">
              <div style={{ height: 76, background: 'linear-gradient(135deg, var(--c-sun), var(--c-orange))', display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
                <div className="d-flex align-items-center gap-2 text-dark fw-bold">
                  <FaMapMarkerAlt/>
                  <span>Paraderos cercanos</span>
                </div>
                <div className="ms-auto d-none d-md-flex align-items-center gap-2">
                  {geo.nearest && <Badge pill bg="" style={{ backgroundColor: 'var(--c-sun)', color: '#1b1b1b' }}>Más cercano: {geo.nearest.paradero?.nombre || '—'}</Badge>}
                </div>
              </div>
              <Card.Body>
                {error && <Alert variant="warning">{error}</Alert>}
                {loading && <Alert variant="info">Cargando paraderos...</Alert>}
                <div className="border rounded map-box" style={{ overflow: 'hidden' }}>
                  <MapContainer center={[2.444, -76.614]} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                    <FitAll points={points} />
                    {geo.coords && (
                      <Marker position={[geo.coords.lat, geo.coords.lng]} icon={userIcon}>
                        <Tooltip>Tu ubicación</Tooltip>
                      </Marker>
                    )}
                    {(paraderos || []).map((p, i) => {
                      const lat = Number(p.latitud); const lng = Number(p.longitud)
                      if (isNaN(lat) || isNaN(lng)) return null
                      const isNearest = geo.nearest && (p.id_paradero === geo.nearest.paradero?.id_paradero)
                      return (
                        <Marker key={p.id_paradero ?? i} position={[lat, lng]} icon={makeStopIcon(Boolean(isNearest))}>
                          <Tooltip>
                            {(p.nombre || `Paradero ${p.id_paradero ?? ''}`) + (isNearest ? ' (más cercano)' : '')}
                          </Tooltip>
                        </Marker>
                      )
                    })}
                  </MapContainer>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} lg={5}>
            <Row className="g-3">
              <Col xs={12}>
                <Card className="h-100 border-0 shadow">
                  <div style={{ height: 76, background: 'linear-gradient(135deg, var(--c-sun), var(--c-orange))', display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
                    <div className="d-flex align-items-center gap-2 text-dark fw-bold">Buscar</div>
                  </div>
                  <Card.Body>
                    <Form onSubmit={(e)=>{ e.preventDefault(); const term = (search||'').trim(); if(term) window.location.assign(`/usuario/buscar?q=${encodeURIComponent(term)}`) }}>
                      <Form.Control placeholder="Buscar rutas, paraderos, barrios" value={search} onChange={(e)=>setSearch(e.target.value)} />
                      <div className="text-end mt-2">
                        <Button size="sm" className="btn-accent" type="submit">Buscar</Button>
                      </div>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12}>
                <Card className="h-100 border-0 shadow">
                  <div style={{ height: 76, background: 'linear-gradient(135deg, var(--c-sun), var(--c-orange))', display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
                    <div className="d-flex align-items-center gap-2 text-dark fw-bold">
                      <FaStar/>
                      <span>Rutas favoritas</span>
                    </div>
                  </div>
                  <Card.Body className="d-flex flex-column">
                    <div className="text-muted small mb-3">Accede a tus rutas guardadas para gestionarlas.</div>
                    <div className="mt-auto">
                      <Link className="btn btn-accent btn-sm" to="/usuario/favoritos"><FaRoute className="me-1"/> Ver rutas favoritas</Link>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12}>
                <Card className="h-100 border-0 shadow">
                  <Card.Body>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="fw-semibold">Acciones rápidas</div>
                    </div>
                    <div className="d-grid gap-2">
                      <Link className="btn btn-sun btn-sm" to="/usuario/rutas">Explorar rutas públicas</Link>
                      <Link className="btn btn-outline-secondary btn-sm" to="/usuario?profile=1">Editar perfil</Link>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>
    </section>
  )
}

export default UserDashboard

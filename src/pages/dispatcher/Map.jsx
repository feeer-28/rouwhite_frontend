import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { listBuses } from '../../services/busesService'
import { getPublicBusLocation, streamPublicBusLocation } from '../../services/busLocationService'
import { listCompanies } from '../../services/companiesService'
import { listAllRoutes } from '../../services/routesService'
import { listRutaParaderos } from '../../services/routeParaderosService'
import { fetchAllParaderos } from '../../services/paraderosService'
import { osrmRoute } from '../../services/routingService'

// Helper: color per company
function getCompanyColor(empresaId, companies) {
  const eid = String(empresaId || '')
  const byId = new Map((companies||[]).map(c => [String(c.id_empresa ?? c.id), (c.nombre_empresa || c.nombre || '').toLowerCase()]))
  const name = byId.get(eid) || ''
  if (eid === '1' || name.includes('transpubenza')) return '#0d6efd' // azul
  if (eid === '3' || name.includes('transtambo')) return '#198754' // verde
  if (eid === '2' || name.includes('translibertad')) return '#ffc107' // amarillo
  if (eid === '4' || name.includes('sotracauca')) return '#dc3545' // rojo
  return '#6c757d' // gris
}

function makeBusIcon(empresaId, companies) {
  const color = getCompanyColor(empresaId, companies)
  const html = `
    <div style="position:relative; transform: translate(-50%, -100%);">
      <div style="width:28px;height:28px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 0 0 2px #fff inset, 0 1px 4px rgba(0,0,0,.4);">
        <span style="font-size:14px;line-height:1">🚌</span>
      </div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);"></div>
    </div>`
  return L.divIcon({ className: 'bus-divicon', html, iconSize: [28, 36], iconAnchor: [14, 30], popupAnchor: [0, -28] })
}

function DispatcherMap() {
  const [buses, setBuses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const timerRef = useRef(null)
  const mapRef = useRef(null)
  const [companies, setCompanies] = useState([])
  const [routes, setRoutes] = useState([])
  const liveMapRef = useRef(new Map()) // id_bus -> {lat,lng,at}
  const streamsRef = useRef(new Map()) // id_bus -> EventSource
  const [liveTick, setLiveTick] = useState(0) // fuerza re-render al llegar datos
  const [fitTick, setFitTick] = useState(0)
  const [routeOverlay, setRouteOverlay] = useState({ ida: [], retorno: [], snappedIda: [], snappedRet: [], forBusId: null, routeName: '' })

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const arr = await listBuses()
      setBuses(Array.isArray(arr) ? arr : [])
      // Abrir SSE por cada bus activo
      const list = (Array.isArray(arr) ? arr : []).filter(b => b.estado !== false)
      list.forEach(async (b) => {
        const id = b.id_bus ?? b.id
        if (!id) return
        if (streamsRef.current.has(id)) return
        try {
          // Snapshot inicial público
          try {
            const snap = await getPublicBusLocation(id)
            const lat = Number(snap?.latitud ?? snap?.lat)
            const lng = Number(snap?.longitud ?? snap?.lng)
            if (!isNaN(lat) && !isNaN(lng)) {
              liveMapRef.current.set(id, { lat, lng, at: snap?.updatedAt ?? snap?.timestamp ?? Date.now() })
              setLiveTick(t => t + 1)
            }
          } catch {}
          // Stream público SSE
          const es = streamPublicBusLocation(id)
          es.onmessage = (ev) => {
            try {
              const msg = JSON.parse(ev.data)
              const lat = Number(msg?.latitud ?? msg?.lat)
              const lng = Number(msg?.longitud ?? msg?.lng)
              if (!isNaN(lat) && !isNaN(lng)) {
                liveMapRef.current.set(id, { lat, lng, at: msg?.updatedAt ?? msg?.timestamp ?? Date.now() })
                setLiveTick(t => t + 1)
              }
            } catch {}
          }
          es.onerror = () => { /* silenciar errores */ }
          streamsRef.current.set(id, es)
        } catch {}
      })
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo cargar buses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    timerRef.current = setInterval(load, 5000) // refresco cada 5s
    // cargar empresas (solo para resolver nombre en popup si es necesario)
    listCompanies().then((c) => {
      const arr = Array.isArray(c) ? c : (Array.isArray(c?.data) ? c.data : [])
      setCompanies(arr)
    }).catch(() => {})
    // cargar rutas para mostrar nombre en popup
    listAllRoutes().then((r) => {
      setRoutes(Array.isArray(r) ? r : [])
    }).catch(() => {})
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      // Cerrar todos los streams
      streamsRef.current.forEach((es) => { try { es.close() } catch {} })
      streamsRef.current.clear()
    }
  }, [])

  const activeWithCoords = useMemo(() => {
    return buses.map((b) => {
      const id = b.id_bus ?? b.id
      const live = id ? liveMapRef.current.get(id) : null
      const lat = live ? Number(live.lat) : Number(b.latitud)
      const lng = live ? Number(live.lng) : Number(b.longitud)
      return { ...b, latitud: lat, longitud: lng }
    }).filter((b) => {
      const ok = b.estado !== false // por defecto true
      const lat = Number(b.latitud)
      const lng = Number(b.longitud)
      return ok && !isNaN(lat) && !isNaN(lng)
    })
  }, [buses, liveTick])

  const filteredByEmpresa = activeWithCoords

  const mapCenter = useMemo(() => {
    const arr = filteredByEmpresa
    if (arr.length) {
      const lat = arr.reduce((s, p) => s + Number(p.latitud), 0) / arr.length
      const lng = arr.reduce((s, p) => s + Number(p.longitud), 0) / arr.length
      return [lat, lng]
    }
    return [2.444, -76.614]
  }, [filteredByEmpresa])

  const zoomTo = (b) => {
    const lat = Number(b.latitud); const lng = Number(b.longitud)
    if (!isNaN(lat) && !isNaN(lng) && mapRef.current) {
      mapRef.current.setView([lat, lng], 16)
    }
  }

  const loadBusRouteOverlay = async (bus) => {
    try {
      const rid = Number(bus?.ruta_id ?? bus?.rutaId)
      if (!rid || Number.isNaN(rid)) { setRouteOverlay({ ida: [], retorno: [], snappedIda: [], snappedRet: [], forBusId: bus?.id_bus ?? bus?.id, routeName: '' }); return }
      const [pivots, allStops] = await Promise.all([
        listRutaParaderos().catch(() => []),
        fetchAllParaderos().catch(() => []),
      ])
      const own = (Array.isArray(pivots) ? pivots : []).filter(p => Number(p.ruta_id ?? p.rutaId) === rid)
      const idaPv = own.filter(p => String(p.tipo).toLowerCase() === 'ida').sort((a,b)=> (a.orden ?? 0) - (b.orden ?? 0))
      const retPv = own.filter(p => String(p.tipo).toLowerCase() === 'retorno').sort((a,b)=> (a.orden ?? 0) - (b.orden ?? 0))
      const stopsMap = new Map((allStops || []).map(s => [String(s.id_paradero ?? s.id), s]))
      const toLatLngs = (arr) => arr
        .map(pv => {
          const st = stopsMap.get(String(pv.paradero_id ?? pv.paraderoId))
          const lat = Number(st?.latitud); const lng = Number(st?.longitud)
          return (!isNaN(lat) && !isNaN(lng)) ? [lat, lng] : null
        })
        .filter(Boolean)
      const ida = toLatLngs(idaPv)
      const retorno = toLatLngs(retPv)
      let snappedIda = [], snappedRet = []
      try {
        const [snI, snR] = await Promise.all([
          osrmRoute(ida),
          osrmRoute(retorno),
        ])
        snappedIda = snI; snappedRet = snR
      } catch {}
      const rmap = new Map((routes||[]).map(r => [Number(r.id_ruta ?? r.id), r]))
      const r = rmap.get(rid)
      const routeName = r ? (r.nombre_ruta ?? r.nombre ?? `Ruta ${rid}`) : `Ruta ${rid}`
      setRouteOverlay({ ida, retorno, snappedIda, snappedRet, forBusId: bus?.id_bus ?? bus?.id, routeName })
    } catch {
      setRouteOverlay({ ida: [], retorno: [], snappedIda: [], snappedRet: [], forBusId: bus?.id_bus ?? bus?.id, routeName: '' })
    }
  }

  function FitAll({ points, tick }) {
    const map = useMap()
    useEffect(() => {
      if (!Array.isArray(points) || points.length === 0) return
      try {
        if (points.length === 1) map.setView(points[0], Math.max(map.getZoom(), 15))
        else map.fitBounds(points, { padding: [20, 20] })
      } catch {}
    }, [tick, map])
    return null
  }

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="m-0">Mapa general</h4>
        <div className="text-muted">
          {(() => {
            // "buses" ya viene filtrado por la empresa del token (listBuses)
            const totalActive = (buses || []).filter(b => b.estado !== false).length
            const withPos = filteredByEmpresa.length
            return `Activos con posición: ${withPos} / Activos: ${totalActive}`
          })()}
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {/* Sin selector de empresa: este mapa solo muestra los buses de la empresa del token */}

      <div className="border rounded" style={{ height: 360, overflow: 'hidden' }}>
        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true} whenCreated={(m) => (mapRef.current = m)}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          <FitAll points={filteredByEmpresa.map(b => [Number(b.latitud), Number(b.longitud)])} tick={fitTick} />
          {filteredByEmpresa.map((b) => (
            <Marker key={`bus-${b.id_bus ?? b.id}`} position={[Number(b.latitud), Number(b.longitud)]} icon={makeBusIcon(b.empresa_id, companies)} eventHandlers={{ click: () => loadBusRouteOverlay(b) }}>
              <Popup>
                <div>
                  <div><strong>Placa:</strong> {b.placa || '—'}</div>
                  <div><strong>Empresa:</strong> {(() => {
                    const byId = new Map((companies||[]).map(c => [String(c.id_empresa ?? c.id), c.nombre_empresa || c.nombre]))
                    return byId.get(String(b.empresa_id)) || b.empresa_id
                  })()}</div>
                  <div><strong>Ruta:</strong> {(() => {
                    const rid = Number(b.ruta_id ?? b.rutaId)
                    const byId = new Map((routes||[]).map(r => [Number(r.id_ruta ?? r.id), r]))
                    const r = byId.get(rid)
                    return r ? (r.nombre_ruta ?? r.nombre ?? `Ruta ${rid}`) : (rid || '—')
                  })()}</div>
                  <div className="mt-2"><button className="btn btn-sm btn-outline-primary" onClick={() => loadBusRouteOverlay(b)}>Ver ruta</button></div>
                </div>
              </Popup>
            </Marker>
          ))}
          {(() => {
            const idaLine = routeOverlay.snappedIda?.length ? routeOverlay.snappedIda : routeOverlay.ida
            const retLine = routeOverlay.snappedRet?.length ? routeOverlay.snappedRet : routeOverlay.retorno
            return (
              <>
                {idaLine?.length > 1 && (
                  <Polyline positions={idaLine} pathOptions={{ color: '#0d6efd', weight: 5 }} />
                )}
                {retLine?.length > 1 && (
                  <Polyline positions={retLine} pathOptions={{ color: '#dc3545', weight: 5 }} />
                )}
              </>
            )
          })()}
        </MapContainer>
      </div>
      <div className="d-flex justify-content-end mt-2">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => setFitTick(t => t + 1)}>Centrar activos</button>
      </div>
      {loading && <div className="small text-muted mt-2">Actualizando...</div>}
      <div className="small text-muted mt-1">Se muestran buses activos de todas las empresas. Actualiza cada 5 segundos.</div>

      <div className="card mt-3 border-0 shadow-sm">
        <div className="card-body p-2">
          <div className="table-responsive" style={{ maxHeight: 220, overflowY: 'auto' }}>
            <table className="table table-hover table-sm align-middle mb-0 small">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  <th>Placa</th>
                  <th>Empresa</th>
                  <th style={{ width: 160 }}>Estado</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredByEmpresa.length === 0 && <tr><td colSpan={5} className="text-center py-3">No hay buses activos</td></tr>}
                {filteredByEmpresa.map((b, i) => {
                  const id = b.id_bus ?? b.id
                  const hasLive = !!liveMapRef.current.get(id)
                  return (
                    <tr key={`row-bus-${id ?? i}`}>
                      <td>{i + 1}</td>
                      <td>{b.placa || '—'}</td>
                      <td>{b.empresa_id}</td>
                      <td>
                        {hasLive ? (
                          <span className="badge text-bg-success">en vivo</span>
                        ) : (
                          <span className="badge text-bg-secondary">sin ubicación</span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-primary" onClick={() => zoomTo(b)} title="Centrar">Centrar</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DispatcherMap

import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { listBusesAll } from '../../services/busesService'
import { getPublicBusLocation, streamPublicBusLocation } from '../../services/busLocationService'
import { listCompanies } from '../../services/companiesService'
import { listAllRoutes } from '../../services/routesService'
import { listRutaParaderos } from '../../services/routeParaderosService'
import { fetchAllParaderos } from '../../services/paraderosService'
import { osrmRoute } from '../../services/routingService'

// Helpers: colored bus icon per company
function getCompanyColor(empresaId, companies) {
  const eid = String(empresaId || '')
  const byId = new Map((companies||[]).map(c => [String(c.id_empresa ?? c.id), (c.nombre_empresa || c.nombre || '').toLowerCase()]))
  const name = byId.get(eid) || ''
  if (eid === '1' || name.includes('transpubenza')) return '#0d6efd' // azul
  if (eid === '3' || name.includes('transtambo')) return '#198754' // verde
  if (eid === '2' || name.includes('translibertad')) return '#ffc107' // amarillo
  if (eid === '4' || name.includes('sotracauca')) return '#dc3545' // rojo
  return '#6c757d'
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

function FitAll({ points, tick }) {
  const map = useMap()
  useEffect(() => {
    if (tick <= 0) return // no auto-centering on mount or updates
    if (!Array.isArray(points) || points.length === 0) return
    try {
      if (points.length === 1) map.setView(points[0], Math.max(map.getZoom(), 15))
      else map.fitBounds(points, { padding: [20, 20] })
    } catch {}
  }, [tick, map])
  return null
}

function UserLiveMap() {
  const [buses, setBuses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fitTick, setFitTick] = useState(0)
  const [liveTick, setLiveTick] = useState(0)
  const streamsRef = useRef(new Map()) // idBus -> EventSource
  const liveMapRef = useRef(new Map()) // idBus -> {lat,lng,at}
  const [companies, setCompanies] = useState([])
  const [routes, setRoutes] = useState([])
  const [selectedEmpresaId, setSelectedEmpresaId] = useState('')
  const [routeOverlay, setRouteOverlay] = useState({ ida: [], retorno: [], snappedIda: [], snappedRet: [], stopsIda: [], stopsRetorno: [], forBusId: null, routeName: '' })

  const load = async () => {
    setLoading(true); setError('')
    try {
      const arr = await listBusesAll()
      // Filtrar activos si backend indica estado
      const active = (arr || []).filter((b) => b.estado === true || b.estado === 1 || b.estado === undefined)
      setBuses(active)
      // Abrir SSE por cada bus activo (si no existe) y snapshot
      for (const b of active) {
        const id = b.id_bus ?? b.id
        if (!id) continue
        // Snapshot inicial
        try {
          const snap = await getPublicBusLocation(id)
          const lat = Number(snap?.latitud ?? snap?.lat); const lng = Number(snap?.longitud ?? snap?.lng)
          if (!isNaN(lat) && !isNaN(lng)) {
            liveMapRef.current.set(String(id), { lat, lng, at: snap?.updatedAt ?? snap?.timestamp ?? Date.now() })
            setLiveTick((t) => t + 1)
          }
        } catch {}
        // Stream SSE si aún no existe
        if (!streamsRef.current.has(String(id))) {
          try {
            const es = streamPublicBusLocation(id)
            es.onmessage = (ev) => {
              try {
                const msg = JSON.parse(ev.data)
                const lat = Number(msg?.latitud ?? msg?.lat)
                const lng = Number(msg?.longitud ?? msg?.lng)
                if (!isNaN(lat) && !isNaN(lng)) {
                  liveMapRef.current.set(String(id), { lat, lng, at: msg?.updatedAt ?? msg?.timestamp ?? Date.now() })
                  setLiveTick((t) => t + 1)
                }
              } catch {}
            }
            es.onerror = () => { /* silencioso */ }
            streamsRef.current.set(String(id), es)
          } catch {}
        }
      }
      // Cerrar streams de buses que ya no están en activos
      for (const [id, es] of streamsRef.current.entries()) {
        const stillActive = active.some((b) => String(b.id_bus ?? b.id) === String(id))
        if (!stillActive) {
          try { es.close() } catch {}
          streamsRef.current.delete(id)
          liveMapRef.current.delete(id)
          setLiveTick((t) => t + 1)
        }
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudieron cargar buses en tiempo real')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 10000) // actualizar cada 10s
    return () => {
      clearInterval(t)
      for (const es of streamsRef.current.values()) {
        try { es.close() } catch {}
      }
      streamsRef.current.clear()
      liveMapRef.current.clear()
    }
  }, [])

  // Cargar catálogos para nombres y filtro
  useEffect(() => {
    listCompanies().then((c) => {
      const arr = Array.isArray(c) ? c : (Array.isArray(c?.data) ? c.data : [])
      setCompanies(arr)
    }).catch(() => {})
    listAllRoutes().then((r) => {
      setRoutes(Array.isArray(r) ? r : [])
    }).catch(() => {})
  }, [])

  const busById = useMemo(() => new Map((buses||[]).map(b => [String(b.id_bus ?? b.id), b])), [buses])
  const liveEntries = useMemo(() => Array.from(liveMapRef.current.entries()), [liveTick])
  const filteredLive = useMemo(() => {
    if (!selectedEmpresaId) return liveEntries
    return liveEntries.filter(([id]) => {
      const meta = busById.get(String(id))
      return meta ? String(meta.empresa_id ?? meta.empresaId) === String(selectedEmpresaId) : false
    })
  }, [liveEntries, selectedEmpresaId, busById])
  const points = useMemo(() => filteredLive.map(([, p]) => [p.lat, p.lng]), [filteredLive])

  const loadBusRouteOverlay = async (busId) => {
    const meta = busById.get(String(busId)) || {}
    try {
      const rid = Number(meta?.ruta_id ?? meta?.rutaId)
      if (!rid || Number.isNaN(rid)) { setRouteOverlay({ ida: [], retorno: [], snappedIda: [], snappedRet: [], forBusId: String(busId), routeName: '' }); return }
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
      const toStops = (arr) => arr
        .map(pv => {
          const st = stopsMap.get(String(pv.paradero_id ?? pv.paraderoId))
          const lat = Number(st?.latitud); const lng = Number(st?.longitud)
          const nombre = st?.nombre || ''
          return (!isNaN(lat) && !isNaN(lng)) ? { lat, lng, nombre } : null
        }).filter(Boolean)
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
      const stopsIda = toStops(idaPv)
      const stopsRetorno = toStops(retPv)
      setRouteOverlay({ ida, retorno, snappedIda, snappedRet, stopsIda, stopsRetorno, forBusId: String(busId), routeName })
    } catch {
      setRouteOverlay({ ida: [], retorno: [], snappedIda: [], snappedRet: [], stopsIda: [], stopsRetorno: [], forBusId: String(busId), routeName: '' })
    }
  }

  return (
    <div>
      <div className="d-flex align-items-end justify-content-between mb-2">
        <h4 className="m-0">Mapa en tiempo real</h4>
        <div style={{ maxWidth: 320 }} className="w-100 text-end">
          <label className="form-label small m-0">Empresa</label>
          <select className="form-select form-select-sm" value={String(selectedEmpresaId || '')} onChange={(e) => setSelectedEmpresaId(e.target.value)}>
            <option value="">Todas</option>
            {(companies||[]).map((c) => (
              <option key={c.id_empresa ?? c.id} value={c.id_empresa ?? c.id}>{c.nombre_empresa || c.nombre}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <div className="alert alert-warning">{error}</div>}
      {loading && <div className="alert alert-info">Cargando...</div>}
      <div className="border rounded" style={{ height: 380, overflow: 'hidden' }}>
        <MapContainer center={[2.444, -76.614]} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          <FitAll points={points} tick={fitTick} />
          {filteredLive.map(([id, pos]) => {
            const meta = busById.get(String(id)) || {}
            return (
            <Marker key={`buslive-${id}`} position={[pos.lat, pos.lng]} icon={makeBusIcon(meta.empresa_id ?? meta.empresaId, companies)} eventHandlers={{ click: () => loadBusRouteOverlay(id) }}>
              <Tooltip>
                <div className="small">
                  {(() => {
                    const b = busById.get(String(id)) || {}
                    const placa = b.placa ? `Bus ${b.placa}` : `Bus ${id}`
                    const ename = (() => {
                      const byId = new Map((companies||[]).map(e => [String(e.id_empresa ?? e.id), e.nombre_empresa || e.nombre]))
                      return byId.get(String(b.empresa_id ?? b.empresaId)) || (b.empresa_id ?? '')
                    })()
                    const rname = (() => {
                      const rid = Number(b.ruta_id ?? b.rutaId)
                      const byR = new Map((routes||[]).map(r => [Number(r.id_ruta ?? r.id), r]))
                      const r = byR.get(rid)
                      return r ? (r.nombre_ruta ?? r.nombre ?? `Ruta ${rid}`) : (rid || '')
                    })()
                    return (
                      <>
                        <div>{placa}</div>
                        {ename && <div>Empresa: {ename}</div>}
                        {rname && <div>Ruta: {rname}</div>}
                        <div>{pos?.at ? new Date(pos.at).toLocaleTimeString() : ''}</div>
                      </>
                    )
                  })()}
                </div>
              </Tooltip>
            </Marker>)
          })}
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
                {(routeOverlay.stopsIda || []).map((s, i) => (
                  <CircleMarker key={`ida-${i}`} center={[s.lat, s.lng]} radius={5} pathOptions={{ color: '#0d6efd', fillColor: '#0d6efd', fillOpacity: 0.9 }}>
                    <Tooltip>{s.nombre || `Ida ${i + 1}`}</Tooltip>
                  </CircleMarker>
                ))}
                {(routeOverlay.stopsRetorno || []).map((s, i) => (
                  <CircleMarker key={`ret-${i}`} center={[s.lat, s.lng]} radius={5} pathOptions={{ color: '#dc3545', fillColor: '#dc3545', fillOpacity: 0.9 }}>
                    <Tooltip>{s.nombre || `Retorno ${i + 1}`}</Tooltip>
                  </CircleMarker>
                ))}
              </>
            )
          })()}
        </MapContainer>
      </div>
      <div className="d-flex align-items-center justify-content-between mt-2">
        <div className="small text-muted">Azul: ida · Rojo: retorno</div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => setFitTick((x) => x + 1)}>Centrar</button>
          <button className="btn btn-outline-danger btn-sm" onClick={() => setRouteOverlay({ ida: [], retorno: [], snappedIda: [], snappedRet: [], stopsIda: [], stopsRetorno: [], forBusId: null, routeName: '' })}>Ocultar ruta</button>
        </div>
      </div>
    </div>
  )
}

export default UserLiveMap

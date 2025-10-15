import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { listBuses, createBus, updateBus, deleteBus, activateBus, deactivateBus } from '../../services/busesService'
import { FaEdit, FaTrash, FaToggleOn, FaToggleOff } from 'react-icons/fa'
import { listAllRoutes } from '../../services/routesService'
import { listCompanies } from '../../services/companiesService'
import { getEmpresaIdFromToken } from '../../services/apiClient'
import { postBusLocation, getPublicBusLocation, streamPublicBusLocation } from '../../services/busLocationService'
import { start as trackerStart, stop as trackerStop, setShare as trackerSetShare, subscribe as trackerSubscribe, getState as trackerGetState } from '../../services/locationTracker'

// Visualización: usar endpoints públicos para snapshot/stream (evita Authorization en SSE)
const USE_PUBLIC_STREAM = true

const busIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
})

export default function DispatcherBuses() {
  const [buses, setBuses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ id_bus: null, placa: '', descripcion: '', empresa_id: '', ruta_id: '' })
  const [companies, setCompanies] = useState([])
  const [routes, setRoutes] = useState([])
  const [selectedEmpresaId, setSelectedEmpresaId] = useState('')
  const [forcedEmpresaId, setForcedEmpresaId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedBus, setSelectedBus] = useState(null)
  const [livePos, setLivePos] = useState(null)
  const [livePositions, setLivePositions] = useState({}) // { [idBus]: { lat, lng, at } }
  const [fitReq, setFitReq] = useState(0)
  const [geoMessage, setGeoMessage] = useState('')
  const [shareLive, setShareLive] = useState(() => {
    try { return localStorage.getItem('bus_share_live') === '1' } catch { return false }
  })
  const shareLiveRef = useRef(false)
  const eventSrcRef = useRef(null)
  const eventSourcesRef = useRef(new Map()) // multi stream: idBus -> EventSource
  const simTimerRef = useRef(null)
  const geoWatchRef = useRef(null)
  const staleTimerRef = useRef(null)
  const [gpsStale, setGpsStale] = useState(false)
  const [gpsActive, setGpsActive] = useState(false)
  const trackerUnsubRef = useRef(null)
  const mountedRef = useRef(true)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [arr, myCompanies, allRoutes] = await Promise.all([
        listBuses(),
        listCompanies(),
        listAllRoutes().catch(() => []),
      ])
      const comps = Array.isArray(myCompanies) ? myCompanies : []
      setCompanies(comps)
      setRoutes(Array.isArray(allRoutes) ? allRoutes : [])
      // forzar empresa del token si existe
      const eid = getEmpresaIdFromToken()
      if (eid) {
        setForcedEmpresaId(Number(eid))
        setSelectedEmpresaId(String(eid))
      } else if (!selectedEmpresaId && comps.length > 0) {
        setSelectedEmpresaId(String(comps[0].id_empresa ?? comps[0].id))
      }
      setBuses(Array.isArray(arr) ? arr : [])
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo cargar buses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  // Suscribirse al tracker global para reflejar estado y posición
  useEffect(() => {
    if (trackerUnsubRef.current) trackerUnsubRef.current()
    trackerUnsubRef.current = trackerSubscribe((state) => {
      setGpsActive(!!state.running)
      if (state.lastPos) setLivePos({ lat: state.lastPos.lat, lng: state.lastPos.lng, at: state.lastPos.at })
      setShareLive(state.shareEnabled)
    })
    // Inicial
    const st = trackerGetState()
    setGpsActive(!!st.running)
    if (st.lastPos) setLivePos({ lat: st.lastPos.lat, lng: st.lastPos.lng, at: st.lastPos.at })
    setShareLive(st.shareEnabled)
    return () => { if (trackerUnsubRef.current) trackerUnsubRef.current() }
  }, [])

  useEffect(() => {
    shareLiveRef.current = shareLive
    try { localStorage.setItem('bus_share_live', shareLive ? '1' : '0') } catch {}
  }, [shareLive])

  const openCreate = () => {
    setForm({ id_bus: null, placa: '', descripcion: '', empresa_id: (forcedEmpresaId ?? selectedEmpresaId) || '', ruta_id: '' })
    setShowModal(true)
  }
  const openEdit = (b) => {
    setForm({ id_bus: b.id_bus ?? b.id, placa: b.placa, descripcion: b.descripcion ?? '', empresa_id: forcedEmpresaId ?? b.empresa_id ?? b.empresaId, ruta_id: b.ruta_id ?? b.rutaId ?? '' })
    setShowModal(true)
  }

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const empresaIdFinal = Number(forcedEmpresaId ?? form.empresa_id ?? selectedEmpresaId)
      const rutaIdFinal = Number(form.ruta_id)
      if (!rutaIdFinal || Number.isNaN(rutaIdFinal)) {
        setError('Debes seleccionar una ruta para el bus')
        return
      }
      if (!form.id_bus) {
        await createBus({ placa: form.placa, descripcion: form.descripcion, empresa_id: empresaIdFinal, ruta_id: rutaIdFinal })
      } else {
        await updateBus(form.id_bus, { placa: form.placa, descripcion: form.descripcion, empresa_id: empresaIdFinal, ruta_id: rutaIdFinal })
      }
      setShowModal(false)
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo guardar el bus')
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (b) => {
    if (!window.confirm('¿Eliminar bus?')) return
    setSubmitting(true)
    try {
      await deleteBus(b.id_bus ?? b.id)
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo eliminar el bus')
    } finally { setSubmitting(false) }
  }

  const startGeolocationWatch = async (idBusParam) => {
    setGeoMessage('')
    const idBusFinal = idBusParam ?? (selectedBus?.id_bus ?? selectedBus?.id)
    trackerSetShare(shareLiveRef.current)
    try {
      await trackerStart(idBusFinal)
      // Timer para marcar "sin señal"
      if (staleTimerRef.current) clearInterval(staleTimerRef.current)
      staleTimerRef.current = setInterval(() => {
        const now = Date.now()
        const last = (trackerGetState().lastPos?.at) || 0
        const stale = now - last > 15000
        setGpsStale(stale)
      }, 3000)
    } catch (e) {
      setGeoMessage('No se pudo iniciar el GPS. Revisa permisos de ubicación (HTTPS)')
    }
  }

  const stopGeolocationWatch = () => {
    trackerStop()
  }

  const activate = async (b) => {
    await activateBus(b.id_bus ?? b.id)
    await load()
    // reseleccionar el bus desde la lista actualizada para tener estado correcto
    const upd = (prev => prev)(buses).find(x => (x.id_bus ?? x.id) === (b.id_bus ?? b.id)) || b
    setSelectedBus(upd)
    // Solicitar ubicación y mostrar en el mapa sin almacenar
    startGeolocationWatch(upd.id_bus ?? upd.id)
    // Por defecto, compartir ubicación encendido
    setShareLive(true)
  }
  const deactivate = async (b) => {
    await deactivateBus(b.id_bus ?? b.id)
    await load()
    const upd = (prev => prev)(buses).find(x => (x.id_bus ?? x.id) === (b.id_bus ?? b.id)) || b
    setSelectedBus(upd)
    stopGeolocationWatch()
    setShareLive(false)
    setGpsStale(false)
    if (staleTimerRef.current) { clearInterval(staleTimerRef.current); staleTimerRef.current = null }
  }

  // Selección y mapa en vivo
  const selectBus = async (b) => {
    setSelectedBus(b)
    setLivePos(null)
    // cerrar stream previo
    if (eventSrcRef.current) { eventSrcRef.current.close(); eventSrcRef.current = null }
    if (USE_PUBLIC_STREAM) {
      try {
        const cur = await getPublicBusLocation(b.id_bus ?? b.id)
        const lat = Number(cur?.latitud ?? cur?.lat)
        const lng = Number(cur?.longitud ?? cur?.lng)
        if (!isNaN(lat) && !isNaN(lng)) setLivePos({ lat, lng, at: cur?.timestamp || cur?.ultima_actualizacion })
      } catch {}
      // abrir stream SSE
      try {
        const es = streamPublicBusLocation(b.id_bus ?? b.id)
        es.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data)
            const lat = Number(msg?.latitud ?? msg?.lat)
            const lng = Number(msg?.longitud ?? msg?.lng)
            if (!isNaN(lat) && !isNaN(lng)) setLivePos({ lat, lng, at: msg?.timestamp })
          } catch {}
        }
        es.onerror = () => { /* mantener silencioso */ }
        eventSrcRef.current = es
      } catch {}
    }
    // si el bus ya está activo, iniciar el GPS local de inmediato
    if (b?.estado) {
      startGeolocationWatch(b.id_bus ?? b.id)
    }
  }

  useEffect(() => {
    return () => {
      if (eventSrcRef.current) eventSrcRef.current.close()
      if (simTimerRef.current) clearInterval(simTimerRef.current)
      if (staleTimerRef.current) clearInterval(staleTimerRef.current)
    }
  }, [])

  // Simulación de ubicación desde navegador
  const startSimulation = async () => {
    if (!selectedBus) return alert('Selecciona un bus')
    if (!navigator.geolocation) return alert('Geolocation no soportado')
    if (simTimerRef.current) clearInterval(simTimerRef.current)
    // enviar cada 5s
    simTimerRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        try {
          await postBusLocation({ idBus: selectedBus.id_bus ?? selectedBus.id, latitud: lat, longitud: lng, timestamp: Date.now() })
        } catch {}
      })
    }, 5000)
    alert('Simulación iniciada: se enviará tu ubicación cada 5s')
  }

  const stopSimulation = () => {
    if (simTimerRef.current) clearInterval(simTimerRef.current)
    simTimerRef.current = null
    alert('Simulación detenida')
  }

  const visibleBuses = useMemo(() => {
    const filterId = forcedEmpresaId ?? (selectedEmpresaId ? Number(selectedEmpresaId) : null)
    if (!filterId) return buses
    return buses.filter((b) => Number(b.empresa_id ?? b.empresaId) === Number(filterId))
  }, [buses, selectedEmpresaId, forcedEmpresaId])

  const mapCenter = useMemo(() => {
    if (livePos) return [livePos.lat, livePos.lng]
    const withCoords = visibleBuses.map((b) => ({ lat: Number(b.latitud), lng: Number(b.longitud) })).filter((p) => !isNaN(p.lat) && !isNaN(p.lng))
    if (withCoords.length) {
      const lat = withCoords.reduce((s, p) => s + p.lat, 0) / withCoords.length
      const lng = withCoords.reduce((s, p) => s + p.lng, 0) / withCoords.length
      return [lat, lng]
    }
    return [2.444, -76.614]
  }, [livePos, visibleBuses])

  const allActivePoints = useMemo(() => {
    return Object.values(livePositions).map((p) => [p.lat, p.lng])
  }, [livePositions, fitReq])

  // Multi-track: suscribirse a todos los buses activos y mantener sus posiciones
  useEffect(() => {
    if (!USE_PUBLIC_STREAM) return
    const activeIds = new Set((visibleBuses || []).filter(b => b.estado).map(b => (b.id_bus ?? b.id)))
    // Inicial: snapshot para buses activos que no tengan pos
    ;(async () => {
      for (const id of activeIds) {
        if (!livePositions[id]) {
          try {
            const cur = await getPublicBusLocation(id)
            const lat = Number(cur?.latitud ?? cur?.lat)
            const lng = Number(cur?.longitud ?? cur?.lng)
            if (!isNaN(lat) && !isNaN(lng)) {
              setLivePositions(prev => ({ ...prev, [id]: { lat, lng, at: cur?.updatedAt ?? cur?.timestamp } }))
            }
          } catch {}
        }
      }
    })()
    // Abrir streams para nuevos activos
    for (const id of activeIds) {
      if (!eventSourcesRef.current.has(id)) {
        try {
          const es = streamPublicBusLocation(id)
          es.onmessage = (ev) => {
            try {
              const msg = JSON.parse(ev.data)
              const lat = Number(msg?.latitud ?? msg?.lat)
              const lng = Number(msg?.longitud ?? msg?.lng)
              if (!isNaN(lat) && !isNaN(lng)) {
                setLivePositions(prev => ({ ...prev, [id]: { lat, lng, at: msg?.updatedAt ?? msg?.timestamp } }))
              }
            } catch {}
          }
          es.onerror = () => { /* silencioso */ }
          eventSourcesRef.current.set(id, es)
        } catch {}
      }
    }
    // Cerrar streams de buses que ya no están activos/visibles
    for (const [id, es] of eventSourcesRef.current.entries()) {
      if (!activeIds.has(id)) {
        try { es.close() } catch {}
        eventSourcesRef.current.delete(id)
        setLivePositions(prev => { const cp = { ...prev }; delete cp[id]; return cp })
      }
    }
    return () => {
      // no cerrar aquí para no interrumpir en pequeños rerenders; el cleanup global se hace al unmount
    }
  }, [visibleBuses])

  // Cleanup global al desmontar
  useEffect(() => {
    return () => {
      for (const es of eventSourcesRef.current.values()) {
        try { es.close() } catch {}
      }
      eventSourcesRef.current.clear()
    }
  }, [])

  function FitAll({ points, tick }) {
    const map = useMap()
    useEffect(() => {
      if (!Array.isArray(points) || points.length === 0) return
      try {
        if (points.length === 1) {
          map.setView(points[0], Math.max(map.getZoom(), 15))
        } else {
          map.fitBounds(points, { padding: [20, 20] })
        }
      } catch {}
    }, [tick, map])
    return null
  }

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="m-0">Buses</h4>
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-outline-secondary btn-sm" onClick={openCreate}>Nuevo bus</button>
          {selectedBus && selectedBus.estado && (
            <div className="form-check form-switch m-0">
              <input className="form-check-input" type="checkbox" id="shareLiveSwitch"
                     checked={shareLive}
                     onChange={(e) => setShareLive(e.target.checked)} />
              <label className="form-check-label small" htmlFor="shareLiveSwitch">Compartir ubicación</label>
            </div>
          )}
          {selectedBus && selectedBus.estado && (
            geoWatchRef.current ? (
              <button className="btn btn-outline-warning btn-sm" onClick={() => { stopGeolocationWatch(); setGpsStale(false) }}>Detener GPS</button>
            ) : (
              <button className="btn btn-outline-success btn-sm" onClick={() => startGeolocationWatch(selectedBus.id_bus ?? selectedBus.id)}>Iniciar GPS</button>
            )
          )}
          {selectedBus && selectedBus.estado && (
            <div className="d-flex align-items-center gap-2 small">
              {gpsActive ? (
                <span className="badge text-bg-success">GPS activo</span>
              ) : (
                <span className="badge text-bg-secondary">GPS detenido</span>
              )}
              {gpsStale && <span className="badge text-bg-warning">Sin señal</span>}
              {livePos?.at && (
                <span className="text-muted">Última fix: {new Date(livePos.at).toLocaleTimeString()}</span>
              )}
            </div>
          )}
          {(!selectedBus || !selectedBus.estado) && (
            <>
              <button className="btn btn-outline-primary btn-sm" onClick={startSimulation} disabled={!selectedBus}>Simular ubicación</button>
              <button className="btn btn-outline-danger btn-sm" onClick={stopSimulation}>Detener sim.</button>
            </>
          )}
        </div>
      </div>

      {(!forcedEmpresaId) && (
        <div className="mb-3">
          <div className="row g-2 align-items-end">
            <div className="col-sm-6 col-md-4 col-lg-3">
              <label className="form-label">Empresa</label>
              <select className="form-select form-select-sm" value={String(selectedEmpresaId || '')} onChange={(e) => setSelectedEmpresaId(e.target.value)}>
                {companies.map((c) => (
                  <option key={c.id_empresa ?? c.id} value={c.id_empresa ?? c.id}>{c.nombre_empresa || c.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}
      {geoMessage && (
        <div className="alert alert-warning alert-dismissible fade show" role="alert">
          {geoMessage}
          <button type="button" className="btn-close" onClick={() => setGeoMessage('')} aria-label="Close"></button>
        </div>
      )}

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card h-100" style={{ maxWidth: 960, margin: '0 auto' }}>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover table-sm align-middle small">
                  <thead>
                    <tr>
                      <th style={{ width: 56 }}>#</th>
                      <th style={{ width: '18%' }}>Placa</th>
                      <th style={{ width: '34%' }}>Descripción</th>
                      <th style={{ width: '14%' }}>Empresa</th>
                      <th style={{ width: '22%' }}>Ruta</th>
                      <th style={{ width: 96 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleBuses.length === 0 && <tr><td colSpan={6} className="text-center py-4">Sin registros</td></tr>}
                    {visibleBuses.map((b, i) => (
                      <tr key={`bus-${b.id_bus ?? b.id ?? i}`} onClick={() => selectBus(b)} style={{ cursor: 'pointer' }}>
                        <td style={{ whiteSpace: 'nowrap' }}>{i + 1}</td>
                        <td className="text-truncate" style={{ maxWidth: 140 }} title={b.placa}>{b.placa}</td>
                        <td className="text-truncate" style={{ maxWidth: 260 }} title={b.descripcion || '—'}>{b.descripcion || '—'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{(() => {
                          const byId = new Map((companies||[]).map(c => [String(c.id_empresa ?? c.id), c.nombre_empresa || c.nombre]))
                          const nm = byId.get(String(b.empresa_id ?? b.empresaId))
                          return nm || b.empresa_nombre || b.empresaName || b.empresa || (b.empresa_id ?? b.empresaId)
                        })()}</td>
                        <td className="text-truncate" style={{ maxWidth: 200 }} title={(() => {
                          const rid = Number(b.ruta_id ?? b.rutaId)
                          if (!rid) return '—'
                          const byId = new Map((routes||[]).map(r => [Number(r.id_ruta ?? r.id), r]))
                          const r = byId.get(rid)
                          return r ? (r.nombre_ruta ?? r.nombre ?? `Ruta ${rid}`) : String(rid)
                        })()}>{(() => {
                          const rid = Number(b.ruta_id ?? b.rutaId)
                          if (!rid) return '—'
                          const byId = new Map((routes||[]).map(r => [Number(r.id_ruta ?? r.id), r]))
                          const r = byId.get(rid)
                          return r ? (r.nombre_ruta ?? r.nombre ?? `Ruta ${rid}`) : rid
                        })()}</td>
                        <td className="text-end" style={{ whiteSpace: 'nowrap' }}>
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-secondary" title="Editar" aria-label="Editar" onClick={(e) => { e.stopPropagation(); openEdit(b) }}>
                              <FaEdit/>
                            </button>
                            <button className="btn btn-outline-danger" title="Eliminar" aria-label="Eliminar" onClick={(e) => { e.stopPropagation(); remove(b) }} disabled={submitting}>
                              <FaTrash/>
                            </button>
                            {b.estado ? (
                              <button className="btn btn-outline-warning" title="Desactivar" aria-label="Desactivar" onClick={(e) => { e.stopPropagation(); deactivate(b) }}>
                                <FaToggleOff/>
                              </button>
                            ) : (
                              <button className="btn btn-outline-success" title="Activar" aria-label="Activar" onClick={(e) => { e.stopPropagation(); activate(b) }}>
                                <FaToggleOn/>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <div className="fw-semibold">Bus seleccionado</div>
                  <div className="text-muted small">{selectedBus ? `${selectedBus.placa}` : '—'}</div>
                </div>
                <div>
                  {selectedBus && (
                    selectedBus.estado ? <span className="badge text-bg-success">Activo</span> : <span className="badge text-bg-secondary">Inactivo</span>
                  )}
                </div>
              </div>
              <div className="border rounded" style={{ height: 340, overflow: 'hidden' }}>
                <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                  <FitAll points={allActivePoints} tick={fitReq} />
                  {Object.entries(livePositions).map(([id, pos]) => (
                    <Marker key={`mb-${id}`} position={[pos.lat, pos.lng]} icon={busIcon}>
                      <Popup>
                        <div>
                          <div><strong>Bus:</strong> {(() => {
                            const b = visibleBuses.find(x => String(x.id_bus ?? x.id) === String(id)) || {}
                            return b.placa || id
                          })()}</div>
                          <div><strong>Empresa:</strong> {(() => {
                            const byId = new Map((companies||[]).map(c => [String(c.id_empresa ?? c.id), c.nombre_empresa || c.nombre]))
                            const b = visibleBuses.find(x => String(x.id_bus ?? x.id) === String(id)) || {}
                            return byId.get(String(b.empresa_id ?? b.empresaId)) || (b.empresa_nombre || b.empresa || '—')
                          })()}</div>
                          <div><strong>Ruta:</strong> {(() => {
                            const b = visibleBuses.find(x => String(x.id_bus ?? x.id) === String(id)) || {}
                            const rid = Number(b.ruta_id ?? b.rutaId)
                            if (!rid) return '—'
                            const byR = new Map((routes||[]).map(r => [Number(r.id_ruta ?? r.id), r]))
                            const r = byR.get(rid)
                            return r ? (r.nombre_ruta ?? r.nombre ?? `Ruta ${rid}`) : String(rid)
                          })()}</div>
                          <div><strong>Hora:</strong> {pos?.at ? new Date(pos.at).toLocaleString() : '—'}</div>
                          <div><strong>Lat/Lng:</strong> {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
              <div className="d-flex justify-content-end mt-2">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setFitReq((x) => x + 1)}>Centrar activos</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog">
              <div className="modal-content">
                <form onSubmit={onSubmit}>
                  <div className="modal-header">
                    <h5 className="modal-title">{form.id_bus ? 'Editar bus' : 'Nuevo bus'}</h5>
                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                  </div>
                  <div className="modal-body">
                    {error && <div className="alert alert-danger py-2">{error}</div>}
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Placa</label>
                        <input name="placa" className="form-control" value={form.placa} onChange={onChange} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Empresa</label>
                        {forcedEmpresaId ? (
                          <input className="form-control" value={(companies.find(c => Number(c.id_empresa ?? c.id) === Number(forcedEmpresaId))?.nombre_empresa)
                            || (companies.find(c => Number(c.id_empresa ?? c.id) === Number(forcedEmpresaId))?.nombre)
                            || String(forcedEmpresaId)} disabled />
                        ) : (
                          <select name="empresa_id" className="form-select" value={String(form.empresa_id ?? '')} onChange={onChange} required>
                            <option value="">Selecciona empresa</option>
                            {(companies||[]).map((c) => (
                              <option key={c.id_empresa ?? c.id} value={c.id_empresa ?? c.id}>{c.nombre_empresa || c.nombre || `Empresa ${c.id_empresa ?? c.id}`}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="col-md-12">
                        <label className="form-label">Ruta</label>
                        <select name="ruta_id" className="form-select" value={String(form.ruta_id || '')} onChange={onChange} required>
                          <option value="">Selecciona una ruta</option>
                          {(routes||[]).map((r) => (
                            <option key={r.id_ruta ?? r.id} value={r.id_ruta ?? r.id}>
                              {r.nombre_ruta ?? r.nombre ?? `Ruta ${r.id_ruta ?? r.id}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label">Descripción</label>
                        <textarea name="descripcion" className="form-control" value={form.descripcion} onChange={onChange} rows={2} />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary" disabled={submitting} onClick={() => setShowModal(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Guardando...' : 'Guardar'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </div>
  )
}

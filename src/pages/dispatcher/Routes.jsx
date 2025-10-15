import { useEffect, useMemo, useState, useRef, Fragment } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-routing-machine'
import { listAllRoutes, createRoute, updateRoute, deleteRoute } from '../../services/routesService'
import { fetchAllParaderos } from '../../services/paraderosService'
import { listCompanies } from '../../services/companiesService'
import { listRutaParaderos, createRutaParadero, deleteRutaParadero } from '../../services/routeParaderosService'
import { getEmpresaIdFromToken } from '../../services/apiClient'

function DispatcherRoutes() {
  const [routes, setRoutes] = useState([])
  const [paraderos, setParaderos] = useState([])
  const [paraderosLoading, setParaderosLoading] = useState(false)
  const [companies, setCompanies] = useState([])
  const [forcedEmpresaId, setForcedEmpresaId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBuilderModal, setShowBuilderModal] = useState(false)
  const [mode, setMode] = useState('create') // 'create' | 'edit'
  const [currentId, setCurrentId] = useState(null)
  const [form, setForm] = useState({ nombre_ruta: '', empresa_id: '' })
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Sequences for ida/retorno
  const [ida, setIda] = useState([]) // array of paradero ids
  const [retorno, setRetorno] = useState([])
  const [currentTipo, setCurrentTipo] = useState('ida') // 'ida' | 'retorno' (ya no se usa en el picker)
  const [searchIda, setSearchIda] = useState('')
  const [searchRet, setSearchRet] = useState('')

  // Expanded details state
  const [expandedId, setExpandedId] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [routeDetails, setRouteDetails] = useState({}) // { [rutaId]: { ida: [], retorno: [] } }
  const [detailsPath, setDetailsPath] = useState('ida') // 'ida' | 'retorno'

  const loadAll = async () => {
    setLoading(true)
    setError('')
    try {
      const [rts, prs, comps] = await Promise.all([
        listAllRoutes(),
        fetchAllParaderos(),
        listCompanies(),
      ])
      // Resolver empresa SOLO desde el token (política: despachador está asociado a una empresa)
      const eidFromToken = Number(getEmpresaIdFromToken() ?? NaN)
      const compsArr = Array.isArray(comps) ? comps : (Array.isArray(comps?.data) ? comps.data : [])
      if (!Number.isNaN(eidFromToken) && eidFromToken) setForcedEmpresaId(eidFromToken)

      const allRoutes = Array.isArray(rts) ? rts : []
      const onlyRoutes = (!Number.isNaN(eidFromToken) && eidFromToken)
        ? allRoutes.filter((r) => Number(r.empresa_id ?? r.empresaId) === Number(eidFromToken))
        : [] // si no hay empresa en token, no listamos para evitar mezclar empresas
      setRoutes(onlyRoutes)
      setParaderos(Array.isArray(prs) ? prs : [])
      setCompanies((!Number.isNaN(eidFromToken) && eidFromToken)
        ? compsArr.filter((c) => Number(c.id_empresa ?? c.id) === Number(eidFromToken))
        : [])
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo cargar información')
    } finally {
      setLoading(false)
    }
  }

  // Empresa efectiva: SIEMPRE desde token (o estado ya forzado por token)
  const getEffectiveEmpresaId = () => {
    const tokId = getEmpresaIdFromToken()
    return (tokId != null) ? Number(tokId) : (forcedEmpresaId != null ? Number(forcedEmpresaId) : null)
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Cuando detectamos empresa del token, recargar para aplicar filtros y companies correctos
  useEffect(() => {
    if (forcedEmpresaId != null) {
      loadAll()
    }
  }, [forcedEmpresaId])

  const ensureParaderosLoaded = async () => {
    if (paraderos.length > 0) return
    setParaderosLoading(true)
    try {
      const all = await fetchAllParaderos()
      setParaderos(Array.isArray(all) ? all : [])
    } catch (_) { /* ignore */ }
    finally { setParaderosLoading(false) }
  }

  const openCreate = async () => {
    setMode('create')
    setCurrentId(null)
    const eff = getEffectiveEmpresaId()
    setForm({ nombre_ruta: '', empresa_id: eff ?? '' })
    setFormErrors({})
    setIda([])
    setRetorno([])
    setCurrentTipo('ida')
    await ensureParaderosLoaded()
    setShowCreateModal(true)
  }

  const openEdit = async (route) => {
    const rid = route.id_ruta ?? route.id
    setMode('edit')
    setCurrentId(rid)
    setForm({
      nombre_ruta: route.nombre_ruta ?? route.nombre ?? '',
      empresa_id: forcedEmpresaId ?? route.empresa_id ?? route.empresaId ?? '',
    })
    setFormErrors({})
    setIda([])
    setRetorno([])
    setCurrentTipo('ida')
    await ensureParaderosLoaded()
    setShowBuilderModal(true)
    // Nota: si el backend expone listar pivotes, podemos precargar aquí.
    // Por ahora se inicia limpio para evitar errores 500 en /ruta-paraderos/listar.
  }

  const confirmDelete = async (route) => {
    const ok = window.confirm('¿Eliminar esta ruta? Se eliminarán sus paraderos asociados.')
    if (!ok) return
    setSubmitting(true)
    try {
      // Con ON DELETE CASCADE en DB, basta con eliminar la ruta
      await deleteRoute(route.id_ruta ?? route.id)
      await loadAll()
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo eliminar la ruta')
    } finally {
      setSubmitting(false)
    }
  }

  const getEmpresaNombre = (eid) => {
    const c = companies.find((c) => Number(c.id_empresa ?? c.id) === Number(eid))
    return c ? (c.nombre_empresa || c.nombre || `Emp ${c.id_empresa ?? c.id}`) : ''
  }

  const composeRouteName = (siglas, empresaId) => {
    const s = String(siglas || '').toUpperCase().replace(/\s+/g, '').slice(0, 4)
    const ename = getEmpresaNombre(empresaId)
    return s ? `${s}${ename ? ` ${ename}` : ''}` : ''
  }

  const onChange = (e) => {
    const { name } = e.target
    let { value } = e.target
    if (name === 'nombre_ruta') {
      // mantener como siglas (máx 4, mayúsculas, sin espacios)
      value = String(value || '').toUpperCase().replace(/\s+/g, '').slice(0, 4)
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const validate = (data) => {
    const errs = {}
    const sgl = String(data.nombre_ruta || '').trim()
    if (!sgl || sgl.length < 1) errs.nombre_ruta = 'Ingresa 1 a 4 siglas'
    if (sgl.length > 4) errs.nombre_ruta = 'Máximo 4 siglas'
    // No pedimos empresa si somos despachador (debe venir en token)
    return errs
  }

  const onSubmitCreate = async (e) => {
    e.preventDefault()
    const errs = validate(form)
    setFormErrors(errs)
    if (Object.keys(errs).length) return
    setSubmitting(true)
    try {
      const eidFinal = Number(getEffectiveEmpresaId())
      const composedName = composeRouteName(form.nombre_ruta, eidFinal)
      if (mode === 'create') {
        const res = await createRoute({ nombre_ruta: composedName, empresa_id: eidFinal })
        const routeId = res?.id_ruta ?? res?.id
        setCurrentId(routeId)
        await loadAll() // refrescar listado inmediatamente
        setShowCreateModal(false)
        setShowBuilderModal(true)
      } else {
        await updateRoute(currentId, { nombre_ruta: composedName, empresa_id: eidFinal })
        await loadAll() // refrescar listado inmediatamente
        setShowCreateModal(false)
        setShowBuilderModal(true)
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo guardar la ruta')
    } finally {
      setSubmitting(false)
    }
  }

  const onSubmitBuilder = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    const errs = {}
    if ((ida?.length || 0) === 0) errs.ida = 'Agrega al menos un paradero en Ida'
    if ((retorno?.length || 0) === 0) errs.retorno = 'Agrega al menos un paradero en Retorno'
    setFormErrors(errs)
    if (Object.keys(errs).length) return
    let rid = Number(currentId)
    if (!rid || Number.isNaN(rid)) {
      // Fallback: intentar localizar la ruta recién creada por nombre y empresa
      try {
        const routes = await listAllRoutes()
        const match = (routes || []).find((r) => {
          const ridEmp = r.empresa_id ?? r.empresaId
          const name = r.nombre_ruta ?? r.nombre ?? r.nombreRuta
          return String(ridEmp) === String(form.empresa_id) && String(name).trim() === String(form.nombre_ruta).trim()
        })
        if (match) {
          rid = Number(match.id_ruta ?? match.id)
          setCurrentId(rid)
        }
      } catch (_) {}
      if (!rid || Number.isNaN(rid)) {
        setError('No se pudo determinar el ID de la ruta. Guarda la ruta primero.')
        return
      }
    }
    setSubmitting(true)
    try {
      // Si es edición, limpiar pivotes previos
      if (mode === 'edit') {
        try {
          const pivots = await listRutaParaderos()
          const own = (Array.isArray(pivots) ? pivots : []).filter((p) => (p.ruta_id ?? p.rutaId) == currentId)
          for (const p of own) {
            await deleteRutaParadero(p.id_ruta_paradero ?? p.id)
          }
        } catch { /* ignore */ }
      }
      // Crear pivotes
      for (let i = 0; i < ida.length; i++) {
        await createRutaParadero({ rutaId: rid, paraderoId: Number(ida[i]), orden: i + 1, tipo: 'ida' })
      }
      for (let i = 0; i < retorno.length; i++) {
        await createRutaParadero({ rutaId: rid, paraderoId: Number(retorno[i]), orden: i + 1, tipo: 'retorno' })
      }
      await loadAll()
      // Actualizar cache local de detalles para esta ruta
      setRouteDetails((prev) => ({
        ...prev,
        [rid]: {
          ida: ida.map((pid, i) => ({ paradero_id: pid, orden: i + 1, tipo: 'ida' })),
          retorno: retorno.map((pid, i) => ({ paradero_id: pid, orden: i + 1, tipo: 'retorno' })),
        },
      }))
      setShowBuilderModal(false)
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo guardar los paraderos de la ruta')
    } finally {
      setSubmitting(false)
    }
  }

  // Leaflet helpers
  const allPoints = useMemo(() => paraderos
    .map((p) => ({ ...p, lat: Number(p.latitud), lng: Number(p.longitud), pid: p.id_paradero ?? p.id, nombre: p.nombre }))
  , [paraderos])

  const validPoints = useMemo(() => allPoints.filter((p) => !isNaN(p.lat) && !isNaN(p.lng)), [allPoints])

  const mapCenter = useMemo(() => {
    if (!validPoints.length) return [2.444, -76.614] // fallback
    const lat = validPoints.reduce((s, p) => s + p.lat, 0) / validPoints.length
    const lng = validPoints.reduce((s, p) => s + p.lng, 0) / validPoints.length
    return [lat, lng]
  }, [validPoints])

  const currentSeq = currentTipo === 'ida' ? ida : retorno
  const setCurrentSeq = currentTipo === 'ida' ? setIda : setRetorno

  const toggleParadero = (id) => {
    setCurrentSeq((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  const seqToLatLngs = (seq) => {
    return seq
      .map((id) => validPoints.find((p) => p.pid == id))
      .filter(Boolean)
      .map((p) => [p.lat, p.lng])
  }

  const empresaNombre = (rid) => {
    const c = companies.find((c) => (c.id_empresa ?? c.id) == rid)
    return c ? (c.nombre_empresa || c.nombre || `Emp ${c.id_empresa ?? c.id}`) : '—'
  }

  const routeNombre = (r) => (
    r?.nombre_ruta ?? r?.nombre ?? r?.nombreRuta ?? r?.route_name ?? r?.codigo ?? `Ruta ${r?.id_ruta ?? r?.id ?? ''}`
  )

  const norm = (s) => (String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase())

  const addTo = (tipo, pid) => {
    if (tipo === 'ida') setIda((prev) => (prev.includes(pid) ? prev : [...prev, pid]))
    else setRetorno((prev) => (prev.includes(pid) ? prev : [...prev, pid]))
  }

  const removeFrom = (tipo, pid) => {
    if (tipo === 'ida') setIda((prev) => prev.filter((x) => x !== pid))
    else setRetorno((prev) => prev.filter((x) => x !== pid))
  }

  const filteredIda = useMemo(() => {
    const q = norm(searchIda)
    if (!q) return allPoints
    return allPoints.filter((p) => norm(p.nombre).includes(q))
  }, [allPoints, searchIda])

  const filteredRet = useMemo(() => {
    const q = norm(searchRet)
    if (!q) return allPoints
    return allPoints.filter((p) => norm(p.nombre).includes(q))
  }, [allPoints, searchRet])

  const loadDetails = async (rid) => {
    setDetailsLoading(true)
    try {
      let pivots = []
      // 1) Intentar con rutaId
      try {
        pivots = await listRutaParaderos({ rutaId: rid })
      } catch (_) {}
      // 2) Si vacío, intentar con ruta_id
      if (!Array.isArray(pivots) || pivots.length === 0) {
        try {
          pivots = await listRutaParaderos({ ruta_id: rid })
        } catch (_) {}
      }
      // 3) Si sigue vacío o falló, traer todo y filtrar en cliente
      if (!Array.isArray(pivots) || pivots.length === 0) {
        try {
          const all = await listRutaParaderos()
          pivots = Array.isArray(all) ? all : []
        } catch (_) {
          pivots = []
        }
      }
      const own = (Array.isArray(pivots) ? pivots : []).filter((p) => (p.ruta_id ?? p.rutaId) == rid)
      const ida = own.filter((p) => String(p.tipo).toLowerCase() === 'ida').sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      const retorno = own.filter((p) => String(p.tipo).toLowerCase() === 'retorno').sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      setRouteDetails((prev) => ({ ...prev, [rid]: { ida, retorno, error: false } }))
    } catch (_) {
      setRouteDetails((prev) => ({ ...prev, [rid]: { ida: [], retorno: [], error: true } }))
    } finally {
      setDetailsLoading(false)
    }
  }

  const toggleExpand = async (r) => {
    const rid = r.id_ruta ?? r.id
    if (expandedId === rid) {
      setExpandedId(null)
      return
    }
    setExpandedId(rid)
    if (!routeDetails[rid]) {
      await loadDetails(rid)
    }
  }

  return (
    <div className="container-fluid" style={{ maxWidth: 880 }}>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h4 className="m-0">Rutas</h4>
        <button className="btn btn-accent btn-sm" onClick={openCreate} disabled={loading}>Nueva ruta</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-2">
          {loading && <div className="small">Cargando...</div>}
          {!loading && (
            <div className="table-responsive">
              <table className="table table-hover table-sm align-middle mb-0 small">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nombre</th>
                    <th>Empresa</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {routes.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-3">Sin registros</td></tr>
                  )}
                  {routes.map((r, idx) => (
                    <Fragment key={r.id_ruta ?? r.id ?? idx}>
                      <tr onClick={() => toggleExpand(r)} style={{ cursor: 'pointer' }}>
                        <td>{idx + 1}</td>
                        <td>{routeNombre(r)}</td>
                        <td>{empresaNombre(r.empresa_id ?? r.empresaId)}</td>
                        <td className="text-end">
                          <button className="btn btn-outline-secondary btn-sm me-2" onClick={(e) => { e.stopPropagation(); openEdit(r) }}>Agregar paraderos</button>
                          <button className="btn btn-outline-danger btn-sm" onClick={(e) => { e.stopPropagation(); confirmDelete(r) }} disabled={submitting}>Eliminar</button>
                        </td>
                      </tr>
                      {expandedId === (r.id_ruta ?? r.id) && (
                        <tr>
                          <td colSpan={4}>
                            <div className="p-3 bg-light rounded border">
                              {detailsLoading && <div className="text-muted">Cargando detalles...</div>}
                              {!detailsLoading && (
                                <div className="row g-3">
                                  <div className="col-lg-7">
                                    {/* Mapa de detalle con selector de recorrido */}
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                      <h6 className="m-0">Mapa de la ruta</h6>
                                      <div className="btn-group btn-group-sm">
                                        <button type="button" className={`btn ${detailsPath==='ida'?'btn-accent':'btn-outline-secondary'}`} onClick={() => setDetailsPath('ida')}>Ver Ida</button>
                                        <button type="button" className={`btn ${detailsPath==='retorno'?'btn-accent':'btn-outline-secondary'}`} onClick={() => setDetailsPath('retorno')}>Ver Retorno</button>
                                      </div>
                                    </div>
                                    <div className="border rounded" style={{ height: 320, overflow: 'hidden' }}>
                                      {validPoints.length > 0 ? (
                                        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                                          {(() => {
                                            const det = routeDetails[r.id_ruta ?? r.id] || { ida: [], retorno: [] }
                                            const idsIda = det.ida.map((p) => p.paradero_id ?? p.paraderoId)
                                            const idsRet = det.retorno.map((p) => p.paradero_id ?? p.paraderoId)
                                            const idaLatLngs = idsIda.map((pid) => {
                                              const p = validPoints.find((x) => x.pid == pid)
                                              return p ? [p.lat, p.lng] : null
                                            }).filter(Boolean)
                                            const retLatLngs = idsRet.map((pid) => {
                                              const p = validPoints.find((x) => x.pid == pid)
                                              return p ? [p.lat, p.lng] : null
                                            }).filter(Boolean)
                                            const showIda = detailsPath === 'ida'
                                            const showRet = detailsPath === 'retorno'
                                            return (
                                              <>
                                                <RoutingEngine ida={showIda ? idaLatLngs : []} retorno={showRet ? retLatLngs : []} />
                                                {(showIda ? idsIda : idsRet).map((pid, i) => {
                                                  const p = validPoints.find((x) => x.pid == pid)
                                                  if (!p) return null
                                                  const color = showIda ? '#0d6efd' : '#dc3545'
                                                  return (
                                                    <CircleMarker key={`det-m-${pid}-${i}`} center={[p.lat, p.lng]} radius={8} pathOptions={{ color, fillColor: color, fillOpacity: 0.9 }}>
                                                      <Tooltip>{p.nombre}</Tooltip>
                                                    </CircleMarker>
                                                  )
                                                })}
                                              </>
                                            )
                                          })()}
                                        </MapContainer>
                                      ) : (
                                        <div className="d-flex h-100 align-items-center justify-content-center text-muted">No hay coordenadas para trazar</div>
                                      )}
                                    </div>
                                    <div className="small text-muted mt-1">Usa los botones para ver el recorrido de Ida o de Retorno por separado.</div>
                                  </div>
                                  <div className="col-lg-5">
                                    <div className="row g-3">
                                      <div className="col-md-12">
                                        <h6 className="mb-2">Paraderos Ida</h6>
                                        {routeDetails[r.id_ruta ?? r.id]?.error && (
                                          <div className="alert alert-warning py-2">No se pudieron cargar los paraderos desde el servidor.</div>
                                        )}
                                        <ol className="list-group list-group-numbered">
                                          {(routeDetails[r.id_ruta ?? r.id]?.ida || []).map((piv) => {
                                            const p = allPoints.find((x) => (x.id_paradero ?? x.id ?? x.pid) == (piv.paradero_id ?? piv.paraderoId))
                                            return (
                                              <li key={`det-ida-${piv.id_ruta_paradero ?? piv.id ?? `${piv.paradero_id ?? piv.paraderoId}-ida-${piv.orden}`}`} className="list-group-item d-flex justify-content-between align-items-center">
                                                <span>{p?.nombre ?? `Paradero ${piv.paradero_id ?? piv.paraderoId}`}</span>
                                                <span className="badge text-bg-primary">{piv.orden}</span>
                                              </li>
                                            )
                                          })}
                                          {(!routeDetails[r.id_ruta ?? r.id] || (routeDetails[r.id_ruta ?? r.id]?.ida || []).length === 0) && (
                                            <li className="list-group-item text-muted">Sin paraderos</li>
                                          )}
                                        </ol>
                                      </div>
                                      <div className="col-md-12">
                                        <h6 className="mb-2">Paraderos Retorno</h6>
                                        <ol className="list-group list-group-numbered">
                                          {(routeDetails[r.id_ruta ?? r.id]?.retorno || []).map((piv) => {
                                            const p = allPoints.find((x) => (x.id_paradero ?? x.id ?? x.pid) == (piv.paradero_id ?? piv.paraderoId))
                                            return (
                                              <li key={`det-ret-${piv.id_ruta_paradero ?? piv.id ?? `${piv.paradero_id ?? piv.paraderoId}-ret-${piv.orden}`}`} className="list-group-item d-flex justify-content-between align-items-center">
                                                <span>{p?.nombre ?? `Paradero ${piv.paradero_id ?? piv.paraderoId}`}</span>
                                                <span className="badge text-bg-danger">{piv.orden}</span>
                                              </li>
                                            )
                                          })}
                                          {(!routeDetails[r.id_ruta ?? r.id] || (routeDetails[r.id_ruta ?? r.id]?.retorno || []).length === 0) && (
                                            <li className="list-group-item text-muted">Sin paraderos</li>
                                          )}
                                        </ol>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {showCreateModal && (
        <>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog">
              <div className="modal-content">
                <form onSubmit={onSubmitCreate}>
                  <div className="modal-header">
                    <h5 className="modal-title">{mode === 'create' ? 'Nueva ruta' : 'Editar ruta'}</h5>
                    <button type="button" className="btn-close" onClick={() => !submitting && setShowCreateModal(false)}></button>
                  </div>
                  <div className="modal-body">
                    {error && <div className="alert alert-danger py-2">{error}</div>}
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Nombre de la ruta (siglas)</label>
                        <input name="nombre_ruta" className={`form-control ${formErrors.nombre_ruta ? 'is-invalid' : ''}`} value={form.nombre_ruta} onChange={onChange} placeholder="Ej: TP2" />
                        {formErrors.nombre_ruta && <div className="invalid-feedback">{formErrors.nombre_ruta}</div>}
                        <div className="form-text">Se guardará como: <strong>{composeRouteName(form.nombre_ruta, getEffectiveEmpresaId() ?? form.empresa_id)}</strong></div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Empresa</label>
                        <input className="form-control" value={empresaNombre(getEffectiveEmpresaId())} disabled />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary" disabled={submitting} onClick={() => setShowCreateModal(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-accent" disabled={submitting}>{submitting ? 'Guardando...' : 'Guardar'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {showBuilderModal && (
        <div className="card mt-3 border-0 shadow-sm">
          <div className="card-header d-flex align-items-center justify-content-between" style={{ backgroundColor: '#fff' }}>
            <h5 className="m-0">Agregar paraderos a la ruta</h5>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary btn-sm" disabled={submitting} onClick={() => setShowBuilderModal(false)}>Cerrar</button>
              <button className="btn btn-accent btn-sm" disabled={submitting} onClick={onSubmitBuilder}>{submitting ? 'Guardando...' : 'Guardar paraderos'}</button>
            </div>
          </div>
          <div className="card-body p-2">
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <div className="row g-3">
              <div className="col-lg-8">
                <div className="border rounded" style={{ height: 520, overflow: 'hidden' }}>
                  {paraderosLoading ? (
                    <div className="d-flex h-100 align-items-center justify-content-center text-muted">Cargando paraderos...</div>
                  ) : validPoints.length > 0 ? (
                    <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                      <RoutingEngine ida={seqToLatLngs(ida)} retorno={seqToLatLngs(retorno)} />
                      {[...ida, ...retorno].map((pid, i) => {
                        const p = validPoints.find((x) => x.pid == pid)
                        if (!p) return null
                        const inIda = ida.includes(pid)
                        const color = inIda ? '#0d6efd' : '#dc3545'
                        return (
                          <CircleMarker key={`${pid}-${i}`} center={[p.lat, p.lng]} radius={10} pathOptions={{ color, fillColor: color, fillOpacity: 0.9 }}>
                            <Tooltip>{p.nombre}</Tooltip>
                          </CircleMarker>
                        )
                      })}
                    </MapContainer>
                  ) : (
                    <div className="d-flex h-100 align-items-center justify-content-center text-muted">No hay coordenadas de paraderos para mostrar el mapa</div>
                  )}
                </div>
                <div className="small text-muted mt-1">La línea sigue las calles entre paraderos. Azul: ida · Rojo: retorno.</div>
              </div>
              <div className="col-lg-4">
                {/* Picker Ida */}
                <div className="mb-3">
                  <label className="form-label">Paraderos Ida</label>
                  <input className="form-control form-control-sm mb-2" placeholder="Buscar por nombre (sin tildes)" value={searchIda} onChange={(e) => setSearchIda(e.target.value)} />
                  <div className="border rounded" style={{ maxHeight: 180, overflowY: 'auto' }}>
                    <ul className="list-group list-group-flush">
                      {filteredIda.slice(0, 200).map((p) => {
                        const id = p.pid
                        const already = ida.includes(id)
                        const hasCoords = !isNaN(Number(p.lat)) && !isNaN(Number(p.lng))
                        return (
                          <li key={`ida-opt-${id}`} className="list-group-item d-flex justify-content-between align-items-center">
                            <span className="me-2">{p.nombre}</span>
                            <button type="button" className="btn btn-sm btn-primary" disabled={already || !hasCoords} onClick={() => addTo('ida', id)}>{already ? 'Agregado' : 'Agregar'}</button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                  {/* Chips Ida */}
                  <div className="mt-2">
                    {ida.map((pid) => {
                      const p = allPoints.find((x) => (x.pid == pid))
                      return (
                        <span key={`ida-chip-${pid}`} className="badge rounded-pill text-bg-primary me-2 mb-2">
                          {p?.nombre ?? `Paradero ${pid}`} <button type="button" className="btn-close btn-close-white btn-sm ms-2" onClick={() => setIda((arr) => arr.filter((x) => x !== pid))}></button>
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* Picker Retorno */}
                <div>
                  <label className="form-label">Paraderos Retorno</label>
                  <input className="form-control form-control-sm mb-2" placeholder="Buscar por nombre (sin tildes)" value={searchRet} onChange={(e) => setSearchRet(e.target.value)} />
                  <div className="border rounded" style={{ maxHeight: 180, overflowY: 'auto' }}>
                    <ul className="list-group list-group-flush">
                      {filteredRet.slice(0, 200).map((p) => {
                        const id = p.pid
                        const already = retorno.includes(id)
                        const hasCoords = !isNaN(Number(p.lat)) && !isNaN(Number(p.lng))
                        return (
                          <li key={`ret-opt-${id}`} className="list-group-item d-flex justify-content-between align-items-center">
                            <span className="me-2">{p.nombre}</span>
                            <button type="button" className="btn btn-sm btn-danger" disabled={already || !hasCoords} onClick={() => addTo('retorno', id)}>{already ? 'Agregado' : 'Agregar'}</button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                  {/* Chips Retorno */}
                  <div className="mt-2">
                    {retorno.map((pid) => {
                      const p = allPoints.find((x) => (x.pid == pid))
                      return (
                        <span key={`ret-chip-${pid}`} className="badge rounded-pill text-bg-danger me-2 mb-2">
                          {p?.nombre ?? `Paradero ${pid}`} <button type="button" className="btn-close btn-close-white btn-sm ms-2" onClick={() => setRetorno((arr) => arr.filter((x) => x !== pid))}></button>
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DispatcherRoutes

// Componente auxiliar para trazar rutas que sigan calles entre waypoints usando Leaflet Routing Machine (OSRM)
function RoutingEngine({ ida = [], retorno = [] }) {
  const map = useMap()
  const ctrlIdaRef = useRef(null)
  const ctrlRetRef = useRef(null)
  const osrmUrl = import.meta.env.VITE_OSRM_URL
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN

  const buildRouter = () => {
    if (osrmUrl) {
      return L.Routing.osrmv1({ serviceUrl: osrmUrl })
    }
    if (mapboxToken) {
      return L.Routing.mapbox(mapboxToken)
    }
    // Fallback demo (solo dev)
    return L.Routing.osrmv1({})
  }

  useEffect(() => {
    // Crear controles si no existen
    if (!ctrlIdaRef.current) {
      ctrlIdaRef.current = L.Routing.control({
        waypoints: [],
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        show: false,
        createMarker: () => null,
        lineOptions: { styles: [{ color: '#0d6efd', weight: 5 }] },
        router: buildRouter(),
      }).addTo(map)
    }
    if (!ctrlRetRef.current) {
      ctrlRetRef.current = L.Routing.control({
        waypoints: [],
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        show: false,
        createMarker: () => null,
        lineOptions: { styles: [{ color: '#dc3545', weight: 5 }] },
        router: buildRouter(),
      }).addTo(map)
    }

    return () => {
      // No quitamos controles para mantener rendimiento al cerrar/abrir modal
    }
  }, [map])

  useEffect(() => {
    if (ctrlIdaRef.current) {
      ctrlIdaRef.current.setWaypoints((ida || []).map((p) => L.latLng(p[0], p[1])))
    }
  }, [ida])

  useEffect(() => {
    if (ctrlRetRef.current) {
      ctrlRetRef.current.setWaypoints((retorno || []).map((p) => L.latLng(p[0], p[1])))
    }
  }, [retorno])

  return null
}

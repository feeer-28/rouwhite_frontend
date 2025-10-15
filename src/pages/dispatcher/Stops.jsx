import { useEffect, useState, useMemo } from 'react'
import { listParaderos, fetchAllParaderos, createParadero, updateParadero, deleteParadero } from '../../services/paraderosService'
import { listBarrios, fetchAllBarrios } from '../../services/barriosService'

function DispatcherStops() {
  const [stops, setStops] = useState([])
  const [barrios, setBarrios] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [mode, setMode] = useState('create') // create | edit
  const [currentId, setCurrentId] = useState(null)
  const [form, setForm] = useState({ nombre: '', latitud: '', longitud: '', direccion: '', barrio_id: '' })
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  // Paginación
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState(null) // para server-side
  const [allMode, setAllMode] = useState(false)
  const [allItems, setAllItems] = useState([])
  const clientPageSize = 20
  // Filtros (cliente)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBarrioId, setFilterBarrioId] = useState('')

  const load = async (nextPage = 1) => {
    setLoading(true)
    setError('')
    try {
      const data = await listParaderos({ page: nextPage })
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : (Array.isArray(data?.items) ? data.items : []))
      setStops(arr)
      setMeta(Array.isArray(data) ? null : (data?.meta || null))
      setPage(nextPage)
      setAllMode(false)
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudieron cargar los paraderos')
    } finally {
      setLoading(false)
    }
  }

  const loadBarrios = async () => {
    try {
      // Traer TODOS los barrios recorriendo la paginación del backend
      const all = await fetchAllBarrios()
      setBarrios(all)
    } catch (_) {}
  }

  useEffect(() => {
    load(1)
    loadBarrios()
  }, [])

  // Si el usuario comienza a filtrar y no estamos en modo "todos",
  // cargar el catálogo completo una única vez y aplicar los filtros en cliente
  useEffect(() => {
    const needAll = (searchTerm.trim().length > 0) || (String(filterBarrioId || '') !== '')
    if (needAll && !allMode && !loading) {
      handleShowAll()
    }
  }, [searchTerm, filterBarrioId])

  const openCreate = () => {
    setMode('create')
    setCurrentId(null)
    setForm({ nombre: '', latitud: '', longitud: '', direccion: '', barrio_id: '' })
    setFormErrors({})
    setShowModal(true)
  }

  const openEdit = (p) => {
    const id = p.id_paradero ?? p.id
    if (!id) { setError('No se encontró ID de paradero'); return }
    setMode('edit')
    setCurrentId(id)
    setForm({
      nombre: p.nombre ?? '',
      latitud: String(p.latitud ?? ''),
      longitud: String(p.longitud ?? ''),
      direccion: p.direccion ?? '',
      barrio_id: p.barrio_id ?? p.barrioId ?? '',
    })
    setFormErrors({})
    setShowModal(true)
  }

  const validate = (data, isEdit) => {
    const errs = {}
    if (!data.nombre || data.nombre.trim().length < 2) errs.nombre = 'Mínimo 2 caracteres'
    const lat = Number(data.latitud)
    const lng = Number(data.longitud)
    if (isNaN(lat) || lat < -90 || lat > 90) errs.latitud = 'Latitud inválida'
    if (isNaN(lng) || lng < -180 || lng > 180) errs.longitud = 'Longitud inválida'
    return errs
  }

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setFormErrors({})
    const isEdit = mode === 'edit'
    const errs = validate(form, isEdit)
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    setSubmitting(true)
    try {
      const payload = {
        nombre: form.nombre,
        latitud: Number(form.latitud),
        longitud: Number(form.longitud),
        direccion: form.direccion || undefined,
        barrio_id: form.barrio_id ? Number(form.barrio_id) : undefined,
      }
      if (mode === 'create') {
        await createParadero(payload)
      } else {
        await updateParadero(currentId, payload)
      }
      if (allMode) {
        // recargar todo en modo todos
        await handleShowAll()
      } else {
        await load(page)
      }
      setShowModal(false)
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo guardar el paradero')
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDelete = async (p) => {
    const id = p.id_paradero ?? p.id
    if (!id) { setError('No se encontró ID de paradero para eliminar'); return }
    const ok = window.confirm('¿Eliminar este paradero?')
    if (!ok) return
    setSubmitting(true)
    try {
      await deleteParadero(id)
      if (allMode) {
        await handleShowAll()
      } else {
        await load(page)
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo eliminar el paradero')
    } finally {
      setSubmitting(false)
    }
  }

  // Cargar todos los paraderos y paginar en cliente
  const handleShowAll = async () => {
    setLoading(true)
    setError('')
    try {
      const all = await fetchAllParaderos()
      setAllItems(all)
      setAllMode(true)
      setPage(1)
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudieron cargar todos los paraderos')
    } finally {
      setLoading(false)
    }
  }

  // Aplicar filtros a allItems en cliente
  const filteredAllItems = useMemo(() => {
    if (!allMode) return []
    const q = searchTerm.trim().toLowerCase()
    const barrioId = String(filterBarrioId || '')
    return allItems.filter((p) => {
      const matchesName = q ? String(p.nombre || '').toLowerCase().includes(q) : true
      const pid = String(p.barrio_id ?? p.barrioId ?? '')
      const matchesBarrio = barrioId ? (pid === barrioId) : true
      return matchesName && matchesBarrio
    })
  }, [allMode, allItems, searchTerm, filterBarrioId])

  const totalClientPages = useMemo(() => Math.max(1, Math.ceil((filteredAllItems.length || 0) / clientPageSize)), [filteredAllItems.length])
  const clientPageItems = useMemo(() => {
    if (!allMode) return []
    const start = (page - 1) * clientPageSize
    return filteredAllItems.slice(start, start + clientPageSize)
  }, [allMode, filteredAllItems, page])

  return (
    <div className="container-fluid" style={{ maxWidth: 880 }}>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h4 className="m-0">Paraderos</h4>
        <div className="d-flex align-items-center gap-2">
          {!allMode ? (
            <button className="btn btn-outline-secondary btn-sm" onClick={handleShowAll} disabled={loading}>Mostrar todos</button>
          ) : (
            <button className="btn btn-outline-secondary btn-sm" onClick={() => { setAllMode(false); load(1) }} disabled={loading}>Volver a paginación</button>
          )}
          <button className="btn btn-accent btn-sm" onClick={openCreate} disabled={loading}>Nuevo paradero</button>
        </div>
      </div>
      {/* Filtros cliente */}
      <div className="card mb-2 border-0 shadow-sm">
        <div className="card-body py-2">
          <div className="row g-2 align-items-center">
            <div className="col-md-6">
              <div className="input-group input-group-sm">
                <span className="input-group-text">Buscar</span>
                <input className="form-control" placeholder="Nombre de paradero" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div className="col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text">Barrio</span>
                <select className="form-select" value={String(filterBarrioId)} onChange={(e) => setFilterBarrioId(e.target.value)}>
                  <option value="">Todos</option>
                  {barrios.map((b) => (
                    <option key={b.id_barrio ?? b.id} value={b.id_barrio ?? b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-2 text-end">
              {(searchTerm || filterBarrioId) && (
                <button className="btn btn-link btn-sm" onClick={() => { setSearchTerm(''); setFilterBarrioId('') }}>Limpiar</button>
              )}
            </div>
          </div>
          {(!allMode && (searchTerm || filterBarrioId)) && (
            <div className="small text-muted mt-1">Aplicando filtros en cliente: se cargará el catálogo completo para filtrar.</div>
          )}
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-2">
          {loading && <div className="small">Cargando...</div>}
          {!loading && (
            <div className="table-responsive">
              <table className="table table-hover table-sm align-middle mb-0 small" style={{ fontSize: '.875rem' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nombre</th>
                    <th>Barrio</th>
                    <th>Coordenadas</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(allMode ? (allItems.length === 0) : (stops.length === 0)) && (
                    <tr><td colSpan={5} className="text-center py-3">Sin registros</td></tr>
                  )}
                  {(allMode ? clientPageItems : stops).map((p, idx) => {
                    const id = p.id_paradero ?? p.id ?? ((allMode ? ((page - 1) * clientPageSize + idx) : idx))
                    const barrio = barrios.find((b) => (b.id_barrio ?? b.id) === (p.barrio_id ?? p.barrioId))
                    return (
                      <tr key={id}>
                        <td>{allMode ? ((page - 1) * clientPageSize + idx + 1) : (idx + 1)}</td>
                        <td>{p.nombre ?? '—'}</td>
                        <td>{barrio ? (barrio.nombre ?? `Barrio ${barrio.id_barrio ?? barrio.id}`) : (p?.barrio?.nombre ?? '—')}</td>
                        <td>{(p.latitud ?? '-')}, {(p.longitud ?? '-')}</td>
                        <td className="text-end">
                          <button className="btn btn-outline-secondary btn-sm me-2" onClick={() => openEdit(p)}>Editar</button>
                          <button className="btn btn-outline-danger btn-sm" onClick={() => confirmDelete(p)} disabled={submitting}>Eliminar</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {/* Controles de paginación */}
              <div className="d-flex align-items-center justify-content-between">
                {!allMode ? (
                  <>
                    <div className="small text-muted">
                      {meta ? (
                        <>Página {meta.currentPage} de {meta.lastPage} — {meta.total} paraderos</>
                      ) : (
                        <>Mostrando {stops.length} paraderos</>
                      )}
                    </div>
                    <div className="btn-group btn-group-sm">
                      <button className="btn btn-outline-secondary" disabled={!meta || meta.currentPage <= 1} onClick={() => load(Math.max(1, (meta?.currentPage || 1) - 1))}>Anterior</button>
                      <button className="btn btn-outline-secondary" disabled={!meta || meta.currentPage >= meta.lastPage} onClick={() => load(Math.min(meta?.lastPage || 1, (meta?.currentPage || 1) + 1))}>Siguiente</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="small text-muted">Página {page} — {(filteredAllItems.length)} paraderos (cliente)</div>
                    <div className="btn-group btn-group-sm">
                      <button className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
                      <button className="btn btn-outline-secondary" disabled={page >= totalClientPages} onClick={() => setPage((p) => Math.min(totalClientPages, p + 1))}>Siguiente</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog">
              <div className="modal-content">
                <form onSubmit={onSubmit}>
                  <div className="modal-header">
                    <h5 className="modal-title">{mode === 'create' ? 'Nuevo paradero' : 'Editar paradero'}</h5>
                    <button type="button" className="btn-close" onClick={() => !submitting && setShowModal(false)}></button>
                  </div>
                  <div className="modal-body">
                    {error && <div className="alert alert-danger py-2">{error}</div>}
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label">Nombre</label>
                        <input name="nombre" className={`form-control ${formErrors.nombre ? 'is-invalid' : ''}`} value={form.nombre} onChange={onChange} />
                        {formErrors.nombre && <div className="invalid-feedback">{formErrors.nombre}</div>}
                      </div>
                      <div className="col-6">
                        <label className="form-label">Latitud</label>
                        <input name="latitud" className={`form-control ${formErrors.latitud ? 'is-invalid' : ''}`} value={form.latitud} onChange={onChange} />
                        {formErrors.latitud && <div className="invalid-feedback">{formErrors.latitud}</div>}
                      </div>
                      <div className="col-6">
                        <label className="form-label">Longitud</label>
                        <input name="longitud" className={`form-control ${formErrors.longitud ? 'is-invalid' : ''}`} value={form.longitud} onChange={onChange} />
                        {formErrors.longitud && <div className="invalid-feedback">{formErrors.longitud}</div>}
                      </div>
                      <div className="col-12">
                        <label className="form-label">Dirección (opcional)</label>
                        <input name="direccion" className="form-control" value={form.direccion} onChange={onChange} />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Barrio (opcional)</label>
                        <select name="barrio_id" className="form-select" value={String(form.barrio_id ?? '')} onChange={onChange}>
                          <option value="">Sin barrio</option>
                          {barrios.map((b) => (
                            <option key={b.id_barrio ?? b.id} value={b.id_barrio ?? b.id}>{b.nombre}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary" disabled={submitting} onClick={() => setShowModal(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-accent" disabled={submitting}>{submitting ? 'Guardando...' : 'Guardar'}</button>
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

export default DispatcherStops

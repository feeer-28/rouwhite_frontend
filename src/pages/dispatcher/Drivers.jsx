import { useEffect, useState } from 'react'
import { listUsers, createUser, updateUser, deactivateUser, activateUser, softDeactivateUser } from '../../services/usersService'
import { listCompanies } from '../../services/companiesService'
import { getEmpresaIdFromToken } from '../../services/apiClient'

function DispatcherDrivers() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [mode, setMode] = useState('create') // 'create' | 'edit'
  const [currentId, setCurrentId] = useState(null)
  const [form, setForm] = useState({ nombre: '', apellido: '', identificacion: '', email: '', password: '', empresa_id: '' })
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [companies, setCompanies] = useState([])
  const [forcedEmpresaId, setForcedEmpresaId] = useState(null)

  const resolveId = (u) => (
    u.id ?? u.id_usuario ?? u.idUsuario ?? u.uuid ?? u._id ?? u?.__raw?.id_usuario ?? u?.__raw?.id
  )

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listUsers()
      const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
      const filtered = list.filter((u) => {
        const rid = u.rol_id ?? u.rolId ?? u.role_id
        const ridNum = typeof rid === 'string' ? Number(rid) : rid
        const rname = String(u.role || u.rol || '').toLowerCase()
        const isDriver = ridNum === 3 || rname === 'conductor' || rname === 'driver'
        if (!isDriver) return false
        if (forcedEmpresaId) {
          const eid = Number(u.empresa_id ?? u.empresaId)
          return eid === Number(forcedEmpresaId)
        }
        return true
      })
      setDrivers(filtered)
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudieron cargar los conductores')
    } finally {
      setLoading(false)
    }
  }

  const loadCompanies = async () => {
    try {
      const data = await listCompanies()
      const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
      const eid = getEmpresaIdFromToken()
      if (eid) {
        setForcedEmpresaId(Number(eid))
        const only = list.filter((c) => Number(c.id_empresa ?? c.id) === Number(eid))
        setCompanies(only)
      } else {
        setCompanies(list)
      }
    } catch (e) {
      // silent
    }
  }

  useEffect(() => {
    load()
    loadCompanies()
  }, [])

  // Cuando obtenemos empresa forzada desde el token, recargar la lista para aplicar filtro
  useEffect(() => {
    if (forcedEmpresaId != null) {
      load()
    }
  }, [forcedEmpresaId])

  const openCreate = () => {
    setMode('create')
    setCurrentId(null)
    setForm({ nombre: '', apellido: '', identificacion: '', email: '', password: '', empresa_id: forcedEmpresaId ?? '' })
    setFormErrors({})
    setShowModal(true)
  }

  const openEdit = (u) => {
    const id = resolveId(u)
    if (!id) { setError('No se encontró ID de conductor para editar'); return }
    setMode('edit')
    setCurrentId(id)
    setForm({
      nombre: u.nombre ?? '',
      apellido: u.apellido ?? '',
      identificacion: u.identificacion ?? '',
      email: u.email ?? '',
      password: '',
      empresa_id: forcedEmpresaId ?? u.empresa_id ?? u.empresaId ?? '',
    })
    setFormErrors({})
    setShowModal(true)
  }

  const confirmDeactivate = (u) => {
    const id = resolveId(u)
    if (!id) { setError('No se encontró ID de conductor para desactivar'); return }
    setConfirmTarget(u)
    setConfirmOpen(true)
  }

  const doDeactivate = async () => {
    if (!confirmTarget) return
    setSubmitting(true)
    try {
      const id = resolveId(confirmTarget)
      if (!id) throw new Error('ID de conductor no válido')
      try {
        await deactivateUser(Number(id))
      } catch {
        await softDeactivateUser(Number(id))
      }
      await load()
      setConfirmOpen(false)
      setConfirmTarget(null)
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'No se pudo desactivar el conductor')
    } finally {
      setSubmitting(false)
    }
  }

  const doActivate = async (u) => {
    const id = resolveId(u)
    if (!id) { setError('No se encontró ID de conductor para activar'); return }
    setSubmitting(true)
    try {
      await activateUser(Number(id))
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo activar el conductor')
    } finally {
      setSubmitting(false)
    }
  }

  const validate = (data, isEdit) => {
    const errs = {}
    if (!data.nombre || data.nombre.trim().length < 2) errs.nombre = 'Mínimo 2 caracteres'
    if (!data.apellido || data.apellido.trim().length < 2) errs.apellido = 'Mínimo 2 caracteres'
    if (!isEdit) {
      if (!data.identificacion || data.identificacion.trim().length < 3) errs.identificacion = 'Requerida (mín 3)'
    }
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errs.email = 'Email inválido'
    if (!isEdit && (!data.password || data.password.length < 8)) errs.password = 'Mínimo 8 caracteres'
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
      if (mode === 'create') {
        const payload = {
          nombre: form.nombre,
          apellido: form.apellido,
          identificacion: form.identificacion,
          email: form.email,
          password: form.password,
          rol_id: 3, // conductor
          empresa_id: Number(forcedEmpresaId ?? form.empresa_id),
        }
        await createUser(payload)
      } else {
        const id = currentId
        const payload = {
          nombre: form.nombre,
          apellido: form.apellido,
          email: form.email,
          empresa_id: Number(forcedEmpresaId ?? form.empresa_id),
          ...(form.password ? { password: form.password } : {}),
        }
        await updateUser(id, payload)
      }
      await load()
      setShowModal(false)
    } catch (e) {
      const data = e?.response?.data
      const raw = String(data?.error || '')
      const byField = {}
      if (/duplicate key value|unique constraint/i.test(raw)) {
        if (/usuarios_identificacion_key|identificacion/i.test(raw)) byField.identificacion = 'La identificación ya está registrada'
        if (/usuarios_email_key|email/i.test(raw)) byField.email = 'El email ya está registrado'
      }
      if (Object.keys(byField).length) setFormErrors(byField)
      setError(data?.message || 'No se pudo guardar el conductor')
    } finally {
      setSubmitting(false)
    }
  }

  const renderEstado = (u) => {
    const activo = u.activo ?? u.estado ?? u.enabled ?? u.isActive ?? true
    return <span className={`badge ${activo ? 'bg-success' : 'bg-secondary'}`}>{activo ? 'Activo' : 'Inactivo'}</span>
  }

  return (
    <div className="container-fluid" style={{ maxWidth: 880 }}>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h4 className="m-0">Conductores</h4>
        <button className="btn btn-accent btn-sm" onClick={openCreate} disabled={loading}>Nuevo conductor</button>
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
                    <th>Identificación</th>
                    <th>Empresa</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-3">Sin registros</td></tr>
                  )}
                  {drivers.map((u, idx) => {
                    const id = resolveId(u) ?? idx
                    const nombre = `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim() || u.nombres || u.name || '—'
                    const empresa = companies.find((c) => (c.id_empresa ?? c.id) === (u.empresa_id ?? u.empresaId))
                    return (
                      <tr key={id}>
                        <td>{idx + 1}</td>
                        <td>{nombre}</td>
                        <td>{u.identificacion ?? '—'}</td>
                        <td>{empresa ? (empresa.nombre_empresa || empresa.nombre || `Emp ${empresa.id_empresa ?? empresa.id}`) : (u.empresa_nombre || '—')}</td>
                        <td>{renderEstado(u)}</td>
                        <td className="text-end">
                          <button className="btn btn-outline-secondary btn-sm me-2" onClick={() => openEdit(u)}>Editar</button>
                          {(u.activo ?? u.estado ?? u.enabled ?? u.isActive ?? true) ? (
                            <button className="btn btn-outline-danger btn-sm" onClick={() => confirmDeactivate(u)}>Desactivar</button>
                          ) : (
                            <button className="btn btn-outline-success btn-sm" onClick={() => doActivate(u)}>Activar</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Crear/Editar Conductor */}
      {showModal && (
        <>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <form onSubmit={onSubmit}>
                  <div className="modal-header">
                    <h5 className="modal-title">{mode === 'create' ? 'Nuevo conductor' : 'Editar conductor'}</h5>
                    <button type="button" className="btn-close" onClick={() => !submitting && setShowModal(false)}></button>
                  </div>
                  <div className="modal-body">
                    {error && <div className="alert alert-danger py-2">{error}</div>}
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Nombre</label>
                        <input name="nombre" className={`form-control ${formErrors.nombre ? 'is-invalid' : ''}`} value={form.nombre} onChange={onChange} />
                        {formErrors.nombre && <div className="invalid-feedback">{formErrors.nombre}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Apellido</label>
                        <input name="apellido" className={`form-control ${formErrors.apellido ? 'is-invalid' : ''}`} value={form.apellido} onChange={onChange} />
                        {formErrors.apellido && <div className="invalid-feedback">{formErrors.apellido}</div>}
                      </div>
                      {mode === 'create' && (
                        <div className="col-md-6">
                          <label className="form-label">Identificación</label>
                          <input name="identificacion" className={`form-control ${formErrors.identificacion ? 'is-invalid' : ''}`} value={form.identificacion} onChange={onChange} />
                          {formErrors.identificacion && <div className="invalid-feedback">{formErrors.identificacion}</div>}
                        </div>
                      )}
                      <div className={mode === 'create' ? 'col-md-6' : 'col-md-6'}>
                        <label className="form-label">Email</label>
                        <input name="email" type="email" className={`form-control ${formErrors.email ? 'is-invalid' : ''}`} value={form.email} onChange={onChange} />
                        {formErrors.email && <div className="invalid-feedback">{formErrors.email}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Empresa</label>
                        {forcedEmpresaId ? (
                          <input className="form-control" value={(companies.find(c => Number(c.id_empresa ?? c.id) === Number(forcedEmpresaId))?.nombre_empresa) 
                            || (companies.find(c => Number(c.id_empresa ?? c.id) === Number(forcedEmpresaId))?.nombre) 
                            || String(forcedEmpresaId)} disabled />
                        ) : (
                          <select name="empresa_id" className="form-select" value={String(form.empresa_id ?? '')} onChange={onChange}>
                            <option value="">Selecciona empresa</option>
                            {companies.map((c) => (
                              <option key={c.id_empresa ?? c.id} value={c.id_empresa ?? c.id}>
                                {c.nombre_empresa || c.nombre || `Empresa ${c.id_empresa ?? c.id}`}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Password {mode === 'edit' && <small className="text-muted">(opcional)</small>}</label>
                        <input name="password" type="password" className={`form-control ${formErrors.password ? 'is-invalid' : ''}`} value={form.password} onChange={onChange} />
                        {formErrors.password && <div className="invalid-feedback">{formErrors.password}</div>}
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

      {/* Modal Confirmación Desactivar */}
      {confirmOpen && (
        <>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Desactivar conductor</h5>
                  <button type="button" className="btn-close" onClick={() => !submitting && setConfirmOpen(false)}></button>
                </div>
                <div className="modal-body">
                  <p>¿Seguro que deseas desactivar este conductor?</p>
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" disabled={submitting} onClick={() => setConfirmOpen(false)}>Cancelar</button>
                  <button type="button" className="btn btn-danger" disabled={submitting} onClick={doDeactivate}>{submitting ? 'Procesando...' : 'Desactivar'}</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </div>
  )
}

export default DispatcherDrivers

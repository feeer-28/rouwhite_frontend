import { useEffect, useState } from 'react'
import { listUsersAdmin, createUser, updateUser, deactivateUser, activateUser, softDeactivateUser } from '../../services/usersService'
import { listCompanies } from '../../services/companiesService'

function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterRole, setFilterRole] = useState('') // '', 'admin', 'despachador', 'conductor'
  const [showModal, setShowModal] = useState(false)
  const [mode, setMode] = useState('create') // 'create' | 'edit'
  const [currentId, setCurrentId] = useState(null)
  const [form, setForm] = useState({ nombre: '', apellido: '', identificacion: '', email: '', password: '', empresa_id: '' })
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState(null) // store full user for reliable id resolution
  const [companies, setCompanies] = useState([])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listUsersAdmin()
      const list = Array.isArray(data) ? data : []
      // Incluir todos los roles EXCEPTO el rol de usuario final ('usuario'/'user')
      const filtered = list.filter((u) => {
        const name = String(u?.role || '').toLowerCase().trim()
        const id = Number(u?.rol_id)
        if (name) return name !== 'usuario' && name !== 'user'
        return id !== 4
      })
      setUsers(filtered)
    } catch (e) {
      const msg = e?.response?.data?.message || 'No se pudieron cargar los usuarios'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const loadCompanies = async () => {
    try {
      const data = await listCompanies()
      const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
      setCompanies(list)
    } catch (e) {
      // no bloquear la pantalla por errores de empresas
    }
  }

  useEffect(() => {
    load()
    loadCompanies()
  }, [])

  const openCreate = () => {
    setMode('create')
    setCurrentId(null)
    setForm({ nombre: '', apellido: '', identificacion: '', email: '', password: '', empresa_id: '' })
    setFormErrors({})
    setShowModal(true)
  }

  const resolveUserId = (u) => (
    u.id ?? u.id_usuario ?? u.idUsuario ?? u.uuid ?? u._id ?? u?.__raw?.id_usuario ?? u?.__raw?.id
  )

  const openEdit = (u) => {
    const id = resolveUserId(u)
    if (!id) {
      setError('No se encontró ID de usuario para editar')
      return
    }
    setMode('edit')
    setCurrentId(id)
    setForm({
      nombre: u.nombre ?? '',
      apellido: u.apellido ?? '',
      identificacion: u.identificacion ?? '',
      email: u.email ?? '',
      password: '', // opcional al editar
      empresa_id: u.empresa_id ?? '',
    })
    setFormErrors({})
    setShowModal(true)
  }

  const confirmDeactivate = (u) => {
    const id = resolveUserId(u)
    if (!id) {
      setError('No se encontró ID de usuario para desactivar')
      return
    }
    setConfirmTarget(u)
    setConfirmOpen(true)
  }

  const doDeactivate = async () => {
    if (!confirmTarget) return
    setSubmitting(true)
    try {
      const id = resolveUserId(confirmTarget)
      if (!id) throw new Error('ID de usuario no válido')
      // Intentar ruta oficial del backend: DELETE /users/:id
      try {
        await deactivateUser(Number(id))
      } catch (errDel) {
        // Si falla (p.ej. por restricciones), intentar soft-deactivate por PUT activo=false
        await softDeactivateUser(Number(id))
      }
      await load()
      setConfirmOpen(false)
      setConfirmTarget(null)
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'No se pudo desactivar el usuario'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const doActivate = async (u) => {
    const id = resolveUserId(u)
    if (!id) {
      setError('No se encontró ID de usuario para activar')
      return
    }
    setSubmitting(true)
    try {
      await activateUser(Number(id))
      await load()
    } catch (e) {
      const msg = e?.response?.data?.message || 'No se pudo activar el usuario'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const closeConfirm = () => {
    if (submitting) return
    setConfirmOpen(false)
    setConfirmTarget(null)
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
    if (Object.keys(errs).length) {
      setFormErrors(errs)
      return
    }
    setSubmitting(true)
    try {
      if (mode === 'create') {
        const payload = {
          nombre: form.nombre,
          apellido: form.apellido,
          identificacion: form.identificacion,
          email: form.email,
          password: form.password,
          rol_id: 2,
          ...(form.empresa_id ? { empresa_id: Number(form.empresa_id) } : {}),
        }
        await createUser(payload)
      } else {
        const id = currentId
        const payload = {
          nombre: form.nombre,
          apellido: form.apellido,
          email: form.email,
          ...(form.empresa_id ? { empresa_id: Number(form.empresa_id) } : {}),
          ...(form.password ? { password: form.password } : {}),
        }
        await updateUser(id, payload)
      }
      await load()
      setShowModal(false)
    } catch (e) {
      // Mapear posibles errores de duplicado
      const data = e?.response?.data
      const raw = String(data?.error || '')
      const byField = {}
      if (/duplicate key value|unique constraint/i.test(raw)) {
        if (/usuarios_identificacion_key|identificacion/i.test(raw)) byField.identificacion = 'La identificación ya está registrada'
        if (/usuarios_email_key|email/i.test(raw)) byField.email = 'El email ya está registrado'
      }
      if (Object.keys(byField).length) setFormErrors(byField)
      setError(data?.message || 'No se pudo guardar el usuario')
    } finally {
      setSubmitting(false)
    }
  }

  const renderEstado = (u) => {
    const activo = u.activo ?? u.estado ?? u.enabled ?? u.isActive ?? true
    return (
      <span className={`badge ${activo ? 'bg-success' : 'bg-secondary'}`}>{activo ? 'Activo' : 'Inactivo'}</span>
    )
  }

  const renderRol = (u) => {
    const role = u.role || u.rol || ''
    const rolId = Number(u.rol_id ?? u.rolId ?? u.role_id ?? NaN)
    if (role && typeof role === 'object') {
      const name = role.name || role.nombre || role.tipo || role.slug || role.label
      if (name) return String(name)
    }
    if (role && typeof role === 'string') return String(role)
    if (rolId === 1) return 'admin'
    if (rolId === 2) return 'despachador'
    if (rolId === 3) return 'conductor'
    if (rolId === 4) return 'usuario'
    return rolId ? `rol ${rolId}` : '—'
  }

  const filteredUsers = users.filter((u) => {
    if (!filterRole) return true
    const name = renderRol(u).toLowerCase().trim()
    return name === filterRole
  })

  return (
    <div className="container-fluid" style={{ maxWidth: 860 }}>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h4 className="m-0">Gestionar Usuarios <small className="text-muted">(se muestran todos los roles excepto Usuarios)</small></h4>
        <div className="d-flex align-items-center gap-2">
          <select className="form-select form-select-sm" value={filterRole} onChange={(e)=>setFilterRole(e.target.value)}>
            <option value="">Todos los roles</option>
            <option value="admin">Admin</option>
            <option value="despachador">Despachador</option>
            <option value="conductor">Conductor</option>
          </select>
          <button className="btn btn-accent btn-sm" onClick={openCreate} disabled={loading}>Nuevo usuario</button>
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
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-3">Sin registros</td>
                    </tr>
                  )}
                  {filteredUsers.map((u, idx) => {
                    const id = resolveUserId(u) ?? idx
                    const nombre = `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim() || u.nombres || u.name || '—'
                    return (
                      <tr key={id}>
                        <td>{idx + 1}</td>
                        <td>{nombre}</td>
                        <td>{u.email ?? '—'}</td>
                        <td>{renderRol(u)}</td>
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

      {/* Modal Crear/Editar Usuario */}
      {showModal && (
        <>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <form onSubmit={onSubmit}>
                  <div className="modal-header">
                    <h5 className="modal-title">{mode === 'create' ? 'Nuevo usuario (Despachador)' : 'Editar usuario'}</h5>
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
                        <label className="form-label">Empresa (opcional)</label>
                        <select name="empresa_id" className="form-select" value={String(form.empresa_id ?? '')} onChange={onChange}>
                          <option value="">Sin empresa</option>
                          {companies.map((c) => (
                            <option key={c.id_empresa ?? c.id} value={c.id_empresa ?? c.id}>
                              {c.nombre_empresa || c.nombre || `Empresa ${c.id_empresa ?? c.id}`}
                            </option>
                          ))}
                        </select>
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
                    <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Guardando...' : 'Guardar'}</button>
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
                  <h5 className="modal-title">Desactivar usuario</h5>
                  <button type="button" className="btn-close" onClick={closeConfirm}></button>
                </div>
                <div className="modal-body">
                  <p>¿Seguro que deseas desactivar este usuario?</p>
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" disabled={submitting} onClick={closeConfirm}>Cancelar</button>
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

export default AdminUsers

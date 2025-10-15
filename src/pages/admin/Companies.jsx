import { useEffect, useState } from 'react'
import { listCompanies, createCompany, updateCompany, deleteCompany } from '../../services/companiesService'

function AdminCompanies() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [mode, setMode] = useState('create') // 'create' | 'edit'
  const [currentId, setCurrentId] = useState(null)
  const [form, setForm] = useState({ nombre_empresa: '', email: '', direccion: '', telefono: '' })
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listCompanies()
      const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
      setCompanies(list)
    } catch (e) {
      const msg = e?.response?.data?.message || 'No se pudieron cargar las empresas'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setMode('create')
    setCurrentId(null)
    setForm({ nombre_empresa: '', email: '', direccion: '', telefono: '' })
    setFormErrors({})
    setShowModal(true)
  }

  const openEdit = (c) => {
    const id = c.id_empresa ?? c.id ?? c.uuid ?? c._id
    if (!id) {
      setError('No se encontró ID de empresa para editar')
      return
    }
    setMode('edit')
    setCurrentId(id)
    setForm({
      nombre_empresa: c.nombre_empresa ?? '',
      email: c.email ?? '',
      direccion: c.direccion ?? '',
      telefono: c.telefono ?? '',
    })
    setFormErrors({})
    setShowModal(true)
  }

  const confirmDelete = (c) => {
    const id = c.id_empresa ?? c.id ?? c.uuid ?? c._id
    if (!id) {
      setError('No se encontró ID de empresa para eliminar')
      return
    }
    setConfirmTarget(id)
    setConfirmOpen(true)
  }

  const doDelete = async () => {
    if (!confirmTarget) return
    setSubmitting(true)
    try {
      await deleteCompany(confirmTarget)
      await load()
      setConfirmOpen(false)
      setConfirmTarget(null)
    } catch (e) {
      const msg = e?.response?.data?.message || 'No se pudo eliminar la empresa'
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

  const validate = (data) => {
    const errs = {}
    if (!data.nombre_empresa || data.nombre_empresa.trim().length < 2) errs.nombre_empresa = 'Mínimo 2 caracteres'
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errs.email = 'Email inválido'
    if (data.telefono && data.telefono.trim().length < 5) errs.telefono = 'Teléfono demasiado corto'
    return errs
  }

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setFormErrors({})
    const errs = validate(form)
    if (Object.keys(errs).length) {
      setFormErrors(errs)
      return
    }
    setSubmitting(true)
    try {
      if (mode === 'create') {
        await createCompany({
          nombre_empresa: form.nombre_empresa,
          email: form.email,
          direccion: form.direccion,
          telefono: form.telefono,
        })
      } else {
        await updateCompany(currentId, {
          nombre_empresa: form.nombre_empresa,
          email: form.email,
          direccion: form.direccion,
          telefono: form.telefono,
        })
      }
      await load()
      setShowModal(false)
    } catch (e) {
      const data = e?.response?.data
      setError(data?.message || 'No se pudo guardar la empresa')
    } finally {
      setSubmitting(false)
    }
  }

  const renderEstado = (c) => {
    const activa = c.activa ?? c.estado ?? c.enabled ?? c.isActive ?? true
    return <span className={`badge ${activa ? 'bg-success' : 'bg-secondary'}`}>{activa ? 'Activa' : 'Inactiva'}</span>
  }

  return (
    <div className="container-fluid" style={{ maxWidth: 1000 }}>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h4 className="m-0">Gestionar Empresas</h4>
        <button className="btn btn-accent btn-sm" onClick={openCreate} disabled={loading}>Nueva empresa</button>
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
                    <th>Email</th>
                    <th>Dirección</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {companies.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-3">Sin registros</td>
                    </tr>
                  )}
                  {companies.map((c, idx) => {
                    const id = c.id_empresa ?? c.id ?? c.uuid ?? c._id ?? idx
                    return (
                      <tr key={id}>
                        <td>{idx + 1}</td>
                        <td>{c.nombre_empresa || c.nombre || '—'}</td>
                        <td>{c.email ?? '—'}</td>
                        <td>{c.direccion ?? '—'}</td>
                        <td>{c.telefono ?? '—'}</td>
                        <td>{renderEstado(c)}</td>
                        <td className="text-end">
                          <button className="btn btn-outline-secondary btn-sm me-2" onClick={() => openEdit(c)}>Editar</button>
                          <button className="btn btn-outline-danger btn-sm" onClick={() => confirmDelete(c)}>Eliminar</button>
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

      {/* Modal Crear/Editar Empresa */}
      {showModal && (
        <>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog">
              <div className="modal-content">
                <form onSubmit={onSubmit}>
                  <div className="modal-header">
                    <h5 className="modal-title">{mode === 'create' ? 'Nueva empresa' : 'Editar empresa'}</h5>
                    <button type="button" className="btn-close" onClick={() => !submitting && setShowModal(false)}></button>
                  </div>
                  <div className="modal-body">
                    {error && <div className="alert alert-danger py-2">{error}</div>}
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label">Nombre</label>
                        <input name="nombre_empresa" className={`form-control ${formErrors.nombre_empresa ? 'is-invalid' : ''}`} value={form.nombre_empresa} onChange={onChange} />
                        {formErrors.nombre_empresa && <div className="invalid-feedback">{formErrors.nombre_empresa}</div>}
                      </div>
                      <div className="col-12">
                        <label className="form-label">Email</label>
                        <input name="email" type="email" className={`form-control ${formErrors.email ? 'is-invalid' : ''}`} value={form.email} onChange={onChange} />
                        {formErrors.email && <div className="invalid-feedback">{formErrors.email}</div>}
                      </div>
                      <div className="col-12">
                        <label className="form-label">Dirección</label>
                        <input name="direccion" className="form-control" value={form.direccion} onChange={onChange} />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Teléfono</label>
                        <input name="telefono" className={`form-control ${formErrors.telefono ? 'is-invalid' : ''}`} value={form.telefono} onChange={onChange} />
                        {formErrors.telefono && <div className="invalid-feedback">{formErrors.telefono}</div>}
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

      {/* Modal Confirmación Eliminar */}
      {confirmOpen && (
        <>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Eliminar empresa</h5>
                  <button type="button" className="btn-close" onClick={closeConfirm}></button>
                </div>
                <div className="modal-body">
                  <p>¿Seguro que deseas eliminar esta empresa?</p>
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" disabled={submitting} onClick={closeConfirm}>Cancelar</button>
                  <button type="button" className="btn btn-danger" disabled={submitting} onClick={doDelete}>{submitting ? 'Procesando...' : 'Eliminar'}</button>
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

export default AdminCompanies

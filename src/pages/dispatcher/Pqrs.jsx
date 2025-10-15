import { useEffect, useState } from 'react'
import { listPqrs, showPqrs } from '../../services/pqrsService'

export default function DispatcherPqrs() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const arr = await listPqrs()
      setItems(Array.isArray(arr) ? arr : [])
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudieron cargar PQRS')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openDetail = async (it) => {
    try {
      const full = await showPqrs(it.id_pqrs ?? it.id)
      setSelected(full)
    } catch {
      setSelected(it)
    } finally {
      setShowModal(true)
    }
  }

  const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const filtered = items.filter((it) => {
    const q = norm(search)
    if (!q) return true
    return [it.asunto, it.descripcion, it.tipo, it.usuario?.nombre, it.usuario?.email]
      .map(norm)
      .some((v) => v.includes(q))
  })

  const short = (s, n = 60) => {
    const t = String(s || '')
    return t.length > n ? t.slice(0, n - 1) + '…' : t
  }

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="m-0">PQRS</h4>
        <div className="input-group" style={{ maxWidth: 360 }}>
          <span className="input-group-text">Buscar</span>
          <input className="form-control" placeholder="Asunto, descripción, usuario" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card" style={{ maxWidth: 960, margin: '0 auto' }}>
        <div className="card-body">
          {loading && <div>Cargando...</div>}
          {!loading && (
            <div className="table-responsive">
              <table className="table table-hover table-sm align-middle small">
                <thead>
                  <tr>
                    <th style={{ width: 56 }}>#</th>
                    <th style={{ width: '30%' }}>Asunto</th>
                    <th style={{ width: '12%' }}>Tipo</th>
                    <th style={{ width: '12%' }}>Estado</th>
                    <th style={{ width: '34%' }}>Mensaje</th>
                    <th style={{ width: 72 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-4">Sin registros</td></tr>}
                  {filtered.map((it, i) => (
                    <tr key={`pqrs-${it.id_pqrs ?? it.id ?? i}`}>
                      <td style={{ whiteSpace: 'nowrap' }}>{i + 1}</td>
                      <td className="text-truncate" style={{ maxWidth: 260 }} title={it.asunto || '—'}>{it.asunto || '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{it.tipo || '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className={`badge ${String(it.estado).toLowerCase()==='cerrado'?'text-bg-secondary':'text-bg-success'}`}>{it.estado}</span>
                      </td>
                      <td className="text-truncate" style={{ maxWidth: 320 }} title={it.descripcion || it.mensaje || '—'}>{short(it.descripcion || it.mensaje || '—')}</td>
                      <td className="text-end" style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => openDetail(it)}>Ver</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Detalle PQRS</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  {selected ? (
                    <div className="row g-3">
                      <div className="col-md-6"><strong>Asunto:</strong> {selected.asunto || '—'}</div>
                      <div className="col-md-3"><strong>Tipo:</strong> {selected.tipo || '—'}</div>
                      <div className="col-md-3"><strong>Estado:</strong> {selected.estado || '—'}</div>
                      <div className="col-12"><strong>Descripción:</strong><div className="mt-1">{selected.descripcion || '—'}</div></div>
                      <div className="col-md-6"><strong>Usuario:</strong> {selected.usuario?.nombre || selected.usuario?.email || '—'}</div>
                      <div className="col-md-6"><strong>Fecha:</strong> {selected.creado_en ? new Date(selected.creado_en).toLocaleString() : '—'}</div>
                    </div>
                  ) : (
                    <div>Cargando detalle...</div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cerrar</button>
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

import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { FaBusAlt, FaSearch, FaUserCircle } from 'react-icons/fa'
import { getUserIdFromToken } from '../services/apiClient'
import { getUser, updateUser } from '../services/usersService'

function UserLayout() {
  const nav = useNavigate()
  const loc = useLocation()
  const [q, setQ] = useState('')
  const inputRef = useRef(null)
  const [hovered, setHovered] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [profile, setProfile] = useState({ nombre: '', apellido: '', email: '', identificacion: '', currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [pError, setPError] = useState('')
  const navHover = (key) => hovered === key
    ? { color: 'var(--c-orange)', textDecoration: 'underline' }
    : { color: '#1b1b1b', textDecoration: 'none' }

  useEffect(() => {
    const params = new URLSearchParams(loc.search)
    setQ(params.get('q') || '')
    // Abrir modal de perfil si viene ?profile=1
    const prof = params.get('profile')
    if (prof && !profileOpen) {
      openProfile()
    }
  }, [loc.search])

  const onSubmit = (e) => {
    e.preventDefault()
    const term = q.trim()
    if (!term) return
    nav(`/usuario/buscar?q=${encodeURIComponent(term)}`)
  }

  const openProfile = async () => {
    try {
      setPError('')
      const uid = getUserIdFromToken()
      if (!uid) { setPError('No hay sesión activa'); setProfileOpen(true); return }
      const data = await getUser(uid)
      const u = data?.user || data?.usuario || data
      setProfile({
        nombre: u?.nombre ?? '',
        apellido: u?.apellido ?? '',
        email: u?.email ?? '',
        identificacion: u?.identificacion ?? '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setProfileOpen(true)
      // Limpiar el query ?profile=1 para que al recargar no vuelva a abrir el modal
      try {
        const params = new URLSearchParams(loc.search)
        if (params.has('profile')) {
          params.delete('profile')
          const qs = params.toString()
          nav({ pathname: loc.pathname, search: qs ? `?${qs}` : '' }, { replace: true })
        }
      } catch {}
    } catch (e) {
      setPError('No se pudo cargar tu perfil')
      setProfileOpen(true)
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    setPError('')
    try {
      const uid = getUserIdFromToken()
      if (!uid) { setPError('No hay sesión activa'); return }
      // Validaciones básicas de contraseña
      if (profile.newPassword || profile.confirmPassword) {
        if (String(profile.newPassword).length < 8) {
          setPError('La nueva contraseña debe tener al menos 8 caracteres')
          return
        }
        if (String(profile.newPassword) !== String(profile.confirmPassword)) {
          setPError('La confirmación de contraseña no coincide')
          return
        }
      }
      await updateUser(uid, {
        nombre: String(profile.nombre || '').trim(),
        apellido: String(profile.apellido || '').trim(),
        email: String(profile.email || '').trim(),
        identificacion: String(profile.identificacion || '').trim(),
        ...(profile.newPassword ? { password: String(profile.newPassword) } : {}),
      })
      setProfileOpen(false)
    } catch (e) {
      setPError(e?.response?.data?.message || 'No se pudo actualizar el perfil')
    } finally { setSaving(false) }
  }

  return (
    <div className="d-flex flex-column" style={{ minHeight: '100vh' }}>
      {/* Scoped styles for a prettier navbar */}
      <style>{`
        .user-navbar {
          background: linear-gradient(90deg, #ffe6a0, #ffc67a, #ffb36b);
          box-shadow: 0 4px 18px rgba(0,0,0,.08);
          border-bottom: 1px solid rgba(0,0,0,.06);
        }
        .user-navbar .brand-badge {
          background-color: rgba(255,255,255,.92);
          color: #2b2b2b;
          border-radius: 999px;
          padding: 6px 10px;
          box-shadow: 0 1px 2px rgba(0,0,0,.06);
        }
        .user-navbar .menu li .nav-link {
          color: #4a3b2f;
          border-radius: 999px;
          padding: 8px 12px;
          transition: all .15s ease-in-out;
        }
        .user-navbar .menu li .nav-link:hover {
          background: rgba(255,255,255,.65);
          color: #1b1b1b;
          text-decoration: none;
        }
        .user-navbar .profile-btn {
          border-radius: 999px;
          width: 40px; height: 40px;
          display: inline-flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,.6);
          color: #4a3b2f;
        }
        .user-navbar .profile-btn:hover {
          background: rgba(255,255,255,.8);
          color: #1b1b1b;
        }
        .user-navbar .btn-logout {
          border-color: rgba(255,255,255,.7) !important;
          background-color: rgba(255,255,255,.7) !important;
          color: #2b2b2b !important;
          border-radius: 999px;
        }
      `}</style>
      <nav className="navbar navbar-expand-lg border-0 sticky-top user-navbar">
        <div className="container-fluid">
          <Link className="navbar-brand d-flex align-items-center gap-2" to="/usuario" style={{ textDecoration: 'none' }}>
            <span className="d-inline-flex align-items-center gap-2 brand-badge">
              <FaBusAlt className="text-accent" />
              <strong>Rouwhite</strong>
            </span>
          </Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#userNav" aria-controls="userNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="userNav">
            <ul className="navbar-nav mb-2 mb-lg-0 ms-auto menu">
              <li className="nav-item"><Link className="nav-link px-3" to="/usuario" onMouseEnter={()=>setHovered('dash')} onMouseLeave={()=>setHovered('')} style={navHover('dash')}>Dashboard</Link></li>
              <li className="nav-item"><Link className="nav-link px-3" to="/usuario/rutas" onMouseEnter={()=>setHovered('rutas')} onMouseLeave={()=>setHovered('')} style={navHover('rutas')}>Rutas</Link></li>
              <li className="nav-item"><Link className="nav-link px-3" to="/usuario/favoritos" onMouseEnter={()=>setHovered('favs')} onMouseLeave={()=>setHovered('')} style={navHover('favs')}>Favoritos</Link></li>
              <li className="nav-item"><Link className="nav-link px-3" to="/usuario/mapa" onMouseEnter={()=>setHovered('mapa')} onMouseLeave={()=>setHovered('')} style={navHover('mapa')}>Tiempo real</Link></li>
              <li className="nav-item d-flex align-items-center ms-2">
                <button type="button" className="btn profile-btn" title="Perfil" onClick={openProfile}>
                  <FaUserCircle size={26} />
                </button>
              </li>
              <li className="nav-item ms-2"><Link className="btn btn-outline-light btn-sm btn-logout" to="/logout">Salir</Link></li>
            </ul>
          </div>
        </div>
      </nav>
      <main className="container py-3 flex-grow-1">
        <Outlet />
      </main>

      {profileOpen && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Mi perfil</h5>
                <button type="button" className="btn-close" onClick={() => !saving && setProfileOpen(false)}></button>
              </div>
              <div className="modal-body">
                {pError && <div className="alert alert-warning py-2">{pError}</div>}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Nombre</label>
                    <input className="form-control" value={profile.nombre} onChange={(e)=>setProfile(prev=>({...prev, nombre: e.target.value}))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Apellido</label>
                    <input className="form-control" value={profile.apellido} onChange={(e)=>setProfile(prev=>({...prev, apellido: e.target.value}))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Identificación</label>
                    <input className="form-control" value={profile.identificacion} onChange={(e)=>setProfile(prev=>({...prev, identificacion: e.target.value}))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={profile.email} onChange={(e)=>setProfile(prev=>({...prev, email: e.target.value}))} />
                  </div>
                  <div className="col-12"><hr/></div>
                  <div className="col-12">
                    <div className="fw-semibold">Cambiar contraseña (opcional)</div>
                    <div className="text-muted small">Déjalo en blanco si no deseas cambiarla.</div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Contraseña actual</label>
                    <input type="password" className="form-control" value={profile.currentPassword} onChange={(e)=>setProfile(prev=>({...prev, currentPassword: e.target.value}))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Nueva contraseña</label>
                    <input type="password" className="form-control" value={profile.newPassword} onChange={(e)=>setProfile(prev=>({...prev, newPassword: e.target.value}))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Confirmar contraseña</label>
                    <input type="password" className="form-control" value={profile.confirmPassword} onChange={(e)=>setProfile(prev=>({...prev, confirmPassword: e.target.value}))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" disabled={saving} onClick={() => setProfileOpen(false)}>Cancelar</button>
                <button type="button" className="btn btn-accent" disabled={saving} onClick={saveProfile}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserLayout

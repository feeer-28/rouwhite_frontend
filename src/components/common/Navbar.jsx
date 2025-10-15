import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { FaBusAlt } from 'react-icons/fa'

function Navbar() {
  const { pathname } = useLocation()
  const toAnchor = (hash) => (pathname === '/' ? `#${hash}` : `/#${hash}`)
  const [hovered, setHovered] = useState('')
  const hoverStyle = (key) => hovered === key
    ? { color: 'var(--c-orange)' }
    : {}
  const navigate = useNavigate()

  const handleAnchor = (e, hash) => {
    e.preventDefault()
    if (pathname !== '/') {
      // Navegar a home con hash
      navigate(`/${hash ? `#${hash}` : ''}`)
      // Fallback por si el navegador no hace scroll con hash inmediatamente
      setTimeout(() => {
        try { document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch {}
      }, 50)
    } else {
      try { document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch {}
    }
  }
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light border-bottom sticky-top" style={{ backdropFilter: 'blur(6px)' }}>
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <FaBusAlt className="text-accent" />
          <span>Rouwhite</span>
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavAltMarkup" aria-controls="navbarNavAltMarkup" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNavAltMarkup">
          {/* Centro: enlaces */}
          <div className="navbar-nav mx-auto text-center">
            <a className="nav-link" href={toAnchor('inicio')} onClick={(e)=>handleAnchor(e,'inicio')} onMouseEnter={()=>setHovered('inicio')} onMouseLeave={()=>setHovered('')} style={hoverStyle('inicio')}>Inicio</a>
            <a className="nav-link" href={toAnchor('todas')} onClick={(e)=>handleAnchor(e,'todas')} onMouseEnter={()=>setHovered('rutas')} onMouseLeave={()=>setHovered('')} style={hoverStyle('rutas')}>Rutas</a>
            <a className="nav-link" href={toAnchor('sobre')} onClick={(e)=>handleAnchor(e,'sobre')} onMouseEnter={()=>setHovered('sobre')} onMouseLeave={()=>setHovered('')} style={hoverStyle('sobre')}>Sobre nosotros</a>
          </div>
          {/* Derecha: auth */}
          <div className="d-flex align-items-center gap-2 ms-auto">
            <Link className="btn btn-sun btn-sm" to="/login">Ingresar</Link>
            <Link className="btn btn-accent btn-sm" to="/register">Registrarse</Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

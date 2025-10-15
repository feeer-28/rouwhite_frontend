import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { 
  FaTachometerAlt, 
  FaUserTie, 
  FaRoute, 
  FaMapMarkerAlt, 
  FaMap, 
  FaBus, 
  FaCommentAlt,
  FaBusAlt 
} from 'react-icons/fa'

function DispatcherSidebar() {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState('')
  const linkStyle = (key, isActive) => ({
    color: '#fff',
    opacity: isActive ? 1 : 0.9,
    backgroundColor: (hovered === key || isActive) ? 'rgba(255,255,255,.14)' : 'transparent',
    borderLeft: (hovered === key || isActive) ? '3px solid #fff' : '3px solid transparent',
    padding: '8px 12px',
    borderRadius: 6,
    transition: 'all .15s ease-in-out'
  })
  const brand = (
    <span className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill" style={{ backgroundColor: 'rgba(255,255,255,.2)', color: '#fff', fontWeight: 700 }}>
      <FaBusAlt color="#fff"/>
      Rouwhite
    </span>
  )
  
  const separator = <div className="my-1" style={{ height: 1, background: 'rgba(255,255,255,.25)', borderRadius: 1 }} />
  const links = (
    <nav className="nav flex-column p-2">
      <NavLink className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? 'fw-semibold' : ''}`} to="/despachador"
               onMouseEnter={() => setHovered('dash')} onMouseLeave={() => setHovered('')} onFocus={() => setHovered('dash')} onBlur={() => setHovered('')}
               title="Dashboard" style={({isActive})=> linkStyle('dash', isActive)}>
        <FaTachometerAlt color="#fff"/> Dashboard
      </NavLink>
      {separator}
      <NavLink className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? 'fw-semibold' : ''}`} to="/despachador/conductores"
               onMouseEnter={() => setHovered('drivers')} onMouseLeave={() => setHovered('')} onFocus={() => setHovered('drivers')} onBlur={() => setHovered('')}
               title="Conductores" style={({isActive})=> linkStyle('drivers', isActive)}>
        <FaUserTie color="#fff"/> Conductores
      </NavLink>
      {separator}
      <NavLink className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? 'fw-semibold' : ''}`} to="/despachador/rutas"
               onMouseEnter={() => setHovered('routes')} onMouseLeave={() => setHovered('')} onFocus={() => setHovered('routes')} onBlur={() => setHovered('')}
               title="Rutas" style={({isActive})=> linkStyle('routes', isActive)}>
        <FaRoute color="#fff"/> Rutas
      </NavLink>
      {separator}
      <NavLink className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? 'fw-semibold' : ''}`} to="/despachador/paraderos"
               onMouseEnter={() => setHovered('stops')} onMouseLeave={() => setHovered('')} onFocus={() => setHovered('stops')} onBlur={() => setHovered('')}
               title="Paraderos" style={({isActive})=> linkStyle('stops', isActive)}>
        <FaMapMarkerAlt color="#fff"/> Paraderos
      </NavLink>
      {separator}
      <NavLink className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? 'fw-semibold' : ''}`} to="/despachador/mapa"
               onMouseEnter={() => setHovered('map')} onMouseLeave={() => setHovered('')} onFocus={() => setHovered('map')} onBlur={() => setHovered('')}
               title="Mapa" style={({isActive})=> linkStyle('map', isActive)}>
        <FaMap color="#fff"/> Mapa
      </NavLink>
      {separator}
      <NavLink className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? 'fw-semibold' : ''}`} to="/despachador/buses"
               onMouseEnter={() => setHovered('buses')} onMouseLeave={() => setHovered('')} onFocus={() => setHovered('buses')} onBlur={() => setHovered('')}
               title="Buses" style={({isActive})=> linkStyle('buses', isActive)}>
        <FaBus color="#fff"/> Buses
      </NavLink>
      {separator}
      <NavLink className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? 'fw-semibold' : ''}`} to="/despachador/pqrs"
               onMouseEnter={() => setHovered('pqrs')} onMouseLeave={() => setHovered('')} onFocus={() => setHovered('pqrs')} onBlur={() => setHovered('')}
               title="PQRS" style={({isActive})=> linkStyle('pqrs', isActive)}>
        <FaCommentAlt color="#fff"/> PQRS
      </NavLink>
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="border-end d-none d-md-flex flex-column" style={{ width: 260, backgroundColor: '#f6a73a', borderRightColor: 'rgba(0,0,0,.2)' }}>
        <div className="p-3 border-bottom" style={{ borderColor: 'rgba(0,0,0,.12)' }}>
          {brand}
        </div>
        <div className="flex-grow-1 overflow-auto">
          {links}
        </div>
        <div className="p-3 border-top" style={{ borderColor: 'rgba(0,0,0,.12)' }}>
          <button className="btn btn-light w-100" onClick={() => navigate('/logout')}>Cerrar sesión</button>
        </div>
      </aside>

      {/* Mobile offcanvas */}
      <div className="offcanvas offcanvas-start d-md-none" tabIndex="-1" id="dispatcherSidebarOffcanvas" aria-labelledby="dispatcherSidebarOffcanvasLabel" style={{ backgroundColor: '#f6a73a', color: '#fff' }}>
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="dispatcherSidebarOffcanvasLabel">{brand}</h5>
          <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body pt-0 d-flex flex-column">
          <div className="flex-grow-1 overflow-auto">
            {links}
          </div>
          <div className="pt-2">
            <button className="btn btn-light w-100" data-bs-dismiss="offcanvas" onClick={() => navigate('/logout')}>Cerrar sesión</button>
          </div>
        </div>
      </div>
    </>
  )
}

export default DispatcherSidebar

import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { FaTachometerAlt, FaUsersCog, FaBuilding, FaBusAlt } from 'react-icons/fa'

function AdminSidebar() {
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
      <NavLink
        className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? 'fw-semibold' : ''}`}
        to="/admin"
        onMouseEnter={() => setHovered('dash')}
        onMouseLeave={() => setHovered('')}
        onFocus={() => setHovered('dash')}
        onBlur={() => setHovered('')}
        title="Panel principal"
        style={({isActive})=> linkStyle('dash', isActive)}
      >
        <FaTachometerAlt color="#fff"/> Dashboard
      </NavLink>
      {separator}
      <NavLink
        className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? 'fw-semibold' : ''}`}
        to="/admin/users"
        onMouseEnter={() => setHovered('users')}
        onMouseLeave={() => setHovered('')}
        onFocus={() => setHovered('users')}
        onBlur={() => setHovered('')}
        title="Gestionar Usuarios"
        style={({isActive})=> linkStyle('users', isActive)}
      >
        <FaUsersCog color="#fff"/> Gestionar Usuarios
      </NavLink>
      {separator}
      <NavLink
        className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? 'fw-semibold' : ''}`}
        to="/admin/companies"
        onMouseEnter={() => setHovered('companies')}
        onMouseLeave={() => setHovered('')}
        onFocus={() => setHovered('companies')}
        onBlur={() => setHovered('')}
        title="Gestionar Empresas"
        style={({isActive})=> linkStyle('companies', isActive)}
      >
        <FaBuilding color="#fff"/> Gestionar Empresas
      </NavLink>
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="border-end d-none d-md-block" style={{ width: 260, backgroundColor: '#f6a73a', borderRightColor: 'rgba(0,0,0,.2)' }}>
        <div className="p-3 border-bottom" style={{ borderColor: 'rgba(0,0,0,.12)' }}>
          {brand}
        </div>
        {links}
      </aside>

      {/* Mobile offcanvas */}
      <div className="offcanvas offcanvas-start d-md-none" tabIndex="-1" id="adminSidebarOffcanvas" aria-labelledby="adminSidebarOffcanvasLabel" style={{ backgroundColor: '#f6a73a', color: '#fff' }}>
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="adminSidebarOffcanvasLabel">{brand}</h5>
          <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body pt-0">
          {links}
        </div>
      </div>
    </>
  )
}

export default AdminSidebar

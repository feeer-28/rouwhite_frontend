import { useEffect, useState } from 'react'
import { listUsersAll } from '../../services/usersService'
import { listEmpresas } from '../../services/empresasService'
import { FaUsers, FaBuilding } from 'react-icons/fa'

function StatCard({ title, value, subtitle, icon, gradient }) {
  return (
    <div className="card h-100 border-0 shadow" style={{ overflow: 'hidden' }}>
      <div style={{ height: 60, background: gradient, display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
        <div className="d-flex align-items-center gap-2 text-dark fw-bold">
          {icon}
          <span>{title}</span>
        </div>
      </div>
      <div className="card-body">
        <div className="display-6 fw-semibold">{value}</div>
        {subtitle && <div className="text-muted small">{subtitle}</div>}
      </div>
    </div>
  )
}

function StatsCards() {
  const [usersCount, setUsersCount] = useState('—')
  const [companiesCount, setCompaniesCount] = useState('—')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const [users, emps] = await Promise.all([
          listUsersAll().catch(() => []),
          listEmpresas().catch(() => []),
        ])
        const arr = Array.isArray(users) ? users : []
        // Intentar detectar el nombre del rol en campos comunes
        const getRoleName = (u) => {
          const r = u?.role ?? u?.rol ?? u?.nombre_rol ?? u?.role_name ?? u?.ROLE ?? u?.Rol ?? null
          return r != null ? String(r) : ''
        }
        const adminLike = arr.filter((u) => {
          const rn = getRoleName(u).toLowerCase().trim()
          // Excluir roles "usuario"/"user" (finales). Si no hay rol, lo incluimos por seguridad.
          if (!rn) return true
          return rn !== 'usuario' && rn !== 'user'
        })
        setUsersCount(adminLike.length)
        setCompaniesCount(Array.isArray(emps) ? emps.length : 0)
      } finally { setLoading(false) }
    }
    run()
  }, [])

  return (
    <div className="row g-3">
      <div className="col-12 col-md-6 col-lg-3">
        <StatCard
          title="Usuarios"
          value={loading ? '...' : usersCount}
          icon={<FaUsers/>}
          gradient={'linear-gradient(135deg, var(--c-sun), var(--c-orange))'}
        />
      </div>
      <div className="col-12 col-md-6 col-lg-3">
        <StatCard
          title="Empresas"
          value={loading ? '...' : companiesCount}
          icon={<FaBuilding/>}
          gradient={'linear-gradient(135deg, var(--c-sun), var(--c-orange))'}
        />
      </div>
    </div>
  )
}

export default StatsCards

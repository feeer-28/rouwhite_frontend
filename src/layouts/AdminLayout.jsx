import AdminSidebar from '../components/admin/AdminSidebar'
import AdminHeader from '../components/admin/AdminHeader'
import { Outlet } from 'react-router-dom'

function AdminLayout() {
  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#faf8f3' }}>
      <AdminSidebar />
      <div className="flex-grow-1 d-flex flex-column">
        <AdminHeader />
        <main className="container-fluid py-3">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout

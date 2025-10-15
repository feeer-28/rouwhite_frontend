import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'

function PublicLayout() {
  const { pathname } = useLocation()
  const hideFooter = pathname === '/login' || pathname === '/register'
  return (
    <div className="app-container d-flex flex-column min-vh-100">
      <Navbar />
      <main className="flex-grow-1">
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
    </div>
  )
}

export default PublicLayout

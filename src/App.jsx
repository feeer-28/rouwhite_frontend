import './App.css'
import { Routes, Route, Navigate } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'
import DispatcherLayout from './layouts/DispatcherLayout'
import UserLayout from './layouts/UserLayout'
import Landing from './pages/public/Landing'
import PublicRoutes from './pages/public/PublicRoutes'
import About from './pages/public/About'
import PublicRouteDetail from './pages/public/PublicRouteDetail'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Logout from './pages/auth/Logout'
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminCompanies from './pages/admin/Companies'
import DispatcherDashboard from './pages/dispatcher/Dashboard'
import DispatcherDrivers from './pages/dispatcher/Drivers'
import DispatcherRoutes from './pages/dispatcher/Routes'
import DispatcherStops from './pages/dispatcher/Stops'
import DispatcherMap from './pages/dispatcher/Map'
import DispatcherBuses from './pages/dispatcher/Buses'
import DispatcherPqrs from './pages/dispatcher/Pqrs'
import UserDashboard from './pages/user/Dashboard'
import UserFavorites from './pages/user/Favorites'
import UserSearch from './pages/user/Search'
import UserLiveMap from './pages/user/LiveMap'
import UserRoutes from './pages/user/Routes'

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}> 
        <Route index element={<Landing />} />
        <Route path="rutas" element={<PublicRoutes />} />
        <Route path="rutas/:id" element={<PublicRouteDetail />} />
        <Route path="sobre" element={<About />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="logout" element={<Logout />} />
        {/* Próximas rutas públicas: /rutas, /paraderos, /barrios */}
      </Route>

      {/* Rutas de administrador */}
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="companies" element={<AdminCompanies />} />
      </Route>

      {/* Rutas de despachador */}
      <Route path="despachador" element={<DispatcherLayout />}>
        <Route index element={<DispatcherDashboard />} />
        <Route path="conductores" element={<DispatcherDrivers />} />
        <Route path="rutas" element={<DispatcherRoutes />} />
        <Route path="paraderos" element={<DispatcherStops />} />
        <Route path="mapa" element={<DispatcherMap />} />
        <Route path="buses" element={<DispatcherBuses />} />
        <Route path="pqrs" element={<DispatcherPqrs />} />
      </Route>

      {/* Rutas de usuario */}
      <Route path="usuario" element={<UserLayout />}>
        <Route index element={<UserDashboard />} />
        <Route path="rutas" element={<UserRoutes />} />
        <Route path="favoritos" element={<UserFavorites />} />
        <Route path="mapa" element={<UserLiveMap />} />
        <Route path="buscar" element={<UserSearch />} />
      </Route>

      {/* Redirección de desconocidos al inicio */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
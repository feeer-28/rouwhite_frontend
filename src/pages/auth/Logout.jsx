import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setAuthToken } from '../../services/apiClient'
import { stop as trackerStop } from '../../services/locationTracker'

function Logout() {
  const navigate = useNavigate()

  useEffect(() => {
    const doLogout = async () => {
      try {
        await api.post('/auth/logout')
      } catch (_) {
        // ignorar errores de logout
      } finally {
        // limpiar token local y header
        localStorage.removeItem('auth_token')
        try { localStorage.removeItem('bus_share_live') } catch {}
        try { trackerStop() } catch {}
        setAuthToken(null)
        navigate('/')
      }
    }
    doLogout()
  }, [navigate])

  return (
    <div className="container py-5">
      <p>Cerrando sesión...</p>
    </div>
  )
}

export default Logout

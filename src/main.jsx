import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.jsx'
import { setAuthToken } from './services/apiClient'

// Restaurar token de autenticación si existe (sin servicio intermedio)
const saved = localStorage.getItem('auth_token')
if (saved) setAuthToken(saved)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

import axios from 'axios'

// Base URL del backend: usar la variable de entorno local (Vite)
// Asegúrate de definir VITE_API_BASE_URL en tu archivo .env, ej:
// VITE_API_BASE_URL="http://localhost:3333"
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3333'

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
})

// Log útil solo en desarrollo para confirmar la baseURL efectiva
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info('[api] baseURL:', api.defaults.baseURL)
}

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

export function getAuthToken() {
  try {
    return localStorage.getItem('auth_token') || null
  } catch {
    return null
  }
}

export function getEmpresaIdFromToken() {
  const tok = getAuthToken()
  if (!tok) return null
  const parts = tok.split('.')
  if (parts.length < 2) return null
  try {
    const payload = JSON.parse(atob(parts[1]))
    const eid = payload?.empresa_id ?? payload?.empresaId ?? payload?.company_id ?? payload?.companyId ?? null
    return typeof eid === 'number' ? eid : (eid ? Number(eid) : null)
  } catch {
    return null
  }
}

export function getUserIdFromToken() {
  const tok = getAuthToken()
  if (!tok) return null
  const parts = tok.split('.')
  if (parts.length < 2) return null
  try {
    const payload = JSON.parse(atob(parts[1]))
    const uid = payload?.id_usuario
      ?? payload?.usuario_id
      ?? payload?.usuarioId
      ?? payload?.idUsuario
      ?? payload?.user_id
      ?? payload?.userId
      ?? payload?.sub
      ?? null
    return typeof uid === 'number' ? uid : (uid ? Number(uid) : null)
  } catch {
    return null
  }
}

// Decodificar token (sin verificar firma) y validar expiración (exp en segundos)
export function isAuthTokenValid() {
  const tok = getAuthToken()
  if (!tok) return false
  const parts = tok.split('.')
  if (parts.length < 2) return false
  try {
    const payload = JSON.parse(atob(parts[1]))
    const exp = payload?.exp
    if (!exp) return true // si no trae exp, lo consideramos válido para no bloquear entornos de prueba
    const nowSec = Math.floor(Date.now() / 1000)
    return exp > nowSec
  } catch {
    return false
  }
}

// Interceptor global para 401/403
// Nota: por defecto NO redirige automáticamente. Para habilitarlo, define VITE_AUTH_AUTO_REDIRECT="1".
const AUTH_AUTO_REDIRECT = String(import.meta.env?.VITE_AUTH_AUTO_REDIRECT || '0') === '1'
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const cfg = error?.config || {}
    const url = String(cfg?.url || '')
    const skip = cfg?.__skipAuthRedirect === true
    const isPublic = url.startsWith('/search')
    if ((status === 401 || status === 403) && !skip && !isPublic) {
      // Limpia el header, pero no redirige por defecto
      setAuthToken(null)
      if (AUTH_AUTO_REDIRECT && typeof window !== 'undefined') {
        const current = window.location?.pathname || ''
        if (current !== '/login') {
          window.location.assign('/login')
        }
      }
    }
    return Promise.reject(error)
  }
)

// Inicializar header Authorization desde localStorage al cargar el módulo (después de crear `api`)
try {
  const existing = (typeof localStorage !== 'undefined') ? localStorage.getItem('auth_token') : null
  if (existing) {
    api.defaults.headers.common['Authorization'] = `Bearer ${existing}`
  }
} catch {}

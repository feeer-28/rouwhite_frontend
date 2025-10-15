import { api } from './apiClient'

// Enviar ubicación del bus: { idBus, latitud, longitud, timestamp? }
// Protected (JWT): POST /api/bus/ubicacion
export async function postBusLocation({ idBus, latitud, longitud, timestamp }) {
  const body = {
    idBus,
    latitud,
    longitud,
    ...(timestamp ? { timestamp } : {}),
  }
  const { data } = await api.post('/api/bus/ubicacion', body)
  return data
}

// Obtener ubicación actual del bus
// Protected (JWT): GET /api/bus/ubicacion/:idBus
export async function getBusCurrentLocation(idBus) {
  const { data } = await api.get(`/api/bus/ubicacion/${idBus}`)
  return data
}

// PUBLIC: GET /public/bus/ubicacion/:idBus (snapshot)
export async function getPublicBusLocation(idBus) {
  const { data } = await api.get(`/public/bus/ubicacion/${idBus}`, { __skipAuthRedirect: true })
  return data
}

// PUBLIC SSE: /public/bus/ubicacion/:idBus/stream (no Authorization header)
export function streamPublicBusLocation(idBus) {
  const base = api.defaults.baseURL?.replace(/\/$/, '') || ''
  const url = `${base}/public/bus/ubicacion/${idBus}/stream`
  const es = new EventSource(url)
  return es
}

// Protected SSE (JWT) note: EventSource no puede enviar Authorization header.
// Si tu backend admite auth por cookie/sesión o token via querystring, podrías habilitarlo abajo.
// Por defecto, se recomienda usar el stream público para clientes.
export function streamBusLocation(idBus) {
  const base = api.defaults.baseURL?.replace(/\/$/, '') || ''
  const url = `${base}/api/bus/ubicacion/${idBus}/stream`
  // Intento de compatibilidad: anexar token por query si el backend lo soporta.
  const headers = api.defaults.headers.common || {}
  const token = headers['Authorization'] || headers['authorization']
  const es = new EventSource(`${url}${token ? `?auth=${encodeURIComponent(token)}` : ''}`)
  return es
}

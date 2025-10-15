import { api } from './apiClient'
import { listAllRoutes } from './routesService'
import { listParaderos } from './paraderosService'
import { listBarrios } from './barriosService'

export async function unifiedSearch(query) {
  const q = String(query || '').trim()
  const ql = q.toLowerCase()
  // 1) Rutas SIEMPRE desde rutas/listar
  const rutasAll = await listAllRoutes().catch(() => [])
  const rutas = (Array.isArray(rutasAll) ? rutasAll : []).filter((r) => {
    const nombre = `${r.nombre ?? r.nombre_ruta ?? ''} ${r.codigo ?? ''}`.toLowerCase()
    return !ql || nombre.includes(ql)
  })
  // 2) Paraderos y Barrios preferentemente desde /search (público). Si falla, fallback a listar + filtrar.
  try {
    const { data } = await api.get('/search', { params: { q }, __skipAuthRedirect: true })
    const paraderosRaw = Array.isArray(data?.paraderos) ? data.paraderos : (Array.isArray(data?.data?.paraderos) ? data.data.paraderos : [])
    const barriosRaw = Array.isArray(data?.barrios) ? data.barrios : (Array.isArray(data?.data?.barrios) ? data.data.barrios : [])
    const paraderos = paraderosRaw.map((p) => ({ id_paradero: p.id_paradero ?? p.idParadero ?? p.id, nombre: p.nombre, ...p }))
    const barrios = barriosRaw.map((b) => ({ id_barrio: b.id_barrio ?? b.idBarrio ?? b.id, nombre: b.nombre, ...b }))
    return { rutas, paraderos, barrios, _fallback: false }
  } catch (_) {
    const [allParaderos, allBarrios] = await Promise.all([
      listParaderos().catch(() => []),
      listBarrios().catch(() => []),
    ])
    const paraderos = (Array.isArray(allParaderos) ? allParaderos : []).filter((p) => `${p.nombre ?? ''}`.toLowerCase().includes(ql))
    const barrios = (Array.isArray(allBarrios) ? allBarrios : []).filter((b) => `${b.nombre ?? ''}`.toLowerCase().includes(ql))
    return { rutas, paraderos, barrios, _fallback: true }
  }
}

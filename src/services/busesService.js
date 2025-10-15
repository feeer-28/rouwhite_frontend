import { api } from './apiClient'
import { getEmpresaIdFromToken } from './apiClient'

// Listar todos los buses
export async function listBuses() {
  const eid = getEmpresaIdFromToken()
  const { data } = await api.get('/buses/listar', {
    params: eid ? { empresaId: eid } : undefined,
  })
  let arr = []
  if (Array.isArray(data)) arr = data
  else if (Array.isArray(data?.data)) arr = data.data
  else if (Array.isArray(data?.rows)) arr = data.rows
  else if (Array.isArray(data?.buses)) arr = data.buses
  else if (Array.isArray(data?.items)) arr = data.items
  else if (data?.result && Array.isArray(data.result)) arr = data.result
  else arr = []
  // Normalizar campos más comunes para evitar undefined en la UI
  return arr.map((row) => {
    const it = row?.bus || row
    const id_bus = it.id_bus ?? it.idBus ?? it.id
    const empresa_id = it.empresa_id ?? it.empresaId
    const ruta_id = it.ruta_id ?? it.rutaId
    const placa = it.placa
    const descripcion = it.descripcion ?? it.description ?? ''
    const latitud = it.latitud ?? it.lat
    const longitud = it.longitud ?? it.lng ?? it.lon
    const estRaw = it.estado ?? it.activo ?? it.enabled
    const estado = (function(v){
      if (v === true || v === 1) return true
      if (v === false || v === 0) return false
      if (typeof v === 'string') {
        const s = v.toLowerCase()
        if (s === 'true' || s === '1') return true
        if (s === 'false' || s === '0') return false
      }
      return v == null ? true : Boolean(v)
    })(estRaw)
    return { ...it, id_bus, id: id_bus, empresa_id, ruta_id, placa, descripcion, latitud, longitud, estado }
  })
}

// Listar todos los buses sin filtrar por empresa (para Mapa global)
export async function listBusesAll() {
  const { data } = await api.get('/buses/listar')
  let arr = []
  if (Array.isArray(data)) arr = data
  else if (Array.isArray(data?.data)) arr = data.data
  else if (Array.isArray(data?.rows)) arr = data.rows
  else if (Array.isArray(data?.buses)) arr = data.buses
  else if (Array.isArray(data?.items)) arr = data.items
  else if (data?.result && Array.isArray(data.result)) arr = data.result
  else arr = []
  return arr.map((row) => {
    const it = row?.bus || row
    const id_bus = it.id_bus ?? it.idBus ?? it.id ?? it.uuid ?? it._id
    const empresa_id = it.empresa_id ?? it.empresaId ?? it.id_empresa
    const ruta_id = it.ruta_id ?? it.rutaId
    const placa = it.placa
    const latitud = it.latitud ?? it.lat
    const longitud = it.longitud ?? it.lng ?? it.lon
    const estRaw = it.estado ?? it.activo ?? it.enabled
    const estado = (function(v){
      if (v === true || v === 1) return true
      if (v === false || v === 0) return false
      if (typeof v === 'string') {
        const s = v.toLowerCase()
        if (s === 'true' || s === '1') return true
        if (s === 'false' || s === '0') return false
      }
      return v == null ? true : Boolean(v)
    })(estRaw)
    return { ...it, id_bus, id: id_bus, empresa_id, ruta_id, placa, latitud, longitud, estado }
  })
}

// Ver un bus
export async function showBus(id) {
  const { data } = await api.get(`/buses/${id}`)
  return data
}

// Crear bus: { placa, descripcion, empresa_id, ruta_id }
export async function createBus(payload) {
  const body = {
    placa: payload.placa,
    descripcion: payload.descripcion ?? '',
    empresa_id: Number(payload.empresa_id ?? payload.empresaId),
    ruta_id: Number(payload.ruta_id ?? payload.rutaId),
    latitud: payload.latitud != null ? Number(payload.latitud) : undefined,
    longitud: payload.longitud != null ? Number(payload.longitud) : undefined,
    estado: payload.estado != null ? Boolean(payload.estado) : true,
    // Compatibilidad (si el backend acepta camelCase adicionalmente no hace daño)
    empresaId: Number(payload.empresa_id ?? payload.empresaId),
    rutaId: Number(payload.ruta_id ?? payload.rutaId),
  }
  const { data } = await api.post('/buses/crear', body)
  const it = data?.bus || data?.data || data
  const id_bus = it?.id_bus ?? it?.idBus ?? it?.id
  return { ...it, id_bus, id: id_bus }
}

// Actualizar bus
export async function updateBus(id, payload) {
  const body = {
    ...(payload.placa ? { placa: payload.placa } : {}),
    ...(payload.descripcion != null ? { descripcion: payload.descripcion } : {}),
    ...(payload.empresa_id != null || payload.empresaId != null
      ? { empresa_id: Number(payload.empresa_id ?? payload.empresaId), empresaId: Number(payload.empresa_id ?? payload.empresaId) }
      : {}),
    ...(payload.ruta_id != null || payload.rutaId != null
      ? { ruta_id: Number(payload.ruta_id ?? payload.rutaId), rutaId: Number(payload.ruta_id ?? payload.rutaId) }
      : {}),
    ...(payload.latitud != null ? { latitud: Number(payload.latitud) } : {}),
    ...(payload.longitud != null ? { longitud: Number(payload.longitud) } : {}),
    ...(payload.estado != null ? { estado: Boolean(payload.estado) } : {}),
  }
  const { data } = await api.put(`/buses/${id}`, body)
  const it = data?.bus || data?.data || data
  const id_bus = it?.id_bus ?? it?.idBus ?? it?.id
  return { ...it, id_bus, id: id_bus }
}

// Eliminar bus
export async function deleteBus(id) {
  const { data } = await api.delete(`/buses/${id}`)
  return data
}

// Activar / Desactivar
export async function activateBus(id) {
  const { data } = await api.put(`/buses/${id}/activar`)
  return data
}

export async function deactivateBus(id) {
  const { data } = await api.put(`/buses/${id}/desactivar`)
  return data
}

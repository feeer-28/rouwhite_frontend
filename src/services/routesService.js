import { api } from './apiClient'
import { getEmpresaIdFromToken } from './apiClient'

export async function listAllRoutes() {
  const eid = getEmpresaIdFromToken()
  const { data } = await api.get('/rutas/listar', {
    params: eid ? { empresaId: eid } : undefined,
  })
  const raw = Array.isArray(data)
    ? data
    : (Array.isArray(data?.data) ? data.data : (Array.isArray(data?.rutas) ? data.rutas : []))
  // Normalizar: id_ruta, id, nombre_ruta/nombre y empresa_id
  return raw.map((row) => {
    const it = row?.ruta || row
    const id_ruta = it.id_ruta ?? it.idRuta ?? it.id ?? it.uuid ?? it._id
    const empresa_id = it.empresa_id ?? it.empresaId ?? it.id_empresa
    const nombre_ruta = it.nombre_ruta ?? it.nombre ?? it.nombreRuta ?? it.name
    return { ...it, id_ruta, id: id_ruta, empresa_id, nombre_ruta }
  })
}

export async function showRoute(id) {
  const { data } = await api.get(`/rutas/${id}`)
  return data
}

export async function createRoute(payload) {
  // payload esperado: { nombre_ruta, empresa_id }
  const body = {
    nombre_ruta: payload.nombre_ruta ?? payload.nombre ?? payload.nombreRuta,
    empresa_id: payload.empresa_id ?? payload.empresaId,
  }
  const { data } = await api.post('/rutas/crear', body)
  // Devolver objeto normalizado con id
  const it = data?.ruta || data?.data || data
  const id_ruta = it?.id_ruta ?? it?.idRuta ?? it?.id ?? it?.uuid ?? it?._id
  const empresa_id = it?.empresa_id ?? it?.empresaId ?? it?.id_empresa ?? body.empresa_id
  const nombre_ruta = it?.nombre_ruta ?? it?.nombre ?? it?.nombreRuta ?? body.nombre_ruta
  return { ...it, id_ruta, id: id_ruta, empresa_id, nombre_ruta }
}

export async function updateRoute(id, payload) {
  const body = {
    ...(payload.nombre_ruta || payload.nombre ? { nombre_ruta: payload.nombre_ruta ?? payload.nombre } : {}),
    ...(payload.empresa_id ? { empresa_id: payload.empresa_id } : {}),
  }
  const { data } = await api.put(`/rutas/${id}`, body)
  return data
}

export async function deleteRoute(id) {
  const { data } = await api.delete(`/rutas/${id}`)
  return data
}

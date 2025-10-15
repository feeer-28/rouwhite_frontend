import { api } from './apiClient'

export async function rutasPorParadero(id) {
  if (id == null || id === '') throw new Error('id paradero requerido')
  const { data } = await api.get(`/paraderos/${id}/rutas`)
  // Normalizar a arreglo
  const arr = Array.isArray(data)
    ? data
    : (Array.isArray(data?.data) ? data.data : (Array.isArray(data?.rutas) ? data.rutas : []))
  return arr
}

export async function listParaderos(params = {}) {
  const { data } = await api.get('/paraderos/listar', { params })
  const raw = Array.isArray(data)
    ? data
    : (Array.isArray(data?.data)
        ? data.data
        : (Array.isArray(data?.paraderos)
            ? data.paraderos
            : (Array.isArray(data?.rows) ? data.rows : [])))
  const mapped = raw.map((row) => {
    const it = row?.paradero || row?.PARADERO || row
    const id_paradero = it.id_paradero ?? it.idParadero ?? it.id ?? it.uuid ?? it._id
    const nombre = it.nombre ?? it.nombre_paradero ?? it.name ?? `Paradero ${id_paradero ?? ''}`
    const latitud = it.latitud ?? it.lat ?? it.latitude ?? null
    const longitud = it.longitud ?? it.lng ?? it.long ?? it.longitude ?? null
    const barrio_id = it.barrio_id ?? it.barrioId ?? (row?.barrioId) ?? null
    const barrio = it.barrio ?? row?.barrio ?? null
    return { id_paradero, nombre, latitud, longitud, barrio_id, barrio, __raw: row, id: id_paradero }
  })
  // Si viene paginado, devolver mapeado y meta para quien lo necesite
  const meta = data?.meta || null
  return mapped.length && meta ? { items: mapped, meta } : mapped
}

export async function fetchAllParaderos() {
  // Recorre todas las páginas si la API es paginada
  const first = await listParaderos({ page: 1 })
  if (Array.isArray(first)) return first
  const items = [...first.items]
  const meta = first.meta
  const lastPage = Number(meta?.lastPage ?? 1)
  const seen = new Set(items.map((x) => x.id_paradero))
  for (let page = 2; page <= lastPage; page++) {
    const resp = await listParaderos({ page })
    const arr = Array.isArray(resp) ? resp : resp.items
    for (const it of arr) {
      if (seen.has(it.id_paradero)) continue
      seen.add(it.id_paradero)
      items.push(it)
    }
  }
  return items
}

export async function showParadero(id) {
  const { data } = await api.get(`/paraderos/${id}`)
  return data
}

export async function createParadero(payload) {
  // payload: { nombre, latitud, longitud, direccion?, barrio_id? }
  const body = {
    nombre: payload.nombre,
    latitud: payload.latitud,
    longitud: payload.longitud,
    direccion: payload.direccion,
    barrio_id: payload.barrio_id,
  }
  const { data } = await api.post('/paraderos/crear', body)
  return data
}

export async function updateParadero(id, payload) {
  const body = {
    ...(payload.nombre ? { nombre: payload.nombre } : {}),
    ...(payload.latitud != null ? { latitud: payload.latitud } : {}),
    ...(payload.longitud != null ? { longitud: payload.longitud } : {}),
    ...(payload.direccion != null ? { direccion: payload.direccion } : {}),
    ...(payload.barrio_id != null ? { barrio_id: payload.barrio_id } : {}),
  }
  const { data } = await api.put(`/paraderos/${id}`, body)
  return data
}

export async function deleteParadero(id) {
  const { data } = await api.delete(`/paraderos/${id}`)
  return data
}

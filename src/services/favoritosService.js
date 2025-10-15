import { api, getUserIdFromToken } from './apiClient'

// Listar favoritos del usuario autenticado
export async function listFavoritos() {
  let data
  try {
    const usuarioId = getUserIdFromToken()
    const res = await api.get('/favoritos/listar', { params: usuarioId ? { usuarioId } : {}, __skipAuthRedirect: true })
    data = res.data
  } catch (e) {
    const status = e?.response?.status
    if (status === 401 || status === 403) return []
    throw e
  }
  const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : (Array.isArray(data?.rows) ? data.rows : (Array.isArray(data?.items) ? data.items : [])))
  return arr.map((row) => {
    const it = row?.favorito || row
    const id_favorito = it.id_favorito ?? it.idFavorito ?? it.id
    const ruta_id = it.ruta_id ?? it.rutaId
    return { ...it, id: id_favorito, id_favorito, ruta_id }
  })
}

// Crear favorito: { rutaId }
export async function createFavorito(payload) {
  const usuarioId = getUserIdFromToken()
  const rutaId = Number(payload.rutaId ?? payload.ruta_id)
  const body = { usuarioId, rutaId }
  try {
    const { data } = await api.post('/favoritos/crear', body, { __skipAuthRedirect: true })
    const it = data?.favorito || data?.data || data
    const id_favorito = it?.id_favorito ?? it?.idFavorito ?? it?.id
    const ruta_id = it?.ruta_id ?? it?.rutaId ?? rutaId
    return { ...it, id: id_favorito, id_favorito, ruta_id }
  } catch (e) {
    const status = e?.response?.status
    if (status === 401 || status === 403) return null
    if (status === 409) {
      // Ya existe: devolver marcador para que la UI lo considere como favorito
      return { id: null, id_favorito: null, ruta_id: rutaId, _exists: true }
    }
    throw e
  }
}

export async function deleteFavorito(id) {
  try {
    const usuarioId = getUserIdFromToken()
    const { data } = await api.delete(`/favoritos/${id}`, { data: usuarioId ? { usuarioId } : undefined, __skipAuthRedirect: true })
    return data
  } catch (e) {
    const status = e?.response?.status
    if (status === 401 || status === 403) return null
    throw e
  }
}

import { api } from './apiClient'

// Lista pivotes; si el backend permite filtros por query, se pueden enviar params
export async function listRutaParaderos(params = {}) {
  // Evitar enviar params porque el backend responde 500 con querystrings
  const { data } = await api.get('/ruta-paraderos/listar')
  let result = []
  if (Array.isArray(data)) {
    result = data
  } else if (data && (Array.isArray(data?.data) || Array.isArray(data?.rows))) {
    result = Array.isArray(data.data) ? data.data : data.rows
  } else if (data && (Array.isArray(data?.ida) || Array.isArray(data?.retorno))) {
    // Backend devuelve { ida: [...], retorno: [...] }
    const ida = (data.ida || []).map((it) => ({ ...it, tipo: it.tipo ?? 'ida' }))
    const retorno = (data.retorno || []).map((it) => ({ ...it, tipo: it.tipo ?? 'retorno' }))
    result = [...ida, ...retorno]
  } else if (data?.rutaParaderos) {
    result = Array.isArray(data.rutaParaderos) ? data.rutaParaderos : []
  } else {
    result = []
  }

  const normalized = result.map((row) => {
    const it = row?.ruta_paradero || row
    return {
      id_ruta_paradero: it.id_ruta_paradero ?? it.idRutaParadero ?? it.id,
      ruta_id: it.ruta_id ?? it.rutaId,
      paradero_id: it.paradero_id ?? it.paraderoId,
      orden: it.orden ?? 0,
      tipo: it.tipo ?? it.tipo_ruta ?? 'ida',
      __raw: row,
    }
  })

  const rid = params.rutaId ?? params.ruta_id
  if (rid != null) {
    return normalized.filter((p) => String(p.ruta_id) === String(rid))
  }
  return normalized
}

export async function createRutaParadero(payload) {
  // payload: { ruta_id, paradero_id, orden, tipo }
  // El backend espera camelCase: rutaId, paraderoId, orden, tipo
  const body = {
    rutaId: payload.ruta_id ?? payload.rutaId,
    paraderoId: payload.paradero_id ?? payload.paraderoId,
    orden: payload.orden,
    tipo: payload.tipo,
  }
  const { data } = await api.post('/ruta-paraderos/crear', body)
  return data
}

export async function updateRutaParadero(id, payload) {
  const body = {
    ...(payload.ruta_id != null || payload.rutaId != null ? { rutaId: payload.ruta_id ?? payload.rutaId } : {}),
    ...(payload.paradero_id != null || payload.paraderoId != null ? { paraderoId: payload.paradero_id ?? payload.paraderoId } : {}),
    ...(payload.orden != null ? { orden: payload.orden } : {}),
    ...(payload.tipo ? { tipo: payload.tipo } : {}),
  }
  const { data } = await api.put(`/ruta-paraderos/${id}`, body)
  return data
}

export async function deleteRutaParadero(id) {
  const { data } = await api.delete(`/ruta-paraderos/${id}`)
  return data
}

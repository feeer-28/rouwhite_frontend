import { api } from './apiClient'

export async function listCompanies() {
  let data
  try {
    const res = await api.get('/empresas/listar', { __skipAuthRedirect: true })
    data = res.data
  } catch (e) {
    const status = e?.response?.status
    if (status === 401 || status === 403) return []
    throw e
  }
  const raw = Array.isArray(data)
    ? data
    : (Array.isArray(data?.data)
        ? data.data
        : (Array.isArray(data?.empresas)
            ? data.empresas
            : (Array.isArray(data?.empresas?.rows)
                ? data.empresas.rows
                : [])))
  // Normalizar a un shape consistente para la UI
  const normalized = raw.map((row) => {
    // admitir formas anidadas
    const it = row?.empresa || row?.EMPRESA || row
    const id_empresa = it.id_empresa ?? it.idEmpresa ?? it.id ?? it.uuid ?? it._id
    const nombre_empresa = it.nombre_empresa ?? it.nombreEmpresa ?? it.nombre ?? it.razon_social ?? it.razonSocial
    return {
      id_empresa,
      nombre_empresa,
      email: it.email ?? it.correo ?? it.contactoEmail ?? null,
      direccion: it.direccion ?? it.direccion_empresa ?? it.address ?? null,
      telefono: it.telefono ?? it.tel ?? it.phone ?? null,
      activa: it.activa ?? it.estado ?? it.enabled ?? it.isActive ?? true,
      __raw: row,
      id: id_empresa,
      nombre: nombre_empresa || null,
    }
  })
  return normalized
}

export async function getCompany(id) {
  const { data } = await api.get(`/empresas/${id}`)
  return data
}

export async function createCompany(payload) {
  // Algunos backends esperan "nombre" aunque el esquema DB sea nombre_empresa
  const body = {
    nombre: payload.nombre_empresa ?? payload.nombre,
    nombre_empresa: payload.nombre_empresa ?? payload.nombre,
    email: payload.email,
    direccion: payload.direccion,
    telefono: payload.telefono,
  }
  const { data } = await api.post('/empresas/crear', body)
  return data
}

export async function updateCompany(id, payload) {
  const body = {
    nombre: payload.nombre_empresa ?? payload.nombre,
    nombre_empresa: payload.nombre_empresa ?? payload.nombre,
    email: payload.email,
    direccion: payload.direccion,
    telefono: payload.telefono,
  }
  const { data } = await api.put(`/empresas/${id}`, body)
  return data
}

export async function deleteCompany(id) {
  const { data } = await api.delete(`/empresas/${id}`)
  return data
}

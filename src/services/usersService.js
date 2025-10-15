import { api } from './apiClient'
import { getEmpresaIdFromToken } from './apiClient'

function extractArray(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.rows)) return data.rows
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.usuarios)) return data.usuarios
  if (Array.isArray(data?.users)) return data.users
  if (Array.isArray(data?.result)) return data.result
  if (Array.isArray(data?.data?.users)) return data.data.users
  if (Array.isArray(data?.data?.usuarios)) return data.data.usuarios
  return []
}

export async function listUsers() {
  const eid = getEmpresaIdFromToken()
  const { data } = await api.get('/users/listar', {
    params: eid ? { empresaId: eid } : undefined,
    __skipAuthRedirect: true,
  })
  const raw = extractArray(data)
  // Normalizar usuarios a un shape consistente
  const normalized = raw.map((row) => {
    const it = row?.usuario || row?.USER || row
    const id_usuario = it.id_usuario ?? it.idUsuario ?? it.id ?? it.uuid ?? it._id
    const nombre = it.nombre ?? it.nombres ?? it.first_name ?? it.firstName ?? ''
    const apellido = it.apellido ?? it.apellidos ?? it.last_name ?? it.lastName ?? ''
    const email = it.email ?? it.correo ?? null
    const identificacion = it.identificacion ?? it.documento ?? it.doc ?? null
    const rol_id = it.rol_id ?? it.rolId ?? it.role_id ?? null
    const empresa_id = it.empresa_id ?? it.empresaId ?? null
    const activo = it.activo ?? it.estado ?? it.enabled ?? it.isActive ?? true
    return {
      id_usuario,
      nombre,
      apellido,
      email,
      identificacion,
      rol_id,
      empresa_id,
      activo,
      // aliases para la UI
      id: id_usuario,
      role: it.role ?? it.rol ?? null,
      __raw: row,
    }
  })
  return normalized
}

// Listado global sin filtro por empresa (para métricas admin)
export async function listUsersAll() {
  try {
    const { data } = await api.get('/users/listar', { __skipAuthRedirect: true })
    const arr = extractArray(data)
    if (arr.length) return arr
  } catch {}
  // Fallback alternativo
  const { data: data2 } = await api.get('/usuarios/listar', { __skipAuthRedirect: true }).catch(() => ({ data: [] }))
  return extractArray(data2)
}

// Igual que listUsers(), pero sin filtro por empresa y devolviendo NORMALIZADO
export async function listUsersAdmin() {
  let raw = []
  try {
    const { data } = await api.get('/users/listar', { __skipAuthRedirect: true })
    raw = extractArray(data)
  } catch {}
  if (!raw.length) {
    const { data: data2 } = await api.get('/usuarios/listar', { __skipAuthRedirect: true }).catch(() => ({ data: [] }))
    raw = extractArray(data2)
  }
  const normalized = raw.map((row) => {
    const it = row?.usuario || row?.USER || row
    const id_usuario = it.id_usuario ?? it.idUsuario ?? it.id ?? it.uuid ?? it._id
    const nombre = it.nombre ?? it.nombres ?? it.first_name ?? it.firstName ?? ''
    const apellido = it.apellido ?? it.apellidos ?? it.last_name ?? it.lastName ?? ''
    const email = it.email ?? it.correo ?? null
    const identificacion = it.identificacion ?? it.documento ?? it.doc ?? null
    const rol_id = it.rol_id ?? it.rolId ?? it.role_id ?? null
    const empresa_id = it.empresa_id ?? it.empresaId ?? null
    const activo = it.activo ?? it.estado ?? it.enabled ?? it.isActive ?? true
    const role = it.role ?? it.rol ?? null
    return { id_usuario, nombre, apellido, email, identificacion, rol_id, empresa_id, activo, id: id_usuario, role, __raw: row }
  })
  return normalized
}

export async function getUser(id) {
  const { data } = await api.get(`/users/${id}`)
  return data
}

export async function createUser(payload) {
  const { data } = await api.post('/users/crear', payload)
  return data
}

export async function updateUser(id, payload) {
  const { data } = await api.put(`/users/${id}`, payload)
  return data
}

export async function deactivateUser(id) {
  const { data } = await api.delete(`/users/${id}`)
  return data
}

// Activar usuario (soft-activate) mediante update
export async function activateUser(id) {
  const { data } = await api.put(`/users/${id}/activar`)
  return data
}

// Desactivar usuario (soft-deactivate) mediante update
export async function softDeactivateUser(id) {
  const { data } = await api.put(`/users/${id}`, { activo: false })
  return data
}

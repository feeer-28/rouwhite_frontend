import { api } from './apiClient'

// Lista de empresas públicas para selects
export async function listEmpresas(params = {}) {
  const { data } = await api.get('/empresas/listar', { params, __skipAuthRedirect: true })
  const arr = Array.isArray(data)
    ? data
    : (Array.isArray(data?.data) ? data.data : (Array.isArray(data?.rows) ? data.rows : (Array.isArray(data?.items) ? data.items : [])))
  return arr.map((row) => {
    const it = row?.empresa || row
    const id_empresa = it.id_empresa ?? it.idEmpresa ?? it.id
    const nombre = it.nombre ?? it.nombre_empresa ?? it.razon_social ?? `Empresa ${id_empresa ?? ''}`
    return { ...it, id_empresa, nombre, id: id_empresa }
  })
}

import { api } from './apiClient'

export async function rutasPorBarrio(id) {
  if (id == null || id === '') throw new Error('id barrio requerido')
  const { data } = await api.get(`/barrios/${id}/rutas`)
  const arr = Array.isArray(data)
    ? data
    : (Array.isArray(data?.data) ? data.data : (Array.isArray(data?.rutas) ? data.rutas : []))
  return arr
}

export async function listBarrios(params = {}) {
  const { data } = await api.get('/barrios/listar', { params })
  const raw = Array.isArray(data)
    ? data
    : (Array.isArray(data?.data)
        ? data.data
        : (Array.isArray(data?.barrios)
            ? data.barrios
            : (Array.isArray(data?.rows) ? data.rows : [])))
  const mapped = raw.map((row) => {
    const it = row?.barrio || row?.BARRIO || row
    const id_barrio = it.id_barrio ?? it.idBarrio ?? it.id ?? it.uuid ?? it._id
    const nombre = it.nombre ?? it.nombre_barrio ?? it.name ?? `Barrio ${id_barrio ?? ''}`
    return { id_barrio, nombre, __raw: row, id: id_barrio }
  })
  const meta = data?.meta || null
  return mapped.length && meta ? { items: mapped, meta } : mapped
}

export async function fetchAllBarrios() {
  const first = await listBarrios({ page: 1 })
  if (Array.isArray(first)) return first
  const items = [...first.items]
  const meta = first.meta
  const lastPage = Number(meta?.lastPage ?? 1)
  const seen = new Set(items.map((x) => x.id_barrio))
  for (let page = 2; page <= lastPage; page++) {
    const resp = await listBarrios({ page })
    const arr = Array.isArray(resp) ? resp : resp.items
    for (const it of arr) {
      if (seen.has(it.id_barrio)) continue
      seen.add(it.id_barrio)
      items.push(it)
    }
  }
  return items
}

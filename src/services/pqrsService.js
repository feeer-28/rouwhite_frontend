import { api } from './apiClient'
import { getEmpresaIdFromToken } from './apiClient'
import { getUserIdFromToken } from './apiClient'

export async function listPqrs(params = {}) {
  const eid = getEmpresaIdFromToken()
  const query = { ...(eid ? { empresaId: eid } : {}), ...(params || {}) }
  const { data } = await api.get('/pqrs/listar', { params: query })
  const raw = Array.isArray(data)
    ? data
    : (Array.isArray(data?.data) ? data.data : (Array.isArray(data?.rows) ? data.rows : (Array.isArray(data?.pqrs) ? data.pqrs : [])))
  return raw.map((row) => {
    const it = row?.pqrs || row
    const id_pqrs = it.id_pqrs ?? it.idPqrs ?? it.id ?? it._id
    const empresa_id = it.empresa_id ?? it.empresaId
    const tipo = it.tipo ?? it.category ?? 'PQRS'
    const asunto = it.asunto ?? it.titulo ?? it.subject ?? ''
    const descripcion = it.mensaje ?? it.descripcion ?? it.detalle ?? it.description ?? ''
    const estado = it.estado ?? it.status ?? 'abierto'
    const creado_en = it.fecha_creacion ?? it.creado_en ?? it.created_at ?? it.fecha ?? null
    const usuario = it.usuario ?? it.user ?? null
    return { ...it, id_pqrs, id: id_pqrs, empresa_id, tipo, asunto, descripcion, estado, creado_en, usuario }
  })
}

export async function showPqrs(id) {
  const { data } = await api.get(`/pqrs/${id}`)
  const it = data?.pqrs || data?.data || data
  const id_pqrs = it?.id_pqrs ?? it?.idPqrs ?? it?.id
  // Normalizar detalle con mismo mapeo
  const empresa_id = it?.empresa_id ?? it?.empresaId
  const tipo = it?.tipo ?? it?.category ?? 'PQRS'
  const asunto = it?.asunto ?? it?.titulo ?? it?.subject ?? ''
  const descripcion = it?.mensaje ?? it?.descripcion ?? it?.detalle ?? it?.description ?? ''
  const estado = it?.estado ?? it?.status ?? 'abierto'
  const creado_en = it?.fecha_creacion ?? it?.creado_en ?? it?.created_at ?? it?.fecha ?? null
  const usuario = it?.usuario ?? it?.user ?? null
  return { ...it, id: id_pqrs, id_pqrs, empresa_id, tipo, asunto, descripcion, estado, creado_en, usuario }
}

// Crear PQRS autenticado: { asunto, mensaje, tipo?, referencia? }
export async function createPqrs(payload) {
  const eid = payload.empresaId ?? payload.empresa_id ?? getEmpresaIdFromToken()
  const uid = payload.usuarioId ?? payload.usuario_id ?? getUserIdFromToken()
  const body = {
    asunto: payload.asunto,
    mensaje: payload.mensaje,
    ...(payload.tipo ? { tipo: payload.tipo } : {}),
    ...(payload.referencia ? { referencia: payload.referencia } : {}),
    ...(eid ? { empresaId: Number(eid) } : {}),
    ...(uid ? { usuarioId: Number(uid) } : {}),
  }
  try {
    const { data } = await api.post('/pqrs/crear', body)
    const it = data?.pqrs || data?.data || data
    const id_pqrs = it?.id_pqrs ?? it?.idPqrs ?? it?.id
    return { ...it, id: id_pqrs, id_pqrs }
  } catch (e) {
    // Mejora de depuración: exponer mensaje del backend si existe
    if (typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.error('[pqrsService.createPqrs] error:', {
        status: e?.response?.status,
        data: e?.response?.data,
      })
    }
    const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Error creando PQRS'
    throw new Error(msg)
  }
}

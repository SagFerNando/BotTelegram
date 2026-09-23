const supabase = require("./supabase");

async function crearPago({
  suscripcion_id = null,
  tipo_pago,
  monto,
  comprobante_file_id = null,
}) {
  const { data, error } = await supabase
    .from("pagos")
    .insert({
      suscripcion_id,
      tipo_pago,
      monto,
      comprobante_file_id,
      estado: "pendiente",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function obtenerPagoPorId(pagoId) {
  const { data, error } = await supabase
    .from("pagos")
    .select("*")
    .eq("id", pagoId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}
// Obtener pagos de un usuario filtrando por estado
async function obtenerPagosPorUsuario(usuarioId, estado = null) {
  const { data: suscripciones, error: errorSuscripciones } = await supabase
    .from("suscripciones")
    .select("id")
    .eq("usuario_id", usuarioId);

  if (errorSuscripciones) throw errorSuscripciones;

  if (!suscripciones || suscripciones.length === 0) {
    return [];
  }

  const suscripcionIds = suscripciones.map((suscripcion) => suscripcion.id);

  let query = supabase
    .from("pagos")
    .select("*")
    .in("suscripcion_id", suscripcionIds)
    .order("created_at", { ascending: false });

  if (estado) {
    query = query.eq("estado", estado);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data;
}

async function obtenerPagosPorSuscripcion(suscripcionId, estado = null) {
  let query = supabase
    .from("pagos")
    .select("*")
    .eq("suscripcion_id", suscripcionId)
    .order("created_at", { ascending: false });

  if (estado) {
    query = query.eq("estado", estado);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data;
}

async function actualizarPago(pagoId, campo, valor) {
  const { data, error } = await supabase
    .from("pagos")
    .update({
      [campo]: valor,
    })
    .eq("id", pagoId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

async function obtenerPagosPendientes() {
  const { data, error } = await supabase
    .from("pagos")
    .select("*")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

async function actualizarEstadoPago(pagoId, estado) {
  const { data, error } = await supabase
    .from("pagos")
    .update({
      estado,
    })
    .eq("id", pagoId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function asociarPagoASuscripcion(pagoId, suscripcionId) {
  const { data, error } = await supabase
    .from("pagos")
    .update({
      suscripcion_id: suscripcionId,
    })
    .eq("id", pagoId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function obtenerPagoPendientePorSuscripcion(suscripcionId) {
  const { data, error } = await supabase
    .from("pagos")
    .select("*")
    .eq("suscripcion_id", suscripcionId)
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

module.exports = {
  crearPago,
  obtenerPagoPorId,
  actualizarPago,
  obtenerPagosPorUsuario,
  obtenerPagosPorSuscripcion,

  obtenerPagosPendientes,
  obtenerPagoPendientePorSuscripcion,
  actualizarEstadoPago,
  asociarPagoASuscripcion,
};

const supabase = require("./supabase");

async function obtenerSuscripcionActiva(usuarioId) {
  const { data, error } = await supabase
    .from("suscripciones")
    .select("*")
    .eq("usuario_id", usuarioId)
    .eq("estado", "activa")
    .gt("fecha_vencimiento", new Date().toISOString())
    .order("fecha_vencimiento", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
async function obtenerSuscripcionPorId(Id) {
  const { data, error } = await supabase
    .from("pagos")
    .select("*")
    .eq("id", Id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function obtenerUltimaSuscripcion(usuarioId) {
  const { data, error } = await supabase
    .from("suscripciones")
    .select("*")
    .eq("usuario_id", usuarioId)
    .order("fecha_vencimiento", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function crearSuscripcion({
  usuario_id,
  fecha_inicio,
  fecha_vencimiento,
  estado = "pendiente",
}) {
  const { data, error } = await supabase
    .from("suscripciones")
    .insert({
      usuario_id,
      fecha_inicio,
      fecha_vencimiento,
      estado,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function actualizarFechaVencimiento(
  suscripcionId,
  nuevaFechaVencimiento,
) {
  const { data, error } = await supabase
    .from("suscripciones")
    .update({
      fecha_vencimiento: nuevaFechaVencimiento,
      estado: "activa",
    })
    .eq("id", suscripcionId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function actualizarEstadoSuscripcion(suscripcionId, estado) {
  const { data, error } = await supabase
    .from("suscripciones")
    .update({
      estado,
    })
    .eq("id", suscripcionId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function marcarSuscripcionVencida(suscripcionId) {
  return actualizarEstadoSuscripcion(suscripcionId, "vencida");
}

async function obtenerSuscripcionPendiente(usuarioId) {
  const { data, error } = await supabase
    .from("suscripciones")
    .select("*")
    .eq("usuario_id", usuarioId)
    .eq("estado", "pendiente")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}
module.exports = {
  crearSuscripcion,
  obtenerSuscripcionPorId,
  obtenerSuscripcionActiva,
  obtenerUltimaSuscripcion,

  obtenerSuscripcionPendiente,
  actualizarFechaVencimiento,
  actualizarEstadoSuscripcion,
  marcarSuscripcionVencida,
};

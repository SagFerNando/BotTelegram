const supabase = require("./supabase");

async function crearSuscripcion({
  usuario_id,
  fecha_inicio,
  fecha_vencimiento,
  estado = "pendiente",
  recordatorio_enviado = "false",
}) {
  const { data, error } = await supabase
    .from("suscripciones")
    .insert({
      usuario_id,
      fecha_inicio,
      fecha_vencimiento,
      estado,
      recordatorio_enviado,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
async function obtenerSuscripcion(usuarioId, campo, valor) {
  const { data, error } = await supabase
    .from("suscripciones")
    .select("*")
    .eq("usuario_id", usuarioId)
    .eq(campo, valor)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function obtenerSuscripciones(campo, valor) {
  const { data, error } = await supabase
    .from("suscripciones")
    .select("*")
    .eq(campo, valor)
    .gt("fecha_vencimiento", new Date().toISOString())
    .order("fecha_vencimiento", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}
async function obtenerSuscripcionPorId(Id) {
  const { data, error } = await supabase
    .from("suscripciones")
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

async function actualizarSuscripcion(Id, campo, valor) {
  const { data, error } = await supabase
    .from("suscripciones")
    .update({
      [campo]: valor,
    })
    .eq("id", Id)
    .select()
    .single();

  if (error) throw error;

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

async function obtenerSuscripcionesActivasSinRecordatorio() {
  const { data, error } = await supabase
    .from("suscripciones")
    .select("*")
    .eq("estado", "activa")
    .eq("recordatorio_enviado", false) // aquí mejor usar booleano si la columna es booleana
    .gt("fecha_vencimiento", new Date().toISOString())
    .order("fecha_vencimiento", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

async function marcarSuscripcionVencida(suscripcionId) {
  return actualizarEstadoSuscripcion(suscripcionId, "vencida");
}

async function obtenerSuscripcionesPorVencer(inicio, fin) {
  const { data, error } = await supabase
    .from("suscripciones")
    .select(
      `
            id,
            fecha_vencimiento,
            estado,
            recordatorio_enviado,
            usuario_id,
            usuarios (
                id,
                telegram_id,
                nombre
            )
        `,
    )
    .eq("estado", "activa")
    .or(
      "recordatorio_enviado.is.null,recordatorio_enviado.eq.false,recordatorio_enviado.eq.false",
    )
    .gte("fecha_vencimiento", inicio.toISOString())
    .lte("fecha_vencimiento", fin.toISOString());

  if (error) {
    console.error("Error al consultar Supabase:", error);
    throw error;
  }

  // Aplanar o mapear la estructura para adaptar la respuesta
  return data.map((item) => ({
    suscripcion_id: item.id,
    fecha_vencimiento: item.fecha_vencimiento,
    usuario_id: item.usuarios?.id,
    telegram_id: item.usuarios?.telegram_id,
    usuario_nombre: item.usuarios?.nombre,
  }));
}

module.exports = {
  crearSuscripcion,
  obtenerSuscripcionPorId,
  obtenerSuscripciones,
  obtenerUltimaSuscripcion,
  obtenerSuscripcionesActivasSinRecordatorio,
  actualizarSuscripcion,

  obtenerSuscripcionesPorVencer,

  obtenerSuscripcion,
  actualizarFechaVencimiento,
  marcarSuscripcionVencida,
};

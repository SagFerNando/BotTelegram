const supabase = require("./supabase");

async function obtenerUsuarioPorTelegramId(telegramId) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function crearUsuario(usuario) {
  const { data, error } = await supabase
    .from("usuarios")
    .insert({
      telegram_id: usuario.telegram_id,
      username: usuario.username,
      nombre: usuario.nombre,
      estado: usuario.estado || "activo",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function crear_ObtenerUsuario(usuario) {
  const existente = await obtenerUsuarioPorTelegramId(usuario.telegram_id);

  if (existente) {
    return existente;
  }

  return await crearUsuario(usuario);
}
async function obtenerUsuarioPorSuscripcionId(suscripcionId) {
  const { data, error } = await supabase
    .from("suscripciones")
    .select(
      `id,
      usuario_id,
      usuarios (
          id,
          telegram_id,
          nombre
        )

      `,
    )
    .eq("id", suscripcionId)
    .single();

  if (error) {
    // PGRST116 indica que no se encontró una fila
    // o que la consulta no devolvió una única fila.
    if (error.code === "PGRST116") {
      return null;
    }

    console.error("Error al consultar usuario por suscripción:", error);
    throw error;
  }

  if (!data.usuarios) {
    return null;
  }
  return {
    suscripcion_id: data.id,
    usuario_id: data.usuarios.id,
    telegram_id: data.usuarios.telegram_id,
    usuario_nombre: data.usuarios.nombre,
  };
}

module.exports = {
  obtenerUsuarioPorTelegramId,
  crearUsuario,
  crear_ObtenerUsuario,
  obtenerUsuarioPorSuscripcionId,
};

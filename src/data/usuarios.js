const supabase = require("./supabase");

const usuariosPendientes = {};

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

module.exports = {
  obtenerUsuarioPorTelegramId,
  crearUsuario,
  crear_ObtenerUsuario,
};

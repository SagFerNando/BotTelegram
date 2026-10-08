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
  const query = `
        SELECT 
            u.id,
            u.nombre,
            u.telegram_id AS telegramId
        FROM usuarios u
        INNER JOIN suscripciones s ON u.id = s.id_user
        WHERE s.id = $1;
    `;

  const resultado = await db.query(query, [suscripcionId]);

  // Retornamos el primer usuario encontrado o null si no existe
  return resultado.rows[0] || null;
}

module.exports = {
  obtenerUsuarioPorTelegramId,
  crearUsuario,
  crear_ObtenerUsuario,
  obtenerUsuarioPorSuscripcionId,
};

const axios = require("axios");
const CONFIG = require("../config/config");

/* ==================================================
   GENERAR ENLACE DE INVITACIÓN
================================================== */

async function generarEnlaceInvitacion() {
  const expireDate = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/createChatInviteLink`,
      {
        chat_id: CONFIG.PREMIUM_CHANNEL_ID,
        name: "Acceso Premium",
        expire_date: expireDate,
        member_limit: 1,
      },
    );

    return response.data.result.invite_link;
  } catch (error) {
    console.log("===== ERROR TELEGRAM API =====");

    console.log(error.response?.data || error);

    return null;
  }
}

/* ==================================================
   VERIFICAR SI UN USUARIO ESTÁ EN EL CANAL
================================================== */

async function verificarUsuarioEnCanal(userId) {
  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/getChatMember`,
      {
        chat_id: CONFIG.PREMIUM_CHANNEL_ID,
        user_id: userId,
      },
    );

    const status = response.data.result.status;

    console.log(`Usuario ${userId} - Estado en canal: ${status}`);

    return ["creator", "administrator", "member", "restricted"].includes(
      status,
    );
  } catch (error) {
    console.log("===== ERROR VERIFICANDO USUARIO =====");

    console.log(error.response?.data || error);

    return false;
  }
}

/* ==================================================
   ELIMINAR USUARIO DEL CANAL
================================================== */

async function eliminarUsuarioDelCanal(userId) {
  try {
    if (Number(userId) === Number(CONFIG.ADMIN_ID)) {
      return {
        eliminado: false,
        userId,
        mensaje:
          "No se puede eliminar ya que el usuario es administrador del canal.",
      };
    }

    const response = await axios.post(
      `https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/banChatMember`,
      {
        chat_id: CONFIG.PREMIUM_CHANNEL_ID,
        user_id: userId,
      },
    );

    if (response.data?.ok && response.data.result === true) {
      console.log(`Usuario ${userId} eliminado del canal.`);

      return {
        eliminado: true,
        userId,
        mensaje: "Usuario eliminado correctamente del canal.",
      };
    }

    return {
      eliminado: false,
      userId,
      mensaje: "Telegram no confirmó la eliminación del usuario.",
    };
  } catch (error) {
    console.error("===== ERROR ELIMINANDO USUARIO =====");
    console.error(error.response?.data || error.message || error);

    return {
      eliminado: false,
      userId,
      mensaje:
        error.response?.data?.description ||
        error.message ||
        "Ocurrió un error al eliminar al usuario.",
    };
  }
}

/* ==================================================
   EXPORTAR FUNCIONES
================================================== */

module.exports = {
  generarEnlaceInvitacion,
  verificarUsuarioEnCanal,
  eliminarUsuarioDelCanal,
};

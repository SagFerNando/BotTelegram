const TeleBot = require("telebot");
const CONSTANTS = require("./constants");
const axios = require("axios");

const bot = new TeleBot({
  token: CONSTANTS.TELEGRAM_TOKEN,
});

const usuariosPendientes = {};

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

//generar enlace de invitacion/////////

async function generarEnlaceInvitacion() {
  const expireDate = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${CONSTANTS.TELEGRAM_TOKEN}/createChatInviteLink`,
      {
        chat_id: CONSTANTS.PREMIUM_CHANNEL_ID,
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
   START
================================================== */

bot.on("/start", (msg) => {
  const userId = msg.from.id;

  usuariosPendientes[userId] = {
    status: "inicio",
  };

  return bot.sendMessage(
    msg.chat.id,
    `👋 ¡Hola! Bienvenido al Chat de acceso a mi canal premium.

En este espacio encontrarás toda la información para que puedas acceder a mi contenido exclusivo 🔞🔥

Puedes elegir una opción para continuar:`,
    {
      replyMarkup: {
        inline_keyboard: [
          [
            {
              text: "📘 Detalles del canal 🔞",
              callback_data: "info",
            },
          ],
          [
            {
              text: "💳 Enviar comprobante de pago 📸",
              callback_data: "pago",
            },
          ],
          [
            {
              text: "❌ Cancelar",
              callback_data: "cancelar",
            },
          ],
        ],
      },
    },
  );
});

/* ==================================================
   CALLBACKS
================================================== */

bot.on("callbackQuery", async (msg) => {
  const userId = msg.from.id;
  const opcion = msg.data;

  if (!usuariosPendientes[userId]) {
    usuariosPendientes[userId] = {};
  }

  /* ---------------- INFO ---------------- */

  if (opcion === "info") {
    usuariosPendientes[userId].status = "viendo_info";

    return bot.sendMessage(
      msg.message.chat.id,
      `📘 Detalles del canal 🔞

🔸 El canal ofrece contenido exclusivo para suscriptores.

🔸 En el canal encontrarás mucho contenido, sin censura,🔥 exclusivo⭐ y completo😏

🔸 Fotos y videos 📹

🔸 Colaboraciones  🔞

🔸 La suscripción tiene un costo de acceso mensual por solo $150.00 MXN (PESOS) o $9.00 USD (DOLARES).

🔸 Para obtener acceso, debes enviar una captura de pantalla de la transferencia o de tu comprobante de pago.

🔸 Tu suscripción me ayuda a seguir creciendo como creador de contenido.

¿Deseas continuar al proceso de pago o cancelar?`,
      {
        replyMarkup: {
          inline_keyboard: [
            [
              {
                text: "💳 Continuar al pago",
                callback_data: "pago",
              },
            ],
            [
              {
                text: "❌ Cancelar",
                callback_data: "cancelar",
              },
            ],
          ],
        },
      },
    );
  }

  /* ---------------- PAGO ---------------- */

  if (opcion === "pago") {
    usuariosPendientes[userId].status = "esperando_comprobante";

    await bot.sendMessage(
      msg.message.chat.id,
      `¡Genial! 🥵

Para unirte es muy sencillo:`,
    );
    await sleep(1800);

    await bot.sendMessage(
      msg.message.chat.id,
      `1️⃣ Realiza tu pago o transferencia 💳

2️⃣ Envía una captura o foto del comprobante de pago 📸

3️⃣ ¡Listo! ⭐ Una vez enviado, el administrador verificará tu pago y te dará acceso ℹ️`,
    );
    await sleep(1500);
    await bot.sendMessage(
      msg.message.chat.id,
      `💸 Costo: $150.00 MXN (pesos mexicanos) o $9.00 USD (dolares estadounidenses) por 30 días.`,
    );
    await sleep(1800);
    await bot.sendMessage(
      msg.message.chat.id,
      `🪙 Número de tarjeta (BBVA):

4815 1630 4314 5997

Titular: Fernando Santiago`,
    );
    await sleep(1800);

    await bot.sendMessage(
      msg.message.chat.id,
      `💲 También puedes pagar por PayPal:

https://paypal.me/SagNando`,
    );
    await sleep(1000);
    return bot.sendMessage(
      msg.message.chat.id,
      `💟 ENVIA TU COMPROBANTE! 📲

Si no deseas continuar o suscribirte, puedes cancelar en cualquier momento.`,
      {
        replyMarkup: {
          inline_keyboard: [
            [
              {
                text: "❌ Cancelar",
                callback_data: "cancelar",
              },
            ],
          ],
        },
      },
    );
  }

  /* ---------------- CANCELAR ---------------- */

  if (opcion === "cancelar") {
    delete usuariosPendientes[userId];

    return bot.sendMessage(
      msg.message.chat.id,
      `🚫 Proceso cancelado.

Puedes escribir /start para comenzar de nuevo. 😊`,
    );
  }
});

/* ==================================================
   RECIBIR COMPROBANTE
================================================== */

bot.on("photo", async (msg) => {
  const userId = msg.from.id;

  if (
    !usuariosPendientes[userId] ||
    usuariosPendientes[userId].status !== "esperando_comprobante"
  ) {
    return bot.sendMessage(
      msg.chat.id,
      "⚠️ No estás en el proceso de envío de comprobante. Escribe /start para comenzar.",
    );
  }

  const fileId = msg.photo[msg.photo.length - 1].file_id;

  usuariosPendientes[userId] = {
    status: "pendiente_revision",
    fileId: fileId,
    firstName: msg.from.first_name,
    lastName: msg.from.last_name || "",
    username: msg.from.username || "Sin username",
    id: userId,
  };

  await bot.sendMessage(
    msg.chat.id,
    "✅ Comprobante recibido. El administrador revisará tu pago pronto.",
  );
  await sleep(1500);

  await bot.sendPhoto(CONSTANTS.ADMIN_ID, fileId, {
    caption: `📩 NUEVO COMPROBANTE

👤 Nombre: ${msg.from.first_name} ${msg.from.last_name || ""}

📛 Usuario: @${msg.from.username || "Sin username"}

🆔 ID: ${userId}

────────────────────
    ✅ Aprobar:
    /aprobar_${userId}

    ❌ Rechazar:
    /rechazar_${userId}`,
  });
});

/* ==================================================
   APROBAR
================================================== */

bot.on("text", async (msg) => {
  if (!msg.text.startsWith("/aprobar")) return;

  console.log("===== COMANDO APROBAR =====");

  if (msg.from.id !== CONSTANTS.ADMIN_ID) {
    return bot.sendMessage(
      msg.chat.id,
      "🚫 No tienes permiso para usar este comando.",
    );
  }

  const partes = msg.text.trim().split("_");

  if (partes.length < 2) {
    return bot.sendMessage(msg.chat.id, "Uso correcto:\n/aprobar_<id_usuario>");
  }

  const userId = Number(partes[1]);

  if (isNaN(userId)) {
    return bot.sendMessage(msg.chat.id, "❌ El ID del usuario no es válido.");
  }

  try {
    console.log("Generando enlace...");

    const enlace = await generarEnlaceInvitacion();

    if (!enlace) {
      return bot.sendMessage(
        msg.chat.id,
        "❌ No fue posible generar el enlace de invitación.",
      );
    }

    console.log("Enlace generado:", enlace);

    await bot.sendMessage(
      userId,
      `🎉 ¡Tu pago fue aprobado! ✅

  Ya puedes ingresar al canal premium utilizando el siguiente enlace:

  ${enlace}

  ⚠️ Este enlace:

  • Solo puede usarse una vez.
  • Expira en 24 horas.`,
    );

    console.log("Mensaje enviado correctamente al usuario.");

    delete usuariosPendientes[userId];

    return bot.sendMessage(msg.chat.id, "✅ Usuario aprobado correctamente.");
  } catch (error) {
    console.log("===== ERROR =====");
    console.log(error.response?.data || error);

    return bot.sendMessage(
      msg.chat.id,
      `Error al aprobar usuario:

  ${error.message}`,
    );
  }
});

/* ==================================================
   RECHAZAR
================================================== */

bot.on("text", async (msg) => {
  if (!msg.text.startsWith("/rechazar")) return;

  console.log("===== COMANDO RECHAZAR =====");

  if (msg.from.id !== CONSTANTS.ADMIN_ID) {
    return bot.sendMessage(
      msg.chat.id,
      "🚫 No tienes permiso para usar este comando.",
    );
  }

  const partes = msg.text.trim().split("_");

  if (partes.length < 2) {
    return bot.sendMessage(
      msg.chat.id,
      "Uso correcto:\n/rechazar_<id_usuario>",
    );
  }

  const userId = Number(partes[1]);

  if (isNaN(userId)) {
    return bot.sendMessage(msg.chat.id, "❌ El ID del usuario no es válido.");
  }

  try {
    console.log("Intentando enviar mensaje al usuario...");

    await bot.sendMessage(
      userId,
      `❌ Tu comprobante fue rechazado.

Si crees que es un error, contacta al administrador.`,
    );

    delete usuariosPendientes[userId];

    return bot.sendMessage(msg.chat.id, "🚫 Usuario rechazado.");
  } catch (error) {
    console.log("===== ERROR =====");
    console.log(error.response?.data || error);

    return bot.sendMessage(
      msg.chat.id,
      `Error al rechazar usuario:

${error.message}`,
    );
  }
});

/* ==================================================
   INICIAR BOT
================================================== */

bot.start();

console.log("🤖 Bot iniciado correctamente...");

const TeleBot = require("telebot");
const CONSTANTS = require("./constants");

const bot = new TeleBot({
  token: CONSTANTS.TELEGRAM_TOKEN,
});

const usuariosPendientes = {};

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

🔸 Fotos y videos al momento 📹

🔸 Nudes que me gusta compartirles 🔞

🔸 La suscripción tiene un costo de acceso mensual por solo $110.00 MXN.

🔸 Para obtener acceso, debes enviar una captura de pantalla de la transferencia o de tu comprobante de pago.

🔸 Tu suscripción me ayuda a seguir creciendo como creador de contenido y estar al pendiente de mi comunidad.

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

    await bot.sendMessage(
      msg.message.chat.id,
      `1️⃣ Realiza tu pago o transferencia 💳

2️⃣ Envía una captura o foto del comprobante de pago 📸

3️⃣ ¡Listo! ⭐ Una vez enviado, el administrador verificará tu pago y te dará acceso ℹ️`,
    );

    await bot.sendMessage(
      msg.message.chat.id,
      `💸 Costo: $110.00 MXN (pesos mexicanos) por 30 días.`,
    );

    await bot.sendMessage(
      msg.message.chat.id,
      `🪙 Número de tarjeta (BBVA):

4815 1630 4314 5997

Titular: Fernando Santiago`,
    );

    await bot.sendMessage(
      msg.message.chat.id,
      `💲 También puedes pagar por PayPal:

https://paypal.me/SagNando`,
    );

    return bot.sendMessage(
      msg.message.chat.id,
      `💟 ESPERO TU COMPROBANTE

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

  usuariosPendientes[userId].status = "pendiente_revision";
  usuariosPendientes[userId].fileId = fileId;

  await bot.sendMessage(
    msg.chat.id,
    "✅ Comprobante recibido. El administrador revisará tu pago pronto.",
  );

  await bot.sendPhoto(CONSTANTS.ADMIN_ID, fileId, {
    caption: `📩 Nuevo comprobante de ${msg.from.first_name}
@${msg.from.username || "sin_username"}

ID: ${userId}

Apruébalo con:
/aprobar ${userId}

Recházalo con:
/rechazar ${userId}`,
  });
});

/* ==================================================
   APROBAR
================================================== */

bot.on(/^\/aprobar (.+)$/, async (msg, props) => {
  if (msg.from.id !== CONSTANTS.ADMIN_ID) {
    return bot.sendMessage(
      msg.chat.id,
      "🚫 No tienes permiso para usar este comando.",
    );
  }

  const userId = Number(props.match[1]);

  try {
    await bot.sendMessage(
      userId,
      `🎉 Tu pago fue aprobado.

Pronto recibirás acceso al canal premium.`,
    );

    delete usuariosPendientes[userId];

    return bot.sendMessage(msg.chat.id, "✅ Usuario aprobado correctamente.");
  } catch (error) {
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

bot.on(/^\/rechazar (.+)$/, async (msg, props) => {
  if (msg.from.id !== CONSTANTS.ADMIN_ID) {
    return bot.sendMessage(
      msg.chat.id,
      "🚫 No tienes permiso para usar este comando.",
    );
  }

  const userId = Number(props.match[1]);

  await bot.sendMessage(
    userId,
    `❌ Tu comprobante fue rechazado.

Si crees que es un error, contacta al administrador.`,
  );

  delete usuariosPendientes[userId];

  return bot.sendMessage(msg.chat.id, "🚫 Usuario rechazado.");
});

/* ==================================================
   INICIAR BOT
================================================== */

bot.start();

console.log("🤖 Bot iniciado correctamente...");

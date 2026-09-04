const usuariosPendientes = require("../data/usuarios");
const sleep = require("../utils/sleep.js");
const CONFIG = require("../config/config");
const NEGOCIO = require("../config/globals");

module.exports = (bot) => {
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

      //// REVISAR SI HAY OFERTAS
      await revisarOfertas(
        true,
        bot,
        msg.message.chat.id,
        NEGOCIO,
        sleep, // si ya tienes una función sleep definida
      );

      return bot.sendMessage(
        msg.message.chat.id,
        `📘 Detalles del canal 🔞

🔸 El canal ofrece contenido exclusivo para suscriptores.

🔸 En el canal encontrarás mucho contenido, sin censura,🔥 exclusivo⭐ y completo😏

🔸 Fotos y videos 📹

🔸 Colaboraciones 🔞

🔸 La suscripción tiene un costo de acceso mensual por solo $${NEGOCIO.precios.mensual.mxn}.00 MXN (PESOS) o $${NEGOCIO.precios.mensual.usd} USD (DOLARES). Por ${NEGOCIO.precios.mensual.dias}.

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
      // const card = CONFIG.PAYMENT_CARD.toString;
      // card = card.replace(/.(?=(?:.{4})+$)/g, "$& ");
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
        `💸 Costo: $${NEGOCIO.precios.mensual.mxn}.00 MXN (pesos mexicanos) o $${NEGOCIO.precios.mensual.usd} USD (dolares estadounidenses) por ${NEGOCIO.precios.mensual.dias} días.`,
      );

      await sleep(1800);

      await bot.sendMessage(
        msg.message.chat.id,
        `🪙 Número de tarjeta (BBVA):
          
          ${CONFIG.PAYMENT_CARD}

        Titular: ${CONFIG.PAYMENT_HOLDER}
        
        Concepto: TLG`,
      );

      await sleep(1800);

      await bot.sendMessage(
        msg.message.chat.id,
        `💲 También puedes pagar por PayPal:
        ${CONFIG.PAYPAL_URL}`,
      );

      await sleep(1000);
      //// REVISAR SI HAY OFERTAS
      await revisarOfertas(
        true,
        bot,
        msg.message.chat.id,
        NEGOCIO,
        sleep, // si ya tienes una función sleep definida
      );

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
    /* ---------------- RENOVAR PAGO ---------------- */

    if (opcion === "renovar_pago") {
      usuariosPendientes[userId] = {
        ...usuariosPendientes[userId],
        status: "esperando_comprobante",
        tipoPago: "renovacion",
      };

      return bot.sendMessage(
        msg.message.chat.id,
        `💳 ¡Perfecto! Puedes realizar tu pago.

Una vez realizado, envía aquí la captura o foto de tu comprobante de pago 📸

El administrador revisará tu comprobante y procesará tu renovación.

⚠️ Si ya realizaste el pago, simplemente envía el comprobante.`,
        {
          replyMarkup: {
            inline_keyboard: [
              [
                {
                  text: "❌ Cancelar renovación",
                  callback_data: "cancelar_renovacion",
                },
              ],
            ],
          },
        },
      );
    }

    /* ---------------- CANCELAR RENOVACIÓN ---------------- */

    if (opcion === "cancelar_renovacion") {
      delete usuariosPendientes[userId];

      return bot.sendMessage(
        msg.message.chat.id,
        `🚫 Renovación cancelada.

Tu suscripción no ha sido renovada.

Si posteriormente deseas continuar con tu suscripción, puedes realizar el proceso nuevamente.`,
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

    const tipoPago = usuariosPendientes[userId].tipoPago || "nuevo";

    usuariosPendientes[userId] = {
      status: "pendiente_revision",
      tipoPago: tipoPago,
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

    await bot.sendPhoto(CONFIG.ADMIN_ID, fileId, {
      caption: `📩 NUEVO COMPROBANTE

👤 Nombre: ${msg.from.first_name} ${msg.from.last_name || ""}

📛 Usuario: @${msg.from.username || "Sin username"}

🆔 ID: ${userId}

💎 TipoPago: ${tipoPago}

────────────────────

✅ Aprobar:
/aprobar_${userId}

❌ Rechazar:
/rechazar_${userId}

📲 Recordar pago:
/recordarPago_${userId}

👍🏻 Aceptar Renovacion:
/aceptarRenovacion_${userId}

⛔ Eliminar del canal:
/eliminar_${userId}`,
    });
  });
};

async function revisarOfertas(
  nuevo,
  bot,
  chatId,
  NEGOCIO,
  sleep = (ms) => new Promise((res) => setTimeout(res, ms)),
) {
  const oferta1 = NEGOCIO.ofertas.primerMes;
  const oferta2 = NEGOCIO.ofertas.masMeses;
  if (oferta1.activa && nuevo) {
    await bot.sendMessage(
      chatId,
      ` 🔥SUSCRIPCION MENSUAL!

        🔸 😈😈 POR TIEMPO LIMITADO! OPTEN TU ACCESO DEL PRIMER MES 
        POR $${NEGOCIO.ofertas.primerMes.mxn}.00 MXN (PESOS) o $${NEGOCIO.ofertas.primerMes.usd} USD (DOLARES),

        Envia tu comprobante.
        solo para nuevos miembros.`,
    );

    await sleep(1500);
  }
  if (oferta2.activa) {
    await bot.sendMessage(
      chatId,
      ` 💦 OFERTA ESPECIAL!

        🔸 🍆🍆 APROVECHA SOLO HOY! >>${NEGOCIO.ofertas.masMeses.meses} MESES << 
        POR $${NEGOCIO.ofertas.masMeses.mxn}.00 MXN (PESOS) o $${NEGOCIO.ofertas.masMeses.usd} USD (DOLARES),

        Envia tu comprobante Ya.
        solo por tiempo limitado`,
    );
    await sleep(1500);
  }
}

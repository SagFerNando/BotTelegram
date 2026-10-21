const sleep = require("../utils/sleep.js");
const CONFIG = require("../config/config");
const NEGOCIO = require("../config/globals");
const {
  crearPago,
  obtenerPagoPendientePorSuscripcion,
} = require("../data/pagos");
const {
  actualizarSuscripcion,
  obtenerSuscripcion,
  crearSuscripcion,
} = require("../data/suscripciones.js");
const {
  crear_ObtenerUsuario,
  obtenerUsuarioPorTelegramId,
} = require("../data/usuarios");
const { revisarOfertas } = require("./functions.js");

module.exports = (bot) => {
  /* ==================================
     START
  ================================== */

  bot.on("/start", async (msg) => {
    const userId = msg.from.id;

    try {
      const usuario = await crear_ObtenerUsuario({
        telegram_id: userId,
        username: msg.from.username || null,
        nombre:
          `${msg.from.first_name || ""} ${msg.from.last_name || ""}`.trim(),
      });
      console.log(usuario);

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
    } catch (error) {
      console.error("Error registrando usuario:", error);

      return bot.sendMessage(
        msg.chat.id,
        "❌ Ocurrió un error al iniciar. Intenta nuevamente",
        error,
      );
    }
  });

  /* ==================================
     CALLBACKS
  ================================== */
  try {
    bot.on("callbackQuery", async (msg) => {
      const userId = msg.from.id;
      const opcion = msg.data;

      /* ---------------- INFO ---------------- */
      //Muestra toda la info relacionada al canal como primer vistazo al usuario
      //detalla el contenido e info general para que el usuario entienda el modelo
      //y pueda dar el siguiente paso.

      if (opcion == "info") {
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

      if (opcion == "pago") {
        try {
          const usuario = await crear_ObtenerUsuario({
            telegram_id: userId,
            username: msg.from.username || null,
            nombre:
              `${msg.from.first_name || ""} ${msg.from.last_name || ""}`.trim(),
          });
          const suscripcionActiva = await obtenerSuscripcion(
            usuario.id,
            "estado",
            "activa",
          );

          //verifica si el usuario tiene una suscripcion activa
          if (suscripcionActiva) {
            return bot.sendMessage(
              msg.message.chat.id,
              `⚠️ Ya tienes una suscripción activa.

        📅 Tu suscripción actual vence el:

        ${new Date(suscripcionActiva.fecha_vencimiento).toLocaleString("es-MX")}

        Si deseas renovarla, utiliza la opción de renovación cuando corresponda.`,
            );
          }
          //genera una nueva suscripcion pendiente
          const fechaInicio = new Date();

          const fechaVencimiento = new Date(fechaInicio);

          fechaVencimiento.setDate(fechaVencimiento.getDate() + 1);

          const suscripcion = await crearSuscripcion({
            usuario_id: usuario.id,
            fecha_inicio: fechaInicio.toISOString(),
            fecha_vencimiento: fechaVencimiento.toISOString(),
            estado: "pendiente",
          });

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
        } catch (error) {
          console.error("Error creando suscripción:", error);

          return bot.sendMessage(
            msg.message.chat.id,
            "❌ Ocurrió un error al preparar tu suscripción. Intenta nuevamente continuar al pago.",
            {
              replyMarkup: {
                inline_keyboard: [
                  [
                    {
                      text: "💳 Reintentar proceso de pago",
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
      }
      /* ---------------- RENOVAR PAGO ---------------- */

      if (opcion == "renovar_pago") {
        try {
          // ======================================
          // 1. OBTENER USUARIO
          // ======================================

          const usuario = await obtenerUsuarioPorTelegramId(userId);

          // ======================================
          // 2. BUSCAR SUSCRIPCIÓN ACTIVA
          // ======================================

          const suscripcionActiva = await obtenerSuscripcion(
            usuario.id,
            "estado",
            "activa",
          );

          if (!suscripcionActiva) {
            return bot.sendMessage(
              msg.message.chat.id,
              `⚠️ No tienes una suscripción activa para renovar.

            Si deseas obtener acceso nuevamente, realiza una nueva suscripción iniciando el proceso de nuevo pulsando /start.`,
            );
          }

          // ======================================
          // 4. MOSTRAR INFORMACIÓN DE PAGO
          // ======================================

          return bot.sendMessage(
            msg.message.chat.id,
            `💳 ¡Perfecto! Puedes realizar tu pago.

          Una vez realizado, envía aquí la captura o foto de tu comprobante de pago 📸

          El administrador revisará tu comprobante y procesará tu renovación.

          ⚠️ Si ya realizaste el pago, simplemente envía el comprobante.

          ________________________________
          
          Tu suscripción actual activa:

          📅 *Vencimiento:*

          ${new Date(suscripcionActiva.fecha_vencimiento).toLocaleString(
            "es-MX",
          )}`,

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
        } catch (error) {
          console.error("Error preparando renovación:", error);

          return bot.sendMessage(
            msg.message.chat.id,
            "⚠️ Ocurrió un error al preparar tu renovación. Intenta nuevamente.",
            error,
          );
        }
      }

      /* ---------------- CANCELAR RENOVACIÓN ---------------- */

      if (opcion == "cancelar_renovacion") {
        return bot.sendMessage(
          msg.message.chat.id,
          `🚫 Renovación cancelada.

  Tu suscripción no ha sido renovada.

  Si posteriormente deseas continuar con tu suscripción, puedes realizar el proceso nuevamente pulsando /start.`,
        );
      }

      /* ---------------- CANCELAR ---------------- */

      if (opcion == "cancelar") {
        console.log("estamos viendo info", opcion);
        try {
          const usuario = await obtenerUsuarioPorTelegramId(userId);
          if (!usuario) {
            return bot.sendMessage(
              msg.message.chat.id,
              "❌ No se encontro al usuario.",
            );
          }

          const suscripcion = await obtenerSuscripcion(
            usuario.id,
            "estado",
            "pendiente",
          );

          if (!suscripcion) {
            return bot.sendMessage(
              msg.message.chat.id,
              "❌ No existe ningún proceso de suscripción para cancelar.",
            );
          }

          console.log(
            "suscripcion",
            suscripcion.id,
            "estado",
            suscripcion.estado,
          );

          // Evitar cancelar una suscripción que ya cambió de estado
          if (suscripcion.estado !== "pendiente") {
            return bot.sendMessage(
              msg.message.chat.id,
              "❌ Esta suscripción ya no puede cancelarse.",
            );
          }

          await actualizarSuscripcion(suscripcion.id, "estado", "cancelada");

          await bot.sendMessage(
            msg.message.chat.id,
            "Proceso de suscripcion cancelado correctamente! \nSi deseas intentarlo nuevamente, deberás comenzar el proceso desde /start. 😊",
          );

          return bot.sendMessage(
            msg.message.chat.id,
            `❌ Proceso cancelado!  `,
          );
        } catch (error) {
          console.log("==== ERROR CANCELAR ====");
          console.log(error);

          return bot.sendMessage(
            msg.message.chat.id,
            `❌ Ocurrió un error:
    ${error.message}`,
          );
        }
      }

      /*-----------------REENVIAR COMPROBANTE ---------------*/
      if (opcion == "reenviar") {
        try {
          return bot.sendMessage(
            msg.message.chat.id,
            `🔄 Puedes enviar nuevamente tu comprobante.

    Este nuevo comprobante será asociado a la misma suscripción.

    📸 Envía ahora la imagen de tu comprobante.`,
          );
        } catch (error) {
          console.log("==== ERROR REENVIAR ====");
          console.log(error);

          return bot.sendMessage(
            msg.message.chat.id,
            "❌ Ocurrió un error.",
            error,
          );
        }
      }
    });
  } catch (error) {
    console.log("error en los callbacks", error);
  }

  /* ==================================
     RECIBIR COMPROBANTE
     esta funcion actuara automaticamente siempre y cuando:
     -Tengas una suscripcion creada y pendiente
     -No tengas ya un pago pendiente por revision, por lo que no podras volver a mandar otro
      hasta que se acepte o rechace.
    -Tu anterior comprobante sea rechazado por lo que podras enviar otro, aun cuando no pre-
      siones el comando volver a enviar.
  ================================== */

  bot.on("photo", async (msg) => {
    const userId = msg.from.id;

    // -----------------------------------------
    // 1. Obtener usuario desde la BD
    // -----------------------------------------

    try {
      const usuario = await obtenerUsuarioPorTelegramId(userId);

      // -----------------------------------------
      // 2. Buscar suscripción pendiente
      // -----------------------------------------
      const [suscripcionActiva, suscripcionPendiente] = await Promise.all([
        obtenerSuscripcion(usuario.id, "estado", "activa"),
        obtenerSuscripcion(usuario.id, "estado", "pendiente"),
      ]);

      const suscripcion = suscripcionActiva ?? suscripcionPendiente;

      if (!suscripcion) {
        await bot.sendMessage(
          msg.chat.id,
          "⚠️ No tienes una suscripción pendiente de pago.\n\n" +
            "Primero inicia el proceso de suscripción. Presiona /start",
        );
        return bot.sendMessage(
          msg.chat.id,
          `No se encontro una suscripcion pendiente de pago para el usuario ${usuario.nombre}`,
        );
      }

      // -----------------------------------------
      // 3. Verificar que no exista ya
      //    un pago pendiente para esa suscripción
      // -----------------------------------------

      const pagoExistente = await obtenerPagoPendientePorSuscripcion(
        suscripcion.id,
      );

      if (pagoExistente) {
        return bot.sendMessage(
          msg.chat.id,
          "⚠️ Ya tienes un comprobante pendiente de revisión.\n\n" +
            "Por favor espera a que el administrador revise tu pago.",
        );
      }

      // -----------------------------------------
      // 4. Obtener file_id de Telegram
      // -----------------------------------------

      const fileId = msg.photo[msg.photo.length - 1].file_id;

      // -----------------------------------------
      // 5. Determinar tipo de pago
      // -----------------------------------------
      let tipoPago;
      if (suscripcion.estado == "activa") {
        tipoPago = "renovacion";
      } else {
        tipoPago = "nueva_suscripcion";
      }

      // -----------------------------------------
      // 6. Registrar pago en BD
      // -----------------------------------------

      const pago = await crearPago({
        suscripcion_id: suscripcion.id,
        tipo_pago: tipoPago,
        monto: NEGOCIO.precios.mensual.mxn,
        comprobante_file_id: fileId,
      });

      // -----------------------------------------
      // 7. Confirmar al usuario
      // -----------------------------------------

      await bot.sendMessage(
        msg.chat.id,
        "📩 Comprobante enviado correctamente.\n\n" +
          "Tu pago ha sido enviado al administrador para su revisión.\n\n" +
          "Por favor espera su respuesta pacientemente. 😊",
      );

      await sleep(1500);
      var aprobarOferta1,
        aprobarOferta2 = "";
      //verificar si hay ofertas ofrecidas
      if (NEGOCIO.ofertas.masMeses.activa) {
        aprobarOferta1 =
          "/aprobar_" +
          userId +
          "_" +
          NEGOCIO.ofertas.masMeses.meses.toString() +
          "_" +
          NEGOCIO.ofertas.masMeses.mxn.toString();
      }
      if (NEGOCIO.ofertas.primerMes.activa) {
        aprobarOferta2 =
          "/aprobar_" +
          userId +
          "_" +
          NEGOCIO.ofertas.primerMes.meses.toString() +
          "_" +
          NEGOCIO.ofertas.masMeses.mxn.toString();
      }

      // -----------------------------------------
      // 8. Avisar al administrador
      // -----------------------------------------

      await bot.sendPhoto(CONFIG.ADMIN_ID, fileId, {
        caption: `
📩 NUEVO COMPROBANTE

👤 Nombre:
${msg.from.first_name} ${msg.from.last_name || ""}

📛 Usuario:
@${msg.from.username || "Sin username"}

🆔 Telegram ID:
${userId}

💎 Tipo de pago:
${tipoPago}

🗂️ ID del pago:
${pago.id}

📋 ID de suscripción:
${suscripcion.id}

────────────────────

✅ Aprobar:
/aprobar_${userId}
      ${aprobarOferta1}
            ${aprobarOferta2}

❌ Rechazar:
/rechazar_${userId}

📲 Recordar pago manualmente: 
/recordarPago_${userId}

⛔ Eliminar del canal:
/eliminar_${userId}`,
      });
    } catch (error) {
      console.error("Error registrando pago:", error);

      return bot.sendMessage(
        msg.chat.id,
        "❌ Ocurrió un error al registrar tu comprobante.\n\n" +
          "Intenta nuevamente.\n",
        error,
      );
    }
  });
};

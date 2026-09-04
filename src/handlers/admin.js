const usuariosPendientes = require("../data/usuarios");
const sleep = require("../utils/sleep");
const CONFIG = require("../config/config");

const {
  generarEnlaceInvitacion,
  verificarUsuarioEnCanal,
  eliminarUsuarioDelCanal,
} = require("../services/telegram");

module.exports = (bot) => {
  // ------------------------------------------------------
  // APROBAR USUARIO
  // ------------------------------------------------------
  // Recibe comprobante de pago y una vez lo acepta el administrador
  // Aceptado el comprobante se envia el comando para generar el enlace de acceso al canal

  bot.on("text", async (msg) => {
    if (!msg.text.startsWith("/aprobar_")) {
      return;
    }

    if (msg.from.id !== CONFIG.ADMIN_ID) {
      return bot.sendMessage(
        msg.chat.id,
        "🚫 No tienes permiso para usar este comando.",
      );
    }

    const partes = msg.text.trim().split("_");

    if (partes.length < 2) {
      return bot.sendMessage(msg.chat.id, "Uso:\n/aprobar_ID");
    }

    const userId = Number(partes[1]);

    if (isNaN(userId)) {
      return bot.sendMessage(msg.chat.id, "❌ El ID del usuario no es válido.");
    }

    try {
      //Se genera el enlace de Invitacion al canal mediante esta funcion del archivo telegram.js
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

      await sleep(1200);

      delete usuariosPendientes[userId];

      return bot.sendMessage(msg.chat.id, "✅ Usuario aprobado correctamente.");
    } catch (error) {
      console.log("===== ERROR APROBAR =====");
      console.log(error.response?.data || error);

      return bot.sendMessage(
        msg.chat.id,
        `Error al aprobar usuario:

${error.message}`,
      );
    }
  });

  // ------------------------------------------------------
  // RECHAZAR USUARIO
  // ------------------------------------------------------
  // Recibe comprobante de pago y se pone a merced del administrador
  // Se rechaza el comprobante enviado por el usuario y el administrador lo rechaza por lo que no se envia ningun comprobante
  // y se envia un mensaje de texto sobre el rechazo, ademas se elimina de la lista de usuarios pendientes

  bot.on("text", async (msg) => {
    if (!msg.text.startsWith("/rechazar_")) {
      return;
    }

    if (msg.from.id !== CONFIG.ADMIN_ID) {
      return bot.sendMessage(
        msg.chat.id,
        "🚫 No tienes permiso para usar este comando.",
      );
    }

    const partes = msg.text.trim().split("_");

    if (partes.length < 2) {
      return bot.sendMessage(msg.chat.id, "Uso:\n/rechazar_ID");
    }

    const userId = Number(partes[1]);

    if (isNaN(userId)) {
      return bot.sendMessage(msg.chat.id, "❌ El ID del usuario no es válido.");
    }

    try {
      const respuesta = await bot.sendMessage(
        userId,
        `❌ Tu comprobante fue rechazado.
Verifica:
> Que sea correcto y total el monto Transferido.
> Que sea legible, correcta y comprobable tu comprobante.
> Que tu comprobante sea sobre el pago y no de otra cuestion.
> Si todo es correcto comienza el proceso de nuevo y envia tu comprobante nuevamente.

Si crees que es un error, contacta al administrador o envia un nuevo comprobante con una nota de la situacion en la imagen.`,
      );

      console.log("Mensaje enviado correctamente:");

      console.log(respuesta);

      delete usuariosPendientes[userId];

      return bot.sendMessage(msg.chat.id, "🚫 Usuario rechazado.");
    } catch (error) {
      console.log("===== ERROR RECHAZAR =====");
      console.log(error);

      return bot.sendMessage(
        msg.chat.id,
        `Error al rechazar usuario:

${error.message}`,
      );
    }
  });

  // ------------------------------------------------------
  // RECORDAR PAGO
  // ------------------------------------------------------
  // El administrador enviara al usuario un mensaje recordatorio de su pago mediante un mensaje
  // Solo debe usar el comando mas el id de usuario de telegram

  bot.on("text", async (msg) => {
    if (!msg.text.startsWith("/recordarPago_")) {
      return;
    }

    if (msg.from.id !== CONFIG.ADMIN_ID) {
      return bot.sendMessage(
        msg.chat.id,
        "🚫 No tienes permiso para usar este comando.",
      );
    }

    const partes = msg.text.trim().split("_");

    if (partes.length < 2) {
      return bot.sendMessage(msg.chat.id, "Uso:\n/recordarPago_ID");
    }

    const userId = Number(partes[1]);

    if (isNaN(userId)) {
      return bot.sendMessage(msg.chat.id, "❌ ID inválido.");
    }

    try {
      // Se envia un solo mensaje con todos los datos para rehacer el pago, teniendo la opcion de cancelar
      await bot.sendMessage(
        userId,
        `⏰ ¡Hola! Te recuerdo que se acerca la fecha de tu siguiente pago mensual.

Para continuar disfrutando del contenido premium debes realizar nuevamente tu pago.

💸 Costo: $${NEGOCIO.precios.mensual.mxn}.00 MXN (pesos mexicanos) o $${NEGOCIO.precios.mensual.usd} USD (dolares estadounidenses) 

por ${NEGOCIO.precios.mensual.dias} días.

🪙 Número de tarjeta (BBVA):
          
          ${CONFIG.PAYMENT_CARD}

        Titular: ${CONFIG.PAYMENT_HOLDER}
        
        Concepto: TLG

💲 También puedes pagar por PayPal:
        ${CONFIG.PAYPAL_URL}

Una vez realizado el pago, envía tu comprobante para verificarlo.

⚠️ Si no realizas tu pago, tu acceso al canal podrá ser eliminado.`,
        {
          replyMarkup: {
            inline_keyboard: [
              [
                {
                  text: "💳 Realizar pago",
                  callback_data: "renovar_pago",
                },
              ],
              [
                {
                  text: "❌ No continuar",
                  callback_data: "cancelar_renovacion",
                },
              ],
            ],
          },
        },
      );

      return bot.sendMessage(
        msg.chat.id,
        "✅ Recordatorio enviado correctamente.",
      );
    } catch (error) {
      console.log(error);

      return bot.sendMessage(
        msg.chat.id,
        `❌ No fue posible enviar el recordatorio.

${error.message}`,
      );
    }
  });

  // ------------------------------------------------------
  // ACEPTAR RENOVACION
  // ------------------------------------------------------
  // Recibe comprobante de pago para que lo visualice el administrador
  // Aceptado el comprobante se acepta mediante el comando, muy diferente al de aprovar ya que
  // este comando se usa si el usuario aun esta en el canal, ya que solo le notifica que se acepto
  // su pago y lo mantiene en el canal, sin enviar otro enlace de invitacion.

  bot.on("text", async (msg) => {
    if (!msg.text.startsWith("/aceptarRenovacion_")) {
      return;
    }

    if (msg.from.id !== CONFIG.ADMIN_ID) {
      return bot.sendMessage(
        msg.chat.id,
        "🚫 No tienes permiso para usar este comando.",
      );
    }

    const partes = msg.text.trim().split("_");

    if (partes.length < 2) {
      return bot.sendMessage(msg.chat.id, "Uso:\n/aceptarRenovacion_ID");
    }

    const userId = Number(partes[1]);

    if (isNaN(userId)) {
      return bot.sendMessage(msg.chat.id, "❌ ID inválido.");
    }

    try {
      await bot.sendMessage(
        userId,
        `🎉 ¡Pago recibido y verificado! ✅

Tu suscripción ha sido renovada correctamente.

✨ Puedes seguir disfrutando del canal premium con normalidad durante los próximos 30 días.

¡Muchas gracias por seguir apoyando mi contenido! ❤️`,
      );

      delete usuariosPendientes[userId];

      return bot.sendMessage(msg.chat.id, "✅ Usuario aprobado correctamente.");
    } catch (error) {
      console.log(error);

      return bot.sendMessage(
        msg.chat.id,
        `❌ No fue posible completar la renovación.

${error.message}`,
      );
    }
  });

  // ------------------------------------------------------
  // ELIMINAR USUARIO
  // ------------------------------------------------------
  // Este comando se usa para eliminar un mienbro del canal directamente sin entrar a las
  // configuraciones, cuando se requiera o cuando su suscripcion ha terminado y no renovo.
  // Elimina cualquier miembro tan solo con su ID excepto al administrador, y solo el puede usarlo.

  bot.on("text", async (msg) => {
    if (!msg.text.startsWith("/eliminar_")) {
      return;
    }

    if (msg.from.id !== CONFIG.ADMIN_ID) {
      return bot.sendMessage(
        msg.chat.id,
        "🚫 No tienes permiso para usar este comando.",
      );
    }

    const partes = msg.text.trim().split("_");

    if (partes.length < 2) {
      return bot.sendMessage(msg.chat.id, "Uso:\n/eliminar_ID");
    }

    const userId = Number(partes[1]);

    if (isNaN(userId)) {
      return bot.sendMessage(msg.chat.id, "❌ ID inválido.");
    }

    try {
      const miembro = await verificarUsuarioEnCanal(userId);
      // Se verifica si el usuario esta en el canal para poder eliminarlo correctamente
      if (!miembro) {
        return bot.sendMessage(
          msg.chat.id,
          "ℹ️ El usuario no se encuentra actualmente en el canal.",
        );
      }

      await eliminarUsuarioDelCanal(userId);
      //Una vez eliminado se le envia al usuario un mensaje informandole que su suscripcion caduco.
      await bot.sendMessage(
        userId,
        `⚠️ Tu acceso al canal premium ha finalizado.

Si deseas continuar disfrutando del contenido, puedes realizar nuevamente tu pago.`,
      );

      return bot.sendMessage(
        msg.chat.id,
        "✅ Usuario eliminado correctamente del canal.",
      );
    } catch (error) {
      console.log("===== ERROR ELIMINAR =====");

      console.log(error);

      return bot.sendMessage(
        msg.chat.id,
        `❌ No fue posible eliminar al usuario.

${error.message}`,
      );
    }
  });
};

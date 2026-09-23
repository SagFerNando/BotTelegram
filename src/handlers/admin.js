const supabase = require("../data/supabase");
const sleep = require("../utils/sleep.js");
const usuariosPendientes = require("../data/usuarios");
const CONFIG = require("../config/config");
const NEGOCIO = require("../config/globals");
const { obtenerUsuarioPorTelegramId } = require("../data/usuarios");
const {
  obtenerUltimaSuscripcion,
  actualizarFechaVencimiento,
  actualizarEstadoSuscripcion,
  obtenerSuscripcionPorId,
} = require("../data/suscripciones");
const {
  obtenerPagosPorSuscripcion,
  obtenerPagoPorId,
  actualizarPago,
  obtenerPagosPorUsuario,
} = require("../data/pagos");
const {
  generarEnlaceInvitacion,
  verificarUsuarioEnCanal,
  eliminarUsuarioDelCanal,
} = require("../services/telegram");
//--------------------------------------------------------
//FUNCION PARA DETALLAR ERRORES

function obtenerDetalleError(error) {
  if (error?.response?.data) {
    return JSON.stringify(error.response.data, null, 2);
  }

  if (error?.message) {
    return error.message;
  }

  return String(error);
}

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
      //  Buscar usuario
      const usuario = await obtenerUsuarioPorTelegramId(userId);

      if (!usuario) {
        return bot.sendMessage(
          msg.chat.id,
          "❌ No se encontró el usuario en la base de datos.",
        );
      }
      //1 buscar pago pendiente
      const pagos = await obtenerPagosPorUsuario(usuario.id, "pendiente");
      if (!pagos || pagos.length === 0) {
        return bot.sendMessage(
          msg.chat.id,
          "⚠️ No se encontró ningún pago pendiente para este usuario.",
        );
      }

      // 3. Tomar el pago pendiente más reciente
      const pago = pagos[0];

      // 4. Obtener la suscripción relacionada con el pago
      const suscripcion = await obtenerUltimaSuscripcion(usuario.id);

      if (!suscripcion) {
        return bot.sendMessage(
          msg.chat.id,
          "❌ Este usuario no tiene ninguna suscripción registrada.",
        );
      }

      const esRenovacion = pago.tipo_pago === "renovacion";

      const tipoPagoTexto = esRenovacion ? "RENOVACIÓN" : "NUEVA SUSCRIPCIÓN";

      const estaEnCanal = false; //await verificarUsuarioEnCanal(userId);

      // =========================================================
      // 6. CALCULAR FECHAS
      // =========================================================

      const ahora = new Date();
      let fechaInicio;
      let fechaVencimiento;
      let nuevafecha;

      if (esRenovacion) {
        /*/////////////////////////////
         * RENOVACIÓN
         *
         * Si todavía tiene tiempo restante, conservamos
         * su fecha de vencimiento actual y agregamos 30 días.
         *
         * Si ya venció, comenzamos desde ahora.
         */

        const vencimientoActual = new Date(suscripcion.fecha_vencimiento);

        if (vencimientoActual > ahora) {
          fechaInicio = new Date(suscripcion.fecha_inicio);

          fechaVencimiento = new Date(vencimientoActual);

          nuevafecha =
            fechaVencimiento.getDate() + NEGOCIO.precios.mensual.dias;
          fechaVencimiento.setDate(nuevafecha);
        } else {
          fechaInicio = ahora;

          fechaVencimiento = new Date(ahora);

          nuevafecha =
            fechaVencimiento.getDate() + NEGOCIO.precios.mensual.dias;
          fechaVencimiento.setDate(nuevafecha);
        }
      } else {
        /*///////////////////////////
         * NUEVA SUSCRIPCIÓN
         *
         * Los 30 días comienzan desde el momento
         * en que el administrador aprueba el pago.
         */

        fechaInicio = ahora;

        fechaVencimiento = new Date(ahora);

        nuevafecha = fechaVencimiento.getDate() + NEGOCIO.precios.mensual.dias;
        fechaVencimiento.setDate(nuevafecha);
      }

      // =========================================================
      // 7. ACTUALIZAR PAGO
      // =========================================================

      await actualizarPago(pago.id, "estado", "aprobado");
      // =========================================================
      // 8. ACTUALIZAR SUSCRIPCIÓN
      // =========================================================

      let suscripcionActualizada;
      if (esRenovacion) {
        /*
         * Para renovación conservamos la misma suscripción
         * y actualizamos su vencimiento.
         */
        suscripcionActualizada = await actualizarFechaVencimiento(
          suscripcion.id,
          fechaVencimiento.toISOString(),
        );
      } else {
        /*
         * Para nueva suscripción: activamos la suscripción y dejamos las fechas
         * comenzando desde la aprobación.
         */
        suscripcionActualizada = await actualizarEstadoSuscripcion(
          suscripcion.id,
          "activa",
        );
        /*
         * actualizarEstadoSuscripcion() solamente cambia el estado, por lo que actualizamos las fechas
         * directamente aquí.
         */

        const { data, error } = await supabase
          .from("suscripciones")
          .update({
            fecha_inicio: fechaInicio.toISOString(),
            fecha_vencimiento: fechaVencimiento.toISOString(),

            estado: "activa",
          })
          .eq("id", suscripcion.id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        suscripcionActualizada = data;
      }

      // =========================================================
      // 9. GENERAR ENLACE SOLO SI NO ESTÁ EN EL CANAL
      // =========================================================

      const enlace = await generarEnlaceInvitacion();

      if (!enlace) {
        return bot.sendMessage(
          msg.chat.id,
          `⚠️ El pago fue aprobado y la suscripción fue registrada, pero no se pudo generar el enlace de invitación.`,
        );
      }

      console.log("Enlace generado:");
      if (!estaEnCanal) {
        // -------------------------------------------------------
        // EL USUARIO NO ESTÁ EN EL CANAL Y SE LE DA ACCESO
        // -------------------------------------------------------

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

        // 8. Avisar al administrador
        return bot.sendMessage(
          msg.chat.id,
          `✅ Pago aprobado correctamente.

        👤 Usuario: ${userId}

        🧾 Pago: ${pago.id}

        📋 Suscripción: ${suscripcion.id}

        💳 Tipo:
        ${tipoPagoTexto}`,
        );
      } else {
        // -------------------------------------------------------
        // EL USUARIO YA ESTÁ EN EL CANAL
        // -------------------------------------------------------

        await bot.sendMessage(
          userId,
          `🎉 ¡Pago aprobado!
          ✅ Tu pago ha sido verificado correctamente.
          ✨ Puedes seguir disfrutando del canal premium con normalidad durante los próximos 30 días.


          📅 Tu suscripción está activa hasta:
          ${nuevafecha}

          🔄 Tu acceso al canal continúa activo.
          ¡Muchas gracias por seguir apoyando mi contenido! ❤️`,
        );

        //avisar al administrador
        return bot.sendMessage(
          msg.chat.id,
          `✅ Pago aprobado correctamente.

        👤 Usuario: ${userId}

        🧾 Pago: ${pago.id}

        📋 Suscripción: ${suscripcion.id}

        💳 Tipo:
        ${tipoPagoTexto}

        📅 Vencimiento:
        ${nuevafecha}`,
        );
      }
    } catch (error) {
      console.error("Error aprobando pago:", error);

      return bot.sendMessage(
        msg.chat.id,
        `❌ Ocurrió un error al aprobar el pago. Intenta nuevamente. Detalles:

        👤 Usuario: ${userId}
        🧾 Pago: ${pago.id}
        📋 Suscripción: ${suscripcion.id}
        💳 Tipo:
        ${tipoPagoTexto}
        💎 Estado de la suscripcion:
        ${suscripcion.estado}
        📲 Enlace generado:
        ${enlace}
        _____________________________________________________
        Tuvimos problemas con:
        ${error}`,
        {
          replyMarkup: {
            inline_keyboard: [
              [
                {
                  text: "💳 Reintentar proceso de pago",
                  callback_data: "pago",
                },
              ],
            ],
          },
        },
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
      //  Buscar usuario
      const usuario = await obtenerUsuarioPorTelegramId(userId);

      if (!usuario) {
        return bot.sendMessage(
          msg.chat.id,
          "❌ No se encontró el usuario en la base de datos.",
        );
      }
      //buscar pagos
      const pagos = await obtenerPagosPorUsuario(usuario.id, "pendiente");
      if (!pagos || pagos.length === 0) {
        return bot.sendMessage(
          msg.chat.id,
          "⚠️ No se encontró ningún pago pendiente para este usuario.",
        );
      }
      // 1. Obtener el pago
      const pago = pagos[0];

      if (!pago) {
        return bot.sendMessage(msg.chat.id, "❌ No se encontró el pago.");
      }

      // 2. Comprobar que todavía pueda ser rechazado
      if (pago.estado !== "pendiente") {
        return bot.sendMessage(
          msg.chat.id,
          `❌ El pago ${pago.id} ya no está pendiente de revisión, Ya fue aprobado o rechazado o ya expiro.\n\nEstado actual: ${pago.estado}`,
        );
      }

      // 3. Obtener la suscripción relacionada
      const suscripcion = await obtenerSuscripcionPorId(pago.suscripcion_id);

      if (!suscripcion) {
        return bot.sendMessage(
          msg.chat.id,
          "❌ No se encontró la suscripción relacionada con este pago.",
        );
      }

      // 4. Marcar el pago como rechazado
      await actualizarPago(pago.id, "estado", "rechazado");

      await bot.sendMessage(
        userId,
        `❌ Tu comprobante fue rechazado.
        
Verifica:
> Que sea correcto y total el monto Transferido.
> Que sea legible, correcta y comprobable tu comprobante.
> Que tu comprobante sea sobre el pago y no de otra cuestion.
> Si todo es correcto comienza el proceso de nuevo y envia tu comprobante nuevamente.


Puedes volver a enviar otro comprobante para esta misma suscripción si consideras que hubo un error.

También puedes cancelar completamente este proceso.

¿Qué deseas hacer?`,
        //Si crees que es un error, contacta al administrador o envia un nuevo comprobante con una nota de la situacion en la imagen.
        {
          replyMarkup: {
            inline_keyboard: [
              [
                {
                  text: "🔄 Enviar otro comprobante",
                  callback_data: `reenviar`,
                },
              ],
              [
                {
                  text: "❌ Cancelar proceso",
                  callback_data: `cancelar`,
                },
              ],
            ],
          },
        },
      );

      console.log("Mensaje enviado correctamente:");

      //console.log(respuesta);

      return bot.sendMessage(
        msg.chat.id,
        `🚫 Pago ${pago.id} rechazado correctamente.\n\nSuscripción ${suscripcion.id} permanece pendiente.`,
      );
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

  //   bot.on("text", async (msg) => {
  //     if (!msg.text.startsWith("/aceptarRenovacion_")) {
  //       return;
  //     }

  //     if (msg.from.id !== CONFIG.ADMIN_ID) {
  //       return bot.sendMessage(
  //         msg.chat.id,
  //         "🚫 No tienes permiso para usar este comando.",
  //       );
  //     }

  //     const partes = msg.text.trim().split("_");

  //     if (partes.length < 2) {
  //       return bot.sendMessage(msg.chat.id, "Uso:\n/aceptarRenovacion_ID");
  //     }

  //     const userId = Number(partes[1]);

  //     if (isNaN(userId)) {
  //       return bot.sendMessage(msg.chat.id, "❌ ID inválido.");
  //     }

  //     try {
  //       await bot.sendMessage(
  //         userId,
  //         `🎉 ¡Pago recibido y verificado! ✅

  // Tu suscripción ha sido renovada correctamente.

  // ✨ Puedes seguir disfrutando del canal premium con normalidad durante los próximos 30 días.

  // ¡Muchas gracias por seguir apoyando mi contenido! ❤️`,
  //       );

  //       delete usuariosPendientes[userId];

  //       return bot.sendMessage(msg.chat.id, "✅ Usuario aprobado correctamente.");
  //     } catch (error) {
  //       console.log(error);

  //       return bot.sendMessage(
  //         msg.chat.id,
  //         `❌ No fue posible completar la renovación.

  // ${error.message}`,
  //       );
  //     }
  //   });

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

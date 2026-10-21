const supabase = require("../data/supabase");
const sleep = require("../utils/sleep.js");
const CONFIG = require("../config/config");
const NEGOCIO = require("../config/globals");
const {
  obtenerUsuarioPorTelegramId,
  crear_ObtenerUsuario,
} = require("../data/usuarios");
const {
  obtenerSuscripcion,
  actualizarSuscripcion,
  obtenerSuscripcionPorId,
} = require("../data/suscripciones");
const { actualizarPago, obtenerPagosPorUsuario } = require("../data/pagos");
const {
  generarEnlaceInvitacion,
  verificarUsuarioEnCanal,
  eliminarUsuarioDelCanal,
} = require("../services/telegram");
const { eliminarUsuario, recordarPago } = require("./functions.js");

//--------------------------------------------------------

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

    // partes[0] = "/aprobar"
    // partes[1] = IDUSER
    // partes[2] = MESES (opcional)
    // partes[3] = PRECIO (opcional)

    if (partes.length < 2) {
      return bot.sendMessage(
        msg.chat.id,
        "Uso:\n/aprobar_ID\n/aprobar_ID_MESES_PRECIO",
      );
    }

    const userId = Number(partes[1]);
    if (isNaN(userId)) {
      return bot.sendMessage(msg.chat.id, "❌ El ID del usuario no es válido.");
    }

    // optener valores opcionales de aprobaciones por ofertas
    var mesesOf = partes[2] ? Number(partes[2]) : 1;
    var precioOf = partes[3] ? Number(partes[3]) : null;

    // validaciones extra si quieres
    if (mesesOf !== null && isNaN(mesesOf)) {
      return bot.sendMessage(msg.chat.id, "❌ Los meses no son válidos.");
    }
    if (precioOf !== null && isNaN(precioOf)) {
      return bot.sendMessage(msg.chat.id, "❌ El precio no es válido.");
    }

    try {
      //1. Buscar usuario
      const usuario = await obtenerUsuarioPorTelegramId(userId);

      if (!usuario) {
        return bot.sendMessage(
          msg.chat.id,
          "❌ No se encontró el usuario en la base de datos.",
        );
      }
      //2. buscar pago pendiente
      const pagos = await obtenerPagosPorUsuario(usuario.id, "pendiente");
      if (!pagos || pagos.length === 0) {
        return bot.sendMessage(
          msg.chat.id,
          "⚠️ No se encontró ningún pago pendiente para este usuario!",
        );
      }

      // 3. Tomar el pago pendiente más reciente
      const pago = pagos[0];

      // 4. Obtener la suscripción relacionada con el pago
      const suscripcion = await obtenerSuscripcion(
        usuario.id,
        "id",
        pago.suscripcion_id,
      );

      if (!suscripcion) {
        return bot.sendMessage(
          msg.chat.id,
          "❌ Este usuario no tiene ninguna suscripción registrada.",
        );
      }
      if (
        suscripcion.estado !== "pendiente" ||
        suscripcion.estado !== "activa"
      ) {
        return bot.sendMessage(
          msg.chat.id,
          "❌ Este usuario no tiene ninguna suscripción pendiente o activa por aprobar.",
        );
      }

      const tipoPagoTexto =
        pago.tipo_pago === "renovacion" ? "RENOVACIÓN" : "NUEVA SUSCRIPCIÓN";

      const estaEnCanal = await verificarUsuarioEnCanal(userId); //false //si necesitas ver el enlace generado

      // =========================================================
      // 6. CALCULAR FECHAS
      // =========================================================

      const ahora = new Date();
      let fechaInicio;
      let fechaVencimiento;
      let nuevafecha = new Date();

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
          nuevafecha.setDate(
            vencimientoActual.getDate() +
              NEGOCIO.precios.mensual.dias * mesesOf,
          );
        } else {
          fechaInicio = ahora.getDate();

          fechaVencimiento = new Date(ahora);

          nuevafecha.setDate(
            fechaVencimiento.getDate() + NEGOCIO.precios.mensual.dias * mesesOf,
          );
        }
      } else {
        /*///////////////////////////
         * NUEVA SUSCRIPCIÓN
         *
         * Los 30 días comienzan desde el momento
         * en que el administrador aprueba el pago.
         */

        fechaInicio = ahora.getDate();

        fechaVencimiento = new Date(ahora);

        nuevafecha.setDate(
          fechaVencimiento.getDate() + NEGOCIO.precios.mensual.dias,
        );
      }

      // =========================================================
      // 7. ACTUALIZAR PAGO
      // =========================================================

      await actualizarPago(pago.id, "estado", "aprobado");
      if (precioOf !== null) {
        await actualizarPago(pago.id, "monto", precioOf);
      }
      // =========================================================
      // 8. ACTUALIZAR SUSCRIPCIÓN
      // =========================================================

      await actualizarSuscripcion(
        suscripcion.id,
        "fecha_vencimiento",
        nuevafecha,
      );
      await actualizarSuscripcion(suscripcion.id, "estado", "activa");

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
        • Expira en 24 horas.

        📅 Tu suscripción está activa hasta:
          ${fechalimit}`,
        );

        await sleep(1200);

        // 8. Avisar al administrador
        return bot.sendMessage(
          msg.chat.id,
          `✅ Pago aprobado correctamente.

        👤 Usuario: ${userId}
        ${usuario.nombre}

        🧾 Pago: ${pago.id}

        📋 Suscripción: ${suscripcion.id}

        💳 Tipo:
        ${tipoPagoTexto}

        📅 Vencimiento:
        ${nuevafecha.toLocaleString("es-MX")}`,
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
          ${nuevafecha.toLocaleString("es-MX")}

          🔄 Tu acceso al canal continúa activo.
          ¡Muchas gracias por seguir apoyando mi contenido! ❤️`,
        );

        //avisar al administrador
        return bot.sendMessage(
          msg.chat.id,
          `✅ Pago aprobado correctamente.

        👤 Usuario: ${userId} 
        ${usuario.nombre}

        🧾 Pago: ${pago.id}

        📋 Suscripción: ${suscripcion.id}

        💳 Tipo:
        ${tipoPagoTexto}

        📅 Vencimiento:
        ${nuevafecha.toLocaleString("es-MX")}`,
        );
      }
    } catch (error) {
      console.error("Error aprobando pago:", error);

      return bot.sendMessage(
        msg.chat.id,
        `❌ Ocurrió un error al aprobar el pago. Intenta nuevamente. Detalles:

        👤 Usuario: ${userId}

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
    //se manda a llamar la funcion que ahora es independiente de recordar pago y se le envia su user de telegram
    //-------------------------------------------------------------------------------------------
    const resultado = await recordarPago(bot, userId);

    if (resultado.enviado) {
      return bot.sendMessage(
        msg.chat.id,
        `✅ Recordatorio enviado correctamente.

    👤 Usuario de Telegram: ${resultado.userId}`,
      );
    }

    return bot.sendMessage(
      msg.chat.id,
      `❌ No fue posible enviar el recordatorio.

    👤 Usuario de Telegram: ${resultado.userId}
    ⚠️ Error: ${resultado.error}`,
    );
  });

  // ------------------------------------------------------
  // ELIMINAR
  // ------------------------------------------------------
  // El administrador elimina al usuario manualmente cuando lo considere necesario
  // Solo el admin puede y debe usar el comando mas el id de usuario

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
    if (userId == CONFIG.ADMIN_ID) {
      return bot.sendMessage(
        msg.chat.id,
        "🚫 No Puedes eliminar al Administrador del canal.",
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
    //mada a llamar funcion de eliminar-------------------------------------------
    const resultado = await eliminarUsuario(bot, userId);

    if (resultado.enviado) {
      return bot.sendMessage(
        msg.chat.id,
        `✅ Recordatorio enviado correctamente.

    👤 Usuario de Telegram: ${resultado.userId}`,
      );
    } else {
      return bot.sendMessage(
        msg.chat.id,
        `❌ No fue posible enviar el recordatorio.

    👤 Usuario de Telegram: ${resultado.userId}
    ⚠️ Error: ${resultado.error}`,
      );
    }
  });
};

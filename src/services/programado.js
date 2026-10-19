const cron = require("node-cron");
const { recordarPago, eliminarUsuario } = require("../handlers/functions");
const {
  actualizarSuscripcion,
  obtenerSuscripciones,
  obtenerSuscripcionesPorVencer,
} = require("../data/suscripciones");
const { obtenerUsuarioPorSuscripcionId } = require("../data/usuarios");

//funcion para iniciar el proceso de mantenimiento de cron
function iniciarMantenimiento(bot) {
  // Ejecutar cada hora
  cron.schedule(" */2 * * * *", async () => {
    console.log("===== MANTENIMIENTO DE SUSCRIPCIONES =====");
    // Asegúrate de normalizar las fechas o trabajar con rangos según tu motor de BD
    const ahora = new Date();
    console.log(ahora.toISOString());

    try {
      // =====================================================
      // 1. RECORDATORIOS: FALTA 1 DÍA
      // =====================================================

      /**
       * Envía el recordatorio de pago a los usuarios cuya
       * suscripción vence mañana, y marca cada una como enviada.
       *
       * supabase
       */

      // Rango: Desde este momento hasta dentro de 24 horas exactas
      const inicio = ahora;
      const fin = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);

      const porVencer = await obtenerSuscripcionesPorVencer(
        inicio.toISOString(),
        fin.toISOString(),
      );
      console.log(
        `Suscripciones encontradas para revisar recordatorios: ${porVencer.length}`,
      );

      for (const item of porVencer) {
        if (item.telegram_id) {
          try {
            const resultado = await recordarPago(bot, item.telegram_id);

            if (resultado.enviado) {
              console.log(
                `✅ Recordatorio enviado al usuario ${resultado.userId} : ${item.usuario_nombre}`,
              );
              // Marcar el recordatorio como enviado en Supabase.`
            } else {
              console.error(
                `❌ Falló el recordatorio para ${resultado.userId}: ${resultado.error}`,
              );
            }
            await actualizarSuscripcion(
              item.suscripcion_id,
              "recordatorio_enviado",
              "true",
            );
            console.log(
              `Recordatorio enviado con éxito al usuario ID: ${item.usuario_id} ${item.usuario_nombre}`,
            );
          } catch (error) {
            console.error(
              `Error enviando a suscripción ${item.suscripcion_id}:`,
              error,
            );
          }
        }
      }
    } catch (error) {
      console.error("===== ERROR MANTENIMIENTO =====");
      console.error(error);
    }

    try {
      // =====================================================
      // 2. SUSCRIPCIONES PENDIENTES QUE YA EXPIRARON
      // =====================================================

      const pendientes = await obtenerSuscripciones("estado", "pendiente");
      console.log(`Suscripciones Pendientes: ${pendientes.length}`);

      for (const suscripcion of pendientes || []) {
        var fechaVencimiento = new Date(suscripcion.fecha_vencimiento);
        //comparar fecha vencimiento si es menor o igual a este momento
        if (fechaVencimiento.getTime() <= ahora.getTime()) {
          //actualiza el estado de la suscripcion como expirada
          await actualizarSuscripcion(suscripcion.id, "estado", "expirada");

          console.log(
            `Suscripción pendiente ${suscripcion.id} marcada como expirada.`,
          );
        }
      }
    } catch (error) {
      console.error("Error al expirar suscripciones pendientes:", error);
    }

    try {
      // =====================================================
      // 3. SUSCRIPCIONES ACTIVAS QUE YA VENCIERON
      // =====================================================
      const vencidas = await obtenerSuscripciones("estado", "activa");
      console.log(`Suscripciones Activas detectadas: ${vencidas.length}`);
      for (const suscripcion of vencidas || []) {
        var fechaVencimiento = new Date(suscripcion.fecha_vencimiento);

        if (fechaVencimiento.getTime() <= ahora.getTime()) {
          const datosUsuario = await obtenerUsuarioPorSuscripcionId(
            suscripcion.id,
          );
          console.log(datosUsuario.telegram_id);
          var resultado = await eliminarUsuario(bot, datosUsuario.telegram_id);
          if (resultado.enviado) {
            await actualizarSuscripcion(suscripcion.id, "estado", "vencida");

            console.log(
              `Suscripción activa ${suscripcion.id} ya se ha vencido y no fue renovada, se ha eliminado del canal al usuario ${datosUsuario.usuario_nombre}.`,
            );
          } else {
            console.log(`No se realizo el proceso: ${resultado.error}`);
          }
        }
      }
    } catch (error) {
      console.error("Error al expirar suscripciones pendientes:", error);
    }
  });
}

module.exports = {
  iniciarMantenimiento,
};

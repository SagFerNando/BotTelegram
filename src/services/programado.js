const cron = require("node-cron");
const supabase = require("../data/supabase");
const CONFIG = require("../config/config");
const { recordarPago } = require("../handlers/admin");
const {
  eliminarUsuarioDelCanal,
  verificarUsuarioEnCanal,
} = require("./telegram");
const {
  actualizarSuscripcion,
  obtenerSuscripcion,
  obtenerSuscripciones,
  obtenerSuscripcionesPorVencer,
} = require("../data/suscripciones");

//funcion para iniciar el proceso de mantenimiento de cron
function iniciarMantenimiento() {
  // Ejecutar cada hora
  cron.schedule(" 44 0 * * *", async () => {
    console.log("===== MANTENIMIENTO DE SUSCRIPCIONES =====");

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

      // Asegúrate de normalizar las fechas o trabajar con rangos según tu motor de BD
      const ahora = new Date();
      // Rango: Desde este momento hasta dentro de 24 horas exactas
      const inicio = ahora;
      const fin = new Date(ahora);
      fin.setHours(fin.getHours() + 24);

      const porvencer = await obtenerSuscripcionesPorVencer(inicio, fin);
      console.log(
        `[Cron Hora ${ahora.getHours()}:00] Registros a procesar: ${porvencer.length}`,
      );

      for (const item of porvencer) {
        if (item.telegram_id) {
          try {
            await recordarPago(item.telegram_id);
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
  });
}

module.exports = {
  iniciarMantenimiento,
};

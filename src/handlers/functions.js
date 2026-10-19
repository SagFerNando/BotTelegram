const CONFIG = require("../config/config");
const NEGOCIO = require("../config/globals");

const {
  verificarUsuarioEnCanal,
  eliminarUsuarioDelCanal,
} = require("../services/telegram");
//-----------------------------------------------------------
//FUNCION INDEPENDIENTE DE RECORDAR PAGO Y ELIMINAR USUARIO
//-----------------------------------------------------------
async function eliminarUsuario(bot, userId) {
  try {
    const miembro = await verificarUsuarioEnCanal(userId);
    // Se verifica si el usuario esta en el canal para poder eliminarlo correctamente
    if (!miembro) {
      return {
        enviado: false,
        userId,
        error: "No se pudo eliminar al usuario, porque ya no esta en el canal!",
      };
    }

    const result = await eliminarUsuarioDelCanal(userId);
    if (!result.eliminado) {
      console.log(
        `❌ Error al eliminar al usuario ${userId}.\n\n${result.mensaje}`,
      );
      return {
        enviado: false,
        userId: result.userId,
        error: result.mensaje,
      };
    } else {
      //Una vez eliminado se le envia al usuario un mensaje informandole que su suscripcion caduco.
      await bot.sendMessage(
        userId,
        `⚠️ Tu acceso al canal premium ha finalizado.

Si deseas continuar disfrutando del contenido, puedes realizar nuevamente tu pago precionando /start`,
      );

      return {
        enviado: true,
        userId,
        error: null,
      };
    }
  } catch (error) {
    console.error(`Error al eliminar ${userId}:`, error);

    return {
      enviado: false,
      userId,
      error: error.message,
    };
  }
}

async function recordarPago(bot, userId) {
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
                callback_data: "cancelar",
              },
            ],
          ],
        },
      },
    );

    return {
      enviado: true,
      userId,
      error: null,
    };
  } catch (error) {
    console.error(`Error enviando recordatorio a ${userId}:`, error);

    return {
      enviado: false,
      userId,
      error: error.message,
    };
  }
}
module.exports = {
  recordarPago,
  eliminarUsuario,
};

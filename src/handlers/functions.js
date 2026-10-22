const CONFIG = require("../config/config");
const NEGOCIO = require("../config/globals");

const {
  verificarUsuarioEnCanal,
  eliminarUsuarioDelCanal,
} = require("../services/telegram");
//-------------------------------------------------------------
///FUNCION DE OFERTAS DISPONIBLES
//---------------------------------------------------------
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
                callback_data: "cancelar_renovacion",
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
  revisarOfertas,
  recordarPago,
  eliminarUsuario,
};

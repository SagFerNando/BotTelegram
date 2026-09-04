require("dotenv").config();

const CONFIG = {
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
  ADMIN_ID: Number(process.env.ADMIN_ID),
  PREMIUM_CHANNEL_ID: Number(process.env.PREMIUM_CHANNEL_ID),

  PAYMENT_CARD: Number(process.env.PAYMENT_CARD),
  PAYMENT_HOLDER: process.env.PAYMENT_HOLDER,
  PAYPAL_URL: process.env.PAYPAL_URL,
};
module.exports = CONFIG;

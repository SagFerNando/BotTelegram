require("dotenv").config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const ADMIN_ID = Number(process.env.ADMIN_ID);
const PREMIUM_CHANNEL_ID = Number(process.env.PREMIUM_CHANNEL_ID);

module.exports = {
  TELEGRAM_TOKEN,
  ADMIN_ID,
  PREMIUM_CHANNEL_ID,
};

const TeleBot = require("telebot");
const CONFIG = require("./src/config/config");

const bot = new TeleBot({
  token: CONFIG.TELEGRAM_TOKEN,
});

// Cargar handlers
require("./src/handlers/users")(bot);
require("./src/handlers/admin")(bot);

// Iniciar bot
bot.start();

console.log("🤖 Bot iniciado correctamente...");

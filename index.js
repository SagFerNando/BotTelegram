const TeleBot = require("telebot");
const CONFIG = require("./src/config/config");
const supabase = require("./src/data/supabase");
const bot = new TeleBot({
  token: CONFIG.TELEGRAM_TOKEN,
});

async function probarSupabase() {
  const { data, error } = await supabase.from("usuarios").select("*").limit(1);

  if (error) {
    console.error("Error conectando con Supabase:");
    console.error(error);
    return;
  }

  console.log("Supabase conectado correctamente.");
  //console.log(data);
}

probarSupabase();

// Cargar handlers
require("./src/handlers/users")(bot);
require("./src/handlers/admin")(bot);

// Iniciar bot
bot.start();

console.log("🤖 Bot iniciado correctamente...");

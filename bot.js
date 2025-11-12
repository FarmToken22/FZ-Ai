import { Telegraf } from 'telegraf';

const bot = new Telegraf(8398432933:AAHenqJAHK_SrKHz23d-bYRgzFk0GL7WEto || 'YOUR_BOT_TOKEN_HERE');

// যখন ইউজার /start দেয়
bot.start((ctx) => {
  const name = ctx.from.first_name || "User";
  ctx.reply(
    `👋 Welcome ${name}!\n\n🌾 *FarmZone* is ready for you.\nTap below to start mining 🚀`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🚀 Open FarmZone App",
              web_app: {
                url: "https://farmtoken22.github.io/FarmZone-Telegram-bot/"
              }
            }
          ]
        ]
      }
    }
  );
});

bot.launch();
console.log("✅ FarmZone Bot is running...");

// গ্রেসফুল শাটডাউন
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
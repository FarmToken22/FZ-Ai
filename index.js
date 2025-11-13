const { Telegraf } = require('telegraf');
const express = require('express');

// Express server for health check (Render এর জন্য দরকার)
const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://farmtoken22.github.io/FarmZone-Telegram-bot/';

// Bot instance
const bot = new Telegraf(BOT_TOKEN);

// Express routes
app.get('/', (req, res) => {
  res.send('✅ FarmZone Telegram Bot is running!');
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    bot: 'FarmZone',
    timestamp: new Date().toISOString() 
  });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`🌐 Express server running on port ${PORT}`);
});

// ========================================
// BOT COMMANDS
// ========================================

// /start command
bot.start((ctx) => {
  const name = ctx.from.first_name || "User";
  const userId = ctx.from.id;
  const username = ctx.from.username || "N/A";
  
  console.log(`✅ New user started bot:`);
  console.log(`   Name: ${name}`);
  console.log(`   ID: ${userId}`);
  console.log(`   Username: @${username}`);
  
  ctx.reply(
    `👋 Welcome *${name}*!\n\n` +
    `🌾 *FarmZone* - Start Mining Crypto Tokens!\n\n` +
    `✨ *Features:*\n` +
    `💰 Mine tokens every 8 hours\n` +
    `👥 Refer friends & earn bonuses\n` +
    `🎁 Daily bonus rewards\n` +
    `💎 Withdraw to your wallet\n\n` +
    `🚀 Tap the button below to start earning!`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🚀 Open FarmZone App",
              web_app: { url: WEB_APP_URL }
            }
          ],
          [
            { text: "📊 My Stats", callback_data: "stats" },
            { text: "❓ Help", callback_data: "help" }
          ],
          [
            { text: "👥 Invite Friends", callback_data: "invite" }
          ]
        ]
      }
    }
  );
});

// /help command
bot.help((ctx) => {
  ctx.reply(
    `*📖 FarmZone Help Guide*\n\n` +
    `*How to use:*\n` +
    `1️⃣ Click "Open FarmZone App" button\n` +
    `2️⃣ Login with your email\n` +
    `3️⃣ Start mining tokens\n` +
    `4️⃣ Claim rewards every 8 hours\n` +
    `5️⃣ Refer friends to earn more\n\n` +
    `*Commands:*\n` +
    `/start - Open the app\n` +
    `/help - Show this help\n` +
    `/stats - View your statistics\n\n` +
    `💡 Need support? Contact @YourSupportUsername`,
    { parse_mode: "Markdown" }
  );
});

// /stats command
bot.command('stats', (ctx) => {
  ctx.reply(
    '📊 *Your Statistics*\n\n' +
    'Open the FarmZone app to view your detailed stats:\n' +
    '• Current Balance\n' +
    '• Total Mined\n' +
    '• Referral Count\n' +
    '• Level Progress',
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📊 View Full Stats",
              web_app: { url: WEB_APP_URL }
            }
          ]
        ]
      }
    }
  );
});

// ========================================
// CALLBACK QUERIES (Button clicks)
// ========================================

// Stats button
bot.action('stats', (ctx) => {
  ctx.answerCbQuery('📊 Opening your stats...');
  ctx.reply(
    '📊 *Your Statistics*\n\n' +
    'Open the app to see:\n' +
    '• Balance & rewards\n' +
    '• Mining progress\n' +
    '• Referral earnings',
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🚀 Open App",
              web_app: { url: WEB_APP_URL }
            }
          ]
        ]
      }
    }
  );
});

// Help button
bot.action('help', (ctx) => {
  ctx.answerCbQuery('❓ Showing help...');
  ctx.reply(
    '*❓ How to use FarmZone:*\n\n' +
    '1️⃣ Click "Open FarmZone App"\n' +
    '2️⃣ Login with your email\n' +
    '3️⃣ Start mining crypto tokens\n' +
    '4️⃣ Claim rewards every 8 hours\n' +
    '5️⃣ Refer friends to earn bonuses\n\n' +
    '*Tips:*\n' +
    '• Don\'t forget to claim daily bonus\n' +
    '• More referrals = more rewards\n' +
    '• Level up by mining more\n\n' +
    '💡 Need help? Contact support',
    { parse_mode: "Markdown" }
  );
});

// Invite button
bot.action('invite', (ctx) => {
  ctx.answerCbQuery('👥 Share with friends!');
  
  const botUsername = ctx.botInfo.username;
  const userId = ctx.from.id;
  const shareText = `🌾 Join me on FarmZone and start mining crypto!\n\n` +
                   `💰 Free tokens every 8 hours\n` +
                   `🎁 Bonus for new users\n\n` +
                   `Start now: https://t.me/${botUsername}?start=ref_${userId}`;
  
  const shareUrl = `https://t.me/share/url?url=https://t.me/${botUsername}?start=ref_${userId}&text=${encodeURIComponent('🌾 Join FarmZone and start mining crypto! 💰')}`;
  
  ctx.reply(
    '👥 *Invite Friends & Earn More!*\n\n' +
    'Share your referral link:\n\n' +
    `\`https://t.me/${botUsername}?start=ref_${userId}\`\n\n` +
    '🎁 *Earn 5 FZ for each friend!*',
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📤 Share on Telegram",
              url: shareUrl
            }
          ]
        ]
      }
    }
  );
});

// ========================================
// ERROR HANDLING
// ========================================

bot.catch((err, ctx) => {
  console.error(`❌ Error for ${ctx.updateType}:`, err);
  ctx.reply('⚠️ An error occurred. Please try again later.');
});

// ========================================
// LAUNCH BOT
// ========================================

bot.launch()
  .then(() => {
    console.log('✅ FarmZone Telegram Bot started successfully!');
    console.log(`🤖 Bot Username: @${bot.botInfo.username}`);
    console.log(`🌐 Web App URL: ${WEB_APP_URL}`);
    console.log(`📅 Started at: ${new Date().toISOString()}`);
  })
  .catch((err) => {
    console.error('❌ Failed to start bot:', err);
    process.exit(1);
  });

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('⏹️ Stopping bot (SIGINT)...');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  console.log('⏹️ Stopping bot (SIGTERM)...');
  bot.stop('SIGTERM');
});
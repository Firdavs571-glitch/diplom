const { Telegraf, Markup } = require('telegraf');
const { readDB, writeDB, generateId } = require('../db');
const { getAIRecommendations }        = require('../openai');

const bot      = new Telegraf(process.env.BOT_TOKEN);
const sessions = {};  // per-user registration/flow state

// ─── Keyboard helpers ──────────────────────────────────────────────────────

const mainMenu = (isAdmin = false) => Markup.inlineKeyboard([
  [{ text: 'Tavsiyalar olish',     callback_data: 'get_recs'      },
   { text: 'Profilim',             callback_data: 'my_profile'    }],
  [{ text: 'Parolni yangilash',    callback_data: 'change_pass'   }],
  ...(isAdmin ? [[{ text: 'Admin paneli', callback_data: 'admin_menu' }]] : []),
]);

const adminMenu = () => Markup.inlineKeyboard([
  [{ text: 'Barcha foydalanuvchilar', callback_data: 'adm_users'     }],
  [{ text: 'Statistika',             callback_data: 'adm_stats'     },
   { text: 'Broadcast xabar',        callback_data: 'adm_broadcast' }],
  [{ text: 'Asosiy menyu',           callback_data: 'back_main'     }],
]);

const genderKb = () => Markup.inlineKeyboard([
  [{ text: 'Erkak', callback_data: 'g_erkak' }, { text: 'Ayol', callback_data: 'g_ayol' }],
]);

const INTERESTS = ['IT va Dasturlash','Biznes',"San'at",'Tibbiyot',"Ta'lim",'Sport','Musiqa','Sayohat','Oziq-ovqat','Fan'];
const interestKb = (sel = []) => Markup.inlineKeyboard([
  ...INTERESTS.map(i => [{ text: sel.includes(i) ? `✓ ${i}` : i, callback_data: `int_${i}` }]),
  [{ text: 'Tasdiqlash', callback_data: 'int_done' }],
]);

const userActionsKb = (uid, isBlocked) => Markup.inlineKeyboard([
  [{ text: isBlocked ? 'Blokdan chiqarish' : 'Bloklash',
     callback_data: isBlocked ? `adm_unblock_${uid}` : `adm_block_${uid}` }],
  [{ text: "Parolni tiklash", callback_data: `adm_resetpass_${uid}` }],
  [{ text: "O'chirish",       callback_data: `adm_del_${uid}`        }],
  [{ text: '← Orqaga',        callback_data: 'adm_users'            }],
]);

// ─── /start ────────────────────────────────────────────────────────────────

bot.start(async (ctx) => {
  const chatId = String(ctx.chat.id);
  const db     = readDB();

  // Admin bootstrap
  if (chatId === process.env.ADMIN_ID) {
    let adm = db.users.find(u => u.chatId === chatId);
    if (!adm) {
      adm = {
        _id: generateId(), username: 'admin', password: 'admin123',
        chatId, role: 'admin', isBlocked: false, demographics: {},
        passwordHistory: [{ password: 'admin123', changedAt: new Date().toISOString() }],
        createdAt: new Date().toISOString(),
      };
      db.users.push(adm);
      writeDB(db);
    }
    return ctx.replyWithHTML(
      `<b>Admin paneliga xush kelibsiz.</b>\n\nSayt login: <code>admin</code> / <code>admin123</code>`,
      mainMenu(true)
    );
  }

  // Returning user
  const user = db.users.find(u => u.chatId === chatId);
  if (user) {
    if (user.isBlocked) return ctx.reply('Hisobingiz vaqtincha bloklangan. Batafsil ma\'lumot uchun admin bilan bog\'laning.');
    return ctx.replyWithHTML(`Xush kelibsiz, <b>${user.username}</b>.`, mainMenu());
  }

  // New user — start registration
  sessions[chatId] = { step: 'username', data: {} };
  ctx.replyWithHTML(
    `<b>TavsiyaAI ga xush kelibsiz.</b>\n\n` +
    `Tizim demografik ma'lumotlaringiz asosida AI yordamida shaxsiy tavsiyalar taqdim etadi.\n\n` +
    `Boshlash uchun <b>login</b> kiriting (3–20 lotin belgisi):`
  );
});

// ─── Text handler ──────────────────────────────────────────────────────────

bot.on('text', async (ctx) => {
  const chatId = String(ctx.chat.id);
  const text   = ctx.message.text.trim();
  const sess   = sessions[chatId];
  if (!sess) return;

  const db = readDB();

  // ── Registration flow ──────────────────────────────────────────────────

  if (sess.flow === 'register' || !sess.flow) {
    if (sess.step === 'username') {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(text))
        return ctx.reply('Noto\'g\'ri format. Faqat lotin harflari, raqamlar va _ (3–20 belgi):');
      if (db.users.find(u => u.username === text.toLowerCase()))
        return ctx.reply('Bu login band. Boshqa birini tanlang:');
      sess.data.username = text.toLowerCase();
      sess.step = 'password';
      return ctx.replyWithHTML('<b>Parol kiriting</b> (kamida 6 belgi):');
    }
    if (sess.step === 'password') {
      if (text.length < 6) return ctx.reply('Parol kamida 6 ta belgi:');
      sess.data.password = text;
      sess.step = 'age';
      return ctx.replyWithHTML('<b>Yoshingizni kiriting</b> (masalan: 24):');
    }
    if (sess.step === 'age') {
      const age = parseInt(text);
      if (isNaN(age) || age < 5 || age > 100) return ctx.reply('To\'g\'ri yosh kiriting (5–100):');
      sess.data.age = age;
      sess.step = 'gender';
      return ctx.replyWithHTML('<b>Jinsingizni tanlang:</b>', genderKb());
    }
    if (sess.step === 'location') {
      sess.data.location = text;
      sess.step = 'profession';
      return ctx.replyWithHTML('<b>Kasbingiz yoki ta\'lim yo\'nalishingiz:</b>');
    }
    if (sess.step === 'profession') {
      sess.data.profession = text;
      sess.step = 'goal';
      return ctx.replyWithHTML('<b>Asosiy maqsadingiz:</b>\n(masalan: Yangi ko\'nikma, Daromad oshirish)');
    }
    if (sess.step === 'goal') {
      sess.data.goal = text;
      sess.step = 'interests';
      sess.data.interests = [];
      return ctx.replyWithHTML('<b>Qiziqishlaringizni tanlang</b> (bir nechtasini belgilang):', interestKb());
    }
  }

  // ── Change password flow ───────────────────────────────────────────────

  if (sess.flow === 'change_pass') {
    if (sess.step === 'old_pass') {
      const user = db.users.find(u => u.chatId === chatId);
      if (!user || user.password !== text)
        return ctx.reply('Eski parol noto\'g\'ri. Qayta kiriting:');
      sess.data.old = text;
      sess.step = 'new_pass';
      return ctx.reply('Yangi parolni kiriting (kamida 6 belgi):');
    }
    if (sess.step === 'new_pass') {
      if (text.length < 6) return ctx.reply('Kamida 6 ta belgi:');
      const idx = db.users.findIndex(u => u.chatId === chatId);
      db.users[idx].password = text;
      if (!db.users[idx].passwordHistory) db.users[idx].passwordHistory = [];
      db.users[idx].passwordHistory.push({ password: text, changedAt: new Date().toISOString() });
      writeDB(db);
      delete sessions[chatId];
      return ctx.replyWithHTML('Parol muvaffaqiyatli yangilandi.', mainMenu());
    }
  }

  // ── Admin broadcast flow ───────────────────────────────────────────────

  if (sess.flow === 'broadcast') {
    const targets = db.users.filter(u => u.role !== 'admin' && u.chatId && !u.isBlocked);
    let sent = 0, failed = 0;
    const loadMsg = await ctx.reply(`${targets.length} ta foydalanuvchiga yuborilmoqda...`);
    for (const u of targets) {
      try { await bot.telegram.sendMessage(u.chatId, `Tizim xabari:\n\n${text}`); sent++; }
      catch { failed++; }
    }
    await ctx.deleteMessage(loadMsg.message_id).catch(() => {});
    delete sessions[chatId];
    return ctx.replyWithHTML(`Natija: <b>${sent}</b> ta yuborildi, <b>${failed}</b> ta xatolik.`, adminMenu());
  }

  // ── Admin reset password flow ──────────────────────────────────────────

  if (sess.flow === 'reset_pass') {
    if (text.length < 6) return ctx.reply('Kamida 6 ta belgi:');
    const idx = db.users.findIndex(u => u._id === sess.targetId);
    if (idx === -1) { delete sessions[chatId]; return ctx.reply('Foydalanuvchi topilmadi.'); }
    db.users[idx].password = text;
    if (!db.users[idx].passwordHistory) db.users[idx].passwordHistory = [];
    db.users[idx].passwordHistory.push({ password: text, changedAt: new Date().toISOString(), resetBy: 'admin' });
    writeDB(db);
    delete sessions[chatId];
    // Notify user
    if (db.users[idx].chatId) {
      bot.telegram.sendMessage(db.users[idx].chatId, `Admin tomonidan parolingiz yangilandi. Yangi parolingiz: ${text}`).catch(() => {});
    }
    return ctx.replyWithHTML(`Parol yangilandi: <code>${text}</code>`, adminMenu());
  }
});

// ─── Callback handler ──────────────────────────────────────────────────────

bot.on('callback_query', async (ctx) => {
  const chatId = String(ctx.chat.id);
  const data   = ctx.callbackQuery.data;
  const db     = readDB();
  const user   = db.users.find(u => u.chatId === chatId);
  const sess   = sessions[chatId];

  await ctx.answerCbQuery().catch(() => {});

  // ── Registration callbacks ─────────────────────────────────────────────

  if (data === 'g_erkak' || data === 'g_ayol') {
    if (!sess) return;
    sess.data.gender = data === 'g_erkak' ? 'Erkak' : 'Ayol';
    sess.step = 'location';
    return ctx.editMessageText('Shahar yoki viloyatingizni kiriting:', { parse_mode: 'HTML' });
  }
  if (data.startsWith('int_') && !data.startsWith('int_done')) {
    if (!sess) return;
    const interest = data.replace('int_', '');
    const idx = sess.data.interests.indexOf(interest);
    if (idx === -1) sess.data.interests.push(interest);
    else sess.data.interests.splice(idx, 1);
    return ctx.editMessageReplyMarkup(interestKb(sess.data.interests).reply_markup);
  }
  if (data === 'int_done') {
    if (!sess) return;
    if (!sess.data.interests?.length) return ctx.answerCbQuery('Kamida bittasini tanlang', { show_alert: true });
    const newUser = {
      _id: generateId(),
      username: sess.data.username,
      password: sess.data.password,
      chatId, role: 'user', isBlocked: false,
      demographics: {
        age: sess.data.age, gender: sess.data.gender,
        location: sess.data.location, profession: sess.data.profession,
        goal: sess.data.goal, interests: sess.data.interests,
      },
      passwordHistory: [{ password: sess.data.password, changedAt: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    writeDB(db);
    delete sessions[chatId];
    return ctx.editMessageText(
      `Profil yaratildi.\n\nLogin: ${newUser.username}\nParol: ${newUser.password}\n\nBu ma'lumotlar bilan saytga ham kirishingiz mumkin.`,
      mainMenu()
    );
  }

  // ── Main menu actions ──────────────────────────────────────────────────

  if (data === 'back_main') {
    delete sessions[chatId];
    return ctx.editMessageText('Asosiy menyu:', mainMenu(chatId === process.env.ADMIN_ID));
  }

  if (data === 'get_recs') {
    if (!user) return ctx.reply('Avval /start orqali ro\'yxatdan o\'ting.');
    if (user.isBlocked) return ctx.reply('Hisobingiz bloklangan.');
    const d = user.demographics || {};
    if (!d.age && !d.interests?.length) return ctx.reply('Profil to\'ldirilmagan. /start ni bosing.');
    const loadMsg = await ctx.reply('AI tahlil qilmoqda...');
    try {
      const recs = await getAIRecommendations(d);
      await ctx.deleteMessage(loadMsg.message_id).catch(() => {});
      let txt = `<b>${recs.length} ta tavsiya tayyorlandi:</b>\n\n`;
      recs.forEach((r, i) => {
        txt += `<b>${i+1}. ${r.title}</b>\nKategoriya: ${r.category}\n${r.description}\n`;
        if (r.why) txt += `<i>${r.why}</i>\n`;
        if (r.link) txt += `Havola: ${r.link}\n`;
        txt += '\n';
      });
      await ctx.replyWithHTML(txt, mainMenu(chatId === process.env.ADMIN_ID));
    } catch {
      await ctx.deleteMessage(loadMsg.message_id).catch(() => {});
      ctx.reply('AI xatolik berdi. Qayta urinib ko\'ring.', mainMenu());
    }
    return;
  }

  if (data === 'my_profile') {
    if (!user) return ctx.reply('Avval /start orqali ro\'yxatdan o\'ting.');
    const d = user.demographics || {};
    return ctx.replyWithHTML(
      `<b>Profil ma'lumotlari:</b>\n\n` +
      `Username: ${user.username}\n` +
      `Holat: ${user.isBlocked ? 'Bloklangan' : 'Faol'}\n` +
      `Yosh: ${d.age || '—'}\nJins: ${d.gender || '—'}\n` +
      `Joylashuv: ${d.location || '—'}\nKasb: ${d.profession || '—'}\n` +
      `Maqsad: ${d.goal || '—'}\nQiziqishlar: ${d.interests?.join(', ') || '—'}`,
      mainMenu(chatId === process.env.ADMIN_ID)
    );
  }

  if (data === 'change_pass') {
    if (!user) return ctx.reply('Avval /start orqali ro\'yxatdan o\'ting.');
    sessions[chatId] = { flow: 'change_pass', step: 'old_pass', data: {} };
    return ctx.reply('Eski parolingizni kiriting:');
  }

  // ── Admin menu ─────────────────────────────────────────────────────────

  if (data === 'admin_menu') {
    if (chatId !== process.env.ADMIN_ID) return;
    return ctx.editMessageText('Admin boshqaruvi:', adminMenu());
  }

  if (data === 'adm_stats') {
    if (chatId !== process.env.ADMIN_ID) return;
    const users   = db.users.filter(u => u.role !== 'admin');
    const blocked = users.filter(u => u.isBlocked).length;
    const botU    = users.filter(u => u.chatId).length;
    const now     = Date.now();
    const week    = users.filter(u => now - new Date(u.createdAt) < 7*864e5).length;
    const genders = {};
    users.forEach(u => { const g = u.demographics?.gender || 'Noaniq'; genders[g] = (genders[g]||0)+1; });
    const locations = {};
    users.forEach(u => { const l = u.demographics?.location || 'Noaniq'; locations[l] = (locations[l]||0)+1; });
    let txt = `<b>Statistika:</b>\n\n`;
    txt += `Jami: ${users.length} ta foydalanuvchi\n`;
    txt += `Bloklangan: ${blocked}\nBot orqali: ${botU}\nOxirgi 7 kun: ${week}\n\n`;
    txt += `<b>Jins:</b>\n` + Object.entries(genders).map(([k,v]) => `  ${k}: ${v}`).join('\n') + '\n\n';
    txt += `<b>Hudud (top 5):</b>\n` + Object.entries(locations).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v]) => `  ${k}: ${v}`).join('\n');
    return ctx.replyWithHTML(txt, adminMenu());
  }

  if (data === 'adm_broadcast') {
    if (chatId !== process.env.ADMIN_ID) return;
    const targets = db.users.filter(u => u.role !== 'admin' && u.chatId && !u.isBlocked);
    sessions[chatId] = { flow: 'broadcast', data: {} };
    return ctx.reply(`${targets.length} ta foydalanuvchiga yubormoqchi bo'lgan xabaringizni kiriting:`);
  }

  if (data === 'adm_users') {
    if (chatId !== process.env.ADMIN_ID) return;
    const users = db.users.filter(u => u.role !== 'admin').slice(0, 20);
    const btns  = users.map((u, i) => [{
      text: `${i+1}. ${u.username} ${u.isBlocked ? '[Bloklangan]' : ''}`,
      callback_data: `adm_user_${u._id}`
    }]);
    btns.push([{ text: '← Orqaga', callback_data: 'admin_menu' }]);
    return ctx.editMessageText(`Foydalanuvchilar (${users.length} ta):`, Markup.inlineKeyboard(btns));
  }

  if (data.startsWith('adm_user_')) {
    if (chatId !== process.env.ADMIN_ID) return;
    const uid  = data.replace('adm_user_', '');
    const u    = db.users.find(x => x._id === uid);
    if (!u) return ctx.reply('Topilmadi.');
    const d    = u.demographics || {};
    const hist = (u.passwordHistory || []).map((p, i) =>
      `  ${i+1}. ${p.password}${p.resetBy === 'admin' ? ' (admin)' : ''} — ${new Date(p.changedAt).toLocaleDateString('uz')}`
    ).join('\n') || '  —';
    const txt =
      `<b>${u.username}</b>\n\n` +
      `Holat: ${u.isBlocked ? 'Bloklangan' : 'Faol'}\n` +
      `Joriy parol: <code>${u.password}</code>\n` +
      `Chat ID: ${u.chatId || '—'}\n` +
      `Yosh: ${d.age||'—'} | Jins: ${d.gender||'—'}\n` +
      `Joylashuv: ${d.location||'—'}\nKasb: ${d.profession||'—'}\n` +
      `Qiziqishlar: ${d.interests?.join(', ')||'—'}\n\n` +
      `<b>Parol tarixi:</b>\n${hist}`;
    return ctx.replyWithHTML(txt, userActionsKb(uid, u.isBlocked));
  }

  if (data.startsWith('adm_block_')) {
    if (chatId !== process.env.ADMIN_ID) return;
    const uid = data.replace('adm_block_', '');
    const idx = db.users.findIndex(u => u._id === uid);
    if (idx === -1) return ctx.reply('Topilmadi.');
    db.users[idx].isBlocked = true;
    db.users[idx].blockedAt = new Date().toISOString();
    writeDB(db);
    if (db.users[idx].chatId)
      bot.telegram.sendMessage(db.users[idx].chatId, 'Hisobingiz admin tomonidan vaqtincha bloklandi.').catch(() => {});
    return ctx.editMessageText(`${db.users[idx].username} bloklandi.`, adminMenu());
  }

  if (data.startsWith('adm_unblock_')) {
    if (chatId !== process.env.ADMIN_ID) return;
    const uid = data.replace('adm_unblock_', '');
    const idx = db.users.findIndex(u => u._id === uid);
    if (idx === -1) return ctx.reply('Topilmadi.');
    db.users[idx].isBlocked = false;
    db.users[idx].blockedAt = null;
    writeDB(db);
    if (db.users[idx].chatId)
      bot.telegram.sendMessage(db.users[idx].chatId, 'Hisobingiz tiklandi. Xizmatdan foydalanishingiz mumkin.').catch(() => {});
    return ctx.editMessageText(`${db.users[idx].username} blokdan chiqarildi.`, adminMenu());
  }

  if (data.startsWith('adm_resetpass_')) {
    if (chatId !== process.env.ADMIN_ID) return;
    const uid = data.replace('adm_resetpass_', '');
    sessions[chatId] = { flow: 'reset_pass', targetId: uid, data: {} };
    return ctx.reply('Yangi parolni kiriting:');
  }

  if (data.startsWith('adm_del_')) {
    if (chatId !== process.env.ADMIN_ID) return;
    const uid = data.replace('adm_del_', '');
    const u   = db.users.find(x => x._id === uid);
    if (!u || u.role === 'admin') return ctx.reply('O\'chirib bo\'lmaydi.');
    if (u.chatId)
      bot.telegram.sendMessage(u.chatId, 'Hisobingiz admin tomonidan o\'chirildi.').catch(() => {});
    db.users = db.users.filter(x => x._id !== uid);
    writeDB(db);
    return ctx.editMessageText(`${u.username} hisobi o'chirildi.`, adminMenu());
  }
});

module.exports = bot;

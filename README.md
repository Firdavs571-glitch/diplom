# TavsiyaAI — AI-Powered Demographic Recommendation System

Demographic ma'lumotlarga asoslanib OpenAI yordamida shaxsiy tavsiyalar beruvchi tizim.  
Veb-sayt **va** Telegram bot orqali ishlaydi.

## Features

- JWT asosida autentifikatsiya (login/ro'yxatdan o'tish)
- 3 bosqichli ro'yxatdan o'tish (demografik profil)
- OpenAI GPT asosida shaxsiy tavsiyalar
- Admin panel: statistika, broadcast, foydalanuvchilarni bloklash/o'chirish, parol tarixi
- Telegram bot: to'liq funksionallik (sayt bilan sinxron)
- Foydalanuvchilar parolini yangilash imkoniyati

## Tech Stack

- **Backend**: Node.js, Express.js
- **Bot**: Telegraf.js
- **AI**: OpenAI GPT-3.5-turbo
- **Database**: JSON file (db.json)
- **Frontend**: React + Vite
- **Deployment**: Render.com

## Local Development

```bash
# Backend + Bot
cd backend && npm install && node server.js

# Frontend
cd frontend && npm install && npm run dev
```

## Render Deployment

1. GitHub reposini Render.com ga ulang
2. **Build Command**: `npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend`
3. **Start Command**: `node backend/server.js`
4. **Environment Variables** qo'shing (Render dashboard → Environment):
   - `BOT_TOKEN` — Telegram bot token
   - `ADMIN_ID` — Admin Telegram chat ID
   - `JWT_SECRET` — Ixtiyoriy uzun string
   - `OPENAI_API_KEY` — OpenAI API key

## Environment Variables

```env
PORT=5000
BOT_TOKEN=your_telegram_bot_token
ADMIN_ID=your_telegram_chat_id
JWT_SECRET=your_secret_key
OPENAI_API_KEY=your_openai_key
```

## Admin Access

Bot orqali `/start` → Admin menyu avtomatik ochiladi  
Sayt: Login `admin` / Parol `admin123`

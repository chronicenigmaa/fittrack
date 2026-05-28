# FitTrack — Gym + Calories Tracker

## Setup Instructions

### 1. Backend (Railway)

1. Go to railway.app → New Project → Deploy from GitHub (or local)
2. Add a **PostgreSQL** plugin to your project
3. Create a new service for the backend, set root to `/backend`
4. Set environment variables in Railway:
   ```
   DATABASE_URL = (auto-filled by Railway PostgreSQL plugin)
   OPENAI_API_KEY = sk-your-openai-key
   ```
5. Railway auto-detects `package.json` and runs `npm start`
6. Copy your Railway backend URL (e.g. `https://fittrack-production.up.railway.app`)

### 2. Frontend (Vercel)

1. Go to vercel.com → New Project → Import your repo
2. Set **Root Directory** to `frontend`
3. Add Environment Variable:
   ```
   REACT_APP_API_URL = https://your-railway-url.up.railway.app
   ```
4. Deploy — Vercel gives you a URL like `https://fittrack.vercel.app`

### 3. Install on Android (PWA)

1. Open your Vercel URL in **Chrome** on your phone
2. Tap the 3-dot menu → "Add to Home Screen"
3. The app installs like a native app with offline support

---

## Features Included
- Weekly workout planner (per day)
- 50+ exercises database (chest, back, legs, arms, cardio, etc.)
- Log sets × reps × weight with auto volume tracking
- Exercise progress charts over time
- Estimated workout duration
- AI exercise variation suggestions (OpenAI)
- Calendar view for on/off days
- Daily workout & cardio reminders (browser notifications)
- Pakistani food database (30+ foods pre-loaded)
- Food diary with macro tracking (P/C/F/calories)
- Water intake tracker
- Barcode scanner (Open Food Facts — works for Pakistan)
- AI recipe calculator (enter ingredients, get nutrition)
- Recipe library
- BMI calculator with visual meter
- TDEE / calorie needs calculator
- Calorie deficit/surplus tracking
- Weight tracker with trend chart
- Body stats log (weight, height, body fat %)
- Progress photos (stored in DB)
- AI progress prediction (8-week forecast + tips)
- Notes section
- Samsung Health toggle (enable sync)
- Full settings: name, age, goals, macros, reminders

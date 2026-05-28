require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Init DB
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercises (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      muscle_group TEXT,
      equipment TEXT,
      demo_url TEXT,
      avg_duration_per_set INT DEFAULT 45
    );
    CREATE TABLE IF NOT EXISTS workout_plans (
      id SERIAL PRIMARY KEY,
      day_of_week TEXT NOT NULL,
      name TEXT,
      exercises JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS workout_logs (
      id SERIAL PRIMARY KEY,
      exercise_id INT,
      exercise_name TEXT,
      sets INT,
      reps INT,
      weight_kg FLOAT,
      notes TEXT,
      logged_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS food_logs (
      id SERIAL PRIMARY KEY,
      food_name TEXT,
      calories FLOAT,
      protein FLOAT,
      carbs FLOAT,
      fats FLOAT,
      quantity FLOAT DEFAULT 1,
      unit TEXT DEFAULT 'serving',
      logged_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS water_logs (
      id SERIAL PRIMARY KEY,
      amount_ml INT,
      logged_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS body_stats (
      id SERIAL PRIMARY KEY,
      weight_kg FLOAT,
      height_cm FLOAT,
      body_fat_pct FLOAT,
      notes TEXT,
      photo_base64 TEXT,
      logged_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS user_settings (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      title TEXT,
      content TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS recipes (
      id SERIAL PRIMARY KEY,
      name TEXT,
      ingredients JSONB DEFAULT '[]',
      total_calories FLOAT,
      total_protein FLOAT,
      total_carbs FLOAT,
      total_fats FLOAT,
      servings INT DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS calendar_days (
      id SERIAL PRIMARY KEY,
      date DATE UNIQUE,
      is_rest_day BOOLEAN DEFAULT FALSE,
      workout_plan_id INT,
      completed BOOLEAN DEFAULT FALSE
    );
    CREATE TABLE IF NOT EXISTS pakistani_recipes (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      prep_time_min INT,
      cook_time_min INT,
      servings INT DEFAULT 4,
      calories_per_serving FLOAT,
      protein_per_serving FLOAT,
      carbs_per_serving FLOAT,
      fats_per_serving FLOAT,
      ingredients JSONB DEFAULT '[]',
      steps JSONB DEFAULT '[]',
      tags JSONB DEFAULT '[]',
      is_high_protein BOOLEAN DEFAULT FALSE,
      is_user_created BOOLEAN DEFAULT FALSE
    );
  `);

  // Seed exercises if empty
  const { rows } = await pool.query('SELECT COUNT(*) FROM exercises');
  if (parseInt(rows[0].count) === 0) {
    await seedExercises();
  }

  // Seed Pakistani recipes if empty
  const { rows: rrows } = await pool.query('SELECT COUNT(*) FROM pakistani_recipes');
  if (parseInt(rrows[0].count) === 0) {
    await seedPakistaniRecipes();
  }

  console.log('DB initialized');
}

async function seedExercises() {
  const exercises = [
    // Chest
    ['Bench Press', 'Strength', 'Chest', 'Barbell', 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', 50],
    ['Incline Bench Press', 'Strength', 'Chest', 'Barbell', null, 50],
    ['Dumbbell Flyes', 'Strength', 'Chest', 'Dumbbell', null, 45],
    ['Push-Ups', 'Bodyweight', 'Chest', 'None', null, 40],
    ['Cable Crossover', 'Strength', 'Chest', 'Cable', null, 45],
    ['Chest Dips', 'Bodyweight', 'Chest', 'Bodyweight', null, 45],
    // Back
    ['Pull-Ups', 'Strength', 'Back', 'Bodyweight', null, 50],
    ['Barbell Rows', 'Strength', 'Back', 'Barbell', null, 50],
    ['Lat Pulldown', 'Strength', 'Back', 'Cable', null, 45],
    ['Seated Cable Row', 'Strength', 'Back', 'Cable', null, 45],
    ['Deadlift', 'Strength', 'Back', 'Barbell', null, 60],
    ['T-Bar Row', 'Strength', 'Back', 'Barbell', null, 50],
    ['Dumbbell Row', 'Strength', 'Back', 'Dumbbell', null, 45],
    // Shoulders
    ['Overhead Press', 'Strength', 'Shoulders', 'Barbell', null, 50],
    ['Lateral Raises', 'Strength', 'Shoulders', 'Dumbbell', null, 40],
    ['Front Raises', 'Strength', 'Shoulders', 'Dumbbell', null, 40],
    ['Arnold Press', 'Strength', 'Shoulders', 'Dumbbell', null, 45],
    ['Face Pulls', 'Strength', 'Shoulders', 'Cable', null, 40],
    ['Upright Row', 'Strength', 'Shoulders', 'Barbell', null, 45],
    // Arms
    ['Barbell Curl', 'Strength', 'Biceps', 'Barbell', null, 45],
    ['Hammer Curl', 'Strength', 'Biceps', 'Dumbbell', null, 40],
    ['Preacher Curl', 'Strength', 'Biceps', 'Barbell', null, 45],
    ['Concentration Curl', 'Strength', 'Biceps', 'Dumbbell', null, 40],
    ['Tricep Pushdown', 'Strength', 'Triceps', 'Cable', null, 40],
    ['Skull Crushers', 'Strength', 'Triceps', 'Barbell', null, 45],
    ['Tricep Dips', 'Bodyweight', 'Triceps', 'Bodyweight', null, 40],
    ['Overhead Tricep Extension', 'Strength', 'Triceps', 'Dumbbell', null, 40],
    // Legs
    ['Squat', 'Strength', 'Legs', 'Barbell', null, 60],
    ['Leg Press', 'Strength', 'Legs', 'Machine', null, 50],
    ['Romanian Deadlift', 'Strength', 'Legs', 'Barbell', null, 55],
    ['Leg Curl', 'Strength', 'Legs', 'Machine', null, 40],
    ['Leg Extension', 'Strength', 'Legs', 'Machine', null, 40],
    ['Calf Raises', 'Strength', 'Calves', 'Machine', null, 35],
    ['Lunges', 'Strength', 'Legs', 'Dumbbell', null, 45],
    ['Bulgarian Split Squat', 'Strength', 'Legs', 'Dumbbell', null, 50],
    ['Hack Squat', 'Strength', 'Legs', 'Machine', null, 55],
    // Core
    ['Crunches', 'Core', 'Abs', 'Bodyweight', null, 30],
    ['Plank', 'Core', 'Abs', 'Bodyweight', null, 60],
    ['Russian Twists', 'Core', 'Abs', 'Bodyweight', null, 35],
    ['Hanging Leg Raise', 'Core', 'Abs', 'Bodyweight', null, 40],
    ['Cable Crunch', 'Core', 'Abs', 'Cable', null, 35],
    ['Ab Wheel Rollout', 'Core', 'Abs', 'Wheel', null, 40],
    // Cardio
    ['Running', 'Cardio', 'Full Body', 'None', null, 1800],
    ['Cycling', 'Cardio', 'Full Body', 'Bike', null, 1800],
    ['Jump Rope', 'Cardio', 'Full Body', 'Rope', null, 900],
    ['Rowing Machine', 'Cardio', 'Full Body', 'Machine', null, 1200],
    ['Elliptical', 'Cardio', 'Full Body', 'Machine', null, 1800],
    ['Stair Climber', 'Cardio', 'Full Body', 'Machine', null, 1200],
    ['HIIT', 'Cardio', 'Full Body', 'None', null, 1200],
    ['Swimming', 'Cardio', 'Full Body', 'None', null, 1800],
  ];

  for (const [name, category, muscle, equipment, demo, dur] of exercises) {
    await pool.query(
      'INSERT INTO exercises (name, category, muscle_group, equipment, demo_url, avg_duration_per_set) VALUES ($1,$2,$3,$4,$5,$6)',
      [name, category, muscle, equipment, demo, dur]
    );
  }

  // Pakistani foods
  const foods = [
    ['Roti (1 piece)', 80, 2.5, 17, 0.5, '1 piece'],
    ['Naan (1 piece)', 262, 8.7, 45, 5, '1 piece'],
    ['Chicken Karahi (1 serving)', 320, 28, 8, 20, '250g'],
    ['Daal Chawal (1 serving)', 380, 14, 65, 5, '300g'],
    ['Biryani (1 serving)', 450, 22, 60, 12, '300g'],
    ['Nihari (1 serving)', 400, 35, 10, 24, '300g'],
    ['Haleem (1 serving)', 350, 25, 30, 12, '250g'],
    ['Seekh Kebab (2 pieces)', 220, 18, 5, 14, '100g'],
    ['Paratha (1 piece)', 200, 4, 25, 10, '1 piece'],
    ['Lassi (1 glass)', 150, 6, 22, 4, '250ml'],
    ['Chai (1 cup)', 50, 2, 8, 1.5, '200ml'],
    ['Egg (1 large)', 77, 6, 0.6, 5, '1 egg'],
    ['Rice (1 cup cooked)', 206, 4, 45, 0.4, '200g'],
    ['Chicken Breast (100g)', 165, 31, 0, 3.6, '100g'],
    ['Mutton (100g)', 258, 25, 0, 17, '100g'],
    ['Palak Paneer (1 serving)', 280, 12, 15, 18, '200g'],
    ['Dal Makhani (1 serving)', 300, 12, 35, 12, '200g'],
    ['Samosa (1 piece)', 140, 3, 17, 7, '1 piece'],
    ['Pakora (5 pieces)', 200, 5, 22, 10, '100g'],
    ['Mango (1 medium)', 135, 1, 35, 0.5, '200g'],
    ['Banana (1 medium)', 105, 1.3, 27, 0.4, '120g'],
    ['Apple (1 medium)', 95, 0.5, 25, 0.3, '182g'],
    ['Milk (1 cup)', 149, 8, 12, 8, '240ml'],
    ['Yogurt (1 cup)', 100, 9, 11, 0.7, '240g'],
    ['Almonds (30g)', 173, 6, 6, 15, '30g'],
    ['Protein Shake (1 scoop)', 120, 25, 5, 2, '1 scoop'],
    ['Oats (1 cup)', 307, 11, 55, 5, '80g'],
    ['Brown Rice (1 cup cooked)', 218, 5, 46, 1.6, '200g'],
    ['Sweet Potato (1 medium)', 103, 2.3, 24, 0.1, '130g'],
    ['Spinach (1 cup)', 7, 0.9, 1, 0.1, '30g'],
  ];

  for (const [name, cal, pro, carb, fat, unit] of foods) {
    await pool.query(
      'INSERT INTO food_logs (food_name, calories, protein, carbs, fats, quantity, unit, logged_at) VALUES ($1,$2,$3,$4,$5,0,$6,\'2000-01-01\') ON CONFLICT DO NOTHING',
      [name, cal, pro, carb, fat, unit]
    );
  }
}

// ---- ROUTES ----

// Exercises
app.get('/api/exercises', async (req, res) => {
  const { category, muscle } = req.query;
  let q = 'SELECT * FROM exercises WHERE 1=1';
  const params = [];
  if (category) { params.push(category); q += ` AND category=$${params.length}`; }
  if (muscle) { params.push(muscle); q += ` AND muscle_group=$${params.length}`; }
  q += ' ORDER BY name';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

// Workout Plans
app.get('/api/workout-plans', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM workout_plans ORDER BY CASE day_of_week WHEN \'Monday\' THEN 1 WHEN \'Tuesday\' THEN 2 WHEN \'Wednesday\' THEN 3 WHEN \'Thursday\' THEN 4 WHEN \'Friday\' THEN 5 WHEN \'Saturday\' THEN 6 WHEN \'Sunday\' THEN 7 END');
  res.json(rows);
});

app.post('/api/workout-plans', async (req, res) => {
  const { day_of_week, name, exercises } = req.body;
  const existing = await pool.query('SELECT id FROM workout_plans WHERE day_of_week=$1', [day_of_week]);
  if (existing.rows.length > 0) {
    const { rows } = await pool.query('UPDATE workout_plans SET name=$1, exercises=$2 WHERE day_of_week=$3 RETURNING *', [name, JSON.stringify(exercises), day_of_week]);
    return res.json(rows[0]);
  }
  const { rows } = await pool.query('INSERT INTO workout_plans (day_of_week, name, exercises) VALUES ($1,$2,$3) RETURNING *', [day_of_week, name, JSON.stringify(exercises)]);
  res.json(rows[0]);
});

app.delete('/api/workout-plans/:id', async (req, res) => {
  await pool.query('DELETE FROM workout_plans WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// Workout Logs
app.get('/api/workout-logs', async (req, res) => {
  const { date, exercise_id } = req.query;
  let q = 'SELECT * FROM workout_logs WHERE 1=1';
  const params = [];
  if (date) { params.push(date); q += ` AND DATE(logged_at)=$${params.length}`; }
  if (exercise_id) { params.push(exercise_id); q += ` AND exercise_id=$${params.length}`; }
  q += ' ORDER BY logged_at DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

app.post('/api/workout-logs', async (req, res) => {
  const { exercise_id, exercise_name, sets, reps, weight_kg, notes } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO workout_logs (exercise_id, exercise_name, sets, reps, weight_kg, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [exercise_id, exercise_name, sets, reps, weight_kg, notes]
  );
  res.json(rows[0]);
});

app.delete('/api/workout-logs/:id', async (req, res) => {
  await pool.query('DELETE FROM workout_logs WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// Exercise progress
app.get('/api/exercise-progress/:exercise_id', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT weight_kg, reps, sets, logged_at FROM workout_logs WHERE exercise_id=$1 ORDER BY logged_at ASC LIMIT 50',
    [req.params.exercise_id]
  );
  res.json(rows);
});

// Food Logs
app.get('/api/food-logs', async (req, res) => {
  const { date } = req.query;
  let q = 'SELECT * FROM food_logs WHERE quantity > 0';
  const params = [];
  if (date) { params.push(date); q += ` AND DATE(logged_at)=$${params.length}`; }
  q += ' ORDER BY logged_at DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

app.post('/api/food-logs', async (req, res) => {
  const { food_name, calories, protein, carbs, fats, quantity, unit } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO food_logs (food_name, calories, protein, carbs, fats, quantity, unit) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [food_name, calories, protein, carbs, fats, quantity || 1, unit || 'serving']
  );
  res.json(rows[0]);
});

app.delete('/api/food-logs/:id', async (req, res) => {
  await pool.query('DELETE FROM food_logs WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// Food search (from seeded + user logs)
app.get('/api/foods/search', async (req, res) => {
  const { q } = req.query;
  const { rows } = await pool.query(
    `SELECT DISTINCT food_name, AVG(calories) as calories, AVG(protein) as protein, AVG(carbs) as carbs, AVG(fats) as fats, unit
     FROM food_logs WHERE food_name ILIKE $1 GROUP BY food_name, unit ORDER BY food_name LIMIT 20`,
    [`%${q}%`]
  );
  res.json(rows);
});

// Water
app.get('/api/water-logs', async (req, res) => {
  const { date } = req.query;
  let q = 'SELECT * FROM water_logs';
  const params = [];
  if (date) { params.push(date); q += ` WHERE DATE(logged_at)=$${params.length}`; }
  q += ' ORDER BY logged_at DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

app.post('/api/water-logs', async (req, res) => {
  const { amount_ml } = req.body;
  const { rows } = await pool.query('INSERT INTO water_logs (amount_ml) VALUES ($1) RETURNING *', [amount_ml]);
  res.json(rows[0]);
});

// Body Stats
app.get('/api/body-stats', async (req, res) => {
  const { rows } = await pool.query('SELECT id, weight_kg, height_cm, body_fat_pct, notes, logged_at FROM body_stats ORDER BY logged_at DESC LIMIT 50');
  res.json(rows);
});

app.post('/api/body-stats', async (req, res) => {
  const { weight_kg, height_cm, body_fat_pct, notes, photo_base64 } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO body_stats (weight_kg, height_cm, body_fat_pct, notes, photo_base64) VALUES ($1,$2,$3,$4,$5) RETURNING id, weight_kg, height_cm, body_fat_pct, notes, logged_at',
    [weight_kg, height_cm, body_fat_pct, notes, photo_base64]
  );
  res.json(rows[0]);
});

app.get('/api/body-stats/photos', async (req, res) => {
  const { rows } = await pool.query('SELECT id, logged_at, weight_kg FROM body_stats WHERE photo_base64 IS NOT NULL ORDER BY logged_at DESC LIMIT 20');
  res.json(rows);
});

app.get('/api/body-stats/photo/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT photo_base64, logged_at, weight_kg FROM body_stats WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// Notes
app.get('/api/notes', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM notes ORDER BY updated_at DESC');
  res.json(rows);
});

app.post('/api/notes', async (req, res) => {
  const { title, content } = req.body;
  const { rows } = await pool.query('INSERT INTO notes (title, content) VALUES ($1,$2) RETURNING *', [title, content]);
  res.json(rows[0]);
});

app.put('/api/notes/:id', async (req, res) => {
  const { title, content } = req.body;
  const { rows } = await pool.query('UPDATE notes SET title=$1, content=$2, updated_at=NOW() WHERE id=$3 RETURNING *', [title, content, req.params.id]);
  res.json(rows[0]);
});

app.delete('/api/notes/:id', async (req, res) => {
  await pool.query('DELETE FROM notes WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// Recipes
app.get('/api/recipes', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM recipes ORDER BY created_at DESC');
  res.json(rows);
});

app.post('/api/recipes', async (req, res) => {
  const { name, ingredients, total_calories, total_protein, total_carbs, total_fats, servings } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO recipes (name, ingredients, total_calories, total_protein, total_carbs, total_fats, servings) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [name, JSON.stringify(ingredients), total_calories, total_protein, total_carbs, total_fats, servings]
  );
  res.json(rows[0]);
});

app.delete('/api/recipes/:id', async (req, res) => {
  await pool.query('DELETE FROM recipes WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// Calendar
app.get('/api/calendar', async (req, res) => {
  const { month, year } = req.query;
  const { rows } = await pool.query(
    `SELECT * FROM calendar_days WHERE EXTRACT(MONTH FROM date)=$1 AND EXTRACT(YEAR FROM date)=$2`,
    [month, year]
  );
  res.json(rows);
});

app.post('/api/calendar', async (req, res) => {
  const { date, is_rest_day, workout_plan_id, completed } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO calendar_days (date, is_rest_day, workout_plan_id, completed) VALUES ($1,$2,$3,$4)
     ON CONFLICT (date) DO UPDATE SET is_rest_day=$2, workout_plan_id=$3, completed=$4 RETURNING *`,
    [date, is_rest_day, workout_plan_id, completed]
  );
  res.json(rows[0]);
});

// Settings
app.get('/api/settings', async (req, res) => {
  const { rows } = await pool.query('SELECT key, value FROM user_settings');
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  res.json(settings);
});

app.post('/api/settings', async (req, res) => {
  const { key, value } = req.body;
  await pool.query('INSERT INTO user_settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2', [key, value]);
  res.json({ success: true });
});

// AI Endpoints
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/ai/predict-progress', async (req, res) => {
  const { weight_history, calorie_logs, workout_logs, goal, goal_weight, current_weight } = req.body;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `You are a fitness coach AI. Based on this data, predict progress and give advice:
Current weight: ${current_weight}kg, Goal: ${goal}, Goal weight: ${goal_weight}kg
Recent weights: ${JSON.stringify(weight_history?.slice(-10))}
Recent calorie data: ${JSON.stringify(calorie_logs?.slice(-7))}
Recent workouts: ${JSON.stringify(workout_logs?.slice(-10))}
Respond with JSON only: { "weeks_to_goal": number, "predicted_weights": [{"week": 1, "weight": kg}, ...for 8 weeks], "advice": ["tip1","tip2","tip3"], "summary": "one paragraph summary" }`
      }],
      response_format: { type: 'json_object' }
    });
    res.json(JSON.parse(completion.choices[0].message.content));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/barcode-food', async (req, res) => {
  const { barcode } = req.body;
  try {
    // Try Open Food Facts first (free, has Pakistan data)
    const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await r.json();
    if (data.status === 1 && data.product) {
      const p = data.product;
      const nutrients = p.nutriments || {};
      return res.json({
        found: true,
        food_name: p.product_name || p.product_name_en || 'Unknown',
        calories: nutrients['energy-kcal_100g'] || nutrients['energy-kcal'] || 0,
        protein: nutrients['proteins_100g'] || 0,
        carbs: nutrients['carbohydrates_100g'] || 0,
        fats: nutrients['fat_100g'] || 0,
        unit: '100g',
        brand: p.brands || ''
      });
    }
    res.json({ found: false });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/suggest-exercises', async (req, res) => {
  const { recent_exercises, muscle_groups_worked, goal } = req.body;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Fitness coach: suggest exercise variations. Recent: ${JSON.stringify(recent_exercises)}, muscles worked: ${JSON.stringify(muscle_groups_worked)}, goal: ${goal}. 
        Respond JSON: { "suggestions": [{"exercise": "name", "reason": "why", "muscle_group": "group"}] } - 5 suggestions`
      }],
      response_format: { type: 'json_object' }
    });
    res.json(JSON.parse(completion.choices[0].message.content));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/recipe-calories', async (req, res) => {
  const { recipe_name, ingredients } = req.body;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Calculate nutrition for this Pakistani recipe: ${recipe_name}. Ingredients: ${ingredients}. 
        Respond JSON: { "total_calories": num, "total_protein": num, "total_carbs": num, "total_fats": num, "per_serving_calories": num, "servings": num, "ingredients": [{"name":"","calories":0,"protein":0,"carbs":0,"fats":0}] }`
      }],
      response_format: { type: 'json_object' }
    });
    res.json(JSON.parse(completion.choices[0].message.content));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Daily summary stats
app.get('/api/stats/daily', async (req, res) => {
  const { date } = req.query;
  const d = date || new Date().toISOString().split('T')[0];
  
  const [foodRes, waterRes, workoutRes] = await Promise.all([
    pool.query(`SELECT COALESCE(SUM(calories*quantity),0) as total_calories, COALESCE(SUM(protein*quantity),0) as total_protein, COALESCE(SUM(carbs*quantity),0) as total_carbs, COALESCE(SUM(fats*quantity),0) as total_fats FROM food_logs WHERE DATE(logged_at)=$1 AND quantity>0`, [d]),
    pool.query(`SELECT COALESCE(SUM(amount_ml),0) as total_water FROM water_logs WHERE DATE(logged_at)=$1`, [d]),
    pool.query(`SELECT COUNT(*) as exercises_count, COALESCE(SUM(sets*reps*weight_kg*0.05),0) as calories_burned FROM workout_logs WHERE DATE(logged_at)=$1`, [d])
  ]);
  
  res.json({
    date: d,
    nutrition: foodRes.rows[0],
    water: waterRes.rows[0],
    workout: workoutRes.rows[0]
  });
});

// ---- PAKISTANI RECIPES ----

async function seedPakistaniRecipes() {
  const recipes = [
    {
      name: 'Chicken Karahi',
      category: 'Main Course',
      prep_time_min: 15,
      cook_time_min: 35,
      servings: 4,
      calories_per_serving: 320,
      protein_per_serving: 28,
      carbs_per_serving: 8,
      fats_per_serving: 20,
      is_high_protein: true,
      tags: ['High Protein', 'Dinner', 'Chicken'],
      ingredients: [
        '1 kg chicken (bone-in, cut into pieces)',
        '3 medium tomatoes (chopped)',
        '1 large onion (sliced)',
        '4 tbsp cooking oil',
        '1 tsp cumin seeds',
        '1 tsp coriander powder',
        '1 tsp red chilli powder',
        '½ tsp turmeric',
        '1 tsp garam masala',
        '1 tsp ginger-garlic paste',
        'Salt to taste',
        'Fresh coriander and ginger julienne for garnish',
        '2 green chillies (slit)'
      ],
      steps: [
        'Heat oil in a karahi (wok) over high heat. Add cumin seeds and let them splutter.',
        'Add chicken pieces and sear on high heat until golden brown, about 8 minutes.',
        'Add ginger-garlic paste and cook for 2 minutes until fragrant.',
        'Add chopped tomatoes, red chilli, coriander powder, turmeric, and salt. Mix well.',
        'Cook on medium-high heat, stirring frequently, until oil separates from the masala (about 15 mins).',
        'Add green chillies and garam masala. Cook for another 5 minutes.',
        'Garnish with fresh coriander and ginger julienne. Serve hot with naan.'
      ]
    },
    {
      name: 'Daal Makhani',
      category: 'Lentils',
      prep_time_min: 10,
      cook_time_min: 60,
      servings: 4,
      calories_per_serving: 290,
      protein_per_serving: 14,
      carbs_per_serving: 38,
      fats_per_serving: 10,
      is_high_protein: false,
      tags: ['Vegetarian', 'High Protein', 'Dinner'],
      ingredients: [
        '1 cup whole black lentils (urad daal), soaked overnight',
        '¼ cup kidney beans (rajma), soaked overnight',
        '2 tbsp butter',
        '1 tbsp oil',
        '1 large onion (finely chopped)',
        '2 tomatoes (puréed)',
        '1 tsp ginger-garlic paste',
        '½ tsp cumin seeds',
        '1 tsp red chilli powder',
        '½ tsp turmeric',
        '1 tsp coriander powder',
        '½ cup cream (for finishing)',
        'Salt to taste',
        'Fresh coriander to garnish'
      ],
      steps: [
        'Pressure cook the soaked lentils and kidney beans with salt and water for 30 minutes until very soft.',
        'In a heavy pan, heat butter and oil. Add cumin seeds.',
        'Add onions and cook until golden brown, about 10 minutes.',
        'Add ginger-garlic paste and cook 2 minutes. Add tomato purée and all spices.',
        'Cook the masala until oil separates, about 10 minutes.',
        'Add the cooked lentils to the masala. Mix well and simmer on low heat for 20 minutes.',
        'Stir in cream, adjust salt. Simmer 5 more minutes. Garnish and serve with naan or rice.'
      ]
    },
    {
      name: 'Chicken Biryani',
      category: 'Rice',
      prep_time_min: 30,
      cook_time_min: 60,
      servings: 6,
      calories_per_serving: 480,
      protein_per_serving: 26,
      carbs_per_serving: 58,
      fats_per_serving: 14,
      is_high_protein: false,
      tags: ['Rice', 'Dinner', 'Special Occasion'],
      ingredients: [
        '1 kg chicken (bone-in)',
        '3 cups basmati rice (soaked 30 mins)',
        '2 large onions (thinly sliced, for frying)',
        '1 cup plain yogurt',
        '4 tbsp oil or ghee',
        '2 tsp biryani masala',
        '1 tsp red chilli powder',
        '1 tsp cumin seeds',
        '4 green cardamoms',
        '2 bay leaves',
        '1 cinnamon stick',
        '4 cloves',
        '1 tbsp ginger-garlic paste',
        '½ cup fresh mint leaves',
        '½ cup fresh coriander',
        'Pinch of saffron soaked in 2 tbsp warm milk',
        'Salt to taste'
      ],
      steps: [
        'Deep fry sliced onions in oil until golden brown and crispy. Set aside (reserve oil).',
        'Marinate chicken with yogurt, ginger-garlic paste, biryani masala, chilli powder, half the fried onions, and salt for 1 hour.',
        'In reserved oil, add whole spices (cardamom, bay leaves, cinnamon, cloves, cumin). Cook 1 minute.',
        'Add marinated chicken. Cook on medium heat until chicken is 80% done, about 20 minutes.',
        'Boil rice in salted water with whole spices until 70% cooked. Drain.',
        'Layer: chicken at bottom, then rice, mint, coriander, remaining fried onions, saffron milk.',
        'Seal with dough or foil. Cook on dum (low heat) for 25 minutes. Serve with raita.'
      ]
    },
    {
      name: 'Nihari',
      category: 'Main Course',
      prep_time_min: 20,
      cook_time_min: 240,
      servings: 6,
      calories_per_serving: 420,
      protein_per_serving: 38,
      carbs_per_serving: 12,
      fats_per_serving: 26,
      is_high_protein: true,
      tags: ['High Protein', 'Breakfast', 'Beef', 'Slow Cook'],
      ingredients: [
        '1 kg beef shank (nalli/bone-in)',
        '4 tbsp oil or ghee',
        '2 large onions (finely sliced)',
        '2 tbsp nihari masala (or mix of fennel, cardamom, coriander, bay leaf, star anise)',
        '1 tsp red chilli powder',
        '1 tsp turmeric',
        '2 tbsp wheat flour (mixed in water)',
        '1 tbsp ginger-garlic paste',
        'Salt to taste',
        'Garnish: ginger julienne, green chillies, lemon, fresh coriander, fried onions'
      ],
      steps: [
        'Heat ghee, fry onions until deep golden. Add ginger-garlic paste, cook 2 minutes.',
        'Add beef and sear on high heat until browned on all sides.',
        'Add nihari masala, red chilli, turmeric, and salt. Mix well.',
        'Add enough water to fully cover the meat (about 4–5 cups). Bring to boil.',
        'Reduce heat to very low. Simmer covered for 3–4 hours until meat is fall-off-the-bone tender.',
        'Mix flour with water into a smooth paste. Stir into the nihari to thicken the gravy.',
        'Simmer 15 more minutes. Serve with naan, garnished with ginger, chilli, lemon, and coriander.'
      ]
    },
    {
      name: 'Haleem',
      category: 'Stew',
      prep_time_min: 30,
      cook_time_min: 180,
      servings: 8,
      calories_per_serving: 340,
      protein_per_serving: 24,
      carbs_per_serving: 32,
      fats_per_serving: 12,
      is_high_protein: true,
      tags: ['High Protein', 'Breakfast', 'Slow Cook'],
      ingredients: [
        '500g beef or mutton (boneless)',
        '½ cup wheat (gehun), soaked overnight',
        '¼ cup chana daal (soaked)',
        '¼ cup masoor daal (soaked)',
        '¼ cup moong daal (soaked)',
        '2 large onions (sliced)',
        '4 tbsp oil',
        '1 tbsp haleem masala',
        '1 tsp ginger-garlic paste',
        '1 tsp red chilli powder',
        '½ tsp turmeric',
        'Salt to taste',
        'Garnish: fried onions, ginger, green chilli, lemon, coriander'
      ],
      steps: [
        'Pressure cook wheat and all lentils together with salt and water for 45 minutes until mushy.',
        'Separately, cook beef with oil, onions, ginger-garlic paste, and all spices until tender (1 hour).',
        'Blend or mash the wheat-lentil mixture to a coarse paste.',
        'Combine cooked meat and wheat mixture in a large pot.',
        'Cook together on low heat, stirring constantly, for 30–40 minutes until it thickens to a porridge-like consistency.',
        'Using a wooden spoon or hand blender, beat/blend to break down the meat into fibres.',
        'Adjust seasoning. Serve with fried onions, fresh ginger, chilli, lemon, and coriander on top.'
      ]
    },
    {
      name: 'Seekh Kebab',
      category: 'BBQ / Grills',
      prep_time_min: 20,
      cook_time_min: 20,
      servings: 4,
      calories_per_serving: 260,
      protein_per_serving: 26,
      carbs_per_serving: 6,
      fats_per_serving: 15,
      is_high_protein: true,
      tags: ['High Protein', 'BBQ', 'Low Carb', 'Dinner'],
      ingredients: [
        '500g minced beef or mutton (80% lean)',
        '1 medium onion (finely grated, excess moisture squeezed out)',
        '2 green chillies (finely chopped)',
        '2 tbsp fresh coriander (chopped)',
        '1 tbsp fresh mint (chopped)',
        '1 tsp cumin powder',
        '1 tsp coriander powder',
        '1 tsp red chilli powder',
        '½ tsp garam masala',
        '½ tsp black pepper',
        '1 tsp ginger-garlic paste',
        'Salt to taste',
        '1 egg (optional, helps bind)'
      ],
      steps: [
        'Combine all ingredients in a bowl. Mix thoroughly and knead for 3–4 minutes.',
        'Refrigerate the mixture for 30 minutes to firm up (helps it stick to skewers).',
        'Divide into equal portions. Wet your hands and mould each portion around a metal skewer into a long sausage shape.',
        'Grill on a BBQ or tawa (griddle) over medium-high heat, turning every 2–3 minutes.',
        'Cook for 12–15 minutes total until cooked through with some char marks.',
        'Serve hot with naan, mint chutney, sliced onions, and lemon wedges.'
      ]
    },
    {
      name: 'Aloo Gosht',
      category: 'Main Course',
      prep_time_min: 15,
      cook_time_min: 75,
      servings: 4,
      calories_per_serving: 380,
      protein_per_serving: 28,
      carbs_per_serving: 22,
      fats_per_serving: 20,
      is_high_protein: true,
      tags: ['Mutton', 'Dinner', 'Comfort Food'],
      ingredients: [
        '750g mutton (bone-in, curry cut)',
        '3 medium potatoes (peeled, halved)',
        '2 onions (finely chopped)',
        '3 tomatoes (chopped)',
        '4 tbsp oil',
        '1 tbsp ginger-garlic paste',
        '1 tsp cumin seeds',
        '1 tsp red chilli powder',
        '1 tsp coriander powder',
        '½ tsp turmeric',
        '1 tsp garam masala',
        'Salt to taste',
        'Fresh coriander to garnish'
      ],
      steps: [
        'Heat oil in a large pot. Add cumin seeds, then onions. Fry until golden brown.',
        'Add ginger-garlic paste, cook 2 minutes. Add tomatoes and all spices except garam masala.',
        'Cook until oil separates from the masala, about 10 minutes.',
        'Add mutton pieces. Brown them in the masala on high heat for 5 minutes.',
        'Add 2 cups water, bring to boil, then reduce heat. Cover and simmer for 45 minutes.',
        'Add potatoes. Cook for another 20 minutes until both potatoes and mutton are tender.',
        'Sprinkle garam masala, garnish with coriander. Serve with roti or rice.'
      ]
    },
    {
      name: 'Chana Masala',
      category: 'Lentils',
      prep_time_min: 10,
      cook_time_min: 40,
      servings: 4,
      calories_per_serving: 310,
      protein_per_serving: 15,
      carbs_per_serving: 48,
      fats_per_serving: 7,
      is_high_protein: false,
      tags: ['Vegetarian', 'High Protein', 'Lunch'],
      ingredients: [
        '2 cans chickpeas (or 2 cups dried, soaked overnight and boiled)',
        '2 large onions (finely chopped)',
        '3 tomatoes (puréed)',
        '3 tbsp oil',
        '1 tsp cumin seeds',
        '1 tbsp ginger-garlic paste',
        '1½ tsp chana masala powder',
        '1 tsp red chilli powder',
        '1 tsp coriander powder',
        '½ tsp amchoor (dry mango powder)',
        'Salt to taste',
        'Garnish: green chillies, coriander, lemon wedge'
      ],
      steps: [
        'Heat oil, add cumin seeds. Add onions and fry until deep golden.',
        'Add ginger-garlic paste and cook 2 minutes.',
        'Add tomato purée, chana masala, red chilli, coriander powder. Cook until oil separates.',
        'Add chickpeas with ½ cup of their liquid. Mix well.',
        'Simmer on medium heat for 20 minutes until gravy thickens.',
        'Add amchoor powder, adjust salt. Cook 5 more minutes.',
        'Garnish with coriander, green chillies, and lemon. Serve with puri or naan.'
      ]
    },
    {
      name: 'Chicken Tikka',
      category: 'BBQ / Grills',
      prep_time_min: 20,
      cook_time_min: 25,
      servings: 4,
      calories_per_serving: 240,
      protein_per_serving: 32,
      carbs_per_serving: 4,
      fats_per_serving: 11,
      is_high_protein: true,
      tags: ['High Protein', 'BBQ', 'Low Carb', 'Chicken'],
      ingredients: [
        '1 kg chicken (boneless, cut into cubes)',
        '½ cup thick yogurt',
        '1 tbsp lemon juice',
        '1 tbsp oil',
        '1 tbsp ginger-garlic paste',
        '1 tsp tikka masala',
        '1 tsp red chilli powder',
        '½ tsp turmeric',
        '1 tsp cumin powder',
        '1 tsp coriander powder',
        '½ tsp garam masala',
        'Red food colour (optional)',
        'Salt to taste'
      ],
      steps: [
        'Mix all marinade ingredients in a bowl. Add chicken pieces and coat well.',
        'Marinate for at least 2 hours, preferably overnight in the fridge.',
        'Thread chicken onto skewers.',
        'Grill on high heat (BBQ, oven grill, or tawa) turning every 3–4 minutes.',
        'Cook for 20–25 minutes until charred at edges and cooked through.',
        'Serve with naan, sliced onions, green chutney, and lemon wedges.'
      ]
    },
    {
      name: 'Saag (Sarson ka Saag)',
      category: 'Vegetables',
      prep_time_min: 20,
      cook_time_min: 60,
      servings: 4,
      calories_per_serving: 180,
      protein_per_serving: 8,
      carbs_per_serving: 16,
      fats_per_serving: 10,
      is_high_protein: false,
      tags: ['Vegetarian', 'Winter', 'Punjab'],
      ingredients: [
        '500g mustard greens (sarson)',
        '250g spinach',
        '1 large onion (chopped)',
        '4 cloves garlic',
        '1-inch ginger piece',
        '2 green chillies',
        '3 tbsp cornmeal (makki ka atta)',
        '3 tbsp butter or ghee',
        '1 tsp red chilli powder',
        'Salt to taste',
        'For tadka: 2 tbsp butter, 1 onion sliced, 2 dried red chillies'
      ],
      steps: [
        'Wash and roughly chop mustard greens and spinach. Boil with garlic, ginger, green chillies, and salt for 30 minutes until very soft.',
        'Drain most water. Blend coarsely with a hand blender or potato masher (keep some texture).',
        'Mix in cornmeal and cook on low heat, stirring regularly, for 20 minutes.',
        'Add butter/ghee and red chilli powder. Mix well.',
        'For tadka: fry sliced onions and dried red chillies in butter until golden. Pour over saag.',
        'Serve hot with makki ki roti (cornbread) and a knob of butter on top.'
      ]
    },
    {
      name: 'Shahi Tukray',
      category: 'Dessert',
      prep_time_min: 15,
      cook_time_min: 30,
      servings: 6,
      calories_per_serving: 420,
      protein_per_serving: 9,
      carbs_per_serving: 55,
      fats_per_serving: 19,
      is_high_protein: false,
      tags: ['Dessert', 'Eid', 'Special Occasion'],
      ingredients: [
        '6 slices white bread (thick cut)',
        '1 litre full-fat milk',
        '½ cup sugar',
        '¼ cup khoya (dried milk solids)',
        '½ tsp cardamom powder',
        'Oil for deep frying',
        'Garnish: pistachios (sliced), almonds (sliced), rose water, silver leaf (optional)'
      ],
      steps: [
        'Cut bread slices diagonally into triangles. Deep fry in hot oil until golden and crispy. Drain on paper.',
        'Bring milk to a boil. Add sugar and stir until dissolved.',
        'Add khoya and cardamom powder. Simmer on medium heat, stirring, until milk reduces by half.',
        'Add a few drops of rose water to the reduced milk (rabri). Remove from heat.',
        'Arrange fried bread in a single layer in a dish.',
        'Pour warm rabri over the bread. Let it soak for 10 minutes.',
        'Garnish with sliced nuts and silver leaf. Serve warm or chilled.'
      ]
    },
    {
      name: 'Daal Chawal (Everyday)',
      category: 'Lentils',
      prep_time_min: 10,
      cook_time_min: 30,
      servings: 4,
      calories_per_serving: 370,
      protein_per_serving: 16,
      carbs_per_serving: 62,
      fats_per_serving: 6,
      is_high_protein: false,
      tags: ['Everyday', 'Vegetarian', 'Lunch'],
      ingredients: [
        '1 cup masoor daal (red lentils)',
        '1½ cups basmati rice',
        '1 onion (sliced)',
        '2 tomatoes (chopped)',
        '3 tbsp oil',
        '1 tsp cumin seeds',
        '1 tsp ginger-garlic paste',
        '½ tsp turmeric',
        '1 tsp red chilli powder',
        '½ tsp coriander powder',
        'Salt to taste',
        'Lemon and coriander to serve'
      ],
      steps: [
        'Cook rice normally (rinse, boil in salted water, drain, steam). Set aside.',
        'Boil daal in 3 cups water with turmeric and salt until completely soft, about 20 minutes.',
        'In a pan, heat oil. Fry onions until golden. Add ginger-garlic paste.',
        'Add tomatoes, chilli powder, and coriander powder. Cook until oil separates.',
        'Add the cooked daal to this tarka. Stir and simmer 10 minutes.',
        'Adjust consistency with water. Taste and adjust salt.',
        'Serve hot daal over rice with lemon wedges and fresh coriander.'
      ]
    },
    {
      name: 'Chicken Corn Soup',
      category: 'Soups',
      prep_time_min: 10,
      cook_time_min: 25,
      servings: 4,
      calories_per_serving: 180,
      protein_per_serving: 16,
      carbs_per_serving: 20,
      fats_per_serving: 4,
      is_high_protein: true,
      tags: ['Soup', 'Winter', 'Light', 'High Protein'],
      ingredients: [
        '250g chicken breast (boiled and shredded)',
        '1 cup sweet corn (tinned or frozen)',
        '4 cups chicken stock',
        '2 tbsp cornstarch (dissolved in 4 tbsp water)',
        '2 eggs (lightly beaten)',
        '1 tbsp soy sauce',
        '1 tsp white pepper',
        '1 tbsp vinegar',
        '½ tsp sesame oil',
        'Salt to taste',
        'Spring onions to garnish'
      ],
      steps: [
        'Bring chicken stock to a boil in a large pot.',
        'Add shredded chicken and sweet corn. Bring back to boil.',
        'Stir in soy sauce, white pepper, and vinegar. Taste and adjust salt.',
        'Add cornstarch mixture slowly while stirring to thicken the soup.',
        'Slowly pour beaten eggs in a thin stream while stirring continuously to create egg ribbons.',
        'Add sesame oil. Simmer 2 more minutes.',
        'Serve hot, garnished with chopped spring onions.'
      ]
    },
    {
      name: 'Aloo Keema',
      category: 'Main Course',
      prep_time_min: 10,
      cook_time_min: 40,
      servings: 4,
      calories_per_serving: 350,
      protein_per_serving: 24,
      carbs_per_serving: 20,
      fats_per_serving: 20,
      is_high_protein: true,
      tags: ['Everyday', 'Dinner', 'High Protein'],
      ingredients: [
        '500g minced beef or mutton',
        '2 medium potatoes (peeled and cubed)',
        '1 large onion (finely chopped)',
        '2 tomatoes (chopped)',
        '3 tbsp oil',
        '1 tsp ginger-garlic paste',
        '1 tsp red chilli powder',
        '1 tsp coriander powder',
        '½ tsp turmeric',
        '½ tsp cumin seeds',
        '½ tsp garam masala',
        'Salt to taste',
        'Fresh coriander and green chillies to garnish'
      ],
      steps: [
        'Heat oil, add cumin seeds. Add onions and fry until golden.',
        'Add ginger-garlic paste, cook 2 minutes. Add tomatoes and all dry spices.',
        'Add minced meat. Break it up and cook on high heat until all water evaporates and meat browns.',
        'Add potatoes and ½ cup water. Mix well.',
        'Cover and cook on medium heat for 20 minutes until potatoes are soft.',
        'Uncover, add garam masala. Cook until oil separates.',
        'Garnish with coriander and green chillies. Serve with roti.'
      ]
    },
    {
      name: 'Mutton Pulao',
      category: 'Rice',
      prep_time_min: 15,
      cook_time_min: 90,
      servings: 6,
      calories_per_serving: 440,
      protein_per_serving: 24,
      carbs_per_serving: 52,
      fats_per_serving: 14,
      is_high_protein: false,
      tags: ['Rice', 'Special Occasion', 'Mutton'],
      ingredients: [
        '1 kg mutton (bone-in)',
        '3 cups basmati rice (soaked 30 mins)',
        '2 large onions (sliced)',
        '4 tbsp oil or ghee',
        '1 tbsp ginger-garlic paste',
        '1 tsp cumin seeds',
        '4 green cardamoms',
        '1 cinnamon stick',
        '4 cloves',
        '2 bay leaves',
        '1 tsp black pepper corns',
        '1 star anise',
        '1 cup yogurt',
        'Salt to taste'
      ],
      steps: [
        'Fry onions in oil/ghee until golden brown. Remove half and set aside.',
        'In remaining oil, add whole spices (cumin, cardamom, cinnamon, cloves, bay leaves, peppercorns, star anise).',
        'Add mutton and brown on all sides. Add ginger-garlic paste.',
        'Add yogurt and salt. Cook until yogurt is absorbed.',
        'Add water to cover meat. Bring to boil, then simmer 45 minutes until mutton is 90% cooked.',
        'Strain the mutton stock. Measure: for every cup of rice use 1.5 cups stock.',
        'In the same pot, add strained stock. Bring to boil, add soaked rice. Cook covered on low until rice is done, about 15 mins. Garnish with fried onions.'
      ]
    }
  ];

  for (const r of recipes) {
    await pool.query(
      `INSERT INTO pakistani_recipes (name, category, prep_time_min, cook_time_min, servings, calories_per_serving, protein_per_serving, carbs_per_serving, fats_per_serving, ingredients, steps, tags, is_high_protein, is_user_created)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [r.name, r.category, r.prep_time_min, r.cook_time_min, r.servings, r.calories_per_serving, r.protein_per_serving, r.carbs_per_serving, r.fats_per_serving,
       JSON.stringify(r.ingredients), JSON.stringify(r.steps), JSON.stringify(r.tags), r.is_high_protein, false]
    );
  }
  console.log('Pakistani recipes seeded');
}

// Pakistani Recipes API
app.get('/api/pakistani-recipes', async (req, res) => {
  const { category, high_protein, search } = req.query;
  let q = 'SELECT * FROM pakistani_recipes WHERE 1=1';
  const params = [];
  if (category && category !== 'All') { params.push(category); q += ` AND category=$${params.length}`; }
  if (high_protein === 'true') q += ` AND is_high_protein=true`;
  if (search) { params.push(`%${search}%`); q += ` AND name ILIKE $${params.length}`; }
  q += ' ORDER BY is_user_created ASC, name ASC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

app.post('/api/pakistani-recipes', async (req, res) => {
  const { name, category, prep_time_min, cook_time_min, servings, calories_per_serving, protein_per_serving, carbs_per_serving, fats_per_serving, ingredients, steps, tags, is_high_protein } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO pakistani_recipes (name, category, prep_time_min, cook_time_min, servings, calories_per_serving, protein_per_serving, carbs_per_serving, fats_per_serving, ingredients, steps, tags, is_high_protein, is_user_created)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true) RETURNING *`,
    [name, category, prep_time_min, cook_time_min, servings, calories_per_serving, protein_per_serving, carbs_per_serving, fats_per_serving,
     JSON.stringify(ingredients || []), JSON.stringify(steps || []), JSON.stringify(tags || []), is_high_protein || false]
  );
  res.json(rows[0]);
});

app.delete('/api/pakistani-recipes/:id', async (req, res) => {
  await pool.query('DELETE FROM pakistani_recipes WHERE id=$1 AND is_user_created=true', [req.params.id]);
  res.json({ success: true });
});

// Log a Pakistani recipe to food diary
app.post('/api/pakistani-recipes/:id/log', async (req, res) => {
  const { servings_count } = req.body;
  const { rows } = await pool.query('SELECT * FROM pakistani_recipes WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const r = rows[0];
  const qty = parseFloat(servings_count) || 1;
  const logged = await pool.query(
    'INSERT INTO food_logs (food_name, calories, protein, carbs, fats, quantity, unit) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [r.name, r.calories_per_serving, r.protein_per_serving, r.carbs_per_serving, r.fats_per_serving, qty, 'serving']
  );
  res.json(logged.rows[0]);
});

initDB().then(() => {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}).catch(console.error);

const configuredBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const BASE = (configuredBase.startsWith('http') ? configuredBase : `https://${configuredBase}`).replace(/\/$/, '');

const request = async (path, options) => {
  const response = await fetch(`${BASE}${path}`, options);
  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid API response from ${path}`);
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed with ${response.status}`);
  }

  return data;
};

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
};

export const calcBMI = (weight_kg, height_cm) => {
  if (!weight_kg || !height_cm) return null;
  const h = height_cm / 100;
  const bmi = weight_kg / (h * h);
  let category = '';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';
  return { bmi: bmi.toFixed(1), category };
};

export const calcCalorieNeeds = (weight_kg, height_cm, age, gender, activity) => {
  if (!weight_kg || !height_cm) return null;
  let bmr;
  if (gender === 'male') bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  else bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  return Math.round(bmr * (multipliers[activity] || 1.55));
};

export const formatDate = (d) => {
  const date = d ? new Date(d) : new Date();
  return date.toISOString().split('T')[0];
};

export const today = () => new Date().toISOString().split('T')[0];

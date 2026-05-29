import React, { useState, useEffect } from 'react';
import { api, today } from '../utils/api';
import { toast } from 'react-hot-toast';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [bodyStats, setBodyStats] = useState([]);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const logWater = async (ml) => {
    try {
      await api.post('/api/water-logs', { amount_ml: ml });
      toast.success(`+${ml}ml water logged`);
      loadData();
    } catch { toast.error('Failed to log water'); }
  };

  const loadData = async () => {
    try {
      const [s, bs, plans, cfg] = await Promise.all([
        api.get(`/api/stats/daily?date=${today()}`),
        api.get('/api/body-stats'),
        api.get('/api/workout-plans'),
        api.get('/api/settings'),
      ]);
      setStats(s);
      setBodyStats(bs);
      setSettings(cfg);
      const todayPlan = plans.find(p => p.day_of_week === dayName);
      setWorkoutPlan(todayPlan);
    } catch (e) {}
    setLoading(false);
  };

  const name = settings.name || 'Athlete';
  const goalCal = parseInt(settings.calorie_goal) || 2000;
  const goalWater = parseInt(settings.water_goal_ml) || 2500;
  const calories = parseFloat(stats?.nutrition?.total_calories || 0);
  const protein = parseFloat(stats?.nutrition?.total_protein || 0);
  const carbs = parseFloat(stats?.nutrition?.total_carbs || 0);
  const fats = parseFloat(stats?.nutrition?.total_fats || 0);
  const water = parseInt(stats?.water?.total_water || 0);
  const calBurned = parseFloat(stats?.workout?.calories_burned || 0);
  const netCal = Math.round(calories - calBurned);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const weightHistory = bodyStats.slice(0, 10).reverse().map(b => ({ w: parseFloat(b.weight_kg) }));
  const latestWeight = bodyStats[0]?.weight_kg;

  if (loading) return <div className="loading"><div className="spinner" /> Loading...</div>;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ padding: '24px 20px 16px', background: 'linear-gradient(180deg, #FFFFFF 0%, #F6F8FB 100%)', borderBottom: '1px solid var(--border)' }}>
        <div className="hero-greeting">{greeting}</div>
        <div className="hero-name">{name.split(' ')[0]}<span className="hero-accent">.</span></div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{dateStr} · {dayName}</div>
      </div>

      {/* Today's workout */}
      <div className="section">
        <div className="section-title">Today's Workout</div>
        {workoutPlan ? (
          <div className="card" onClick={() => onNavigate('workout')} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700 }}>{workoutPlan.name || dayName}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  {workoutPlan.exercises?.length || 0} exercises planned
                </div>
              </div>
              <span className="badge badge-green">Planned</span>
            </div>
            {workoutPlan.exercises?.slice(0, 3).map((e, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>• {e.name}</div>
            ))}
            {workoutPlan.exercises?.length > 3 && (
              <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>+ {workoutPlan.exercises.length - 3} more →</div>
            )}
          </div>
        ) : (
          <div className="card" onClick={() => onNavigate('workout')} style={{ cursor: 'pointer', textAlign: 'center', padding: '24px' }}>
            <div style={{ fontFamily:'var(--font-head)', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Rest Day</div>
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>No workout planned for today</div>
            <div style={{ color: 'var(--accent)', fontSize: 13, marginTop: 4 }}>Tap to set one up →</div>
          </div>
        )}
      </div>

      {/* Calorie ring */}
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="section-title">Calories Today</div>
        <div className="card">
          <div className="macro-ring">
            <MacroRing calories={netCal} goal={goalCal} />
            <div className="macro-bars">
              <MacroBar label="Protein" value={protein} max={parseInt(settings.protein_goal) || 150} color="#00C896" unit="g" />
              <MacroBar label="Carbs" value={carbs} max={parseInt(settings.carbs_goal) || 250} color="#3B82F6" unit="g" />
              <MacroBar label="Fats" value={fats} max={parseInt(settings.fats_goal) || 65} color="#FFA502" unit="g" />
              <MacroBar label="Burned" value={Math.round(calBurned)} max={500} color="#FF4757" unit="kcal" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <span className="badge badge-green">{Math.round(calories)} eaten</span>
            <span className="badge badge-red">{Math.round(calBurned)} burned</span>
            <span className={`badge ${netCal <= goalCal ? 'badge-blue' : 'badge-orange'}`}>{netCal} net</span>
          </div>
        </div>
      </div>

      {/* Water */}
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="section-title">Water Intake</div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{water} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>/ {goalWater}ml</span></span>
            <span className="badge badge-blue">{Math.round((water / goalWater) * 100)}%</span>
          </div>
          <div className="progress-bar" style={{ marginBottom: 14 }}>
            <div className="progress-fill" style={{ width: `${Math.min(100, (water / goalWater) * 100)}%`, background: 'linear-gradient(90deg, #3B82F6, #00C896)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {[200, 250, 350, 500].map(ml => (
              <button
                key={ml}
                onClick={() => logWater(ml)}
                style={{ background: 'rgba(37,99,235,0.08)', border: '1.5px solid rgba(37,99,235,0.2)', borderRadius: 10, padding: '10px 4px', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.18s' }}
                onMouseDown={e => e.currentTarget.style.transform='scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
                onTouchStart={e => e.currentTarget.style.transform='scale(0.95)'}
                onTouchEnd={e => e.currentTarget.style.transform='scale(1)'}
              >
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 15, color: '#2563eb' }}>+{ml}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>ml</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Weight */}
      {bodyStats.length > 0 && (
        <div className="section" style={{ paddingTop: 0 }}>
          <div className="section-title">Weight Trend</div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>{latestWeight}kg</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Current weight</div>
              </div>
              {bodyStats.length > 1 && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: parseFloat(bodyStats[0].weight_kg) < parseFloat(bodyStats[1].weight_kg) ? 'var(--accent)' : 'var(--red)' }}>
                    {parseFloat(bodyStats[0].weight_kg) < parseFloat(bodyStats[1].weight_kg) ? '↓' : '↑'} {Math.abs(parseFloat(bodyStats[0].weight_kg) - parseFloat(bodyStats[1].weight_kg)).toFixed(1)}kg
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>vs last entry</div>
                </div>
              )}
            </div>
            {weightHistory.length > 1 && (
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={weightHistory}>
                  <Line type="monotone" dataKey="w" stroke="#00C896" strokeWidth={2} dot={false} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: 'none', fontSize: 12 }} formatter={v => [`${v}kg`]} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="section-title">Quick Actions</div>
        <div className="stat-grid">
          {[
            { icon: 'Food', label: 'Log Food', tab: 'nutrition' },
            { icon: 'Train', label: 'Log Workout', tab: 'workout' },
            { icon: 'Trend', label: 'View Progress', tab: 'progress' },
            { icon: 'Notes', label: 'Notes', tab: 'notes' },
          ].map(a => (
            <div key={a.tab} className="card" onClick={() => onNavigate(a.tab)} style={{ cursor: 'pointer', textAlign: 'center', padding: 20 }}>
              <div className="stat-icon" style={{ marginBottom: 6 }}>{a.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{a.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MacroRing({ calories, goal }) {
  const pct = Math.min(100, (calories / goal) * 100);
  const r = 38, cx = 48, cy = 48;
  const circ = 2 * Math.PI * r;
  const stroke = (pct / 100) * circ;
  const color = pct > 100 ? '#FF4757' : pct > 80 ? '#FFA502' : '#00C896';

  return (
    <div className="ring-chart" style={{ width: 96, height: 96, flexShrink: 0 }}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${stroke} ${circ}`}
          strokeDashoffset={circ / 4} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease' }} />
      </svg>
      <div className="ring-center">
        <div className="ring-kcal">{calories}</div>
        <div className="ring-kcal-label">kcal</div>
      </div>
    </div>
  );
}

function MacroBar({ label, value, max, color, unit }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="macro-bar-row">
      <div className="macro-bar-label">{label}</div>
      <div className="macro-bar-track">
        <div className="macro-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="macro-bar-val">{Math.round(value)}{unit}</div>
    </div>
  );
}

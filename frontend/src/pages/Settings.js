import React, { useState, useEffect } from 'react';
import { api, calcBMI, calcCalorieNeeds } from '../utils/api';
import { toast } from 'react-hot-toast';

const ACTIVITY_OPTIONS = [
  { value:'sedentary', label:'Sedentary', desc:'Little or no exercise' },
  { value:'light', label:'Light', desc:'1-3 days/week' },
  { value:'moderate', label:'Moderate', desc:'3-5 days/week' },
  { value:'active', label:'Active', desc:'6-7 days/week' },
  { value:'very_active', label:'Very Active', desc:'Twice a day' },
];

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState(false);
  const [samsungLinked, setSamsungLinked] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const data = await api.get('/api/settings');
    setSettings(data);
    setSamsungLinked(data.samsung_health === 'true');
  };

  const save = async (key, value) => {
    await api.post('/api/settings', { key, value: String(value) });
    setSettings(prev => ({ ...prev, [key]: String(value) }));
  };

  const saveAll = async () => {
    const keys = ['name','age','gender','height_cm','weight_kg','activity','goal','goal_weight','start_weight',
      'calorie_goal','protein_goal','carbs_goal','fats_goal','water_goal_ml','cardio_reminder_time','workout_reminder_time'];
    for (const k of keys) {
      if (settings[k] !== undefined) await api.post('/api/settings', { key: k, value: String(settings[k]) });
    }
    toast.success('Settings saved!');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const upd = (k, v) => setSettings(prev => ({ ...prev, [k]: v }));

  const bmi = calcBMI(parseFloat(settings.weight_kg || settings.height_cm), parseFloat(settings.height_cm));
  const tdee = calcCalorieNeeds(parseFloat(settings.weight_kg), parseFloat(settings.height_cm), parseInt(settings.age)||25, settings.gender||'male', settings.activity||'moderate');

  const toggleSamsungHealth = () => {
    const newVal = !samsungLinked;
    setSamsungLinked(newVal);
    save('samsung_health', newVal);
    if (newVal) {
      toast.success('Samsung Health sync enabled! Steps & HR will sync automatically.');
    } else {
      toast('Samsung Health disconnected');
    }
  };

  const requestNotifPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') toast.success('Notifications enabled!');
      else toast.error('Please enable notifications in browser settings');
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><div className="page-title">Settings</div><div className="page-subtitle">Profile & Goals</div></div>
        <button className={`btn btn-sm ${saved?'btn-ghost':''}`} onClick={saveAll}>{saved ? '✓ Saved' : 'Save'}</button>
      </div>

      <div className="section">
        {/* Profile */}
        <div className="section-title">Profile</div>
        <div className="form-group">
          <label className="label">Your Name</label>
          <input className="input" placeholder="e.g. Ahmed" value={settings.name||''} onChange={e=>upd('name',e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="label">Age</label>
            <input className="input" type="number" placeholder="25" value={settings.age||''} onChange={e=>upd('age',e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Gender</label>
            <select className="input" value={settings.gender||'male'} onChange={e=>upd('gender',e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="label">Height (cm)</label>
            <input className="input" type="number" placeholder="175" value={settings.height_cm||''} onChange={e=>upd('height_cm',e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Weight (kg)</label>
            <input className="input" type="number" step="0.1" placeholder="75" value={settings.weight_kg||''} onChange={e=>upd('weight_kg',e.target.value)} />
          </div>
        </div>

        {/* Activity */}
        <div className="section-title" style={{ marginTop:4 }}>Activity Level</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
          {ACTIVITY_OPTIONS.map(opt=>(
            <div key={opt.value} className="card-sm" style={{ cursor:'pointer', border: settings.activity===opt.value?'1.5px solid var(--accent)':'1px solid var(--border)' }}
              onClick={()=>upd('activity',opt.value)}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:600 }}>{opt.label}</div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>{opt.desc}</div>
                </div>
                {settings.activity===opt.value && <span className="badge badge-green">✓</span>}
              </div>
            </div>
          ))}
        </div>

        {/* TDEE display */}
        {tdee && (
          <div className="predict-card" style={{ marginBottom:16 }}>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              <div><div style={{ fontSize:11, color:'var(--muted)' }}>TDEE (maintain)</div><div style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:800, color:'var(--accent)' }}>{tdee} kcal</div></div>
              <div><div style={{ fontSize:11, color:'var(--muted)' }}>Lose 0.5kg/week</div><div style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:800 }}>{tdee-500} kcal</div></div>
              <div><div style={{ fontSize:11, color:'var(--muted)' }}>Gain muscle</div><div style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:800 }}>{tdee+300} kcal</div></div>
            </div>
          </div>
        )}

        {/* Goals */}
        <div className="section-title">Goals</div>
        <div className="form-group">
          <label className="label">Goal</label>
          <select className="input" value={settings.goal||'lose weight'} onChange={e=>upd('goal',e.target.value)}>
            <option value="lose weight">Lose Weight</option>
            <option value="maintain weight">Maintain Weight</option>
            <option value="gain muscle">Gain Muscle</option>
            <option value="improve fitness">Improve Fitness</option>
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="label">Start Weight (kg)</label>
            <input className="input" type="number" step="0.1" value={settings.start_weight||''} onChange={e=>upd('start_weight',e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Goal Weight (kg)</label>
            <input className="input" type="number" step="0.1" value={settings.goal_weight||''} onChange={e=>upd('goal_weight',e.target.value)} />
          </div>
        </div>

        {/* Nutrition Goals */}
        <div className="section-title">Daily Targets</div>
        <div className="form-group">
          <label className="label">Calorie Goal</label>
          <input className="input" type="number" placeholder={tdee||2000} value={settings.calorie_goal||''} onChange={e=>upd('calorie_goal',e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="label">Protein (g)</label>
            <input className="input" type="number" placeholder="150" value={settings.protein_goal||''} onChange={e=>upd('protein_goal',e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Carbs (g)</label>
            <input className="input" type="number" placeholder="250" value={settings.carbs_goal||''} onChange={e=>upd('carbs_goal',e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Fats (g)</label>
            <input className="input" type="number" placeholder="65" value={settings.fats_goal||''} onChange={e=>upd('fats_goal',e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="label">Daily Water Goal (ml)</label>
          <input className="input" type="number" placeholder="2500" value={settings.water_goal_ml||''} onChange={e=>upd('water_goal_ml',e.target.value)} />
        </div>

        {/* Reminders */}
        <div className="section-title">Reminders</div>
        <div className="form-row">
          <div className="form-group">
            <label className="label">Workout Time</label>
            <input className="input" type="time" value={settings.workout_reminder_time||'07:00'} onChange={e=>upd('workout_reminder_time',e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Cardio Time</label>
            <input className="input" type="time" value={settings.cardio_reminder_time||'08:00'} onChange={e=>upd('cardio_reminder_time',e.target.value)} />
          </div>
        </div>
        <button className="btn btn-outline" style={{ marginBottom:16 }} onClick={requestNotifPermission}>
          🔔 Enable Push Notifications
        </button>

        {/* Samsung Health */}
        <div className="section-title">Integrations</div>
        <div className="health-card" style={{ marginBottom:16 }}>
          <div style={{ fontSize:32 }}>❤️</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--font-head)', fontWeight:700 }}>Samsung Health</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>Sync steps, heart rate & calories burned</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>
              {samsungLinked ? '✅ Connected – data syncs automatically' : 'Tap to connect via Samsung Health SDK'}
            </div>
          </div>
          <button className={`btn btn-sm ${samsungLinked?'btn-red':'btn-outline'}`} onClick={toggleSamsungHealth}>
            {samsungLinked ? 'Disconnect' : 'Connect'}
          </button>
        </div>
        <div className="card-sm" style={{ marginBottom:8, opacity:0.7 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <span style={{ fontSize:24 }}>🍎</span>
            <div>
              <div style={{ fontWeight:600, fontSize:14 }}>Apple Health</div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>Available on iOS version</div>
            </div>
            <span className="badge badge-orange" style={{ marginLeft:'auto' }}>iOS only</span>
          </div>
        </div>

        <button className="btn" style={{ marginTop:8 }} onClick={saveAll}>
          {saved ? '✅ Saved!' : '💾 Save All Settings'}
        </button>
      </div>
    </div>
  );
}

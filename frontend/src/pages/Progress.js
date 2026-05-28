import React, { useState, useEffect, useRef } from 'react';
import { api, calcBMI, calcCalorieNeeds, today } from '../utils/api';
import { toast } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';

export default function Progress() {
  const [tab, setTab] = useState('stats');
  const [bodyStats, setBodyStats] = useState([]);
  const [settings, setSettings] = useState({});
  const [photos, setPhotos] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [predLoading, setPredLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [newStat, setNewStat] = useState({ weight_kg:'', height_cm:'', body_fat_pct:'', notes:'' });
  const [photo, setPhoto] = useState(null);
  const fileRef = useRef();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [bs, cfg, ph] = await Promise.all([
      api.get('/api/body-stats'),
      api.get('/api/settings'),
      api.get('/api/body-stats/photos'),
    ]);
    setBodyStats(bs);
    setSettings(cfg);
    setPhotos(ph);
  };

  const logStat = async () => {
    if (!newStat.weight_kg) return toast.error('Enter weight');
    await api.post('/api/body-stats', { ...newStat, photo_base64: photo });
    toast.success('Stats logged!');
    setModal(null);
    setNewStat({ weight_kg:'', height_cm:'', body_fat_pct:'', notes:'' });
    setPhoto(null);
    loadAll();
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target.result.split(',')[1]);
    reader.readAsDataURL(file);
  };

  const viewPhoto = async (id) => {
    const data = await api.get(`/api/body-stats/photo/${id}`);
    setSelectedPhoto(data);
    setModal('photo');
  };

  const getPrediction = async () => {
    setPredLoading(true);
    try {
      const foodLogs = await api.get(`/api/food-logs?date=${today()}`);
      const workoutLogs = await api.get(`/api/workout-logs?date=${today()}`);
      const res = await api.post('/api/ai/predict-progress', {
        current_weight: bodyStats[0]?.weight_kg,
        goal: settings.goal || 'lose weight',
        goal_weight: settings.goal_weight,
        weight_history: bodyStats.map(b => ({ weight: b.weight_kg, date: b.logged_at })),
        calorie_logs: foodLogs,
        workout_logs: workoutLogs,
      });
      setPrediction(res);
    } catch(e) { toast.error('Prediction failed'); }
    setPredLoading(false);
  };

  const latest = bodyStats[0];
  const prev = bodyStats[1];
  const bmi = calcBMI(parseFloat(latest?.weight_kg), parseFloat(settings.height_cm || latest?.height_cm));
  const tdee = calcCalorieNeeds(parseFloat(latest?.weight_kg), parseFloat(settings.height_cm || latest?.height_cm), parseInt(settings.age)||25, settings.gender||'male', settings.activity||'moderate');
  const calGoal = parseInt(settings.calorie_goal) || tdee;
  const deficit = tdee ? tdee - calGoal : null;

  const weightData = bodyStats.slice(0,20).reverse().map(b => ({
    weight: parseFloat(b.weight_kg),
    date: new Date(b.logged_at).toLocaleDateString('en-PK',{day:'numeric',month:'short'}),
  }));

  const bmiPct = bmi ? Math.min(95, Math.max(5, ((parseFloat(bmi.bmi) - 15) / (40 - 15)) * 100)) : 50;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Progress</div>
          <div className="page-subtitle">Track your journey</div>
        </div>
        <button className="btn btn-sm" onClick={()=>setModal('log')}>+ Log</button>
      </div>

      <div className="tab-row" style={{ marginTop:16 }}>
        {['stats','weight','photos','predict'].map(t=>(
          <button key={t} className={`tab-chip ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'stats' && (
        <div className="section">
          {/* BMI */}
          {bmi && (
            <div className="card" style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div>
                  <div style={{ fontFamily:'var(--font-head)', fontSize:13, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>BMI</div>
                  <div style={{ fontFamily:'var(--font-head)', fontSize:36, fontWeight:800, color:'var(--accent)' }}>{bmi.bmi}</div>
                </div>
                <span className={`badge badge-${bmi.category==='Normal'?'green':bmi.category==='Underweight'?'blue':'orange'}`} style={{ fontSize:14, padding:'6px 14px' }}>{bmi.category}</span>
              </div>
              <div className="bmi-meter">
                <div className="bmi-pointer" style={{ left:`${bmiPct}%` }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--muted)', marginTop:2 }}>
                <span>Underweight</span><span>Normal</span><span>Overweight</span><span>Obese</span>
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-icon">⚖️</div>
              <div className="stat-value">{latest?.weight_kg || '—'}kg</div>
              <div className="stat-label">Current Weight</div>
              {prev && <div style={{ fontSize:11, marginTop:4, color: parseFloat(latest.weight_kg)<parseFloat(prev.weight_kg)?'var(--accent)':'var(--red)' }}>
                {parseFloat(latest.weight_kg)<parseFloat(prev.weight_kg)?'↓':'↑'} {Math.abs(parseFloat(latest.weight_kg)-parseFloat(prev.weight_kg)).toFixed(1)}kg
              </div>}
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔥</div>
              <div className="stat-value">{tdee || '—'}</div>
              <div className="stat-label">TDEE (kcal/day)</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📉</div>
              <div className="stat-value">{deficit ? (deficit > 0 ? `-${deficit}` : `+${Math.abs(deficit)}`) : '—'}</div>
              <div className="stat-label">{deficit && deficit > 0 ? 'Calorie Deficit' : 'Calorie Surplus'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-value">{bodyStats.length}</div>
              <div className="stat-label">Check-ins</div>
            </div>
          </div>

          {settings.goal_weight && latest?.weight_kg && (
            <div className="card" style={{ marginTop:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:14, fontWeight:600 }}>Goal Progress</span>
                <span className="badge badge-green">{settings.goal_weight}kg goal</span>
              </div>
              <div className="progress-bar" style={{ height:10 }}>
                <div className="progress-fill" style={{ width:`${Math.min(100,Math.max(0,((parseFloat(settings.start_weight||100)-parseFloat(latest.weight_kg))/(parseFloat(settings.start_weight||100)-parseFloat(settings.goal_weight)))*100))}%` }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:12, color:'var(--muted)' }}>
                <span>{settings.start_weight || '?'}kg start</span>
                <span>{Math.abs(parseFloat(latest.weight_kg)-parseFloat(settings.goal_weight)).toFixed(1)}kg to go</span>
                <span>{settings.goal_weight}kg goal</span>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'weight' && (
        <div className="section">
          {weightData.length < 2 ? (
            <div className="empty"><div className="empty-icon">📊</div><div className="empty-text">Log at least 2 weigh-ins to see chart</div></div>
          ) : (
            <div className="card">
              <div style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:700, marginBottom:12 }}>Weight History</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={weightData}>
                  <defs>
                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00C896" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00C896" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize:10, fill:'#6B7A99' }} />
                  <YAxis tick={{ fontSize:10, fill:'#6B7A99' }} unit="kg" domain={['auto','auto']} width={40} />
                  <Tooltip contentStyle={{ background:'var(--card)', border:'none', fontSize:12 }} formatter={v=>[`${v}kg`,'Weight']} />
                  <Area type="monotone" dataKey="weight" stroke="#00C896" strokeWidth={2} fill="url(#wGrad)" dot={{ fill:'#00C896', r:4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div style={{ marginTop:12 }}>
            {bodyStats.map(b=>(
              <div key={b.id} className="list-item">
                <div className="list-item-icon">⚖️</div>
                <div className="list-item-content">
                  <div className="list-item-title">{parseFloat(b.weight_kg)}kg</div>
                  <div className="list-item-sub">{new Date(b.logged_at).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'})}</div>
                  {b.notes && <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{b.notes}</div>}
                </div>
                {b.body_fat_pct && <span className="badge badge-blue">{b.body_fat_pct}% BF</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'photos' && (
        <div className="section">
          <button className="btn btn-outline" style={{ marginBottom:16 }} onClick={()=>setModal('log')}>📷 Add Progress Photo</button>
          {photos.length === 0 ? (
            <div className="empty"><div className="empty-icon">📷</div><div className="empty-text">No progress photos yet</div></div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {photos.map(p=>(
                <div key={p.id} className="card" style={{ padding:0, overflow:'hidden', cursor:'pointer' }} onClick={()=>viewPhoto(p.id)}>
                  <div style={{ background:'var(--card2)', height:140, display:'flex', alignItems:'center', justifyContent:'center', fontSize:40 }}>📷</div>
                  <div style={{ padding:'8px 10px' }}>
                    <div style={{ fontSize:12, fontWeight:600 }}>{parseFloat(p.weight_kg)}kg</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{new Date(p.logged_at).toLocaleDateString('en-PK',{day:'numeric',month:'short'})}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'predict' && (
        <div className="section">
          <div className="predict-card" style={{ marginBottom:16, textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:4 }}>🔮</div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:18, fontWeight:700 }}>AI Progress Prediction</div>
            <div style={{ fontSize:13, color:'var(--muted)', margin:'8px 0 16px' }}>Get AI-powered predictions based on your actual data</div>
            <button className="btn" onClick={getPrediction} disabled={predLoading}>
              {predLoading ? <><span className="spinner" style={{width:16,height:16}} /> Analyzing...</> : '✨ Predict My Progress'}
            </button>
          </div>

          {prediction && (
            <>
              <div className="card" style={{ marginBottom:12 }}>
                <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:700, marginBottom:8 }}>Summary</div>
                <div style={{ fontSize:14, color:'var(--muted)', lineHeight:1.6 }}>{prediction.summary}</div>
                {prediction.weeks_to_goal && (
                  <div style={{ marginTop:10 }}>
                    <span className="badge badge-green" style={{ fontSize:14, padding:'6px 14px' }}>
                      ~{prediction.weeks_to_goal} weeks to goal
                    </span>
                  </div>
                )}
              </div>

              {prediction.predicted_weights?.length > 0 && (
                <div className="card" style={{ marginBottom:12 }}>
                  <div style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:700, marginBottom:12 }}>8-Week Forecast</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={prediction.predicted_weights}>
                      <XAxis dataKey="week" tick={{ fontSize:10, fill:'#6B7A99' }} tickFormatter={w=>`W${w}`} />
                      <YAxis tick={{ fontSize:10, fill:'#6B7A99' }} unit="kg" domain={['auto','auto']} width={40} />
                      <Tooltip contentStyle={{ background:'var(--card)', border:'none', fontSize:12 }} formatter={v=>[`${v}kg`]} />
                      <Line type="monotone" dataKey="weight" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="5 5" dot={{ fill:'#8B5CF6', r:3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {prediction.advice?.length > 0 && (
                <div>
                  <div className="section-title">Personalized Tips</div>
                  {prediction.advice.map((tip, i) => (
                    <div key={i} className="card-sm" style={{ marginBottom:8, display:'flex', gap:10, alignItems:'flex-start' }}>
                      <span style={{ fontSize:20 }}>💡</span>
                      <span style={{ fontSize:14, color:'var(--muted)', flex:1 }}>{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Log Stats Modal */}
      {modal === 'log' && (
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">Log Stats</div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Weight (kg) *</label>
                <input className="input" type="number" step="0.1" placeholder="70.5" value={newStat.weight_kg} onChange={e=>setNewStat({...newStat,weight_kg:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">Height (cm)</label>
                <input className="input" type="number" placeholder="175" value={newStat.height_cm} onChange={e=>setNewStat({...newStat,height_cm:e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Body Fat % (optional)</label>
              <input className="input" type="number" step="0.1" placeholder="15" value={newStat.body_fat_pct} onChange={e=>setNewStat({...newStat,body_fat_pct:e.target.value})} />
            </div>
            <div className="form-group">
              <label className="label">Notes</label>
              <input className="input" placeholder="How are you feeling?" value={newStat.notes} onChange={e=>setNewStat({...newStat,notes:e.target.value})} />
            </div>
            <div className="form-group">
              <label className="label">Progress Photo (optional)</label>
              <button className="btn btn-ghost" onClick={()=>fileRef.current.click()}>
                {photo ? '✅ Photo selected' : '📷 Choose Photo'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhoto} />
            </div>
            <button className="btn" onClick={logStat}>✓ Save Stats</button>
          </div>
        </div>
      )}

      {/* Photo view modal */}
      {modal === 'photo' && selectedPhoto && (
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div style={{ textAlign:'center', marginBottom:8 }}>
              <div style={{ fontFamily:'var(--font-head)', fontWeight:700 }}>{parseFloat(selectedPhoto.weight_kg)}kg</div>
              <div style={{ color:'var(--muted)', fontSize:13 }}>{new Date(selectedPhoto.logged_at).toLocaleDateString('en-PK',{day:'numeric',month:'long',year:'numeric'})}</div>
            </div>
            {selectedPhoto.photo_base64 ? (
              <img src={`data:image/jpeg;base64,${selectedPhoto.photo_base64}`} alt="progress" style={{ width:'100%', borderRadius:12 }} />
            ) : (
              <div style={{ textAlign:'center', color:'var(--muted)', padding:40 }}>No image available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

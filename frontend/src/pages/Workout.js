import React, { useState, useEffect, useCallback } from 'react';
import { api, today } from '../utils/api';
import { toast } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MUSCLES = ['All','Chest','Back','Shoulders','Biceps','Triceps','Legs','Calves','Abs','Cardio'];

export default function Workout() {
  const [tab, setTab] = useState('today');
  const [exercises, setExercises] = useState([]);
  const [plans, setPlans] = useState([]);
  const [logs, setLogs] = useState([]);
  const [muscle, setMuscle] = useState('All');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // 'log', 'plan', 'exercise', 'progress'
  const [selected, setSelected] = useState(null);
  const [sets, setSets] = useState([{ reps: 10, weight_kg: 20 }]);
  const [notes, setNotes] = useState('');
  const [planDay, setPlanDay] = useState(DAYS[0]);
  const [planName, setPlanName] = useState('');
  const [planExercises, setPlanExercises] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [suggestion, setSuggestion] = useState(null);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [ex, p, l] = await Promise.all([
      api.get('/api/exercises'),
      api.get('/api/workout-plans'),
      api.get(`/api/workout-logs?date=${today()}`),
    ]);
    setExercises(ex);
    setPlans(p);
    setLogs(l);
  };

  const filteredExercises = exercises.filter(e => {
    const matchMuscle = muscle === 'All' || e.muscle_group === muscle || e.category === muscle;
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase());
    return matchMuscle && matchSearch;
  });

  const todayPlan = plans.find(p => p.day_of_week === todayDay);

  const openLog = (ex) => {
    setSelected(ex);
    setSets([{ reps: 10, weight_kg: 20 }]);
    setNotes('');
    setModal('log');
  };

  const addSet = () => setSets([...sets, { reps: sets[sets.length-1].reps, weight_kg: sets[sets.length-1].weight_kg }]);
  const removeSet = (i) => setSets(sets.filter((_,idx) => idx !== i));
  const updateSet = (i, field, val) => setSets(sets.map((s,idx) => idx===i ? {...s,[field]:val} : s));

  const logWorkout = async () => {
    if (!selected) return;
    const promises = sets.map(s => api.post('/api/workout-logs', {
      exercise_id: selected.id,
      exercise_name: selected.name,
      sets: 1,
      reps: parseInt(s.reps),
      weight_kg: parseFloat(s.weight_kg),
      notes,
    }));
    await Promise.all(promises);
    toast.success(`${selected.name} logged!`);
    setModal(null);
    loadAll();
  };

  const calcDuration = (plan) => {
    if (!plan?.exercises) return 0;
    return plan.exercises.reduce((total, ex) => {
      const exData = exercises.find(e => e.id === ex.id || e.name === ex.name);
      const dur = exData?.avg_duration_per_set || 45;
      const sets = ex.sets || 3;
      return total + (dur * sets) + (sets * 60); // rest time
    }, 0);
  };

  const formatDuration = (secs) => {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    return m < 60 ? `${m} min` : `${Math.floor(m/60)}h ${m%60}m`;
  };

  const showProgress = async (ex) => {
    const data = await api.get(`/api/exercise-progress/${ex.id}`);
    setProgressData(data);
    setSelected(ex);
    setModal('progress');
  };

  const openPlan = (day) => {
    const existing = plans.find(p => p.day_of_week === day);
    setPlanDay(day);
    setPlanName(existing?.name || '');
    setPlanExercises(existing?.exercises || []);
    setModal('plan');
  };

  const savePlan = async () => {
    await api.post('/api/workout-plans', { day_of_week: planDay, name: planName, exercises: planExercises });
    toast.success('Plan saved!');
    setModal(null);
    loadAll();
  };

  const deletePlan = async (id) => {
    await api.del(`/api/workout-plans/${id}`);
    toast.success('Deleted');
    loadAll();
  };

  const addToPlan = (ex) => {
    if (!planExercises.find(e => e.id === ex.id)) {
      setPlanExercises([...planExercises, { id: ex.id, name: ex.name, sets: 3, reps: 10 }]);
    }
  };

  const getSuggestions = async () => {
    setLoadingSuggest(true);
    try {
      const recentMuscles = [...new Set(logs.map(l => exercises.find(e=>e.id===l.exercise_id)?.muscle_group).filter(Boolean))];
      const res = await api.post('/api/ai/suggest-exercises', {
        recent_exercises: logs.map(l => l.exercise_name),
        muscle_groups_worked: recentMuscles,
        goal: 'muscle gain'
      });
      setSuggestion(res);
    } catch(e) { toast.error('AI suggestion failed'); }
    setLoadingSuggest(false);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Workout</div>
          <div className="page-subtitle">{todayDay}</div>
        </div>
        <button className="btn btn-sm" onClick={() => openPlan(todayDay)}>Plan Day</button>
      </div>

      <div className="tab-row" style={{ marginTop: 16 }}>
        {['today','exercises','planner','calendar'].map(t => (
          <button key={t} className={`tab-chip ${tab===t?'active':''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'today' && (
        <div className="section">
          {/* Today's plan */}
          {todayPlan && (
            <div style={{ marginBottom: 16 }}>
              <div className="section-title">{todayPlan.name || todayDay} · Est. {formatDuration(calcDuration(todayPlan))}</div>
              {todayPlan.exercises?.map((ex, i) => {
                const done = logs.filter(l => l.exercise_name === ex.name);
                return (
                  <div key={i} className="list-item" onClick={() => openLog(exercises.find(e=>e.id===ex.id)||{id:ex.id,name:ex.name})}>
                    <div className={`list-item-icon muscle-${(ex.muscle_group||'chest').toLowerCase()}`}>
                      {done.length > 0 ? '✅' : '🏋️'}
                    </div>
                    <div className="list-item-content">
                      <div className="list-item-title">{ex.name}</div>
                      <div className="list-item-sub">{ex.sets}×{ex.reps} {done.length>0 ? `· ✓ ${done.length} set logged` : ''}</div>
                    </div>
                    <div style={{ color: 'var(--accent)', fontSize: 20 }}>+</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Today's logs */}
          <div className="section-title">Today's Logs</div>
          {logs.length === 0 ? (
            <div className="empty"><div className="empty-icon">🏋️</div><div className="empty-text">No workouts logged today</div></div>
          ) : (
            logs.map(l => (
              <div key={l.id} className="list-item">
                <div className="list-item-icon">💪</div>
                <div className="list-item-content">
                  <div className="list-item-title">{l.exercise_name}</div>
                  <div className="list-item-sub">{l.reps} reps · {l.weight_kg}kg</div>
                </div>
                <button className="btn btn-sm btn-red" onClick={() => api.del(`/api/workout-logs/${l.id}`).then(loadAll)}>✕</button>
              </div>
            ))
          )}

          {/* AI Suggestions */}
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-outline" onClick={getSuggestions} disabled={loadingSuggest}>
              {loadingSuggest ? <><span className="spinner" style={{width:16,height:16}} /> Getting AI suggestions...</> : '🤖 Suggest Exercise Variations'}
            </button>
          </div>
          {suggestion?.suggestions && (
            <div style={{ marginTop: 12 }}>
              <div className="section-title">AI Recommendations</div>
              {suggestion.suggestions.map((s, i) => (
                <div key={i} className="card-sm" style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{s.exercise}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.reason}</div>
                  <span className="badge badge-purple" style={{ marginTop: 4 }}>{s.muscle_group}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'exercises' && (
        <div className="section">
          <input className="input" placeholder="🔍 Search exercises..." value={search} onChange={e=>setSearch(e.target.value)} style={{ marginBottom: 12 }} />
          <div className="tab-row" style={{ padding: 0, marginBottom: 12 }}>
            {MUSCLES.map(m => <button key={m} className={`tab-chip ${muscle===m?'active':''}`} onClick={()=>setMuscle(m)}>{m}</button>)}
          </div>
          {filteredExercises.map(ex => (
            <div key={ex.id} className="list-item">
              <div className={`list-item-icon muscle-${ex.muscle_group?.toLowerCase()}`}>
                {ex.category === 'Cardio' ? '🏃' : ex.category === 'Bodyweight' ? '🤸' : '🏋️'}
              </div>
              <div className="list-item-content" onClick={() => openLog(ex)} style={{ cursor: 'pointer' }}>
                <div className="list-item-title">{ex.name}</div>
                <div className="list-item-sub">{ex.muscle_group} · {ex.equipment}</div>
              </div>
              <div className="list-item-right">
                <button className="btn btn-sm btn-ghost" onClick={() => showProgress(ex)}>📈</button>
                <button className="btn btn-sm" onClick={() => openLog(ex)}>Log</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'planner' && (
        <div className="section">
          {DAYS.map(day => {
            const plan = plans.find(p => p.day_of_week === day);
            const isToday = day === todayDay;
            return (
              <div key={day} className="card" style={{ marginBottom: 10, border: isToday ? '1.5px solid var(--accent)' : undefined }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700 }}>{day}</span>
                      {isToday && <span className="badge badge-green">Today</span>}
                    </div>
                    {plan ? (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {plan.name || 'Workout'} · {plan.exercises?.length || 0} exercises · {formatDuration(calcDuration(plan))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Rest day / No plan</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-outline" onClick={() => openPlan(day)}>
                      {plan ? 'Edit' : 'Add'}
                    </button>
                    {plan && <button className="btn btn-sm btn-red" onClick={() => deletePlan(plan.id)}>✕</button>}
                  </div>
                </div>
                {plan?.exercises?.slice(0,3).map((e,i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>• {e.name} ({e.sets}×{e.reps})</div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'calendar' && <CalendarView plans={plans} />}

      {/* Log Modal */}
      {modal === 'log' && selected && (
        <div className="modal-backdrop" onClick={e => e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">{selected.name}</div>
            {selected.demo_url && <img src={selected.demo_url} alt="demo" style={{ width:'100%', borderRadius:12, marginBottom:12 }} />}
            <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 1fr 32px', gap: 6, marginBottom: 6 }}>
              <div />
              <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>Reps</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>Weight (kg)</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>Vol</div>
              <div />
            </div>
            {sets.map((s, i) => (
              <div key={i} className="set-row">
                <div className="set-num">{i+1}</div>
                <input className="set-input" type="number" value={s.reps} onChange={e=>updateSet(i,'reps',e.target.value)} />
                <input className="set-input" type="number" value={s.weight_kg} step="0.5" onChange={e=>updateSet(i,'weight_kg',e.target.value)} />
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>{(s.reps*s.weight_kg).toFixed(0)}</div>
                <button className="set-del" onClick={()=>removeSet(i)}>✕</button>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={addSet}>+ Add Set</button>
            <div className="form-group">
              <input className="input" placeholder="Notes (optional)..." value={notes} onChange={e=>setNotes(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, background:'var(--card2)', borderRadius:10, padding:10, marginBottom:14 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total volume:</span>
              <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{sets.reduce((t,s)=>t+(s.reps*s.weight_kg),0).toFixed(1)}kg</span>
              <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 'auto' }}>{sets.length} sets</span>
            </div>
            <button className="btn" onClick={logWorkout}>✓ Log Workout</button>
          </div>
        </div>
      )}

      {/* Plan Modal */}
      {modal === 'plan' && (
        <div className="modal-backdrop" onClick={e => e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">Plan: {planDay}</div>
            <div className="form-group">
              <label className="label">Workout Name</label>
              <input className="input" placeholder="e.g. Push Day, Legs, etc." value={planName} onChange={e=>setPlanName(e.target.value)} />
            </div>
            <div className="section-title" style={{ marginBottom: 10 }}>Exercises in Plan</div>
            {planExercises.map((ex, i) => (
              <div key={i} className="list-item" style={{ marginBottom: 8 }}>
                <div className="list-item-content">
                  <div className="list-item-title">{ex.name}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <input className="set-input" type="number" value={ex.sets} style={{ width: 60 }} onChange={e=>setPlanExercises(planExercises.map((p,pi)=>pi===i?{...p,sets:e.target.value}:p))} placeholder="Sets" />
                    <span style={{ alignSelf:'center', color:'var(--muted)', fontSize:12 }}>sets ×</span>
                    <input className="set-input" type="number" value={ex.reps} style={{ width: 60 }} onChange={e=>setPlanExercises(planExercises.map((p,pi)=>pi===i?{...p,reps:e.target.value}:p))} placeholder="Reps" />
                    <span style={{ alignSelf:'center', color:'var(--muted)', fontSize:12 }}>reps</span>
                  </div>
                </div>
                <button className="btn btn-sm btn-red" onClick={()=>setPlanExercises(planExercises.filter((_,pi)=>pi!==i))}>✕</button>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
              <div className="section-title">Add Exercise</div>
              <input className="input" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{ marginBottom: 8 }} />
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {exercises.filter(e=>!search||e.name.toLowerCase().includes(search.toLowerCase())).slice(0,20).map(ex=>(
                  <div key={ex.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ fontSize:14 }}>{ex.name}</span>
                    <button className="btn btn-sm" style={{ width:'auto',padding:'4px 12px' }} onClick={()=>addToPlan(ex)}>+</button>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn" style={{ marginTop: 16 }} onClick={savePlan}>Save Plan</button>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {modal === 'progress' && selected && (
        <div className="modal-backdrop" onClick={e => e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">{selected.name} Progress</div>
            {progressData.length === 0 ? (
              <div className="empty"><div className="empty-text">No history yet for this exercise</div></div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={progressData.map(d => ({ kg: d.weight_kg, date: new Date(d.logged_at).toLocaleDateString('en-PK',{day:'numeric',month:'short'}) }))}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6B7A99' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#6B7A99' }} unit="kg" width={35} />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: 'none', fontSize: 12 }} />
                    <Line type="monotone" dataKey="kg" stroke="#00C896" strokeWidth={2} dot={{ fill: '#00C896', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:12 }}>
                  <div className="stat-card">
                    <div className="stat-label">Best</div>
                    <div className="stat-value">{Math.max(...progressData.map(d=>d.weight_kg))}kg</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Latest</div>
                    <div className="stat-value">{progressData[progressData.length-1]?.weight_kg}kg</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Sessions</div>
                    <div className="stat-value">{progressData.length}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarView({ plans }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  const [dayModal, setDayModal] = useState(null);

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  useEffect(() => { loadCalendar(); }, [month, year]);

  const loadCalendar = async () => {
    const data = await api.get(`/api/calendar?month=${month+1}&year=${year}`);
    setCalendarDays(data);
  };

  const getDayOfWeek = (date) => new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

  const toggleDay = async (date, isRest) => {
    const plan = plans.find(p => p.day_of_week === getDayOfWeek(date));
    await api.post('/api/calendar', { date, is_rest_day: isRest, workout_plan_id: plan?.id || null, completed: false });
    loadCalendar();
    setDayModal(null);
  };

  const markComplete = async (date) => {
    const existing = calendarDays.find(d => d.date?.split('T')[0] === date);
    await api.post('/api/calendar', { date, is_rest_day: existing?.is_rest_day || false, workout_plan_id: existing?.workout_plan_id, completed: true });
    loadCalendar();
    setDayModal(null);
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];

  const cells = [];
  for (let i = 0; i < (firstDay || 7) - 1; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getDayData = (d) => {
    if (!d) return null;
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return calendarDays.find(c => c.date?.split('T')[0] === dateStr);
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="section">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <button className="btn btn-ghost btn-sm" onClick={()=>setCurrentDate(new Date(year,month-1,1))}>◀</button>
        <span style={{ fontFamily:'var(--font-head)', fontWeight:700 }}>{monthName}</span>
        <button className="btn btn-ghost btn-sm" onClick={()=>setCurrentDate(new Date(year,month+1,1))}>▶</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:8 }}>
        {['M','T','W','T','F','S','S'].map((d,i)=>(
          <div key={i} style={{ textAlign:'center', fontSize:11, color:'var(--muted)', padding:'4px 0' }}>{d}</div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const dayData = getDayData(d);
          const isToday = dateStr === todayStr;
          const dayName = getDayOfWeek(dateStr);
          const plan = plans.find(p => p.day_of_week === dayName);
          return (
            <div key={i}
              className={`cal-day ${isToday?'today':''} ${dayData?.completed?'completed':''} ${dayData?.is_rest_day?'rest':plan?'workout':''}`}
              onClick={()=>setDayModal({dateStr, d, dayName, dayData, plan})}>
              <span>{d}</span>
              {dayData?.completed && <div className="cal-dot" style={{ background:'var(--accent)' }} />}
              {plan && !dayData?.completed && <div className="cal-dot" style={{ background:'var(--orange)' }} />}
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', gap:12, marginTop:16, flexWrap:'wrap' }}>
        {[['var(--accent)','Completed'],['var(--orange)','Planned'],['rgba(59,130,246,0.5)','Rest']].map(([c,l])=>(
          <div key={l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--muted)' }}>
            <div style={{ width:8,height:8,borderRadius:'50%',background:c }} />{l}
          </div>
        ))}
      </div>
      {dayModal && (
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setDayModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">{dayModal.dayName}, {new Date(dayModal.dateStr+'T00:00').toLocaleDateString('en-PK',{day:'numeric',month:'long'})}</div>
            {dayModal.plan && <div style={{ marginBottom:12 }}><span className="badge badge-green">Workout: {dayModal.plan.name||dayModal.dayName}</span></div>}
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button className="btn" onClick={()=>markComplete(dayModal.dateStr)}>✅ Mark Completed</button>
              <button className="btn btn-outline" onClick={()=>toggleDay(dayModal.dateStr,true)}>🛌 Mark Rest Day</button>
              <button className="btn btn-ghost" onClick={()=>toggleDay(dayModal.dateStr,false)}>🏋️ Mark Workout Day</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

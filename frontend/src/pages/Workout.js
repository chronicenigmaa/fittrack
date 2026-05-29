import React, { useState, useEffect, useCallback } from 'react';
import { api, today, calcCalorieNeeds } from '../utils/api';
import { toast } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MUSCLES = ['All','Chest','Back','Shoulders','Biceps','Triceps','Legs','Calves','Abs','Cardio'];
const TRAINING_DAY_MAP = {
  1: ['Monday'],
  2: ['Monday', 'Thursday'],
  3: ['Monday', 'Wednesday', 'Friday'],
  4: ['Monday', 'Tuesday', 'Thursday', 'Saturday'],
  5: ['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday'],
  6: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  7: DAYS,
};
const SPLIT_TYPES = {
  1: ['Full Body'],
  2: ['Upper', 'Lower'],
  3: ['Push', 'Pull', 'Legs'],
  4: ['Upper', 'Lower', 'Push', 'Pull + Legs'],
  5: ['Push', 'Pull', 'Legs', 'Upper', 'Lower'],
  6: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'],
  7: ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Cardio + Core', 'Mobility'],
};
// Gym: full machine + cable + free weight access
const GYM_SPLIT_EXERCISES = {
  'Push':        ['Bench Press', 'Incline Bench Press', 'Overhead Press', 'Lateral Raises', 'Tricep Pushdown', 'Cable Flyes'],
  'Pull':        ['Pull-Ups', 'Lat Pulldown', 'Barbell Rows', 'Seated Cable Row', 'Barbell Curl', 'Face Pulls'],
  'Legs':        ['Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raises', 'Leg Extension'],
  'Upper':       ['Bench Press', 'Barbell Rows', 'Overhead Press', 'Lat Pulldown', 'Lateral Raises', 'Tricep Pushdown'],
  'Lower':       ['Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raises', 'Glute Bridge'],
  'Full Body':   ['Squat', 'Bench Press', 'Lat Pulldown', 'Romanian Deadlift', 'Overhead Press', 'Barbell Rows'],
  'Pull + Legs': ['Deadlift', 'Lat Pulldown', 'Seated Cable Row', 'Lunges', 'Leg Curl', 'Barbell Curl'],
  'Cardio + Core': ['Running', 'Rowing Machine', 'Plank', 'Hanging Leg Raise', 'Cable Crunch', 'Russian Twists'],
  'Mobility':    ['Cycling', 'Push-Ups', 'Plank', 'Jump Rope', 'Ab Wheel Rollout'],
};

// Home: barbell + dumbbell only — no cables, no machines
const HOME_SPLIT_EXERCISES = {
  'Push':        ['Barbell Bench Press', 'Dumbbell Incline Press', 'Dumbbell Shoulder Press', 'Dumbbell Lateral Raises', 'Skull Crushers', 'Diamond Push-Ups'],
  'Pull':        ['Barbell Rows', 'Dumbbell Rows', 'Pull-Ups', 'Barbell Curl', 'Hammer Curls', 'Dumbbell Pullover'],
  'Legs':        ['Barbell Squat', 'Romanian Deadlift', 'Dumbbell Lunges', 'Bulgarian Split Squat', 'Dumbbell Step-Ups', 'Calf Raises'],
  'Upper':       ['Barbell Bench Press', 'Barbell Rows', 'Dumbbell Shoulder Press', 'Dumbbell Lateral Raises', 'Barbell Curl', 'Skull Crushers'],
  'Lower':       ['Barbell Squat', 'Romanian Deadlift', 'Dumbbell Lunges', 'Bulgarian Split Squat', 'Glute Bridge', 'Calf Raises'],
  'Full Body':   ['Barbell Squat', 'Barbell Bench Press', 'Barbell Rows', 'Romanian Deadlift', 'Dumbbell Shoulder Press', 'Barbell Curl'],
  'Pull + Legs': ['Deadlift', 'Barbell Rows', 'Dumbbell Rows', 'Dumbbell Lunges', 'Romanian Deadlift', 'Hammer Curls'],
  'Cardio + Core': ['Jump Rope', 'Burpees', 'Mountain Climbers', 'Plank', 'Russian Twists', 'Bicycle Crunches'],
  'Mobility':    ['Push-Ups', 'Dumbbell Lunges', 'Plank', 'Jumping Jacks', 'Leg Raises'],
};

// Ab finishers added to every strength session
const GYM_ABS  = ['Cable Crunch', 'Hanging Leg Raise', 'Ab Wheel Rollout', 'Russian Twists', 'Decline Sit-Ups'];
const HOME_ABS = ['Plank', 'Bicycle Crunches', 'Leg Raises', 'Russian Twists', 'Crunches', 'Mountain Climbers'];

// Cardio sessions injected on rest days based on goal
const CARDIO_BY_GOAL = { 'fat loss': 2, 'improve fitness': 2, 'maintain weight': 1, 'gain muscle': 0 };
const GYM_CARDIO_EXERCISES  = ['Treadmill Run', 'Rowing Machine', 'Stationary Bike', 'Jump Rope'];
const HOME_CARDIO_EXERCISES = ['Jump Rope', 'Burpees', 'Mountain Climbers', 'High Knees'];

const getLocalDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getExerciseMedia = (exercise) => {
  if (exercise?.demo_url) return exercise.demo_url;
  if (exercise?.category === 'Cardio') return '/exercise-media/cardio.svg';
  if (exercise?.category === 'Bodyweight') return '/exercise-media/bodyweight.svg';
  if (exercise?.category === 'Core' || exercise?.muscle_group === 'Abs') return '/exercise-media/core.svg';
  return '/exercise-media/strength.svg';
};

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
  const [lastSession, setLastSession] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [settings, setSettings] = useState({});
  const [splitConfig, setSplitConfig] = useState({ daysPerWeek: 4, range: 'week', goal: 'fat loss', location: 'gym', intensity: 'moderate' });
  const [generatedSplit, setGeneratedSplit] = useState(null);
  const [splitLoading, setSplitLoading] = useState(false);
  const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [ex, p, l, cfg] = await Promise.all([
      api.get('/api/exercises'),
      api.get('/api/workout-plans'),
      api.get(`/api/workout-logs?date=${today()}`),
      api.get('/api/settings'),
    ]);
    setExercises(ex);
    setPlans(p);
    setLogs(l);
    setSettings(cfg);
  };

  const filteredExercises = exercises.filter(e => {
    const matchMuscle = muscle === 'All' || e.muscle_group === muscle || e.category === muscle;
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase());
    return matchMuscle && matchSearch;
  });

  const todayPlan = plans.find(p => p.day_of_week === todayDay);

  const openLog = async (ex) => {
    setSelected(ex);
    setNotes('');
    setLastSession(null);
    setModal('log');
    try {
      const history = await api.get(`/api/exercise-progress/${ex.id}`);
      if (history && history.length > 0) {
        const last = history[history.length - 1];
        setLastSession(last);
        setSets([{ reps: last.reps || 10, weight_kg: last.weight_kg || 20 }]);
      } else {
        setSets([{ reps: 10, weight_kg: 20 }]);
      }
    } catch {
      setSets([{ reps: 10, weight_kg: 20 }]);
    }
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
    const maxLogged = Math.max(...sets.map(s => parseFloat(s.weight_kg)));
    if (lastSession && maxLogged > parseFloat(lastSession.weight_kg)) {
      toast.success(`New PR on ${selected.name}! ${maxLogged}kg`, { icon: '🏆', duration: 4000 });
    } else {
      toast.success(`${selected.name} logged!`);
    }
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

  const openSplitBuilder = () => {
    setGeneratedSplit(null);
    setSplitConfig(prev => ({ ...prev, goal: settings.goal || prev.goal }));
    setModal('aiSplit');
  };

  const CARDIO_NAMES = new Set(['Treadmill Run','Rowing Machine','Stationary Bike','Jump Rope','Burpees','Mountain Climbers','High Knees','Running','Cycling']);
  const buildExerciseForSplit = (name, intensity) => {
    const found = exercises.find(e => e.name === name) || exercises.find(e => name.includes(e.muscle_group));
    const isCardio = found?.category === 'Cardio' || CARDIO_NAMES.has(name);
    const isCore = found?.category === 'Core' || found?.muscle_group === 'Abs';
    let sets, reps;
    if (isCardio) {
      sets = intensity === 'intense' ? 2 : 1;
      reps = intensity === 'intense' ? 15 : intensity === 'easy' ? 12 : 20;
    } else if (isCore) {
      sets = intensity === 'intense' ? 4 : intensity === 'easy' ? 2 : 3;
      reps = intensity === 'intense' ? 20 : intensity === 'easy' ? 12 : 15;
    } else {
      sets = intensity === 'intense' ? 5 : intensity === 'easy' ? 2 : 4;
      reps = intensity === 'intense' ? 6 : intensity === 'easy' ? 15 : 10;
    }
    return {
      id: found?.id,
      name: found?.name || name,
      muscle_group: found?.muscle_group || 'Full Body',
      sets,
      reps,
    };
  };

  const generateSplit = () => {
    setSplitLoading(true);
    const daysPerWeek = Math.min(7, Math.max(1, parseInt(splitConfig.daysPerWeek) || 4));
    const trainingDays = TRAINING_DAY_MAP[daysPerWeek] || TRAINING_DAY_MAP[4];
    const splitTypes = SPLIT_TYPES[daysPerWeek] || SPLIT_TYPES[4];
    const isHome = splitConfig.location === 'home';
    const intensity = splitConfig.intensity || 'moderate';
    const exerciseDB = isHome ? HOME_SPLIT_EXERCISES : GYM_SPLIT_EXERCISES;
    const abPool = isHome ? HOME_ABS : GYM_ABS;

    const tdee = calcCalorieNeeds(
      parseFloat(settings.weight_kg),
      parseFloat(settings.height_cm),
      parseInt(settings.age) || 25,
      settings.gender || 'male',
      settings.activity || 'moderate'
    );
    const calorieGoal = parseInt(settings.calorie_goal);
    const deficit = tdee && calorieGoal ? tdee - calorieGoal : null;

    const absOnlyDays = new Set(['Cardio + Core', 'Mobility']);

    const strengthPlans = trainingDays.map((day, index) => {
      const type = splitTypes[index % splitTypes.length];
      const baseNames = exerciseDB[type] || exerciseDB['Full Body'];
      const abEx = absOnlyDays.has(type) ? [] : [abPool[index % abPool.length]];
      const allNames = [...baseNames, ...abEx];
      return {
        day,
        name: `${type} · ${isHome ? 'Home' : 'Gym'}`,
        exercises: allNames.map(name => buildExerciseForSplit(name, intensity)),
      };
    });

    // Inject dedicated cardio sessions on rest days based on goal
    const restDays = DAYS.filter(d => !trainingDays.includes(d));
    const cardioDaysCount = Math.min(CARDIO_BY_GOAL[splitConfig.goal] || 0, restDays.length);
    const cardioExPool = isHome ? HOME_CARDIO_EXERCISES : GYM_CARDIO_EXERCISES;
    const cardioPlans = restDays.slice(0, cardioDaysCount).map(day => ({
      day,
      name: `Cardio · ${isHome ? 'Home' : 'Gym'}`,
      isCardio: true,
      exercises: cardioExPool.map(name => buildExerciseForSplit(name, intensity)),
    }));

    const allPlans = [...strengthPlans, ...cardioPlans].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day));

    const intensityLabel = { easy: 'Easy', moderate: 'Moderate', intense: 'Intense' }[intensity] || 'Moderate';
    const locationNote = isHome ? 'Home setup — barbell and dumbbells only.' : 'Full gym — machines, cables, and free weights.';
    const deficitNote = deficit !== null ? ` Calorie ${deficit >= 0 ? 'deficit' : 'surplus'} ~${Math.abs(deficit)} kcal/day.` : '';
    const cardioNote = cardioDaysCount > 0 ? ` ${cardioDaysCount} separate cardio session${cardioDaysCount > 1 ? 's' : ''} added on rest days.` : '';
    const guidance = `${intensityLabel} intensity. ${locationNote}${deficitNote}${cardioNote} Ab finisher on every strength session.`;

    setGeneratedSplit({
      plans: allPlans,
      range: splitConfig.range,
      daysPerWeek,
      goal: splitConfig.goal,
      location: splitConfig.location,
      intensity,
      guidance,
    });
    setSplitLoading(false);
  };

  const approveSplit = async () => {
    if (!generatedSplit?.plans?.length) return;
    setSplitLoading(true);
    try {
      const saved = {};
      for (const plan of generatedSplit.plans) {
        const savedPlan = await api.post('/api/workout-plans', {
          day_of_week: plan.day,
          name: plan.name,
          exercises: plan.exercises,
        });
        saved[plan.day] = savedPlan;
      }

      const start = new Date();
      let rangeDays;
      if (generatedSplit.range === 'month') {
        const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        rangeDays = lastDayOfMonth.getDate() - start.getDate() + 1;
      } else {
        rangeDays = 7;
      }
      for (let i = 0; i < rangeDays; i++) {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const plan = saved[dayName];
        await api.post('/api/calendar', {
          date: getLocalDate(date),
          is_rest_day: !plan,
          workout_plan_id: plan?.id || null,
          completed: false,
        });
      }

      toast.success('Split approved and added to planner');
      setModal(null);
      setTab('planner');
      loadAll();
    } catch (e) {
      toast.error(e.message || 'Split could not be saved');
    }
    setSplitLoading(false);
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
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-sm btn-outline" onClick={openSplitBuilder}>AI Split</button>
          <button className="btn btn-sm" onClick={() => openPlan(todayDay)}>Plan Day</button>
        </div>
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
                      {done.length > 0 ? 'Done' : 'Set'}
                    </div>
                    <div className="list-item-content">
                      <div className="list-item-title">{ex.name}</div>
                      <div className="list-item-sub">{ex.sets}×{ex.reps} {done.length>0 ? `· ${done.length} set logged` : ''}</div>
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
            <div className="empty"><div className="empty-icon">Workout</div><div className="empty-text">No workouts logged today</div></div>
          ) : (
            logs.map(l => (
              <div key={l.id} className="list-item">
                <div className="list-item-icon">Log</div>
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
              {loadingSuggest ? <><span className="spinner" style={{width:16,height:16}} /> Getting suggestions...</> : 'Suggest Exercise Variations'}
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
          <input className="input" placeholder="Search exercises..." value={search} onChange={e=>setSearch(e.target.value)} style={{ marginBottom: 12 }} />
          <div className="tab-row" style={{ padding: 0, marginBottom: 12 }}>
            {MUSCLES.map(m => <button key={m} className={`tab-chip ${muscle===m?'active':''}`} onClick={()=>setMuscle(m)}>{m}</button>)}
          </div>
          {filteredExercises.map(ex => (
            <div key={ex.id} className="list-item">
              <img className="exercise-thumb" src={getExerciseMedia(ex)} alt={`${ex.name} demo`} onError={e => { e.target.onerror=null; e.target.src='/exercise-media/strength.svg'; }} />
              <div className={`list-item-icon muscle-${ex.muscle_group?.toLowerCase()}`}>
                {ex.category === 'Cardio' ? 'Run' : ex.category === 'Bodyweight' ? 'BW' : 'Lift'}
              </div>
              <div className="list-item-content" onClick={() => openLog(ex)} style={{ cursor: 'pointer' }}>
                <div className="list-item-title">{ex.name}</div>
                <div className="list-item-sub">{ex.muscle_group} · {ex.equipment}</div>
              </div>
              <div className="list-item-right">
                <button className="btn btn-sm btn-ghost" onClick={() => showProgress(ex)}>Chart</button>
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
            <img src={getExerciseMedia(selected)} alt={`${selected.name} demo`} className="exercise-hero" onError={e => { e.target.onerror=null; e.target.src='/exercise-media/strength.svg'; }} />

            {/* Last session & PR */}
            {lastSession && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1, background: 'rgba(15,159,110,0.08)', border: '1px solid rgba(15,159,110,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 800, marginBottom: 2 }}>Last Session</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-head)' }}>{lastSession.weight_kg} kg</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{new Date(lastSession.logged_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 800, marginBottom: 2 }}>Target Today</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-head)' }}>{(parseFloat(lastSession.weight_kg) + 2.5).toFixed(1)} kg</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>+2.5 kg overload</div>
                </div>
              </div>
            )}

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
            <button className="btn" onClick={logWorkout}>Log Workout</button>
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

      {/* AI Split Modal */}
      {modal === 'aiSplit' && (
        <div className="modal-backdrop" onClick={e => e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">AI Split Builder</div>
            {!generatedSplit ? (
              <>
                {/* Location toggle */}
                <div className="form-group">
                  <label className="label">Where are you training?</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { id: 'gym',  label: 'Gym', sub: 'Machines + cables + free weights' },
                      { id: 'home', label: 'Home', sub: 'Barbell + dumbbells only' },
                    ].map(loc => (
                      <button
                        key={loc.id}
                        onClick={() => setSplitConfig({ ...splitConfig, location: loc.id })}
                        style={{
                          padding: '14px 12px',
                          borderRadius: 12,
                          border: splitConfig.location === loc.id ? '2px solid var(--accent)' : '2px solid var(--border)',
                          background: splitConfig.location === loc.id ? 'rgba(15,159,110,0.08)' : 'var(--card2)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.18s',
                        }}
                      >
                        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 15, color: splitConfig.location === loc.id ? 'var(--accent)' : 'var(--text)', marginBottom: 3 }}>{loc.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{loc.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Intensity toggle */}
                <div className="form-group">
                  <label className="label">Workout intensity</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {[
                      { id: 'easy',     label: 'Easy',     sub: '2 sets · 12–15 reps' },
                      { id: 'moderate', label: 'Moderate', sub: '4 sets · 8–12 reps' },
                      { id: 'intense',  label: 'Intense',  sub: '5 sets · 5–8 reps' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setSplitConfig({ ...splitConfig, intensity: opt.id })}
                        style={{
                          padding: '12px 8px',
                          borderRadius: 12,
                          border: splitConfig.intensity === opt.id ? '2px solid var(--accent)' : '2px solid var(--border)',
                          background: splitConfig.intensity === opt.id ? 'rgba(15,159,110,0.08)' : 'var(--card2)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.18s',
                        }}
                      >
                        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 14, color: splitConfig.intensity === opt.id ? 'var(--accent)' : 'var(--text)', marginBottom: 3 }}>{opt.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="label">How many times do you want to train per week?</label>
                  <select className="input" value={splitConfig.daysPerWeek} onChange={e=>setSplitConfig({...splitConfig, daysPerWeek:e.target.value})}>
                    {[1,2,3,4,5,6,7].map(d => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''} per week</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Create calendar for</label>
                  <select className="input" value={splitConfig.range} onChange={e=>setSplitConfig({...splitConfig, range:e.target.value})}>
                    <option value="week">Next 7 days (from today)</option>
                    <option value="month">This month (today → month end)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Primary goal</label>
                  <select className="input" value={splitConfig.goal} onChange={e=>setSplitConfig({...splitConfig, goal:e.target.value})}>
                    <option value="fat loss">Fat loss / calorie deficit</option>
                    <option value="gain muscle">Gain muscle</option>
                    <option value="maintain weight">Maintain weight</option>
                    <option value="improve fitness">Improve fitness</option>
                  </select>
                </div>
                <button className="btn" onClick={generateSplit} disabled={splitLoading}>
                  {splitLoading ? <><span className="spinner" style={{width:16,height:16}} /> Creating split...</> : 'Create Split Preview'}
                </button>
              </>
            ) : (
              <>
                <div className="predict-card" style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                    <span style={{ fontWeight:700 }}>{generatedSplit.daysPerWeek} days/week</span>
                    <span className={`badge ${generatedSplit.location === 'home' ? 'badge-blue' : 'badge-purple'}`}>
                      {generatedSplit.location === 'home' ? 'Home' : 'Gym'}
                    </span>
                    <span className="badge" style={{ background: generatedSplit.intensity === 'intense' ? 'rgba(239,68,68,0.12)' : generatedSplit.intensity === 'easy' ? 'rgba(59,130,246,0.12)' : 'rgba(217,119,6,0.12)', color: generatedSplit.intensity === 'intense' ? 'var(--red)' : generatedSplit.intensity === 'easy' ? '#3b82f6' : 'var(--orange)' }}>
                      {{ easy: 'Easy', moderate: 'Moderate', intense: 'Intense' }[generatedSplit.intensity] || 'Moderate'}
                    </span>
                  </div>
                  <div style={{ fontWeight:600, fontSize:13, color:'var(--muted)', marginBottom:6 }}>
                    {(() => {
                      const s = new Date();
                      const days = generatedSplit.range === 'month'
                        ? new Date(s.getFullYear(), s.getMonth() + 1, 0).getDate() - s.getDate() + 1
                        : 7;
                      const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + days - 1);
                      return `${s.toLocaleDateString('en-PK',{day:'numeric',month:'short'})} → ${e.toLocaleDateString('en-PK',{day:'numeric',month:'short'})}`;
                    })()}
                  </div>
                  <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.5 }}>{generatedSplit.guidance}</div>
                </div>
                {generatedSplit.plans.map(plan => {
                  const absOnlyDays = new Set(['Cardio + Core', 'Mobility']);
                  const splitType = plan.name.split(' ·')[0].trim();
                  const hasAbFinisher = !plan.isCardio && !absOnlyDays.has(splitType);
                  return (
                  <div key={plan.day} className="card-sm" style={{ marginBottom:10, borderLeft: plan.isCardio ? '3px solid #3b82f6' : undefined }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginBottom:8 }}>
                      <div style={{ fontWeight:800 }}>{plan.day}</div>
                      <span className={`badge ${plan.isCardio ? 'badge-blue' : 'badge-green'}`}>{plan.name}</span>
                    </div>
                    {plan.exercises.map((ex, ei) => {
                      const isAb = hasAbFinisher && ei === plan.exercises.length - 1;
                      return (
                      <div key={`${plan.day}-${ex.name}`} style={{ fontSize:12, color: isAb ? 'var(--orange)' : plan.isCardio ? '#3b82f6' : 'var(--muted)', marginTop:4, display:'flex', alignItems:'center', gap:6 }}>
                        {ex.name} · {ex.sets}×{ex.reps}
                        {isAb && <span style={{ fontSize:10, fontWeight:700, background:'rgba(217,119,6,0.12)', color:'var(--orange)', borderRadius:4, padding:'1px 5px' }}>ABS</span>}
                      </div>
                    )})}
                  </div>
                  );
                })}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:14 }}>
                  <button className="btn btn-outline" onClick={()=>setGeneratedSplit(null)}>Reject</button>
                  <button className="btn" onClick={approveSplit} disabled={splitLoading}>
                    {splitLoading ? <span className="spinner" style={{width:16,height:16}} /> : 'Approve'}
                  </button>
                </div>
              </>
            )}
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
                    <div className="stat-label">PR</div>
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
                {/* Weight history log */}
                <div style={{ marginTop: 16 }}>
                  <div className="section-title" style={{ marginBottom: 8 }}>Weight History</div>
                  <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[...progressData].reverse().map((d, i) => {
                      const prev = progressData[progressData.length - 1 - i - 1];
                      const diff = prev ? d.weight_kg - prev.weight_kg : 0;
                      const isPR = d.weight_kg === Math.max(...progressData.map(x => x.weight_kg));
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--card2)', borderRadius: 10, border: isPR ? '1.5px solid var(--orange)' : '1px solid var(--border)' }}>
                          <div>
                            <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 15 }}>{d.weight_kg} kg</span>
                            {isPR && <span className="badge badge-orange" style={{ marginLeft: 8 }}>PR</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {diff !== 0 && (
                              <span style={{ fontSize: 12, fontWeight: 700, color: diff > 0 ? 'var(--accent)' : 'var(--red)' }}>
                                {diff > 0 ? '+' : ''}{diff.toFixed(1)}kg
                              </span>
                            )}
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(d.logged_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        </div>
                      );
                    })}
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
        <button className="btn btn-ghost btn-sm" onClick={()=>setCurrentDate(new Date(year,month-1,1))}>Prev</button>
        <span style={{ fontFamily:'var(--font-head)', fontWeight:700 }}>{monthName}</span>
        <button className="btn btn-ghost btn-sm" onClick={()=>setCurrentDate(new Date(year,month+1,1))}>Next</button>
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
              <button className="btn" onClick={()=>markComplete(dayModal.dateStr)}>Mark Completed</button>
              <button className="btn btn-outline" onClick={()=>toggleDay(dayModal.dateStr,true)}>Mark Rest Day</button>
              <button className="btn btn-ghost" onClick={()=>toggleDay(dayModal.dateStr,false)}>Mark Workout Day</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

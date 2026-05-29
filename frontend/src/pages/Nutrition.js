import React, { useState, useEffect, useRef } from 'react';
import { api, today } from '../utils/api';
import { toast } from 'react-hot-toast';

const WATER_STEPS = [200, 250, 300, 350, 400, 500]; // ml options

export default function Nutrition() {
  const [tab, setTab] = useState('diary');
  const [logs, setLogs] = useState([]);
  const [waterLogs, setWaterLogs] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [modal, setModal] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [settings, setSettings] = useState({});
  const [newFood, setNewFood] = useState({ food_name:'', calories:'', protein:'', carbs:'', fats:'', quantity:'1', unit:'serving' });
  const [barcode, setBarcode] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState(null);
  const [recipe, setRecipe] = useState({ name:'', ingredients_text:'', servings:1 });
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeResult, setRecipeResult] = useState(null);
  const [waterAmount, setWaterAmount] = useState(250);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [l, w, r, cfg] = await Promise.all([
      api.get(`/api/food-logs?date=${today()}`),
      api.get(`/api/water-logs?date=${today()}`),
      api.get('/api/recipes'),
      api.get('/api/settings'),
    ]);
    setLogs(l);
    setWaterLogs(w);
    setRecipes(r);
    setSettings(cfg);
  };

  const searchFood = async (q) => {
    if (!q.trim()) return setSearchResults([]);
    setSearching(true);
    const res = await api.get(`/api/foods/search?q=${encodeURIComponent(q)}`);
    setSearchResults(res);
    setSearching(false);
  };

  const selectFood = (food) => {
    setNewFood({
      food_name: food.food_name,
      calories: food.calories?.toFixed(1) || '',
      protein: food.protein?.toFixed(1) || '',
      carbs: food.carbs?.toFixed(1) || '',
      fats: food.fats?.toFixed(1) || '',
      quantity: '1',
      unit: food.unit || 'serving',
    });
    setSearchResults([]);
    setSearchQ(food.food_name);
  };

  const logFood = async () => {
    if (!newFood.food_name || !newFood.calories) return toast.error('Enter food name and calories');
    await api.post('/api/food-logs', newFood);
    toast.success('Food logged!');
    setModal(null);
    setNewFood({ food_name:'', calories:'', protein:'', carbs:'', fats:'', quantity:'1', unit:'serving' });
    setSearchQ('');
    loadAll();
  };

  const scanBarcode = async () => {
    if (!barcode.trim()) return;
    setBarcodeLoading(true);
    setBarcodeResult(null);
    const res = await api.post('/api/ai/barcode-food', { barcode });
    setBarcodeResult(res);
    if (res.found) {
      setNewFood({ food_name: res.food_name, calories: res.calories, protein: res.protein, carbs: res.carbs, fats: res.fats, quantity: '100', unit: res.unit || '100g' });
    }
    setBarcodeLoading(false);
  };

  const logWater = async () => {
    await api.post('/api/water-logs', { amount_ml: waterAmount });
    toast.success(`${waterAmount}ml water logged`);
    loadAll();
  };

  const calculateRecipe = async () => {
    if (!recipe.name || !recipe.ingredients_text) return toast.error('Enter recipe name and ingredients');
    setRecipeLoading(true);
    const res = await api.post('/api/ai/recipe-calories', { recipe_name: recipe.name, ingredients: recipe.ingredients_text });
    setRecipeResult(res);
    setRecipeLoading(false);
  };

  const saveRecipe = async () => {
    if (!recipeResult) return;
    await api.post('/api/recipes', {
      name: recipe.name,
      ingredients: recipeResult.ingredients || [],
      total_calories: recipeResult.total_calories,
      total_protein: recipeResult.total_protein,
      total_carbs: recipeResult.total_carbs,
      total_fats: recipeResult.total_fats,
      servings: recipeResult.servings || 1,
    });
    toast.success('Recipe saved!');
    setModal(null);
    setRecipe({ name:'', ingredients_text:'', servings:1 });
    setRecipeResult(null);
    loadAll();
  };

  const logRecipeFood = async (r) => {
    await api.post('/api/food-logs', {
      food_name: r.name,
      calories: r.total_calories / (r.servings || 1),
      protein: r.total_protein / (r.servings || 1),
      carbs: r.total_carbs / (r.servings || 1),
      fats: r.total_fats / (r.servings || 1),
      quantity: 1,
      unit: '1 serving',
    });
    toast.success(`${r.name} logged!`);
    loadAll();
  };

  const totalCal = logs.reduce((t, l) => t + (l.calories * l.quantity), 0);
  const totalPro = logs.reduce((t, l) => t + (l.protein * l.quantity), 0);
  const totalCarb = logs.reduce((t, l) => t + (l.carbs * l.quantity), 0);
  const totalFat = logs.reduce((t, l) => t + (l.fats * l.quantity), 0);
  const totalWater = waterLogs.reduce((t, l) => t + l.amount_ml, 0);
  const goalCal = parseInt(settings.calorie_goal) || 2000;
  const goalWater = parseInt(settings.water_goal_ml) || 2500;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Nutrition</div>
          <div className="page-subtitle">{new Date().toLocaleDateString('en-PK',{day:'numeric',month:'short'})}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-sm btn-outline" onClick={()=>setTab('water')}>+ Water</button>
          <button className="btn btn-sm" onClick={()=>setModal('food')}>+ Food</button>
        </div>
      </div>

      {/* Daily summary */}
      <div className="section">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon">Kcal</div>
            <div className="stat-value">{Math.round(totalCal)}</div>
            <div className="stat-label">of {goalCal} kcal</div>
            <div className="progress-bar"><div className="progress-fill" style={{ width:`${Math.min(100,(totalCal/goalCal)*100)}%` }} /></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">Water</div>
            <div className="stat-value">{totalWater}ml</div>
            <div className="stat-label">of {goalWater}ml</div>
            <div className="progress-bar"><div className="progress-fill" style={{ width:`${Math.min(100,(totalWater/goalWater)*100)}%`, background:'linear-gradient(90deg,#3B82F6,#00C896)' }} /></div>
            <button className="btn btn-sm btn-ghost" style={{ marginTop:8, width:'100%' }} onClick={()=>setTab('water')}>Add Water</button>
          </div>
          <div className="stat-card">
            <div className="stat-icon">Pro</div>
            <div className="stat-value">{Math.round(totalPro)}g</div>
            <div className="stat-label">Protein</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">Carb</div>
            <div className="stat-value">{Math.round(totalCarb)}g</div>
            <div className="stat-label">Carbs</div>
          </div>
        </div>
      </div>

      <div className="tab-row">
        {['diary','water','recipes','barcode'].map(t=>(
          <button key={t} className={`tab-chip ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
            {t==='barcode'?'Scan':t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'diary' && (
        <div className="section">
          {logs.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">Food</div>
              <div className="empty-text">No food logged today</div>
              <button className="btn" style={{ maxWidth:180, margin:'12px auto 0' }} onClick={()=>setModal('food')}>+ Log Food</button>
            </div>
          ) : (
            logs.map(l => (
              <div key={l.id} className="list-item">
                <div className="list-item-icon">Food</div>
                <div className="list-item-content">
                  <div className="list-item-title">{l.food_name}</div>
                  <div className="list-item-sub">{Math.round(l.calories * l.quantity)} kcal · P:{Math.round(l.protein*l.quantity)}g C:{Math.round(l.carbs*l.quantity)}g F:{Math.round(l.fats*l.quantity)}g</div>
                </div>
                <button className="btn btn-sm btn-red" onClick={()=>api.del(`/api/food-logs/${l.id}`).then(loadAll)}>✕</button>
              </div>
            ))
          )}
          <div style={{ marginTop: 12, padding: '12px', background:'var(--card2)', borderRadius:12, border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
              <span style={{ color:'var(--muted)' }}>Total Macros</span>
              <span style={{ color:'var(--accent)', fontWeight:700 }}>{Math.round(totalCal)} kcal</span>
            </div>
            <div style={{ display:'flex', gap:12, marginTop:8, flexWrap:'wrap' }}>
              <MacroChip label="Protein" value={Math.round(totalPro)} unit="g" color="#00C896" />
              <MacroChip label="Carbs" value={Math.round(totalCarb)} unit="g" color="#3B82F6" />
              <MacroChip label="Fats" value={Math.round(totalFat)} unit="g" color="#FFA502" />
            </div>
          </div>
        </div>
      )}

      {tab === 'water' && (
        <div className="section">
          <div className="card" style={{ textAlign:'center', marginBottom:16 }}>
            <div className="stat-icon" style={{ marginBottom:4 }}>Water</div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:36, fontWeight:800, color:'var(--blue)' }}>{totalWater}ml</div>
            <div style={{ color:'var(--muted)', fontSize:14 }}>Goal: {goalWater}ml</div>
            <div className="progress-bar" style={{ marginTop:12 }}>
              <div className="progress-fill" style={{ width:`${Math.min(100,(totalWater/goalWater)*100)}%`, background:'linear-gradient(90deg,#3B82F6,#00C896)' }} />
            </div>
          </div>
          <div className="section-title">Quick Add</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
            {WATER_STEPS.map(ml=>(
              <button key={ml} className={`tab-chip ${waterAmount===ml?'active':''}`} onClick={()=>setWaterAmount(ml)} style={{ borderColor:'var(--blue)' }}>
                {ml}ml
              </button>
            ))}
          </div>
          <div className="form-group">
            <label className="label">Custom amount (ml)</label>
            <input className="input" type="number" value={waterAmount} onChange={e=>setWaterAmount(parseInt(e.target.value))} />
          </div>
          <button className="btn" style={{ background:'var(--blue)' }} onClick={logWater}>Log {waterAmount}ml</button>
          <div style={{ marginTop:16 }}>
            <div className="section-title">Today's Log</div>
            {waterLogs.map(l=>(
              <div key={l.id} className="list-item">
                <div className="list-item-icon" style={{ background:'rgba(37,99,235,0.08)', color:'var(--blue)' }}>Water</div>
                <div className="list-item-content">
                  <div className="list-item-title">{l.amount_ml}ml</div>
                  <div className="list-item-sub">{new Date(l.logged_at).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'recipes' && (
        <div className="section">
          <button className="btn btn-outline" style={{ marginBottom:16 }} onClick={()=>setModal('recipe')}>+ Create Recipe</button>
          {recipes.length === 0 ? (
            <div className="empty"><div className="empty-icon">Recipes</div><div className="empty-text">No recipes saved yet</div></div>
          ) : (
            recipes.map(r=>(
              <div key={r.id} className="card" style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:700 }}>{r.name}</div>
                    <div style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>{r.servings} servings · {Math.round(r.total_calories / r.servings)} kcal/serving</div>
                  </div>
                  <button className="btn btn-sm btn-red" onClick={()=>api.del(`/api/recipes/${r.id}`).then(loadAll)}>✕</button>
                </div>
                <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
                  <MacroChip label="P" value={Math.round(r.total_protein/r.servings)} unit="g" color="#00C896" />
                  <MacroChip label="C" value={Math.round(r.total_carbs/r.servings)} unit="g" color="#3B82F6" />
                  <MacroChip label="F" value={Math.round(r.total_fats/r.servings)} unit="g" color="#FFA502" />
                </div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop:10, width:'100%' }} onClick={()=>logRecipeFood(r)}>+ Log 1 Serving</button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'barcode' && (
        <div className="section">
          <div className="card" style={{ textAlign:'center', padding:24 }}>
            <div className="stat-icon" style={{ marginBottom:8 }}>Scan</div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:18, fontWeight:700, marginBottom:4 }}>Barcode Scanner</div>
            <div style={{ color:'var(--muted)', fontSize:13, marginBottom:16 }}>Enter barcode number from Pakistani food products</div>
          </div>
          <div className="form-group" style={{ marginTop:16 }}>
            <label className="label">Barcode Number</label>
            <div style={{ display:'flex', gap:8 }}>
              <input className="input" placeholder="e.g. 8901030804647" value={barcode} onChange={e=>setBarcode(e.target.value)} style={{ flex:1 }} />
              <button className="btn" style={{ width:'auto', padding:'12px 16px' }} onClick={scanBarcode} disabled={barcodeLoading}>
                {barcodeLoading ? <span className="spinner" style={{width:16,height:16}} /> : 'Find'}
              </button>
            </div>
          </div>
          {barcodeResult && (
            <div className={`card ${barcodeResult.found ? '' : ''}`} style={{ marginTop:12 }}>
              {barcodeResult.found ? (
                <>
                  <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:700 }}>{barcodeResult.food_name}</div>
                  {barcodeResult.brand && <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{barcodeResult.brand}</div>}
                  <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
                    <MacroChip label="Calories" value={Math.round(barcodeResult.calories)} unit="/100g" color="#FF4757" />
                    <MacroChip label="Protein" value={Math.round(barcodeResult.protein)} unit="g" color="#00C896" />
                    <MacroChip label="Carbs" value={Math.round(barcodeResult.carbs)} unit="g" color="#3B82F6" />
                    <MacroChip label="Fats" value={Math.round(barcodeResult.fats)} unit="g" color="#FFA502" />
                  </div>
                  <button className="btn" style={{ marginTop:12 }} onClick={()=>setModal('food')}>+ Log This Food</button>
                </>
              ) : (
                <div style={{ color:'var(--muted)', textAlign:'center' }}>Product not found. Try adding manually.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Food Log Modal */}
      {modal === 'food' && (
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">Log Food</div>
            <div className="form-group">
              <label className="label">Search Food</label>
              <input className="input" placeholder="Search Pakistani & international foods..." value={searchQ}
                onChange={e=>{setSearchQ(e.target.value);searchFood(e.target.value);}} />
              {searching && <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>Searching...</div>}
              {searchResults.length > 0 && (
                <div style={{ background:'var(--card2)', borderRadius:10, border:'1px solid var(--border)', marginTop:4, maxHeight:160, overflowY:'auto' }}>
                  {searchResults.map((f,i)=>(
                    <div key={i} style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)', cursor:'pointer' }} onClick={()=>selectFood(f)}>
                      <div style={{ fontSize:14, fontWeight:500 }}>{f.food_name}</div>
                      <div style={{ fontSize:12, color:'var(--muted)' }}>{Math.round(f.calories)} kcal · {f.unit}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="label">Food Name *</label>
              <input className="input" placeholder="Food name" value={newFood.food_name} onChange={e=>setNewFood({...newFood,food_name:e.target.value})} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Quantity</label>
                <input className="input" type="number" value={newFood.quantity} onChange={e=>setNewFood({...newFood,quantity:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">Unit</label>
                <input className="input" placeholder="g / serving / piece" value={newFood.unit} onChange={e=>setNewFood({...newFood,unit:e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Calories *</label>
                <input className="input" type="number" placeholder="kcal" value={newFood.calories} onChange={e=>setNewFood({...newFood,calories:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">Protein (g)</label>
                <input className="input" type="number" value={newFood.protein} onChange={e=>setNewFood({...newFood,protein:e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Carbs (g)</label>
                <input className="input" type="number" value={newFood.carbs} onChange={e=>setNewFood({...newFood,carbs:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">Fats (g)</label>
                <input className="input" type="number" value={newFood.fats} onChange={e=>setNewFood({...newFood,fats:e.target.value})} />
              </div>
            </div>
            <button className="btn" onClick={logFood}>Log Food</button>
          </div>
        </div>
      )}

      {/* Recipe Modal */}
      {modal === 'recipe' && (
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">Create Recipe</div>
            <div className="form-group">
              <label className="label">Recipe Name</label>
              <input className="input" placeholder="e.g. Chicken Karahi, Daal..." value={recipe.name} onChange={e=>setRecipe({...recipe,name:e.target.value})} />
            </div>
            <div className="form-group">
              <label className="label">Ingredients (list them out)</label>
              <textarea className="input" rows={5} placeholder={"500g chicken\n2 tomatoes\n1 tbsp oil\n1 tsp salt\n..."}
                value={recipe.ingredients_text} onChange={e=>setRecipe({...recipe,ingredients_text:e.target.value})} />
            </div>
            <button className="btn btn-outline" onClick={calculateRecipe} disabled={recipeLoading}>
              {recipeLoading ? <><span className="spinner" style={{width:16,height:16}} /> Calculating...</> : 'Calculate Nutrition'}
            </button>
            {recipeResult && (
              <div className="predict-card" style={{ marginTop:14 }}>
                <div style={{ fontWeight:700, marginBottom:8 }}>Nutrition Breakdown</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <div><span style={{ color:'var(--muted)', fontSize:12 }}>Total Calories</span><div style={{ fontWeight:700, color:'var(--accent)' }}>{Math.round(recipeResult.total_calories)}</div></div>
                  <div><span style={{ color:'var(--muted)', fontSize:12 }}>Servings</span><div style={{ fontWeight:700 }}>{recipeResult.servings}</div></div>
                  <div><span style={{ color:'var(--muted)', fontSize:12 }}>Per Serving</span><div style={{ fontWeight:700 }}>{Math.round(recipeResult.per_serving_calories || recipeResult.total_calories/recipeResult.servings)} kcal</div></div>
                  <div><span style={{ color:'var(--muted)', fontSize:12 }}>Protein</span><div style={{ fontWeight:700, color:'#00C896' }}>{Math.round(recipeResult.total_protein)}g</div></div>
                </div>
                <button className="btn" style={{ marginTop:14 }} onClick={saveRecipe}>Save Recipe</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MacroChip({ label, value, unit, color }) {
  return (
    <div style={{ background:`${color}22`, borderRadius:8, padding:'4px 10px', display:'flex', gap:4, alignItems:'center' }}>
      <span style={{ fontSize:11, color:'var(--muted)' }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:700, color }}>{value}{unit}</span>
    </div>
  );
}

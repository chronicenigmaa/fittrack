import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { toast } from 'react-hot-toast';

const CATEGORIES = ['All', 'Main Course', 'Rice', 'Lentils', 'BBQ / Grills', 'Vegetables', 'Soups', 'Dessert'];

const CATEGORY_ICONS = {
  'Main Course': 'Main', 'Rice': 'Rice', 'Lentils': 'Daal', 'BBQ / Grills': 'Grill',
  'Vegetables': 'Veg', 'Soups': 'Soup', 'Dessert': 'Sweet', 'All': 'All'
};

export default function PakistaniRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [category, setCategory] = useState('All');
  const [highProtein, setHighProtein] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null); // 'detail', 'add'
  const [servings, setServings] = useState(1);
  const [addForm, setAddForm] = useState({ name:'', category:'Main Course', prep_time_min:15, cook_time_min:30, servings:4, calories_per_serving:'', protein_per_serving:'', carbs_per_serving:'', fats_per_serving:'', ingredients_text:'', steps_text:'', is_high_protein:false });
  const [calcLoading, setCalcLoading] = useState(false);

  useEffect(() => { loadRecipes(); }, [category, highProtein, search]);

  const loadRecipes = async () => {
    let url = `/api/pakistani-recipes?category=${encodeURIComponent(category)}&high_protein=${highProtein}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const data = await api.get(url);
    setRecipes(data);
  };

  const openRecipe = (r) => {
    setSelected(r);
    setServings(1);
    setModal('detail');
  };

  const logToDay = async () => {
    try {
      await api.post(`/api/pakistani-recipes/${selected.id}/log`, { servings_count: servings });
      toast.success(`${selected.name} logged to diary!`);
      setModal(null);
    } catch(e) { toast.error('Failed to log'); }
  };

  const autoCalcNutrition = async () => {
    if (!addForm.ingredients_text.trim()) return toast.error('Enter ingredients first');
    setCalcLoading(true);
    try {
      const res = await api.post('/api/ai/recipe-calories', {
        recipe_name: addForm.name || 'Recipe',
        ingredients: addForm.ingredients_text,
      });
      if (res.total_calories != null) {
        const srv = parseInt(addForm.servings) || 1;
        setAddForm(f => ({
          ...f,
          calories_per_serving: Math.round(res.total_calories / srv),
          protein_per_serving: Math.round((res.total_protein || 0) / srv),
          carbs_per_serving: Math.round((res.total_carbs || 0) / srv),
          fats_per_serving: Math.round((res.total_fats || 0) / srv),
        }));
        toast.success('Nutrition calculated from ingredients!');
      } else {
        toast.error('Could not calculate — try listing ingredients with quantities (e.g. "500g chicken")');
      }
    } catch (e) {
      toast.error('Calculation failed. Try again.');
    }
    setCalcLoading(false);
  };

  const saveCustom = async () => {
    if (!addForm.name) return toast.error('Recipe name is required');
    if (!addForm.calories_per_serving) return toast.error('Calculate or enter calories per serving');
    const payload = {
      ...addForm,
      ingredients: addForm.ingredients_text.split('\n').filter(l => l.trim()),
      steps: addForm.steps_text.split('\n').filter(l => l.trim()),
      tags: [],
    };
    await api.post('/api/pakistani-recipes', payload);
    toast.success('Recipe saved!');
    setModal(null);
    setAddForm({ name:'', category:'Main Course', prep_time_min:15, cook_time_min:30, servings:4, calories_per_serving:'', protein_per_serving:'', carbs_per_serving:'', fats_per_serving:'', ingredients_text:'', steps_text:'', is_high_protein:false });
    loadRecipes();
  };

  const macroCalories = (r) => {
    const s = servings || 1;
    return {
      cal: Math.round(r.calories_per_serving * s),
      pro: Math.round(r.protein_per_serving * s),
      carb: Math.round(r.carbs_per_serving * s),
      fat: Math.round(r.fats_per_serving * s),
    };
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Recipes</div>
          <div className="page-subtitle">{recipes.length} recipes</div>
        </div>
        <button className="btn btn-sm" onClick={() => setModal('add')}>+ Add</button>
      </div>

      {/* Search */}
      <div className="section" style={{ paddingBottom: 0 }}>
        <input className="input" placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Category filter */}
      <div className="tab-row" style={{ marginTop: 12 }}>
        {CATEGORIES.map(c => (
          <button key={c} className={`tab-chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      {/* High protein toggle */}
      <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          onClick={() => setHighProtein(!highProtein)}
          style={{ width: 44, height: 24, borderRadius: 99, background: highProtein ? 'var(--accent)' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
          <div style={{ position: 'absolute', top: 2, left: highProtein ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
        </div>
        <span style={{ fontSize: 14, color: highProtein ? 'var(--accent)' : 'var(--muted)', fontWeight: highProtein ? 600 : 400 }}>High Protein Only</span>
      </div>

      {/* Recipe grid */}
      <div className="section" style={{ paddingTop: 0 }}>
        {recipes.length === 0 ? (
          <div className="empty"><div className="empty-icon">Recipes</div><div className="empty-text">No recipes found</div></div>
        ) : (
          recipes.map(r => (
            <div key={r.id} className="card" style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => openRecipe(r)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="stat-icon">{CATEGORY_ICONS[r.category] || 'Meal'}</span>
                    <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700 }}>{r.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className="badge badge-orange">{r.category}</span>
                    {r.is_high_protein && <span className="badge badge-green">High Protein</span>}
                    {r.is_user_created && <span className="badge badge-purple">My Recipe</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{r.calories_per_serving}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>kcal/serving</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                <InfoPill icon="Time" label={`${r.prep_time_min + r.cook_time_min} min`} />
                <InfoPill icon="Serv" label={`${r.servings} servings`} />
                <InfoPill icon="Prot" label={`${r.protein_per_serving}g protein`} />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <MacroTag label="P" value={r.protein_per_serving} unit="g" color="#00C896" />
                <MacroTag label="C" value={r.carbs_per_serving} unit="g" color="#3B82F6" />
                <MacroTag label="F" value={r.fats_per_serving} unit="g" color="#FFA502" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recipe Detail Modal */}
      {modal === 'detail' && selected && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxHeight: '92vh' }}>
            <div className="modal-handle" />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div className="modal-title" style={{ marginBottom: 4 }}>{selected.name}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="badge badge-orange">{selected.category}</span>
                  {selected.is_high_protein && <span className="badge badge-green">High Protein</span>}
                </div>
              </div>
              {selected.is_user_created && (
                <button className="btn btn-sm btn-red" onClick={async () => { await api.del(`/api/pakistani-recipes/${selected.id}`); setModal(null); loadRecipes(); }}>Delete</button>
              )}
            </div>

            {/* Time info */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <InfoPill icon="Prep" label={`${selected.prep_time_min} min`} />
              <InfoPill icon="Cook" label={`${selected.cook_time_min} min`} />
              <InfoPill icon="Total" label={`${selected.prep_time_min + selected.cook_time_min} min`} />
            </div>

            {/* Serving adjuster */}
            <div className="card-sm" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Servings</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => setServings(Math.max(0.5, servings - 0.5))} style={{ background: 'var(--border)', border: 'none', color: 'var(--text)', width: 32, height: 32, borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>-</button>
                  <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 18, minWidth: 32, textAlign: 'center' }}>{servings}</span>
                  <button onClick={() => setServings(servings + 0.5)} style={{ background: 'var(--accent)', border: 'none', color: '#000', width: 32, height: 32, borderRadius: 8, fontSize: 18, cursor: 'pointer', fontWeight: 700 }}>+</button>
                </div>
              </div>
              {/* Live nutrition */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
                {[
                  { l: 'Calories', v: macroCalories(selected).cal, unit: 'kcal', c: 'var(--accent)' },
                  { l: 'Protein', v: macroCalories(selected).pro, unit: 'g', c: '#00C896' },
                  { l: 'Carbs', v: macroCalories(selected).carb, unit: 'g', c: '#3B82F6' },
                  { l: 'Fats', v: macroCalories(selected).fat, unit: 'g', c: '#FFA502' },
                ].map(m => (
                  <div key={m.l} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 16, color: m.c }}>{m.v}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{m.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ingredients */}
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Ingredients</div>
            {(Array.isArray(selected.ingredients) ? selected.ingredients : []).map((ing, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>•</span>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>{ing}</span>
              </div>
            ))}

            {/* Steps */}
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15, marginTop: 16, marginBottom: 8 }}>Instructions</div>
            {(Array.isArray(selected.steps) ? selected.steps : []).map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{i + 1}</div>
                <span style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, paddingTop: 4 }}>{step}</span>
              </div>
            ))}

            {/* Tags */}
            {Array.isArray(selected.tags) && selected.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' }}>
                {selected.tags.map((t, i) => <span key={i} className="badge badge-blue">{t}</span>)}
              </div>
            )}

            <button className="btn" style={{ marginTop: 16 }} onClick={logToDay}>
              + Log {servings} Serving{servings !== 1 ? 's' : ''} to Diary
            </button>
          </div>
        </div>
      )}

      {/* Add Custom Recipe Modal */}
      {modal === 'add' && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">Add My Recipe</div>

            {/* Name */}
            <div className="form-group">
              <label className="label">Recipe Name *</label>
              <input className="input" placeholder="e.g. Mum's Special Karahi" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
            </div>

            {/* Category + Servings */}
            <div className="form-row">
              <div className="form-group">
                <label className="label">Category</label>
                <select className="input" value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value })}>
                  {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Servings</label>
                <input className="input" type="number" value={addForm.servings} onChange={e => setAddForm({ ...addForm, servings: e.target.value })} />
              </div>
            </div>

            {/* Times */}
            <div className="form-row">
              <div className="form-group">
                <label className="label">Prep (min)</label>
                <input className="input" type="number" value={addForm.prep_time_min} onChange={e => setAddForm({ ...addForm, prep_time_min: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Cook (min)</label>
                <input className="input" type="number" value={addForm.cook_time_min} onChange={e => setAddForm({ ...addForm, cook_time_min: e.target.value })} />
              </div>
            </div>

            {/* Ingredients + auto-calculate */}
            <div className="form-group">
              <label className="label">Ingredients (one per line with quantity)</label>
              <textarea className="input" rows={4} placeholder={"500g chicken\n2 tomatoes\n1 tbsp oil\n200g rice"} value={addForm.ingredients_text} onChange={e => setAddForm({ ...addForm, ingredients_text: e.target.value })} />
              <button
                className="btn btn-outline btn-sm"
                style={{ marginTop: 8, width: '100%' }}
                onClick={autoCalcNutrition}
                disabled={calcLoading}
              >
                {calcLoading
                  ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Calculating nutrition...</>
                  : 'Auto-Calculate Nutrition from Ingredients'}
              </button>
            </div>

            {/* Nutrition per serving — auto-filled but editable */}
            <div className="section-title" style={{ marginBottom: 10 }}>Nutrition Per Serving</div>
            {addForm.calories_per_serving ? (
              <div style={{ background: 'rgba(15,159,110,0.06)', border: '1px solid rgba(15,159,110,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                Auto-calculated — edit below if needed
              </div>
            ) : (
              <div style={{ background: 'var(--card2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: 'var(--muted)' }}>
                Enter ingredients above and tap Calculate, or fill in manually
              </div>
            )}
            <div className="form-row">
              <div className="form-group">
                <label className="label">Calories (kcal)</label>
                <input className="input" type="number" placeholder="e.g. 450" value={addForm.calories_per_serving} onChange={e => setAddForm({ ...addForm, calories_per_serving: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Protein (g)</label>
                <input className="input" type="number" placeholder="e.g. 35" value={addForm.protein_per_serving} onChange={e => setAddForm({ ...addForm, protein_per_serving: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Carbs (g)</label>
                <input className="input" type="number" placeholder="e.g. 40" value={addForm.carbs_per_serving} onChange={e => setAddForm({ ...addForm, carbs_per_serving: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Fats (g)</label>
                <input className="input" type="number" placeholder="e.g. 12" value={addForm.fats_per_serving} onChange={e => setAddForm({ ...addForm, fats_per_serving: e.target.value })} />
              </div>
            </div>

            {/* Steps */}
            <div className="form-group">
              <label className="label">Steps (one per line)</label>
              <textarea className="input" rows={4} placeholder={"Fry onions until golden\nAdd chicken and cook..."} value={addForm.steps_text} onChange={e => setAddForm({ ...addForm, steps_text: e.target.value })} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <input type="checkbox" id="hp" checked={addForm.is_high_protein} onChange={e => setAddForm({ ...addForm, is_high_protein: e.target.checked })} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
              <label htmlFor="hp" style={{ fontSize: 14 }}>High Protein Recipe</label>
            </div>
            <button className="btn" onClick={saveCustom}>Save Recipe</button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoPill({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--card2)', borderRadius: 8, padding: '4px 8px' }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
    </div>
  );
}

function MacroTag({ label, value, unit, color }) {
  return (
    <div style={{ background: `${color}22`, borderRadius: 8, padding: '3px 8px', display: 'flex', gap: 3, alignItems: 'baseline' }}>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}{unit}</span>
    </div>
  );
}

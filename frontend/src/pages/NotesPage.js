import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { toast } from 'react-hot-toast';

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '' });

  useEffect(() => { loadNotes(); }, []);

  const loadNotes = async () => {
    const data = await api.get('/api/notes');
    setNotes(data);
  };

  const openNew = () => { setEditing(null); setForm({ title:'', content:'' }); setModal('edit'); };
  const openEdit = (note) => { setEditing(note); setForm({ title:note.title, content:note.content }); setModal('edit'); };

  const save = async () => {
    if (!form.content.trim()) return toast.error('Enter note content');
    if (editing) await api.put(`/api/notes/${editing.id}`, form);
    else await api.post('/api/notes', form);
    toast.success('Saved!');
    setModal(null);
    loadNotes();
  };

  const del = async (id) => {
    await api.del(`/api/notes/${id}`);
    toast.success('Deleted');
    loadNotes();
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><div className="page-title">Notes</div><div className="page-subtitle">{notes.length} notes</div></div>
        <button className="btn btn-sm" onClick={openNew}>+ New</button>
      </div>
      <div className="section">
        {notes.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">Notes</div>
            <div className="empty-text">No notes yet</div>
            <button className="btn" style={{ maxWidth:160, margin:'12px auto 0' }} onClick={openNew}>+ Add Note</button>
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="card" style={{ marginBottom:10, cursor:'pointer' }} onClick={()=>openEdit(note)}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ flex:1 }}>
                  {note.title && <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:700, marginBottom:4 }}>{note.title}</div>}
                  <div style={{ fontSize:14, color:'var(--muted)', lineHeight:1.5, whiteSpace:'pre-wrap' }}>{note.content.length > 120 ? note.content.slice(0,120)+'...' : note.content}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:8 }}>{new Date(note.updated_at).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                </div>
                <button className="btn btn-sm btn-red" style={{ marginLeft:8 }} onClick={e=>{e.stopPropagation();del(note.id);}}>✕</button>
              </div>
            </div>
          ))
        )}
      </div>

      {modal === 'edit' && (
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">{editing ? 'Edit Note' : 'New Note'}</div>
            <div className="form-group">
              <label className="label">Title (optional)</label>
              <input className="input" placeholder="Note title..." value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
            </div>
            <div className="form-group">
              <label className="label">Content</label>
              <textarea className="input" rows={8} placeholder="Write your note..." value={form.content} onChange={e=>setForm({...form,content:e.target.value})} />
            </div>
            <button className="btn" onClick={save}>Save Note</button>
          </div>
        </div>
      )}
    </div>
  );
}

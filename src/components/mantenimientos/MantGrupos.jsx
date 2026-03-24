// Mantenimientos — CRUD Grupos (Zonas)
import { useState, useEffect } from 'react';
import { Plus, X, Layers, GripVertical } from 'lucide-react';
import { supabase } from '../../supabase';
import { MantSidebar } from './MantViews';

export function MantGrupos({ user }) {
  const [grupos, setGrupos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [loading, setLoading] = useState(false);
  const [mantCounts, setMantCounts] = useState({});

  const fetchGrupos = async () => {
    const { data } = await supabase.from('Grupos_Mantenimiento').select('*').order('orden');
    setGrupos(data || []);
    // Count maintenances per group
    const { data: mants } = await supabase.from('Mantenimientos').select('id_grupo');
    const counts = {};
    (mants || []).forEach(m => { if (m.id_grupo) counts[m.id_grupo] = (counts[m.id_grupo] || 0) + 1; });
    setMantCounts(counts);
  };

  useEffect(() => { fetchGrupos(); }, []);

  const resetForm = () => { setForm({ nombre: '', descripcion: '' }); setEditingId(null); setShowForm(false); };

  const handleEdit = (g) => { setForm({ nombre: g.nombre, descripcion: g.descripcion || '' }); setEditingId(g.id); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (editingId) {
        await supabase.from('Grupos_Mantenimiento').update(form).eq('id', editingId);
      } else {
        const maxOrden = grupos.reduce((max, g) => Math.max(max, g.orden || 0), 0);
        await supabase.from('Grupos_Mantenimiento').insert([{ ...form, orden: maxOrden + 1 }]);
      }
      resetForm(); await fetchGrupos();
    } catch (err) { alert('Error: ' + err.message); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este grupo? Los mantenimientos asignados se desvinculan.')) return;
    // Unlink maintenances first
    await supabase.from('Mantenimientos').update({ id_grupo: null }).eq('id_grupo', id);
    await supabase.from('Grupos_Mantenimiento').delete().eq('id', id);
    await fetchGrupos();
  };

  const moveGroup = async (index, direction) => {
    const newGrupos = [...grupos];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newGrupos.length) return;
    [newGrupos[index], newGrupos[targetIndex]] = [newGrupos[targetIndex], newGrupos[index]];
    // Update orden for both
    await Promise.all([
      supabase.from('Grupos_Mantenimiento').update({ orden: index }).eq('id', newGrupos[index].id),
      supabase.from('Grupos_Mantenimiento').update({ orden: targetIndex }).eq('id', newGrupos[targetIndex].id),
    ]);
    await fetchGrupos();
  };

  const ZONE_COLORS = ['#0A2342', '#2196F3', '#FF9800', '#9C27B0', '#E91E63', '#28a745', '#00BCD4', '#795548'];

  return (
    <div className="dashboard-layout">
      <MantSidebar user={user} />
      <div className="main-content">
        <div className="header">
          <h1>Grupos / Zonas</h1>
          <button className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={18} /> Nuevo Grupo
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Agrupa los mantenimientos por zonas geográficas para organizar mejor las rutas de los técnicos.
        </p>

        {/* Modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '90%', maxWidth: '450px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>{editingId ? 'Editar Grupo' : 'Nuevo Grupo'}</h2>
                <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="input-group"><label>Nombre del Grupo *</label><input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required placeholder="Ej: Zona Norte, Polígono Industrial..." /></div>
                <div className="input-group"><label>Descripción</label><textarea rows="2" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción opcional de la zona"></textarea></div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={resetForm} className="btn-primary" style={{ backgroundColor: '#6c757d', width: 'auto' }}>Cancelar</button>
                  <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={loading}>{loading ? 'Guardando...' : (editingId ? 'Guardar' : 'Crear Grupo')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Groups List */}
        {grupos.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Layers size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No hay grupos creados. Crea zonas para organizar los mantenimientos.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {grupos.map((g, idx) => (
              <div key={g.id} className="card" style={{ padding: '1rem 1.2rem', borderLeft: `5px solid ${ZONE_COLORS[idx % ZONE_COLORS.length]}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'box-shadow 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button onClick={() => moveGroup(idx, -1)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1, padding: 0, fontSize: '0.7rem' }}>▲</button>
                    <button onClick={() => moveGroup(idx, 1)} disabled={idx === grupos.length - 1} style={{ background: 'none', border: 'none', cursor: idx === grupos.length - 1 ? 'default' : 'pointer', opacity: idx === grupos.length - 1 ? 0.3 : 1, padding: 0, fontSize: '0.7rem' }}>▼</button>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={18} color={ZONE_COLORS[idx % ZONE_COLORS.length]} />
                      <strong style={{ fontSize: '1.05rem' }}>{g.nombre}</strong>
                      <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#f0f4f8', color: '#0A2342', fontWeight: 600 }}>
                        {mantCounts[g.id] || 0} mant.
                      </span>
                    </div>
                    {g.descripcion && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 26px' }}>{g.descripcion}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleEdit(g)} className="btn-primary" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.85rem' }}>Editar</button>
                  <button onClick={() => handleDelete(g.id)} className="btn-primary" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.85rem', backgroundColor: '#dc3545' }}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

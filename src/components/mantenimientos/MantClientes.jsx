// Mantenimientos — CRUD Instalaciones
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, ChevronRight, X } from 'lucide-react';
import { supabase } from '../../supabase';
import { MantSidebar } from './MantViews';

export function MantClientes({ user }) {
  const [instalaciones, setInstalaciones] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const initialForm = {
    direccion: '',
    cif: '',
    contacto_1: '',
    telefono_1: '',
    contacto_2: '',
    telefono_2: '',
    email_contacto: ''
  };
  
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchInstalaciones = async () => {
    try {
      const { data, error } = await supabase.from('Instalaciones').select('*, Puertas(id)').order('direccion');
      if (error) throw error;
      setInstalaciones((data || []).map(c => ({ ...c, total_puertas: c.Puertas?.length || 0 })));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchInstalaciones(); }, []);

  const filtered = instalaciones.filter(c =>
    (c.direccion || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.cif || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.contacto_1 || '').toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (c) => {
    setForm({
      direccion: c.direccion || '',
      cif: c.cif || '',
      contacto_1: c.contacto_1 || '',
      telefono_1: c.telefono_1 || '',
      contacto_2: c.contacto_2 || '',
      telefono_2: c.telefono_2 || '',
      email_contacto: c.email_contacto || ''
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('Instalaciones').update(form).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('Instalaciones').insert([form]);
        if (error) throw error;
      }
      resetForm();
      await fetchInstalaciones();
    } catch (err) { alert('Error al guardar instalación: ' + err.message); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta instalación y todas sus puertas? Esta acción no se puede deshacer.')) return;
    try {
      const { error } = await supabase.from('Instalaciones').delete().eq('id', id);
      if (error) throw error;
      await fetchInstalaciones();
    } catch (err) { alert('Error al eliminar: ' + err.message); }
  };

  return (
    <div className="dashboard-layout">
      <MantSidebar user={user} />
      <div className="main-content">
        <div className="header">
          <h1>Directorio de Instalaciones</h1>
          <button className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={18} /> Nueva Calle/Sede
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input type="text" placeholder="Buscar por dirección, CIF o contacto..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '0.6rem 0.6rem 0.6rem 2.5rem', width: '100%', maxWidth: '400px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.95rem' }} />
        </div>

        {/* Modal Form */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '90%', maxWidth: '550px', maxHeight: '90vh', overflow: 'auto', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>{editingId ? 'Editar Instalación' : 'Nueva Instalación'}</h2>
                <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="input-group"><label>Dirección / Nombre Vía *</label><input type="text" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} required /></div>
                <div className="input-group"><label>CIF / NIF (Opcional)</label><input type="text" value={form.cif} onChange={e => setForm({ ...form, cif: e.target.value })} /></div>
                
                <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: '#666' }}>Contacto Principal</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group"><label>Nombre Contacto 1 *</label><input type="text" value={form.contacto_1} onChange={e => setForm({ ...form, contacto_1: e.target.value })} required /></div>
                  <div className="input-group"><label>Teléfono 1 *</label><input type="tel" value={form.telefono_1} onChange={e => setForm({ ...form, telefono_1: e.target.value })} required /></div>
                </div>
                
                <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: '#666' }}>Contacto Secundario</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group"><label>Nombre Contacto 2 (Opc)</label><input type="text" value={form.contacto_2} onChange={e => setForm({ ...form, contacto_2: e.target.value })} /></div>
                  <div className="input-group"><label>Teléfono 2 (Opc)</label><input type="tel" value={form.telefono_2} onChange={e => setForm({ ...form, telefono_2: e.target.value })} /></div>
                </div>

                <div className="input-group" style={{ marginTop: '1rem' }}><label>Email de Contacto *</label><input type="email" value={form.email_contacto} onChange={e => setForm({ ...form, email_contacto: e.target.value })} required /></div>
                
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" onClick={resetForm} className="btn-secondary" style={{ width: 'auto' }}>Cancelar</button>
                  <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={loading}>{loading ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Crear Instalación')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cards */}
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Building2 size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>{search ? 'No se encontraron resultados' : 'No hay instalaciones registradas.'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filtered.map(c => (
              <div key={c.id} className="card" style={{ cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s', padding: '1.2rem 1.5rem' }}
                onClick={() => navigate(`/admin/mantenimientos/instalacion/${c.id}`)}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(10,35,66,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.4rem' }}>
                      <Building2 size={20} color="var(--primary-color)" />
                      <strong style={{ fontSize: '1.2rem', color: '#0A2342' }}>{c.direccion}</strong>
                      {c.cif && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: '#f0f4f8', padding: '2px 8px', borderRadius: '4px' }}>CIF: {c.cif}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {c.contacto_1 && <span>👤 <strong>{c.contacto_1}</strong> — {c.telefono_1}</span>}
                      {c.email_contacto && <span>📧 {c.email_contacto}</span>}
                      <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>🚪 {c.total_puertas} puerta{c.total_puertas !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(c); }} className="btn-secondary" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.85rem' }}>Editar</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="btn-primary" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.85rem', backgroundColor: '#dc3545' }}>Eliminar</button>
                    <ChevronRight size={20} color="#999" style={{ marginLeft: '10px' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

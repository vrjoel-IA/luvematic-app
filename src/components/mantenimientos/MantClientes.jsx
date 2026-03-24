// Mantenimientos — CRUD Clientes
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, ChevronRight, X } from 'lucide-react';
import { supabase } from '../../supabase';
import { MantSidebar } from './MantViews';

export function MantClientes({ user }) {
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ razon_social: '', cif: '', direccion_fiscal: '', contacto_nombre: '', contacto_telefono: '', contacto_email: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase.from('Clientes_Mant').select('*, Instalaciones(id)').order('razon_social');
      if (error) throw error;
      setClientes((data || []).map(c => ({ ...c, total_instalaciones: c.Instalaciones?.length || 0 })));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchClientes(); }, []);

  const filtered = clientes.filter(c =>
    c.razon_social.toLowerCase().includes(search.toLowerCase()) ||
    (c.cif || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.contacto_nombre || '').toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setForm({ razon_social: '', cif: '', direccion_fiscal: '', contacto_nombre: '', contacto_telefono: '', contacto_email: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (c) => {
    setForm({ razon_social: c.razon_social, cif: c.cif || '', direccion_fiscal: c.direccion_fiscal || '', contacto_nombre: c.contacto_nombre || '', contacto_telefono: c.contacto_telefono || '', contacto_email: c.contacto_email || '' });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('Clientes_Mant').update(form).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('Clientes_Mant').insert([form]);
        if (error) throw error;
      }
      resetForm();
      await fetchClientes();
    } catch (err) { alert('Error al guardar cliente: ' + err.message); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este cliente y todas sus instalaciones? Esta acción no se puede deshacer.')) return;
    try {
      const { error } = await supabase.from('Clientes_Mant').delete().eq('id', id);
      if (error) throw error;
      await fetchClientes();
    } catch (err) { alert('Error al eliminar: ' + err.message); }
  };

  return (
    <div className="dashboard-layout">
      <MantSidebar user={user} />
      <div className="main-content">
        <div className="header">
          <h1>Clientes de Mantenimiento</h1>
          <button className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={18} /> Nuevo Cliente
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input type="text" placeholder="Buscar por nombre, CIF o contacto..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '0.6rem 0.6rem 0.6rem 2.5rem', width: '100%', maxWidth: '400px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.95rem' }} />
        </div>

        {/* Modal Form */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '90%', maxWidth: '550px', maxHeight: '90vh', overflow: 'auto', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="input-group"><label>Razón Social *</label><input type="text" value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} required /></div>
                <div className="input-group"><label>CIF / NIF</label><input type="text" value={form.cif} onChange={e => setForm({ ...form, cif: e.target.value })} /></div>
                <div className="input-group"><label>Dirección Fiscal</label><input type="text" value={form.direccion_fiscal} onChange={e => setForm({ ...form, direccion_fiscal: e.target.value })} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group"><label>Persona de Contacto</label><input type="text" value={form.contacto_nombre} onChange={e => setForm({ ...form, contacto_nombre: e.target.value })} /></div>
                  <div className="input-group"><label>Teléfono</label><input type="tel" value={form.contacto_telefono} onChange={e => setForm({ ...form, contacto_telefono: e.target.value })} /></div>
                </div>
                <div className="input-group"><label>Email de Contacto</label><input type="email" value={form.contacto_email} onChange={e => setForm({ ...form, contacto_email: e.target.value })} /></div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" onClick={resetForm} className="btn-primary" style={{ backgroundColor: '#6c757d', width: 'auto' }}>Cancelar</button>
                  <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={loading}>{loading ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Crear Cliente')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Client Cards */}
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Building2 size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>{search ? 'No se encontraron resultados' : 'No hay clientes registrados. ¡Crea el primero!'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filtered.map(c => (
              <div key={c.id} className="card" style={{ cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s', padding: '1.2rem 1.5rem' }}
                onClick={() => navigate(`/admin/mantenimientos/cliente/${c.id}`)}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(10,35,66,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.4rem' }}>
                      <Building2 size={20} color="var(--primary-color)" />
                      <strong style={{ fontSize: '1.1rem' }}>{c.razon_social}</strong>
                      {c.cif && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: '#f0f4f8', padding: '2px 8px', borderRadius: '4px' }}>{c.cif}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                      {c.contacto_nombre && <span>👤 {c.contacto_nombre}</span>}
                      {c.contacto_telefono && <span>📞 {c.contacto_telefono}</span>}
                      <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>🏢 {c.total_instalaciones} instalación{c.total_instalaciones !== 1 ? 'es' : ''}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(c); }} className="btn-primary" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.85rem' }}>Editar</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="btn-primary" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.85rem', backgroundColor: '#dc3545' }}>Eliminar</button>
                    <ChevronRight size={20} color="#999" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mobile FAB */}
        <button className="btn-primary fab-button" onClick={() => { resetForm(); setShowForm(true); }} style={{ display: window.innerWidth <= 768 ? 'flex' : 'none' }}>+</button>
      </div>
    </div>
  );
}

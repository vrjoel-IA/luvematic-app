// Mantenimientos — Cliente Detail with Instalaciones CRUD
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, MapPin, ChevronRight, X, ArrowLeft, DoorOpen } from 'lucide-react';
import { supabase } from '../../supabase';
import { MantSidebar } from './MantViews';

export function MantClienteDetalle({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [instalaciones, setInstalaciones] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ direccion: '', contacto_local: '', telefono_local: '', notas_acceso: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('Clientes_Mant').select('*').eq('id', id).single().then(({ data }) => setCliente(data));
    fetchInstalaciones();
  }, [id]);

  const fetchInstalaciones = async () => {
    const { data } = await supabase.from('Instalaciones').select('*, Puertas(id)').eq('id_cliente', id).order('direccion');
    setInstalaciones((data || []).map(i => ({ ...i, total_puertas: i.Puertas?.length || 0 })));
  };

  const resetForm = () => { setForm({ direccion: '', contacto_local: '', telefono_local: '', notas_acceso: '' }); setEditingId(null); setShowForm(false); };

  const handleEdit = (inst) => {
    setForm({ direccion: inst.direccion, contacto_local: inst.contacto_local || '', telefono_local: inst.telefono_local || '', notas_acceso: inst.notas_acceso || '' });
    setEditingId(inst.id); setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (editingId) {
        await supabase.from('Instalaciones').update(form).eq('id', editingId);
      } else {
        await supabase.from('Instalaciones').insert([{ ...form, id_cliente: id }]);
      }
      resetForm(); await fetchInstalaciones();
    } catch (err) { alert('Error: ' + err.message); }
    setLoading(false);
  };

  const handleDelete = async (instId) => {
    if (!confirm('¿Eliminar esta instalación y todas sus puertas?')) return;
    await supabase.from('Instalaciones').delete().eq('id', instId);
    await fetchInstalaciones();
  };

  if (!cliente) return <div className="dashboard-layout"><MantSidebar user={user} /><div className="main-content">Cargando...</div></div>;

  return (
    <div className="dashboard-layout">
      <MantSidebar user={user} />
      <div className="main-content">
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button onClick={() => navigate('/admin/mantenimientos/clientes')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '4px', padding: 0, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            <ArrowLeft size={16} /> Volver a Clientes
          </button>
          <div className="header" style={{ marginBottom: 0 }}>
            <div>
              <h1 style={{ margin: 0 }}>{cliente.razon_social}</h1>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem', fontSize: '0.9rem' }}>
                {cliente.cif && `CIF: ${cliente.cif} · `}{cliente.contacto_nombre && `${cliente.contacto_nombre} · `}{cliente.contacto_telefono}
              </p>
            </div>
            <button className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus size={18} /> Nueva Instalación
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="kpi-card"><h3>{instalaciones.length}</h3><p style={{ color: 'var(--text-muted)' }}>Instalaciones</p></div>
          <div className="kpi-card"><h3>{instalaciones.reduce((sum, i) => sum + i.total_puertas, 0)}</h3><p style={{ color: 'var(--text-muted)' }}>Puertas Totales</p></div>
        </div>

        {/* Modal Form */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '90%', maxWidth: '550px', maxHeight: '90vh', overflow: 'auto', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>{editingId ? 'Editar Instalación' : 'Nueva Instalación'}</h2>
                <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="input-group"><label>Dirección *</label><input type="text" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} required placeholder="Ej: Calle Mayor 15, Nave 3" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group"><label>Contacto Local</label><input type="text" value={form.contacto_local} onChange={e => setForm({ ...form, contacto_local: e.target.value })} placeholder="Nombre del responsable" /></div>
                  <div className="input-group"><label>Teléfono Local</label><input type="tel" value={form.telefono_local} onChange={e => setForm({ ...form, telefono_local: e.target.value })} /></div>
                </div>
                <div className="input-group"><label>Notas de Acceso</label><textarea rows="3" value={form.notas_acceso} onChange={e => setForm({ ...form, notas_acceso: e.target.value })} placeholder="Ej: Preguntar por portería, código acceso 1234..."></textarea></div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" onClick={resetForm} className="btn-primary" style={{ backgroundColor: '#6c757d', width: 'auto' }}>Cancelar</button>
                  <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={loading}>{loading ? 'Guardando...' : (editingId ? 'Guardar' : 'Crear Instalación')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Instalaciones List */}
        {instalaciones.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <MapPin size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>Este cliente no tiene instalaciones. ¡Añade la primera!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {instalaciones.map(inst => (
              <div key={inst.id} className="card" style={{ cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s', padding: '1.2rem 1.5rem' }}
                onClick={() => navigate(`/admin/mantenimientos/instalacion/${inst.id}`)}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(10,35,66,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.4rem' }}>
                      <MapPin size={20} color="var(--primary-color)" />
                      <strong style={{ fontSize: '1.05rem' }}>{inst.direccion}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      {inst.contacto_local && <span>👤 {inst.contacto_local}</span>}
                      {inst.telefono_local && <span>📞 {inst.telefono_local}</span>}
                      <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}><DoorOpen size={14} style={{ verticalAlign: 'middle' }} /> {inst.total_puertas} puerta{inst.total_puertas !== 1 ? 's' : ''}</span>
                    </div>
                    {inst.notas_acceso && <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.4rem', fontStyle: 'italic' }}>📝 {inst.notas_acceso}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(inst); }} className="btn-primary" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.85rem' }}>Editar</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(inst.id); }} className="btn-primary" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.85rem', backgroundColor: '#dc3545' }}>Eliminar</button>
                    <ChevronRight size={20} color="#999" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="btn-primary fab-button" onClick={() => { resetForm(); setShowForm(true); }} style={{ display: window.innerWidth <= 768 ? 'flex' : 'none' }}>+</button>
      </div>
    </div>
  );
}

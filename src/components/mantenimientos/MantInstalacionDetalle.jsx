// Mantenimientos — Instalación Detail with Puertas CRUD
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, DoorOpen, X, ArrowLeft, Settings } from 'lucide-react';
import { supabase } from '../../supabase';
import { MantSidebar } from './MantViews';

const TIPOS_PUERTA = ['Seccional', 'Enrollable', 'Corredera', 'Basculante', 'Puerta de cristal', 'Puerta de guillotina', 'Telescópica', 'Peatonal', 'Rápida', 'Cortafuegos'];
const ESTADOS_PUERTA = ['operativa', 'requiere_revision', 'fuera_servicio'];

export function MantInstalacionDetalle({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [instalacion, setInstalacion] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [puertas, setPuertas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ tipo: 'Seccional', marca: '', modelo: '', numero_serie: '', fecha_instalacion: '', estado: 'operativa' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: inst } = await supabase.from('Instalaciones').select('*, Clientes_Mant(*)').eq('id', id).single();
      if (inst) { setInstalacion(inst); setCliente(inst.Clientes_Mant); }
      fetchPuertas();
    };
    fetchData();
  }, [id]);

  const fetchPuertas = async () => {
    const { data } = await supabase.from('Puertas').select('*').eq('id_instalacion', id).order('created_at');
    setPuertas(data || []);
  };

  const resetForm = () => { setForm({ tipo: 'Seccional', marca: '', modelo: '', numero_serie: '', fecha_instalacion: '', estado: 'operativa' }); setEditingId(null); setShowForm(false); };

  const handleEdit = (p) => {
    setForm({ tipo: p.tipo, marca: p.marca || '', modelo: p.modelo || '', numero_serie: p.numero_serie || '', fecha_instalacion: p.fecha_instalacion || '', estado: p.estado });
    setEditingId(p.id); setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const data = { ...form };
      if (!data.fecha_instalacion) delete data.fecha_instalacion;
      if (editingId) {
        await supabase.from('Puertas').update(data).eq('id', editingId);
      } else {
        await supabase.from('Puertas').insert([{ ...data, id_instalacion: id }]);
      }
      resetForm(); await fetchPuertas();
    } catch (err) { alert('Error: ' + err.message); }
    setLoading(false);
  };

  const handleDelete = async (pId) => {
    if (!confirm('¿Eliminar esta puerta?')) return;
    await supabase.from('Puertas').delete().eq('id', pId);
    await fetchPuertas();
  };

  const estadoColor = { operativa: '#28a745', requiere_revision: '#ffc107', fuera_servicio: '#dc3545' };
  const estadoLabel = { operativa: 'Operativa', requiere_revision: 'Requiere Revisión', fuera_servicio: 'Fuera de Servicio' };

  if (!instalacion) return <div className="dashboard-layout"><MantSidebar user={user} /><div className="main-content">Cargando...</div></div>;

  return (
    <div className="dashboard-layout">
      <MantSidebar user={user} />
      <div className="main-content">
        {/* Breadcrumb */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          <span className="link" onClick={() => navigate('/admin/mantenimientos/clientes')} style={{ cursor: 'pointer', color: 'var(--primary-color)' }}>Clientes</span>
          <span>›</span>
          <span className="link" onClick={() => navigate(`/admin/mantenimientos/cliente/${cliente?.id}`)} style={{ cursor: 'pointer', color: 'var(--primary-color)' }}>{cliente?.razon_social}</span>
          <span>›</span>
          <span>{instalacion.direccion}</span>
        </div>

        <div className="header">
          <div>
            <h1 style={{ margin: 0 }}>{instalacion.direccion}</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem', fontSize: '0.9rem' }}>
              {instalacion.contacto_local && `${instalacion.contacto_local} · `}{instalacion.telefono_local}
            </p>
          </div>
          <button className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={18} /> Nueva Puerta
          </button>
        </div>

        {instalacion.notas_acceso && (
          <div style={{ background: '#fff3cd', padding: '0.8rem 1rem', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1.5rem', border: '1px solid #ffc107' }}>
            <strong>📝 Notas de Acceso:</strong> {instalacion.notas_acceso}
          </div>
        )}

        {/* KPI */}
        <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="kpi-card"><h3>{puertas.length}</h3><p style={{ color: 'var(--text-muted)' }}>Puertas</p></div>
          <div className="kpi-card"><h3 style={{ color: '#28a745' }}>{puertas.filter(p => p.estado === 'operativa').length}</h3><p style={{ color: 'var(--text-muted)' }}>Operativas</p></div>
          <div className="kpi-card"><h3 style={{ color: '#ffc107' }}>{puertas.filter(p => p.estado === 'requiere_revision').length}</h3><p style={{ color: 'var(--text-muted)' }}>Revisión</p></div>
          <div className="kpi-card"><h3 style={{ color: '#dc3545' }}>{puertas.filter(p => p.estado === 'fuera_servicio').length}</h3><p style={{ color: 'var(--text-muted)' }}>Fuera Servicio</p></div>
        </div>

        {/* Modal Form */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '90%', maxWidth: '550px', maxHeight: '90vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>{editingId ? 'Editar Puerta' : 'Nueva Puerta'}</h2>
                <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="input-group"><label>Tipo de Puerta *</label>
                  <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    {TIPOS_PUERTA.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group"><label>Marca</label><input type="text" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} placeholder="Ej: Hörmann" /></div>
                  <div className="input-group"><label>Modelo</label><input type="text" value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} placeholder="Ej: SPU F42" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group"><label>Nº de Serie</label><input type="text" value={form.numero_serie} onChange={e => setForm({ ...form, numero_serie: e.target.value })} /></div>
                  <div className="input-group"><label>Fecha Instalación</label><input type="date" value={form.fecha_instalacion} onChange={e => setForm({ ...form, fecha_instalacion: e.target.value })} /></div>
                </div>
                <div className="input-group"><label>Estado</label>
                  <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                    {ESTADOS_PUERTA.map(e => <option key={e} value={e}>{estadoLabel[e]}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" onClick={resetForm} className="btn-primary" style={{ backgroundColor: '#6c757d', width: 'auto' }}>Cancelar</button>
                  <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={loading}>{loading ? 'Guardando...' : (editingId ? 'Guardar' : 'Crear Puerta')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Puertas Grid */}
        {puertas.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <DoorOpen size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No hay puertas registradas. ¡Añade la primera!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {puertas.map((p, idx) => (
              <div key={p.id} className="card" style={{ padding: '1.2rem', borderLeft: `4px solid ${estadoColor[p.estado]}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DoorOpen size={22} color="var(--primary-color)" />
                    <div>
                      <strong>Puerta {idx + 1}</strong>
                      <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.tipo}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', fontWeight: 600, color: 'white', backgroundColor: estadoColor[p.estado] }}>
                    {estadoLabel[p.estado]}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {p.marca && <span><strong>Marca:</strong> {p.marca}</span>}
                  {p.modelo && <span><strong>Modelo:</strong> {p.modelo}</span>}
                  {p.numero_serie && <span><strong>Serie:</strong> {p.numero_serie}</span>}
                  {p.fecha_instalacion && <span><strong>Instalada:</strong> {new Date(p.fecha_instalacion).toLocaleDateString('es-ES')}</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '1rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => handleEdit(p)} className="btn-primary" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}>Editar</button>
                  <button onClick={() => handleDelete(p.id)} className="btn-primary" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.8rem', backgroundColor: '#dc3545' }}>Eliminar</button>
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

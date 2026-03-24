// Mantenimientos — Contratos CRUD + Auto-generation logic
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, FileText, X, ArrowLeft, Calendar, Zap } from 'lucide-react';
import { supabase } from '../../supabase';
import { MantSidebar } from './MantViews';

const FRECUENCIAS = [
  { value: 'mensual', label: 'Mensual', meses: [0,1,2,3,4,5,6,7,8,9,10,11] },
  { value: 'trimestral', label: 'Trimestral', meses: [0,3,6,9] },
  { value: 'semestral', label: 'Semestral', meses: [0,6] },
  { value: 'anual', label: 'Anual', meses: [0] },
];

const FREQ_COLORS = { mensual: '#2196F3', trimestral: '#FF9800', semestral: '#9C27B0', anual: '#E91E63' };

// Generate maintenance dates for a year
function generarFechas(frecuencia, year, modoGeneracion, fechaInicio) {
  const freq = FRECUENCIAS.find(f => f.value === frecuencia);
  if (!freq) return [];
  
  if (modoGeneracion === 'año_natural') {
    return freq.meses.map(m => new Date(year, m, 15));
  } else {
    // From contract start date
    const start = new Date(fechaInicio);
    const dates = [];
    let interval = 1;
    if (frecuencia === 'trimestral') interval = 3;
    if (frecuencia === 'semestral') interval = 6;
    if (frecuencia === 'anual') interval = 12;
    
    let current = new Date(start);
    while (current.getFullYear() <= year) {
      if (current.getFullYear() === year) dates.push(new Date(current));
      current.setMonth(current.getMonth() + interval);
    }
    return dates;
  }
}

export function MantContratos({ user }) {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [contratos, setContratos] = useState([]);
  const [instalaciones, setInstalaciones] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ frecuencias: [], modo_generacion: 'año_natural', fecha_inicio: '', fecha_renovacion: '', activo: true });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(null);

  useEffect(() => {
    supabase.from('Clientes_Mant').select('*').eq('id', clienteId).single().then(({ data }) => setCliente(data));
    supabase.from('Instalaciones').select('*').eq('id_cliente', clienteId).then(({ data }) => setInstalaciones(data || []));
    fetchContratos();
  }, [clienteId]);

  const fetchContratos = async () => {
    const { data } = await supabase.from('Contratos').select('*').eq('id_cliente', clienteId).order('created_at', { ascending: false });
    setContratos(data || []);
  };

  const resetForm = () => { setForm({ frecuencias: [], modo_generacion: 'año_natural', fecha_inicio: '', fecha_renovacion: '', activo: true }); setEditingId(null); setShowForm(false); };

  const handleEdit = (c) => {
    setForm({ frecuencias: c.frecuencias || [], modo_generacion: c.modo_generacion, fecha_inicio: c.fecha_inicio, fecha_renovacion: c.fecha_renovacion || '', activo: c.activo });
    setEditingId(c.id); setShowForm(true);
  };

  const toggleFreq = (freq) => {
    setForm(prev => ({
      ...prev,
      frecuencias: prev.frecuencias.includes(freq) ? prev.frecuencias.filter(f => f !== freq) : [...prev.frecuencias, freq]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.frecuencias.length === 0) { alert('Selecciona al menos una frecuencia'); return; }
    setLoading(true);
    try {
      const data = { ...form, id_cliente: clienteId };
      if (!data.fecha_renovacion) delete data.fecha_renovacion;
      if (editingId) {
        await supabase.from('Contratos').update(data).eq('id', editingId);
      } else {
        await supabase.from('Contratos').insert([data]);
      }
      resetForm(); await fetchContratos();
    } catch (err) { alert('Error: ' + err.message); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este contrato? Los mantenimientos generados se desvinculan.')) return;
    await supabase.from('Contratos').delete().eq('id', id);
    await fetchContratos();
  };

  // AUTO-GENERATE maintenances
  const generarMantenimientos = async (contrato) => {
    if (instalaciones.length === 0) { alert('Este cliente no tiene instalaciones. Crea primero al menos una.'); return; }
    if (!confirm(`¿Generar mantenimientos ${new Date().getFullYear()} para ${instalaciones.length} instalación(es) con frecuencias: ${contrato.frecuencias.join(', ')}?`)) return;
    
    setGenerating(contrato.id);
    try {
      const year = new Date().getFullYear();
      const inserts = [];

      for (const inst of instalaciones) {
        for (const freq of contrato.frecuencias) {
          const fechas = generarFechas(freq, year, contrato.modo_generacion, contrato.fecha_inicio);
          for (const fecha of fechas) {
            // Skip dates in the past
            if (fecha < new Date()) continue;
            inserts.push({
              id_instalacion: inst.id,
              id_contrato: contrato.id,
              frecuencia: freq,
              fecha_programada: fecha.toISOString().split('T')[0],
              estado: 'programado'
            });
          }
        }
      }

      if (inserts.length === 0) { alert('No hay fechas futuras para generar en este año.'); setGenerating(null); return; }

      // Check for existing to avoid duplicates
      const { data: existing } = await supabase.from('Mantenimientos').select('id_instalacion, frecuencia, fecha_programada').eq('id_contrato', contrato.id);
      const existingKeys = new Set((existing || []).map(e => `${e.id_instalacion}_${e.frecuencia}_${e.fecha_programada}`));
      const newInserts = inserts.filter(i => !existingKeys.has(`${i.id_instalacion}_${i.frecuencia}_${i.fecha_programada}`));

      if (newInserts.length === 0) { alert('Todos los mantenimientos ya estaban generados.'); setGenerating(null); return; }

      const { error } = await supabase.from('Mantenimientos').insert(newInserts);
      if (error) throw error;
      alert(`✅ ${newInserts.length} mantenimientos generados correctamente.`);
    } catch (err) { alert('Error al generar: ' + err.message); }
    setGenerating(null);
  };

  if (!cliente) return <div className="dashboard-layout"><MantSidebar user={user} /><div className="main-content">Cargando...</div></div>;

  return (
    <div className="dashboard-layout">
      <MantSidebar user={user} />
      <div className="main-content">
        <div style={{ marginBottom: '0.5rem' }}>
          <button onClick={() => navigate(`/admin/mantenimientos/cliente/${clienteId}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '4px', padding: 0, fontSize: '0.9rem' }}>
            <ArrowLeft size={16} /> Volver a {cliente.razon_social}
          </button>
        </div>
        <div className="header">
          <div>
            <h1 style={{ margin: 0 }}>Contratos — {cliente.razon_social}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{instalaciones.length} instalación(es) vinculadas</p>
          </div>
          <button className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={18} /> Nuevo Contrato
          </button>
        </div>

        {/* Modal Form */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '90%', maxWidth: '550px', maxHeight: '90vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>{editingId ? 'Editar Contrato' : 'Nuevo Contrato'}</h2>
                <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label>Frecuencias de Mantenimiento *</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {FRECUENCIAS.map(f => (
                      <button key={f.value} type="button" onClick={() => toggleFreq(f.value)}
                        style={{ padding: '0.5rem 1rem', borderRadius: '20px', border: '2px solid ' + FREQ_COLORS[f.value], cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                          backgroundColor: form.frecuencias.includes(f.value) ? FREQ_COLORS[f.value] : 'white',
                          color: form.frecuencias.includes(f.value) ? 'white' : FREQ_COLORS[f.value],
                          transition: 'all 0.2s'
                        }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="input-group"><label>Modo de Generación</label>
                  <select value={form.modo_generacion} onChange={e => setForm({ ...form, modo_generacion: e.target.value })}>
                    <option value="año_natural">Año Natural (Ene, Feb, Mar...)</option>
                    <option value="fecha_contrato">Desde Fecha del Contrato</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group"><label>Fecha Inicio *</label><input type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} required /></div>
                  <div className="input-group"><label>Fecha Renovación</label><input type="date" value={form.fecha_renovacion} onChange={e => setForm({ ...form, fecha_renovacion: e.target.value })} /></div>
                </div>
                <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="activo" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} />
                  <label htmlFor="activo" style={{ margin: 0 }}>Contrato activo</label>
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" onClick={resetForm} className="btn-primary" style={{ backgroundColor: '#6c757d', width: 'auto' }}>Cancelar</button>
                  <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={loading}>{loading ? 'Guardando...' : (editingId ? 'Guardar' : 'Crear Contrato')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Contratos List */}
        {contratos.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No hay contratos. ¡Crea el primero para generar mantenimientos!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {contratos.map(c => (
              <div key={c.id} className="card" style={{ padding: '1.5rem', borderLeft: c.activo ? '4px solid #28a745' : '4px solid #ccc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                      <FileText size={20} color="var(--primary-color)" />
                      <strong>Contrato</strong>
                      <span style={{ fontSize: '0.8rem', padding: '2px 10px', borderRadius: '12px', fontWeight: 600, color: 'white', backgroundColor: c.activo ? '#28a745' : '#999' }}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      {(c.frecuencias || []).map(f => (
                        <span key={f} style={{ fontSize: '0.8rem', padding: '3px 12px', borderRadius: '12px', fontWeight: 600, color: 'white', backgroundColor: FREQ_COLORS[f] || '#999' }}>
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <Calendar size={14} style={{ verticalAlign: 'middle' }} /> Inicio: {new Date(c.fecha_inicio).toLocaleDateString('es-ES')}
                      {c.fecha_renovacion && <> · Renovación: {new Date(c.fecha_renovacion).toLocaleDateString('es-ES')}</>}
                      <> · Modo: {c.modo_generacion === 'año_natural' ? 'Año Natural' : 'Fecha Contrato'}</>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => generarMantenimientos(c)} className="btn-primary" disabled={generating === c.id}
                      style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#28a745' }}>
                      <Zap size={16} /> {generating === c.id ? 'Generando...' : 'Generar Mantenimientos'}
                    </button>
                    <button onClick={() => handleEdit(c)} className="btn-primary" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Editar</button>
                    <button onClick={() => handleDelete(c.id)} className="btn-primary" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: '#dc3545' }}>Eliminar</button>
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

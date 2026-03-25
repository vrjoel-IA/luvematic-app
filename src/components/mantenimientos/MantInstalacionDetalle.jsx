// Mantenimientos — Instalación Detail with Puertas and Contracts
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, DoorOpen, X, ArrowLeft, Trash2 } from 'lucide-react';
import { supabase } from '../../supabase';
import { MantSidebar } from './MantViews';

const TIPOS_PUERTA = ['Seccional', 'Enrollable', 'Corredera', 'Basculante', 'Puerta de cristal', 'Puerta de guillotina', 'Telescópica', 'Peatonal', 'Rápida', 'Cortafuegos'];
const ESTADOS_PUERTA = ['operativa', 'requiere_revision', 'fuera_servicio'];
const FRECUENCIAS = ['mensual', 'trimestral', 'semestral', 'anual'];

export function MantInstalacionDetalle({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [instalacion, setInstalacion] = useState(null);
  const [puertas, setPuertas] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const initialForm = {
    tipo: 'Seccional', identificador: '', marca: '', modelo: '', numero_serie: '', estado: 'operativa',
    accesorios: [],
    // Contract & Maintenance scheduling
    frecuencia_mant: 'mensual',
    inicio_contrato: '', fin_contrato: '', primer_mantenimiento: '', id_grupo: ''
  };

  const [form, setForm] = useState(initialForm);
  const [showAccesoriosModal, setShowAccesoriosModal] = useState(false);
  const [tempAcceso, setTempAcceso] = useState({ elemento: 'Fotocélula', marca: '', modelo: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: inst } = await supabase.from('Instalaciones').select('*').eq('id', id).single();
      if (inst) setInstalacion(inst);
      
      const { data: gs } = await supabase.from('Grupos_Mantenimiento').select('*').order('nombre');
      setGrupos(gs || []);

      fetchPuertas();
    };
    fetchData();
  }, [id]);

  const fetchPuertas = async () => {
    const { data } = await supabase.from('Puertas').select('*, Grupos_Mantenimiento(nombre)').eq('id_instalacion', id).order('created_at');
    setPuertas(data || []);
  };

  const resetForm = () => { setForm(initialForm); setEditingId(null); setShowForm(false); };

  const handleEdit = (p) => {
    setForm({
      tipo: p.tipo, identificador: p.identificador || '', marca: p.marca || '', modelo: p.modelo || '', numero_serie: p.numero_serie || '', 
      estado: p.estado, accesorios: p.accesorios || [],
      frecuencia_mant: p.frecuencia_mant || 'mensual',
      inicio_contrato: p.inicio_contrato || '', 
      fin_contrato: p.fin_contrato || '', 
      primer_mantenimiento: p.primer_mantenimiento || '',
      id_grupo: p.id_grupo || ''
    });
    setEditingId(p.id); setShowForm(true);
  };

  const generateMantenimientos = async (puertaId, f) => {
    if (!f.primer_mantenimiento || !f.fin_contrato || !f.frecuencia_mant) return;
    
    const startDate = new Date(f.primer_mantenimiento);
    const endDate = new Date(f.fin_contrato);
    const mants = [];
    
    let current = new Date(startDate);
    while (current <= endDate) {
      mants.push({
        id_puerta: puertaId,
        id_instalacion: id,
        id_grupo: f.id_grupo || null,
        frecuencia: f.frecuencia_mant,
        fecha_programada: current.toISOString().split('T')[0],
        estado: 'programado'
      });
      
      // Advance by frequency
      if (f.frecuencia_mant === 'mensual') current.setMonth(current.getMonth() + 1);
      else if (f.frecuencia_mant === 'trimestral') current.setMonth(current.getMonth() + 3);
      else if (f.frecuencia_mant === 'semestral') current.setMonth(current.getMonth() + 6);
      else if (f.frecuencia_mant === 'anual') current.setFullYear(current.getFullYear() + 1);
      else break; // fallback
    }

    if (mants.length > 0) {
      // Delete old future ones if editing (you could improve this, but for now wiping the ones not completed is easiest)
      if (editingId) {
        await supabase.from('Mantenimientos').delete().eq('id_puerta', puertaId).eq('estado', 'programado');
      }
      await supabase.from('Mantenimientos').insert(mants);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const dataToSave = { 
        ...form, 
        id_instalacion: id,
        id_grupo: form.id_grupo || null,
        inicio_contrato: form.inicio_contrato || null,
        fin_contrato: form.fin_contrato || null,
        primer_mantenimiento: form.primer_mantenimiento || null
      };

      let puertaCreadaId = editingId;
      if (editingId) {
        await supabase.from('Puertas').update(dataToSave).eq('id', editingId);
      } else {
        const { data, error } = await supabase.from('Puertas').insert([dataToSave]).select();
        if (error) throw error;
        puertaCreadaId = data[0].id;
      }
      
      // Auto-generate Mantenimientos based on the contract details
      await generateMantenimientos(puertaCreadaId, form);
      
      resetForm(); await fetchPuertas();
    } catch (err) { alert('Error: ' + err.message); }
    setLoading(false);
  };

  const handleDelete = async (pId) => {
    if (!confirm('¿Eliminar esta puerta y todos sus mantenimientos?')) return;
    await supabase.from('Mantenimientos').delete().eq('id_puerta', pId);
    await supabase.from('Puertas').delete().eq('id', pId);
    await fetchPuertas();
  };

  const addAccesorio = () => {
    if (!tempAcceso.elemento) return;
    setForm({ ...form, accesorios: [...form.accesorios, tempAcceso] });
    setTempAcceso({ elemento: 'Fotocélula', marca: '', modelo: '' });
    setShowAccesoriosModal(false);
  };

  const removeAccesorio = (idx) => {
    const acc = [...form.accesorios]; acc.splice(idx, 1);
    setForm({ ...form, accesorios: acc });
  };

  const estadoColor = { operativa: '#28a745', requiere_revision: '#ffc107', fuera_servicio: '#dc3545' };
  const estadoLabel = { operativa: 'Operativa', requiere_revision: 'Requiere Revisión', fuera_servicio: 'Fuera de Servicio' };

  if (!instalacion) return <div className="dashboard-layout"><MantSidebar user={user} /><div className="main-content">Cargando...</div></div>;

  return (
    <div className="dashboard-layout">
      <MantSidebar user={user} />
      <div className="main-content">
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          <span className="link" onClick={() => navigate('/admin/mantenimientos/clientes')} style={{ cursor: 'pointer', color: 'var(--primary-color)' }}>Sedes e Instalaciones</span>
          <span>›</span>
          <span style={{ color: '#0A2342', fontWeight: 'bold' }}>{instalacion.direccion}</span>
        </div>

        <div className="header">
          <div>
            <h1 style={{ margin: 0 }}>{instalacion.direccion}</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem', fontSize: '0.9rem' }}>
              Contacto: {instalacion.contacto_1} — Telf: {instalacion.telefono_1}
            </p>
          </div>
          <button className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={18} /> Añadir Puerta y Mantenimiento
          </button>
        </div>

        {/* Modal Form */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '90%', maxWidth: '700px', maxHeight: '90vh', overflow: 'auto', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #eee', paddingBottom: '1rem' }}>
                <h2 style={{ margin: 0, color: '#0A2342' }}>{editingId ? 'Editar Puerta y Contrato' : 'Nueva Puerta y Contrato'}</h2>
                <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <h3 style={{ color: '#0A2342', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>1. Configuración de la Puerta</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div className="input-group"><label>Tipo de Puerta *</label>
                    <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                      {TIPOS_PUERTA.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="input-group"><label>Ubicación / Nombramiento</label>
                    <input type="text" value={form.identificador} onChange={e => setForm({ ...form, identificador: e.target.value })} placeholder="Ej: Puerta Principal" />
                  </div>
                  <div className="input-group"><label>Estado Actual</label>
                    <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                      {ESTADOS_PUERTA.map(e => <option key={e} value={e}>{estadoLabel[e]}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="input-group"><label>Marca</label><input type="text" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} placeholder="Ej: Hörmann" /></div>
                  <div className="input-group"><label>Modelo</label><input type="text" value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} placeholder="Ej: SPU F42" /></div>
                  <div className="input-group"><label>Nº Serie</label><input type="text" value={form.numero_serie} onChange={e => setForm({ ...form, numero_serie: e.target.value })} /></div>
                </div>

                {/* Accesorios Section */}
                <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f5f7fa', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <label style={{ fontWeight: 600, color: '#0A2342', margin: 0 }}>Accesorios Equipados</label>
                    <button type="button" onClick={() => setShowAccesoriosModal(true)} className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}>+ Añadir Accesorio</button>
                  </div>
                  
                  {form.accesorios.length === 0 ? <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>No hay accesorios definidos.</p> : (
                    <table style={{ width: '100%', fontSize: '0.85rem' }}>
                      <tbody>
                        {form.accesorios.map((a, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #e0e0e0' }}>
                            <td style={{ padding: '4px 0', fontWeight: 'bold', color: '#0A2342' }}>{a.elemento}</td>
                            <td style={{ padding: '4px 0', color: '#555' }}>Marca: {a.marca || 'N/A'}</td>
                            <td style={{ padding: '4px 0', color: '#555' }}>Modelo: {a.modelo || 'N/A'}</td>
                            <td style={{ padding: '4px 0', textAlign: 'right' }}>
                              <button type="button" onClick={() => removeAccesorio(i)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <h3 style={{ color: '#0A2342', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>2. Contrato y Calendario de Mantenimiento</h3>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>* Al rellenar estos datos, el sistema generará automáticamente las visitas pre-establecidas.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group"><label>Frecuencia de Revisión *</label>
                    <select value={form.frecuencia_mant} onChange={e => setForm({ ...form, frecuencia_mant: e.target.value })}>
                      {FRECUENCIAS.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="input-group"><label>Asignar a Grupo (Opcional)</label>
                    <select value={form.id_grupo} onChange={e => setForm({ ...form, id_grupo: e.target.value })}>
                      <option value="">-- Asignar más tarde (Drag & Drop) --</option>
                      {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="input-group"><label>Inicio Contrato</label><input type="date" value={form.inicio_contrato} onChange={e => setForm({ ...form, inicio_contrato: e.target.value })} /></div>
                  <div className="input-group"><label>Fin Contrato / Renovación</label><input type="date" value={form.fin_contrato} onChange={e => setForm({ ...form, fin_contrato: e.target.value })} required /></div>
                  <div className="input-group"><label>1º Mantenimiento (A partir de)</label><input type="date" value={form.primer_mantenimiento} onChange={e => setForm({ ...form, primer_mantenimiento: e.target.value })} required /></div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                  <button type="button" onClick={resetForm} className="btn-secondary" style={{ width: 'auto' }}>Cancelar</button>
                  <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={loading}>{loading ? 'Guardando...' : (editingId ? 'Actualizar Puerta' : 'Crear y Generar Mantenimientos')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Accesorios mini-modal */}
        {showAccesoriosModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
             <div className="card" style={{ width: '350px' }}>
                <h3 style={{ margin: '0 0 1rem 0' }}>Nuevo Accesorio</h3>
                <div className="input-group"><label>Elemento</label>
                  <input type="text" placeholder="Ej: Fotocélula, Banda, Radar..." value={tempAcceso.elemento} onChange={e=>setTempAcceso({...tempAcceso, elemento: e.target.value})} />
                </div>
                <div className="input-group"><label>Marca</label>
                  <input type="text" value={tempAcceso.marca} onChange={e=>setTempAcceso({...tempAcceso, marca: e.target.value})} />
                </div>
                <div className="input-group"><label>Modelo</label>
                  <input type="text" value={tempAcceso.modelo} onChange={e=>setTempAcceso({...tempAcceso, modelo: e.target.value})} />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                  <button type="button" onClick={()=>setShowAccesoriosModal(false)} className="btn-secondary">Volver</button>
                  <button type="button" onClick={addAccesorio} className="btn-primary">Añadir</button>
                </div>
             </div>
          </div>
        )}

        {/* Puertas Grid */}
        {puertas.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <DoorOpen size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No hay puertas registradas. ¡Instala la primera para generar su mantenimiento!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {puertas.map((p, idx) => {
              const endsSoon = p.fin_contrato && (new Date(p.fin_contrato) - new Date()) / (1000 * 60 * 60 * 24) < 30;
              return (
              <div key={p.id} className="card" style={{ padding: '1.2rem', borderLeft: `5px solid ${estadoColor[p.estado]}`, position: 'relative' }}>
                {endsSoon && (
                  <div style={{ position: 'absolute', top: '-10px', right: '10px', background: '#E63329', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                    ¡CONTRATO CERCANO A RENOVAR!
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem', paddingTop: endsSoon ? '10px' : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DoorOpen size={24} color="#0A2342" />
                    <div>
                      <strong style={{ fontSize: '1.2rem', color: '#0A2342' }}>{p.tipo}</strong>
                      <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.identificador || `Puerta ${idx + 1}`}</span>
                    </div>
                  </div>
                  <span className="pill" style={{ backgroundColor: estadoColor[p.estado] }}>
                    {estadoLabel[p.estado]}
                  </span>
                </div>
                
                <div style={{ fontSize: '0.85rem', color: '#555', background: '#f8f9fa', padding: '10px', borderRadius: '6px', marginBottom: '1rem' }}>
                  {p.marca && <div style={{ marginBottom: '4px' }}><strong>Marca/Modelo:</strong> {p.marca} {p.modelo} <span style={{color: '#999'}}>({p.numero_serie})</span></div>}
                  <div style={{ marginBottom: '4px' }}><strong>Accesorios:</strong> {(p.accesorios || []).length} elementos integrados</div>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#0A2342', borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span><strong>Frecuencia:</strong></span>
                    <span style={{ textTransform: 'capitalize' }}>{p.frecuencia_mant}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span><strong>Grupo:</strong></span>
                    <span>{p.Grupos_Mantenimiento?.nombre || <span style={{ color: '#E63329', fontStyle: 'italic' }}>Sin Asignar</span>}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>Vigencia:</strong></span>
                    <span>{new Date(p.fin_contrato).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '1.2rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => handleEdit(p)} className="btn-secondary" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Ajustar / Editar</button>
                  <button onClick={() => handleDelete(p.id)} className="btn-primary" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: '#dc3545' }}>Borrar</button>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { MantSidebar } from './MantViews';
import { AlertCircle, FileText, CheckCircle, ChevronDown, ChevronRight, MapPin, DoorOpen } from 'lucide-react';

const ESTADOS = [
  'Detectada',
  'Comunicada',
  'Presupuestada',
  'Aceptada',
  'Reparada',
  'Cerrada'
];

export function MantIncidencias({ user }) {
  const [incidencias, setIncidencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Activas');
  const [tecnicos, setTecnicos] = useState([]);
  const [assignDrafts, setAssignDrafts] = useState({});
  
  // To keep track of which Installation accordion is open
  const [openInstalaciones, setOpenInstalaciones] = useState({});

  const fetchIncidencias = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data, error } = await supabase
        .from('Incidencias')
        .select(`
          *,
          Mantenimientos!inner (
            id,
            frecuencia,
            Instalaciones ( 
              id,
              direccion
            )
          ),
          Puertas ( id, tipo, id_instalacion ),
          Usuarios ( nombre_completo ),
          Checklist_Respuestas ( observacion, url_foto )
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setIncidencias(data || []);

      const { data: techData } = await supabase.from('Usuarios').select('id_usuario, nombre_completo').in('rol', ['Tecnico', 'Direccion', 'Administrador']);
      setTecnicos(techData || []);
    } catch (err) {
      console.error(err);
      alert('Error cargando incidencias: ' + err.message);
    }
    if (!silent) setLoading(false);
  };

  const handleDraftChange = (id, field, val) => {
    setAssignDrafts(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  };

  const crearMantenimientoCorrectivo = async (inc) => {
    const draft = assignDrafts[inc.id];
    if (!draft || !draft.tecnico || !draft.fecha) {
      return alert("Selecciona un técnico y una fecha para programar la reparación.");
    }
    try {
      const instalacionId = inc.Mantenimientos?.Instalaciones?.id || inc.Puertas?.id_instalacion;
      if (!instalacionId) return alert("Error: No se puede identificar la instalación raíz de esta puerta.");

      // 1. Assign tech on Incidencia AND update status
      await supabase.from('Incidencias')
        .update({ id_tecnico_reparacion: draft.tecnico, estado: 'Aceptada' })
        .eq('id', inc.id);

      // 2. Create Corrective Maintenance
      const { error: insErr } = await supabase.from('Mantenimientos').insert({
        id_instalacion: instalacionId,
        id_puerta: inc.id_puerta,
        frecuencia: 'correctivo',
        estado: 'asignado',
        id_tecnico: draft.tecnico,
        fecha_programada: draft.fecha,
        observaciones: `REPARACIÓN AVERÍA: ${inc.descripcion}`,
        orden_en_grupo: 99
      });

      if (insErr) throw insErr;
      
      alert("Mantenimiento correctivo creado y asignado al técnico.");
      setAssignDrafts(prev => { const n = {...prev}; delete n[inc.id]; return n; });
      fetchIncidencias(true);
    } catch (e) {
      alert("Error al coordinar la reparación.");
      console.error(e);
    }
  };

  useEffect(() => { fetchIncidencias(); }, []);

  const updateEstado = async (id, newEstado) => {
    try {
      const { error } = await supabase.from('Incidencias').update({ estado: newEstado }).eq('id', id);
      if (error) throw error;
      fetchIncidencias(true);
    } catch (err) {
      alert("Error actualizando estado.");
    }
  };

  const updateTecnico = async (id, id_tecnico) => {
    try {
      const { error } = await supabase.from('Incidencias').update({ id_tecnico_reparacion: id_tecnico || null }).eq('id', id);
      if (error) throw error;
      fetchIncidencias(true);
    } catch (err) {
      alert("Error asignando técnico.");
    }
  };

  const updatePresupuesto = async (id, importe) => {
    const val = parseFloat(importe);
    if (isNaN(val)) return;
    try {
      const { error } = await supabase.from('Incidencias').update({ presupuesto: val }).eq('id', id);
      if (error) throw error;
      fetchIncidencias(true);
    } catch (err) {
      alert("Error actualizando presupuesto.");
    }
  };

  const toggleInstalacion = (id) => {
    setOpenInstalaciones(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = incidencias.filter(inc => {
    if (filter === 'Todas') return true;
    if (filter === 'Activas') return inc.estado !== 'Cerrada';
    return inc.estado === filter;
  });

  // Agrupación por Instalación -> Puertas
  const agrupacion = {};
  filtered.forEach(inc => {
    const inst = inc.Mantenimientos?.Instalaciones;
    const instId = inst?.id || 'unknown_inst';
    const instDir = inst?.direccion || 'Instalación Desconocida';
    
    if (!agrupacion[instId]) {
      agrupacion[instId] = { direccion: instDir, puertas: {} };
    }
    
    const puertaId = inc.Puertas?.id || 'unknown_puerta';
    const puertaTipo = inc.Puertas?.tipo || 'Puerta Desconocida';
    
    if (!agrupacion[instId].puertas[puertaId]) {
      agrupacion[instId].puertas[puertaId] = { tipo: puertaTipo, incidencias: [] };
    }
    
    agrupacion[instId].puertas[puertaId].incidencias.push(inc);
  });

  // KPIs
  const kpis = {
    detectadas: incidencias.filter(i => i.estado === 'Detectada').length,
    en_proceso: incidencias.filter(i => ['Comunicada', 'Presupuestada', 'Aceptada'].includes(i.estado)).length,
    reparadas: incidencias.filter(i => ['Reparada', 'Cerrada'].includes(i.estado)).length,
    presupuestoTotal: incidencias.reduce((sum, i) => sum + (parseFloat(i.presupuesto) || 0), 0)
  };

  return (
    <div className="dashboard-layout">
      <MantSidebar user={user} />
      <div className="main-content">
        <div className="header">
          <h1>Gestión de Incidencias de Mantenimiento</h1>
        </div>

        {/* KPIs */}
        <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
          <div className="kpi-card">
            <h3 style={{ color: '#E63329' }}>{kpis.detectadas}</h3>
            <p>Nuevas Detectadas</p>
          </div>
          <div className="kpi-card">
            <h3 style={{ color: '#0A2342' }}>{kpis.en_proceso}</h3>
            <p>En Proceso (Presup/Acept)</p>
          </div>
          <div className="kpi-card">
            <h3 style={{ color: '#28a745' }}>{kpis.reparadas}</h3>
            <p>Reparadas o Cerradas</p>
          </div>
          <div className="kpi-card">
            <h3>{kpis.presupuestoTotal.toFixed(2)} €</h3>
            <p>Volumen Presupuestado</p>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar" style={{ display: 'flex', marginBottom: '1.5rem', background: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', alignItems: 'center', gap: '10px' }}>
          <strong style={{ color: '#0A2342' }}>Visualizando:</strong>
          <select 
            className="input-field" 
            style={{ width: 'auto', margin: 0, padding: '8px 30px 8px 10px' }}
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="Activas">Solo Activas (Requieren acción)</option>
            <option value="Todas">Todas (Histórico Completo)</option>
            <optgroup label="Por Estado Específico">
              {ESTADOS.map(es => (
                <option key={es} value={es}>{es}</option>
              ))}
            </optgroup>
          </select>
          <style>{`
            .active-filter { background-color: #0A2342 !important; color: white !important; border-color: #0A2342 !important; }
            .incidencia-card { background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #eee; margin-bottom: 1rem; overflow: hidden; }
            .incidencia-body { padding: 1.5rem; display: flex; gap: 2rem; flex-wrap: wrap; }
            .incidencia-col { flex: 1; min-width: 250px; }
            .state-timeline { display: flex; align-items: center; gap: 5px; margin-top: 1rem; flex-wrap: wrap; }
            .state-step { padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; cursor: pointer; transition: 0.2s; border: 1px solid #ccc; background: white; color: #666; }
            .state-step.active { background: #0A2342; border-color: #0A2342; color: white; }
          `}</style>
        </div>

        {/* List */}
        {loading ? (
          <p>Cargando incidencias...</p>
        ) : (
          Object.keys(agrupacion).length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
              <CheckCircle size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.2 }} />
              <h2>No hay incidencias que coincidan</h2>
              <p>Todo está al día en esta vista.</p>
            </div>
          ) : (
            Object.keys(agrupacion).map(instId => {
              const instalacion = agrupacion[instId];
              const isInstOpen = openInstalaciones[instId] !== false; // Abierto por defecto

              return (
                <div key={instId} className="card" style={{ padding: 0, marginBottom: '1.5rem', overflow: 'hidden' }}>
                  <div 
                    onClick={() => toggleInstalacion(instId)}
                    style={{ background: '#f8f9fa', padding: '1rem 1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: isInstOpen ? '1px solid #eee' : 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <MapPin size={20} color="#0A2342" />
                       <h2 style={{ margin: 0, color: '#0A2342', fontSize: '1.2rem' }}>{instalacion.direccion}</h2>
                    </div>
                    {isInstOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>

                  {isInstOpen && (
                    <div style={{ padding: '1.5rem', background: 'white' }}>
                      {Object.keys(instalacion.puertas).map(puertaId => {
                        const puerta = instalacion.puertas[puertaId];
                        return (
                          <div key={puertaId} style={{ marginBottom: '2rem' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#555', borderBottom: '2px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                              <DoorOpen size={18} /> {puerta.tipo}
                            </h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              {puerta.incidencias.map(inc => (
                                <div key={inc.id} className="incidencia-card" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                  <div style={{ padding: '0.8rem 1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 600 }}>Detección: {new Date(inc.created_at).toLocaleDateString()}</span>
                                    <span className="pill" style={{ backgroundColor: inc.estado === 'Cerrada' ? '#28a745' : '#E63329', color: 'white' }}>{inc.estado}</span>
                                  </div>
                                  
                                  <div className="incidencia-body" style={{ padding: '1rem 1.5rem' }}>
                                    <div className="incidencia-col">
                                      <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={16} /> Detalle del Fallo</h4>
                                      <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: '#444' }}>{inc.descripcion}</p>
                                      
                                      {inc.Checklist_Respuestas?.url_foto && (
                                        <div style={{ marginTop: '1rem' }}>
                                          <a href={inc.Checklist_Respuestas.url_foto} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#0A2342', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <FileText size={14} /> Ver Foto Evidencia
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="incidencia-col" style={{ borderLeft: '1px solid #eee', paddingLeft: '2rem' }}>
                                      <h4 style={{ marginBottom: '0.5rem' }}>Gestión</h4>
                                      
                                      <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Presupuesto Estimado (€)</label>
                                        <input 
                                          type="number" 
                                          defaultValue={inc.presupuesto || 0} 
                                          onBlur={(e) => updatePresupuesto(inc.id, e.target.value)}
                                          className="form-input" 
                                          style={{ width: '120px', padding: '0.4rem' }}
                                        />
                                      </div>

                                      <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#0A2342' }}>Coordinar Reparación (Generar Parte)</label>
                                        
                                        {inc.Usuarios?.nombre_completo ? (
                                          <div style={{ padding: '0.8rem', background: '#e3f2fd', border: '1px solid #bbdefb', borderRadius: '4px' }}>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#0d47a1' }}>
                                              <strong>Técnico encargado:</strong> {inc.Usuarios.nombre_completo}
                                            </p>
                                          </div>
                                        ) : (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0.8rem', background: '#f8f9fa', border: '1px solid #eee', borderRadius: '4px' }}>
                                            <select 
                                              className="form-input" 
                                              style={{ width: '100%', padding: '0.4rem', fontSize: '0.9rem' }}
                                              value={(assignDrafts[inc.id] && assignDrafts[inc.id].tecnico) || ''}
                                              onChange={(e) => handleDraftChange(inc.id, 'tecnico', e.target.value)}
                                            >
                                              <option value="">-- Elige Técnico --</option>
                                              {tecnicos.map(t => (
                                                <option key={t.id_usuario} value={t.id_usuario}>{t.nombre_completo}</option>
                                              ))}
                                            </select>
                                            
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                              <input 
                                                type="date" 
                                                className="form-input"
                                                style={{ flex: 1, padding: '0.4rem', fontSize: '0.9rem' }}
                                                value={(assignDrafts[inc.id] && assignDrafts[inc.id].fecha) || ''}
                                                onChange={(e) => handleDraftChange(inc.id, 'fecha', e.target.value)}
                                              />
                                              <button 
                                                onClick={() => crearMantenimientoCorrectivo(inc)}
                                                className="btn-primary" 
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                              >
                                                Asignar
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Cambiar Estado</label>
                                        <div className="state-timeline">
                                          {ESTADOS.map((st, i) => {
                                            const isActive = inc.estado === st;
                                            const isPassed = ESTADOS.indexOf(inc.estado) >= i;
                                            return (
                                              <span 
                                                key={st} 
                                                onClick={() => updateEstado(inc.id, st)}
                                                className={`state-step ${isActive ? 'active' : ''}`}
                                                style={isPassed && !isActive ? { borderColor: '#0A2342', color: '#0A2342' } : {}}
                                              >
                                                {st}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}

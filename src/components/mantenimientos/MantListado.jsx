// Mantenimientos — Vista Central de Grupos y Asignaciones
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { MantSidebar } from './MantViews';
import { Calendar, ChevronLeft, ChevronRight, MapPin, DoorOpen, Clock, X, Plus, Edit2 } from 'lucide-react';

const FREQ_COLORS = { mensual: '#2196F3', trimestral: '#FF9800', semestral: '#9C27B0', anual: '#E91E63' };
const ESTADO_COLORS = { programado: '#0A2342', asignado: '#FF9800', en_curso: '#2196F3', completado: '#28a745', cancelado: '#dc3545' };
const ESTADO_LABELS = { programado: 'Programado', asignado: 'Asignado', en_curso: 'En Curso', completado: 'Completado', cancelado: 'Cancelado' };
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function MantListado({ user }) {
  const now = new Date();
  const [grupos, setGrupos] = useState([]);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [selectedMants, setSelectedMants] = useState([]);
  
  // Filters
  const [listPeriod, setListPeriod] = useState({ month: now.getMonth(), year: now.getFullYear() });
  const [filtroFreq, setFiltroFreq] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // UI State
  const [expandedGrupo, setExpandedGrupo] = useState(null);
  const [draggedMant, setDraggedMant] = useState(null);
  const [detailMant, setDetailMant] = useState(null);

  // Group Form
  const [showGrupoForm, setShowGrupoForm] = useState(false);
  const [grupoForm, setGrupoForm] = useState({ nombre: '', descripcion: '' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    // We bring all maintainances, but filter in JS by the Period selected
    const { data: gData } = await supabase.from('Grupos_Mantenimiento').select('*').order('orden');
    const { data: tData } = await supabase.from('Usuarios').select('*').eq('rol', 'Tecnico');
    const { data: mData } = await supabase.from('Mantenimientos').select(`
      *,
      Instalaciones ( direccion, Clientes_Mant(razon_social) ),
      Puertas ( tipo, identificador, accesorios )
    `).order('fecha_programada');
    
    setGrupos(gData || []);
    setTecnicos(tData || []);
    setMantenimientos(mData || []);
  };

  const setHoy = () => {
    const today = new Date();
    setListPeriod({ month: today.getMonth(), year: today.getFullYear() });
  };

  const handleDragStart = (e, m) => {
    setDraggedMant(m);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, groupId) => {
    e.preventDefault();
    if (!draggedMant) return;
    if (draggedMant.id_grupo === (groupId || null)) return; // No change

    // Optimistic update
    setMantenimientos(prev => prev.map(m => m.id === draggedMant.id ? { ...m, id_grupo: groupId || null } : m));
    
    // DB update
    await supabase.from('Mantenimientos').update({ id_grupo: groupId || null }).eq('id', draggedMant.id);
    setDraggedMant(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const changeDate = async (mantId, newDateStr) => {
    if (!newDateStr) return;
    setMantenimientos(prev => prev.map(m => m.id === mantId ? { ...m, fecha_programada: newDateStr } : m));
    await supabase.from('Mantenimientos').update({ fecha_programada: newDateStr }).eq('id', mantId);
  };

  const createGrupo = async (e) => {
    e.preventDefault();
    const maxOrden = grupos.reduce((max, g) => Math.max(max, g.orden || 0), 0);
    await supabase.from('Grupos_Mantenimiento').insert([{ ...grupoForm, orden: maxOrden + 1 }]);
    setGrupoForm({ nombre: '', descripcion: '' });
    setShowGrupoForm(false);
    fetchAll();
  };

  const getFilteredMantenimientos = () => {
    return mantenimientos.filter(m => {
      const d = new Date(m.fecha_programada);
      const isPeriodMatch = d.getMonth() === listPeriod.month && d.getFullYear() === listPeriod.year;
      if (!isPeriodMatch) return false;
      if (filtroFreq !== 'todos' && m.frecuencia !== filtroFreq) return false;
      if (filtroEstado !== 'todos' && m.estado !== filtroEstado) return false;
      return true;
    });
  };

  const toggleSelect = (id) => {
    setSelectedMants(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const assignSelected = async () => {
    const selector = document.getElementById('tecnico-selector');
    const dateSelector = document.getElementById('assigned-date-selector');

    const tecId = selector ? selector.value : '';
    const selectedDate = dateSelector ? dateSelector.value : '';

    if (!tecId) return alert('Selecciona un técnico primero.');
    
    const isUnassign = tecId === 'unassign';
    const finalId = isUnassign ? null : tecId;
    const finalEstado = isUnassign ? 'programado' : 'asignado';
    
    setMantenimientos(prev => prev.map(m => {
      if (!selectedMants.includes(m.id)) return m;
      return { 
        ...m, 
        id_tecnico: finalId, 
        estado: finalEstado,
        ...(selectedDate ? { fecha_programada: selectedDate } : {})
      };
    }));

    const updates = { id_tecnico: finalId, estado: finalEstado };
    if (selectedDate) updates.fecha_programada = selectedDate;

    await supabase.from('Mantenimientos').update(updates).in('id', selectedMants);
    setSelectedMants([]);
  };

  const currentMants = getFilteredMantenimientos();
  const unassignedMants = currentMants.filter(m => !m.id_grupo);

  return (
    <div className="dashboard-layout">
      <MantSidebar user={user} />
      <div className="main-content">
        <div className="header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>Panel de Grupos y Listado</h1>
          <button className="btn-primary" style={{ width: 'auto', margin: 0, padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setShowGrupoForm(true)}>
            <Plus size={18}/> Nuevo Grupo Temático
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="card" style={{ padding: '1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2rem', background: '#f8f9fa', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'white', padding: '0.4rem', borderRadius: '8px', border: '1px solid #ddd' }}>
            <button className="icon-btn" onClick={() => setListPeriod(p => p.month === 0 ? { month: 11, year: p.year - 1 } : { ...p, month: p.month - 1 })}><ChevronLeft size={20}/></button>
            <h3 style={{ margin: 0, minWidth: '140px', textAlign: 'center', color: '#0A2342' }}>{MESES[listPeriod.month]} {listPeriod.year}</h3>
            <button className="icon-btn" onClick={() => setListPeriod(p => p.month === 11 ? { month: 0, year: p.year + 1 } : { ...p, month: p.month + 1 })}><ChevronRight size={20}/></button>
          </div>
          
          <button onClick={setHoy} style={{ width: 'auto', padding: '0.6rem 1.2rem', backgroundColor: '#0A2342', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>
            Ir a Hoy
          </button>
          
          <div style={{ borderLeft: '2px solid #ddd', height: '35px' }}></div>
          
          <div style={{ display: 'flex', gap: '1rem', flex: 1, flexWrap: 'wrap' }}>
            <select value={filtroFreq} onChange={e => setFiltroFreq(e.target.value)} className="form-input" style={{ flex: 1, minWidth: '150px', background: 'white' }}>
              <option value="todos">Todas las frecuencias</option>
              <option value="mensual">Mensual</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </select>
            
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="form-input" style={{ flex: 1, minWidth: '150px', background: 'white' }}>
              <option value="todos">Todos los Estados</option>
              {Object.keys(ESTADO_LABELS).map(k => <option key={k} value={k}>{ESTADO_LABELS[k]}</option>)}
            </select>
          </div>
        </div>

        {/* Modal Nuevo Grupo */}
        {showGrupoForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '400px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Crear Grupo</h3>
                <button onClick={() => setShowGrupoForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X/></button>
              </div>
              <form onSubmit={createGrupo}>
                <div className="input-group">
                  <label>Nombre del Grupo</label>
                  <input type="text" value={grupoForm.nombre} onChange={e=>setGrupoForm({...grupoForm, nombre: e.target.value})} placeholder="Ej: Ruta Norte" required />
                </div>
                <div className="input-group">
                  <label>Descripción / Zonas</label>
                  <input type="text" value={grupoForm.descripcion} onChange={e=>setGrupoForm({...grupoForm, descripcion: e.target.value})} placeholder="Ej: Polígono Industrial..." />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setShowGrupoForm(false)} className="btn-secondary" style={{ width: 'auto' }}>Cancelar</button>
                  <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>💡 <strong>Pro consejo:</strong> Puedes arrastrar los mantenimientos individuales desde "Sin Asignar" hacia cualquier grupo.</p>

        {/* Contenedores de Grupos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {grupos.map(g => {
            const mantsDelGrupo = currentMants.filter(m => m.id_grupo === g.id);
            const isExpanded = expandedGrupo === g.id;
            
            return (
              <div 
                key={g.id} 
                className="card" 
                style={{ padding: '0', border: '2px dashed transparent', transition: 'border 0.2s', overflow: 'hidden' }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, g.id)}
              >
                {/* Accordion Header */}
                <div 
                  onClick={() => setExpandedGrupo(isExpanded ? null : g.id)} 
                  style={{ padding: '1.2rem', background: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: isExpanded ? '1px solid #eee' : 'none' }}
                >
                  <div>
                    <h2 style={{ margin: 0, color: '#0A2342', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {g.nombre} <span className="pill" style={{ fontSize: '0.8rem', backgroundColor: '#e2e3e5', color: '#333' }}>{mantsDelGrupo.length} ítems</span>
                    </h2>
                    {g.descripcion && <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#666' }}>{g.descripcion}</p>}
                  </div>
                  <ChevronRight size={24} style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: '#666' }} />
                </div>

                {/* Listado de mantenimientos del grupo */}
                {isExpanded && (
                  <div style={{ padding: '1.2rem', background: 'white' }}>
                    {mantsDelGrupo.length === 0 ? (
                      <p style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', margin: '2rem 0' }}>Arrastra mantenimientos aquí o créalos asociados a este grupo en la configuración de la Puerta.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                        {mantsDelGrupo.map(m => <MantItem key={m.id} m={m} onDragStart={handleDragStart} changeDate={changeDate} onClick={() => setDetailMant(m)} isSelected={selectedMants.includes(m.id)} onToggleSelect={() => toggleSelect(m.id)} />)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Zona "Sin Asignar" */}
        <div style={{ marginTop: '3rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#E63329', marginBottom: '1rem' }}>
             Sin Asignar a Grupo <span className="pill" style={{ fontSize: '0.8rem', backgroundColor: '#ffe5e5', color: '#E63329', border: '1px solid #ffcccc' }}>{unassignedMants.length} huérfanos</span>
          </h2>
          <div 
            className="card" 
            style={{ padding: '1.5rem', minHeight: '150px', background: '#fffcfc', border: '2px dashed #ffcccc' }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, null)}
          >
            {unassignedMants.length === 0 ? (
              <p style={{ color: '#aaa', fontStyle: 'italic', textAlign: 'center', margin: '2rem 0' }}>Estupendo, todas las operaciones de este mes están en sus grupos.</p>
            ) : (
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                 {unassignedMants.map(m => <MantItem key={m.id} m={m} onDragStart={handleDragStart} changeDate={changeDate} onClick={() => setDetailMant(m)} isSelected={selectedMants.includes(m.id)} onToggleSelect={() => toggleSelect(m.id)} />)}
               </div>
            )}
          </div>
        </div>

        {/* Modal de Detalle */}
        {detailMant && <MantDetailModal m={detailMant} onClose={() => setDetailMant(null)} />}

        {/* Floating Action Bar para Asignación Masiva */}
        {selectedMants.length > 0 && (
          <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#0A2342', color: 'white', padding: '1rem 2rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 1100, flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{selectedMants.length} seleccionados</span>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', height: '24px' }}></div>
            
            <select id="tecnico-selector" style={{ padding: '0.4rem', borderRadius: '4px', border: 'none', color: '#333' }} defaultValue="">
              <option value="" disabled>1. Seleccionar Técnico...</option>
              {tecnicos.map(t => <option key={t.id_usuario} value={t.id_usuario}>{t.nombre_completo}</option>)}
              <option value="unassign" style={{ color: 'red' }}>Quitar Técnico (Desasignar)</option>
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
              <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>2. Fecha (Opcional):</span>
              <input type="date" id="assigned-date-selector" style={{ padding: '0.2rem', borderRadius: '4px', border: 'none', color: '#333', fontSize: '0.8rem' }} />
            </div>

            <button style={{ padding: '0.4rem 1rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }} onClick={assignSelected}>Aplicar Cambios</button>
            <button onClick={() => setSelectedMants([])} style={{ background: 'none', border: 'none', color: '#ffcccc', cursor: 'pointer', display: 'flex' }}><X size={20}/></button>
          </div>
        )}

      </div>
    </div>
  );
}

// Widget de Tarjeta Individual de Mantenimiento (Sirve para hacer drag&drop y cambiar fecha)
function MantItem({ m, onDragStart, changeDate, onClick, isSelected, onToggleSelect }) {
  return (
    <div 
      draggable 
      onDragStart={(e) => onDragStart(e, m)}
      style={{ 
        border: '1px solid #eee', borderRadius: '8px', padding: '1rem', background: 'white', 
        cursor: 'grab', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', position: 'relative',
        borderLeft: `6px solid ${ESTADO_COLORS[m.estado] || '#ccc'}`
      }}
      onDragEnd={(e) => e.target.style.opacity = '1'}
    >
      <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
        <input type="checkbox" checked={isSelected} onChange={(e) => { e.stopPropagation(); onToggleSelect(); }} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', paddingRight: '25px' }} onClick={onClick}>
         <strong style={{ fontSize: '1.1rem', color: '#0A2342', cursor: 'pointer' }}>{m.Instalaciones?.direccion || 'Desconocida'}</strong>
         <span className="pill" style={{ backgroundColor: ESTADO_COLORS[m.estado], color: 'white', fontSize: '0.7rem' }}>{ESTADO_LABELS[m.estado]}</span>
      </div>

      <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '12px', cursor: 'pointer' }} onClick={onClick}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <DoorOpen size={14} /> Puerta: <strong>{m.Puertas?.tipo || 'Sin Especificar'}</strong> {m.Puertas?.identificador && `(${m.Puertas.identificador})`}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
           <Clock size={14} /> Frecuencia: <span style={{ textTransform: 'capitalize' }}>{m.frecuencia}</span>
        </div>
      </div>

      <div style={{ background: '#f5f7fa', padding: '8px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 600 }}>Fecha Prevista:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input 
             type="date" 
             value={m.fecha_programada} 
             onChange={(e) => changeDate(m.id, e.target.value)}
             style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', color: '#0A2342', fontWeight: 'bold', outline: 'none', cursor: 'text' }}
          />
          <Edit2 size={12} color="#999" />
        </div>
      </div>
    </div>
  );
}

function MantDetailModal({ m, onClose }) {
  const puerta = m.Puertas || {};
  const accesorios = puerta.accesorios || [];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#0A2342' }}>Detalle de Mantenimiento</h2>
            <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '0.9rem' }}>{m.Instalaciones?.direccion}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}><X size={24} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#0A2342' }}>Puerta</h4>
            <div style={{ fontSize: '0.9rem', color: '#555' }}><strong>Tipo:</strong> {puerta.tipo || 'N/A'}</div>
            <div style={{ fontSize: '0.9rem', color: '#555' }}><strong>Ubicación:</strong> {puerta.identificador || 'N/A'}</div>
            <div style={{ fontSize: '0.9rem', color: '#555' }}><strong>Estado Mant:</strong> <span className="pill" style={{ backgroundColor: ESTADO_COLORS[m.estado], color: 'white', fontSize: '0.7rem' }}>{ESTADO_LABELS[m.estado]}</span></div>
          </div>
          <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#0A2342' }}>Programación</h4>
            <div style={{ fontSize: '0.9rem', color: '#555' }}><strong>Frecuencia:</strong> <span style={{ textTransform: 'capitalize' }}>{m.frecuencia}</span></div>
            <div style={{ fontSize: '0.9rem', color: '#555' }}><strong>Fecha Prevista:</strong> {new Date(m.fecha_programada).toLocaleDateString()}</div>
          </div>
        </div>

        <h4 style={{ color: '#0A2342', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Accesorios y Elementos</h4>
        {accesorios.length === 0 ? (
          <p style={{ fontSize: '0.9rem', color: '#666', fontStyle: 'italic' }}>No hay accesorios extra definidos para esta puerta.</p>
        ) : (
          <table style={{ width: '100%', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            <thead>
              <tr style={{ background: '#f1f1f1', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Elemento</th>
                <th style={{ padding: '8px' }}>Marca</th>
                <th style={{ padding: '8px' }}>Modelo</th>
              </tr>
            </thead>
            <tbody>
              {accesorios.map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{a.elemento}</td>
                  <td style={{ padding: '8px' }}>{a.marca || '-'}</td>
                  <td style={{ padding: '8px' }}>{a.modelo || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>
    </div>
  );
}


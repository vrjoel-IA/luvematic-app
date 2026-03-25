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
  
  // Filters
  const [listPeriod, setListPeriod] = useState({ month: now.getMonth(), year: now.getFullYear() });
  const [filtroFreq, setFiltroFreq] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // UI State
  const [expandedGrupo, setExpandedGrupo] = useState(null);
  const [draggedMant, setDraggedMant] = useState(null);

  // Group Form
  const [showGrupoForm, setShowGrupoForm] = useState(false);
  const [grupoForm, setGrupoForm] = useState({ nombre: '', descripcion: '' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    // We bring all maintainances, but filter in JS by the Period selected
    const { data: gData } = await supabase.from('Grupos_Mantenimiento').select('*').order('orden');
    const { data: mData } = await supabase.from('Mantenimientos').select(`
      *,
      Instalaciones ( direccion, Clientes_Mant(razon_social) ),
      Puertas ( tipo )
    `).order('fecha_programada');
    
    setGrupos(gData || []);
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

  const currentMants = getFilteredMantenimientos();
  const unassignedMants = currentMants.filter(m => !m.id_grupo);

  return (
    <div className="dashboard-layout">
      <MantSidebar user={user} />
      <div className="main-content">
        <div className="header" style={{ marginBottom: '1rem' }}>
          <h1>Panel de Grupos y Listado</h1>
          <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setShowGrupoForm(true)}>
            <Plus size={18}/> Nuevo Grupo Temático
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="icon-btn" onClick={() => setListPeriod(p => p.month === 0 ? { month: 11, year: p.year - 1 } : { ...p, month: p.month - 1 })}><ChevronLeft size={20}/></button>
            <h3 style={{ margin: 0, minWidth: '150px', textAlign: 'center' }}>{MESES[listPeriod.month]} {listPeriod.year}</h3>
            <button className="icon-btn" onClick={() => setListPeriod(p => p.month === 11 ? { month: 0, year: p.year + 1 } : { ...p, month: p.month + 1 })}><ChevronRight size={20}/></button>
          </div>
          <button className="btn-secondary" onClick={setHoy} style={{ width: 'auto', padding: '0.4rem 1rem' }}>Ir a Hoy</button>
          
          <div style={{ borderLeft: '1px solid #ccc', height: '30px', margin: '0 10px' }}></div>
          
          <select value={filtroFreq} onChange={e => setFiltroFreq(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
            <option value="todos">Todas las frecuencias</option>
            <option value="mensual">Mensual</option>
            <option value="trimestral">Trimestral</option>
            <option value="semestral">Semestral</option>
            <option value="anual">Anual</option>
          </select>
          
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
            <option value="todos">Todos los Estados</option>
            {Object.keys(ESTADO_LABELS).map(k => <option key={k} value={k}>{ESTADO_LABELS[k]}</option>)}
          </select>
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
                        {mantsDelGrupo.map(m => <MantItem key={m.id} m={m} onDragStart={handleDragStart} changeDate={changeDate} />)}
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
                 {unassignedMants.map(m => <MantItem key={m.id} m={m} onDragStart={handleDragStart} changeDate={changeDate} />)}
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Widget de Tarjeta Individual de Mantenimiento (Sirve para hacer drag&drop y cambiar fecha)
function MantItem({ m, onDragStart, changeDate }) {
  return (
    <div 
      draggable 
      onDragStart={(e) => onDragStart(e, m)}
      style={{ 
        border: '1px solid #eee', borderRadius: '8px', padding: '1rem', background: 'white', 
        cursor: 'grab', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', position: 'relative',
        borderLeft: `4px solid ${FREQ_COLORS[m.frecuencia] || '#ccc'}`
      }}
      onDragEnd={(e) => e.target.style.opacity = '1'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
         <strong style={{ fontSize: '1.1rem', color: '#0A2342' }}>{m.Instalaciones?.direccion || 'Desconocida'}</strong>
         <span className="pill" style={{ backgroundColor: ESTADO_COLORS[m.estado], color: 'white', fontSize: '0.7rem' }}>{ESTADO_LABELS[m.estado]}</span>
      </div>

      <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <DoorOpen size={14} /> Puerta: <strong>{m.Puertas?.tipo || 'Sin Especificar'}</strong>
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

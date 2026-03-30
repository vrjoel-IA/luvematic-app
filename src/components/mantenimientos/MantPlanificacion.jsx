// Mantenimientos — Planificación: Calendario + Asignación de Técnicos
import { useState, useEffect } from 'react';
import { Calendar, User, MapPin, ChevronLeft, ChevronRight, Layers, Plus, X } from 'lucide-react';
import { supabase } from '../../supabase';
import { MantSidebar } from './MantViews';

const FREQ_COLORS = { mensual: '#2196F3', trimestral: '#FF9800', semestral: '#9C27B0', anual: '#E91E63', correctivo: '#E63329' };
const ESTADO_COLORS = { programado: '#0A2342', asignado: '#FF9800', en_curso: '#2196F3', completado: '#28a745', cancelado: '#dc3545' };
const ESTADO_LABELS = { programado: 'Programado', asignado: 'Asignado', en_curso: 'En Curso', completado: 'Completado', cancelado: 'Cancelado' };

export function MantPlanificacion({ user }) {
  const [mantenimientos, setMantenimientos] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);
  const [vista, setVista] = useState('calendario'); // calendario | asignacion | grupos
  const [filtroTecnico, setFiltroTecnico] = useState('todos');
  const [filtroGrupo, setFiltroGrupo] = useState('todos');
  // Grupos inline state
  const [showGrupoForm, setShowGrupoForm] = useState(false);
  const [editingGrupoId, setEditingGrupoId] = useState(null);
  const [grupoForm, setGrupoForm] = useState({ nombre: '', descripcion: '' });
  const [grupoLoading, setGrupoLoading] = useState(false);
  const [mantCounts, setMantCounts] = useState({});

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [mRes, tRes, gRes] = await Promise.all([
      supabase.from('Mantenimientos').select('*, Instalaciones(direccion, Clientes_Mant(razon_social)), Usuarios:id_tecnico(nombre_completo)').order('fecha_programada'),
      supabase.from('Usuarios').select('*').eq('rol', 'Tecnico'),
      supabase.from('Grupos_Mantenimiento').select('*').order('orden'),
    ]);
    setMantenimientos(mRes.data || []);
    setTecnicos(tRes.data || []);
    setGrupos(gRes.data || []);
    // Count mantenimientos per group
    const counts = {};
    (mRes.data || []).forEach(m => { if (m.id_grupo) counts[m.id_grupo] = (counts[m.id_grupo] || 0) + 1; });
    setMantCounts(counts);
  };

  // Grupos CRUD
  const resetGrupoForm = () => { setGrupoForm({ nombre: '', descripcion: '' }); setEditingGrupoId(null); setShowGrupoForm(false); };
  const handleEditGrupo = (g) => { setGrupoForm({ nombre: g.nombre, descripcion: g.descripcion || '' }); setEditingGrupoId(g.id); setShowGrupoForm(true); };
  const handleSubmitGrupo = async (e) => {
    e.preventDefault(); setGrupoLoading(true);
    try {
      if (editingGrupoId) { await supabase.from('Grupos_Mantenimiento').update(grupoForm).eq('id', editingGrupoId); }
      else { const maxOrden = grupos.reduce((max, g) => Math.max(max, g.orden || 0), 0); await supabase.from('Grupos_Mantenimiento').insert([{ ...grupoForm, orden: maxOrden + 1 }]); }
      resetGrupoForm(); await fetchAll();
    } catch (err) { alert('Error: ' + err.message); }
    setGrupoLoading(false);
  };
  const handleDeleteGrupo = async (id) => {
    if (!confirm('¿Eliminar este grupo? Los mantenimientos se desvinculan.')) return;
    await supabase.from('Mantenimientos').update({ id_grupo: null }).eq('id_grupo', id);
    await supabase.from('Grupos_Mantenimiento').delete().eq('id', id);
    await fetchAll();
  };
  const moveGroup = async (index, direction) => {
    const newG = [...grupos]; const ti = index + direction;
    if (ti < 0 || ti >= newG.length) return;
    [newG[index], newG[ti]] = [newG[ti], newG[index]];
    await Promise.all([supabase.from('Grupos_Mantenimiento').update({ orden: index }).eq('id', newG[index].id), supabase.from('Grupos_Mantenimiento').update({ orden: ti }).eq('id', newG[ti].id)]);
    await fetchAll();
  };

  const assignTecnico = async (mantId, tecnicoId) => {
    const update = { id_tecnico: tecnicoId || null, estado: tecnicoId ? 'asignado' : 'programado' };
    await supabase.from('Mantenimientos').update(update).eq('id', mantId);
    await fetchAll();
  };

  const assignGrupo = async (mantId, grupoId) => {
    await supabase.from('Mantenimientos').update({ id_grupo: grupoId || null }).eq('id', mantId);
    await fetchAll();
  };

  // Calendar helpers
  const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const diasSemana = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1; };

  const mantByDate = {};
  mantenimientos.forEach(m => {
    const date = m.fecha_programada;
    if (!mantByDate[date]) mantByDate[date] = [];
    mantByDate[date].push(m);
  });

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const todayStr = new Date().toISOString().split('T')[0];

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); setSelectedDay(null); };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); setSelectedDay(null); };

  // Selected day items
  const selectedDayStr = selectedDay ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}` : null;
  const selectedItems = selectedDayStr ? (mantByDate[selectedDayStr] || []) : [];

  // For assignment view - filter unassigned or by tech/group
  const pendientes = mantenimientos.filter(m => {
    const matchesTecnico = filtroTecnico === 'todos' || (filtroTecnico === 'sin_asignar' ? !m.id_tecnico : m.id_tecnico === filtroTecnico);
    const matchesGrupo = filtroGrupo === 'todos' || (filtroGrupo === 'sin_grupo' ? !m.id_grupo : m.id_grupo === filtroGrupo);
    return matchesTecnico && matchesGrupo && m.estado !== 'completado' && m.estado !== 'cancelado';
  }).sort((a, b) => a.fecha_programada.localeCompare(b.fecha_programada));

  return (
    <div className="dashboard-layout">
      <MantSidebar user={user} />
      <div className="main-content">
        <div className="header">
          <h1>Planificación</h1>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => setVista('calendario')} className="btn-primary"
              style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.9rem', backgroundColor: vista === 'calendario' ? '#0A2342' : '#6c757d' }}>
              <Calendar size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Calendario
            </button>
            <button onClick={() => setVista('asignacion')} className="btn-primary"
              style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.9rem', backgroundColor: vista === 'asignacion' ? '#0A2342' : '#6c757d' }}>
              <User size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Asignación
            </button>
            <button onClick={() => setVista('grupos')} className="btn-primary"
              style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.9rem', backgroundColor: vista === 'grupos' ? '#0A2342' : '#6c757d' }}>
              <Layers size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Grupos
            </button>
          </div>
        </div>

        {vista === 'calendario' ? (
          <>
            {/* Calendar View */}
            <div className="card" style={{ padding: '1.5rem' }}>
              {/* Month navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <button onClick={prevMonth} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}><ChevronLeft size={18} /></button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{ margin: 0 }}>{mesesNombres[currentMonth]} {currentYear}</h2>
                  <button onClick={() => { const now = new Date(); setCurrentMonth(now.getMonth()); setCurrentYear(now.getFullYear()); setSelectedDay(now.getDate()); }}
                    style={{ padding: '4px 12px', borderRadius: '16px', border: '2px solid #0A2342', backgroundColor: 'white', color: '#0A2342', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
                    Hoy
                  </button>
                </div>
                <button onClick={nextMonth} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}><ChevronRight size={18} /></button>
              </div>

              {/* Calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {diasSemana.map(d => (
                  <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', borderBottom: '2px solid #eee' }}>{d}</div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const items = mantByDate[dateStr] || [];
                  const isToday = dateStr === todayStr;
                  const isSelected = day === selectedDay;

                  return (
                    <div key={day} onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                      style={{ minHeight: '70px', padding: '4px', border: isSelected ? '2px solid #0A2342' : '1px solid #eee', borderRadius: '6px', cursor: 'pointer',
                        backgroundColor: isToday ? '#f0f4ff' : isSelected ? '#e8edff' : 'white', transition: 'all 0.15s' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: isToday ? 800 : 500, color: isToday ? '#0A2342' : '#333', marginBottom: '2px' }}>
                        {day}
                      </div>
                      {items.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                          {items.slice(0, 3).map((m, idx) => (
                            <div key={idx} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: FREQ_COLORS[m.frecuencia] || '#999' }} title={`${m.frecuencia} - ${m.Instalaciones?.direccion}`} />
                          ))}
                          {items.length > 3 && <span style={{ fontSize: '0.6rem', color: '#999' }}>+{items.length - 3}</span>}
                        </div>
                      )}
                      {items.length > 0 && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>{items.length} mant.</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected day detail */}
            {selectedDay && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.8rem' }}>📅 {selectedDay} de {mesesNombres[currentMonth]} — {selectedItems.length} mantenimiento(s)</h3>
                {selectedItems.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay mantenimientos este día.</div>
                ) : (
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {selectedItems.map(m => (
                      <div key={m.id} className="card" style={{ padding: '0.8rem 1.2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, color: 'white', backgroundColor: FREQ_COLORS[m.frecuencia], textTransform: 'uppercase' }}>{m.frecuencia}</span>
                            <div>
                              <strong>{m.Instalaciones?.direccion}</strong>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.Instalaciones?.Clientes_Mant?.razon_social}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {m.Usuarios?.nombre_completo && (
                              <span style={{ fontSize: '0.8rem', color: '#28a745', fontWeight: 600 }}>
                                👤 {m.Usuarios.nombre_completo}
                              </span>
                            )}
                            <select value={m.id_tecnico || ''} onChange={e => assignTecnico(m.id, e.target.value)} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}>
                              <option value="">Sin técnico</option>
                              {tecnicos.map(t => <option key={t.id_usuario} value={t.id_usuario}>{t.nombre_completo}</option>)}
                            </select>
                            <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', fontWeight: 600, color: 'white', backgroundColor: ESTADO_COLORS[m.estado] }}>
                              {ESTADO_LABELS[m.estado]}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Legend */}
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
              {Object.entries(FREQ_COLORS).map(([f, c]) => (
                <span key={f} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: c }} /> {f.charAt(0).toUpperCase() + f.slice(1)}
                </span>
              ))}
            </div>
          </>
        ) : vista === 'asignacion' ? (
          /* Assignment View */
          <>
            {/* Filters */}
            <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.8rem' }}>Técnico</label>
                  <select value={filtroTecnico} onChange={e => setFiltroTecnico(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.85rem' }}>
                    <option value="todos">Todos</option>
                    <option value="sin_asignar">🔴 Sin Asignar</option>
                    {tecnicos.map(t => <option key={t.id_usuario} value={t.id_usuario}>{t.nombre_completo}</option>)}
                  </select>
                </div>
                <div className="input-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.8rem' }}>Grupo / Zona</label>
                  <select value={filtroGrupo} onChange={e => setFiltroGrupo(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.85rem' }}>
                    <option value="todos">Todos</option>
                    <option value="sin_grupo">Sin Grupo</option>
                    {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="kpi-card"><h3>{pendientes.length}</h3><p style={{ color: 'var(--text-muted)' }}>Pendientes</p></div>
              <div className="kpi-card"><h3 style={{ color: '#dc3545' }}>{pendientes.filter(m => !m.id_tecnico).length}</h3><p style={{ color: 'var(--text-muted)' }}>Sin Técnico</p></div>
              <div className="kpi-card"><h3 style={{ color: '#FF9800' }}>{pendientes.filter(m => !m.id_grupo).length}</h3><p style={{ color: 'var(--text-muted)' }}>Sin Grupo</p></div>
            </div>

            {/* Maintenance assignment list */}
            {pendientes.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <User size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>No hay mantenimientos pendientes con estos filtros.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.6rem' }}>
                {pendientes.map(m => (
                  <div key={m.id} className="card" style={{ padding: '0.8rem 1.2rem', borderLeft: m.id_tecnico ? '4px solid #28a745' : '4px solid #dc3545' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 700, color: 'white', backgroundColor: FREQ_COLORS[m.frecuencia], textTransform: 'uppercase' }}>{m.frecuencia}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0A2342' }}>
                            <Calendar size={13} style={{ verticalAlign: 'middle' }} /> {new Date(m.fecha_programada).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                          <MapPin size={14} color="var(--text-muted)" />
                          <span>{m.Instalaciones?.direccion}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({m.Instalaciones?.Clientes_Mant?.razon_social})</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select value={m.id_grupo || ''} onChange={e => assignGrupo(m.id, e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.8rem', minWidth: '120px' }}>
                          <option value="">Sin grupo</option>
                          {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                        </select>
                        <select value={m.id_tecnico || ''} onChange={e => assignTecnico(m.id, e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: '4px', border: m.id_tecnico ? '2px solid #28a745' : '2px solid #dc3545', fontSize: '0.8rem', minWidth: '140px', fontWeight: 600 }}>
                          <option value="">⚠ Sin técnico</option>
                          {tecnicos.map(t => <option key={t.id_usuario} value={t.id_usuario}>{t.nombre_completo}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Grupos View */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Agrupa mantenimientos por zonas para organizar rutas.</p>
              <button className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => { resetGrupoForm(); setShowGrupoForm(true); }}>
                <Plus size={18} /> Nuevo Grupo
              </button>
            </div>

            {showGrupoForm && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div className="card" style={{ width: '90%', maxWidth: '450px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>{editingGrupoId ? 'Editar Grupo' : 'Nuevo Grupo'}</h2>
                    <button onClick={resetGrupoForm} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                  </div>
                  <form onSubmit={handleSubmitGrupo}>
                    <div className="input-group"><label>Nombre *</label><input type="text" value={grupoForm.nombre} onChange={e => setGrupoForm({ ...grupoForm, nombre: e.target.value })} required placeholder="Ej: Zona Norte" /></div>
                    <div className="input-group"><label>Descripción</label><textarea rows="2" value={grupoForm.descripcion} onChange={e => setGrupoForm({ ...grupoForm, descripcion: e.target.value })} placeholder="Descripción opcional"></textarea></div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={resetGrupoForm} className="btn-primary" style={{ backgroundColor: '#6c757d', width: 'auto' }}>Cancelar</button>
                      <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={grupoLoading}>{grupoLoading ? 'Guardando...' : (editingGrupoId ? 'Guardar' : 'Crear')}</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {grupos.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <Layers size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>No hay grupos. Crea zonas para organizar los mantenimientos.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.8rem' }}>
                {(() => { const ZONE_COLORS = ['#0A2342','#2196F3','#FF9800','#9C27B0','#E91E63','#28a745','#00BCD4','#795548']; return grupos.map((g, idx) => (
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
                          <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#f0f4f8', color: '#0A2342', fontWeight: 600 }}>{mantCounts[g.id] || 0} mant.</span>
                        </div>
                        {g.descripcion && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 26px' }}>{g.descripcion}</p>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEditGrupo(g)} className="btn-primary" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.85rem' }}>Editar</button>
                      <button onClick={() => handleDeleteGrupo(g.id)} className="btn-primary" style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.85rem', backgroundColor: '#dc3545' }}>Eliminar</button>
                    </div>
                  </div>
                )); })()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

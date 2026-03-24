// Mantenimientos — Planificación: Calendario + Asignación de Técnicos
import { useState, useEffect } from 'react';
import { Calendar, User, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../supabase';
import { MantSidebar } from './MantViews';

const FREQ_COLORS = { mensual: '#2196F3', trimestral: '#FF9800', semestral: '#9C27B0', anual: '#E91E63' };
const ESTADO_COLORS = { programado: '#0A2342', asignado: '#FF9800', en_curso: '#2196F3', completado: '#28a745', cancelado: '#dc3545' };
const ESTADO_LABELS = { programado: 'Programado', asignado: 'Asignado', en_curso: 'En Curso', completado: 'Completado', cancelado: 'Cancelado' };

export function MantPlanificacion({ user }) {
  const [mantenimientos, setMantenimientos] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);
  const [vista, setVista] = useState('calendario'); // calendario | asignacion
  const [filtroTecnico, setFiltroTecnico] = useState('todos');
  const [filtroGrupo, setFiltroGrupo] = useState('todos');

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
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setVista('calendario')} className="btn-primary"
              style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.9rem', backgroundColor: vista === 'calendario' ? '#0A2342' : '#6c757d' }}>
              <Calendar size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Calendario
            </button>
            <button onClick={() => setVista('asignacion')} className="btn-primary"
              style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.9rem', backgroundColor: vista === 'asignacion' ? '#0A2342' : '#6c757d' }}>
              <User size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Asignación
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
        ) : (
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
        )}
      </div>
    </div>
  );
}

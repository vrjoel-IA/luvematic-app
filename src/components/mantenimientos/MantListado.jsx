// Mantenimientos — Listado with filters and frequency badges
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Filter, MapPin, User } from 'lucide-react';
import { supabase } from '../../supabase';
import { MantSidebar } from './MantViews';

const FREQ_COLORS = { mensual: '#2196F3', trimestral: '#FF9800', semestral: '#9C27B0', anual: '#E91E63' };
const ESTADO_COLORS = { programado: '#0A2342', asignado: '#FF9800', en_curso: '#2196F3', completado: '#28a745', cancelado: '#dc3545' };
const ESTADO_LABELS = { programado: 'Programado', asignado: 'Asignado', en_curso: 'En Curso', completado: 'Completado', cancelado: 'Cancelado' };

export function MantListado({ user }) {
  const [mantenimientos, setMantenimientos] = useState([]);
  const [filtroFreq, setFiltroFreq] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth());
  const [filtroYear, setFiltroYear] = useState(new Date().getFullYear());
  const navigate = useNavigate();

  useEffect(() => { fetchMantenimientos(); }, []);

  const fetchMantenimientos = async () => {
    const { data, error } = await supabase
      .from('Mantenimientos')
      .select('*, Instalaciones(direccion, Clientes_Mant(razon_social)), Usuarios:id_tecnico(nombre_completo)')
      .order('fecha_programada', { ascending: true });
    if (!error) setMantenimientos(data || []);
  };

  const filtered = mantenimientos.filter(m => {
    const date = new Date(m.fecha_programada);
    const matchesFreq = filtroFreq === 'todos' || m.frecuencia === filtroFreq;
    const matchesEstado = filtroEstado === 'todos' || m.estado === filtroEstado;
    const matchesMes = date.getMonth() === filtroMes && date.getFullYear() === filtroYear;
    return matchesFreq && matchesEstado && matchesMes;
  });

  const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // Group by day for the listing
  const grouped = {};
  filtered.forEach(m => {
    const day = m.fecha_programada;
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(m);
  });

  const stats = {
    total: filtered.length,
    programados: filtered.filter(m => m.estado === 'programado').length,
    completados: filtered.filter(m => m.estado === 'completado').length,
    asignados: filtered.filter(m => m.estado === 'asignado').length,
  };

  return (
    <div className="dashboard-layout">
      <MantSidebar user={user} />
      <div className="main-content">
        <div className="header"><h1>Listado de Mantenimientos</h1></div>

        {/* KPIs */}
        <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="kpi-card"><h3>{stats.total}</h3><p style={{ color: 'var(--text-muted)' }}>Este Mes</p></div>
          <div className="kpi-card"><h3 style={{ color: '#0A2342' }}>{stats.programados}</h3><p style={{ color: 'var(--text-muted)' }}>Programados</p></div>
          <div className="kpi-card"><h3 style={{ color: '#FF9800' }}>{stats.asignados}</h3><p style={{ color: 'var(--text-muted)' }}>Asignados</p></div>
          <div className="kpi-card"><h3 style={{ color: '#28a745' }}>{stats.completados}</h3><p style={{ color: 'var(--text-muted)' }}>Completados</p></div>
        </div>

        {/* Filtros */}
        <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.8rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            <Filter size={16} /> FILTROS
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button onClick={() => { if (filtroMes === 0) { setFiltroMes(11); setFiltroYear(y => y - 1); } else setFiltroMes(m => m - 1); }}
                style={{ background: 'none', border: '1px solid #ddd', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>◀</button>
              <span style={{ minWidth: '140px', textAlign: 'center', fontWeight: 600 }}>{mesesNombres[filtroMes]} {filtroYear}</span>
              <button onClick={() => { if (filtroMes === 11) { setFiltroMes(0); setFiltroYear(y => y + 1); } else setFiltroMes(m => m + 1); }}
                style={{ background: 'none', border: '1px solid #ddd', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>▶</button>
              <button onClick={() => { const now = new Date(); setFiltroMes(now.getMonth()); setFiltroYear(now.getFullYear()); }}
                style={{ padding: '4px 10px', borderRadius: '14px', border: '2px solid #0A2342', backgroundColor: 'white', color: '#0A2342', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                Hoy
              </button>
            </div>

            {/* Freq filter */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setFiltroFreq('todos')}
                style={{ padding: '4px 12px', borderRadius: '16px', border: '1px solid #ccc', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                  backgroundColor: filtroFreq === 'todos' ? '#0A2342' : 'white', color: filtroFreq === 'todos' ? 'white' : '#333' }}>Todos</button>
              {Object.entries(FREQ_COLORS).map(([f, color]) => (
                <button key={f} onClick={() => setFiltroFreq(f)}
                  style={{ padding: '4px 12px', borderRadius: '16px', border: `2px solid ${color}`, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                    backgroundColor: filtroFreq === f ? color : 'white', color: filtroFreq === f ? 'white' : color }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}>
              <option value="todos">Todos los Estados</option>
              {Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        {/* Listing by date */}
        {Object.keys(grouped).length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Calendar size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No hay mantenimientos para estos filtros.</p>
          </div>
        ) : (
          Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([day, items]) => {
            const date = new Date(day);
            const isToday = new Date().toISOString().split('T')[0] === day;
            return (
              <div key={day} style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '10px', backgroundColor: isToday ? '#0A2342' : '#f0f4f8', color: isToday ? 'white' : '#0A2342',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{date.getDate()}</span>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>{date.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                  </div>
                  <span style={{ fontWeight: 600, color: isToday ? '#0A2342' : 'var(--text-muted)' }}>
                    {isToday ? '📍 HOY' : date.toLocaleDateString('es-ES', { weekday: 'long' })}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>({items.length})</span>
                </div>
                <div style={{ display: 'grid', gap: '0.5rem', marginLeft: '60px' }}>
                  {items.map(m => (
                    <div key={m.id} className="card" style={{ padding: '0.8rem 1.2rem', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(10,35,66,0.12)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                          <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, color: 'white', backgroundColor: FREQ_COLORS[m.frecuencia] || '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {m.frecuencia}
                          </span>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <MapPin size={14} color="var(--text-muted)" />
                              <strong style={{ fontSize: '0.95rem' }}>{m.Instalaciones?.direccion}</strong>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.Instalaciones?.Clientes_Mant?.razon_social}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {m.Usuarios?.nombre_completo && (
                            <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary-color)' }}>
                              <User size={14} /> {m.Usuarios.nombre_completo}
                            </span>
                          )}
                          <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', fontWeight: 600, color: 'white', backgroundColor: ESTADO_COLORS[m.estado] || '#999' }}>
                            {ESTADO_LABELS[m.estado] || m.estado}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Mantenimientos — Sidebar + Dashboard components
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Clock, AlertTriangle, CheckCircle, BarChart2 } from 'lucide-react';
import { supabase } from '../../supabase';

export function MantSidebar({ user }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? { fontWeight: 'bold', color: 'white' } : { opacity: 0.8, color: 'white' };

  const handleNav = (path) => { navigate(path); setIsMenuOpen(false); };
  const handleLogout = () => { localStorage.clear(); window.location.href = '/'; };

  return (
    <div className="sidebar">
      <div className="sidebar-top">
        <div style={{ background: 'white', padding: '6px 10px', borderRadius: '4px' }}>
          <img src="/logo.png" style={{ height: '30px', display: 'block' }} alt="LUVEMATIC" />
        </div>
        <button className="hamburger-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
        <p className="link" onClick={() => handleNav('/admin/mantenimientos')} style={isActive('/admin/mantenimientos')}>Dashboard</p>
        <p className="link" onClick={() => handleNav('/admin/mantenimientos/listado')} style={isActive('/admin/mantenimientos/listado')}>Mantenimientos</p>
        <p className="link" onClick={() => handleNav('/admin/mantenimientos/clientes')} style={isActive('/admin/mantenimientos/clientes')}>Clientes</p>
        <p className="link" onClick={() => handleNav('/admin/mantenimientos/incidencias')} style={isActive('/admin/mantenimientos/incidencias')}>Incidencias</p>
        {user?.rol === 'Direccion' && (
          <p className="link" onClick={() => handleNav('/admin/mantenimientos/rendimiento')} style={isActive('/admin/mantenimientos/rendimiento')}>Rendimiento</p>
        )}

        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1rem', paddingBottom: '1rem' }}>
          <p className="link" onClick={() => handleNav('/select-module')} style={{ opacity: 0.9, color: 'white', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <ArrowLeft size={16} /> Cambiar Módulo
          </p>
        </div>

        <div className="sidebar-footer" style={{ marginTop: 0, paddingTop: '1rem' }}>
          <p>{user?.nombre}</p>
          <button onClick={handleLogout} className="btn-danger">Cerrar Sesión</button>
        </div>
      </div>
    </div>
  );
}

export function MantDashboardAdmin({ user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ programados: 0, enCurso: 0, completados: 0, incidencias: 0 });
  const [proximos, setProximos] = useState([]);
  const [incidenciasRecientes, setIncidenciasRecientes] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data: mData } = await supabase.from('Mantenimientos')
      .select('id, estado, fecha_programada, frecuencia, Instalaciones(direccion), Puertas(tipo, identificador)')
      .gte('fecha_programada', startOfMonth)
      .lte('fecha_programada', endOfMonth);

    if (mData) {
      setStats(prev => ({
        ...prev,
        programados: mData.filter(m => ['programado', 'asignado'].includes(m.estado)).length,
        enCurso: mData.filter(m => m.estado === 'en_curso').length,
        completados: mData.filter(m => m.estado === 'completado').length,
      }));
    }

    const todayStr = now.toISOString().split('T')[0];
    const { data: proxData } = await supabase.from('Mantenimientos')
      .select('id, estado, fecha_programada, frecuencia, Instalaciones(direccion), Puertas(tipo, identificador)')
      .in('estado', ['programado', 'asignado', 'en_curso'])
      .gte('fecha_programada', todayStr)
      .order('fecha_programada', { ascending: true })
      .limit(5);

    if (proxData) setProximos(proxData);

    const { data: iData } = await supabase.from('Incidencias')
      .select('id, estado, descripcion, created_at, Puertas(tipo, identificador, Instalaciones(direccion))')
      .not('estado', 'in', '("cerrada","reparada")')
      .order('created_at', { ascending: false })
      .limit(5);

    if (iData) {
      setStats(prev => ({ ...prev, incidencias: iData.length }));
      setIncidenciasRecientes(iData);
    }
  };

  return (
    <div className="dashboard-layout">
      <MantSidebar user={user} />
      <div className="main-content">
        <div className="header" style={{ marginBottom: '2rem' }}>
          <h1 style={{ color: '#0A2342', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart2 size={28} /> Resumen de Actividad
          </h1>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(135deg, #0A2342 0%, #1a365d 100%)', color: 'white' }}>
            <Calendar size={32} style={{ opacity: 0.8, marginBottom: '10px' }} />
            <h3 style={{ margin: 0, fontSize: '2.5rem' }}>{stats.programados}</h3>
            <p style={{ margin: '5px 0 0', opacity: 0.9 }}>Visitas Pendientes (Mes)</p>
          </div>
          
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)', color: 'white' }}>
            <Clock size={32} style={{ opacity: 0.8, marginBottom: '10px' }} />
            <h3 style={{ margin: 0, fontSize: '2.5rem' }}>{stats.enCurso}</h3>
            <p style={{ margin: '5px 0 0', opacity: 0.9 }}>Mantenimientos en curso</p>
          </div>

          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(135deg, #28a745 0%, #218838 100%)', color: 'white' }}>
            <CheckCircle size={32} style={{ opacity: 0.8, marginBottom: '10px' }} />
            <h3 style={{ margin: 0, fontSize: '2.5rem' }}>{stats.completados}</h3>
            <p style={{ margin: '5px 0 0', opacity: 0.9 }}>Completados este mes</p>
          </div>

          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(135deg, #E63329 0%, #c82333 100%)', color: 'white' }}>
            <AlertTriangle size={32} style={{ opacity: 0.8, marginBottom: '10px' }} />
            <h3 style={{ margin: 0, fontSize: '2.5rem' }}>{stats.incidencias}</h3>
            <p style={{ margin: '5px 0 0', opacity: 0.9 }}>Incidencias Abiertas</p>
          </div>
        </div>

        {/* Listados */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
          
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#0A2342', borderBottom: '2px solid #eee', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} /> Próximas Citas (Agenda)
            </h3>
            {proximos.length === 0 ? (
              <p style={{ color: '#999', fontStyle: 'italic' }}>No hay mantenimientos planificados próximamente.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {proximos.map(m => (
                  <div key={m.id} style={{ borderLeft: '4px solid #0A2342', paddingLeft: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ color: '#333' }}>{m.Instalaciones?.direccion}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#666' }}>{new Date(m.fecha_programada).toLocaleDateString()}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                      {m.Puertas?.tipo} {m.Puertas?.identificador && `(${m.Puertas.identificador})`} — <span style={{ textTransform: 'capitalize' }}>{m.frecuencia}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="btn-secondary" style={{ marginTop: '1.5rem', width: '100%' }} onClick={() => navigate('/admin/mantenimientos/listado')}>
              Ver Listado Completo
            </button>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#E63329', borderBottom: '2px solid #eee', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} /> Incidencias Recientes (Activas)
            </h3>
            {incidenciasRecientes.length === 0 ? (
              <p style={{ color: '#999', fontStyle: 'italic' }}>Todo correcto, no hay averías activas.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {incidenciasRecientes.map(inc => (
                  <div key={inc.id} style={{ borderLeft: '4px solid #E63329', paddingLeft: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ color: '#333' }}>{inc.Puertas?.Instalaciones?.direccion || 'Desconocida'}</strong>
                      <span className="pill" style={{ backgroundColor: '#ffe5e5', color: '#E63329', fontSize: '0.7rem' }}>
                        {inc.estado.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                      <strong>{inc.Puertas?.tipo}:</strong> {inc.descripcion}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="btn-secondary" style={{ marginTop: '1.5rem', width: '100%' }} onClick={() => navigate('/admin/mantenimientos/incidencias')}>
              Gestionar Reparaciones
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

export function MantDashboardTech({ user }) {
  const navigate = useNavigate();
  const [mantenimientos, setMantenimientos] = useState([]);
  const todayStr = new Date().toISOString().split('T')[0];

  const FREQ_COLORS = { mensual: '#2196F3', trimestral: '#FF9800', semestral: '#9C27B0', anual: '#E91E63' };
  const ESTADO_COLORS = { programado: '#0A2342', asignado: '#FF9800', en_curso: '#2196F3', completado: '#28a745' };
  const ESTADO_LABELS = { programado: 'Programado', asignado: 'Asignado', en_curso: 'En Curso', completado: 'Completado' };

  useEffect(() => {
    supabase.from('Mantenimientos').select('*, Instalaciones(direccion, Clientes_Mant(razon_social))')
      .eq('id_tecnico', user.id).in('estado', ['asignado', 'en_curso', 'programado'])
      .order('fecha_programada').then(({ data }) => setMantenimientos(data || []));
  }, []);

  const hoy = mantenimientos.filter(m => m.fecha_programada === todayStr);
  const proximos = mantenimientos.filter(m => m.fecha_programada > todayStr).slice(0, 10);

  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <img src="/logo.png" style={{ height: '40px', background: 'white', padding: '5px', borderRadius: '4px' }} alt="LUVEMATIC" />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => navigate('/select-module')} className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#6c757d' }}>
            <ArrowLeft size={16} /> Módulos
          </button>
          <button onClick={() => { localStorage.clear(); window.location.href = '/'; }} className="btn-danger" style={{ width: 'auto' }}>Salir</button>
        </div>
      </div>

      {/* Today section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
        <Calendar size={20} color="#0A2342" />
        <h2 style={{ margin: 0, color: '#0A2342' }}>Hoy — {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
      </div>

      {hoy.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <p>No tienes mantenimientos asignados para hoy.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {hoy.map(m => (
            <div key={m.id} onClick={() => navigate(`/tecnico/mantenimiento/${m.id}`)} className="card" style={{ padding: '1rem', borderLeft: `4px solid ${FREQ_COLORS[m.frecuencia]}`, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 700, color: 'white', backgroundColor: FREQ_COLORS[m.frecuencia], textTransform: 'uppercase' }}>{m.frecuencia}</span>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 600, color: 'white', backgroundColor: ESTADO_COLORS[m.estado] }}>{ESTADO_LABELS[m.estado]}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                    <MapPin size={14} /> <strong>{m.Instalaciones?.direccion}</strong>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.Instalaciones?.Clientes_Mant?.razon_social}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming */}
      {proximos.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.8rem', marginTop: '1rem' }}>
            <Clock size={18} color="var(--text-muted)" />
            <h3 style={{ margin: 0, color: 'var(--text-muted)' }}>Próximos</h3>
          </div>
          <div style={{ display: 'grid', gap: '0.4rem' }}>
            {proximos.map(m => (
              <div key={m.id} onClick={() => navigate(`/tecnico/mantenimiento/${m.id}`)} className="card" style={{ padding: '0.7rem 1rem', opacity: 0.85, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 700, color: 'white', backgroundColor: FREQ_COLORS[m.frecuencia] }}>{m.frecuencia}</span>
                    <span style={{ fontSize: '0.85rem' }}>{m.Instalaciones?.direccion}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#0A2342', fontWeight: 600 }}>{new Date(m.fecha_programada).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


// Mantenimientos — Sidebar + Dashboard components
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Clock } from 'lucide-react';
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
  return (
    <div className="dashboard-layout">
      <MantSidebar user={user} />
      <div className="main-content">
        <div className="header"><h1>Mantenimientos — Dashboard</h1></div>
        <div className="card" style={{ marginTop: '2rem', textAlign: 'center', padding: '4rem' }}>
          <h2 style={{ color: 'var(--text-muted)' }}>Módulo en Construcción</h2>
          <p style={{ marginTop: '1rem' }}>Próximamente: Dashboard con estado del día, alertas y gráficas.</p>
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


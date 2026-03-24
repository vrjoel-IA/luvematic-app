// Mantenimientos — Placeholder components
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

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
        <p className="link" onClick={() => handleNav('/admin/mantenimientos/planificacion')} style={isActive('/admin/mantenimientos/planificacion')}>Planificación</p>
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
  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <img src="/logo.png" style={{ height: '40px', background: 'white', padding: '5px', borderRadius: '4px' }} alt="LUVEMATIC" />
        <button onClick={() => navigate('/select-module')} className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#6c757d' }}>
          <ArrowLeft size={16} /> Módulos
        </button>
      </div>
      <h2 style={{ color: 'var(--primary-color)', textAlign: 'center' }}>Tus Mantenimientos</h2>
      <div className="card" style={{ marginTop: '2rem', textAlign: 'center', padding: '3rem' }}>
        <h3 style={{ color: 'var(--text-muted)' }}>Módulo en Construcción</h3>
        <p style={{ marginTop: '1rem' }}>Próximamente: Tu jornada de hoy y lista de revisiones.</p>
      </div>
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button onClick={() => { localStorage.clear(); window.location.href = '/'; }} className="btn-danger" style={{ width: 'auto' }}>Cerrar Sesión</button>
      </div>
    </div>
  );
}

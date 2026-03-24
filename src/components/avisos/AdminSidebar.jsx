// Avisos — Admin Sidebar
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function AdminSidebar({ user }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? { fontWeight: 'bold', color: 'white' } : { opacity: 0.8, color: 'white' };

  const handleLogout = () => { localStorage.clear(); window.location.href = '/'; };
  const handleNav = (path) => { navigate(path); setIsMenuOpen(false); };

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
        <p className="link" onClick={() => handleNav('/admin')} style={isActive('/admin')}>Dashboard</p>
        <p className="link" onClick={() => handleNav('/admin/avisos')} style={isActive('/admin/avisos')}>Avisos</p>
        <p className="link" onClick={() => handleNav('/admin/clientes')} style={isActive('/admin/clientes')}>Clientes</p>
        {user?.rol === 'Direccion' && (
          <>
            <p className="link" onClick={() => handleNav('/admin/productividad')} style={isActive('/admin/productividad')}>Rendimiento Técnicos</p>
            <p className="link" onClick={() => handleNav('/admin/usuarios')} style={isActive('/admin/usuarios')}>Gestión Usuarios</p>
          </>
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

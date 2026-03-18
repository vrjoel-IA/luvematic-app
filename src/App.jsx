import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from './supabase';
import { LOGO_BASE64 } from './logo';
import './index.css';

import api from './api';

function Login({ setAuth }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        // --- REGISTRO ---
        // 1. Sign up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        // 2. Insert into the public Usuarios table for app logic
        if (authData.user) {
          const { error: insertError } = await supabase.from('Usuarios').insert([{
            id_usuario: authData.user.id,
            nombre_completo: nombreCompleto,
            email: email,
            rol: 'Usuario', // Default role until an admin approves them
            activo: true
          }]);

          if (insertError) {
            console.error("Error creating user profile:", insertError);
            throw new Error("LUVEMATIC: " + (insertError.message || insertError.details || JSON.stringify(insertError)));
          }
        }

        alert("Registro exitoso. Ahora puedes iniciar sesión.");
        setIsRegistering(false);
        setPassword('');

      } else {
        // --- LOGIN ---
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (authError) throw authError;

        // Fetch user profile to get roles
        const { data: userData, error: profileError } = await supabase
          .from('Usuarios')
          .select('*')
          .eq('id_usuario', authData.user.id)
          .single();

        if (profileError || !userData) {
          throw new Error('Perfil de usuario no encontrado.');
        }

        if (!userData.activo) {
          throw new Error('El usuario está inactivo.');
        }

        const userPayload = { id: userData.id_usuario, rol: userData.rol, nombre: userData.nombre_completo };
        localStorage.setItem('luvematic_user', JSON.stringify(userPayload));
        setAuth(userPayload);

        if (userData.rol === 'Administrador' || userData.rol === 'Direccion') {
          navigate('/admin');
        } else if (userData.rol === 'Tecnico') {
          navigate('/tecnico');
        } else {
          setError("Tu cuenta aún no tiene permisos asignados. Contacta al administrador.");
        }
      }
    } catch (err) {
      setError(err.message || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="login-card">
        <img src="/logo.png" alt="LUVEMATIC" className="logo" />
        <h2 style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          {isRegistering ? 'Crear Cuenta Nueva' : 'Gestión de Avisos'}
        </h2>

        {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleAuth}>
          {isRegistering && (
            <div className="input-group">
              <label>Nombre Completo</label>
              <input
                type="text"
                value={nombreCompleto}
                onChange={e => setNombreCompleto(e.target.value)}
                required={isRegistering}
                placeholder="Ej: Juan Pérez"
              />
            </div>
          )}

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
            />
          </div>

          <div className="input-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength="6"
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Procesando...' : (isRegistering ? 'Registrarse' : 'Iniciar Sesión')}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isRegistering ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?'}
          </p>
          <button
            type="button"
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            style={{ background: 'none', border: 'none', color: '#0A2342', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}>
            {isRegistering ? 'Inicia sesión aquí' : 'Regístrate aquí'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminSidebar({ user }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? { fontWeight: 'bold', color: 'white' } : { opacity: 0.8, color: 'white' };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  const handleNav = (path) => {
    navigate(path);
    setIsMenuOpen(false);
  };

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

        <div className="sidebar-footer">
          <p>{user?.nombre}</p>
          <button onClick={handleLogout} className="btn-danger">Cerrar Sesión</button>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ user }) {
  const [avisos, setAvisos] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null); // 'Nuevos', 'Asignados', 'En Progreso', 'Cerrados'
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAvisos = async () => {
      try {
        const { data, error } = await supabase
          .from('Avisos')
          .select('*, Usuarios:id_tecnico_asignado(nombre_completo)')
          .order('fecha_creacion', { ascending: false });

        if (error) throw error;
        setAvisos(data || []);
      } catch (err) { }
    };
    fetchAvisos();
  }, [navigate]);

  const kpis = {
    nuevos: avisos.filter(a => a.estado_aviso === 'Abierto').length,
    asignados: avisos.filter(a => a.estado_aviso === 'Asignado').length,
    enProgreso: avisos.filter(a => a.estado_aviso === 'En Progreso').length,
    cerrados: avisos.filter(a => a.estado_aviso === 'Cerrado').length,
  };

  const handleFilterClick = (filterName) => {
    setActiveFilter(activeFilter === filterName ? null : filterName);
  };

  const filteredAvisos = avisos.filter(a => {
    if (!activeFilter) return true;
    if (activeFilter === 'Nuevos') return a.estado_aviso === 'Abierto';
    if (activeFilter === 'Asignados') return a.estado_aviso === 'Asignado';
    if (activeFilter === 'En Progreso') return a.estado_aviso === 'En Progreso';
    if (activeFilter === 'Cerrados') return a.estado_aviso === 'Cerrado';
    return true;
  });

  return (
    <div className="dashboard-layout">
      <AdminSidebar user={user} />
      <div className="main-content">
        <div className="header">
          <h1>Panel de Control</h1>
          <button className="btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/admin/create-aviso')}>+ Crear Aviso</button>
        </div>

        <div className="kpi-grid">
          <div className={`kpi-card clickable ${activeFilter === 'Nuevos' ? 'active' : ''}`} onClick={() => handleFilterClick('Nuevos')}>
            <h3>{kpis.nuevos}</h3><p style={{ color: 'var(--text-muted)' }}>Nuevos Avisos</p>
          </div>
          <div className={`kpi-card clickable ${activeFilter === 'Asignados' ? 'active' : ''}`} onClick={() => handleFilterClick('Asignados')}>
            <h3>{kpis.asignados}</h3><p style={{ color: 'var(--text-muted)' }}>Asignados</p>
          </div>
          <div className={`kpi-card clickable ${activeFilter === 'En Progreso' ? 'active' : ''}`} onClick={() => handleFilterClick('En Progreso')}>
            <h3>{kpis.enProgreso}</h3><p style={{ color: 'var(--text-muted)' }}>En Progreso</p>
          </div>
          <div className={`kpi-card clickable ${activeFilter === 'Cerrados' ? 'active' : ''}`} onClick={() => handleFilterClick('Cerrados')}>
            <h3>{kpis.cerrados}</h3><p style={{ color: 'var(--text-muted)' }}>Cerrados</p>
          </div>
        </div>

        <h3>{activeFilter ? `Avisos Registrados - Filtro: ${activeFilter}` : 'Actividad Reciente de Avisos'}</h3>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Dirección</th>
                <th>Técnico</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredAvisos.slice(0, activeFilter ? undefined : 10).map(a => (
                <tr key={a.id_aviso}>
                  <td>#{a.id_aviso}</td>
                  <td>{a.nombre_cliente}</td>
                  <td>{a.direccion_cliente}</td>
                  <td>{a.Usuarios?.nombre_completo || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin asignar</span>}</td>
                  <td>
                    <span className={`pill ${a.estado_aviso.toLowerCase().replace(' ', '-')}`}>
                      {a.estado_aviso}
                    </span>
                  </td>
                  <td><span className="link" onClick={() => navigate(`/admin/aviso/${a.id_aviso}`, { state: { aviso: a } })}>Ver Detalle</span></td>
                </tr>
              ))}
              {filteredAvisos.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center' }}>No hay avisos registrados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminAvisos({ user }) {
  const [avisos, setAvisos] = useState([]);
  const location = useLocation();
  const [search, setSearch] = useState(location.state?.preSearch || '');
  const [statusFilter, setStatusFilter] = useState('Todos'); // Todos, Abiertos/Pendientes, Cerrados
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAvisos = async () => {
      try {
        const { data, error } = await supabase
          .from('Avisos')
          .select('*, Usuarios:id_tecnico_asignado(nombre_completo)')
          .order('fecha_creacion', { ascending: false });
        if (error) throw error;
        setAvisos(data || []);
      } catch (err) { }
    };
    fetchAvisos();
  }, [navigate]);

  const filtered = avisos.filter(a => {
    const matchesSearch = a.nombre_cliente.toLowerCase().includes(search.toLowerCase()) ||
      a.direccion_cliente.toLowerCase().includes(search.toLowerCase()) ||
      a.id_aviso.toString().includes(search);

    let matchesStatus = true;
    if (statusFilter === 'Abiertos/Pendientes') {
      matchesStatus = a.estado_aviso !== 'Cerrado';
    } else if (statusFilter === 'Cerrados') {
      matchesStatus = a.estado_aviso === 'Cerrado';
    }

    return matchesSearch && matchesStatus;
  });

  const exportMonthlyPDF = () => {
    const doc = new jsPDF();
    // Header bar
    doc.setFillColor(10, 35, 66);
    doc.rect(0, 0, 210, 32, 'F');
    try { doc.addImage(LOGO_BASE64, 'PNG', 10, 4, 40, 24); } catch (e) { }
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('Reporte Mensual de Avisos', 60, 18);
    doc.setTextColor(0, 0, 0);

    const now = new Date();
    const mesNombre = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    doc.setFontSize(11);
    doc.text(`Período: ${mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)}`, 14, 42);
    doc.text(`Fecha de generación: ${now.toLocaleDateString('es-ES')}`, 14, 48);

    const currentMonthAvisos = filtered.filter(a => {
      const date = new Date(a.fecha_creacion);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    const tableColumn = ["ID", "Cliente", "Dirección", "Técnico", "Estado", "Fecha"];
    const tableRows = currentMonthAvisos.map(aviso => ([
      aviso.id_aviso,
      aviso.nombre_cliente,
      aviso.direccion_cliente,
      aviso.Usuarios?.nombre_completo || 'Sin asignar',
      aviso.estado_aviso,
      new Date(aviso.fecha_creacion).toLocaleDateString('es-ES')
    ]));

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 55,
      headStyles: { fillColor: [10, 35, 66], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 247, 255] },
      styles: { fontSize: 9, cellPadding: 4 },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(10, 35, 66);
      doc.rect(0, 285, 210, 12, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('LUVEMATIC © ' + now.getFullYear() + ' — Documento generado automáticamente', 14, 291);
      doc.text(`Página ${i} de ${pageCount}`, 180, 291);
      doc.setTextColor(0, 0, 0);
    }

    doc.save('Reporte_Mensual_Avisos.pdf');
  }

  return (
    <div className="dashboard-layout">
      <AdminSidebar user={user} />
      <div className="main-content">
        <div className="header">
          <h1>Directorio de Avisos</h1>
          <button className="btn-primary" style={{ width: 'auto', backgroundColor: '#dc3545' }} onClick={exportMonthlyPDF}>Exportar Avisos del Mes a PDF</button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input
              type="text"
              placeholder="Buscar por cliente, dirección o ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '0.5rem', width: '300px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="Todos">Todos los Estados</option>
              <option value="Abiertos/Pendientes">Abiertos y Pendientes</option>
              <option value="Cerrados">Cerrados</option>
            </select>
          </div>
          <button className="btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/admin/create-aviso')}>+ Crear Aviso</button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Dirección</th>
                <th>Técnico</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id_aviso}>
                  <td>#{a.id_aviso}</td>
                  <td>{a.nombre_cliente}</td>
                  <td>{a.direccion_cliente}</td>
                  <td>{a.Usuarios?.nombre_completo || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin asignar</span>}</td>
                  <td>
                    <span className={`pill ${a.estado_aviso.toLowerCase().replace(' ', '-')}`}>
                      {a.estado_aviso}
                    </span>
                  </td>
                  <td><span className="link" onClick={() => navigate(`/admin/aviso/${a.id_aviso}`, { state: { aviso: a } })}>Ver Detalle</span></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center' }}>No se encontraron resultados</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Mobile FAB */}
        <button className="btn-primary fab-button" onClick={() => navigate('/admin/create-aviso')} style={{ display: window.innerWidth <= 768 ? 'flex' : 'none' }}>
          +
        </button>
      </div>
    </div>
  );
}

function AdminClientes({ user }) {
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const { data: avisos, error } = await supabase.from('Avisos').select('*');
        if (error) throw error;

        // Group conceptually as SQL query did
        const clientMap = {};
        avisos.forEach(a => {
          const key = `${a.nombre_cliente}|${a.direccion_cliente}`;
          if (!clientMap[key]) {
            clientMap[key] = {
              nombre_cliente: a.nombre_cliente,
              direccion_cliente: a.direccion_cliente,
              telefono_cliente: a.telefono_cliente,
              total_avisos: 0,
              ultimo_aviso: a.fecha_creacion
            }
          }
          clientMap[key].total_avisos += 1;
          if (new Date(a.fecha_creacion) > new Date(clientMap[key].ultimo_aviso)) {
            clientMap[key].ultimo_aviso = a.fecha_creacion;
          }
        });
        setClientes(Object.values(clientMap).sort((a, b) => new Date(b.ultimo_aviso) - new Date(a.ultimo_aviso)));
      } catch (err) { }
    };
    fetchClientes();
  }, []);

  const filtered = clientes.filter(c =>
    c.nombre_cliente.toLowerCase().includes(search.toLowerCase()) ||
    c.direccion_cliente.toLowerCase().includes(search.toLowerCase())
  );

  const exportClientPDF = async (cliente) => {
    try {
      const { data: historial, error } = await supabase
        .from('Avisos')
        .select('*')
        .eq('nombre_cliente', cliente.nombre_cliente)
        .eq('direccion_cliente', cliente.direccion_cliente)
        .order('fecha_creacion', { ascending: false })
        .limit(5);

      if (error) throw error;

      const doc = new jsPDF();
      const now = new Date();
      // Header bar
      doc.setFillColor(10, 35, 66);
      doc.rect(0, 0, 210, 32, 'F');
      try { doc.addImage(LOGO_BASE64, 'PNG', 10, 4, 40, 24); } catch (e) { }
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('Historial de Cliente', 60, 18);
      doc.setTextColor(0, 0, 0);

      doc.setFontSize(11);
      doc.text(`Cliente: ${cliente.nombre_cliente}`, 14, 42);
      doc.text(`Dirección: ${cliente.direccion_cliente}`, 14, 48);
      doc.text(`Teléfono: ${cliente.telefono_cliente || 'N/A'}`, 14, 54);
      doc.text(`Fecha de generación: ${now.toLocaleDateString('es-ES')}`, 14, 60);

      const tableColumn = ["ID", "Fecha", "Tipo Puerta", "Fallo", "Estado"];
      const tableRows = historial.map(h => ([
        h.id_aviso,
        new Date(h.fecha_resolucion || h.fecha_creacion || Date.now()).toLocaleDateString('es-ES'),
        h.tipo_puerta || '-',
        h.descripcion_problema,
        h.estado_aviso
      ]));

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 68,
        headStyles: { fillColor: [10, 35, 66], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 247, 255] },
        styles: { fontSize: 9, cellPadding: 4 },
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(10, 35, 66);
        doc.rect(0, 285, 210, 12, 'F');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text('LUVEMATIC © ' + now.getFullYear() + ' — Documento generado automáticamente', 14, 291);
        doc.text(`Página ${i} de ${pageCount}`, 180, 291);
        doc.setTextColor(0, 0, 0);
      }

      doc.save(`Historial_${cliente.nombre_cliente.replace(/\s+/g, '_')}.pdf`);

    } catch (err) {
      alert('Error al generar PDF del cliente');
    }
  }

  return (
    <div className="dashboard-layout">
      <AdminSidebar user={user} />
      <div className="main-content">
        <div className="header">
          <h1>Directorio de Clientes</h1>
          <input
            type="text"
            placeholder="Buscar por cliente o dirección..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '0.5rem', width: '300px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Dirección</th>
                <th>Teléfono</th>
                <th>Total Avisos</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => (
                <tr key={idx} onClick={() => navigate('/admin/avisos', { state: { preSearch: c.nombre_cliente } })} style={{ cursor: 'pointer' }} className="hover-bg">
                  <td>{c.nombre_cliente}</td>
                  <td>{c.direccion_cliente}</td>
                  <td>{c.telefono_cliente}</td>
                  <td>{c.total_avisos}</td>
                  <td><span className="link" onClick={(e) => { e.stopPropagation(); exportClientPDF(c); }}>Exportar Historial (PDF)</span></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center' }}>No se encontraron resultados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminProductividad({ user }) {
  const [stats, setStats] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: cerrados, error } = await supabase
          .from('Avisos')
          .select('fecha_resolucion, Usuarios:id_tecnico_asignado(nombre_completo)')
          .eq('estado_aviso', 'Cerrado')
          .not('fecha_resolucion', 'is', null);

        if (error) throw error;

        // Group into stats array format
        const statsMap = {};
        cerrados.forEach(c => {
          const dateStr = new Date(c.fecha_resolucion).toLocaleDateString();
          const techName = c.Usuarios?.nombre_completo || 'Unknown';
          const key = `${dateStr}_${techName}`;
          if (!statsMap[key]) {
            statsMap[key] = { fecha: c.fecha_resolucion, dateStr, tecnico: techName, total_cerrados: 0 };
          }
          statsMap[key].total_cerrados += 1;
        });

        const sortedStats = Object.values(statsMap).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        setStats(sortedStats);
      } catch (e) { }
    };
    fetchStats();
  }, []);

  return (
    <div className="dashboard-layout">
      <AdminSidebar user={user} />
      <div className="main-content">
        <div className="header">
          <h1>Rendimiento de Técnicos (Avisos Cerrados)</h1>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha de Resolución</th>
                <th>Técnico</th>
                <th>Avisos Cerrados</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, idx) => (
                <tr key={idx}>
                  <td>{new Date(s.fecha).toLocaleDateString()}</td>
                  <td>{s.tecnico}</td>
                  <td>{s.total_cerrados}</td>
                </tr>
              ))}
              {stats.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center' }}>No hay cierres registrados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminUsuarios({ user }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUsuarios = async () => {
    try {
      const { data, error } = await supabase.from('Usuarios').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error("Error fetching usuarios:", error);
        throw error;
      }
      setUsuarios(data || []);
    } catch (err) { }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const changeRole = async (id, newRole) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('Usuarios').update({ rol: newRole }).eq('id_usuario', id);
      if (error) throw error;
      await fetchUsuarios();
    } catch (err) {
      alert('Error updating role: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="dashboard-layout">
      <AdminSidebar user={user} />
      <div className="main-content">
        <div className="header">
          <h1>Gestión de Usuarios</h1>
        </div>

        <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
          Aquí puedes ver a todas las personas registradas en el sistema y cambiarles su rol.
          Asigna el rol de <strong>Técnico</strong> a los trabajadores para que puedan recibir avisos.
        </p>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email / Usuario</th>
                <th>Rol Actual</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario}>
                  <td>{u.id_usuario}</td>
                  <td>{u.nombre_completo}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="pill" style={{ backgroundColor: u.rol === 'Administrador' ? '#f8d7da' : u.rol === 'Direccion' ? '#d4edda' : u.rol === 'Tecnico' ? '#cce5ff' : '#e2e3e5', color: 'black' }}>
                      {u.rol || 'Usuario'}
                    </span>
                  </td>
                  <td>
                    <select
                      value={u.rol || 'Usuario'}
                      onChange={(e) => changeRole(u.id_usuario, e.target.value)}
                      disabled={loading || u.id_usuario === user.id}
                      style={{ padding: '0.25rem' }}
                    >
                      <option value="Usuario">Usuario (Sin acceso)</option>
                      <option value="Tecnico">Técnico</option>
                      <option value="Administrador">Administrador</option>
                      <option value="Direccion">Dirección</option>
                    </select>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center' }}>No hay usuarios en el sistema</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CreateAviso({ user }) {
  const [form, setForm] = useState({ nombre_cliente: '', direccion_cliente: '', telefono_cliente: '', tipo_puerta: 'Seccional', descripcion_problema: '', observaciones_iniciales: '', id_tecnico_asignado: '' });
  const [tecnicos, setTecnicos] = useState([]);
  const [sugerencias, setSugerencias] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('Usuarios').select('*').eq('rol', 'Tecnico')
      .then(({ data }) => setTecnicos(data || []))
      .catch(err => { });
  }, []);

  // Autocomplete fetch
  useEffect(() => {
    if (form.nombre_cliente.length > 2 || form.direccion_cliente.length > 2) {
      const searchParam = form.nombre_cliente || form.direccion_cliente;
      supabase.from('Avisos')
        .select('nombre_cliente, direccion_cliente, telefono_cliente, tipo_puerta')
        .or(`nombre_cliente.ilike.%${searchParam}%,direccion_cliente.ilike.%${searchParam}%`)
        .limit(10)
        .then(({ data }) => {
          // Deduplicate
          const unique = [];
          const ids = new Set();
          (data || []).forEach(d => {
            const k = d.nombre_cliente + d.direccion_cliente;
            if (!ids.has(k)) {
              ids.add(k);
              unique.push(d);
            }
          });
          setSugerencias(unique);
        })
        .catch(err => { });
    } else {
      setSugerencias([]);
    }
  }, [form.nombre_cliente, form.direccion_cliente]);

  const selectSugerencia = (s) => {
    setForm({
      ...form,
      nombre_cliente: s.nombre_cliente,
      direccion_cliente: s.direccion_cliente,
      telefono_cliente: s.telefono_cliente || '',
      tipo_puerta: s.tipo_puerta || 'Seccional'
    });
    setSugerencias([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const insertData = {
        nombre_cliente: form.nombre_cliente,
        direccion_cliente: form.direccion_cliente,
        telefono_cliente: form.telefono_cliente,
        tipo_puerta: form.tipo_puerta,
        descripcion_problema: form.descripcion_problema,
        observaciones_iniciales: form.observaciones_iniciales,
        id_usuario_creador: user.id,
        estado_aviso: form.id_tecnico_asignado ? 'Asignado' : 'Abierto'
      };

      if (form.id_tecnico_asignado) {
        insertData.id_tecnico_asignado = form.id_tecnico_asignado;
        insertData.fecha_asignacion = new Date().toISOString();
      }

      await supabase.from('Avisos').insert([insertData]);
      navigate('/admin/avisos');
    } catch (err) {
      alert("Error al crear el aviso");
    }
  };

  return (
    <div className="dashboard-layout">
      <AdminSidebar user={user} />
      <div className="main-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1>Crear Nuevo Aviso de Avería</h1>
        <div className="card">
          <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
            <div className="input-group">
              <label>Cliente</label>
              <input type="text" value={form.nombre_cliente} onChange={e => setForm({ ...form, nombre_cliente: e.target.value, showSug: true })} required />
            </div>
            <div className="input-group">
              <label>Dirección</label>
              <input type="text" value={form.direccion_cliente} onChange={e => setForm({ ...form, direccion_cliente: e.target.value, showSug: true })} required />
            </div>

            {sugerencias.length > 0 && form.showSug && (
              <div style={{ position: 'absolute', top: '140px', left: 0, right: 0, background: 'white', border: '1px solid #ccc', borderRadius: '4px', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '5px 10px', background: '#f8f9fa', borderBottom: '1px solid #eee', fontSize: '0.8rem', fontWeight: 'bold' }}>Sugerencias de Clientes Anteriores:</div>
                {sugerencias.map((s, idx) => (
                  <div key={idx} onClick={() => selectSugerencia(s)} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }} className="hover-bg">
                    <strong>{s.nombre_cliente}</strong> - {s.direccion_cliente}
                  </div>
                ))}
              </div>
            )}

            <div className="input-group">
              <label>Teléfono</label>
              <input type="text" value={form.telefono_cliente} onChange={e => setForm({ ...form, telefono_cliente: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Tipo de Puerta</label>
              <select value={form.tipo_puerta} onChange={e => setForm({ ...form, tipo_puerta: e.target.value })}>
                <option value="Seccional">Seccional</option>
                <option value="Enrollable">Enrollable</option>
                <option value="Corredera">Corredera</option>
                <option value="Basculante">Basculante</option>
                <option value="Puerta de cristal">Puerta de cristal</option>
                <option value="Puerta de guillotina">Puerta de guillotina</option>
                <option value="Telescópica">Telescópica</option>
                <option value="Peatonal">Peatonal</option>
              </select>
            </div>
            <div className="input-group">
              <label>Técnico a Asignar (Opcional)</label>
              <select value={form.id_tecnico_asignado} onChange={e => setForm({ ...form, id_tecnico_asignado: e.target.value })}>
                <option value="">-- Dejar sin asignar inicialmente --</option>
                {tecnicos.map(t => <option key={t.id_usuario} value={t.id_usuario}>{t.nombre_completo}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Descripción del Problema</label>
              <textarea rows="4" value={form.descripcion_problema} onChange={e => setForm({ ...form, descripcion_problema: e.target.value })} required></textarea>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => navigate('/admin/avisos')} className="btn-primary" style={{ backgroundColor: '#6c757d', width: 'auto' }}>Cancelar</button>
              <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Guardar Aviso</button>
            </div>
          </form>
        </div>
        <style>{`.hover-bg:hover { background-color: #f1f3f5; }`}</style>
      </div>
    </div>
  );
}

function AvisoDetailAdmin({ user }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();

  // Fallback if accessed directly
  const [aviso, setAviso] = useState(state?.aviso || null);
  const [tecnicos, setTecnicos] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  const [form, setForm] = useState({
    estado_aviso: '',
    id_tecnico_asignado: '',
    observaciones_cierre: ''
  });

  useEffect(() => {
    if (aviso) {
      setForm({
        estado_aviso: aviso.estado_aviso,
        id_tecnico_asignado: aviso.id_tecnico_asignado || '',
        observaciones_cierre: aviso.observaciones_cierre || ''
      });
      setEditForm({
        nombre_cliente: aviso.nombre_cliente,
        direccion_cliente: aviso.direccion_cliente,
        telefono_cliente: aviso.telefono_cliente || '',
        tipo_puerta: aviso.tipo_puerta,
        descripcion_problema: aviso.descripcion_problema
      });
    }
  }, [aviso]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: tecnicosData } = await supabase.from('Usuarios').select('*').eq('rol', 'Tecnico');
        setTecnicos(tecnicosData || []);

        const { data: fotosData } = await supabase.from('Fotos_Avisos').select('*').eq('id_aviso', id);
        setFotos(fotosData || []);

        if (!aviso) {
          const { data: currentAviso } = await supabase.from('Avisos').select('*').eq('id_aviso', id).single();
          setAviso(currentAviso);
        }
      } catch (err) { }
    };
    fetchData();
  }, [id, aviso]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        estado_aviso: form.estado_aviso,
        id_tecnico_asignado: form.id_tecnico_asignado || null,
        observaciones_cierre: form.observaciones_cierre || null
      };

      if (form.estado_aviso === 'Cerrado') {
        updateData.fecha_resolucion = new Date().toISOString();
      }

      const { error } = await supabase.from('Avisos').update(updateData).eq('id_aviso', id);
      if (error) throw error;
      alert('Aviso actualizado');
      navigate('/admin/avisos');
    } catch (err) {
      alert('Error al actualizar aviso');
    }
  }

  const handleTechChange = (techId) => {
    let newStatus = form.estado_aviso;
    if (techId && form.estado_aviso === 'Abierto') {
      newStatus = 'Asignado'; // Auto-change to Assigned when tech is selected
    }
    setForm({ ...form, id_tecnico_asignado: techId, estado_aviso: newStatus });
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel edit - reset form
      setEditForm({
        nombre_cliente: aviso.nombre_cliente,
        direccion_cliente: aviso.direccion_cliente,
        telefono_cliente: aviso.telefono_cliente || '',
        tipo_puerta: aviso.tipo_puerta,
        descripcion_problema: aviso.descripcion_problema
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSaveDetails = async () => {
    try {
      const { error } = await supabase.from('Avisos').update(editForm).eq('id_aviso', id);
      if (error) throw error;

      setAviso({ ...aviso, ...editForm });
      setIsEditing(false);
      alert('Detalles del aviso actualizados guardados');
    } catch (err) {
      alert('Error al guardar los detalles del aviso');
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    // Header bar
    doc.setFillColor(10, 35, 66);
    doc.rect(0, 0, 210, 32, 'F');
    try { doc.addImage(LOGO_BASE64, 'PNG', 10, 4, 40, 24); } catch (e) { }
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(`Detalle de Aviso #${aviso.id_aviso}`, 60, 18);
    doc.setTextColor(0, 0, 0);

    // Client info card
    doc.setFillColor(240, 247, 255);
    doc.roundedRect(10, 38, 190, 36, 3, 3, 'F');
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Información del Cliente', 14, 46);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`Nombre: ${aviso.nombre_cliente}`, 14, 54);
    doc.text(`Dirección: ${aviso.direccion_cliente}`, 14, 60);
    doc.text(`Teléfono: ${aviso.telefono_cliente || 'N/A'}`, 110, 54);
    doc.text(`Tipo de Puerta: ${aviso.tipo_puerta}`, 110, 60);
    doc.text(`Fecha creación: ${new Date(aviso.fecha_creacion).toLocaleDateString('es-ES')}`, 14, 68);

    // Status card
    doc.setFillColor(240, 247, 255);
    doc.roundedRect(10, 80, 190, 18, 3, 3, 'F');
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Estado y Asignación', 14, 88);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`Estado: ${aviso.estado_aviso}`, 14, 94);
    const asignadoNombre = tecnicos.find(t => t.id_usuario === aviso.id_tecnico_asignado)?.nombre_completo || 'Sin asignar';
    doc.text(`Técnico Asignado: ${asignadoNombre}`, 110, 94);

    // Problem description
    let currentY = 108;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(10, 35, 66);
    doc.text('Descripción del Problema:', 14, currentY);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const splitProblema = doc.splitTextToSize(aviso.descripcion_problema, 180);
    doc.text(splitProblema, 14, currentY + 8);
    currentY = currentY + 8 + (splitProblema.length * 5) + 8;

    // Observations
    if (aviso.observaciones_cierre) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(10, 35, 66);
      doc.text('Observaciones de Cierre:', 14, currentY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      const splitCierre = doc.splitTextToSize(aviso.observaciones_cierre, 180);
      doc.text(splitCierre, 14, currentY + 8);
    }

    // Footer
    doc.setFillColor(10, 35, 66);
    doc.rect(0, 285, 210, 12, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('LUVEMATIC © ' + now.getFullYear() + ' — Documento generado automáticamente', 14, 291);
    doc.text('Página 1 de 1', 180, 291);
    doc.setTextColor(0, 0, 0);

    doc.save(`Aviso_${aviso.id_aviso}_${aviso.nombre_cliente.replace(/\s+/g, '_')}.pdf`);
  };

  if (!aviso) return <div className="dashboard-layout"><AdminSidebar user={user} /><div className="main-content">Cargando...</div></div>;

  return (
    <div className="dashboard-layout">
      <AdminSidebar user={user} />
      <div className="main-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ margin: 0 }}>Detalle de Aviso #{aviso.id_aviso}</h1>
            <span className={`pill ${aviso.estado_aviso.toLowerCase().replace(' ', '-')}`}>
              {aviso.estado_aviso}
            </span>
          </div>
          <button className="btn-primary" style={{ width: 'auto', backgroundColor: '#dc3545' }} onClick={exportToPDF}>Guardar PDF</button>
        </div>

        <div className="detail-grid">
          <div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Información del Cliente</h3>
                {aviso.estado_aviso !== 'Cerrado' && !isEditing && (
                  <button onClick={handleEditToggle} className="btn-primary" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>Editar Datos</button>
                )}
              </div>

              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Nombre:</label>
                    <input type="text" value={editForm.nombre_cliente} onChange={e => setEditForm({ ...editForm, nombre_cliente: e.target.value })} />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Dirección:</label>
                    <input type="text" value={editForm.direccion_cliente} onChange={e => setEditForm({ ...editForm, direccion_cliente: e.target.value })} />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Teléfono:</label>
                    <input type="text" value={editForm.telefono_cliente} onChange={e => setEditForm({ ...editForm, telefono_cliente: e.target.value })} />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Puerta:</label>
                    <select value={editForm.tipo_puerta} onChange={e => setEditForm({ ...editForm, tipo_puerta: e.target.value })}>
                      <option value="Seccional">Seccional</option>
                      <option value="Enrollable">Enrollable</option>
                      <option value="Corredera">Corredera</option>
                      <option value="Basculante">Basculante</option>
                      <option value="Puerta de cristal">Puerta de cristal</option>
                      <option value="Puerta de guillotina">Puerta de guillotina</option>
                      <option value="Telescópica">Telescópica</option>
                      <option value="Peatonal">Peatonal</option>
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <p><strong>Nombre:</strong> {aviso.nombre_cliente}</p>
                  <p><strong>Dirección:</strong> {aviso.direccion_cliente}</p>
                  <p><strong>Teléfono:</strong> {aviso.telefono_cliente}</p>
                  <p><strong>Puerta:</strong> {aviso.tipo_puerta}</p>
                </>
              )}
            </div>

            <div className="card">
              <h3>Descripción del Problema</h3>
              {isEditing ? (
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <textarea rows="4" value={editForm.descripcion_problema} onChange={e => setEditForm({ ...editForm, descripcion_problema: e.target.value })}></textarea>
                </div>
              ) : (
                <p>{aviso.descripcion_problema}</p>
              )}
            </div>

            {isEditing && (
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <button onClick={handleEditToggle} className="btn-primary" style={{ backgroundColor: '#6c757d', width: 'auto' }}>Cancelar</button>
                <button onClick={handleSaveDetails} className="btn-primary" style={{ width: 'auto', backgroundColor: 'var(--accent-green)' }}>Guardar Cambios</button>
              </div>
            )}
            {fotos.length > 0 && (
              <div className="card">
                <h3>Fotos del Trabajo</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {fotos.map(f => (
                    <div key={f.id_foto} style={{ border: '1px solid #ccc', padding: '5px', borderRadius: '4px', background: '#f8f9fa' }}>
                      <a href={f.url_foto} target="_blank" rel="noreferrer" className="link">Ver Foto</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <div className="card">
              <h3>Gestión del Aviso</h3>
              <form onSubmit={handleUpdate}>
                <div className="input-group">
                  <label>Estado del Aviso</label>
                  <select value={form.estado_aviso} onChange={e => setForm({ ...form, estado_aviso: e.target.value })}>
                    <option value="Abierto">Abierto</option>
                    <option value="Asignado">Asignado</option>
                    <option value="En Progreso">En Progreso</option>
                    <option value="Cerrado">Cerrado</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Técnico Asignado</label>
                  <select value={form.id_tecnico_asignado} onChange={e => handleTechChange(e.target.value)}>
                    <option value="">-- Sin Asignar --</option>
                    {tecnicos.map(t => <option key={t.id_usuario} value={t.id_usuario}>{t.nombre_completo}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Observaciones de Cierre / Internas</label>
                  <textarea rows="4" value={form.observaciones_cierre} onChange={e => setForm({ ...form, observaciones_cierre: e.target.value })}></textarea>
                </div>
                <button type="submit" className="btn-primary">Guardar Cambios</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TechDashboard({ user }) {
  const [avisos, setAvisos] = useState([]);
  const [viewAll, setViewAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Activos'); // Activos o Cerrados
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAvisos = async () => {
      try {
        let query = supabase.from('Avisos').select('*, Usuarios:id_tecnico_asignado(nombre_completo)').order('fecha_creacion', { ascending: false });

        if (!viewAll) {
          query = query.eq('id_tecnico_asignado', user.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setAvisos(data || []);
      } catch (err) { }
    };
    fetchAvisos();
  }, [navigate, viewAll]);

  // Apply status filter locally
  const filtered = avisos.filter(a => {
    if (statusFilter === 'Activos') return a.estado_aviso !== 'Cerrado';
    if (statusFilter === 'Cerrados') return a.estado_aviso === 'Cerrado';
    return true;
  });

  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <img src="/logo.png" style={{ height: '40px', background: 'white', padding: '5px', borderRadius: '4px' }} alt="LUVEMATIC" />
        <button onClick={() => { localStorage.clear(); window.location.href = '/'; }} className="btn-danger">Salir</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Tareas</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setViewAll(false)} className="btn-primary" style={{ width: 'auto', padding: '0.5rem', opacity: viewAll ? 0.5 : 1 }}>Mis Tareas</button>
            <button onClick={() => setViewAll(true)} className="btn-primary" style={{ width: 'auto', padding: '0.5rem', opacity: !viewAll ? 0.5 : 1 }}>Ver Todas</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setStatusFilter('Activos')} className="btn-primary" style={{ width: 'auto', padding: '0.4rem', fontSize: '0.8rem', backgroundColor: statusFilter === 'Activos' ? '#0A2342' : '#6c757d' }}>Solo Activos</button>
          <button onClick={() => setStatusFilter('Cerrados')} className="btn-primary" style={{ width: 'auto', padding: '0.4rem', fontSize: '0.8rem', backgroundColor: statusFilter === 'Cerrados' ? '#0A2342' : '#6c757d' }}>Solo Cerrados</button>
        </div>
      </div>

      {filtered.length === 0 ? <p>No hay avisos disponibles para los filtros seleccionados.</p> : null}
      {filtered.map(a => (
        <div key={a.id_aviso} className="card" onClick={() => navigate(`/tecnico/aviso/${a.id_aviso}`, { state: { aviso: a } })} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>#{a.id_aviso} - {a.nombre_cliente}</strong>
            <span className={`pill ${a.estado_aviso.toLowerCase().replace(' ', '-')}`}>{a.estado_aviso}</span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{a.direccion_cliente}</p>
          <p style={{ marginTop: '0.5rem' }}>{a.descripcion_problema}</p>
        </div>
      ))}
    </div>
  );
}

function TechAvisoDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();

  const [aviso, setAviso] = useState(state?.aviso || null);
  const [obsCierre, setObsCierre] = useState(aviso?.observaciones_cierre || '');
  const [fotos, setFotos] = useState(null);

  useEffect(() => {
    if (!aviso) {
      supabase.from('Avisos').select('*').eq('id_aviso', id).single().then(({ data }) => {
        setAviso(data);
        setObsCierre(data?.observaciones_cierre || '');
      });
    }
  }, [id, aviso]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('Avisos').update({
        estado_aviso: 'Cerrado',
        observaciones_cierre: obsCierre,
        fecha_resolucion: new Date().toISOString()
      }).eq('id_aviso', id);

      if (error) throw error;

      if (fotos && fotos.length > 0) {
        for (let i = 0; i < fotos.length; i++) {
          const file = fotos[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${id}_${Date.now()}_${i}.${fileExt}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avisos-fotos')
            .upload(fileName, file);

          if (!uploadError) {
            const { data: publicURLData } = supabase.storage
              .from('avisos-fotos')
              .getPublicUrl(fileName);

            if (publicURLData && publicURLData.publicUrl) {
              await supabase.from('Fotos_Avisos').insert([{
                id_aviso: id,
                url_foto: publicURLData.publicUrl
              }]);
            }
          }
        }
      }

      alert('Aviso cerrado exitosamente');
      navigate('/tecnico');
    } catch (err) {
      alert('Error al cerrar aviso');
    }
  }

  if (!aviso) return <div style={{ padding: '1rem' }}>Cargando...</div>;

  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <button onClick={() => navigate('/tecnico')} style={{ marginBottom: '1rem', width: 'auto' }} className="btn-primary">← Volver a Tareas</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Aviso #{aviso.id_aviso}</h1>
        <span className={`pill ${aviso.estado_aviso.toLowerCase().replace(' ', '-')}`}>
          {aviso.estado_aviso}
        </span>
      </div>

      <div className="card">
        <h3>Detalles del Cliente</h3>
        <p><strong>{aviso.nombre_cliente}</strong></p>
        <p>{aviso.direccion_cliente}</p>
        <p>{aviso.telefono_cliente}</p>
        <p><strong>Puerta:</strong> {aviso.tipo_puerta}</p>
        <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
        <p><strong>Fallo reportado:</strong> {aviso.descripcion_problema}</p>
      </div>

      <div className="card">
        <form onSubmit={handleUpdate}>
          <div className="input-group">
            <label>Observaciones de la Reparación (Para Cerrar)</label>
            <textarea rows="4" placeholder="Describe el trabajo realizado..." value={obsCierre} onChange={e => setObsCierre(e.target.value)} required></textarea>
          </div>
          {aviso.estado_aviso !== 'Cerrado' ? (
            <>
              <div className="input-group">
                <label>Adjuntar Fotos (opcional)</label>
                <input type="file" multiple accept="image/*" onChange={e => setFotos(e.target.files)} />
              </div>
              <button type="submit" className="btn-primary">Finalizar, Subir Fotos y Cerrar</button>
            </>
          ) : (
            <p style={{ color: 'green', fontWeight: 'bold' }}>Este aviso ya está cerrado.</p>
          )}
        </form>
      </div>
    </div>
  )
}

function PendingApproval({ setAuth }) {
  return (
    <div className="auth-container">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <img src="/logo.png" alt="LUVEMATIC" className="logo" />
        <h2 style={{ color: 'var(--text-muted)' }}>Cuenta en Revisión</h2>
        <p style={{ marginTop: '1rem', marginBottom: '2rem' }}>
          Tu cuenta ha sido creada exitosamente, pero aún no tiene permisos asignados (Técnico, Administrador o Dirección).
          Por favor, espera a que un administrador valide tu acceso.
        </p>
        <button onClick={() => {
          localStorage.clear();
          setAuth(null);
        }} className="btn-primary">
          Cerrar Sesión / Volver a inicio
        </button>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('luvematic_user')));

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          user ? (
            (user.rol === 'Administrador' || user.rol === 'Direccion') ? <Navigate to="/admin" /> :
              user.rol === 'Tecnico' ? <Navigate to="/tecnico" /> :
                <Navigate to="/espera" />
          ) : <Login setAuth={setUser} />
        } />

        <Route path="/espera" element={user && user.rol === 'Usuario' ? <PendingApproval setAuth={setUser} /> : <Navigate to="/" />} />

        {/* Admin & Direccion Shared Routes */}
        <Route path="/admin" element={(user?.rol === 'Administrador' || user?.rol === 'Direccion') ? <AdminDashboard user={user} /> : <Navigate to="/" />} />
        <Route path="/admin/avisos" element={(user?.rol === 'Administrador' || user?.rol === 'Direccion') ? <AdminAvisos user={user} /> : <Navigate to="/" />} />
        <Route path="/admin/clientes" element={(user?.rol === 'Administrador' || user?.rol === 'Direccion') ? <AdminClientes user={user} /> : <Navigate to="/" />} />
        <Route path="/admin/create-aviso" element={(user?.rol === 'Administrador' || user?.rol === 'Direccion') ? <CreateAviso user={user} /> : <Navigate to="/" />} />
        <Route path="/admin/aviso/:id" element={(user?.rol === 'Administrador' || user?.rol === 'Direccion') ? <AvisoDetailAdmin user={user} /> : <Navigate to="/" />} />

        {/* Direccion Only Routes */}
        <Route path="/admin/productividad" element={user?.rol === 'Direccion' ? <AdminProductividad user={user} /> : <Navigate to="/" />} />
        <Route path="/admin/usuarios" element={user?.rol === 'Direccion' ? <AdminUsuarios user={user} /> : <Navigate to="/" />} />

        {/* Tech Routes */}
        <Route path="/tecnico" element={user?.rol === 'Tecnico' ? <TechDashboard user={user} /> : <Navigate to="/" />} />
        <Route path="/tecnico/aviso/:id" element={user?.rol === 'Tecnico' ? <TechAvisoDetail /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

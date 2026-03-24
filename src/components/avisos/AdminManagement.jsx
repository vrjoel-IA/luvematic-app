// Avisos — AdminProductividad + AdminUsuarios
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { AdminSidebar } from './AdminSidebar';

export function AdminProductividad({ user }) {
  const [stats, setStats] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: cerrados, error } = await supabase.from('Avisos').select('fecha_resolucion, Usuarios:id_tecnico_asignado(nombre_completo)').eq('estado_aviso', 'Cerrado').not('fecha_resolucion', 'is', null);
        if (error) throw error;
        const statsMap = {};
        cerrados.forEach(c => {
          const dateStr = new Date(c.fecha_resolucion).toLocaleDateString();
          const techName = c.Usuarios?.nombre_completo || 'Unknown';
          const key = `${dateStr}_${techName}`;
          if (!statsMap[key]) statsMap[key] = { fecha: c.fecha_resolucion, dateStr, tecnico: techName, total_cerrados: 0 };
          statsMap[key].total_cerrados += 1;
        });
        setStats(Object.values(statsMap).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));
      } catch (e) { }
    };
    fetchStats();
  }, []);

  return (
    <div className="dashboard-layout">
      <AdminSidebar user={user} />
      <div className="main-content">
        <div className="header"><h1>Rendimiento de Técnicos (Avisos Cerrados)</h1></div>
        <div className="table-responsive">
          <table className="data-table">
            <thead><tr><th>Fecha de Resolución</th><th>Técnico</th><th>Avisos Cerrados</th></tr></thead>
            <tbody>
              {stats.map((s, idx) => (<tr key={idx}><td>{new Date(s.fecha).toLocaleDateString()}</td><td>{s.tecnico}</td><td>{s.total_cerrados}</td></tr>))}
              {stats.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center' }}>No hay cierres registrados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AdminUsuarios({ user }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUsuarios = async () => {
    try {
      const { data, error } = await supabase.from('Usuarios').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setUsuarios(data || []);
    } catch (err) { }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const changeRole = async (id, newRole) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('Usuarios').update({ rol: newRole }).eq('id_usuario', id);
      if (error) throw error;
      await fetchUsuarios();
    } catch (err) { alert('Error updating role: ' + err.message); }
    setLoading(false);
  };

  return (
    <div className="dashboard-layout">
      <AdminSidebar user={user} />
      <div className="main-content">
        <div className="header"><h1>Gestión de Usuarios</h1></div>
        <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
          Aquí puedes ver a todas las personas registradas y cambiarles su rol.
          Asigna el rol de <strong>Técnico</strong> a los trabajadores.
        </p>
        <div className="table-responsive">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Email</th><th>Rol Actual</th><th>Acciones</th></tr></thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario}>
                  <td>{u.id_usuario}</td><td>{u.nombre_completo}</td><td>{u.email}</td>
                  <td><span className="pill" style={{ backgroundColor: u.rol === 'Administrador' ? '#f8d7da' : u.rol === 'Direccion' ? '#d4edda' : u.rol === 'Tecnico' ? '#cce5ff' : '#e2e3e5', color: 'black' }}>{u.rol || 'Usuario'}</span></td>
                  <td>
                    <select value={u.rol || 'Usuario'} onChange={(e) => changeRole(u.id_usuario, e.target.value)} disabled={loading || u.id_usuario === user.id} style={{ padding: '0.25rem' }}>
                      <option value="Usuario">Usuario (Sin acceso)</option><option value="Tecnico">Técnico</option><option value="Administrador">Administrador</option><option value="Direccion">Dirección</option>
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

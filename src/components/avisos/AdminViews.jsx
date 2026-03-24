// Avisos — Admin Dashboard, AdminAvisos, AdminClientes, ClienteAvisos
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../supabase';
import { LOGO_BASE64 } from '../../logo';
import { AdminSidebar } from './AdminSidebar';

export function AdminDashboard({ user }) {
  const [avisos, setAvisos] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAvisos = async () => {
      try {
        const { data, error } = await supabase
          .from('Avisos').select('*, Usuarios:id_tecnico_asignado(nombre_completo)')
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

  const handleFilterClick = (filterName) => setActiveFilter(activeFilter === filterName ? null : filterName);

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
          <div className={`kpi-card clickable ${activeFilter === 'Nuevos' ? 'active' : ''}`} onClick={() => handleFilterClick('Nuevos')}><h3>{kpis.nuevos}</h3><p style={{ color: 'var(--text-muted)' }}>Nuevos Avisos</p></div>
          <div className={`kpi-card clickable ${activeFilter === 'Asignados' ? 'active' : ''}`} onClick={() => handleFilterClick('Asignados')}><h3>{kpis.asignados}</h3><p style={{ color: 'var(--text-muted)' }}>Asignados</p></div>
          <div className={`kpi-card clickable ${activeFilter === 'En Progreso' ? 'active' : ''}`} onClick={() => handleFilterClick('En Progreso')}><h3>{kpis.enProgreso}</h3><p style={{ color: 'var(--text-muted)' }}>En Progreso</p></div>
          <div className={`kpi-card clickable ${activeFilter === 'Cerrados' ? 'active' : ''}`} onClick={() => handleFilterClick('Cerrados')}><h3>{kpis.cerrados}</h3><p style={{ color: 'var(--text-muted)' }}>Cerrados</p></div>
        </div>
        <h3>{activeFilter ? `Avisos Registrados - Filtro: ${activeFilter}` : 'Actividad Reciente de Avisos'}</h3>
        <div className="table-responsive">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Cliente</th><th>Dirección</th><th>Técnico</th><th>Estado</th><th>Acción</th></tr></thead>
            <tbody>
              {filteredAvisos.slice(0, activeFilter ? undefined : 10).map(a => (
                <tr key={a.id_aviso}>
                  <td>#{a.id_aviso}</td><td>{a.nombre_cliente}</td><td>{a.direccion_cliente}</td>
                  <td>{a.Usuarios?.nombre_completo || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin asignar</span>}</td>
                  <td><span className={`pill ${a.estado_aviso.toLowerCase().replace(' ', '-')}`}>{a.estado_aviso}</span></td>
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

export function AdminAvisos({ user }) {
  const [avisos, setAvisos] = useState([]);
  const location = useLocation();
  const [search, setSearch] = useState(location.state?.preSearch || '');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAvisos = async () => {
      try {
        const { data, error } = await supabase.from('Avisos').select('*, Usuarios:id_tecnico_asignado(nombre_completo)').order('fecha_creacion', { ascending: false });
        if (error) throw error;
        setAvisos(data || []);
      } catch (err) { }
    };
    fetchAvisos();
  }, [navigate]);

  const filtered = avisos.filter(a => {
    const matchesSearch = a.nombre_cliente.toLowerCase().includes(search.toLowerCase()) || a.direccion_cliente.toLowerCase().includes(search.toLowerCase()) || a.id_aviso.toString().includes(search);
    let matchesStatus = true;
    if (statusFilter === 'Abiertos/Pendientes') matchesStatus = a.estado_aviso !== 'Cerrado';
    else if (statusFilter === 'Cerrados') matchesStatus = a.estado_aviso === 'Cerrado';
    return matchesSearch && matchesStatus;
  });

  const exportMonthlyPDF = () => {
    const doc = new jsPDF();
    try { doc.addImage(LOGO_BASE64, 'PNG', 10, 8, 55, 18); } catch (e) { }
    doc.setTextColor(10, 35, 66); doc.setFontSize(20); doc.setFont(undefined, 'bold');
    doc.text('Reporte Mensual de Avisos', 75, 20);
    doc.setFont(undefined, 'normal'); doc.setDrawColor(10, 35, 66); doc.setLineWidth(0.8); doc.line(10, 32, 200, 32); doc.setTextColor(0, 0, 0);
    const now = new Date();
    const mesNombre = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    doc.setFontSize(11);
    doc.text(`Período: ${mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)}`, 14, 40);
    doc.text(`Fecha de generación: ${now.toLocaleDateString('es-ES')}`, 14, 46);
    const currentMonthAvisos = filtered.filter(a => { const d = new Date(a.fecha_creacion); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    autoTable(doc, {
      head: [["ID", "Cliente", "Dirección", "Técnico", "Estado", "Fecha"]],
      body: currentMonthAvisos.map(a => ([a.id_aviso, a.nombre_cliente, a.direccion_cliente, a.Usuarios?.nombre_completo || 'Sin asignar', a.estado_aviso, new Date(a.fecha_creacion).toLocaleDateString('es-ES')])),
      startY: 54, headStyles: { fillColor: [10, 35, 66], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 247, 255] }, styles: { fontSize: 9, cellPadding: 4 },
    });
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) { doc.setPage(i); doc.setFillColor(10, 35, 66); doc.rect(0, 285, 210, 12, 'F'); doc.setFontSize(8); doc.setTextColor(255, 255, 255); doc.text('LUVEMATIC © ' + now.getFullYear() + ' — Documento generado automáticamente', 14, 291); doc.text(`Página ${i} de ${pageCount}`, 180, 291); doc.setTextColor(0, 0, 0); }
    doc.save('Reporte_Mensual_Avisos.pdf');
  };

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
            <input type="text" placeholder="Buscar por cliente, dirección o ID..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '0.5rem', width: '300px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="Todos">Todos los Estados</option><option value="Abiertos/Pendientes">Abiertos y Pendientes</option><option value="Cerrados">Cerrados</option>
            </select>
          </div>
          <button className="btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/admin/create-aviso')}>+ Crear Aviso</button>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Cliente</th><th>Dirección</th><th>Técnico</th><th>Estado</th><th>Acción</th></tr></thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id_aviso}><td>#{a.id_aviso}</td><td>{a.nombre_cliente}</td><td>{a.direccion_cliente}</td>
                  <td>{a.Usuarios?.nombre_completo || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin asignar</span>}</td>
                  <td><span className={`pill ${a.estado_aviso.toLowerCase().replace(' ', '-')}`}>{a.estado_aviso}</span></td>
                  <td><span className="link" onClick={() => navigate(`/admin/aviso/${a.id_aviso}`, { state: { aviso: a } })}>Ver Detalle</span></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center' }}>No se encontraron resultados</td></tr>}
            </tbody>
          </table>
        </div>
        <button className="btn-primary fab-button" onClick={() => navigate('/admin/create-aviso')} style={{ display: window.innerWidth <= 768 ? 'flex' : 'none' }}>+</button>
      </div>
    </div>
  );
}

export function AdminClientes({ user }) {
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const { data: avisos, error } = await supabase.from('Avisos').select('*');
        if (error) throw error;
        const clientMap = {};
        avisos.forEach(a => {
          const key = `${a.nombre_cliente}|${a.direccion_cliente}`;
          if (!clientMap[key]) { clientMap[key] = { nombre_cliente: a.nombre_cliente, direccion_cliente: a.direccion_cliente, telefono_cliente: a.telefono_cliente, total_avisos: 0, ultimo_aviso: a.fecha_creacion }; }
          clientMap[key].total_avisos += 1;
          if (new Date(a.fecha_creacion) > new Date(clientMap[key].ultimo_aviso)) clientMap[key].ultimo_aviso = a.fecha_creacion;
        });
        setClientes(Object.values(clientMap).sort((a, b) => new Date(b.ultimo_aviso) - new Date(a.ultimo_aviso)));
      } catch (err) { }
    };
    fetchClientes();
  }, []);

  const filtered = clientes.filter(c => c.nombre_cliente.toLowerCase().includes(search.toLowerCase()) || c.direccion_cliente.toLowerCase().includes(search.toLowerCase()));

  const exportClientPDF = async (cliente) => {
    try {
      const { data: historial, error } = await supabase.from('Avisos').select('*').eq('nombre_cliente', cliente.nombre_cliente).eq('direccion_cliente', cliente.direccion_cliente).order('fecha_creacion', { ascending: false }).limit(5);
      if (error) throw error;
      const doc = new jsPDF(); const now = new Date();
      try { doc.addImage(LOGO_BASE64, 'PNG', 10, 8, 55, 18); } catch (e) { }
      doc.setTextColor(10, 35, 66); doc.setFontSize(20); doc.setFont(undefined, 'bold'); doc.text('Historial de Cliente', 75, 20);
      doc.setFont(undefined, 'normal'); doc.setDrawColor(10, 35, 66); doc.setLineWidth(0.8); doc.line(10, 32, 200, 32); doc.setTextColor(0, 0, 0);
      doc.setFontSize(11); doc.text(`Cliente: ${cliente.nombre_cliente}`, 14, 40); doc.text(`Dirección: ${cliente.direccion_cliente}`, 14, 46);
      doc.text(`Teléfono: ${cliente.telefono_cliente || 'N/A'}`, 14, 52); doc.text(`Fecha de generación: ${now.toLocaleDateString('es-ES')}`, 14, 58);
      autoTable(doc, {
        head: [["ID", "Fecha", "Tipo Puerta", "Fallo", "Estado"]],
        body: historial.map(h => ([h.id_aviso, new Date(h.fecha_resolucion || h.fecha_creacion || Date.now()).toLocaleDateString('es-ES'), h.tipo_puerta || '-', h.descripcion_problema, h.estado_aviso])),
        startY: 66, headStyles: { fillColor: [10, 35, 66], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 247, 255] }, styles: { fontSize: 9, cellPadding: 4 },
      });
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) { doc.setPage(i); doc.setFillColor(10, 35, 66); doc.rect(0, 285, 210, 12, 'F'); doc.setFontSize(8); doc.setTextColor(255, 255, 255); doc.text('LUVEMATIC © ' + now.getFullYear() + ' — Documento generado automáticamente', 14, 291); doc.text(`Página ${i} de ${pageCount}`, 180, 291); doc.setTextColor(0, 0, 0); }
      doc.save(`Historial_${cliente.nombre_cliente.replace(/\s+/g, '_')}.pdf`);
    } catch (err) { alert('Error al generar PDF del cliente'); }
  };

  return (
    <div className="dashboard-layout">
      <AdminSidebar user={user} />
      <div className="main-content">
        <div className="header">
          <h1>Directorio de Clientes</h1>
          <input type="text" placeholder="Buscar por cliente o dirección..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '0.5rem', width: '300px', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead><tr><th>Cliente</th><th>Dirección</th><th>Teléfono</th><th>Total Avisos</th><th>Acción</th></tr></thead>
            <tbody>
              {filtered.map((c, idx) => (
                <tr key={idx} onClick={() => navigate('/admin/cliente-avisos', { state: { cliente: c } })} style={{ cursor: 'pointer' }} className="hover-bg">
                  <td>{c.nombre_cliente}</td><td>{c.direccion_cliente}</td><td>{c.telefono_cliente}</td><td>{c.total_avisos}</td>
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

export function ClienteAvisos({ user }) {
  const { state } = useLocation();
  const navigate = useNavigate();
  const cliente = state?.cliente;
  const [avisos, setAvisos] = useState([]);

  useEffect(() => {
    if (!cliente) return;
    supabase.from('Avisos').select('*, Usuarios:id_tecnico_asignado(nombre_completo)').eq('nombre_cliente', cliente.nombre_cliente).eq('direccion_cliente', cliente.direccion_cliente).order('fecha_creacion', { ascending: false })
      .then(({ data, error }) => { if (!error) setAvisos(data || []); });
  }, [cliente]);

  if (!cliente) return <div className="dashboard-layout"><AdminSidebar user={user} /><div className="main-content"><p>No se ha seleccionado ningún cliente. <span className="link" onClick={() => navigate('/admin/clientes')}>Volver al directorio</span></p></div></div>;

  return (
    <div className="dashboard-layout">
      <AdminSidebar user={user} />
      <div className="main-content">
        <div className="header">
          <div><h1>Avisos de {cliente.nombre_cliente}</h1><p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{cliente.direccion_cliente} &mdash; Tel: {cliente.telefono_cliente || 'N/A'}</p></div>
          <button className="btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/admin/clientes')}>&larr; Volver a Clientes</button>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Fecha</th><th>Tipo Puerta</th><th>Descripción</th><th>Técnico</th><th>Estado</th></tr></thead>
            <tbody>
              {avisos.map(a => (
                <tr key={a.id_aviso} onClick={() => navigate(`/admin/aviso/${a.id_aviso}`, { state: { aviso: a } })} style={{ cursor: 'pointer' }} className="hover-bg">
                  <td>#{a.id_aviso}</td><td>{new Date(a.fecha_creacion).toLocaleDateString('es-ES')}</td><td>{a.tipo_puerta}</td>
                  <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.descripcion_problema}</td>
                  <td>{a.Usuarios?.nombre_completo || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin asignar</span>}</td>
                  <td><span className={`pill ${a.estado_aviso.toLowerCase().replace(' ', '-')}`}>{a.estado_aviso}</span></td>
                </tr>
              ))}
              {avisos.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center' }}>Este cliente no tiene avisos registrados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

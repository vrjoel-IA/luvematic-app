// Avisos — AvisoDetailAdmin
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import { supabase } from '../../supabase';
import { LOGO_BASE64 } from '../../logo';
import { AdminSidebar } from './AdminSidebar';

export function AvisoDetailAdmin({ user }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();
  const [aviso, setAviso] = useState(state?.aviso || null);
  const [tecnicos, setTecnicos] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [form, setForm] = useState({ estado_aviso: '', id_tecnico_asignado: '', observaciones_cierre: '' });

  useEffect(() => {
    if (aviso) {
      setForm({ estado_aviso: aviso.estado_aviso, id_tecnico_asignado: aviso.id_tecnico_asignado || '', observaciones_cierre: aviso.observaciones_cierre || '' });
      setEditForm({ nombre_cliente: aviso.nombre_cliente, direccion_cliente: aviso.direccion_cliente, telefono_cliente: aviso.telefono_cliente || '', tipo_puerta: aviso.tipo_puerta, descripcion_problema: aviso.descripcion_problema });
    }
  }, [aviso]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: t } = await supabase.from('Usuarios').select('*').eq('rol', 'Tecnico');
        setTecnicos(t || []);
        const { data: f } = await supabase.from('Fotos_Avisos').select('*').eq('id_aviso', id);
        setFotos(f || []);
        if (!aviso) { const { data: a } = await supabase.from('Avisos').select('*').eq('id_aviso', id).single(); setAviso(a); }
      } catch (err) { }
    };
    fetchData();
  }, [id, aviso]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const ud = { estado_aviso: form.estado_aviso, id_tecnico_asignado: form.id_tecnico_asignado || null, observaciones_cierre: form.observaciones_cierre || null };
      if (form.estado_aviso === 'Cerrado') ud.fecha_resolucion = new Date().toISOString();
      await supabase.from('Avisos').update(ud).eq('id_aviso', id);
      alert('Aviso actualizado'); navigate('/admin/avisos');
    } catch (err) { alert('Error al actualizar aviso'); }
  };

  const handleTechChange = (techId) => {
    let ns = form.estado_aviso;
    if (techId && form.estado_aviso === 'Abierto') ns = 'Asignado';
    setForm({ ...form, id_tecnico_asignado: techId, estado_aviso: ns });
  };

  const handleEditToggle = () => {
    if (isEditing) setEditForm({ nombre_cliente: aviso.nombre_cliente, direccion_cliente: aviso.direccion_cliente, telefono_cliente: aviso.telefono_cliente || '', tipo_puerta: aviso.tipo_puerta, descripcion_problema: aviso.descripcion_problema });
    setIsEditing(!isEditing);
  };

  const handleSaveDetails = async () => {
    try {
      await supabase.from('Avisos').update(editForm).eq('id_aviso', id);
      setAviso({ ...aviso, ...editForm }); setIsEditing(false);
      alert('Detalles guardados');
    } catch (err) { alert('Error al guardar'); }
  };

  const exportToPDF = () => {
    const doc = new jsPDF(); const now = new Date();
    try { doc.addImage(LOGO_BASE64, 'PNG', 10, 8, 55, 18); } catch (e) { }
    doc.setTextColor(10, 35, 66); doc.setFontSize(20); doc.setFont(undefined, 'bold');
    doc.text(`Detalle de Aviso #${aviso.id_aviso}`, 75, 20);
    doc.setFont(undefined, 'normal'); doc.setDrawColor(10, 35, 66); doc.setLineWidth(0.8); doc.line(10, 32, 200, 32); doc.setTextColor(0, 0, 0);
    doc.setFillColor(240, 247, 255); doc.roundedRect(10, 38, 190, 36, 3, 3, 'F');
    doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text('Información del Cliente', 14, 46);
    doc.setFont(undefined, 'normal'); doc.setFontSize(10);
    doc.text(`Nombre: ${aviso.nombre_cliente}`, 14, 54); doc.text(`Dirección: ${aviso.direccion_cliente}`, 14, 60);
    doc.text(`Teléfono: ${aviso.telefono_cliente || 'N/A'}`, 110, 54); doc.text(`Tipo de Puerta: ${aviso.tipo_puerta}`, 110, 60);
    doc.text(`Fecha: ${new Date(aviso.fecha_creacion).toLocaleDateString('es-ES')}`, 14, 68);
    doc.setFillColor(240, 247, 255); doc.roundedRect(10, 80, 190, 18, 3, 3, 'F');
    doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text('Estado y Asignación', 14, 88);
    doc.setFont(undefined, 'normal'); doc.setFontSize(10); doc.text(`Estado: ${aviso.estado_aviso}`, 14, 94);
    doc.text(`Técnico: ${tecnicos.find(t => t.id_usuario === aviso.id_tecnico_asignado)?.nombre_completo || 'Sin asignar'}`, 110, 94);
    let cy = 108;
    const sp = doc.splitTextToSize(aviso.descripcion_problema, 178); const bh = 12 + (sp.length * 5);
    doc.setFillColor(240, 247, 255); doc.roundedRect(10, cy - 2, 190, bh, 3, 3, 'F');
    doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(10, 35, 66); doc.text('Descripción:', 14, cy + 6);
    doc.setFont(undefined, 'normal'); doc.setTextColor(0, 0, 0); doc.setFontSize(10); doc.text(sp, 14, cy + 14);
    cy = cy + bh + 8;
    if (aviso.observaciones_cierre) {
      const sc = doc.splitTextToSize(aviso.observaciones_cierre, 178); const ch = 12 + (sc.length * 5);
      doc.setFillColor(240, 247, 255); doc.roundedRect(10, cy - 2, 190, ch, 3, 3, 'F');
      doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(10, 35, 66); doc.text('Observaciones:', 14, cy + 6);
      doc.setFont(undefined, 'normal'); doc.setTextColor(0, 0, 0); doc.setFontSize(10); doc.text(sc, 14, cy + 14);
    }
    doc.setFillColor(10, 35, 66); doc.rect(0, 285, 210, 12, 'F'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    doc.text('LUVEMATIC © ' + now.getFullYear(), 14, 291); doc.text('Página 1 de 1', 180, 291);
    doc.save(`Aviso_${aviso.id_aviso}_${aviso.nombre_cliente.replace(/\s+/g, '_')}.pdf`);
  };

  if (!aviso) return <div className="dashboard-layout"><AdminSidebar user={user} /><div className="main-content">Cargando...</div></div>;

  const puertas = ['Seccional','Enrollable','Corredera','Basculante','Puerta de cristal','Puerta de guillotina','Telescópica','Peatonal'];

  return (
    <div className="dashboard-layout">
      <AdminSidebar user={user} />
      <div className="main-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ margin: 0 }}>Detalle de Aviso #{aviso.id_aviso}</h1>
            <span className={`pill ${aviso.estado_aviso.toLowerCase().replace(' ', '-')}`}>{aviso.estado_aviso}</span>
          </div>
          <button className="btn-primary" style={{ width: 'auto', backgroundColor: '#dc3545' }} onClick={exportToPDF}>Guardar PDF</button>
        </div>
        <div className="detail-grid">
          <div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Información del Cliente</h3>
                {aviso.estado_aviso !== 'Cerrado' && !isEditing && <button onClick={handleEditToggle} className="btn-primary" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>Editar</button>}
              </div>
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}><label>Nombre:</label><input type="text" value={editForm.nombre_cliente} onChange={e => setEditForm({ ...editForm, nombre_cliente: e.target.value })} /></div>
                  <div className="input-group" style={{ marginBottom: 0 }}><label>Dirección:</label><input type="text" value={editForm.direccion_cliente} onChange={e => setEditForm({ ...editForm, direccion_cliente: e.target.value })} /></div>
                  <div className="input-group" style={{ marginBottom: 0 }}><label>Teléfono:</label><input type="text" value={editForm.telefono_cliente} onChange={e => setEditForm({ ...editForm, telefono_cliente: e.target.value })} /></div>
                  <div className="input-group" style={{ marginBottom: 0 }}><label>Puerta:</label>
                    <select value={editForm.tipo_puerta} onChange={e => setEditForm({ ...editForm, tipo_puerta: e.target.value })}>{puertas.map(p => <option key={p} value={p}>{p}</option>)}</select>
                  </div>
                </div>
              ) : (<><p><strong>Nombre:</strong> {aviso.nombre_cliente}</p><p><strong>Dirección:</strong> {aviso.direccion_cliente}</p><p><strong>Teléfono:</strong> {aviso.telefono_cliente}</p><p><strong>Puerta:</strong> {aviso.tipo_puerta}</p></>)}
            </div>
            <div className="card"><h3>Descripción del Problema</h3>{isEditing ? (<div className="input-group" style={{ marginBottom: 0 }}><textarea rows="4" value={editForm.descripcion_problema} onChange={e => setEditForm({ ...editForm, descripcion_problema: e.target.value })}></textarea></div>) : (<p>{aviso.descripcion_problema}</p>)}</div>
            {isEditing && (<div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginBottom: '1.5rem' }}><button onClick={handleEditToggle} className="btn-primary" style={{ backgroundColor: '#6c757d', width: 'auto' }}>Cancelar</button><button onClick={handleSaveDetails} className="btn-primary" style={{ width: 'auto', backgroundColor: 'var(--accent-green)' }}>Guardar</button></div>)}
            {fotos.length > 0 && (<div className="card"><h3>Fotos del Trabajo</h3><div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>{fotos.map(f => (<div key={f.id_foto} style={{ border: '1px solid #ccc', padding: '5px', borderRadius: '4px', background: '#f8f9fa' }}><a href={f.url_foto} target="_blank" rel="noreferrer" className="link">Ver Foto</a></div>))}</div></div>)}
          </div>
          <div>
            <div className="card"><h3>Gestión del Aviso</h3>
              <form onSubmit={handleUpdate}>
                <div className="input-group"><label>Estado</label><select value={form.estado_aviso} onChange={e => setForm({ ...form, estado_aviso: e.target.value })}><option value="Abierto">Abierto</option><option value="Asignado">Asignado</option><option value="En Progreso">En Progreso</option><option value="Cerrado">Cerrado</option></select></div>
                <div className="input-group"><label>Técnico</label><select value={form.id_tecnico_asignado} onChange={e => handleTechChange(e.target.value)}><option value="">-- Sin Asignar --</option>{tecnicos.map(t => <option key={t.id_usuario} value={t.id_usuario}>{t.nombre_completo}</option>)}</select></div>
                <div className="input-group"><label>Observaciones</label><textarea rows="4" value={form.observaciones_cierre} onChange={e => setForm({ ...form, observaciones_cierre: e.target.value })}></textarea></div>
                <button type="submit" className="btn-primary">Guardar Cambios</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

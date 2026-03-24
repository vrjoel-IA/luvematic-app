// Avisos — CreateAviso
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { AdminSidebar } from './AdminSidebar';

export function CreateAviso({ user }) {
  const [form, setForm] = useState({ nombre_cliente: '', direccion_cliente: '', telefono_cliente: '', tipo_puerta: 'Seccional', descripcion_problema: '', observaciones_iniciales: '', id_tecnico_asignado: '' });
  const [tecnicos, setTecnicos] = useState([]);
  const [sugerencias, setSugerencias] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { supabase.from('Usuarios').select('*').eq('rol', 'Tecnico').then(({ data }) => setTecnicos(data || [])); }, []);

  useEffect(() => {
    if (form.nombre_cliente.length > 2 || form.direccion_cliente.length > 2) {
      const sp = form.nombre_cliente || form.direccion_cliente;
      supabase.from('Avisos').select('nombre_cliente, direccion_cliente, telefono_cliente, tipo_puerta')
        .or(`nombre_cliente.ilike.%${sp}%,direccion_cliente.ilike.%${sp}%`).limit(10)
        .then(({ data }) => {
          const u = []; const ids = new Set();
          (data || []).forEach(d => { const k = d.nombre_cliente + d.direccion_cliente; if (!ids.has(k)) { ids.add(k); u.push(d); } });
          setSugerencias(u);
        });
    } else { setSugerencias([]); }
  }, [form.nombre_cliente, form.direccion_cliente]);

  const selectSug = (s) => {
    setForm({ ...form, nombre_cliente: s.nombre_cliente, direccion_cliente: s.direccion_cliente, telefono_cliente: s.telefono_cliente || '', tipo_puerta: s.tipo_puerta || 'Seccional' });
    setSugerencias([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const ins = { nombre_cliente: form.nombre_cliente, direccion_cliente: form.direccion_cliente, telefono_cliente: form.telefono_cliente, tipo_puerta: form.tipo_puerta, descripcion_problema: form.descripcion_problema, observaciones_iniciales: form.observaciones_iniciales, id_usuario_creador: user.id, estado_aviso: form.id_tecnico_asignado ? 'Asignado' : 'Abierto' };
      if (form.id_tecnico_asignado) { ins.id_tecnico_asignado = form.id_tecnico_asignado; ins.fecha_asignacion = new Date().toISOString(); }
      await supabase.from('Avisos').insert([ins]);
      navigate('/admin/avisos');
    } catch (err) { alert("Error al crear el aviso"); }
  };

  return (
    <div className="dashboard-layout">
      <AdminSidebar user={user} />
      <div className="main-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1>Crear Nuevo Aviso de Avería</h1>
        <div className="card">
          <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
            <div className="input-group"><label>Cliente</label><input type="text" value={form.nombre_cliente} onChange={e => setForm({ ...form, nombre_cliente: e.target.value, showSug: true })} required /></div>
            <div className="input-group"><label>Dirección</label><input type="text" value={form.direccion_cliente} onChange={e => setForm({ ...form, direccion_cliente: e.target.value, showSug: true })} required /></div>
            {sugerencias.length > 0 && form.showSug && (
              <div style={{ position: 'absolute', top: '140px', left: 0, right: 0, background: 'white', border: '1px solid #ccc', borderRadius: '4px', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '5px 10px', background: '#f8f9fa', borderBottom: '1px solid #eee', fontSize: '0.8rem', fontWeight: 'bold' }}>Sugerencias:</div>
                {sugerencias.map((s, idx) => (<div key={idx} onClick={() => selectSug(s)} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }} className="hover-bg"><strong>{s.nombre_cliente}</strong> - {s.direccion_cliente}</div>))}
              </div>
            )}
            <div className="input-group"><label>Teléfono</label><input type="text" value={form.telefono_cliente} onChange={e => setForm({ ...form, telefono_cliente: e.target.value })} /></div>
            <div className="input-group"><label>Tipo de Puerta</label>
              <select value={form.tipo_puerta} onChange={e => setForm({ ...form, tipo_puerta: e.target.value })}>
                <option value="Seccional">Seccional</option><option value="Enrollable">Enrollable</option><option value="Corredera">Corredera</option><option value="Basculante">Basculante</option>
                <option value="Puerta de cristal">Puerta de cristal</option><option value="Puerta de guillotina">Puerta de guillotina</option><option value="Telescópica">Telescópica</option><option value="Peatonal">Peatonal</option>
              </select>
            </div>
            <div className="input-group"><label>Técnico a Asignar (Opcional)</label>
              <select value={form.id_tecnico_asignado} onChange={e => setForm({ ...form, id_tecnico_asignado: e.target.value })}>
                <option value="">-- Dejar sin asignar --</option>
                {tecnicos.map(t => <option key={t.id_usuario} value={t.id_usuario}>{t.nombre_completo}</option>)}
              </select>
            </div>
            <div className="input-group"><label>Descripción del Problema</label><textarea rows="4" value={form.descripcion_problema} onChange={e => setForm({ ...form, descripcion_problema: e.target.value })} required></textarea></div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => navigate('/admin/avisos')} className="btn-primary" style={{ backgroundColor: '#6c757d', width: 'auto' }}>Cancelar</button>
              <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Guardar Aviso</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Avisos — TechDashboard + TechAvisoDetail
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../supabase';

export function TechDashboard({ user }) {
  const [avisos, setAvisos] = useState([]);
  const [viewAll, setViewAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Activos');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAvisos = async () => {
      try {
        let query = supabase.from('Avisos').select('*, Usuarios:id_tecnico_asignado(nombre_completo)').order('fecha_creacion', { ascending: false });
        if (!viewAll) query = query.eq('id_tecnico_asignado', user.id);
        const { data, error } = await query;
        if (error) throw error;
        setAvisos(data || []);
      } catch (err) { }
    };
    fetchAvisos();
  }, [navigate, viewAll]);

  const filtered = avisos.filter(a => {
    if (statusFilter === 'Activos') return a.estado_aviso !== 'Cerrado';
    if (statusFilter === 'Cerrados') return a.estado_aviso === 'Cerrado';
    return true;
  });

  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <img src="/logo.png" style={{ height: '40px', background: 'white', padding: '5px', borderRadius: '4px' }} alt="LUVEMATIC" />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate('/select-module')} className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#6c757d' }}><ArrowLeft size={16} /> Módulos</button>
          <button onClick={() => { localStorage.clear(); window.location.href = '/'; }} className="btn-danger" style={{ width: 'auto' }}>Salir</button>
        </div>
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
          {viewAll && a.Usuarios?.nombre_completo && (<p style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: 600, margin: '0.3rem 0' }}>👤 Asignado a: {a.Usuarios.nombre_completo}</p>)}
          <p style={{ marginTop: '0.5rem' }}>{a.descripcion_problema}</p>
        </div>
      ))}
    </div>
  );
}

export function TechAvisoDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();
  const [aviso, setAviso] = useState(state?.aviso || null);
  const [obsCierre, setObsCierre] = useState(aviso?.observaciones_cierre || '');
  const [fotos, setFotos] = useState(null);

  useEffect(() => {
    if (!aviso) {
      supabase.from('Avisos').select('*').eq('id_aviso', id).single().then(({ data }) => { setAviso(data); setObsCierre(data?.observaciones_cierre || ''); });
    }
  }, [id, aviso]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await supabase.from('Avisos').update({ estado_aviso: 'Cerrado', observaciones_cierre: obsCierre, fecha_resolucion: new Date().toISOString() }).eq('id_aviso', id);
      if (fotos && fotos.length > 0) {
        for (let i = 0; i < fotos.length; i++) {
          const file = fotos[i]; const ext = file.name.split('.').pop();
          const fileName = `${id}_${Date.now()}_${i}.${ext}`;
          const { error: ue } = await supabase.storage.from('avisos-fotos').upload(fileName, file);
          if (!ue) {
            const { data: pu } = supabase.storage.from('avisos-fotos').getPublicUrl(fileName);
            if (pu?.publicUrl) await supabase.from('Fotos_Avisos').insert([{ id_aviso: id, url_foto: pu.publicUrl }]);
          }
        }
      }
      alert('Aviso cerrado exitosamente'); navigate('/tecnico');
    } catch (err) { alert('Error al cerrar aviso'); }
  };

  if (!aviso) return <div style={{ padding: '1rem' }}>Cargando...</div>;

  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <button onClick={() => navigate('/tecnico')} style={{ marginBottom: '1rem', width: 'auto' }} className="btn-primary">← Volver a Tareas</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Aviso #{aviso.id_aviso}</h1>
        <span className={`pill ${aviso.estado_aviso.toLowerCase().replace(' ', '-')}`}>{aviso.estado_aviso}</span>
      </div>
      <div className="card">
        <h3>Detalles del Cliente</h3>
        <p><strong>{aviso.nombre_cliente}</strong></p><p>{aviso.direccion_cliente}</p><p>{aviso.telefono_cliente}</p>
        <p><strong>Puerta:</strong> {aviso.tipo_puerta}</p>
        <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
        <p><strong>Fallo reportado:</strong> {aviso.descripcion_problema}</p>
      </div>
      <div className="card">
        <form onSubmit={handleUpdate}>
          <div className="input-group"><label>Observaciones de la Reparación</label><textarea rows="4" placeholder="Describe el trabajo realizado..." value={obsCierre} onChange={e => setObsCierre(e.target.value)} required></textarea></div>
          {aviso.estado_aviso !== 'Cerrado' ? (
            <>
              <div className="input-group"><label>Adjuntar Fotos (opcional)</label><input type="file" multiple accept="image/*" onChange={e => setFotos(e.target.files)} /></div>
              <button type="submit" className="btn-primary">Finalizar, Subir Fotos y Cerrar</button>
            </>
          ) : (<p style={{ color: 'green', fontWeight: 'bold' }}>Este aviso ya está cerrado.</p>)}
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, MapPin, Play, CheckCircle, RotateCcw, Save, Download, ArrowLeft } from 'lucide-react';
import { supabase } from '../../supabase';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export function MantTechDetalle({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const sigCanvas = useRef({});
  const [mant, setMant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fotos, setFotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [firmaRequerida, setFirmaRequerida] = useState(false);
  const [nombreFirma, setNombreFirma] = useState('');

  const FREQ_COLORS = { mensual: '#2196F3', trimestral: '#FF9800', semestral: '#9C27B0', anual: '#E91E63' };

  useEffect(() => {
    fetchMant();
  }, [id]);

  const fetchMant = async () => {
    try {
      const { data, error } = await supabase
        .from('Mantenimientos')
        .select(`
          *,
          Instalaciones(direccion, Clientes_Mant(razon_social))
        `)
        .eq('id', id)
        .single();
        
      if (error) throw error;
      setMant(data);
      setObservaciones(data.observaciones || '');
      
      const { data: fData } = await supabase.from('Fotos_Mantenimientos').select('*').eq('id_mantenimiento', id);
      setFotos(fData || []);
    } catch (err) {
      alert('Error cargando mantenimiento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (newStatus) => {
    if (newStatus === 'completado') {
      if (firmaRequerida && (!nombreFirma || sigCanvas.current.isEmpty())) {
        return alert('Por favor, incluya nombre y firma del cliente.');
      }
      if (!observaciones) {
        return alert('Por favor, añada observaciones de las tareas realizadas (aceitado, revisiones puntuales, etc.)');
      }
    }

    setStatusLoading(true);
    let signatureUrl = null;

    if (newStatus === 'completado' && firmaRequerida) {
      try {
        const sigData = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
        const file = await (await fetch(sigData)).blob();
        const fileName = `firma_m_${id}_${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage
          .from('luvematic_docs')
          .upload(`firmas/${fileName}`, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from('luvematic_docs')
          .getPublicUrl(`firmas/${fileName}`);
          
        signatureUrl = publicData.publicUrl;
      } catch (err) {
        alert('Error subiendo firma: ' + err.message);
        setStatusLoading(false);
        return;
      }
    }

    const updates = { 
      estado: newStatus, 
      observaciones 
    };

    if (signatureUrl) {
      updates.firma_url = signatureUrl;
      updates.firma_nombre = nombreFirma;
    }

    const { error } = await supabase.from('Mantenimientos').update(updates).eq('id', id);

    if (error) {
      alert('Error actualizando: ' + error.message);
    } else {
      await fetchMant();
      if (newStatus === 'completado') {
        alert('Mantenimiento completado con éxito.');
      }
    }
    setStatusLoading(false);
  };

  const openNav = () => {
    if (mant?.Instalaciones?.direccion) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mant.Instalaciones.direccion)}`, '_blank');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `mant_${id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('luvematic_docs')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('luvematic_docs')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('Fotos_Mantenimientos').insert([
        { id_mantenimiento: id, id_tecnico: user.id, foto_url: publicData.publicUrl }
      ]);

      if (dbError) throw dbError;
      
      fetchMant();
    } catch (err) {
      alert('Error subiendo foto: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteFoto = async (idFoto, fotoUrl) => {
    if (!confirm('¿Borrar foto?')) return;
    try {
      const fileName = fotoUrl.split('/').pop();
      await supabase.storage.from('luvematic_docs').remove([fileName]);
      await supabase.from('Fotos_Mantenimientos').delete().eq('id', idFoto);
      fetchMant();
    } catch (err) {
      alert('Error eliminando: ' + err.message);
    }
  };

  // PDF Export Function
  const generatePDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.setFillColor(10, 35, 66); // primary color
    pdf.rect(0, 0, 210, 30, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.text('REPARTE DE MANTENIMIENTO TÉCNICO', 15, 20);

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.text(`Cliente: ${mant.Instalaciones?.Clientes_Mant?.razon_social || 'N/A'}`, 15, 40);
    pdf.text(`Dirección: ${mant.Instalaciones?.direccion || 'N/A'}`, 15, 48);
    pdf.text(`Fecha: ${new Date(mant.fecha_programada).toLocaleDateString('es-ES')}`, 15, 56);
    pdf.text(`Frecuencia: ${mant.frecuencia.toUpperCase()}`, 15, 64);
    
    // Observaciones Box
    pdf.setFillColor(240, 244, 248);
    pdf.rect(15, 74, 180, 40, 'F');
    pdf.setFont(undefined, 'bold');
    pdf.text('Observaciones y Tareas Realizadas:', 20, 82);
    pdf.setFont(undefined, 'normal');
    const splitObs = pdf.splitTextToSize(mant.observaciones || 'No registradas.', 170);
    pdf.text(splitObs, 20, 90);

    let currentY = 125;
    
    // Add Signature if exists
    if (mant.firma_url) {
      pdf.setFont(undefined, 'bold');
      pdf.text('FIRMA DEL CLIENTE', 15, currentY);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Aceptado por: ${mant.firma_nombre || 'Firma local'}`, 15, currentY + 8);
      
      try {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = mant.firma_url;
        await new Promise((resolve) => {
          img.onload = () => {
            pdf.addImage(img, 'PNG', 15, currentY + 12, 60, 30);
            resolve();
          };
        });
      } catch (e) {
        pdf.text('[Firma adjunta no disponible para renderizar en PDF]', 15, currentY + 20);
      }
      currentY += 50;
    }

    pdf.save(`Mantenimiento_${mant.Instalaciones?.Clientes_Mant?.razon_social || 'Cliente'}_${new Date(mant.fecha_programada).toISOString().split('T')[0]}.pdf`);
  };


  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando detalles...</div>;
  if (!mant) return <div style={{ padding: '2rem', textAlign: 'center' }}>Mantenimiento no encontrado.</div>;

  const freqColor = FREQ_COLORS[mant.frecuencia] || '#333';

  return (
    <div className="mobile-view">
      <div className="tech-header" style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'white', borderBottom: '2px solid #eee', padding: '1rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
          <ArrowLeft size={24} color="#0A2342" />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0A2342' }}>{mant.Instalaciones?.Clientes_Mant?.razon_social}</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{mant.Instalaciones?.direccion}</p>
        </div>
        <span style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '12px', fontWeight: 800, color: 'white', backgroundColor: freqColor, textTransform: 'uppercase' }}>
          {mant.frecuencia}
        </span>
      </div>

      <div style={{ padding: '1rem' }}>
        {/* ACTION BUTTONS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.5rem' }}>
          <button onClick={openNav} className="btn-secondary" style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '1rem', backgroundColor: '#f0f4f8', color: '#0A2342', border: '2px solid #0A2342' }}>
            <MapPin size={20} /> <span style={{ fontWeight: 700 }}>Navegar</span>
          </button>
          
          {mant.estado === 'completado' && (
            <button onClick={generatePDF} className="btn-primary" style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '1rem' }}>
              <Download size={20} /> <span style={{ fontWeight: 700 }}>Exportar PDF</span>
            </button>
          )}

          {mant.estado === 'asignado' && (
            <button onClick={() => changeStatus('en_curso')} disabled={statusLoading} className="btn-primary" style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '1rem', backgroundColor: '#FF9800', borderColor: '#FF9800' }}>
              <Play size={20} /> <span style={{ fontWeight: 700 }}>Iniciar Trabajo</span>
            </button>
          )}
        </div>

        {/* OBSERVACIONES */}
        <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', border: '2px solid #eee' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Save size={16} /> Observaciones Técnicas</h3>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            disabled={mant.estado === 'completado'}
            placeholder="Introduce las tareas realizadas, limpieza, aceitado, problemas menores detectados..."
            style={{ width: '100%', minHeight: '100px', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', resize: 'vertical' }}
          />
          {mant.estado !== 'completado' && (
            <button onClick={() => supabase.from('Mantenimientos').update({ observaciones }).eq('id', id).then(() => alert('Guardado'))} className="btn-secondary" style={{ marginTop: '0.5rem', width: '100%' }}>
              Autoguardar Texto
            </button>
          )}
        </div>

        {/* REPORTE FOTOGRAFICO */}
        <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', border: '2px solid #eee' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Camera size={16} /> Álbum Fotográfico</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Sube fotos de la instalación, antes/después o comprobación de cuadros.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginBottom: '1rem' }}>
            {fotos.map(f => (
              <div key={f.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ccc' }}>
                <img src={f.foto_url} alt="Evidencia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {mant.estado !== 'completado' && (
                  <button onClick={() => deleteFoto(f.id, f.foto_url)} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(230,51,41,0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                )}
              </div>
            ))}
            
            {mant.estado !== 'completado' && (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #0A2342', borderRadius: '8px', aspectRatio: '1', cursor: 'pointer', backgroundColor: '#f0f4f8', color: '#0A2342' }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
                <Camera size={24} style={{ marginBottom: '5px' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{uploading ? 'Subiendo...' : 'Añadir PDF/Foto'}</span>
              </label>
            )}
          </div>
        </div>

        {/* FASE CIERRE */}
        {mant.estado === 'en_curso' && (
          <div className="card" style={{ padding: '1rem', backgroundColor: '#f0f4f8', border: '2px dashed var(--primary-color)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Cierre de Mantenimiento</h3>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={firmaRequerida} onChange={(e) => setFirmaRequerida(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
              <span style={{ fontWeight: 600 }}>Firma del cliente requerida</span>
            </label>

            {firmaRequerida && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #ddd' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>Nombre del Cliente (Firmante)</label>
                <input type="text" value={nombreFirma} onChange={e => setNombreFirma(e.target.value)} className="form-input" placeholder="D. Juan Pérez" style={{ marginBottom: '1rem' }} />
                
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>Firma</label>
                <div style={{ border: '2px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', marginBottom: '0.5rem' }}>
                  <SignatureCanvas ref={sigCanvas} penColor="blue" canvasProps={{ width: 300, height: 150, className: 'sigCanvas' }} />
                </div>
                <button onClick={() => sigCanvas.current.clear()} style={{ background: 'none', border: 'none', color: '#E63329', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <RotateCcw size={14} /> Borrar Firma
                </button>
              </div>
            )}

            <button onClick={() => changeStatus('completado')} disabled={statusLoading} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', backgroundColor: '#28a745', borderColor: '#28a745', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={20} /> COMPLETAR MANTENIMIENTO
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

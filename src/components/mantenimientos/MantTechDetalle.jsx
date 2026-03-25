import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, MapPin, Play, CheckCircle, RotateCcw, Save, Download, ArrowLeft, WifiOff, Wifi } from 'lucide-react';
import { supabase } from '../../supabase';
import { LOGO_BASE64 } from '../../logo';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';

const HIERARCHY = { anual: 4, semestral: 3, trimestral: 2, mensual: 1 };

export function MantTechDetalle({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const sigCanvas = useRef({});
  
  const [mant, setMant] = useState(null);
  const [puertas, setPuertas] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [step, setStep] = useState(1);
  const [horaInicio, setHoraInicio] = useState(null);
  const [horaFin, setHoraFin] = useState(null);
  
  // Paso 2: Checklist
  const [respuestas, setRespuestas] = useState({}); // { [id_plantilla]: { respuesta, observacion, foto_url, file } }
  
  // Paso 3: Observaciones generales
  const [observaciones, setObservaciones] = useState('');
  
  // Paso 4: Firma
  const [sinFirma, setSinFirma] = useState(false);
  const [sinFirmaMotivo, setSinFirmaMotivo] = useState('');
  const [nombreFirma, setNombreFirma] = useState('');
  
  const [syncing, setSyncing] = useState(false);

  // Network listeners
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // Fetch initial data or load from cache
  useEffect(() => {
    fetchData();
  }, [id]);

  // Save to cache constantly
  useEffect(() => {
    if (mant) {
      const stateToSave = {
        step, horaInicio, horaFin, respuestas, observaciones, sinFirma, sinFirmaMotivo, nombreFirma
      };
      localStorage.setItem(`mant_draft_${id}`, JSON.stringify(stateToSave));
    }
  }, [step, horaInicio, horaFin, respuestas, observaciones, sinFirma, sinFirmaMotivo, nombreFirma, id, mant]);

  const fetchData = async () => {
    try {
      // Fetch Mant
      const { data: mData, error: mError } = await supabase
        .from('Mantenimientos')
        .select(`*, Instalaciones(direccion, Clientes_Mant(razon_social), Puertas(*))`)
        .eq('id', id)
        .single();
      if (mError) throw mError;
      
      setMant(mData);
      const doors = mData.Instalaciones?.Puertas || [];
      setPuertas(doors);
      
      // Load draft from localstorage if available
      const draftStr = localStorage.getItem(`mant_draft_${id}`);
      if (draftStr && mData.estado !== 'completado') {
        const draft = JSON.parse(draftStr);
        setStep(draft.step || 1);
        setHoraInicio(draft.horaInicio || mData.hora_inicio);
        setHoraFin(draft.horaFin || mData.hora_fin);
        setRespuestas(draft.respuestas || {});
        setObservaciones(draft.observaciones || mData.observaciones || '');
        setSinFirma(draft.sinFirma || !!mData.sin_firma_motivo);
        setSinFirmaMotivo(draft.sinFirmaMotivo || mData.sin_firma_motivo || '');
        setNombreFirma(draft.nombreFirma || mData.firma_nombre || '');
      } else {
        if (mData.estado === 'en_curso') setStep(2);
        if (mData.estado === 'completado') setStep(5);
        setHoraInicio(mData.hora_inicio);
        setHoraFin(mData.hora_fin);
        setObservaciones(mData.observaciones || '');
        setSinFirma(!!mData.sin_firma_motivo);
        setSinFirmaMotivo(mData.sin_firma_motivo || '');
        setNombreFirma(mData.firma_nombre || '');
      }

      // Fetch Plantillas
      const requiredFreqLevel = HIERARCHY[mData.frecuencia] || 1;
      const { data: pData } = await supabase.from('Checklist_Plantillas').select('*').order('orden');
      
      const filteredPlantillas = (pData || []).filter(p => {
        const pLevel = HIERARCHY[p.frecuencia];
        const freqMatch = pLevel <= requiredFreqLevel;
        const typeMatch = p.tipo_puerta === 'todos' || doors.some(d => d.tipo === p.tipo_puerta);
        return freqMatch && typeMatch;
      });
      setPlantillas(filteredPlantillas);
      
      // Fetch answers if completed
      if (mData.estado === 'completado') {
        const { data: rData } = await supabase.from('Checklist_Respuestas').select('*').eq('id_mantenimiento', id);
        const rObj = {};
        (rData || []).forEach(r => {
          rObj[r.id_plantilla] = { respuesta: r.respuesta, observacion: r.observacion, foto_url: r.url_foto };
        });
        setRespuestas(prev => Object.keys(prev).length > 0 ? prev : rObj);
      }

      // Save for offline
      localStorage.setItem(`mant_cache_${id}`, JSON.stringify({ mData, doors, filteredPlantillas }));
    } catch (err) {
      if (!isOnline) {
        const cacheStr = localStorage.getItem(`mant_cache_${id}`);
        if (cacheStr) {
          const { mData, doors, filteredPlantillas } = JSON.parse(cacheStr);
          setMant(mData); setPuertas(doors); setPlantillas(filteredPlantillas);
          const draftStr = localStorage.getItem(`mant_draft_${id}`);
          if (draftStr) {
            const draft = JSON.parse(draftStr);
            setStep(draft.step || 1);
            setRespuestas(draft.respuestas || {});
            setObservaciones(draft.observaciones || '');
          }
        } else {
          alert("Sin conexión y sin datos en caché para este mantenimiento.");
        }
      } else {
        alert("Error cargando datos: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const iniciarVisita = async () => {
    const time = new Date().toISOString();
    setHoraInicio(time);
    setStep(2);
    if (isOnline) {
      await supabase.from('Mantenimientos').update({ estado: 'en_curso', hora_inicio: time }).eq('id', id);
    }
  };

  const handleRespuesta = (id_plantilla, key, value) => {
    setRespuestas(prev => ({
      ...prev,
      [id_plantilla]: { ...prev[id_plantilla], [key]: value }
    }));
  };

  const handleChecklistUpload = async (id_plantilla, file) => {
    if (!file) return;
    const cacheUrl = URL.createObjectURL(file);
    handleRespuesta(id_plantilla, 'foto_url', cacheUrl);
    handleRespuesta(id_plantilla, 'file', file); // Store file to upload later
  };

  const completarVisita = async () => {
    // Validations
    const sinResponder = plantillas.some(p => !respuestas[p.id]?.respuesta);
    if (sinResponder) return alert("Por favor, responde todas las preguntas del checklist.");
    
    const sinTextoMal = plantillas.some(p => respuestas[p.id]?.respuesta === 'Mal estado' && (!respuestas[p.id]?.observacion || respuestas[p.id].observacion.trim() === ''));
    if (sinTextoMal) return alert("Por favor, escriba obligatoriamente la observación para los ítems marcados como 'Mal estado'.");

    // Check mandatory photos (optional if just mal estado, mandatory if defined in DB)
    const faltaFoto = plantillas.some(p => {
      const resp = respuestas[p.id];
      return p.foto_obligatoria && !resp?.foto_url && !resp?.file;
    });
    if (faltaFoto) return alert("Falta subir evidencia fotográfica para puntos de revisión críticos.");

    if (!sinFirma && !nombreFirma) return alert("Debe introducir el nombre del firmante.");
    if (!sinFirma && sigCanvas.current.isEmpty && sigCanvas.current.isEmpty()) return alert("Debe recoger la firma del cliente.");
    if (sinFirma && !sinFirmaMotivo) return alert("Indique el motivo de la falta de firma.");

    const timeEnd = new Date().toISOString();
    setHoraFin(timeEnd);

    if (!isOnline) {
      alert("Completado guardado en cola offline. Sincronice cuando recupere la conexión.");
      setStep(5);
      return; 
    }

    await syncToServer(timeEnd);
  };

  const syncToServer = async (finalTime) => {
    setSyncing(true);
    try {
      // 1. Upload signature
      let signatureUrl = mant.firma_url;
      if (!sinFirma && sigCanvas.current && !sigCanvas.current.isEmpty()) {
        const sigData = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
        const sigBlob = await (await fetch(sigData)).blob();
        const fname = `firma_m_${id}_${Date.now()}.png`;
        const { error: sE } = await supabase.storage.from('luvematic_docs').upload(fname, sigBlob);
        if (!sE) {
          signatureUrl = supabase.storage.from('luvematic_docs').getPublicUrl(fname).data.publicUrl;
        }
      }

      // 2. Upload checklist photos & prepare DB rows
      const dbRespuestas = [];
      const dbFotosExtra = [];

      for (const p of plantillas) {
        let finalUrl = respuestas[p.id]?.foto_url;
        const fileObj = respuestas[p.id]?.file;

        // Si es un Blob/File local (no subido aun)
        if (fileObj && fileObj instanceof File) {
          const fx = fileObj.name.split('.').pop();
          const fn = `check_${id}_${p.id}_${Date.now()}.${fx}`;
          const { error: ue } = await supabase.storage.from('luvematic_docs').upload(fn, fileObj);
          if (!ue) {
            finalUrl = supabase.storage.from('luvematic_docs').getPublicUrl(fn).data.publicUrl;
          }
        }

        if (respuestas[p.id]) {
          dbRespuestas.push({
            id_mantenimiento: id,
            id_plantilla: p.id,
            respuesta: respuestas[p.id].respuesta,
            observacion: respuestas[p.id].observacion || '',
            url_foto: finalUrl || null
          });
          
          if (respuestas[p.id].respuesta === 'Mal estado' && finalUrl) {
            // Also add to general fotos log for backwards compatibility in other views
            dbFotosExtra.push({
              id_mantenimiento: id,
              id_tecnico: user.id,
              foto_url: finalUrl
            });
          }
        }
      }

      // Remove old answers and insert new
      await supabase.from('Checklist_Respuestas').delete().eq('id_mantenimiento', id);
      let savedRespuestas = [];
      if (dbRespuestas.length > 0) {
        const { data } = await supabase.from('Checklist_Respuestas').insert(dbRespuestas).select();
        savedRespuestas = data || [];
      }
      if (dbFotosExtra.length > 0) {
        await supabase.from('Fotos_Mantenimientos').insert(dbFotosExtra);
      }

      // 3. Update Mantenimiento payload
      const payload = {
        estado: 'completado',
        hora_fin: finalTime || horaFin || new Date().toISOString(),
        observaciones: observaciones,
        sin_firma_motivo: sinFirma ? sinFirmaMotivo : null,
        firma_nombre: sinFirma ? null : nombreFirma,
        firma_url: sinFirma ? null : signatureUrl
      };
      
      if (horaInicio) payload.hora_inicio = horaInicio;

      await supabase.from('Mantenimientos').update(payload).eq('id', id);

      // 4. Auto-generar Incidencias reales para el módulo de Mantenimientos si existen puntos en "Mal estado"
      const ptsMalEstado = savedRespuestas.filter(r => r.respuesta === 'Mal estado');
      if (ptsMalEstado.length > 0) {
        // Find if this exact maintenance already generated incidencias
        const { data: existIncidencias } = await supabase.from('Incidencias')
          .select('id_checklist_respuesta')
          .eq('id_mantenimiento', id);
          
        const existSet = new Set((existIncidencias || []).map(e => e.id_checklist_respuesta));

        const newIncidencias = ptsMalEstado.filter(r => !existSet.has(r.id)).map(r => {
          const pDesc = plantillas.find(p => p.id === r.id_plantilla)?.descripcion || 'Punto de revisión';
          return {
            id_mantenimiento: id,
            id_checklist_respuesta: r.id,
            id_puerta: mant.Instalaciones?.Puertas?.[0]?.id || null, // Best guess at the affected door
            estado: 'Detectada',
            descripcion: `Fallo detectado en: ${pDesc}\nObservaciones del técnico: ${r.observacion || 'Sin observaciones detalladas.'}`
          };
        });

        if (newIncidencias.length > 0) {
          await supabase.from('Incidencias').insert(newIncidencias);
        }
      }

      // Clean local storage
      localStorage.removeItem(`mant_draft_${id}`);
      
      setStep(5);
      alert("¡Sincronización exitosa! Mantenimiento cerrado.");
      fetchData(); 
    } catch (err) {
      alert("Error en sincronización: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const generatePDF = async () => {
    const doc = new jsPDF();
    const now = new Date();
    let cy = 20;
    const addPageIfNeeded = (h) => { if (cy + h > 280) { doc.addPage(); cy = 20; } };

    // Header exactly like Avisos
    try { doc.addImage(LOGO_BASE64, 'PNG', 10, 8, 55, 18); } catch (e) { }
    
    doc.setTextColor(10, 35, 66); 
    doc.setFontSize(20); 
    doc.setFont(undefined, 'bold');
    doc.text(`Certificado Técnico de Mantenimiento`, 75, 20);
    doc.setFont(undefined, 'normal'); 
    doc.setDrawColor(10, 35, 66); 
    doc.setLineWidth(0.8); 
    doc.line(10, 32, 200, 32); 

    // Cliente Box
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(240, 247, 255); 
    doc.roundedRect(10, 38, 190, 36, 3, 3, 'F');
    doc.setFontSize(12); doc.setFont(undefined, 'bold'); 
    doc.text('Información del Cliente y Mantenimiento', 14, 46);
    
    doc.setFont(undefined, 'normal'); doc.setFontSize(10);
    doc.text(`Nombre: ${mant.Instalaciones?.Clientes_Mant?.razon_social || 'N/A'}`, 14, 54); 
    doc.text(`Dirección: ${mant.Instalaciones?.direccion || 'N/A'}`, 14, 60);
    
    doc.text(`Frecuencia: ${mant.frecuencia.toUpperCase()}`, 110, 54); 
    doc.text(`Fecha Mantenimiento: ${new Date(mant.fecha_programada).toLocaleDateString('es-ES')}`, 110, 60);
    
    doc.text(`Entrada: ${horaInicio ? new Date(horaInicio).toLocaleTimeString('es-ES') : '--:--'}`, 14, 68);
    doc.text(`Salida: ${horaFin ? new Date(horaFin).toLocaleTimeString('es-ES') : '--:--'}`, 110, 68);

    cy = 85;

    // Checklist Title
    doc.setFillColor(240, 247, 255); 
    doc.roundedRect(10, cy, 190, 10, 3, 3, 'F');
    doc.setFontSize(12); doc.setFont(undefined, 'bold'); 
    doc.text('Checklist de Puntos de Revisión', 14, cy + 7);
    cy += 16;

    doc.setFontSize(10);
    plantillas.forEach(p => {
      addPageIfNeeded(20);
      const resp = respuestas[p.id];
      doc.setFont(undefined, 'bold');
      doc.text("• " + p.descripcion, 14, cy);
      doc.setFont(undefined, 'normal');
      
      let resText = 'SIN RESPUESTA';
      let resColor = [0,0,0];
      if (resp?.respuesta === 'OK') { resText = 'OK'; resColor = [40, 167, 69]; }
      if (resp?.respuesta === 'Mal estado') { resText = 'MAL ESTADO'; resColor = [220, 53, 69]; }
      if (resp?.respuesta === 'N/A') { resText = 'N/A'; resColor = [100, 100, 100]; }
      
      doc.setTextColor(...resColor);
      doc.setFont(undefined, 'bold');
      doc.text(resText, 175, cy);
      doc.setTextColor(0,0,0);
      doc.setFont(undefined, 'normal');
      
      if (resp?.observacion) {
        cy += 5;
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('Anotación: ' + doc.splitTextToSize(resp.observacion, 165).join(' '), 18, cy);
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
      }
      cy += 7;
    });

    cy += 5;
    addPageIfNeeded(50);
    
    // Observaciones Generales
    if (observaciones) {
      const sp = doc.splitTextToSize(observaciones, 178); 
      const bh = 12 + (sp.length * 5);
      doc.setFillColor(240, 247, 255); 
      doc.roundedRect(10, cy - 2, 190, bh, 3, 3, 'F');
      doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(10, 35, 66); 
      doc.text('Observaciones Generales:', 14, cy + 6);
      doc.setFont(undefined, 'normal'); doc.setTextColor(0, 0, 0); doc.setFontSize(10); 
      doc.text(sp, 14, cy + 14);
      cy = cy + bh + 10;
    }
    
    addPageIfNeeded(60);

    // Firmas
    doc.setFillColor(240, 247, 255); 
    doc.roundedRect(10, cy, 190, 45, 3, 3, 'F');
    doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(10, 35, 66);
    doc.text('Firma y Conformidad', 14, cy + 8);
    doc.setFont(undefined, 'normal'); doc.setTextColor(0, 0, 0); doc.setFontSize(10);
    
    if (sinFirma) {
      doc.text(`Nota: No se recoge firma en el lugar de la asistencia.`, 14, cy + 16);
      doc.text(`Motivo: ${sinFirmaMotivo}`, 14, cy + 22);
    } else {
      doc.text(`Aceptado por: ${nombreFirma || 'N/A'}`, 14, cy + 16);
      if (mant.firma_url) {
        try {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.src = mant.firma_url;
          await new Promise(r => { img.onload = () => { doc.addImage(img, 'PNG', 14, cy + 20, 50, 25); r(); }; });
        } catch(e) {}
      }
    }

    // Pie
    doc.setFillColor(10, 35, 66); 
    doc.rect(0, 285, 210, 12, 'F'); 
    doc.setFontSize(8); 
    doc.setTextColor(255, 255, 255);
    doc.text('LUVEMATIC © ' + now.getFullYear() + ` | Ref. Certificado: LVM-M-${id.split('-')[0].toUpperCase()}`, 14, 291); 
    doc.text('Mantenimiento', 180, 291);

    doc.save(`Mantenimiento_${mant.Instalaciones?.Clientes_Mant?.razon_social || 'Cliente'}_${new Date(mant.fecha_programada).toISOString().split('T')[0]}.pdf`);
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando detalles...</div>;
  if (!mant) return <div style={{ padding: '2rem', textAlign: 'center' }}>Mantenimiento no encontrado.</div>;

  return (
    <div className="mobile-view">
      {/* HEADER */}
      <div className="tech-header" style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'white', borderBottom: '2px solid #eee', padding: '1rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}><ArrowLeft size={24} color="#0A2342" /></button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0A2342' }}>{mant.Instalaciones?.Clientes_Mant?.razon_social}</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{mant.Instalaciones?.direccion}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          {isOnline ? <span style={{ fontSize: '0.65rem', color: '#28a745', display: 'flex', alignItems: 'center', gap: '2px' }}><Wifi size={10} /> Online</span> 
                    : <span style={{ fontSize: '0.65rem', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '2px' }}><WifiOff size={10} /> Offline</span>}
          <span style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '12px', fontWeight: 800, color: 'white', backgroundColor: HIERARCHY[mant.frecuencia] ? '#0A2342' : '#999', textTransform: 'uppercase' }}>{mant.frecuencia}</span>
        </div>
      </div>

      <div style={{ padding: '1rem' }}>
        {/* NAV & STATUS */}
          <div className="nav-btn-container" style={{ marginBottom: '1rem' }}>
            <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mant.Instalaciones?.direccion)}`, '_blank')} className="btn-navegar" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', padding: '1.2rem', fontSize: '1.1rem', fontWeight: 800, borderRadius: '8px', border: '2px solid #ccc', backgroundColor: '#f9f9f9', color: '#555', cursor: 'pointer', transition: 'all 0.3s ease' }}>
              <MapPin size={24} /> NAVEGAR A INSTALACIÓN
            </button>
            <style>{`
              .btn-navegar:hover, .btn-navegar:active { border-color: #0A2342 !important; color: #0A2342 !important; background-color: #eaf1f8 !important; }
            `}</style>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
          {step === 5 && isOnline && (
            <button onClick={generatePDF} className="btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <Download size={18} /> PDF
            </button>
          )}
          {step === 5 && !isOnline && (
             <button onClick={() => syncToServer(horaFin)} disabled={syncing} className="btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px', backgroundColor: '#FF9800' }}>
               {syncing ? 'Sincronizando...' : 'Sincronizar a Nube'}
             </button>
          )}
        </div>

        {/* STEP 1: INICIO */}
        {step === 1 && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Bienvenido a la visita</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Asegúrese de estar en la instalación antes de comenzar.</p>
            <button onClick={iniciarVisita} className="btn-primary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '1rem', width: '100%', fontSize: '1.1rem' }}>
              <Play size={20} /> INICIAR VISITA Y CRONÓMETRO
            </button>
          </div>
        )}

        {/* STEP 2, 3, 4: WIZARD */}
        {step >= 2 && step <= 4 && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '1.5rem' }}>
              {[2,3,4].map(s => <div key={s} style={{ flex: 1, height: '6px', borderRadius: '3px', backgroundColor: step >= s ? '#0A2342' : '#ddd' }} />)}
            </div>

            {/* PASO 2: CHECKLIST */}
            {step === 2 && (
               <div>
                 <h2 style={{ marginBottom: '1rem' }}>Paso 2: Puntos de Revisión ({plantillas.length})</h2>
                 {plantillas.map(p => {
                   const isMal = respuestas[p.id]?.respuesta === 'Mal estado';
                   const reqPhoto = p.foto_obligatoria || isMal;
                   return (
                     <div key={p.id} className="card" style={{ padding: '1rem', marginBottom: '1rem', borderLeft: respuestas[p.id]?.respuesta ? `4px solid ${respuestas[p.id].respuesta === 'OK' ? '#28a745' : respuestas[p.id].respuesta === 'Mal estado' ? '#dc3545' : '#6c757d'}` : '4px solid #ddd' }}>
                        <p style={{ fontWeight: 600, marginTop: 0, marginBottom: '0.8rem' }}>{p.descripcion}</p>
                        <div style={{ display: 'flex', gap: '5px', marginBottom: isMal ? '1rem' : 0 }}>
                          {['OK', 'Mal estado', 'N/A'].map(opt => (
                            <button key={opt} onClick={() => handleRespuesta(p.id, 'respuesta', opt)}
                              style={{ flex: 1, padding: '0.6rem', border: '1px solid #ccc', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, 
                                backgroundColor: respuestas[p.id]?.respuesta === opt ? '#0A2342' : 'white', color: respuestas[p.id]?.respuesta === opt ? 'white' : '#333' }}>
                              {opt}
                            </button>
                          ))}
                        </div>
                        
                        {isMal && (
                          <div style={{ marginTop: '0.8rem' }}>
                            <textarea 
                              placeholder="Observaciones de la incidencia..." 
                              className="form-input" 
                              value={respuestas[p.id]?.observacion || ''}
                              onChange={e => handleRespuesta(p.id, 'observacion', e.target.value)}
                              style={{ marginBottom: '0.5rem' }} 
                            />
                          </div>
                        )}
                        
                        {reqPhoto && (
                          <div style={{ marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1rem', backgroundColor: '#f0f4f8', border: '1px dashed #0A2342', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleChecklistUpload(p.id, e.target.files[0])} />
                              <Camera size={16} color="#0A2342" /> {respuestas[p.id]?.foto_url ? 'Cambiar Foto' : (p.foto_obligatoria ? 'Adjuntar Foto (Obligatorio)' : 'Adjuntar Foto (Opcional)')}
                            </label>
                            {respuestas[p.id]?.foto_url && <img src={respuestas[p.id].foto_url} alt="Evidencia" style={{ height: '40px', width: '40px', objectFit: 'cover', borderRadius: '4px' }} />}
                          </div>
                        )}
                     </div>
                   );
                 })}
                 <button onClick={() => setStep(3)} className="btn-primary" style={{ width: '100%', padding: '1rem' }}>Continuar a Observaciones</button>
               </div>
            )}

            {/* PASO 3: OBS GENERALES */}
             {step === 3 && (
                <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '60vh' }}>
                  <h2 style={{ marginBottom: '1rem' }}>Paso 3: Observaciones Generales</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Añade cualquier recomendación, consumo de material o trabajo extra no cubierto en el checklist.</p>
                  <textarea 
                    className="form-input" 
                    value={observaciones}
                    onChange={e => setObservaciones(e.target.value)}
                    placeholder="Ej: Se requiere cambiar próximamente el rodamiento superior..."
                    style={{ flex: 1, resize: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                    <button onClick={() => setStep(2)} className="btn-secondary" style={{ flex: 1 }}>Atrás</button>
                    <button onClick={() => setStep(4)} className="btn-primary" style={{ flex: 1 }}>Continuar</button>
                  </div>
                </div>
             )}

            {/* PASO 4: FIRMA Y CIERRE */}
            {step === 4 && (
               <div className="card" style={{ padding: '1.5rem', backgroundColor: '#f0f4f8', border: '2px dashed var(--primary-color)' }}>
                 <h2 style={{ marginBottom: '1rem' }}>Paso 4: Cierre con Cliente</h2>
                 
                 <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', cursor: 'pointer' }}>
                   <input type="checkbox" checked={sinFirma} onChange={(e) => { setSinFirma(e.target.checked); if(e.target.checked) sigCanvas.current?.clear(); }} style={{ transform: 'scale(1.2)' }} />
                   <span style={{ fontWeight: 600 }}>Sin firma — Cliente ausente</span>
                 </label>

                 {sinFirma ? (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>Justificación requerida</label>
                      <input type="text" value={sinFirmaMotivo} onChange={e => setSinFirmaMotivo(e.target.value)} className="form-input" placeholder="Ej: No había ningún responsable en el recinto" />
                    </div>
                 ) : (
                    <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #ddd' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>Nombre del Cliente (Firmante)</label>
                      <input type="text" value={nombreFirma} onChange={e => setNombreFirma(e.target.value)} className="form-input" placeholder="D. Juan Pérez" style={{ marginBottom: '1rem' }} />
                      
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>Firma</label>
                      <div style={{ border: '2px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9', marginBottom: '0.5rem' }}>
                        <SignatureCanvas ref={sigCanvas} penColor="blue" canvasProps={{ width: window.innerWidth > 400 ? 300 : 250, height: 150, className: 'sigCanvas' }} />
                      </div>
                      <button onClick={() => sigCanvas.current.clear()} style={{ background: 'none', border: 'none', color: '#E63329', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <RotateCcw size={14} /> Borrar Firma
                      </button>
                    </div>
                 )}

                 <div style={{ display: 'flex', gap: '10px' }}>
                   <button onClick={() => setStep(3)} className="btn-secondary" style={{ flex: 1 }}>Atrás</button>
                   <button onClick={completarVisita} disabled={syncing} className="btn-primary" style={{ flex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', backgroundColor: '#28a745', borderColor: '#28a745' }}>
                     {syncing ? 'Guardando...' : <><CheckCircle size={20} /> COMPLETAR Y GUARDAR</>}
                   </button>
                 </div>
               </div>
            )}
          </div>
        )}

        {/* STEP 5: COMPLETED */}
        {step === 5 && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f0fff4', borderColor: '#28a745' }}>
            <CheckCircle size={48} color="#28a745" style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ color: '#28a745', margin: 0 }}>Mantenimiento Cerrado</h2>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Hora de entrada: {horaInicio ? new Date(horaInicio).toLocaleTimeString('es-ES') : '--:--'}</p>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>Hora de salida: {horaFin ? new Date(horaFin).toLocaleTimeString('es-ES') : '--:--'}</p>
            
            {!isOnline && (
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '8px', fontSize: '0.85rem' }}>
                <strong>Modo Offline Activo</strong><br />El parte de asistencia se ha guardado localmente. Pulse "Sincronizar a Nube" arriba cuando recupere la cobertura.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

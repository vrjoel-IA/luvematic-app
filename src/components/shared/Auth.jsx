// Shared components: Login, ModuleSelection, PendingApproval
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Wrench } from 'lucide-react';
import { supabase } from '../../supabase';

export function Login({ setAuth }) {
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
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        if (authData.user) {
          const { error: insertError } = await supabase.from('Usuarios').insert([{
            id_usuario: authData.user.id,
            nombre_completo: nombreCompleto,
            email: email,
            rol: 'Usuario',
            activo: true
          }]);
          if (insertError) throw new Error("LUVEMATIC: " + (insertError.message || insertError.details || JSON.stringify(insertError)));
        }

        alert("Registro exitoso. Ahora puedes iniciar sesión.");
        setIsRegistering(false);
        setPassword('');
      } else {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;

        const { data: userData, error: profileError } = await supabase
          .from('Usuarios').select('*').eq('id_usuario', authData.user.id).single();

        if (profileError || !userData) throw new Error('Perfil de usuario no encontrado.');
        if (!userData.activo) throw new Error('El usuario está inactivo.');

        const userPayload = { id: userData.id_usuario, rol: userData.rol, nombre: userData.nombre_completo };
        localStorage.setItem('luvematic_user', JSON.stringify(userPayload));
        setAuth(userPayload);

        if (userData.rol === 'Administrador' || userData.rol === 'Direccion' || userData.rol === 'Tecnico') {
          navigate('/select-module');
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
          {isRegistering ? 'Crear Cuenta Nueva' : 'Gestión Técnica'}
        </h2>

        {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleAuth}>
          {isRegistering && (
            <div className="input-group">
              <label>Nombre Completo</label>
              <input type="text" value={nombreCompleto} onChange={e => setNombreCompleto(e.target.value)} required={isRegistering} placeholder="Ej: Juan Pérez" />
            </div>
          )}
          <div className="input-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com" />
          </div>
          <div className="input-group">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength="6" />
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Procesando...' : (isRegistering ? 'Registrarse' : 'Iniciar Sesión')}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isRegistering ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?'}
          </p>
          <button type="button" onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            style={{ background: 'none', border: 'none', color: '#0A2342', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}>
            {isRegistering ? 'Inicia sesión aquí' : 'Regístrate aquí'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModuleSelection({ user }) {
  const navigate = useNavigate();

  const handleAvisos = () => {
    if (user.rol === 'Administrador' || user.rol === 'Direccion') navigate('/admin');
    else if (user.rol === 'Tecnico') navigate('/tecnico');
  };

  const handleMantenimientos = () => {
    if (user.rol === 'Administrador' || user.rol === 'Direccion') navigate('/admin/mantenimientos');
    else if (user.rol === 'Tecnico') navigate('/tecnico/mantenimientos');
  };

  return (
    <div className="auth-container">
      <div className="login-card" style={{ maxWidth: '800px', width: '90%', padding: '3rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <img src="/logo.png" alt="LUVEMATIC" className="logo" style={{ height: '60px', marginBottom: '1rem' }} />
          <h2 style={{ color: 'var(--text-muted)' }}>Selecciona un Módulo</h2>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          <div onClick={handleAvisos} className="module-card">
            <div className="icon-container"><Wrench size={48} /></div>
            <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'inherit' }}>AVISOS</h2>
            <p style={{ marginTop: '1rem', opacity: 0.8, color: 'var(--text-muted)' }}>Gestión de averías e incidencias</p>
          </div>

          <div onClick={handleMantenimientos} className="module-card">
            <div className="icon-container"><ClipboardList size={48} /></div>
            <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'inherit' }}>MANTENIMIENTOS</h2>
            <p style={{ marginTop: '1rem', opacity: 0.8, color: 'var(--text-muted)' }}>Revisiones y preventivos</p>
          </div>
        </div>
        
        <div style={{ marginTop: '3rem', textAlign: 'center' }}>
          <button onClick={() => { localStorage.clear(); window.location.href = '/'; }} className="btn-danger" style={{ width: 'auto' }}>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}

export function PendingApproval({ setAuth }) {
  return (
    <div className="auth-container">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <img src="/logo.png" alt="LUVEMATIC" className="logo" />
        <h2 style={{ color: 'var(--text-muted)' }}>Cuenta en Revisión</h2>
        <p style={{ marginTop: '1rem', marginBottom: '2rem' }}>
          Tu cuenta ha sido creada exitosamente, pero aún no tiene permisos asignados (Técnico, Administrador o Dirección).
          Por favor, espera a que un administrador valide tu acceso.
        </p>
        <button onClick={() => { localStorage.clear(); setAuth(null); }} className="btn-primary">
          Cerrar Sesión / Volver a inicio
        </button>
      </div>
    </div>
  );
}

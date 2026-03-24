import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

// Shared
import { Login, ModuleSelection, PendingApproval } from './components/shared/Auth';

// Avisos
import { AdminDashboard, AdminAvisos, AdminClientes, ClienteAvisos } from './components/avisos/AdminViews';
import { AdminProductividad, AdminUsuarios } from './components/avisos/AdminManagement';
import { CreateAviso } from './components/avisos/CreateAviso';
import { AvisoDetailAdmin } from './components/avisos/AvisoDetailAdmin';
import { TechDashboard, TechAvisoDetail } from './components/avisos/TechViews';

// Mantenimientos
import { MantDashboardAdmin, MantDashboardTech } from './components/mantenimientos/MantViews';
import { MantClientes } from './components/mantenimientos/MantClientes';
import { MantClienteDetalle } from './components/mantenimientos/MantClienteDetalle';
import { MantInstalacionDetalle } from './components/mantenimientos/MantInstalacionDetalle';
import { MantContratos } from './components/mantenimientos/MantContratos';
import { MantListado } from './components/mantenimientos/MantListado';
import { MantPlanificacion } from './components/mantenimientos/MantPlanificacion';
import { MantGrupos } from './components/mantenimientos/MantGrupos';

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('luvematic_user')));

  const isAdmin = user?.rol === 'Administrador' || user?.rol === 'Direccion';
  const isTech = user?.rol === 'Tecnico';

  return (
    <Router>
      <Routes>
        {/* Auth */}
        <Route path="/" element={
          user ? (
            (isAdmin || isTech) ? <Navigate to="/select-module" /> : <Navigate to="/espera" />
          ) : <Login setAuth={setUser} />
        } />
        <Route path="/select-module" element={user ? <ModuleSelection user={user} /> : <Navigate to="/" />} />
        <Route path="/espera" element={user && user.rol === 'Usuario' ? <PendingApproval setAuth={setUser} /> : <Navigate to="/" />} />

        {/* ========== AVISOS ========== */}
        {/* Admin & Direccion */}
        <Route path="/admin" element={isAdmin ? <AdminDashboard user={user} /> : <Navigate to="/" />} />
        <Route path="/admin/avisos" element={isAdmin ? <AdminAvisos user={user} /> : <Navigate to="/" />} />
        <Route path="/admin/clientes" element={isAdmin ? <AdminClientes user={user} /> : <Navigate to="/" />} />
        <Route path="/admin/cliente-avisos" element={isAdmin ? <ClienteAvisos user={user} /> : <Navigate to="/" />} />
        <Route path="/admin/create-aviso" element={isAdmin ? <CreateAviso user={user} /> : <Navigate to="/" />} />
        <Route path="/admin/aviso/:id" element={isAdmin ? <AvisoDetailAdmin user={user} /> : <Navigate to="/" />} />

        {/* Direccion Only */}
        <Route path="/admin/productividad" element={user?.rol === 'Direccion' ? <AdminProductividad user={user} /> : <Navigate to="/" />} />
        <Route path="/admin/usuarios" element={user?.rol === 'Direccion' ? <AdminUsuarios user={user} /> : <Navigate to="/" />} />

        {/* Tech Avisos */}
        <Route path="/tecnico" element={isTech ? <TechDashboard user={user} /> : <Navigate to="/" />} />
        <Route path="/tecnico/aviso/:id" element={isTech ? <TechAvisoDetail /> : <Navigate to="/" />} />

        {/* ========== MANTENIMIENTOS ========== */}
        <Route path="/admin/mantenimientos" element={isAdmin ? <MantDashboardAdmin user={user} /> : <Navigate to="/" />} />
        <Route path="/admin/mantenimientos/clientes" element={isAdmin ? <MantClientes user={user} /> : <Navigate to="/" />} />
        <Route path="/admin/mantenimientos/cliente/:id" element={isAdmin ? <MantClienteDetalle user={user} /> : <Navigate to="/" />} />
        <Route path="/admin/mantenimientos/instalacion/:id" element={isAdmin ? <MantInstalacionDetalle user={user} /> : <Navigate to="/" />} />
        <Route path="/admin/mantenimientos/contratos/:clienteId" element={isAdmin ? <MantContratos user={user} /> : <Navigate to="/" />} />
        <Route path="/admin/mantenimientos/listado" element={isAdmin ? <MantListado user={user} /> : <Navigate to="/" />} />
        <Route path="/admin/mantenimientos/planificacion" element={isAdmin ? <MantPlanificacion user={user} /> : <Navigate to="/" />} />
        <Route path="/admin/mantenimientos/grupos" element={isAdmin ? <MantGrupos user={user} /> : <Navigate to="/" />} />
        <Route path="/tecnico/mantenimientos" element={isTech ? <MantDashboardTech user={user} /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

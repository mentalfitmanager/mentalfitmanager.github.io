import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom"; // <-- 1. MODIFICA QUI
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Pagine e Layout
import MainLayout from "./components/MainLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import NewClient from "./pages/NewClient";
import ClientDetail from "./pages/ClientDetail";
import EditClient from './pages/EditClient';
import Updates from './pages/Updates';
import AdminChat from './pages/AdminChat';
import ClientLogin from "./pages/ClientLogin";
import FirstAccess from "./pages/FirstAccess";
import ClientDashboard from "./pages/ClientDashboard";
import ClientAnamnesi from './pages/ClientAnamnesi';
import ClientChecks from './pages/ClientChecks';
import ClientPayments from './pages/ClientPayments';
import ClientChat from './pages/ClientChat';
import ForgotPassword from './pages/ForgotPassword';

const AuthSpinner = () => (
  <div className="flex justify-center items-center min-h-screen bg-background text-foreground">
    Caricamento...
  </div>
);

// Componente "Guardiano" che protegge le rotte
const ProtectedRoute = ({ isAllowed, redirectPath, children }) => {
  if (!isAllowed) {
    return <Navigate to={redirectPath} replace />;
  }
  return children ? children : <Outlet />;
};

export default function App() {
  const [authInfo, setAuthInfo] = useState({
    isLoading: true,
    user: null,
    isClient: false,
  });

  useEffect(() => {
    const sessionRole = sessionStorage.getItem('app_role');
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const clientDocRef = doc(db, 'clients', currentUser.uid);
        const clientDoc = await getDoc(clientDocRef);
        const isCurrentUserAClient = clientDoc.exists() && clientDoc.data().isClient;
        if (sessionRole === 'admin' && isCurrentUserAClient) {
          await signOut(auth);
          return;
        }
        setAuthInfo({
          isLoading: false,
          user: currentUser,
          isClient: isCurrentUserAClient,
        });
      } else {
        sessionStorage.removeItem('app_role');
        setAuthInfo({ isLoading: false, user: null, isClient: false });
      }
    });
    return () => unsubscribe();
  }, []);

  if (authInfo.isLoading) {
    return <AuthSpinner />;
  }

  return (
    <HashRouter> {/* <-- 2. MODIFICA QUI */}
      <Routes>
        {/* === ROTTE PUBBLICHE (visibili da tutti) === */}
        <Route path="/login" element={<Login />} />
        <Route path="/client-login" element={<ClientLogin />} />
        <Route path="/client/forgot-password" element={<ForgotPassword />} />

        {/* === ROTTE PROTETTE PER L'ADMIN === */}
        <Route element={<ProtectedRoute isAllowed={authInfo.user && !authInfo.isClient} redirectPath="/login" />}>
            <Route element={<MainLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/new" element={<NewClient />} />
                <Route path="/client/:clientId" element={<ClientDetail />} />
                <Route path="/edit/:clientId" element={<EditClient />} />
                <Route path="/updates" element={<Updates />} />
                <Route path="/chat" element={<AdminChat />} />
            </Route>
        </Route>

        {/* === ROTTE PROTETTE PER IL CLIENTE === */}
         <Route element={<ProtectedRoute isAllowed={authInfo.user && authInfo.isClient} redirectPath="/client-login" />}>
            <Route path="/client/first-access" element={<FirstAccess />} />
            <Route path="/client/dashboard" element={<ClientDashboard />} />
            <Route path="/client/anamnesi" element={<ClientAnamnesi />} />
            <Route path="/client/checks" element={<ClientChecks />} />
            <Route path="/client/payments" element={<ClientPayments />} />
            <Route path="/client/chat" element={<ClientChat />} />
        </Route>
        
        {/* Rotta catch-all per reindirizzare l'utente se va su un URL non valido */}
        <Route 
            path="*" 
            element={
                !authInfo.user 
                    ? <Navigate to="/login" /> 
                    : authInfo.isClient 
                        ? <Navigate to="/client/dashboard" /> 
                        : <Navigate to="/" />
            } 
        />
      </Routes>
    </HashRouter>
  );
}


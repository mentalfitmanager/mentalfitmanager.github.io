import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

import MainLayout from "./components/MainLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard"; 
import Clients from "./pages/Clients";
import NewClient from "./pages/NewClient";
import ClientDetail from "./pages/ClientDetail";
import EditClient from './pages/EditClient';
import Updates from './pages/Updates'; // <-- 1. Importiamo la nuova pagina

const AuthSpinner = () => (
  <div className="flex justify-center items-center min-h-screen bg-background text-foreground">
    Caricamento...
  </div>
);

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
    });
    return () => unsubscribe();
  }, []);

  if (user === undefined) {
    return <AuthSpinner />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
        <Route 
          path="/*" 
          element={
            user ? (
              <MainLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/new" element={<NewClient />} />
                  <Route path="/client/:clientId" element={<ClientDetail />} />
                  <Route path="/edit/:clientId" element={<EditClient />} />
                  
                  {/* 2. Aggiungiamo la rotta per la pagina Aggiornamenti */}
                  <Route path="/updates" element={<Updates />} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </MainLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}


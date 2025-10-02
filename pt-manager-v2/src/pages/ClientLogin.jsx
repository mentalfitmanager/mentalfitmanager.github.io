import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // <-- Aggiungi 'Link'
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from '../firebase.js'; 

const ClientLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const userDocRef = doc(db, "clients", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists() && userDoc.data().isClient === true) {
                
                sessionStorage.setItem('app_role', 'client');

                const isFirstLogin = userDoc.data().firstLogin === true;

                if (isFirstLogin) {
                    navigate('/client/first-access');
                } else {
                    navigate('/client/dashboard');
                }
            } else {
                setError("Accesso non autorizzato. Area riservata ai clienti.");
                await signOut(auth);
            }
        } catch (err) {
            setError("Credenziali non valide. Riprova.");
            console.error("Errore di login:", err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg backdrop-filter backdrop-blur-lg bg-opacity-50">
                <h2 className="text-3xl font-bold text-center text-cyan-400">Accesso Area Clienti</h2>
                <p className="text-center text-gray-300">Usa le credenziali fornite dal tuo coach.</p>
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-400">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-400">Password</label>
                            {/* --- LINK AGGIUNTO QUI (visibile solo su schermi piccoli) --- */}
                            <Link to="/client/forgot-password" className="text-xs text-gray-400 hover:text-cyan-400 sm:hidden">
                                Password dimenticata?
                            </Link>
                        </div>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <div>
                        <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500">
                            Accedi
                        </button>
                    </div>
                </form>

                {/* --- LINK AGGIUNTO QUI (visibile solo su schermi grandi) --- */}
                <div className="text-center hidden sm:block">
                    <Link to="/client/forgot-password" className="text-sm text-gray-400 hover:text-cyan-400 hover:underline">
                        Password dimenticata?
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ClientLogin;


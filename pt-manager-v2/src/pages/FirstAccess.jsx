import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from '../firebase.js'; // Uso il percorso corretto

const FirstAccess = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();
    const auth = getAuth();
    const user = auth.currentUser;

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!user) {
            setError("Utente non autenticato. Per favore, effettua nuovamente il login.");
            setTimeout(() => navigate('/client-login'), 3000); // Assicurati che il percorso sia '/client-login' o quello corretto
            return;
        }

        if (newPassword.length < 6) {
            setError("La nuova password deve contenere almeno 6 caratteri.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Le password non coincidono. Riprova.");
            return;
        }

        try {
            // 1. Aggiorna la password in Firebase Authentication
            await updatePassword(user, newPassword);

            // 2. Aggiorna il flag 'firstLogin' in Firestore a 'false'
            const userDocRef = doc(db, "clients", user.uid);
            await updateDoc(userDocRef, {
                firstLogin: false
            });

            setSuccess("Password aggiornata con successo! Sarai reindirizzato alla tua dashboard tra poco.");
            setTimeout(() => {
                navigate('/client/dashboard'); // Reindirizza alla dashboard del cliente
            }, 3000);

        } catch (err) {
            setError("Si è verificato un errore. Potrebbe essere necessario effettuare nuovamente il login prima di riprovare.");
            console.error("Errore durante l'aggiornamento della password:", err);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg">
                <h2 className="text-3xl font-bold text-center text-cyan-400">Imposta la tua Password</h2>
                <p className="text-center text-gray-300">Per la tua sicurezza, scegli una password personale per i futuri accessi.</p>
                <form onSubmit={handleChangePassword} className="space-y-6">
                    <div>
                        <label htmlFor="new-password" className="block text-sm font-medium text-gray-400">Nuova Password</label>
                        <input
                            id="new-password"
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-400">Conferma Nuova Password</label>
                        <input
                            id="confirm-password"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    {success && <p className="text-green-500 text-sm text-center">{success}</p>}
                    <div>
                        <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:opacity-50" disabled={!!success}>
                            {success ? 'Reindirizzamento...' : 'Imposta Nuova Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FirstAccess;

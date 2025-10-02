import React, { useState } from 'react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { Link } from 'react-router-dom';
import { FiMail, FiArrowLeft } from 'react-icons/fi';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const auth = getAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, email);
            setMessage('Email di reset inviata con successo! Controlla la tua casella di posta.');
        } catch (err) {
            setError('Nessun utente trovato con questa email. Controlla che sia corretta.');
            console.error("Errore nel reset password:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg">
                <h2 className="text-3xl font-bold text-center text-cyan-400">Recupera Password</h2>
                <p className="text-center text-gray-300">Inserisci la tua email per ricevere un link di recupero.</p>
                
                {message ? (
                    <div className="text-center p-4 bg-green-500/20 text-green-300 rounded-lg">
                        <p>{message}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-400">Email</label>
                            <div className="relative mt-1">
                                <FiMail className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                                />
                            </div>
                        </div>

                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                        <div>
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full px-4 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-gray-500"
                            >
                                {loading ? 'Invio in corso...' : 'Invia Link di Recupero'}
                            </button>
                        </div>
                    </form>
                )}
                
                <div className="text-center">
                    <Link to="/client-login" className="text-sm text-cyan-400 hover:underline flex items-center justify-center gap-2">
                        <FiArrowLeft /> Torna al Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;

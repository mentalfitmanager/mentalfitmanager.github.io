import React, { useState, useEffect } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase.js'; // Assicurati che il percorso sia corretto
import { useNavigate, Link } from 'react-router-dom';
import { FiUser, FiCalendar, FiCheckSquare, FiMessageSquare, FiLogOut, FiBarChart2 } from 'react-icons/fi';

// Componente per lo spinner di caricamento
const LoadingSpinner = () => (
    <div className="min-h-screen bg-gray-900 text-white flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500"></div>
    </div>
);

// Componente per le card della dashboard
const DashboardCard = ({ title, value, subtext, icon }) => (
    <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg backdrop-blur-sm border border-white/10">
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-300">{title}</h3>
            <div className="text-cyan-400">{icon}</div>
        </div>
        <p className="text-3xl font-bold text-white mt-2">{value}</p>
        <p className="text-sm text-gray-400 mt-1">{subtext}</p>
    </div>
);

const ClientDashboard = () => {
    const [clientData, setClientData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const auth = getAuth();
    const user = auth.currentUser;

    useEffect(() => {
        if (user) {
            const fetchClientData = async () => {
                const clientDocRef = doc(db, 'clients', user.uid);
                const docSnap = await getDoc(clientDocRef);
                if (docSnap.exists()) {
                    setClientData(docSnap.data());
                } else {
                    console.error("Dati del cliente non trovati!");
                    // Se non troviamo i dati, potrebbe essere un errore, quindi facciamo il logout
                    await signOut(auth);
                    navigate('/client-login');
                }
                setLoading(false);
            };
            fetchClientData();
        } else {
            // Se non c'è un utente, reindirizza al login
            navigate('/client-login');
        }
    }, [user, navigate]);

    const handleLogout = () => {
        signOut(auth).then(() => {
            navigate('/client-login');
        });
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!clientData) {
        return <p>Errore nel caricamento dei dati.</p>;
    }

    // Calcolo dei giorni rimanenti
    let giorniRimanenti = 'N/D';
    let dataScadenzaFormatted = 'Non impostata';
    if (clientData.scadenza && clientData.scadenza.toDate) {
        const scadenzaDate = clientData.scadenza.toDate();
        const oggi = new Date();
        // Imposta l'ora a mezzanotte per entrambi per un calcolo corretto dei giorni
        scadenzaDate.setHours(0, 0, 0, 0);
        oggi.setHours(0, 0, 0, 0);
        const diffTime = scadenzaDate - oggi;
        giorniRimanenti = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        dataScadenzaFormatted = scadenzaDate.toLocaleDateString('it-IT');
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 font-sans">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-cyan-400">Ciao, {clientData.name}!</h1>
                    <p className="text-gray-300">Benvenuto nella tua area personale.</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    <FiLogOut />
                    <span>Logout</span>
                </button>
            </header>

            <main>
                {/* Sezione Riepilogo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <DashboardCard 
                        title="Scadenza Percorso" 
                        value={`${giorniRimanenti} giorni`} 
                        subtext={`Scade il: ${dataScadenzaFormatted}`}
                        icon={<FiCalendar size={24} />}
                    />
                    <DashboardCard 
                        title="Tipo Percorso" 
                        value={clientData.planType || 'Non specificato'}
                        subtext="Il tuo piano attuale"
                        icon={<FiBarChart2 size={24} />}
                    />
                    <DashboardCard 
                        title="Prossimo Check" 
                        value="Da pianificare" 
                        subtext="Rimani costante!"
                        icon={<FiCheckSquare size={24} />}
                    />
                </div>

                {/* Sezione Azioni Rapide */}
                <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg backdrop-blur-sm border border-white/10">
                    <h3 className="text-2xl font-bold mb-4 text-white">Cosa vuoi fare?</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link to="/client/anamnesi" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-4 rounded-lg text-center transition-colors flex flex-col items-center justify-center gap-2">
                            <FiUser size={22} /> La mia Anamnesi
                        </Link>
                         <Link to="/client/checks" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-4 rounded-lg text-center transition-colors flex flex-col items-center justify-center gap-2">
                            <FiCheckSquare size={22} /> I miei Check
                        </Link>
                         <Link to="/client/payments" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-4 rounded-lg text-center transition-colors flex flex-col items-center justify-center gap-2">
                             <FiBarChart2 size={22} /> I miei Pagamenti
                        </Link>
                        <Link to="/client/chat" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-4 rounded-lg text-center transition-colors flex flex-col items-center justify-center gap-2">
                            <FiMessageSquare size={22} /> Chatta con il Coach
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ClientDashboard;


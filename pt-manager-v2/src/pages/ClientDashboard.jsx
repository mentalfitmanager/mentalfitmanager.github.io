import React, { useState, useEffect } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.js'; 
import { useNavigate, Link } from 'react-router-dom';
import { FiUser, FiCalendar, FiCheckSquare, FiMessageSquare, FiLogOut, FiBarChart2, FiDollarSign } from 'react-icons/fi';

// --- LOGO SVG (Solo Icona) ---
const LogoIcon = () => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="#22d3ee" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="w-8 h-8"
    >
        <path d="M12 2a10 10 0 0 0-7 3c-1.5 1.5-2 4.5-2 7a10 10 0 0 0 14 0c0-2.5.5-5.5 2-7a10 10 0 0 0-7-3z" fill="rgba(34, 211, 238, 0.1)"/>
        <circle cx="9" cy="11" r="1.5" fill="#22d3ee" />
        <circle cx="15" cy="13" r="1.5" fill="#22d3ee" />
        <path d="M10.5 11.5 L13.5 12.5" stroke="#22d3ee" strokeWidth="2" />
    </svg>
);
// --------------------------

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

export default function ClientDashboard() {
    const [clientData, setClientData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [nextCheckDate, setNextCheckDate] = useState('Da pianificare');
    const navigate = useNavigate();
    const auth = getAuth();
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) {
            navigate('/client-login');
            return;
        }

        // Carica i dati principali del cliente
        const clientDocRef = doc(db, 'clients', user.uid);
        const unsubClient = onSnapshot(clientDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.firstLogin) {
                    navigate('/client/first-access', { replace: true });
                    return;
                }
                setClientData(data);
            } else {
                console.error("Dati del cliente non trovati!");
                signOut(auth).then(() => navigate('/client-login'));
            }
            setLoading(false);
        });

        // --- LOGICA CORRETTA: Carica i check per calcolare il prossimo suggerito ---
        const checksCollectionRef = collection(db, `clients/${user.uid}/checks`);
        const q = query(checksCollectionRef, orderBy('createdAt', 'desc')); // Dal più recente al più vecchio

        const unsubChecks = onSnapshot(q, (snapshot) => {
            const checksData = snapshot.docs.map(doc => doc.data());
            if (checksData.length > 0) {
                // Prendi la data dell'ULTIMO check inviato
                const lastCheckDate = checksData[0].createdAt.toDate();
                let nextDate = new Date(lastCheckDate.getTime());
                
                // Aggiungi 7 giorni per il prossimo suggerimento
                nextDate.setDate(nextDate.getDate() + 7);

                setNextCheckDate(nextDate.toLocaleDateString('it-IT'));
            } else {
                setNextCheckDate('Invia il 1° check');
            }
        });

        return () => {
            unsubClient();
            unsubChecks();
        };
    }, [user, navigate]);

    const handleLogout = () => {
        signOut(auth).then(() => navigate('/client-login'));
    };

    if (loading || (clientData && clientData.firstLogin)) {
        return <LoadingSpinner />;
    }

    if (!clientData) {
        return <p>Errore nel caricamento dei dati.</p>;
    }

    // Calcolo giorni rimanenti (scadenza percorso)
    let giorniRimanenti = 'N/D';
    let dataScadenzaFormatted = 'Non impostata';
    if (clientData.scadenza && clientData.scadenza.toDate) {
        const scadenzaDate = clientData.scadenza.toDate();
        const oggi = new Date();
        scadenzaDate.setHours(0, 0, 0, 0);
        oggi.setHours(0, 0, 0, 0);
        const diffTime = scadenzaDate - oggi;
        giorniRimanenti = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        dataScadenzaFormatted = scadenzaDate.toLocaleDateString('it-IT');
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 font-sans">
            <header className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <LogoIcon />
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-cyan-400">Ciao, {clientData.name}!</h1>
                        <p className="text-gray-300">Benvenuto nella tua area personale.</p>
                    </div>
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
                    {/* --- CARD AGGIORNATA CON LA NUOVA LOGICA --- */}
                    <DashboardCard 
                        title="Prossimo Check Consigliato" 
                        value={nextCheckDate} 
                        subtext="Rimani costante!"
                        icon={<FiCheckSquare size={24} />}
                    />
                </div>

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
                             <FiDollarSign size={22} /> I miei Pagamenti
                        </Link>
                        <Link to="/client/chat" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-4 rounded-lg text-center transition-colors flex flex-col items-center justify-center gap-2">
                            <FiMessageSquare size={22} /> Chatta con il Coach
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}


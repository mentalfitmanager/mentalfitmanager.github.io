import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCalendar, FiDollarSign, FiRefreshCw } from 'react-icons/fi';

const LoadingSpinner = () => (
    <div className="min-h-screen bg-gray-900 text-white flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500"></div>
    </div>
);

// Funzione helper per formattare le date in modo sicuro
const formatDate = (timestamp) => {
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString('it-IT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    return 'Data non disponibile';
};

const ClientPayments = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const auth = getAuth();
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) {
            navigate('/client-login');
            return;
        }

        const paymentsCollectionRef = collection(db, `clients/${user.uid}/payments`);
        const q = query(paymentsCollectionRef, orderBy('paymentDate', 'desc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const paymentsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPayments(paymentsData);
            setLoading(false);
        }, (error) => {
            console.error("Errore nel caricare i pagamenti:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, navigate]);

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 font-sans">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-cyan-400">Storico Pagamenti</h1>
                <button
                    onClick={() => navigate('/client/dashboard')}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-700/80 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    <FiArrowLeft /><span>Dashboard</span>
                </button>
            </header>

            <main className="bg-gray-800/50 p-6 rounded-xl shadow-lg backdrop-blur-sm border border-white/10">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="p-4 text-sm font-semibold text-gray-300"><FiCalendar className="inline mr-2" />Data</th>
                                <th className="p-4 text-sm font-semibold text-gray-300"><FiDollarSign className="inline mr-2" />Importo</th>
                                <th className="p-4 text-sm font-semibold text-gray-300"><FiRefreshCw className="inline mr-2" />Durata</th>
                                <th className="p-4 text-sm font-semibold text-gray-300 hidden sm:table-cell">Metodo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.length > 0 ? (
                                payments.map(payment => (
                                    <tr key={payment.id} className="border-b border-white/5 last:border-b-0">
                                        <td className="p-4">{formatDate(payment.paymentDate)}</td>
                                        <td className="p-4 font-semibold text-cyan-400">€ {payment.amount?.toFixed(2)}</td>
                                        <td className="p-4">{payment.duration}</td>
                                        <td className="p-4 hidden sm:table-cell">{payment.paymentMethod || 'Non specificato'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="text-center text-gray-500 p-8">
                                        Non è stato registrato ancora nessun pagamento.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

export default ClientPayments;

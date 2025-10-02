import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { FiSave, FiMessageSquare } from 'react-icons/fi';

// Stili per il calendario (gli stessi del cliente per coerenza)
const calendarStyles = `
.react-calendar { width: 100%; background: rgba(17, 24, 39, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 1rem; backdrop-filter: blur(10px); }
.react-calendar__tile, .react-calendar__month-view__weekdays__weekday { color: white; }
.react-calendar__navigation button { color: #22d3ee; font-weight: bold; }
.react-calendar__tile--now { background: rgba(55, 65, 81, 0.7); border-radius: 0.5rem; }
.react-calendar__tile--active { background: #0891b2; border-radius: 0.5rem; }
.react-calendar__tile:enabled:hover, .react-calendar__tile:enabled:focus { background: rgba(55, 65, 81, 1); border-radius: 0.5rem; }
.check-submitted-by-client { background-color: rgba(34, 197, 94, 0.5); border-radius: 50%; }
`;

const AdminCheckManager = ({ clientId }) => {
    const [checks, setChecks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedCheck, setSelectedCheck] = useState(null);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const checksCollectionRef = collection(db, `clients/${clientId}/checks`);
        const q = query(checksCollectionRef, orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const checksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setChecks(checksData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [clientId]);

    const handleDateChange = (date) => {
        setSelectedDate(date);
        const checkOnDate = checks.find(c => c.createdAt && c.createdAt.toDate().toDateString() === date.toDateString());
        setSelectedCheck(checkOnDate || null);
        setFeedbackText(checkOnDate?.coachFeedback || '');
    };
    
    const tileClassName = ({ date, view }) => {
        if (view === 'month') {
            const hasCheck = checks.some(c => c.createdAt && c.createdAt.toDate().toDateString() === date.toDateString());
            if (hasCheck) return 'check-submitted-by-client';
        }
    };
    
    const handleSaveFeedback = async () => {
        if (!selectedCheck) return;
        setIsSaving(true);
        try {
            const checkDocRef = doc(db, 'clients', clientId, 'checks', selectedCheck.id);
            await updateDoc(checkDocRef, {
                coachFeedback: feedbackText,
                feedbackUpdatedAt: serverTimestamp()
            });
            alert('Feedback salvato!');
        } catch (error) {
            console.error("Errore salvataggio feedback:", error);
            alert('Errore nel salvataggio.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <style>{calendarStyles}</style>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
                {/* Colonna Calendario */}
                <div className="lg:col-span-1">
                     <Calendar onChange={handleDateChange} value={selectedDate} tileClassName={tileClassName} />
                </div>

                {/* Colonna Dettagli Check e Feedback */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedCheck ? (
                        <div className="bg-card p-6 rounded-xl border border-white/10">
                            <h3 className="text-xl font-semibold text-primary">Dettagli Check del {selectedCheck.createdAt.toDate().toLocaleDateString('it-IT')}</h3>
                             <div className="mt-4 space-y-4">
                                <div><h4 className="font-semibold text-muted">Peso Registrato:</h4><p className="text-white text-xl font-bold">{selectedCheck.weight} kg</p></div>
                                <div><h4 className="font-semibold text-muted">Note del Cliente:</h4><p className="text-gray-300 p-3 bg-background rounded-lg">{selectedCheck.notes || 'Nessuna nota.'}</p></div>
                                <div><h4 className="font-semibold text-muted">Foto Caricate:</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">{selectedCheck.photoURLs && Object.values(selectedCheck.photoURLs).map((url, i) => <a href={url} target="_blank" rel="noopener noreferrer"><img key={i} src={url} alt={`foto ${i}`} className="rounded-lg w-full h-auto"/></a>)}</div></div>
                            </div>
                            <div className="mt-6 pt-4 border-t border-white/10">
                                <h4 className="font-semibold text-muted flex items-center gap-2"><FiMessageSquare /> Lascia un Feedback</h4>
                                <textarea 
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    rows="4"
                                    className="w-full mt-2 p-2 bg-background border border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="Scrivi qui le tue note, che saranno visibili al cliente..."
                                ></textarea>
                                <div className="flex justify-end mt-2">
                                    <button onClick={handleSaveFeedback} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition font-semibold disabled:opacity-50">
                                        <FiSave /> {isSaving ? 'Salvataggio...' : 'Salva Feedback'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full bg-card p-6 rounded-xl border border-white/10 text-muted">
                            <p>Seleziona un giorno dal calendario per vedere i dettagli del check.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default AdminCheckManager;

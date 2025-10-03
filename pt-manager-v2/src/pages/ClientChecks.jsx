// src/pages/client/ClientChecks.jsx

import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
// -- MODIFICA: Aggiunto 'getDoc' per leggere il documento del cliente
import { collection, query, onSnapshot, addDoc, doc, updateDoc, serverTimestamp, orderBy, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../firebase.js'; // Assicurati che il percorso sia corretto
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { FiArrowLeft, FiEdit, FiCamera, FiSend, FiXCircle } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';

// Stili per il calendario (invariati)
const calendarStyles = `
.react-calendar { width: 100%; background: rgba(31, 41, 55, 0.5); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 1rem; backdrop-filter: blur(10px); font-family: sans-serif; }
.react-calendar__tile, .react-calendar__month-view__weekdays__weekday { color: white; padding: 0.75em 0.5em; }
.react-calendar__navigation button { color: #22d3ee; font-weight: bold; font-size: 1.1em; }
.react-calendar__tile--now { background: rgba(55, 65, 81, 0.7); border-radius: 0.5rem; }
.react-calendar__tile--active { background: #0891b2; border-radius: 0.5rem; }
.react-calendar__tile:enabled:hover, .react-calendar__tile:enabled:focus { background: rgba(55, 65, 81, 1); border-radius: 0.5rem; }
.check-submitted { background-color: rgba(34, 197, 94, 0.5); border-radius: 50%; }
.suggested-day { box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.6); border-radius: 50%; }
`;

// Componenti interni (invariati)
const LoadingSpinner = () => ( <div className="min-h-screen bg-gray-900 text-white flex justify-center items-center"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500"></div></div> );
const ClientUploadForm = ({ formState, setFormState, handleSubmit, isUploading, handleFileChange }) => { const handleCancel = () => setFormState({ id: null, notes: '', weight: '', photos: {}, photoPreviews: {} }); const PhotoUploader = ({ type, label, preview }) => ( <div className="text-center"><label className="block text-sm font-medium text-gray-300">{label}</label><div className="mt-2 flex justify-center items-center w-full h-48 bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-600 relative">{preview ? <img src={preview} alt="preview" className="h-full w-full object-contain rounded-lg"/> : <div className="flex flex-col items-center text-gray-400"><FiCamera size={40}/><p className="mt-2 text-sm">Carica foto</p></div>}<input type="file" accept="image/*" onChange={(e) => handleFileChange(e, type)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/></div></div> ); return ( <div><div className="flex justify-between items-center"><h3 className="font-bold text-lg mb-4 text-cyan-400">{formState.id ? 'Modifica Check' : 'Carica Nuovo Check'}</h3><button onClick={handleCancel} className="text-gray-400 hover:text-white"><FiXCircle size={20}/></button></div><form onSubmit={handleSubmit} className="space-y-6"><div><label className="block text-sm font-medium text-gray-300 mb-2">Peso Attuale (kg)*</label><input type="number" step="0.1" value={formState.weight} onChange={(e) => setFormState(prev => ({ ...prev, weight: e.target.value }))} required className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500" placeholder="Es. 75.5"/></div><div><label className="block text-sm font-medium text-gray-300 mb-2">Note sul check</label><textarea value={formState.notes} onChange={(e) => setFormState(prev => ({ ...prev, notes: e.target.value }))} rows="4" className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500"></textarea></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><PhotoUploader type="front" label="Frontale" preview={formState.photoPreviews.front}/><PhotoUploader type="right" label="Laterale Destro" preview={formState.photoPreviews.right}/><PhotoUploader type="left" label="Laterale Sinistro" preview={formState.photoPreviews.left}/><PhotoUploader type="back" label="Posteriore" preview={formState.photoPreviews.back}/></div><div className="flex justify-end"><button type="submit" disabled={isUploading} className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition font-semibold disabled:opacity-50"><FiSend/> {isUploading ? 'Salvataggio...' : (formState.id ? 'Salva Modifiche' : 'Invia Check')}</button></div></form></div> );};
const CheckDetails = ({ check, handleEditClick }) => { const isEditable = (new Date() - check.createdAt.toDate()) / (1000 * 60 * 60) < 2; return ( <div><div className="flex justify-between items-center"><h3 className="font-bold text-lg text-cyan-400">Riepilogo del {check.createdAt.toDate().toLocaleDateString('it-IT')}</h3>{isEditable && <button onClick={() => handleEditClick(check)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg"><FiEdit/> Modifica</button>}</div><div className="mt-4 space-y-6"><div><h4 className="font-semibold text-gray-300">Peso Registrato:</h4><p className="text-white text-xl font-bold">{check.weight} kg</p></div><div><h4 className="font-semibold text-gray-300">Le tue note:</h4><p className="text-gray-400 p-3 bg-gray-900/50 rounded-lg min-h-[50px] whitespace-pre-wrap">{check.notes || 'Nessuna nota fornita.'}</p></div><div><h4 className="font-semibold text-gray-300">Feedback del Coach:</h4><p className="text-cyan-300 p-3 bg-cyan-900/30 rounded-lg min-h-[50px] whitespace-pre-wrap">{check.coachNotes || 'Il tuo coach non ha ancora lasciato un feedback.'}</p></div><div><h4 className="font-semibold text-gray-300">Le tue foto:</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">{check.photoURLs && Object.values(check.photoURLs).map((url, i) => ( <a key={i} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`foto check ${i}`} className="rounded-lg w-full h-auto aspect-square object-cover"/></a> ))}</div></div></div></div> );};

export default function ClientChecks() {
    const [checks, setChecks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [formState, setFormState] = useState({ id: null, notes: '', weight: '', photos: {}, photoPreviews: {} });
    const [isUploading, setIsUploading] = useState(false);
    
    // -- MODIFICA: Nuovo stato per memorizzare la data del prossimo check dal DB
    const [nextCheckDate, setNextCheckDate] = useState(null);
    
    const navigate = useNavigate();
    const auth = getAuth();
    const user = auth.currentUser;
    const storage = getStorage();

    useEffect(() => {
        if (!user) { navigate('/client-login'); return; }

        // Listener per i check (invariato)
        const checksCollectionRef = collection(db, `clients/${user.uid}/checks`);
        const q = query(checksCollectionRef, orderBy('createdAt', 'desc'));
        const unsubscribeChecks = onSnapshot(q, (snapshot) => {
            setChecks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        // -- MODIFICA: Nuovo listener per leggere il campo `prossimoCheck` dal documento del cliente
        const clientDocRef = doc(db, `clients/${user.uid}`);
        const unsubscribeClient = onSnapshot(clientDocRef, (doc) => {
            if (doc.exists() && doc.data().prossimoCheck) {
                setNextCheckDate(doc.data().prossimoCheck.toDate());
            }
        });

        return () => {
            unsubscribeChecks();
            unsubscribeClient(); // Pulisce entrambi i listener
        };
    }, [user, navigate]);

    // -- MODIFICA: La logica del calendario ora si basa su `nextCheckDate` dal DB
    const tileClassName = ({ date, view }) => {
        if (view === 'month') {
            const isSubmitted = checks.some(c => c.createdAt && c.createdAt.toDate().toDateString() === date.toDateString());
            if (isSubmitted) return 'check-submitted';
            
            if (nextCheckDate && date.toDateString() === nextCheckDate.toDateString()) {
                return 'suggested-day';
            }
        }
    };
    
    const handleFileChange = (e, type) => { /* ...invariato... */ const file = e.target.files[0]; if (file) setFormState(prev => ({...prev, photos: {...prev.photos, [type]: file}, photoPreviews: {...prev.photoPreviews, [type]: URL.createObjectURL(file)}})); };
    const handleEditClick = (check) => { /* ...invariato... */ setSelectedDate(check.createdAt.toDate()); setFormState({id: check.id, notes: check.notes, weight: check.weight, photos: {}, photoPreviews: check.photoURLs}); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { id, notes, weight, photos } = formState;
        if (!user || !weight) { alert("Per favore, compila almeno il peso."); return; }
        setIsUploading(true);
        try {
            const existingCheck = id ? checks.find(c => c.id === id) : null;
            let photoURLs = existingCheck ? { ...existingCheck.photoURLs } : {};
            await Promise.all(Object.entries(photos).map(async ([type, file]) => { if(file) { const filePath = `clients/${user.uid}/checks/${uuidv4()}-${file.name}`; const fileRef = ref(storage, filePath); await uploadBytes(fileRef, file); photoURLs[type] = await getDownloadURL(fileRef); } }));
            
            const checkData = { notes, weight: parseFloat(weight), photoURLs };

            if (id) { // Logica di modifica (invariata)
                await updateDoc(doc(db, `clients/${user.uid}/checks`, id), {...checkData, lastUpdatedAt: serverTimestamp()});
                alert('Check modificato con successo!');
            } else { // Logica di creazione
                await addDoc(collection(db, `clients/${user.uid}/checks`), {...checkData, createdAt: selectedDate});
                
                // -- MODIFICA: Aggiunta la logica per aggiornare `prossimoCheck`
                const clientDocRef = doc(db, 'clients', user.uid);
                const clientDoc = await getDoc(clientDocRef);

                if (clientDoc.exists() && clientDoc.data().prossimoCheck) {
                    const currentDueDate = clientDoc.data().prossimoCheck.toDate();
                    const nextDueDate = new Date(currentDueDate);
                    nextDueDate.setDate(currentDueDate.getDate() + 7); // Aggiunge 7 giorni alla scadenza programmata
                    await updateDoc(clientDocRef, { prossimoCheck: nextDueDate });
                }
                
                alert('Check caricato con successo! La prossima scadenza è stata aggiornata.');
            }
            setFormState({ id: null, notes: '', weight: '', photos: {}, photoPreviews: {} });
        } catch (error) { console.error("Errore:", error); alert("Si è verificato un errore."); } 
        finally { setIsUploading(false); }
    };

    const renderContentForDate = () => { /* ...invariato... */ const checkOnDate = checks.find(c => c.createdAt && c.createdAt.toDate().toDateString() === selectedDate.toDateString()); if (formState.id) { return <ClientUploadForm {...{ formState, setFormState, handleSubmit, isUploading, handleFileChange }} />; } if (checkOnDate) { return <CheckDetails check={checkOnDate} handleEditClick={handleEditClick} />; } return <ClientUploadForm {...{ formState, setFormState, handleSubmit, isUploading, handleFileChange }} />; };

    if (loading) return <LoadingSpinner />;

    return (
        <>
            <style>{calendarStyles}</style>
            <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 font-sans">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-cyan-400">I miei Check</h1>
                    <button onClick={() => navigate('/client/dashboard')} className="flex items-center gap-2 px-3 py-2 bg-gray-700/80 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors"><FiArrowLeft /><span>Dashboard</span></button>
                </header>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <div className="mb-4 text-xs text-gray-400 flex flex-col gap-2">
                           <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-500/50"></div> Check inviato</div>
                           <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full shadow-[0_0_0_2px_rgba(34,211,238,0.6)]"></div> Giorno di check</div>
                        </div>
                        <Calendar onChange={(date) => { setFormState({ id: null, notes: '', weight: '', photos: {}, photoPreviews: {} }); setSelectedDate(date); }} value={selectedDate} tileClassName={tileClassName} />
                    </div>
                    <div className="lg:col-span-2 bg-gray-800/50 p-6 rounded-xl border border-white/10 min-h-[400px]">
                        {renderContentForDate()}
                    </div>
                </div>
            </div>
        </>
    );
}
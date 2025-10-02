import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, query, onSnapshot, addDoc, doc, getDoc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../firebase.js';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { FiArrowLeft, FiEdit, FiCamera, FiSend, FiXCircle } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';

// Stili per il calendario. Vengono inseriti direttamente per semplicità.
const calendarStyles = `
.react-calendar { width: 100%; background: rgba(31, 41, 55, 0.5); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 1rem; backdrop-filter: blur(10px); font-family: sans-serif; }
.react-calendar__tile, .react-calendar__month-view__weekdays__weekday { color: white; padding: 0.75em 0.5em; }
.react-calendar__navigation button { color: #22d3ee; font-weight: bold; font-size: 1.1em; }
.react-calendar__tile--now { background: rgba(55, 65, 81, 0.7); border-radius: 0.5rem; }
.react-calendar__tile--active { background: #0891b2; border-radius: 0.5rem; }
.react-calendar__tile:enabled:hover, .react-calendar__tile:enabled:focus { background: rgba(55, 65, 81, 1); border-radius: 0.5rem; }
.check-day { background-color: rgba(220, 38, 38, 0.4); border-radius: 50%; font-weight: bold; }
.check-submitted { background-color: rgba(34, 197, 94, 0.5); border-radius: 50%; }
`;

// -- COMPONENTI INTERNI ALLA PAGINA --

const LoadingSpinner = () => (
    <div className="min-h-screen bg-gray-900 text-white flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500"></div>
    </div>
);

// Form di caricamento per il cliente
const ClientUploadForm = ({ formState, setFormState, handleSubmit, isUploading, handleFileChange }) => {
    const handleCancel = () => setFormState({ id: null, notes: '', weight: '', photos: {}, photoPreviews: {} });

    const PhotoUploader = ({ type, label, preview }) => (
        <div className="text-center"><label className="block text-sm font-medium text-gray-300">{label}</label><div className="mt-2 flex justify-center items-center w-full h-48 bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-600 relative">{preview ? <img src={preview} alt="preview" className="h-full w-full object-contain rounded-lg"/> : <div className="flex flex-col items-center text-gray-400"><FiCamera size={40}/><p className="mt-2 text-sm">Carica foto</p></div>}<input type="file" accept="image/*" onChange={(e) => handleFileChange(e, type)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/></div></div>
    );

    return (
        <div>
            <div className="flex justify-between items-center"><h3 className="font-bold text-lg mb-4 text-cyan-400">{formState.id ? 'Modifica Check' : 'Carica Check del Giorno'}</h3><button onClick={handleCancel} className="text-gray-400 hover:text-white"><FiXCircle size={20}/></button></div>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Peso Attuale (kg)*</label><input type="number" step="0.1" value={formState.weight} onChange={(e) => setFormState(prev => ({ ...prev, weight: e.target.value }))} required className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500" placeholder="Es. 75.5"/></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Note sul check</label><textarea value={formState.notes} onChange={(e) => setFormState(prev => ({ ...prev, notes: e.target.value }))} rows="4" className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500"></textarea></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><PhotoUploader type="front" label="Frontale" preview={formState.photoPreviews.front}/><PhotoUploader type="right" label="Laterale Destro" preview={formState.photoPreviews.right}/><PhotoUploader type="left" label="Laterale Sinistro" preview={formState.photoPreviews.left}/><PhotoUploader type="back" label="Posteriore" preview={formState.photoPreviews.back}/></div>
                <div className="flex justify-end"><button type="submit" disabled={isUploading} className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition font-semibold disabled:opacity-50"><FiSend/> {isUploading ? 'Salvataggio...' : (formState.id ? 'Salva Modifiche' : 'Invia Check')}</button></div>
            </form>
        </div>
    );
};

// Riepilogo di un check già inviato
const CheckDetails = ({ check, handleEditClick }) => {
    const isEditable = (new Date() - check.createdAt.toDate()) / (1000 * 60 * 60) < 2; // 2 ore
    return (
        <div>
            <div className="flex justify-between items-center"><h3 className="font-bold text-lg text-cyan-400">Riepilogo del {check.createdAt.toDate().toLocaleDateString('it-IT')}</h3>{isEditable && <button onClick={() => handleEditClick(check)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg"><FiEdit/> Modifica</button>}</div>
            <div className="mt-4 space-y-4">
                <div><h4 className="font-semibold text-gray-300">Peso Registrato:</h4><p className="text-white text-xl font-bold">{check.weight} kg</p></div>
                <div><h4 className="font-semibold text-gray-300">Note:</h4><p className="text-gray-400 p-3 bg-gray-900/50 rounded-lg">{check.notes || 'Nessuna nota.'}</p></div>
                <div><h4 className="font-semibold text-gray-300">Foto:</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">{check.photoURLs && Object.values(check.photoURLs).map((url, i) => <a href={url} target="_blank" rel="noopener noreferrer"><img key={i} src={url} alt={`foto ${i}`} className="rounded-lg w-full h-auto"/></a>)}</div></div>
            </div>
        </div>
    );
};

// -- COMPONENTE PRINCIPALE DELLA PAGINA --

export default function ClientChecks() {
    const [clientStartDate, setClientStartDate] = useState(null);
    const [checks, setChecks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [formState, setFormState] = useState({ id: null, notes: '', weight: '', photos: {}, photoPreviews: {} });
    const [isUploading, setIsUploading] = useState(false);
    
    const navigate = useNavigate();
    const auth = getAuth();
    const user = auth.currentUser;
    const storage = getStorage();

    useEffect(() => {
        if (!user) { navigate('/client-login'); return; }
        const fetchInitialData = async () => {
            const clientDocRef = doc(db, 'clients', user.uid);
            const clientDoc = await getDoc(clientDocRef);
            if (clientDoc.exists() && clientDoc.data().createdAt) {
                setClientStartDate(clientDoc.data().createdAt.toDate());
            } else {
                // Se non c'è una data di creazione, usiamo oggi come fallback per non bloccare la UI
                setClientStartDate(new Date());
            }
            const checksCollectionRef = collection(db, `clients/${user.uid}/checks`);
            const q = query(checksCollectionRef, orderBy('createdAt', 'desc'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const checksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setChecks(checksData);
                setLoading(false);
            });
            return unsubscribe;
        };
        fetchInitialData();
    }, [user, navigate]);

    const getCheckDaysForMonth = (date) => {
        if (!clientStartDate) return [];
        let checkDays = [];
        let currentCheckDate = new Date(clientStartDate.getTime());
        while (currentCheckDate.getTime() < new Date(date.getFullYear(), date.getMonth() + 2, 1).getTime()) {
            if (currentCheckDate.getMonth() === date.getMonth() && currentCheckDate.getFullYear() === date.getFullYear()) {
                checkDays.push(new Date(currentCheckDate.getTime()));
            }
            currentCheckDate.setDate(currentCheckDate.getDate() + 14);
        }
        return checkDays;
    };

    const tileClassName = ({ date, view }) => {
        if (view === 'month') {
            const isSubmitted = checks.some(c => c.createdAt && c.createdAt.toDate().toDateString() === date.toDateString());
            if (isSubmitted) return 'check-submitted';
            const checkDays = getCheckDaysForMonth(date);
            const isCheckDay = checkDays.some(d => d.toDateString() === date.toDateString());
            if (isCheckDay) return 'check-day';
        }
    };
    
    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) setFormState(prev => ({...prev, photos: {...prev.photos, [type]: file}, photoPreviews: {...prev.photoPreviews, [type]: URL.createObjectURL(file)}}));
    };
    
    const handleEditClick = (check) => {
        setSelectedDate(check.createdAt.toDate());
        setFormState({id: check.id, notes: check.notes, weight: check.weight, photos: {}, photoPreviews: check.photoURLs});
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { id, notes, weight, photos } = formState;
        if (!user || (!id && Object.values(photos).length + Object.values(formState.photoPreviews).filter(p => typeof p === 'string').length < 4) || !weight) {
            alert("Per favore, compila il peso e carica tutte e 4 le foto.");
            return;
        }
        setIsUploading(true);
        try {
            const existingCheck = id ? checks.find(c => c.id === id) : null;
            let photoURLs = existingCheck ? { ...existingCheck.photoURLs } : {};
            await Promise.all(Object.entries(photos).map(async ([type, file]) => {
                if(file) {
                    const filePath = `clients/${user.uid}/checks/${uuidv4()}-${file.name}`;
                    const fileRef = ref(storage, filePath);
                    await uploadBytes(fileRef, file);
                    photoURLs[type] = await getDownloadURL(fileRef);
                }
            }));
            const checkData = { notes, weight: parseFloat(weight), photoURLs };
            if (id) {
                await updateDoc(doc(db, `clients/${user.uid}/checks`, id), {...checkData, lastUpdatedAt: serverTimestamp()});
                alert('Check modificato con successo!');
            } else {
                await addDoc(collection(db, `clients/${user.uid}/checks`), {...checkData, createdAt: serverTimestamp()});
                alert('Check caricato con successo!');
            }
            setFormState({ id: null, notes: '', weight: '', photos: {}, photoPreviews: {} });
        } catch (error) { console.error("Errore:", error); alert("Si è verificato un errore."); } 
        finally { setIsUploading(false); }
    };

    const renderContentForDate = () => {
        const checkOnDate = checks.find(c => c.createdAt && c.createdAt.toDate().toDateString() === selectedDate.toDateString());
        const isCheckDay = getCheckDaysForMonth(selectedDate).some(d => d.toDateString() === selectedDate.toDateString());
        if (formState.id || (isCheckDay && !checkOnDate)) {
            return <ClientUploadForm {...{ formState, setFormState, handleSubmit, isUploading, handleFileChange }} />;
        }
        if (checkOnDate) {
            return <CheckDetails check={checkOnDate} handleEditClick={handleEditClick} />;
        }
        return <p className="text-center text-gray-400 p-8">Nessun check previsto o registrato per questa data.</p>;
    };

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
                    <div className="lg:col-span-1"><Calendar onChange={setSelectedDate} value={selectedDate} tileClassName={tileClassName} /></div>
                    <div className="lg:col-span-2 bg-gray-800/50 p-6 rounded-xl border border-white/10 min-h-[400px]">{renderContentForDate()}</div>
                </div>
            </div>
        </>
    );
}


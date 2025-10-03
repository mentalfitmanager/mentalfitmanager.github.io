import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../firebase.js';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiEdit3, FiCamera } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';

const LoadingSpinner = () => (
    <div className="min-h-screen bg-gray-900 text-white flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500"></div>
    </div>
);

const ClientAnamnesi = () => {
    const [anamnesiData, setAnamnesiData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [photos, setPhotos] = useState({ front: null, right: null, left: null, back: null });
    const [photoPreviews, setPhotoPreviews] = useState({ front: null, right: null, left: null, back: null });
    
    const navigate = useNavigate();
    const auth = getAuth();
    const user = auth.currentUser;
    const storage = getStorage();

    const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm();

    useEffect(() => {
        if (!user) {
            navigate('/client-login');
            return;
        }
        const fetchAnamnesi = async () => {
            const anamnesiRef = doc(db, `clients/${user.uid}/anamnesi`, 'initial');
            const docSnap = await getDoc(anamnesiRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setAnamnesiData(data);

                // Quando carichiamo i dati, recuperiamo l'URL di download per le anteprime
                if (data.photoPaths) { // Usiamo photoPaths perché salviamo il path ora
                    const previews = {};
                    await Promise.all(Object.entries(data.photoPaths).map(async ([type, path]) => {
                        try {
                            // Ottiene l'URL di download dal percorso di storage
                            const url = await getDownloadURL(ref(storage, path)); 
                            previews[type] = url;
                        } catch(e) {
                            console.error(`Errore nel caricamento URL per ${type}:`, e);
                        }
                    }));
                    setPhotoPreviews(previews);
                }
                
                Object.keys(data).forEach(key => setValue(key, data[key]));
                setIsEditing(false);
            } else {
                setIsEditing(true); 
            }
            setLoading(false);
        };
        fetchAnamnesi();
    }, [user, navigate, setValue]);

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            setPhotos(prev => ({ ...prev, [type]: file }));
            setPhotoPreviews(prev => ({ ...prev, [type]: URL.createObjectURL(file) }));
        }
    };

    const onSubmit = async (data) => {
        if (!user) return;
        
        // Controllo aggiuntivo solo al primo invio (se anamnesiData è nullo)
        if (!anamnesiData && Object.values(photos).some(p => p === null)) {
            alert("Per favore, carica tutte e 4 le foto iniziali.");
            return;
        }

        setLoading(true);
        try {
            // *** MODIFICA CHIAVE: Salviamo il path di storage (photoPaths) e NON l'URL di download ***
            let photoPaths = anamnesiData?.photoPaths || {};
            const photosToUpload = Object.entries(photos).filter(([, file]) => file !== null);

            if (photosToUpload.length > 0) {
                const uploadedPaths = await Promise.all(
                    photosToUpload.map(async ([type, file]) => {
                        // Creazione del percorso di storage
                        const filePath = `clients/${user.uid}/anamnesi_photos/${type}-${uuidv4()}`;
                        const fileRef = ref(storage, filePath);
                        await uploadBytes(fileRef, file);
                        
                        return { type, path: filePath }; // Salviamo il path
                    })
                );
                uploadedPaths.forEach(({ type, path }) => { photoPaths[type] = path; });
            }

            const anamnesiRef = doc(db, `clients/${user.uid}/anamnesi`, 'initial');
            // Salviamo photoPaths al posto di photoURLs
            const dataToSave = { ...data, photoPaths, submittedAt: serverTimestamp() }; 
            await setDoc(anamnesiRef, dataToSave, { merge: true });
            
            setAnamnesiData(dataToSave);
            setIsEditing(false);
            alert("Anamnesi salvata con successo!");
            setPhotos({ front: null, right: null, left: null, back: null }); // Resetta le foto caricate
        } catch (error) {
            console.error("Errore nel salvataggio:", error);
            alert("Si è verificato un errore.");
        } finally {
            setLoading(false);
        }
    };
    
    if (loading) return <LoadingSpinner />;

    // --- Componenti di UI (Lasciati invariati) ---
    const inputStyle = "w-full p-2 mt-1 bg-gray-700 border border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500";
    const labelStyle = "block text-sm font-medium text-gray-300";
    const sectionStyle = "bg-gray-800/50 p-6 rounded-xl shadow-lg backdrop-blur-sm border border-white/10";
    const headingStyle = "font-semibold mb-4 text-lg text-cyan-400 border-b border-cyan-400/20 pb-2";

    const PhotoUploader = ({ type, label }) => (
        <div className="text-center">
            <label className={labelStyle}>{label}</label>
            <div className="mt-2 flex justify-center items-center w-full h-48 bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-600 relative">
                {photoPreviews[type] ? (
                    <img src={photoPreviews[type]} alt="preview" className="h-full w-full object-contain rounded-lg" />
                ) : (
                    <div className="flex flex-col items-center text-gray-400"><FiCamera size={40} /><p className="mt-2 text-sm">Carica foto</p></div>
                )}
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, type)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
        </div>
    );
    
    const ViewField = ({ label, value }) => (
        <div>
            <h4 className="text-sm font-semibold text-gray-400">{label}</h4>
            <p className="mt-1 p-2 bg-gray-800 rounded-lg min-h-[40px] text-white break-words">{value || 'Non specificato'}</p>
        </div>
    );

    const ViewPhotos = ({ urls }) => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['front', 'right', 'left', 'back'].map(type => (
                <div key={type}>
                    <h4 className="text-sm font-semibold text-gray-400 capitalize">{type === 'front' ? 'Frontale' : type === 'back' ? 'Posteriore' : `Laterale ${type === 'left' ? 'Sinistro' : 'Destro'}`}</h4>
                    {urls?.[type] ? (<img src={urls[type]} alt={type} className="mt-2 rounded-lg w-full h-auto object-cover" />) : (<div className="mt-2 flex justify-center items-center w-full h-48 bg-gray-800 rounded-lg text-gray-500"><span>Non caricata</span></div>)}
                </div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 font-sans">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-cyan-400">La mia Anamnesi</h1>
                <button onClick={() => navigate('/client/dashboard')} className="flex items-center gap-2 px-3 py-2 bg-gray-700/80 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors"><FiArrowLeft /><span>Dashboard</span></button>
            </header>
            
            {isEditing ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    {/* --- Dati Anagrafici --- */}
                    <div className={sectionStyle}><h4 className={headingStyle}>Dati Anagrafici e Misure</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className={labelStyle}>Nome*</label><input {...register('firstName', { required: true })} className={inputStyle} /></div><div><label className={labelStyle}>Cognome*</label><input {...register('lastName', { required: true })} className={inputStyle} /></div><div><label className={labelStyle}>Data di Nascita*</label><input type="date" {...register('birthDate', { required: true })} className={inputStyle} /></div><div><label className={labelStyle}>Che lavoro fai?*</label><input {...register('job', { required: true })} className={inputStyle} placeholder="Es. Impiegato..." /></div><div><label className={labelStyle}>Peso (kg)*</label><input type="number" step="0.1" {...register('weight', { required: true })} className={inputStyle} placeholder="Es. 75.5" /></div><div><label className={labelStyle}>Altezza (cm)*</label><input type="number" {...register('height', { required: true })} className={inputStyle} placeholder="Es. 180" /></div></div></div>
                    {/* --- Abitudini Alimentari --- */}
                    <div className={sectionStyle}><h4 className={headingStyle}>Abitudini Alimentari</h4><div className="space-y-4"><div><label className={labelStyle}>Quanti pasti riesci a fare al giorno?*</label><select {...register('mealsPerDay', { required: true })} className={inputStyle}><option value="3">3</option><option value="4">4</option><option value="5">5</option></select></div><div><label className={labelStyle}>Colazione: Dolce o Salata?*</label><select {...register('breakfastType', { required: true })} className={inputStyle}><option value="dolce">Dolce</option><option value="salato">Salato</option></select></div><div><label className={labelStyle}>Alimenti da inserire nella settimana*</label><textarea {...register('desiredFoods', { required: true })} rows="3" className={inputStyle} placeholder="Elenca qui..." /></div><div><label className={labelStyle}>Cosa non mangi?*</label><textarea {...register('dislikedFoods', { required: true })} rows="2" className={inputStyle} placeholder="Elenca qui..." /></div><div><label className={labelStyle}>Intolleranze?*</label><input {...register('intolerances', { required: true })} className={inputStyle} placeholder="Es. Lattosio, nessuna..." /></div><div><label className={labelStyle}>Problemi di digestione o gonfiore?*</label><input {...register('digestionIssues', { required: true })} className={inputStyle} placeholder="Sì/No, e se sì quali..." /></div></div></div>
                    {/* --- Allenamento --- */}
                    <div className={sectionStyle}><h4 className={headingStyle}>Allenamento</h4><div className="space-y-4"><div><label className={labelStyle}>Quanti allenamenti a settimana?*</label><input type="number" {...register('workoutsPerWeek', { required: true })} className={inputStyle} placeholder="Es. 3" /></div><div><label className={labelStyle}>Specialità, dove ti alleni e con quali attrezzi?*</label><textarea {...register('trainingDetails', { required: true })} rows="3" className={inputStyle} placeholder="Es. Bodybuilding in palestra..." /></div><div><label className={labelStyle}>A che ora e per quanto tempo ti alleni?*</label><input {...register('trainingTime', { required: true })} className={inputStyle} placeholder="Es. La sera dalle 18 alle 19:30" /></div></div></div>
                    {/* --- Salute e Obiettivi --- */}
                    <div className={sectionStyle}><h4 className={headingStyle}>Salute e Obiettivi</h4><div className="space-y-4"><div><label className={labelStyle}>Infortuni o problematiche?*</label><textarea {...register('injuries', { required: true })} rows="3" className={inputStyle} placeholder="Es. Mal di schiena, ernie..." /></div><div><label className={labelStyle}>Prendi farmaci?*</label><input {...register('medications', { required: true })} className={inputStyle} placeholder="Sì/No, e se sì quali..." /></div><div><label className={labelStyle}>Usi integratori?*</label><input {...register('supplements', { required: true })} className={inputStyle} placeholder="Sì/No, e se sì quali..." /></div><div><label className={labelStyle}>Scrivimi il tuo obiettivo*</label><textarea {...register('mainGoal', { required: true })} rows="3" className={inputStyle} placeholder="Descrivi in dettaglio..." /></div><div><label className={labelStyle}>Durata percorso scelto?*</label><input {...register('programDuration', { required: true })} className={inputStyle} placeholder="Es. 3 mesi, 6 mesi..." /></div></div></div>
                    {/* --- Foto Iniziali --- */}
                    <div className={sectionStyle}><h4 className={headingStyle}>Foto Iniziali</h4><p className="text-sm text-gray-400 mb-6">Carica 4 foto per il check iniziale: frontale, laterale destro, laterale sinistro e posteriore.</p><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><PhotoUploader type="front" label="Frontale" /><PhotoUploader type="right" label="Laterale Destro" /><PhotoUploader type="left" label="Laterale Sinistro" /><PhotoUploader type="back" label="Posteriore" /></div></div>
                    <div className="flex justify-end pt-4"><button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition font-semibold disabled:opacity-50"><FiSave /> {isSubmitting ? 'Salvataggio...' : 'Salva Anamnesi e Foto'}</button></div>
                </form>
            ) : (
                anamnesiData && <div className="space-y-8">
                    {/* --- Visualizzazione Dati --- */}
                    <div className={sectionStyle}><h4 className={headingStyle}>Dati Anagrafici</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><ViewField label="Nome" value={anamnesiData.firstName} /><ViewField label="Cognome" value={anamnesiData.lastName} /><ViewField label="Data di Nascita" value={anamnesiData.birthDate} /><ViewField label="Lavoro" value={anamnesiData.job} /><ViewField label="Peso (kg)" value={anamnesiData.weight} /><ViewField label="Altezza (cm)" value={anamnesiData.height} /></div></div>
                    <div className={sectionStyle}><h4 className={headingStyle}>Abitudini Alimentari</h4><div className="space-y-4"><ViewField label="Pasti al giorno" value={anamnesiData.mealsPerDay} /><ViewField label="Tipo Colazione" value={anamnesiData.breakfastType} /><ViewField label="Alimenti da inserire" value={anamnesiData.desiredFoods} /><ViewField label="Alimenti da evitare" value={anamnesiData.dislikedFoods} /><ViewField label="Intolleranze" value={anamnesiData.intolerances} /><ViewField label="Problemi di digestione" value={anamnesiData.digestionIssues} /></div></div>
                    <div className={sectionStyle}><h4 className={headingStyle}>Allenamento</h4><div className="space-y-4"><ViewField label="Allenamenti a settimana" value={anamnesiData.workoutsPerWeek} /><ViewField label="Dettagli Allenamento" value={anamnesiData.trainingDetails} /><ViewField label="Orario e Durata" value={anamnesiData.trainingTime} /></div></div>
                    <div className={sectionStyle}><h4 className={headingStyle}>Salute e Obiettivi</h4><div className="space-y-4"><ViewField label="Infortuni o problematiche" value={anamnesiData.injuries} /><ViewField label="Farmaci" value={anamnesiData.medications} /><ViewField label="Integratori" value={anamnesiData.supplements} /><ViewField label="Obiettivo Principale" value={anamnesiData.mainGoal} /><ViewField label="Durata Percorso" value={anamnesiData.programDuration} /></div></div>
                    <div className={sectionStyle}><h4 className={headingStyle}>Foto Iniziali</h4><ViewPhotos urls={photoPreviews} /></div>
                    <div className="flex justify-end pt-4"><button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition font-semibold"><FiEdit3 /> Modifica</button></div>
                </div>
            )}
        </div>
    );
};

export default ClientAnamnesi;

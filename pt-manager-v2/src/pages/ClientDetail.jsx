import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, onSnapshot, collection, query, orderBy, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, deleteObject, getStorage, getDownloadURL } from 'firebase/storage';
import { FiArrowLeft, FiUser, FiFileText, FiCheckSquare, FiChevronDown, FiEdit3, FiDollarSign, FiTrash2, FiCopy, FiCheck, FiKey, FiPlus, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// Importa i tuoi componenti esistenti
import CheckForm from '../components/CheckForm';
import AnamnesiForm from '../components/AnamnesiForm';
import PaymentManager from '../components/PaymentManager';

// Stili per il calendario
const calendarStyles = `
.react-calendar { width: 100%; background: #1f2937; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 1rem; }
.react-calendar__tile, .react-calendar__month-view__weekdays__weekday { color: white; }
.react-calendar__navigation button { color: #22d3ee; font-weight: bold; }
.react-calendar__tile--now { background: #374151; border-radius: 0.5rem; }
.react-calendar__tile--active { background: #0891b2; border-radius: 0.5rem; }
.react-calendar__tile:enabled:hover, .react-calendar__tile:enabled:focus { background: #4b5563; border-radius: 0.5rem; }
.check-day-highlight { background-color: rgba(34, 197, 94, 0.5); border-radius: 50%; }
`;

// --- FUNZIONE UTILITY PER CONVERTIRE TIMESTAMP (POSIZIONE SICURA) ---
function toDate(x) {
  if (!x) return null;
  if (typeof x?.toDate === 'function') return x.toDate();
  const d = new Date(x);
  return isNaN(d) ? null : d;
}
// -------------------------------------------------------------------

// *** COMPONENTE PER LA VISUALIZZAZIONE DELLE FOTO ***
const ViewPhotos = ({ urls }) => {
    if (!urls || Object.keys(urls).length === 0) {
        return <p className="text-muted italic">Nessuna foto caricata.</p>;
    }
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
            {['front', 'right', 'left', 'back'].map(type => {
                const url = urls[type];
                const label = type === 'front' ? 'Frontale' : type === 'back' ? 'Posteriore' : `Laterale ${type === 'left' ? 'Sinistro' : 'Destro'}`;
                return (
                    <div key={type}>
                        <h4 className="text-sm font-semibold text-muted mb-1">{label}</h4>
                        {url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt={label} className="rounded-lg w-full h-auto object-cover border border-white/20" />
                            </a>
                        ) : (
                            <div className="flex justify-center items-center w-full h-24 bg-background/50 rounded-lg text-gray-500 text-xs">N/D</div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
// --- FINE NUOVO COMPONENTE ---

// --- COMPONENTE CHIAVE PER L'ANAMNESI (MODIFICATO per photoPaths) ---
const AnamnesiContent = ({ clientId }) => {
  const [anamnesiData, setAnamnesiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoUrls, setPhotoUrls] = useState({}); // Stato per gli URL di download delle foto
  const storageInstance = getStorage();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'clients', clientId, 'anamnesi', 'initial'), async (docSnap) => {
      setLoading(true);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAnamnesiData(data);
        
        // --- LOGICA CHIAVE: Converte i percorsi di Storage in URL di download ---
        if (data.photoPaths) {
            const urls = {};
            // Usa Promise.all per gestire il recupero asincrono degli URL
            await Promise.all(Object.entries(data.photoPaths).map(async ([type, path]) => {
                try {
                    const url = await getDownloadURL(ref(storageInstance, path));
                    urls[type] = url;
                } catch(e) {
                    console.error(`Errore nel caricamento URL per ${type}:`, e);
                }
            }));
            setPhotoUrls(urls);
        } else {
             setPhotoUrls({});
        }
        // ----------------------------------------------------------------------
      } else {
        setAnamnesiData(null);
        setPhotoUrls({});
      }
      setLoading(false);
    });
    return () => unsub();
  }, [clientId, storageInstance]);

  if (loading) return <p className="text-muted text-center p-4">Caricamento...</p>;
  
  if (anamnesiData) {
    // Separa le foto e la data di invio dagli altri campi
    const { photoPaths, submittedAt, ...fields } = anamnesiData;
    
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="bg-card p-6 rounded-xl border border-white/10">
            <h3 className="text-xl font-semibold text-primary mb-4">Dati Anamnesi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(fields).map(([key, value]) => {
                const isDate = value && typeof value.toDate === 'function';
                const displayValue = isDate ? toDate(value)?.toLocaleDateString('it-IT') : String(value);
                
                // Formatta la chiave per una migliore leggibilità
                const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();

                return (
                    <div key={key} className="pb-2">
                    <h4 className="font-semibold text-muted capitalize text-sm">{displayKey}</h4>
                    <p className="text-foreground whitespace-pre-wrap mt-1">{displayValue || 'N/D'}</p>
                    </div>
                );
            })}
            </div>
            {submittedAt && (
                <p className="text-xs text-muted mt-4 pt-4 border-t border-white/10">
                    Compilato il: {toDate(submittedAt)?.toLocaleString('it-IT')}
                </p>
            )}
        </div>
        
        {/* Passiamo gli URL di download allo ViewPhotos Component */}
        <div className="bg-card p-6 rounded-xl border border-white/10">
            <h3 className="text-xl font-semibold text-primary mb-4">Foto Iniziali</h3>
            <ViewPhotos urls={photoUrls} />
        </div>
        
      </motion.div>
    );
  }
  return <AnamnesiForm clientId={clientId} onSave={() => {}} />;
};
// --- FINE COMPONENTE ANAMNESICONTENT ---

// --- COMPONENTE CHECKITEM (Migliorata la logica di eliminazione) ---
const CheckItem = ({ check, clientId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coachNotes, setCoachNotes] = useState(check.coachNotes || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const storageInstance = getStorage();

    const handleSaveNotes = async () => {
        setIsSaving(true);
        try { await updateDoc(doc(db, 'clients', clientId, 'checks', check.id), { coachNotes }); }
        finally { setIsSaving(false); }
    };
    
    const handleDeleteCheck = async () => {
        if (window.confirm("Sei sicuro di voler eliminare questo check?")) {
            setIsDeleting(true);
            try {
                if (check.photoURLs?.length > 0) {
                    await Promise.all(check.photoURLs.map(url => {
                        try {
                            // TENTATIVO ROBUSTO PER ELIMINARE FOTO DA URL DI DOWNLOAD
                            const path = url.split('?')[0].split('o/')[1];
                            const correctRef = ref(storageInstance, decodeURIComponent(path));
                            return deleteObject(correctRef);
                            
                        } catch(e) {
                            console.warn("Impossibile eliminare l'immagine dallo Storage. Proseguo con l'eliminazione del documento:", e);
                            return Promise.resolve(); 
                        }
                    }));
                }
                // Elimina il documento Firestore
                await deleteDoc(doc(db, 'clients', clientId, 'checks', check.id));
            } catch (error) {
                console.error("Errore eliminazione:", error);
                alert("Errore durante l'eliminazione.");
                setIsDeleting(false);
            }
        }
    };
    
    return (
        <div className="bg-card rounded-lg border border-white/10 overflow-hidden">
            <div className="flex justify-between items-center p-4">
                <button onClick={() => setIsOpen(!isOpen)} className="flex-1 flex justify-between items-center text-left">
                    {/* Accesso robusto a createdAt */}
                    <span className="font-semibold">Check del {toDate(check.createdAt)?.toLocaleDateString('it-IT') || 'Data Sconosciuta'}</span>
                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }}><FiChevronDown /></motion.div>
                </button>
                <button onClick={handleDeleteCheck} disabled={isDeleting} className="ml-4 p-1.5 text-red-500/60 hover:text-red-500 rounded-md" title="Elimina Check"><FiTrash2 size={14}/></button>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 pb-4">
                        <div className="pt-4 border-t border-white/20 space-y-4">
                            <div>
                                <h4 className="text-sm font-semibold text-muted mb-2">Note del cliente:</h4>
                                <p className="text-foreground whitespace-pre-wrap">{check.notes || '-'}</p>
                            </div>
                            {/* Visualizzazione delle foto nei check */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {check.photoURLs?.map((url, index) => <a key={index} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`Foto ${index + 1}`} className="rounded-md aspect-square object-cover" /></a>)}
                            </div>
                             <div className="pt-4 border-t border-white/20">
                                <h4 className="text-sm font-semibold text-muted mb-2 flex items-center gap-2"><FiEdit3 /> Feedback:</h4>
                                <textarea value={coachNotes} onChange={(e) => setCoachNotes(e.target.value)} rows="3" className="w-full p-2 bg-background rounded-lg border border-white/10" placeholder="Scrivi qui il tuo feedback..."/>
                                <div className="flex justify-end mt-2">
                                    <button onClick={handleSaveNotes} disabled={isSaving} className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg">{isSaving ? 'Salvo...' : 'Salva'}</button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- COMPONENTE CHE ABBIAMO MODIFICATO ---
const ChecksContent = ({ clientId }) => {
  const [checks, setChecks] = useState([]);
  const [loadingChecks, setLoadingChecks] = useState(true);
  const [errorChecks, setErrorChecks] = useState(null); // Nuovo stato per gli errori
  const [selectedDate, setSelectedDate] = useState(null);
  const [showCheckForm, setShowCheckForm] = useState(false); // Stato per mostrare/nascondere il form

  useEffect(() => {
    // La query ai check non è la causa della schermata nera, ma deve essere corretta.
    const q = query(collection(db, 'clients', clientId, 'checks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // FIX: Assicurati che ogni documento abbia un createdAt valido per prevenire errori
      const validChecks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(check => check.createdAt);
      setChecks(validChecks);
      setLoadingChecks(false);
      setErrorChecks(null); // Resetta l'errore in caso di successo
    }, (error) => {
        // GESTIONE ERRORI: Se ci sono problemi di permessi o query, catturiamo l'errore e non crashiamo
        console.error("Errore nel caricamento dei checks:", error);
        setErrorChecks("Impossibile caricare i check. Controlla i permessi di Firestore.");
        setLoadingChecks(false);
    });
    return () => unsubscribe();
  }, [clientId]);

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
        // FIX: Uso la robustezza del toDate per prevenire errori
        const hasCheck = checks.some(c => toDate(c.createdAt)?.toDateString() === date.toDateString());
        if (hasCheck) return 'check-day-highlight';
    }
  };

  const displayedChecks = selectedDate
    // FIX: Uso la robustezza del toDate per prevenire errori
    ? checks.filter(check => toDate(check.createdAt)?.toDateString() === selectedDate.toDateString())
    : checks;

  return (
    <>
      {/* Finestra Modale per il CheckForm */}
      <AnimatePresence>
        {showCheckForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4"
            onClick={() => setShowCheckForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl relative"
              onClick={(e) => e.stopPropagation()} // Impedisce la chiusura cliccando sul form
            >
              <button onClick={() => setShowCheckForm(false)} className="absolute -top-2 -right-2 bg-card rounded-full p-1.5 text-muted hover:text-white z-10"><FiX /></button>
              <CheckForm clientId={clientId} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Layout Principale della Sezione Check */}
      <div className="pt-6">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Cronologia Check</h3>
            <button 
                onClick={() => setShowCheckForm(true)} 
                className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/80 text-white text-sm font-semibold rounded-lg transition"
            >
                <FiPlus /> Crea Check
            </button>
        </div>

        {loadingChecks ? (
          <p className="text-muted">Caricamento...</p>
        ) : errorChecks ? ( // Mostra errore se catturato
             <div className="text-center text-red-400 p-4 bg-red-900/50 rounded-lg border border-red-500/50">
                <p>ERRORE: {errorChecks}</p>
                <p className="text-xs mt-2">Controlla la console del browser per i dettagli tecnici.</p>
             </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              {/* Il calendario richiede che checks sia un array */}
              {checks.length > 0 ? ( 
                <Calendar
                    onChange={setSelectedDate}
                    value={selectedDate}
                    tileClassName={tileClassName}
                />
              ) : (
                <div className="h-64 flex justify-center items-center bg-card rounded-xl border border-white/10">
                    <p className="text-muted">Aggiungi il primo check!</p>
                </div>
              )}
              
              {selectedDate && (
                  <button onClick={() => setSelectedDate(null)} className="w-full text-center text-primary text-sm mt-2 p-2 bg-card rounded-lg border border-white/10 hover:bg-white/10">
                      Mostra tutti i check
                  </button>
              )}
            </div>
            <div className="lg:col-span-2">
              <h4 className="font-semibold text-muted mb-2">
                {selectedDate ? `Check del ${selectedDate.toLocaleDateString('it-IT')}` : 'Tutti i check'}
              </h4>
              {displayedChecks.length > 0 ? (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                  {displayedChecks.map(check => <CheckItem key={check.id} check={check} clientId={clientId} />)}
                </div>
              ) : (
                <div className="text-center text-muted p-4 bg-card rounded-lg border border-white/10">
                  <p>{selectedDate ? 'Nessun check trovato per questa data.' : 'Nessun check trovato.'}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};


// --- COMPONENTE PRINCIPALE ---
export default function ClientDetail() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('anamnesi');
  const [copied, setCopied] = useState(false);

  // Funzione per generare il messaggio di benvenuto formattato
  const generateWelcomeMessage = useCallback((name, email, password) => {
    const loginLink = "https://mentalfitmanager.github.io/#/client-login";
    return (
`Ciao ${name},

Ecco le tue credenziali per accedere alla tua area riservata:

Email (Username): ${email}
Password Temporanea: ${password}
Link di accesso: ${loginLink}

Ti consiglio di cambiare la password al primo accesso.
A presto!`
    );
  }, []);
  
  useEffect(() => {
      const tab = new URLSearchParams(location.search).get('tab');
      if (tab) setActiveTab(tab);
  }, [location.search]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'clients', clientId), (docSnap) => {
        if (docSnap.exists()) {
            setClient({ id: docSnap.id, ...docSnap.data() });
        } else {
            navigate('/clients');
        }
        setLoading(false);
    });
    return () => unsub();
  }, [clientId, navigate]);
  
  const copyToClipboard = (text) => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };
  
  const handleCopyWelcomeMessage = () => {
      if (client?.tempPassword) {
          const message = generateWelcomeMessage(client.name, client.email, client.tempPassword);
          copyToClipboard(message);
      }
  };

  if (loading) return <div className="text-center text-muted p-8">Caricamento...</div>;
  if (!client) return null;
  
  const formattedDate = toDate(client.createdAt)?.toLocaleDateString('it-IT') || 'N/A';

  return (
    <>
      <style>{calendarStyles}</style>
      <div className="w-full">
        <motion.div className="flex items-center justify-between mb-6" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="text-3xl font-bold">{client.name}</h1>
            <p className="text-muted">Cliente dal: {formattedDate}</p>
          </div>
          <button onClick={() => navigate('/clients')} className="flex items-center gap-2 px-3 py-1.5 bg-card hover:bg-white/10 rounded-lg text-sm text-muted border border-white/10">
            <FiArrowLeft /> Torna
          </button>
        </motion.div>
        
        <motion.div className="bg-card p-6 rounded-xl border border-white/10 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-primary/20 text-primary p-3 rounded-full"><FiUser size={24} /></div>
            <div>
              <h2 className="text-xl font-semibold">Profilo</h2>
              <p className="text-muted">{client.email}</p>
              {client.phone && <p className="text-muted">{client.phone}</p>}
            </div>
          </div>
          
          {/* *** SEZIONE PASSWORD TEMPORANEA (BLOCCO COPIABILE E LINK) *** */}
          {client.tempPassword && (
            <div className="mt-4 pt-4 border-t border-white/10">
               <div className="bg-background p-3 rounded-lg">
                    <p className="text-xs text-muted flex items-center gap-1 mb-2"><FiKey size={12}/> Messaggio di Benvenuto Pronto</p>
                    
                    <textarea
                        readOnly
                        value={generateWelcomeMessage(client.name, client.email, client.tempPassword)}
                        className="w-full p-2 bg-background border border-white/10 rounded-lg text-white font-mono text-xs resize-none h-40"
                    />

                    <div className="flex gap-2 mt-3">
                        <button onClick={handleCopyWelcomeMessage} className="flex-1 py-2 bg-primary/20 rounded-lg text-primary flex items-center justify-center gap-2 hover:bg-primary/30">
                            {copied ? <><FiCheck/> Messaggio Copiato!</> : <><FiCopy/> Copia Messaggio</>}
                        </button>
                        {/* Pulsante che apre il link di login in una nuova scheda */}
                        <a 
                            href="https://mentalfitmanager.github.io/#/client-login" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="py-2 px-4 bg-primary rounded-lg text-white flex items-center justify-center gap-2 hover:bg-primary/80 transition"
                        >
                            <FiKey /> Accedi Cliente
                        </a>
                    </div>
              </div>
               <p className="text-xs text-muted mt-2 text-center">Questo messaggio non è più necessario una volta che il cliente ha cambiato password.</p>
            </div>
          )}
        </motion.div>

        <div className="flex border-b border-white/10 mb-6">
          <button onClick={() => setActiveTab('anamnesi')} className={`px-4 py-2 text-sm ${activeTab === 'anamnesi' ? 'border-b-2 border-primary text-white' : 'text-muted'}`}>
            <FiFileText className="inline mr-2" />Anamnesi
          </button>
          <button onClick={() => setActiveTab('checks')} className={`px-4 py-2 text-sm ${activeTab === 'checks' ? 'border-b-2 border-primary text-white' : 'text-muted'}`}>
            <FiCheckSquare className="inline mr-2" />Checks
          </button>
          <button onClick={() => setActiveTab('payments')} className={`px-4 py-2 text-sm ${activeTab === 'payments' ? 'border-b-2 border-primary text-white' : 'text-muted'}`}>
            <FiDollarSign className="inline mr-2" />Pagamenti
          </button>
        </div>

        <div>
          {activeTab === 'anamnesi' && <AnamnesiContent clientId={clientId} />}
          {activeTab === 'checks' && <ChecksContent clientId={clientId} />}
          {activeTab === 'payments' && <PaymentManager clientId={clientId} />}
        </div>
      </div>
    </>
  );
}

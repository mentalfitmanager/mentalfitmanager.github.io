import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, collection, onSnapshot, query, orderBy, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, deleteObject } from 'firebase/storage';
import { FiArrowLeft, FiUser, FiFileText, FiCheckSquare, FiChevronDown, FiEdit3, FiDollarSign, FiTrash2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import CheckForm from '../components/CheckForm';
import AnamnesiForm from '../components/AnamnesiForm';
import PaymentManager from '../components/PaymentManager';

function toDate(x) {
  if (!x) return null;
  if (typeof x?.toDate === 'function') return x.toDate();
  const d = new Date(x);
  return isNaN(d) ? null : d;
}

const AnamnesiContent = ({ clientId }) => {
  const [anamnesiData, setAnamnesiData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'clients', clientId, 'anamnesi', 'initial'), (docSnap) => {
      setAnamnesiData(docSnap.exists() ? docSnap.data() : false);
      setLoading(false);
    });
    return () => unsub();
  }, [clientId]);

  if (loading) return <p className="text-muted text-center p-4">Caricamento...</p>;
  if (anamnesiData) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 bg-card p-6 rounded-xl border border-white/10">
        <h3 className="text-xl font-semibold text-primary mb-4">Anamnesi Compilata</h3>
        {Object.entries(anamnesiData).map(([key, value]) => {
          // --- FIX: Controlla se il valore è una data e la formatta ---
          const isDate = value && typeof value.toDate === 'function';
          const displayValue = isDate ? toDate(value).toLocaleDateString('it-IT') : String(value);

          return (
            <div key={key} className="pb-2 border-b border-white/10 last:border-b-0">
              <h4 className="font-semibold text-muted capitalize text-sm">{key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1')}</h4>
              <p className="text-foreground whitespace-pre-wrap">{displayValue || 'N/D'}</p>
            </div>
          );
        })}
      </motion.div>
    );
  }
  return <AnamnesiForm clientId={clientId} onSave={() => {}} />;
};

const CheckItem = ({ check, clientId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coachNotes, setCoachNotes] = useState(check.coachNotes || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
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
                    await Promise.all(check.photoURLs.map(url => deleteObject(ref(storage, url))));
                }
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
                    <span className="font-semibold">Check del {toDate(check.createdAt)?.toLocaleDateString('it-IT')}</span>
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
const ChecksContent = ({ clientId }) => {
  const [checks, setChecks] = useState([]);
  const [loadingChecks, setLoadingChecks] = useState(true);
  useEffect(() => {
    const q = query(collection(db, 'clients', clientId, 'checks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChecks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingChecks(false);
    });
    return () => unsubscribe();
  }, [clientId]);
  return (
    <>
      <CheckForm clientId={clientId} />
      <div className="mt-8 pt-6 border-t border-white/10">
        <h3 className="text-xl font-semibold mb-4">Cronologia Check</h3>
        {loadingChecks && <p className="text-muted">Caricamento...</p>}
        {!loadingChecks && checks.length === 0 && <p className="text-muted">Nessun check trovato.</p>}
        <div className="space-y-2">{checks.map(check => <CheckItem key={check.id} check={check} clientId={clientId} />)}</div>
      </div>
    </>
  );
};
export default function ClientDetail() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('anamnesi');
  useEffect(() => {
      const tab = new URLSearchParams(location.search).get('tab');
      if (tab) setActiveTab(tab);
  }, [location.search]);
  useEffect(() => {
    const fetchClient = async () => {
      setLoading(true);
      const docRef = doc(db, 'clients', clientId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setClient({ id: docSnap.id, ...docSnap.data() });
      else navigate('/clients');
      setLoading(false);
    };
    fetchClient();
  }, [clientId, navigate]);
  if (loading) return <div className="text-center text-muted p-8">Caricamento...</div>;
  if (!client) return null;
  const formattedDate = toDate(client.createdAt)?.toLocaleDateString('it-IT') || 'N/A';
  return (
    <div className="w-full">
      <motion.div className="flex items-center justify-between mb-6" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <p className="text-muted">Cliente dal: {formattedDate}</p>
        </div>
        <button onClick={() => navigate('/clients')} className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border border-white/10">
          <FiArrowLeft /> Torna
        </button>
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
  );
}


import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, doc, deleteDoc, serverTimestamp, writeBatch, getDoc } from 'firebase/firestore';
import { FiDollarSign, FiPlus, FiTrash2, FiCalendar, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

// Funzione helper per formattare le date
const toDate = (x) => {
    if (!x) return null;
    if (typeof x?.toDate === 'function') return x.toDate();
    const d = new Date(x);
    return isNaN(d) ? null : d;
};

export default function PaymentManager({ clientId }) {
    const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
    const [payments, setPayments] = useState([]);
    const [showForm, setShowForm] = useState(false);

    // Carica lo storico dei pagamenti per questo cliente
    useEffect(() => {
        const q = query(collection(db, 'clients', clientId, 'payments'), orderBy('paymentDate', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [clientId]);

    // Funzione per aggiungere un nuovo pagamento
    const onAddPayment = async (data) => {
        const durationNum = parseInt(data.duration, 10);
        
        const batch = writeBatch(db);

        // 1. Aggiungi il nuovo documento di pagamento
        const newPaymentRef = doc(collection(db, 'clients', clientId, 'payments'));
        batch.set(newPaymentRef, {
            amount: parseFloat(data.amount),
            duration: `${durationNum} mes${durationNum > 1 ? 'i' : 'e'}`,
            paymentMethod: data.paymentMethod,
            paymentDate: serverTimestamp(),
        });

        // 2. Aggiorna la data di scadenza del cliente
        // Legge la data di scadenza attuale e la estende, o usa la data odierna se non presente/passata
        const clientRef = doc(db, 'clients', clientId);
        const clientSnap = await getDoc(clientRef);
        const clientData = clientSnap.data();
        
        let currentExpiry = toDate(clientData.scadenza);
        if (!currentExpiry || currentExpiry < new Date()) {
            currentExpiry = new Date();
        }
        
        const newExpiryDate = new Date(currentExpiry);
        newExpiryDate.setMonth(newExpiryDate.getMonth() + durationNum);
        batch.update(clientRef, { scadenza: newExpiryDate });

        await batch.commit();
        reset();
        setShowForm(false);
    };

    // --- FUNZIONE DI CANCELLAZIONE FUNZIONANTE ---
    const handleDeletePayment = async (paymentId) => {
        if (window.confirm("Sei sicuro di voler eliminare questo pagamento? L'operazione non è reversibile.")) {
            try {
                const paymentRef = doc(db, 'clients', clientId, 'payments', paymentId);
                await deleteDoc(paymentRef);
                // Nota: la logica per ricalcolare la scadenza dopo una cancellazione può essere complessa.
                // Per ora, si limita a cancellare il record del pagamento.
            } catch (error) {
                console.error("Errore nell'eliminazione del pagamento:", error);
                alert("Si è verificato un errore.");
            }
        }
    };
    
    const inputStyle = "w-full p-2 bg-background border border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary";
    const labelStyle = "block mb-1 text-sm font-medium text-muted";

    return (
        <div className="bg-card p-6 rounded-xl border border-white/10">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-primary flex items-center gap-2"><FiDollarSign /> Gestione Pagamenti</h3>
                <button 
                  onClick={() => setShowForm(!showForm)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-sm"
                >
                  {showForm ? <FiX /> : <FiPlus />} {showForm ? 'Annulla' : 'Aggiungi Rinnovo'}
                </button>
            </div>
            
            <AnimatePresence>
                {showForm && (
                  <motion.form 
                    onSubmit={handleSubmit(onAddPayment)} 
                    className="space-y-4 mb-6 pt-4 border-t border-white/10"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>Importo Pagato (€)*</label>
                        <input type="number" step="0.01" {...register('amount', { required: true })} className={inputStyle} />
                      </div>
                      <div>
                        <label className={labelStyle}>Durata Rinnovo (mesi)*</label>
                         <select {...register('duration', { required: true })} className={inputStyle}>
                            {[...Array(24).keys()].map(i => <option key={i+1} value={i+1}>{i+1} mes{i > 0 ? 'i' : 'e'}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                         <label className={labelStyle}>Metodo di Pagamento</label>
                         <input {...register('paymentMethod')} className={inputStyle} placeholder="Es. Bonifico, Contanti" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-primary text-white rounded-lg font-semibold transition disabled:opacity-50">
                        {isSubmitting ? 'Salvataggio...' : 'Salva Pagamento'}
                      </button>
                    </div>
                  </motion.form>
                )}
            </AnimatePresence>
            
            <h4 className="font-semibold mb-3 mt-4">Cronologia Rinnovi</h4>
            <div className="space-y-2">
                {payments.length > 0 ? payments.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3 bg-background rounded-md border border-white/10">
                    <div className="flex items-center gap-3">
                      <FiCalendar className="text-muted"/>
                      <div>
                        <p className="font-semibold">{p.duration} - €{p.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted">
                          Pagato il {toDate(p.paymentDate)?.toLocaleDateString('it-IT')}
                          {p.paymentMethod && ` via ${p.paymentMethod}`}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => handleDeletePayment(p.id)} className="p-1.5 text-red-500/50 hover:text-red-500 rounded-md transition-colors"><FiTrash2 size={16}/></button>
                  </div>
                )) : <p className="text-sm text-muted">Nessun pagamento registrato.</p>}
            </div>
        </div>
    );
}


import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { FiPlus, FiDollarSign, FiTrash2, FiCalendar } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

function toDate(x) {
  if (!x) return null;
  if (typeof x?.toDate === "function") return x.toDate();
  const d = new Date(x);
  return isNaN(d) ? null : d;
}

// Funzione per calcolare la nuova data di scadenza
const calculateExpiryDate = (duration) => {
    const now = new Date();
    const durationNum = parseInt(duration, 10);
    if (isNaN(durationNum)) return now; // Ritorna oggi se la durata non è un numero

    if (duration.toLowerCase().includes('mes')) {
        now.setMonth(now.getMonth() + durationNum);
    } else if (duration.toLowerCase().includes('settiman')) {
        now.setDate(now.getDate() + (durationNum * 7));
    } else if (duration.toLowerCase().includes('giorn')) {
        now.setDate(now.getDate() + durationNum);
    }
    return now;
};

export default function PaymentManager({ clientId }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  const [payments, setPayments] = useState([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'clients', clientId, 'payments'), orderBy('paymentDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [clientId]);

  const onSubmit = async (data) => {
    try {
      const { amount, duration, paymentMethod } = data;
      const newExpiryDate = calculateExpiryDate(duration);

      // Salva il pagamento nella sub-collezione
      await addDoc(collection(db, 'clients', clientId, 'payments'), {
        amount: parseFloat(amount),
        duration,
        paymentMethod: paymentMethod || null,
        paymentDate: serverTimestamp(),
        newExpiryDate: newExpiryDate, // Salviamo la scadenza calcolata
      });

      // Aggiorna il documento principale del cliente con la nuova data di scadenza e lo stato
      const clientRef = doc(db, 'clients', clientId);
      await updateDoc(clientRef, {
        endDate: newExpiryDate,
        status: 'attivo'
      });

      reset();
      setShowForm(false);
    } catch (error) {
      console.error("Errore nell'aggiunta del pagamento:", error);
      alert("Si è verificato un errore.");
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
          <FiPlus /> {showForm ? 'Annulla' : 'Aggiungi Rinnovo'}
        </button>
      </div>
      
      <AnimatePresence>
        {showForm && (
          <motion.form 
            onSubmit={handleSubmit(onSubmit)} 
            className="space-y-4 mb-6 p-4 bg-background rounded-lg"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelStyle}>Importo Pagato (€)*</label>
                <input type="number" step="0.01" {...register('amount', { required: true })} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Durata Percorso*</label>
                <input {...register('duration', { required: true })} className={inputStyle} placeholder="Es. 3 mesi, 12 settimane" />
              </div>
              <div>
                <label className={labelStyle}>Metodo (Opzionale)</label>
                <input {...register('paymentMethod')} className={inputStyle} placeholder="Es. Bonifico, PayPal" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-primary text-white rounded-lg font-semibold">
                Salva Pagamento
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      
      <h4 className="font-semibold mb-3 mt-4">Cronologia Rinnovi</h4>
      <div className="space-y-2">
        {payments.length > 0 ? payments.map(p => (
          <div key={p.id} className="flex justify-between items-center p-3 bg-background rounded-md">
            <div className="flex items-center gap-3">
              <FiCalendar className="text-muted"/>
              <div>
                <p className="font-semibold">{p.duration} - {p.amount}€</p>
                <p className="text-xs text-muted">
                  Pagato il {toDate(p.paymentDate)?.toLocaleDateString('it-IT')}
                  {p.paymentMethod && ` via ${p.paymentMethod}`}
                </p>
              </div>
            </div>
            <button className="p-1.5 text-red-500/50 hover:text-red-500 rounded-md"><FiTrash2 size={14}/></button>
          </div>
        )) : <p className="text-sm text-muted">Nessun pagamento registrato.</p>}
      </div>
    </div>
  );
}


import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, serverTimestamp, writeBatch, doc } from 'firebase/firestore'; // <-- Aggiunto 'doc'
import { FiSave, FiArrowLeft, FiDollarSign } from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function NewClient() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm();

  const onSubmit = async (data) => {
    try {
      const batch = writeBatch(db);
      const newClientRef = doc(collection(db, 'clients'));
      const clientData = {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        status: data.status,
        endDate: data.endDate ? new Date(data.endDate) : null,
        createdAt: serverTimestamp() 
      };
      batch.set(newClientRef, clientData);

      if (data.paymentAmount && data.paymentDuration) {
        const paymentRef = doc(collection(db, 'clients', newClientRef.id, 'payments'));
        const paymentData = {
          amount: parseFloat(data.paymentAmount),
          duration: data.paymentDuration,
          paymentMethod: data.paymentMethod || null,
          paymentDate: serverTimestamp(),
        };
        batch.set(paymentRef, paymentData);
      }

      await batch.commit();
      navigate('/clients');

    } catch (error) { // <-- ECCO LA CORREZIONE: Aggiunte le parentesi graffe
      console.error("Errore nella creazione del cliente:", error);
      alert("Si è verificato un errore durante il salvataggio.");
    }
  };

  const inputStyle = "w-full p-2 bg-background border border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all";
  const labelStyle = "block mb-1 text-sm font-medium text-muted";
  const headingStyle = "font-semibold mb-3 text-lg text-primary";

  return (
    <motion.div 
      className="w-full max-w-2xl mx-auto bg-card rounded-xl shadow border border-white/10 p-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Nuovo Cliente</h1>
        <button 
          onClick={() => navigate('/clients')} 
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-muted"
        >
          <FiArrowLeft /> Torna alla lista
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-card p-4 rounded-lg border border-white/10">
          <h4 className={headingStyle}>Dati Anagrafici</h4>
          <div className="space-y-4">
            <div>
              <label className={labelStyle}>Nome e Cognome*</label>
              <input {...register('name', { required: true })} className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Email*</label>
              <input type="email" {...register('email', { required: true })} className={inputStyle} />
            </div>
             <div>
              <label className={labelStyle}>Telefono (Opzionale)</label>
              <input {...register('phone')} className={inputStyle} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={labelStyle}>Stato Iniziale</label>
                    <select {...register('status')} className={inputStyle}>
                        <option value="attivo">Attivo</option>
                        <option value="in prova">In prova</option>
                    </select>
                </div>
                <div>
                    <label className={labelStyle}>Prima Scadenza (Opzionale)</label>
                    <input type="date" {...register('endDate')} className={inputStyle + " text-muted"} />
                </div>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-white/10">
            <h4 className={headingStyle + " flex items-center gap-2"}><FiDollarSign /> Dati Primo Pagamento (Opzionale)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelStyle}>Importo Pagato (€)</label>
                <input type="number" step="0.01" {...register('paymentAmount')} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Durata Percorso</label>
                <input {...register('paymentDuration')} className={inputStyle} placeholder="Es. 3 mesi" />
              </div>
              <div>
                <label className={labelStyle}>Metodo Pagamento</label>
                <input {...register('paymentMethod')} className={inputStyle} placeholder="Es. Bonifico" />
              </div>
            </div>
        </div>
        
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/80 text-white rounded-lg transition disabled:opacity-50"
          >
            <FiSave /> {isSubmitting ? 'Salvataggio...' : 'Salva Cliente'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}


import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';

// Funzione per formattare la data per l'input type="date"
const formatDateForInput = (date) => {
  if (!date) return '';
  // Se la data viene da Firebase (oggetto Timestamp), la convertiamo
  const d = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
  if (isNaN(d)) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function EditClient() {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const docRef = doc(db, 'clients', clientId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const clientData = docSnap.data();
          reset({
            ...clientData,
            endDate: formatDateForInput(clientData.endDate)
          });
        } else {
          navigate('/clients');
        }
      } catch (error) {
        console.error("Errore nel caricamento del cliente:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [clientId, reset, navigate]);

  const onSubmit = async (data) => {
    try {
      const clientRef = doc(db, 'clients', clientId);
      await updateDoc(clientRef, {
        ...data,
        endDate: data.endDate ? new Date(data.endDate) : null,
      });
      navigate('/clients');
    } catch (error) {
      console.error("Errore nell'aggiornamento del cliente: ", error);
      alert("Si è verificato un errore durante l'aggiornamento.");
    }
  };

  const inputStyle = "w-full p-2 bg-background border border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary";
  const labelStyle = "block mb-1 text-sm font-medium text-muted";

  if (loading) return <div className="text-center p-8 text-muted">Caricamento...</div>;

  return (
    <motion.div 
      className="w-full max-w-2xl mx-auto bg-card rounded-xl shadow border border-white/10 p-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Modifica Cliente</h1>
        <button 
          onClick={() => navigate('/clients')} 
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-muted"
        >
          <FiArrowLeft /> Annulla
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className={labelStyle}>Nome e Cognome</label>
          <input {...register('name', { required: true })} className={inputStyle} />
        </div>
        <div>
          <label className={labelStyle}>Email</label>
          <input type="email" {...register('email', { required: true })} className={inputStyle} />
        </div>
        <div>
          <label className={labelStyle}>Telefono (Opzionale)</label>
          <input {...register('phone')} className={inputStyle} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div>
            <label className={labelStyle}>Stato Cliente</label>
            <select {...register('status')} className={inputStyle}>
              <option value="attivo">Attivo</option>
              <option value="in prova">In Prova</option>
              <option value="sospeso">Sospeso</option>
              <option value="scaduto">Scaduto</option>
            </select>
          </div>
          <div>
            <label className={labelStyle}>Data Scadenza Attuale</label>
            <input type="date" {...register('endDate')} className={inputStyle + " text-muted"} />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/80 text-white rounded-lg"
          >
            <FiSave /> {isSubmitting ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}


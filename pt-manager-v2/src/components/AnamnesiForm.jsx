import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FiSave, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function AnamnesiForm({ clientId, onSave }) {
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm();
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const onSubmit = async (data) => {
    setMessage('');
    setIsError(false);
    try {
      const anamnesiRef = doc(db, 'clients', clientId, 'anamnesi', 'initial');
      await setDoc(anamnesiRef, { ...data, createdAt: serverTimestamp() });

      setMessage("Anamnesi salvata con successo!");
      setTimeout(onSave, 1500);

    } catch (error) {
      console.error("Errore nel salvataggio dell'anamnesi:", error);
      setMessage("Si è verificato un errore. Riprova.");
      setIsError(true);
    }
  };

  const inputStyle = "w-full p-2 bg-background border border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary";
  const labelStyle = "block mb-1 text-sm font-medium text-muted";
  const sectionStyle = "bg-card p-4 rounded-lg border border-white/10";
  const headingStyle = "font-semibold mb-3 text-lg text-primary";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h3 className="text-2xl font-bold mb-6">Compila Anamnesi Iniziale</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* --- Dati Anagrafici --- */}
        <div className={sectionStyle}>
          <h4 className={headingStyle}>Dati Anagrafici e Misure</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Nome*</label>
              <input {...register('firstName', { required: true })} className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Cognome*</label>
              <input {...register('lastName', { required: true })} className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Data di Nascita*</label>
              <input type="date" {...register('birthDate', { required: true })} className={inputStyle + " text-muted"} />
            </div>
             <div>
              <label className={labelStyle}>Che lavoro fai?*</label>
              <input {...register('job', { required: true })} className={inputStyle} placeholder="Es. Impiegato, operaio..." />
            </div>
            <div>
              <label className={labelStyle}>Peso (kg)*</label>
              <input type="number" step="0.1" {...register('weight', { required: true })} className={inputStyle} placeholder="Es. 75.5" />
            </div>
            <div>
              <label className={labelStyle}>Altezza (cm)*</label>
              <input type="number" {...register('height', { required: true })} className={inputStyle} placeholder="Es. 180" />
            </div>
          </div>
        </div>

        {/* --- Abitudini Alimentari --- */}
        <div className={sectionStyle}>
          <h4 className={headingStyle}>Abitudini Alimentari</h4>
          <div className="space-y-4">
            <div>
                <label className={labelStyle}>Quanti pasti riesci a fare al giorno?*</label>
                <select {...register('mealsPerDay', { required: true })} className={inputStyle}>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                </select>
            </div>
            <div>
              <label className={labelStyle}>Colazione: Dolce o Salata?*</label>
              <select {...register('breakfastType', { required: true })} className={inputStyle}>
                <option value="dolce">Dolce</option>
                <option value="salato">Salato</option>
              </select>
            </div>
            <div>
              <label className={labelStyle}>Scrivimi una lista di alimenti da inserire nella settimana*</label>
              <textarea {...register('desiredFoods', { required: true })} rows="3" className={inputStyle} placeholder="Elenca qui gli alimenti che preferisci..." />
            </div>
            <div>
              <label className={labelStyle}>Cosa non mangi?*</label>
              <textarea {...register('dislikedFoods', { required: true })} rows="2" className={inputStyle} placeholder="Elenca qui gli alimenti da evitare..." />
            </div>
            <div>
              <label className={labelStyle}>Hai intolleranze?*</label>
              <input {...register('intolerances', { required: true })} className={inputStyle} placeholder="Es. Lattosio, glutine, nessuna..." />
            </div>
             <div>
              <label className={labelStyle}>Hai problemi di digestione o gonfiore?*</label>
              <input {...register('digestionIssues', { required: true })} className={inputStyle} placeholder="Sì/No, e se sì quali..." />
            </div>
          </div>
        </div>
        
        {/* --- Allenamento --- */}
        <div className={sectionStyle}>
            <h4 className={headingStyle}>Allenamento</h4>
            <div className="space-y-4">
                <div>
                    <label className={labelStyle}>Quanti allenamenti a settimana?*</label>
                    <input type="number" {...register('workoutsPerWeek', { required: true })} className={inputStyle} placeholder="Es. 3" />
                </div>
                <div>
                    <label className={labelStyle}>Specialità, dove ti alleni e con quali attrezzi?*</label>
                    <textarea {...register('trainingDetails', { required: true })} rows="3" className={inputStyle} placeholder="Es. Bodybuilding in palestra, a casa con manubri e panca..." />
                </div>
                <div>
                    <label className={labelStyle}>A che ora e per quanto tempo ti alleni?*</label>
                    <input {...register('trainingTime', { required: true })} className={inputStyle} placeholder="Es. La sera dalle 18 alle 19:30" />
                </div>
            </div>
        </div>

        {/* --- Salute e Obiettivi --- */}
        <div className={sectionStyle}>
          <h4 className={headingStyle}>Salute e Obiettivi</h4>
          <div className="space-y-4">
            <div>
              <label className={labelStyle}>Infortuni o problematiche posturali/articolari?*</label>
              <textarea {...register('injuries', { required: true })} rows="3" className={inputStyle} placeholder="Es. Mal di schiena, ernie, sciatalgie..." />
            </div>
            <div>
              <label className={labelStyle}>Prendi farmaci?*</label>
              <input {...register('medications', { required: true })} className={inputStyle} placeholder="Sì/No, e se sì quali..." />
            </div>
             <div>
              <label className={labelStyle}>Usi integratori? (se sì, quali)*</label>
              <input {...register('supplements', { required: true })} className={inputStyle} placeholder="Sì/No, e se sì quali..." />
            </div>
            <div>
              <label className={labelStyle}>Scrivimi il tuo obiettivo*</label>
              <textarea {...register('mainGoal', { required: true })} rows="3" className={inputStyle} placeholder="Descrivi in dettaglio l'obiettivo che vuoi raggiungere..." />
            </div>
            <div>
                <label className={labelStyle}>Durata percorso scelto?*</label>
                <input {...register('programDuration', { required: true })} className={inputStyle} placeholder="Es. 3 mesi, 6 mesi..." />
            </div>
          </div>
        </div>
        
        {/* --- Messaggio finale sulle foto --- */}
        <div className="bg-primary/10 p-4 rounded-lg border border-primary/30 text-center">
            <p className="text-sm text-primary">Ricorda di richiedere al cliente le 4 foto per il check iniziale (frontale, laterali, posteriore).</p>
        </div>

        {message && (
            <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${isError ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
            {isError ? <FiAlertCircle /> : <FiCheckCircle />}
            {message}
            </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/80 text-white rounded-lg transition disabled:opacity-50 font-semibold"
          >
            <FiSave /> {isSubmitting ? 'Salvataggio...' : 'Salva Anamnesi'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}


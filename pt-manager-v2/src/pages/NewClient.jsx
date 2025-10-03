import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase.js';
import { doc, serverTimestamp, writeBatch, collection } from 'firebase/firestore';
import { FiSave, FiArrowLeft, FiDollarSign, FiCopy, FiCheck, FiLock } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

// Genera password casuale
const generatePassword = () => {
  const length = 8;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let retVal = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
};

// Messaggio di benvenuto
const generateWelcomeMessage = (name, email, password) => {
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
};

export default function NewClient() {
  const navigate = useNavigate();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newClientCredentials, setNewClientCredentials] = useState(null);
  const [copied, setCopied] = useState(false);
  const [newClientId, setNewClientId] = useState(null);

  const onSubmit = async (data) => {
    const tempPassword = generatePassword();

    try {
      const batch = writeBatch(db);

      // 🔑 Creiamo un nuovo ID cliente senza fare login/logout
      const newClientRef = doc(collection(db, 'clients'));
      const newUserId = newClientRef.id;

      const durationNum = parseInt(data.duration, 10);
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + durationNum);

      const clientData = {
        name: data.name,
        name_lowercase: data.name.toLowerCase(),
        email: data.email,
        phone: data.phone || null,
        status: 'attivo',
        planType: data.planType,
        createdAt: serverTimestamp(),
        scadenza: expiryDate,
        isClient: true,
        firstLogin: true,
        tempPassword: tempPassword, // 🔑 memorizziamo la password temporanea
      };
      batch.set(newClientRef, clientData);

      if (data.paymentAmount) {
        const paymentRef = doc(collection(db, 'clients', newUserId, 'payments'));
        const paymentData = {
          amount: parseFloat(data.paymentAmount),
          duration: `${durationNum} mes${durationNum > 1 ? 'i' : 'e'}`,
          paymentMethod: data.paymentMethod || null,
          paymentDate: serverTimestamp(),
        };
        batch.set(paymentRef, paymentData);
      }

      await batch.commit();
      
      setNewClientCredentials({ name: data.name, email: data.email, password: tempPassword });
      setNewClientId(newUserId);
      setShowSuccessModal(true);

    } catch (error) {
      console.error("Errore nella creazione del cliente:", error);
      alert(`Errore: ${error.message}`);
    }
  };
  
  const handleCopyMessage = () => {
    const message = generateWelcomeMessage(
      newClientCredentials.name, 
      newClientCredentials.email, 
      newClientCredentials.password
    );
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    reset(); 
    if (newClientId) {
      navigate(`/clients/${newClientId}`); // 🔑 vai direttamente alla scheda cliente
    } else {
      navigate('/clients');
    }
  };
  
  const inputStyle = "w-full p-2 bg-background border border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary";
  const labelStyle = "block mb-1 text-sm font-medium text-muted";
  const sectionStyle = "bg-card/40 p-4 rounded-xl border border-white/10 backdrop-blur-md";
  const headingStyle = "font-semibold mb-3 text-lg text-primary";

  const welcomeMessage = newClientCredentials ? generateWelcomeMessage(
    newClientCredentials.name, 
    newClientCredentials.email, 
    newClientCredentials.password
  ) : '';

  return (
    <>
      <motion.div 
        className="w-full max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Onboarding Nuovo Cliente</h1>
          <button onClick={() => navigate('/clients')} className="flex items-center gap-2 px-3 py-1.5 bg-card/50 text-sm rounded-lg border border-white/10 backdrop-blur-sm hover:bg-white/10">
            <FiArrowLeft /> Torna
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className={sectionStyle}>
            <h4 className={headingStyle}>1. Anagrafica</h4>
            <div className="space-y-4">
              <div>
                <label className={labelStyle}>Nome e Cognome*</label>
                <input {...register('name', { required: true })} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Email (sarà il suo username)*</label>
                <input type="email" {...register('email', { required: true })} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Telefono (Opzionale)</label>
                <input {...register('phone')} className={inputStyle} />
              </div>
            </div>
          </div>
          
          <div className={sectionStyle}>
            <h4 className={headingStyle}>2. Dettagli Percorso</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>Tipo di Percorso*</label>
                <select {...register('planType', { required: true })} className={inputStyle}>
                  <option value="allenamento">Solo Allenamento</option>
                  <option value="alimentazione">Solo Alimentazione</option>
                  <option value="completo">Completo (Allenamento + Alimentazione)</option>
                </select>
              </div>
              <div>
                <label className={labelStyle}>Durata del Percorso*</label>
                <select {...register('duration', { required: true })} className={inputStyle}>
                  <option value="">Seleziona durata</option>
                  {[...Array(24).keys()].map(i => {
                    const months = i + 1;
                    return <option key={months} value={months}>{months} mes{months > 1 ? 'i' : 'e'}</option>
                  })}
                </select>
              </div>
            </div>
          </div>

          <div className={sectionStyle}>
            <h4 className={headingStyle + " flex items-center gap-2"}><FiDollarSign /> 3. Primo Pagamento (Opzionale)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>Importo Pagato (€)</label>
                <input type="number" step="0.01" {...register('paymentAmount')} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Metodo di Pagamento</label>
                <input {...register('paymentMethod')} className={inputStyle} placeholder="Es. Bonifico, Contanti" />
              </div>
            </div>
          </div>
        
          <div className="flex justify-end pt-4">
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/80 text-white rounded-lg transition disabled:opacity-50 font-semibold">
              <FiSave /> {isSubmitting ? 'Creazione in corso...' : 'Crea Cliente e Genera Password'}
            </button>
          </div>
        </form>
      </motion.div>
      
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <motion.div 
              className="bg-card p-6 rounded-2xl border border-white/10 w-full max-w-md shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h2 className="text-xl font-bold text-center text-foreground">Cliente Creato con Successo!</h2>
              <p className="text-center text-muted text-sm mt-2">Copia il messaggio e invialo al cliente per il suo primo accesso.</p>
              
              <div className="my-6">
                <label className="block mb-2 text-sm font-medium text-muted">Messaggio pronto da copiare:</label>
                <textarea
                  readOnly
                  value={welcomeMessage}
                  className="w-full p-3 bg-background border border-white/10 rounded-lg text-white font-mono text-sm resize-none h-48"
                />
              </div>
              
              <motion.button 
                onClick={handleCopyMessage} 
                className="w-full py-3 bg-green-500 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {copied ? <><FiCheck/> Messaggio Copiato!</> : <><FiLock/> Copia Messaggio Completo</>}
              </motion.button>
              <button onClick={handleCloseModal} className="w-full mt-2 py-2 text-muted text-sm text-center hover:text-white">
                Chiudi e vai alla scheda cliente
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

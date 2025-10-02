import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase.js';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, serverTimestamp, writeBatch, collection } from 'firebase/firestore';
import { FiSave, FiArrowLeft, FiDollarSign, FiCopy, FiCheck, FiLock } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

// Funzione per generare una password casuale sicura
const generatePassword = () => {
  const length = 8;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let retVal = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
};

export default function NewClient() {
  const navigate = useNavigate();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newClientCredentials, setNewClientCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  // Mantiene traccia dell'utente admin loggato
  const adminUser = auth.currentUser;

  const onSubmit = async (data) => {
    const tempPassword = generatePassword();

    try {
      // 1. Crea il nuovo utente cliente. Firebase eseguirà l'accesso con questo utente.
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, tempPassword);
      const newUserId = userCredential.user.uid;

      const batch = writeBatch(db);
      
      const newClientRef = doc(db, 'clients', newUserId);
      
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
      
      // Salva le credenziali da mostrare
      setNewClientCredentials({ name: data.name, email: data.email, password: tempPassword });

      // 2. DISCONNETTI IMMEDIATAMENTE l'utente cliente appena creato
      await signOut(auth);

      // 3. Ora che l'utente è disconnesso, la tua sessione da admin verrà ripristinata da Firebase.
      // Mostra la finestra di successo.
      setShowSuccessModal(true);

    } catch (error) {
      console.error("Errore nella creazione del cliente:", error);
      alert(`Errore: ${error.message}`);
      
      // Se c'è stato un errore, assicurati di ripristinare la sessione admin
      if (auth.currentUser !== adminUser) {
        await signOut(auth);
      }
    }
  };
  
  const copyToClipboard = () => {
      const text = `Ciao ${newClientCredentials.name},\n\nEcco le tue credenziali per accedere alla nostra area riservata:\n\nEmail: ${newClientCredentials.email}\nPassword: ${newClientCredentials.password}\n\nTi consiglio di cambiarla al primo accesso.\nA presto!`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    reset(); // Pulisce il form
    navigate('/clients'); // Naviga alla lista dei clienti
  };
  
  const inputStyle = "w-full p-2 bg-background border border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary";
  const labelStyle = "block mb-1 text-sm font-medium text-muted";
  const sectionStyle = "bg-card/40 p-4 rounded-xl border border-white/10 backdrop-blur-md";
  const headingStyle = "font-semibold mb-3 text-lg text-primary";

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
                  <p className="text-center text-muted text-sm mt-2">Copia le credenziali e inviale al cliente per il suo primo accesso.</p>
                  <div className="my-6 space-y-3">
                      <div className="bg-background p-3 rounded-lg">
                          <p className="text-xs text-muted">Email (Username)</p>
                          <p className="font-mono text-white">{newClientCredentials.email}</p>
                      </div>
                       <div className="bg-background p-3 rounded-lg">
                         <p className="text-xs text-muted">Password Temporanea</p>
                         <p className="font-mono text-white">{newClientCredentials.password}</p>
                      </div>
                  </div>
                  <motion.button 
                    onClick={copyToClipboard} 
                    className="w-full py-3 bg-green-500 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                      {copied ? <><FiCheck/> Copiato!</> : <><FiLock/> Copia Credenziali</>}
                  </motion.button>
                  <button onClick={handleCloseModal} className="w-full mt-2 py-2 text-muted text-sm text-center">
                      Chiudi e vai alla lista clienti
                  </button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}


import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, collectionGroup, onSnapshot, query, limit } from 'firebase/firestore';
import { FiUserPlus, FiFileText, FiCheckSquare, FiX, FiDollarSign } from 'react-icons/fi'; // AGGIUNTA FiDollarSign
import { motion, AnimatePresence } from 'framer-motion';

function toDate(x) {
  if (!x) return null;
  if (typeof x?.toDate === 'function') return x.toDate();
  const d = new Date(x);
  return isNaN(d) ? null : d;
}

// Funzione per determinare lo stato di pagamento (copiata dalla logica in Clients.jsx)
const getPaymentStatus = (scadenza) => {
    const expiryDate = toDate(scadenza);
    if (!expiryDate) return 'na';

    const now = new Date();
    const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'expired';
    if (diffDays <= 15) return 'expiring'; // Entro 15 giorni
    return 'paid';
};


// Componente per una singola colonna, ora con il pulsante per archiviare
const UpdateColumn = ({ title, icon, items, navigate, tab, onDismiss }) => (
  <div className="bg-card p-4 rounded-lg border border-white/10 flex-1 min-w-[280px]">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      {icon} {title}
    </h3>
    <div className="space-y-2">
      <AnimatePresence>
        {items.length > 0 ? (
          items.map((item, index) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10, transition: { duration: 0.2 } }}
              className="group flex items-center justify-between p-2 rounded-md hover:bg-white/5"
            >
              <button
                className="flex-1 text-left"
                onClick={() => navigate(`/client/${item.clientId}?tab=${tab}`)}
              >
                <p className="font-medium text-sm">{item.clientName}</p>
                <p className="text-xs text-muted">
                  {toDate(item.date)?.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
                  {item.scadenza && <span className="text-red-400 ml-2 font-bold">{`(Scad. ${toDate(item.scadenza).toLocaleDateString('it-IT')})`}</span>}
                </p>
              </button>
              {/* --- PULSANTE PER ARCHIVIARE LA NOTIFICA --- */}
              <button 
                onClick={() => onDismiss(item.id)}
                className="p-1 rounded-full opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-white/10 transition-opacity"
                title="Archivia notifica"
              >
                <FiX size={14} />
              </button>
            </motion.div>
          ))
        ) : (
          <p className="text-sm text-muted px-2">Nessun aggiornamento recente.</p>
        )}
      </AnimatePresence>
    </div>
  </div>
);

export default function Updates() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [newChecks, setNewChecks] = useState([]);
  const [newAnamnesis, setNewAnamnesis] = useState([]);
  const [dismissedItems, setDismissedItems] = useState([]); // Stato per le notifiche archiviate

  useEffect(() => {
    // Carica tutti i clienti una volta sola
    const unsub = onSnapshot(collection(db, "clients"), (snap) => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const clientNameMap = useMemo(() => {
    return clients.reduce((acc, client) => {
      acc[client.id] = client.name;
      return acc;
    }, {});
  }, [clients]);

  // Logica per caricare Checks e Anamnesis
  useEffect(() => {
    if (Object.keys(clientNameMap).length === 0) return;

    const checksQuery = query(collectionGroup(db, 'checks'), limit(30));
    const unsubChecks = onSnapshot(checksQuery, (snap) => {
      const items = snap.docs
        .map(doc => {
          const clientId = doc.ref.path.split('/')[1];
          return {
            id: doc.id,
            clientId,
            clientName: clientNameMap[clientId],
            date: doc.data().createdAt,
          };
        })
        .filter(item => item.clientName); // --- FILTRA VIA I CLIENTI ELIMINATI ---
      
      items.sort((a, b) => (toDate(b.date) || 0) - (toDate(a.date) || 0));
      setNewChecks(items.slice(0, 10));
    });

    const anamnesisQuery = query(collectionGroup(db, 'anamnesi'), limit(30));
    const unsubAnamnesis = onSnapshot(anamnesisQuery, (snap) => {
      const items = snap.docs
        .map(doc => {
          const clientId = doc.ref.path.split('/')[1];
          return {
            id: doc.id,
            clientId,
            clientName: clientNameMap[clientId],
            date: doc.data().submittedAt || doc.data().createdAt, // Usa submittedAt se disponibile
          };
        })
        .filter(item => item.clientName); // --- FILTRA VIA I CLIENTI ELIMINATI ---

      items.sort((a, b) => (toDate(b.date) || 0) - (toDate(a.date) || 0));
      setNewAnamnesis(items.slice(0, 10));
    });

    return () => {
      unsubChecks();
      unsubAnamnesis();
    };
  }, [clientNameMap]);
  
  // Lista dei NUOVI CLIENTI
  const newClients = useMemo(() => {
      return [...clients]
        .sort((a, b) => (toDate(b.createdAt) || 0) - (toDate(a.createdAt) || 0))
        .slice(0, 5)
        .map(c => ({
            id: c.id,
            clientId: c.id,
            clientName: c.name,
            date: c.createdAt
        }));
  }, [clients]);

  // Lista dei CLIENTI IN SCADENZA (Nuova Logica)
  const expiringClients = useMemo(() => {
      return clients
        .filter(c => getPaymentStatus(c.scadenza) === 'expiring' || getPaymentStatus(c.scadenza) === 'expired') // Filtra sia "in scadenza" che "scaduti"
        .sort((a, b) => (toDate(a.scadenza) || 0) - (toDate(b.scadenza) || 0)) // Ordina per la scadenza più vicina
        .map(c => ({
            id: c.id,
            clientId: c.id,
            clientName: c.name,
            date: c.scadenza, // La data principale è la scadenza
            scadenza: c.scadenza, // Passiamo la scadenza per la visualizzazione
        }));
  }, [clients]);

  // Funzione per archiviare una notifica
  const handleDismiss = (itemId) => {
    setDismissedItems(prev => [...prev, itemId]);
  };
  
  // Filtra gli item archiviati prima di passarli alle colonne
  const filteredNewClients = newClients.filter(item => !dismissedItems.includes(item.id));
  const filteredExpiringClients = expiringClients.filter(item => !dismissedItems.includes(item.id)); // Nuovo filtro
  const filteredNewChecks = newChecks.filter(item => !dismissedItems.includes(item.id));
  const filteredNewAnamnesis = newAnamnesis.filter(item => !dismissedItems.includes(item.id));

  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold mb-6">Ultimi Aggiornamenti</h1>
      <div className="flex flex-col md:flex-row gap-6 overflow-x-auto pb-4"> {/* Aggiunto overflow-x-auto per il mobile */}
        {/* COLONNA IN SCADENZA */}
        <UpdateColumn 
            title="In Scadenza" 
            icon={<FiDollarSign className="text-red-400" />} 
            items={filteredExpiringClients} 
            navigate={navigate} 
            tab="payments" 
            onDismiss={handleDismiss} 
        />
        
        {/* COLONNE ESISTENTI */}
        <UpdateColumn title="Clienti Nuovi" icon={<FiUserPlus className="text-primary" />} items={filteredNewClients} navigate={navigate} tab="anamnesi" onDismiss={handleDismiss} />
        <UpdateColumn title="Check Nuovi" icon={<FiCheckSquare className="text-green-400" />} items={filteredNewChecks} navigate={navigate} tab="checks" onDismiss={handleDismiss} />
        <UpdateColumn title="Anamnesi Nuove" icon={<FiFileText className="text-yellow-400" />} items={filteredNewAnamnesis} navigate={navigate} tab="anamnesi" onDismiss={handleDismiss} />
      </div>
    </div>
  );
}

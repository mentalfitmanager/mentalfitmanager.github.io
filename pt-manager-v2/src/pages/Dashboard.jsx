import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, collectionGroup } from "firebase/firestore";
import { db } from "../firebase";
import { 
  FiUsers, 
  FiClock, 
  FiCheckCircle, 
  FiTrendingUp, 
  FiDollarSign, 
  FiBell, 
  FiFileText,
  FiPlus
} from "react-icons/fi";
import { Bar } from "react-chartjs-2";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler 
} from "chart.js";
import { motion, AnimatePresence } from "framer-motion";

// Registra tutti i componenti necessari per Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

/**
 * Converte un timestamp di Firebase o una data in un oggetto Date di JavaScript.
 * @param {any} x - Il valore da convertire.
 * @returns {Date|null} L'oggetto Date o null se invalido.
 */
function toDate(x) {
  if (!x) return null;
  if (typeof x?.toDate === 'function') return x.toDate();
  const d = new Date(x);
  return isNaN(d) ? null : d;
}

/**
 * Componente per le card delle statistiche chiave.
 * @param {{title: string, value: number, icon: JSX.Element, isCurrency?: boolean}} props
 */
const StatCard = ({ title, value, icon, isCurrency = false }) => (
  <div className="bg-card/50 p-4 rounded-lg border border-white/10 backdrop-blur-sm">
    <div className="flex items-center gap-3">
      <span className="text-muted">{icon}</span>
      <p className="text-muted text-sm">{title}</p>
    </div>
    <p className="text-2xl font-bold text-foreground mt-2">
      {isCurrency ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value) : value}
    </p>
  </div>
);

/**
 * Componente per un singolo elemento nel feed delle attività.
 * @param {{item: object, navigate: function}} props
 */
const ActivityItem = ({ item, navigate }) => {
  const icons = {
    expiring: <FiClock className="text-yellow-400" />,
    new_check: <FiCheckCircle className="text-green-400" />,
    new_anamnesi: <FiFileText className="text-blue-400" />,
  };
  const tabMap = {
    expiring: 'payments',
    new_check: 'checks',
    new_anamnesi: 'anamnesi',
  };

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
      onClick={() => navigate(`/client/${item.clientId}?tab=${tabMap[item.type]}`)}
      className="w-full flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
    >
      <div className="mt-1 flex-shrink-0">{icons[item.type]}</div>
      <div>
        <p className="text-sm font-semibold">{item.clientName}</p>
        <p className="text-xs text-muted">{item.description}</p>
      </div>
    </motion.button>
  );
};

/**
 * La Dashboard principale, il "Command Center" del PT.
 */
export default function Dashboard() {
  const navigate = useNavigate();
  // Stati per i dati grezzi da Firebase
  const [clients, setClients] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [allChecks, setAllChecks] = useState([]);
  const [allAnamnesis, setAllAnamnesis] = useState([]);

  // Mappa per associare ID cliente a nome per una ricerca veloce
  const clientNameMap = useMemo(() => 
    clients.reduce((acc, client) => ({ ...acc, [client.id]: client.name }), {}), 
  [clients]);

  // Effetto per caricare tutti i dati da Firebase in tempo reale
  useEffect(() => {
    const unsubClients = onSnapshot(collection(db, "clients"), snap => 
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubPayments = onSnapshot(collectionGroup(db, 'payments'), snap => 
      setAllPayments(snap.docs.map(doc => doc.data()))
    );
    const unsubChecks = onSnapshot(collectionGroup(db, 'checks'), snap => 
      setAllChecks(snap.docs.map(doc => ({ ...doc.data(), clientId: doc.ref.path.split('/')[1] })))
    );
    const unsubAnamnesis = onSnapshot(collectionGroup(db, 'anamnesi'), snap => 
      setAllAnamnesis(snap.docs.map(doc => ({ ...doc.data(), clientId: doc.ref.path.split('/')[1] })))
    );

    // Funzione di pulizia per interrompere l'ascolto quando il componente viene smontato
    return () => { unsubClients(); unsubPayments(); unsubChecks(); unsubAnamnesis(); };
  }, []);

  // Calcolo di tutti i dati derivati (statistiche, notifiche, dati per i grafici)
  const { clientStats, monthlyIncome, activityFeed, combinedChartData } = useMemo(() => {
    const now = new Date();
    let activeClients = 0;
    clients.forEach(c => {
      const end = toDate(c.endDate);
      if(!end || end >= now) activeClients++;
    });

    const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
    const revenueCounts = Array(12).fill(0);
    allPayments.forEach(p => {
      const paymentDate = toDate(p.paymentDate);
      if (paymentDate && paymentDate.getFullYear() === now.getFullYear()) {
        revenueCounts[paymentDate.getMonth()] += p.amount;
      }
    });

    const newClientsCounts = Array(12).fill(0);
    clients.forEach(c => {
      const created = toDate(c.createdAt);
      if (created && created.getFullYear() === now.getFullYear()) {
        newClientsCounts[created.getMonth()]++;
      }
    });
    
    // Genera e unisce tutte le notifiche in un unico feed di attività
    const expiringNotifs = clients
      .filter(c => {
        const end = toDate(c.endDate);
        if (!end) return false;
        const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 15; // Finestra di notifica di 15 giorni
      })
      .map(c => ({
        type: 'expiring',
        date: c.endDate,
        clientId: c.id,
        description: `Scade tra ${Math.ceil((toDate(c.endDate) - now) / (1000 * 60 * 60 * 24))} giorni`,
      }));

    const checkNotifs = allChecks.map(c => ({
        type: 'new_check',
        date: c.createdAt,
        clientId: c.clientId,
        description: `Ha inviato un nuovo check`,
    }));
    
    const anamnesiNotifs = allAnamnesis.map(a => ({
        type: 'new_anamnesi',
        date: a.createdAt,
        clientId: a.clientId,
        description: `Ha compilato l'anamnesi`,
    }));

    // Unisce, ordina, limita e arricchisce il feed con i nomi dei clienti
    const feed = [...expiringNotifs, ...checkNotifs, ...anamnesiNotifs]
        .sort((a,b) => (toDate(b.date) || 0) - (toDate(a.date) || 0))
        .slice(0, 10)
        .map(item => ({...item, clientName: clientNameMap[item.clientId]}))
        .filter(item => item.clientName); // Rimuove notifiche di clienti cancellati

    return {
      clientStats: { total: clients.length, active: activeClients },
      monthlyIncome: revenueCounts[now.getMonth()],
      activityFeed: feed,
      combinedChartData: {
        labels: mesi,
        datasets: [
          {
            type: 'bar',
            label: 'Nuovi Clienti',
            data: newClientsCounts,
            backgroundColor: "rgba(37, 99, 235, 0.6)",
            borderColor: "rgba(37, 99, 235, 1)",
            yAxisID: 'y1',
            order: 2,
          },
          {
            type: 'line',
            label: 'Fatturato',
            data: revenueCounts,
            borderColor: "#22c55e",
            backgroundColor: "rgba(34, 197, 94, 0.2)",
            fill: true,
            tension: 0.4,
            yAxisID: 'y',
            order: 1,
          },
        ],
      },
    };
  }, [clients, allPayments, allChecks, allAnamnesis, clientNameMap]);
  
  // Opzioni di configurazione per il grafico combinato
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: { 
      legend: { labels: { color: '#fafafa' } },
      tooltip: {
        backgroundColor: '#18181b',
        titleColor: '#fafafa',
        bodyColor: '#fafafa',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      }
    },
    scales: {
      x: { ticks: { color: "#71717a" }, grid: { color: "rgba(255,255,255,0.05)" } },
      y: { // Asse per il fatturato
        display: true, 
        type: 'linear', 
        position: 'left', 
        ticks: { color: "#22c55e", callback: v => `€${v}` }, 
        grid: { color: "rgba(255,255,255,0.05)" } 
      },
      y1: { // Asse per i nuovi clienti
        display: true, 
        type: 'linear', 
        position: 'right', 
        ticks: { color: "#2563eb", stepSize: 1 }, 
        grid: { drawOnChartArea: false } 
      }
    },
  };

  // Varianti per le animazioni a cascata
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  return (
    <motion.div className="w-full relative" variants={containerVariants} initial="hidden" animate="visible">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="aurora-bg"></div>
      </div>

      <motion.div className="flex justify-between items-center mb-6" variants={itemVariants}>
        <h1 className="text-3xl font-bold">Command Center</h1>
        <div className="flex gap-2">
            <button onClick={() => navigate('/clients')} className="px-3 py-1.5 bg-card/50 text-sm rounded-lg border border-white/10 backdrop-blur-sm hover:bg-white/10">Gestisci Clienti</button>
            <button onClick={() => navigate('/new')} className="px-3 py-1.5 bg-primary text-sm font-semibold rounded-lg hover:bg-primary/80"><FiPlus className="inline -mt-1 mr-1"/> Nuovo Cliente</button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <StatCard title="Incasso Mensile" value={monthlyIncome} icon={<FiDollarSign className="text-green-400"/>} isCurrency={true} />
              <StatCard title="Clienti Attivi" value={clientStats.active} icon={<FiCheckCircle className="text-primary"/>} />
            </div>
          </motion.div>
          <motion.div className="bg-card/50 p-4 sm:p-6 rounded-xl border border-white/10 backdrop-blur-sm" variants={itemVariants}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><FiTrendingUp /> Business Overview Annuale</h2>
            <div className="h-80"><Bar data={combinedChartData} options={chartOptions} /></div>
          </motion.div>
        </div>
        
        <motion.div className="bg-card/50 p-4 sm:p-6 rounded-xl border border-white/10 backdrop-blur-sm" variants={itemVariants}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><FiBell/> Feed Attività</h2>
            <div className="space-y-3 max-h-[29.5rem] overflow-y-auto pr-2">
              <AnimatePresence>
                {activityFeed.length > 0 ? activityFeed.map(item => (
                  <ActivityItem key={item.type + item.clientId + item.date?.seconds} item={item} navigate={navigate} />
                )) : <p className="text-sm text-muted p-2">Nessuna attività recente da mostrare.</p>}
              </AnimatePresence>
            </div>
        </motion.div>
      </div>
    </motion.div>
  );
}


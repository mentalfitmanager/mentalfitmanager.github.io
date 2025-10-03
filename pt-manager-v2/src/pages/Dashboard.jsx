import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, collectionGroup, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { 
  FiUsers, FiClock, FiCheckCircle, FiTrendingUp, FiDollarSign, 
  FiBell, FiFileText, FiPlus, FiBarChart2, FiTarget, FiEdit, FiRefreshCw
} from "react-icons/fi";
import { Bar, Line } from "react-chartjs-2";
import { 
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, 
  LineElement, Title, Tooltip, Legend, Filler 
} from "chart.js";
import { motion, AnimatePresence } from "framer-motion";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// --- UTILITY FUNCTIONS ---
function toDate(x) {
  if (!x) return null;
  if (typeof x?.toDate === 'function') return x.toDate();
  const d = new Date(x);
  return isNaN(d) ? null : d;
}

const timeAgo = (date) => {
  if (!date) return '';
  const seconds = Math.floor((new Date() - toDate(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " anni fa";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " mesi fa";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " gg fa";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " ore fa";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " min fa";
  return "ora";
};

// --- COMPONENT: StatCard ---
const StatCard = ({ title, value, icon, isCurrency = false, isPercentage = false }) => (
  <div className="bg-card/40 p-4 rounded-xl border border-white/10 backdrop-blur-md h-full">
    <div className="flex items-center gap-3">
      <span className="text-muted">{icon}</span>
      <p className="text-muted text-sm">{title}</p>
    </div>
    <p className="text-2xl font-bold text-foreground mt-2">
      {isCurrency 
        ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value) 
        : isPercentage ? `${value}%` : value
      }
    </p>
  </div>
);

// --- COMPONENT: ActivityItem ---
const ActivityItem = ({ item, navigate }) => {
  const icons = {
    expiring: <FiClock className="text-yellow-400" />,
    new_check: <FiCheckCircle className="text-green-400" />,
    new_anamnesi: <FiFileText className="text-blue-400" />,
  };
  const tabMap = { expiring: 'payments', new_check: 'checks', new_anamnesi: 'anamnesi' };

  return (
    <motion.button
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => navigate(`/client/${item.clientId}?tab=${tabMap[item.type]}`)}
      className="w-full flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
    >
      <div className="mt-1 flex-shrink-0">{icons[item.type]}</div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{item.clientName}</p>
        <p className="text-xs text-muted">{item.description}</p>
      </div>
       <div className="text-xs text-muted flex-shrink-0">
        {timeAgo(item.date)}
      </div>
    </motion.button>
  );
};

// --- COMPONENT: ChartControls ---
const ChartControls = ({ dataType, setDataType, timeRange, setTimeRange }) => (
  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
    <div className="flex bg-card/50 p-1 rounded-lg border border-white/10 backdrop-blur-sm">
      <button onClick={() => setDataType('revenue')} className={`px-3 py-1 text-sm rounded-md transition ${dataType === 'revenue' ? 'bg-primary text-white' : 'text-muted'}`}>Fatturato</button>
      <button onClick={() => setDataType('clients')} className={`px-3 py-1 text-sm rounded-md transition ${dataType === 'clients' ? 'bg-primary text-white' : 'text-muted'}`}>Nuovi Clienti</button>
    </div>
    <div className="flex bg-card/50 p-1 rounded-lg border border-white/10 backdrop-blur-sm">
      <button onClick={() => setTimeRange('monthly')} className={`px-3 py-1 text-sm rounded-md transition ${timeRange === 'monthly' ? 'bg-white/10 text-white' : 'text-muted'}`}>Mese</button>
      <button onClick={() => setTimeRange('yearly')} className={`px-3 py-1 text-sm rounded-md transition ${timeRange === 'yearly' ? 'bg-white/10 text-white' : 'text-muted'}`}>Anno</button>
    </div>
  </div>
);

// --- COMPONENT: QuickNotes ---
const QuickNotes = () => {
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const notesRef = doc(db, 'app-data', 'quickNotes');

    useEffect(() => {
        const getNotes = async () => {
            const docSnap = await getDoc(notesRef);
            if (docSnap.exists()) {
                setNotes(docSnap.data().content);
            }
        };
        getNotes();
    }, []);

    useEffect(() => {
        // Debounce: salva dopo 2 secondi di inattività
        const handler = setTimeout(async () => {
            if (notes === undefined) return;
            setIsSaving(true);
            try {
                // Sovrascrive il documento
                await setDoc(notesRef, { content: notes, lastUpdated: serverTimestamp() });
            } catch (error) {
                console.error("Error saving notes:", error);
            } finally {
                // Imposta 'Salvataggio...' per un breve periodo
                setTimeout(() => setIsSaving(false), 1000); 
            }
        }, 2000); 

        return () => clearTimeout(handler); // Pulisce il timeout precedente
    }, [notes]);

    return (
        <div className="bg-card/40 p-4 rounded-xl border border-white/10 backdrop-blur-md h-full flex flex-col">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2"><FiEdit/> Appunti Rapidi</h2>
            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-full bg-transparent text-sm text-muted outline-none resize-none"
                placeholder="Scrivi qui le tue idee o cose da fare..."
            />
            <p className="text-xs text-right text-muted mt-2 h-4">
                {isSaving && 'Salvataggio...'}
            </p>
        </div>
    );
};

// --- MAIN COMPONENT: Dashboard ---
export default function Dashboard() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [allChecks, setAllChecks] = useState([]);
  const [allAnamnesis, setAllAnamnesis] = useState([]);
  
  const [chartDataType, setChartDataType] = useState('revenue');
  const [chartTimeRange, setChartTimeRange] = useState('yearly');

  // Mappa per un rapido recupero del nome cliente
  const clientNameMap = useMemo(() => 
    clients.reduce((acc, client) => ({ ...acc, [client.id]: client.name }), {}), 
  [clients]);

  // Ascoltatori in tempo reale (onSnapshot)
  useEffect(() => {
    // Clienti (Root Collection)
    const unsubClients = onSnapshot(collection(db, "clients"), snap => setClients(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    // Pagamenti (Collection Group per tutte le sub-collection 'payments')
    const unsubPayments = onSnapshot(collectionGroup(db, 'payments'), snap => 
        setAllPayments(snap.docs.map(doc => ({ 
            ...doc.data(), 
            // Estrai il clientId dal percorso del documento (es. clients/CLIENT_ID/payments/PAYMENT_ID)
            clientId: doc.ref.path.split('/')[1] 
        })))
    );

    // Check (Collection Group per tutte le sub-collection 'checks')
    const unsubChecks = onSnapshot(collectionGroup(db, 'checks'), snap => 
        setAllChecks(snap.docs.map(doc => ({ 
            ...doc.data(), 
            clientId: doc.ref.path.split('/')[1] 
        })))
    );

    // Anamnesi (Collection Group per tutte le sub-collection 'anamnesi')
    const unsubAnamnesis = onSnapshot(collectionGroup(db, 'anamnesi'), snap => 
        setAllAnamnesis(snap.docs.map(doc => ({ 
            ...doc.data(), 
            clientId: doc.ref.path.split('/')[1] 
        })))
    );
    
    // Cleanup dei listeners
    return () => { unsubClients(); unsubPayments(); unsubChecks(); unsubAnamnesis(); };
  }, []);

  // Logica di calcolo e aggregazione dati (useMemo)
  const { clientStats, monthlyIncome, activityFeed, chartData, focusClient, retentionRate } = useMemo(() => {
    const now = new Date();
    const validClientIds = new Set(clients.map(c => c.id)); 

    // Filtra i pagamenti per assicurarsi che appartengano a un cliente valido
    const validPayments = allPayments.filter(p => validClientIds.has(p.clientId));

    // Calcola Clienti Attivi
    let activeClients = 0;
    clients.forEach(c => {
      const end = toDate(c.scadenza);
      if(!end || end >= now) activeClients++;
    });

    // --- LOGICA GRAFICO (Revenue/Clients) ---
    let labels, data, chartConfig;
    
    if (chartTimeRange === 'yearly') {
        // 12 mesi
        labels = Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 11 + i, 1).toLocaleString('it-IT', { month: 'short' }));
        const revenueData = Array(12).fill(0);
        const clientsData = Array(12).fill(0);

        // Aggregazione Fatturato Annuale (con correzione parseFloat)
        validPayments.forEach(p => {
            const paymentDate = toDate(p.paymentDate);
            if(paymentDate){
                const diffMonths = (now.getFullYear() - paymentDate.getFullYear()) * 12 + (now.getMonth() - paymentDate.getMonth());
                if (diffMonths >= 0 && diffMonths < 12) revenueData[11 - diffMonths] += parseFloat(p.amount);
            }
        });
        
        // Aggregazione Nuovi Clienti Annuale
        clients.forEach(c => {
            const created = toDate(c.createdAt);
             if(created){
                const diffMonths = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
                if (diffMonths >= 0 && diffMonths < 12) clientsData[11 - diffMonths]++;
            }
        });
        data = chartDataType === 'revenue' ? revenueData : clientsData;
    } else { // monthly (per giorno)
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const revenueData = Array(daysInMonth).fill(0);
        const clientsData = Array(daysInMonth).fill(0);

        // Aggregazione Fatturato Mensile (con correzione parseFloat)
        validPayments.forEach(p => {
            const paymentDate = toDate(p.paymentDate);
            if (paymentDate && paymentDate.getFullYear() === now.getFullYear() && paymentDate.getMonth() === now.getMonth()) revenueData[paymentDate.getDate() - 1] += parseFloat(p.amount);
        });
        
        // Aggregazione Nuovi Clienti Mensile
        clients.forEach(c => {
            const created = toDate(c.createdAt);
            if (created && created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth()) clientsData[created.getDate() - 1]++;
        });
        data = chartDataType === 'revenue' ? revenueData : clientsData;
    }
    
    // Configurazione del set di dati del grafico
    if (chartDataType === 'revenue') {
        chartConfig = { type: 'line', label: 'Fatturato', data, borderColor: "#22c55e", backgroundColor: "rgba(34, 197, 94, 0.2)", fill: true, tension: 0.4 };
    } else {
        chartConfig = { type: 'bar', label: 'Nuovi Clienti', data, backgroundColor: "rgba(37, 99, 235, 0.6)" };
    }
    
    // --- FEED ATTIVITÀ ---
    const expiringNotifs = clients.filter(c => { const end = toDate(c.scadenza); if (!end) return false; const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24)); return diffDays >= 0 && diffDays <= 15; }).map(c => ({ type: 'expiring', date: c.scadenza, clientId: c.id, description: `Scade tra ${Math.ceil((toDate(c.scadenza) - now) / (1000 * 60 * 60 * 24))} giorni` }));
    const checkNotifs = allChecks.map(c => ({ type: 'new_check', date: c.createdAt, clientId: c.clientId, description: `Ha inviato un nuovo check` }));
    const anamnesiNotifs = allAnamnesis.map(a => ({ type: 'new_anamnesi', date: a.createdAt, clientId: a.clientId, description: `Ha compilato l'anamnesi` }));
    const feed = [...expiringNotifs, ...checkNotifs, ...anamnesiNotifs].sort((a,b) => (toDate(b.date) || 0) - (toDate(a.date) || 0)).map(item => ({...item, clientName: clientNameMap[item.clientId]})).filter(item => item.clientName);
    
    // --- CALCOLO RETENTION RATE ---
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const clientsActiveLastMonth = new Set(clients.filter(c => toDate(c.scadenza) > lastMonthStart).map(c => c.id));
    const clientsActiveThisMonth = new Set(clients.filter(c => toDate(c.scadenza) > thisMonthStart).map(c => c.id));
    const retained = [...clientsActiveLastMonth].filter(id => clientsActiveThisMonth.has(id)).length;
    const retention = clientsActiveLastMonth.size > 0 ? Math.round((retained / clientsActiveLastMonth.size) * 100) : 100;
    
    // --- FOCUS CLIENTE ---
    const activeClientsList = clients.filter(c => !toDate(c.scadenza) || toDate(c.scadenza) >= now);
    const focusClient = activeClientsList.length > 0 ? activeClientsList[new Date().getDate() % activeClientsList.length] : null;
    const focusClientGoal = allAnamnesis.find(a => a.clientId === focusClient?.id)?.mainGoal;

    return {
      clientStats: { total: clients.length, active: activeClients },
      // *** CORREZIONE INCASSO MENSILE APPLICATA QUI ***
      monthlyIncome: validPayments
        .filter(p => toDate(p.paymentDate)?.getMonth() === now.getMonth() && toDate(p.paymentDate)?.getFullYear() === now.getFullYear())
        .reduce((sum, p) => sum + parseFloat(p.amount), 0),
      // **********************************************
      activityFeed: feed,
      chartData: { labels, datasets: [chartConfig] },
      focusClient: focusClient ? { ...focusClient, goal: focusClientGoal } : null,
      retentionRate: retention,
    };
  }, [clients, allPayments, allChecks, allAnamnesis, clientNameMap, chartDataType, chartTimeRange]);
  
  // Opzioni del grafico
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: "#71717a" }, grid: { color: "rgba(255,255,255,0.05)" } },
      y: { ticks: { color: chartDataType === 'revenue' ? "#22c55e" : "#2563eb", callback: value => chartDataType === 'revenue' ? `€${value}` : (Number.isInteger(value) ? value : null) }, grid: { color: "rgba(255,255,255,0.05)" } }
    },
  };

  // Variazioni di animazione per Framer Motion
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  return (
    <motion.div className="w-full relative" variants={containerVariants} initial="hidden" animate="visible">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <StatCard title="Incasso Mensile" value={monthlyIncome} icon={<FiDollarSign className="text-green-400"/>} isCurrency={true} />
              <StatCard title="Clienti Attivi" value={clientStats.active} icon={<FiCheckCircle className="text-primary"/>} />
              <StatCard title="Retention Rate" value={retentionRate} icon={<FiRefreshCw className="text-purple-400"/>} isPercentage={true} />
            </div>
          </motion.div>
          <motion.div className="bg-card/50 p-4 sm:p-6 rounded-xl border border-white/10 backdrop-blur-md" variants={itemVariants}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><FiBarChart2 /> Business Overview</h2>
            <div className="h-80">
              {chartDataType === 'revenue' ? 
                <Line data={chartData} options={chartOptions} /> : 
                <Bar data={chartData} options={chartOptions} />
              }
            </div>
            <ChartControls dataType={chartDataType} setDataType={setChartDataType} timeRange={chartTimeRange} setTimeRange={setTimeRange}/>
          </motion.div>
           <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" variants={itemVariants}>
              {focusClient && (
                <div className="bg-card/40 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                    <h2 className="text-lg font-semibold mb-2 flex items-center gap-2"><FiTarget/> Focus Cliente del Giorno</h2>
                    <p className="font-bold text-lg text-primary">{focusClient.name}</p>
                    <p className="text-sm text-muted mt-1">Obiettivo: "{focusClient.goal || 'Non specificato'}"</p>
                </div>
              )}
               <QuickNotes />
           </motion.div>
        </div>
        
        <motion.div className="bg-card/50 p-4 sm:p-6 rounded-xl border border-white/10 backdrop-blur-md" variants={itemVariants}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><FiBell/> Feed Attività</h2>
            <div className="space-y-3 max-h-[44rem] overflow-y-auto pr-2">
              <AnimatePresence>
                {activityFeed.length > 0 ? activityFeed.map(item => (
                  <ActivityItem key={`${item.type}-${item.clientId}-${item.date?.seconds}`} item={item} navigate={navigate} />
                )) : <p className="text-sm text-muted p-2">Nessuna attività recente da mostrare.</p>}
              </AnimatePresence>
            </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
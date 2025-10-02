import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../firebase";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiChevronDown, FiChevronUp, FiFilter } from "react-icons/fi";
import { motion } from "framer-motion";

function toDate(x) {
  if (!x) return null;
  if (typeof x?.toDate === "function") return x.toDate();
  const d = new Date(x);
  return isNaN(d) ? null : d;
}

const getPaymentStatus = (scadenza) => { // <-- Nome del parametro cambiato per coerenza
  const expiryDate = toDate(scadenza);
  if (!expiryDate) return 'na';

  const now = new Date();
  const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'expired';
  if (diffDays <= 15) return 'expiring'; // Aumentato a 15 giorni per coerenza con la dashboard
  return 'paid';
};

const PaymentStatusBadge = ({ status }) => {
  switch (status) {
    case 'paid':
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-900/50 text-green-400">Pagato</span>;
    case 'expiring':
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-900/50 text-yellow-400">In Scadenza</span>;
    case 'expired':
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-900/50 text-red-400">Scaduto</span>;
    default:
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300">N/D</span>;
  }
};


export default function Clients() {
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const perPage = 10;
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filter = params.get('filter');
    if (filter && ['paid', 'expiring', 'expired'].includes(filter)) {
      setStatusFilter(filter);
    }
  }, [location.search]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "clients"), (snap) => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Sei sicuro di voler eliminare questo cliente? L'operazione è irreversibile.")) {
      try {
        await deleteDoc(doc(db, "clients", id));
      } catch (error) {
        console.error("Errore delete:", error);
      }
    }
  };

  const filtered = useMemo(() => {
    let filteredClients = [...clients];
    if (statusFilter !== 'all') {
      // CORREZIONE: usa 'scadenza'
      filteredClients = filteredClients.filter(client => getPaymentStatus(client.scadenza) === statusFilter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      filteredClients = filteredClients.filter(c =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
      );
    }
    const getVal = (c, key) => {
      switch (key) {
        case "name": return (c.name || "").toLowerCase();
        // CORREZIONE: usa 'scadenza'
        case "scadenza": return toDate(c.scadenza)?.getTime() || 0;
        case "createdAt": default: return toDate(c.createdAt)?.getTime() || 0;
      }
    };
    filteredClients.sort((a, b) => {
      const va = getVal(a, sortKey);
      const vb = getVal(b, sortKey);
      if (va === vb) return 0;
      return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return filteredClients;
  }, [clients, query, statusFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "scadenza" || key === "createdAt" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ col }) => sortKey === col ? (sortDir === "asc" ? <FiChevronUp className="inline ml-1" /> : <FiChevronDown className="inline ml-1" />) : null;
  
  const FilterButton = ({ status, label, count }) => { /* ... (invariato) ... */ };
  
  const clientCounts = useMemo(() => {
    return {
      all: clients.length,
      // CORREZIONE: usa 'scadenza'
      paid: clients.filter(c => getPaymentStatus(c.scadenza) === 'paid').length,
      expiring: clients.filter(c => getPaymentStatus(c.scadenza) === 'expiring').length,
      expired: clients.filter(c => getPaymentStatus(c.scadenza) === 'expired').length,
    }
  }, [clients]);

  return (
    <div className="w-full">
      {/* ... (intestazione invariata) ... */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Clienti</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-white/10 rounded-lg px-3 py-2">
            <FiSearch className="text-muted" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              className="bg-transparent outline-none placeholder-muted w-full"
              placeholder="Cerca…"
            />
          </div>
          <button onClick={() => navigate("/new")} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg"><FiPlus /> Nuovo</button>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-4 p-2 bg-background rounded-lg">
        <FiFilter className="text-muted ml-1"/>
        <FilterButton status="all" label="Tutti" count={clientCounts.all} />
        <FilterButton status="paid" label="Pagato" count={clientCounts.paid} />
        <FilterButton status="expiring" label="In Scadenza" count={clientCounts.expiring} />
        <FilterButton status="expired" label="Scaduto" count={clientCounts.expired} />
      </div>

      <motion.div 
        className="bg-card rounded-xl shadow border border-white/10 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 text-left">
                <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort("name")}>Nome <SortIcon col="name" /></th>
                <th className="p-3">Email</th>
                <th className="p-3">Stato Pagamento</th>
                <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort("scadenza")}>Scadenza <SortIcon col="scadenza" /></th>
                <th className="p-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c, i) => (
                <motion.tr key={c.id} className="border-b border-white/10 hover:bg-white/5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                  <td className="p-3 font-medium"><button className="hover:underline" onClick={() => navigate(`/client/${c.id}`)}>{c.name || "-"}</button></td>
                  <td className="p-3 text-muted">{c.email || "-"}</td>
                  {/* CORREZIONE: usa 'scadenza' */}
                  <td className="p-3"><PaymentStatusBadge status={getPaymentStatus(c.scadenza)} /></td>
                  <td className="p-3 text-muted">{toDate(c.scadenza) ? toDate(c.scadenza).toLocaleDateString('it-IT') : "-"}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => navigate(`/edit/${c.id}`)} className="p-1.5 text-yellow-400 hover:bg-white/10 rounded-md" title="Modifica"><FiEdit2 size={14}/></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-400 hover:bg-white/10 rounded-md" title="Elimina"><FiTrash2 size={14}/></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, doc, addDoc, serverTimestamp, setDoc, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase.js';
import { FiSend, FiMessageSquare, FiSearch } from 'react-icons/fi';

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
);

const AdminChat = () => {
    const [chats, setChats] = useState([]);
    const [selectedChatId, setSelectedChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const messagesEndRef = useRef(null);

    const auth = getAuth();
    const adminUser = auth.currentUser;
    
    // Assicura che l'UID dell'Admin sia sempre disponibile o nullo
    const currentAdminUID = adminUser?.uid; 
    
    // Fallback: definisci un array di UID noti se necessario per vecchie chat, 
    // ma usiamo currentAdminUID per la logica principale.
    // const adminUIDs = ["..."]; // Rimosso l'uso complesso per semplificare

    useEffect(() => {
        if (!currentAdminUID) return;
        const chatsRef = collection(db, 'chats');
        // Filtra le chat che contengono l'UID dell'Admin corrente
        const q = query(chatsRef, where('participants', 'array-contains', currentAdminUID), orderBy('lastUpdate', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setChats(chatsData);
            setLoadingChats(false);
        }, (error) => {
            console.error("Errore nel caricare le chat:", error);
            setLoadingChats(false);
        });

        return () => unsubscribe();
    }, [currentAdminUID]); // Dipendenza dall'UID stabile

    useEffect(() => {
        if (!selectedChatId) { setMessages([]); return; }
        setLoadingMessages(true);
        const messagesRef = collection(db, 'chats', selectedChatId, 'messages');
        const q = query(messagesRef, orderBy('createdAt'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoadingMessages(false);
        }, (error) => {
            console.error("Errore nel caricare i messaggi:", error);
            setLoadingMessages(false);
        });
        return () => unsubscribe();
    }, [selectedChatId]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const searchClients = async () => {
            if (searchQuery.trim().length < 2) {
                setSearchResults([]);
                setIsSearching(false);
                return;
            }
            setIsSearching(true);
            const clientsRef = collection(db, 'clients');
            const searchTerm = searchQuery.toLowerCase();
            const q = query(clientsRef, 
                where('name_lowercase', '>=', searchTerm), 
                where('name_lowercase', '<=', searchTerm + '\uf8ff'),
                limit(10)
            );
            try {
                const querySnapshot = await getDocs(q);
                setSearchResults(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Errore nella ricerca (potrebbe mancare un indice in Firestore):", error);
            }
            setIsSearching(false);
        };
        const debounceSearch = setTimeout(() => {
            searchClients();
        }, 300);
        return () => clearTimeout(debounceSearch);
    }, [searchQuery]);

    const handleSelectClient = async (client) => {
        if (!currentAdminUID) return;
        
        // Crea l'ID della chat univoco e ordinato
        const newChatId = [client.id, currentAdminUID].sort().join('_');

        // Trova la chat esistente (già caricata in `chats`)
        const existingChat = chats.find(chat => chat.id === newChatId);
        
        if (!existingChat) {
            // Crea la nuova chat se non esiste
            const chatRef = doc(db, 'chats', newChatId);
            await setDoc(chatRef, {
                participants: [client.id, currentAdminUID],
                participantNames: { [client.id]: client.name, [currentAdminUID]: "Coach" },
                lastMessage: "Conversazione avviata",
                lastUpdate: serverTimestamp()
            });
        }
        
        // Imposta l'ID della chat selezionata
        setSelectedChatId(newChatId);

        setSearchQuery('');
        setSearchResults([]);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        // Condizione di guardia stabile, usa l'UID stabile
        if (newMessage.trim() === '' || !selectedChatId || !currentAdminUID) {
             console.error("Invio messaggio fallito: Campi mancanti o Admin non autenticato.", { selectedChatId, currentAdminUID, newMessage: newMessage.trim() });
             return;
        }

        const messagesRef = collection(db, 'chats', selectedChatId, 'messages');
        try {
            await addDoc(messagesRef, {
                text: newMessage,
                createdAt: serverTimestamp(),
                senderId: currentAdminUID // Usa l'UID dell'Admin corrente
            });

            const chatRef = doc(db, 'chats', selectedChatId);
            await setDoc(chatRef, {
                lastMessage: newMessage,
                lastUpdate: serverTimestamp(),
            }, { merge: true });

            setNewMessage('');
        } catch (error) {
            console.error("ERRORE FIREBASE DURANTE L'INVIO DEL MESSAGGIO (Regole di Sicurezza?):", error);
        }
    };

    const selectedChat = chats.find(c => c.id === selectedChatId);
    const chatTitle = selectedChat ? (selectedChat.participantNames[selectedChat.participants.find(p => p !== currentAdminUID)] || 'Cliente') : 'Chat';


    return (
        <div className="flex h-[calc(100vh-120px)] bg-card/60 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
            <div className="w-full md:w-1/3 border-r border-white/10 flex flex-col">
                <div className="p-4 border-b border-white/10 flex-shrink-0">
                    <div className="relative">
                        <FiSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            placeholder="Cerca o avvia una chat..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-background p-2 pl-9 rounded-lg border border-white/10 outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>
                {searchQuery.length > 1 ? (
                    <div className="flex-1 overflow-y-auto">
                        {isSearching && <p className="p-4 text-muted text-sm">Ricerca...</p>}
                        {!isSearching && searchResults.length === 0 && <p className="p-4 text-muted text-sm">Nessun cliente trovato.</p>}
                        {!isSearching && searchResults.map(client => (
                            <div key={client.id} onClick={() => handleSelectClient(client)} className="p-4 cursor-pointer hover:bg-white/5">
                                <p className="font-semibold text-white">{client.name}</p>
                                <p className="text-sm text-muted">{client.email}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {loadingChats ? <LoadingSpinner /> : (
                            <div className="flex-1 overflow-y-auto">
                                {chats.map(chat => {
                                    // Identifica l'altro partecipante (il cliente)
                                    const clientUID = chat.participants.find(p => p !== currentAdminUID);
                                    const clientName = chat.participantNames ? chat.participantNames[clientUID] : 'Cliente';
                                    return (
                                        <div
                                            key={chat.id}
                                            onClick={() => setSelectedChatId(chat.id)}
                                            className={`p-4 cursor-pointer border-l-4 ${selectedChatId === chat.id ? 'bg-primary/20 border-primary' : 'border-transparent hover:bg-white/5'}`}
                                        >
                                            <p className="font-semibold text-white">{clientName || 'Cliente'}</p>
                                            <p className="text-sm text-muted truncate">{chat.lastMessage}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
            {/* Colonna Messaggi */}
            <div className="w-full md:w-2/3 flex flex-col">
                {selectedChatId ? (
                    <>
                        <div className="p-4 border-b border-white/10 flex-shrink-0">
                            <h3 className="font-bold text-lg text-white">{chatTitle}</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                           {loadingMessages ? <LoadingSpinner /> : messages.map(msg => (
                               <div key={msg.id} className={`flex ${msg.senderId === currentAdminUID ? 'justify-end' : 'justify-start'}`}>
                                   <div className={`max-w-md p-3 rounded-2xl ${msg.senderId === currentAdminUID ? 'bg-primary rounded-br-none' : 'bg-background rounded-bl-none'}`}>
                                       <p className="text-white break-words">{msg.text}</p>
                                   </div>
                               </div>
                           ))}
                           <div ref={messagesEndRef} />
                        </div>
                        <div className="p-4 border-t border-white/10 flex-shrink-0">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Scrivi una risposta..."
                                    // Input attivo per digitare
                                    className="flex-1 p-3 bg-background border border-white/10 rounded-full outline-none focus:ring-2 focus:ring-primary text-white"
                                />
                                <button 
                                    type="submit" 
                                    className="p-3 bg-primary hover:bg-primary/80 text-white rounded-full disabled:opacity-50" 
                                    // Disabilitato solo se il campo è vuoto o la chat non è selezionata
                                    disabled={!newMessage.trim() || !selectedChatId}
                                >
                                    <FiSend size={20} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col justify-center items-center h-full text-muted">
                        <FiMessageSquare size={48} />
                        <p className="mt-4">Seleziona una conversazione o cercala per nome.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminChat;
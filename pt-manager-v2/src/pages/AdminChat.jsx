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
    const adminUIDs = ["QwWST9OVOlTOi5oheyCqfpXLOLg2", "AeZKjJYu5zMZ4mvffaGiqCBb0cF2"];

    useEffect(() => {
        if (!adminUser) return;
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('participants', 'array-contains-any', adminUIDs), orderBy('lastUpdate', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setChats(chatsData);
            setLoadingChats(false);
        }, (error) => {
            console.error("Errore nel caricare le chat:", error);
            setLoadingChats(false);
        });

        return () => unsubscribe();
    }, [adminUser]);

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
                // Potresti mostrare un messaggio all'utente qui
            }
            setIsSearching(false);
        };
        const debounceSearch = setTimeout(() => {
            searchClients();
        }, 300);
        return () => clearTimeout(debounceSearch);
    }, [searchQuery]);

    const handleSelectClient = async (client) => {
        if (!adminUser) return;
        const primaryAdminUID = adminUIDs[0];
        const newChatId = [client.id, primaryAdminUID].sort().join('_');

        const existingChat = chats.find(chat => chat.id === newChatId);
        if (existingChat) {
            setSelectedChatId(existingChat.id);
        } else {
            const chatRef = doc(db, 'chats', newChatId);
            await setDoc(chatRef, {
                participants: [client.id, primaryAdminUID],
                participantNames: { [client.id]: client.name, [primaryAdminUID]: "Coach" },
                lastMessage: "Conversazione iniziata",
                lastUpdate: serverTimestamp()
            });
            setSelectedChatId(newChatId);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !selectedChatId || !adminUser) return;

        const messagesRef = collection(db, 'chats', selectedChatId, 'messages');
        await addDoc(messagesRef, {
            text: newMessage,
            createdAt: serverTimestamp(),
            senderId: adminUser.uid
        });

        const chatRef = doc(db, 'chats', selectedChatId);
        await setDoc(chatRef, {
            lastMessage: newMessage,
            lastUpdate: serverTimestamp(),
        }, { merge: true });

        setNewMessage('');
    };

    return (
        <div className="flex h-[calc(100vh-120px)] bg-card/60 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
            <div className="w-1/3 border-r border-white/10 flex flex-col">
                <div className="p-4 border-b border-white/10">
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
                                    const clientUID = chat.participants.find(p => !adminUIDs.includes(p));
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
            <div className="w-2/3 flex flex-col">
                {selectedChatId ? (
                    <>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                           {loadingMessages ? <LoadingSpinner /> : messages.map(msg => (
                               <div key={msg.id} className={`flex ${msg.senderId === adminUser?.uid ? 'justify-end' : 'justify-start'}`}>
                                   <div className={`max-w-md p-3 rounded-2xl ${msg.senderId === adminUser?.uid ? 'bg-primary rounded-br-none' : 'bg-background rounded-bl-none'}`}>
                                       <p className="text-white break-words">{msg.text}</p>
                                   </div>
                               </div>
                           ))}
                           <div ref={messagesEndRef} />
                        </div>
                        <div className="p-4 border-t border-white/10">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Scrivi una risposta..."
                                    className="flex-1 p-3 bg-background border border-white/10 rounded-full outline-none focus:ring-2 focus:ring-primary text-white"
                                />
                                <button type="submit" className="p-3 bg-primary hover:bg-primary/80 text-white rounded-full disabled:opacity-50" disabled={!newMessage.trim()}>
                                    <FiSend size={20} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col justify-center items-center h-full text-muted">
                        <FiMessageSquare size={48} />
                        <p className="mt-4">Seleziona una conversazione o cercane una nuova.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminChat;


import React, { useState, useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSend } from 'react-icons/fi';

const LoadingSpinner = () => (
    <div className="min-h-screen bg-gray-900 text-white flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500"></div>
    </div>
);

const ClientChat = () => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatId, setChatId] = useState(null);
    const messagesEndRef = useRef(null);
    
    const navigate = useNavigate();
    const auth = getAuth();
    const user = auth.currentUser;

    const ADMIN_UID = "QwWST9OVOlTOi5oheyCqfpXLOLg2";

    useEffect(() => {
        if (!user) {
            navigate('/client-login');
            return;
        }

        const generatedChatId = [user.uid, ADMIN_UID].sort().join('_');
        setChatId(generatedChatId);

        // Funzione per creare la chat se non esiste
        const initializeChat = async () => {
            const chatDocRef = doc(db, 'chats', generatedChatId);
            const chatDoc = await getDoc(chatDocRef);

            if (!chatDoc.exists()) {
                const clientDoc = await getDoc(doc(db, 'clients', user.uid));
                const clientName = clientDoc.exists() ? clientDoc.data().name : user.email;

                await setDoc(chatDocRef, {
                    participants: [user.uid, ADMIN_UID],
                    participantNames: { [user.uid]: clientName, [ADMIN_UID]: "Coach" },
                    createdAt: serverTimestamp()
                });
            }
        };

        // Inizializza la chat e poi imposta il listener per i messaggi
        initializeChat().then(() => {
            const messagesCollectionRef = collection(db, 'chats', generatedChatId, 'messages');
            const q = query(messagesCollectionRef, orderBy('createdAt'));

            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const messagesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setMessages(messagesData);
                setLoading(false);
            }, (error) => {
                console.error("Errore nel listener di Firebase:", error);
                setLoading(false);
            });

            return () => unsubscribe();
        });

    }, [user, navigate]);


    // Effetto per lo scroll automatico
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- QUESTA È LA FUNZIONE CORRETTA E SICURA PER INVIARE MESSAGGI ---
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !chatId) return;

        try {
            // 1. Salva il documento del messaggio nella sotto-collezione
            const messagesCollectionRef = collection(db, 'chats', chatId, 'messages');
            await addDoc(messagesCollectionRef, {
                text: newMessage,
                createdAt: serverTimestamp(),
                senderId: user.uid
            });

            // 2. Aggiorna il documento principale della chat con l'ultimo messaggio
            const chatDocRef = doc(db, 'chats', chatId);
            await setDoc(chatDocRef, {
                lastMessage: newMessage,
                lastUpdate: serverTimestamp(),
            }, { merge: true });

            setNewMessage('');

        } catch (error) {
            // Se una delle due operazioni fallisce, vedremo un errore chiaro
            console.error("Errore durante l'invio del messaggio:", error);
            alert("Errore: Impossibile inviare il messaggio. L'operazione è stata bloccata dalle regole di sicurezza.");
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col h-screen">
            <header className="flex justify-between items-center p-4 bg-gray-800/50 backdrop-blur-sm border-b border-white/10 sticky top-0">
                <h1 className="text-xl font-bold text-cyan-400">Chat con il Coach</h1>
                <button
                    onClick={() => navigate('/client/dashboard')}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-700/80 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg"
                >
                    <FiArrowLeft /><span>Dashboard</span>
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.senderId === user.uid ? 'bg-cyan-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`}>
                            <p className="text-white break-words">{msg.text}</p>
                            <p className="text-xs text-gray-300 mt-1 text-right">
                                {msg.createdAt?.toDate().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-4 bg-gray-800/50 backdrop-blur-sm border-t border-white/10 sticky bottom-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Scrivi un messaggio..."
                        className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-full outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                    />
                    <button type="submit" className="p-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full transition-colors disabled:opacity-50" disabled={!newMessage.trim()}>
                        <FiSend size={20} />
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default ClientChat;
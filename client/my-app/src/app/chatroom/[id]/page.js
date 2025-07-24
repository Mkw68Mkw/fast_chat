"use client";
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth'; // Hinzugefügter Import
import { Gamepad2, Messages, Laptop2, Code2, Globe, MessageCircle } from 'lucide-react';

export default function ChatRoom() {
  const router = useRouter();
  const params = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatroomName, setChatroomName] = useState('Loading...');
  const ws = useRef(null);
  const [username, setUsername] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const messagesEndRef = useRef(null);
  
  // Scroll-Effekt bei neuen Nachrichten
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [messages.length]); // Bei Nachrichtenänderung auslösen

  useAuth(); // Auth-Check einbinden

  // Benutzernamen aus Token extrahieren
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // Early return wenn kein Token vorhanden
    if (!token) {
      setCheckingAuth(false);
      return;
    }

    try {
      const decodedToken = jwtDecode(token);
      setUsername(decodedToken.sub);
      setCheckingAuth(false);
    } catch (error) {
      console.error('Invalid token:', error);
      setCheckingAuth(false);
    }
  }, []); // Leeres Dependency-Array, läuft nur beim Mount

  useEffect(() => {
    // Fetch chatroom name AND history
    fetch(`http://localhost:8000/chatrooms/${params.id}`)
      .then(response => response.json())
      .then(data => setChatroomName(data.name))
      .catch(error => {
        console.error('Error fetching chatroom name:', error);
        setChatroomName('Unknown Room');
      });

    // Fetch chat history
    fetch(`http://localhost:8000/chatrooms/${params.id}/messages`)
      .then(response => response.json())
      .then(history => {
        setMessages(history.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      })
      .catch(error => console.error('Error loading history:', error));

    // WebSocket connection
    const token = localStorage.getItem('token');
    ws.current = new WebSocket(`ws://localhost:8000/ws/chatrooms/${params.id}?token=${encodeURIComponent(token)}`);
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages(prev => [...prev, {
        content: data.message,  // WebSocket sendet "message", wir brauchen "content"
        username: data.username,
        timestamp: new Date(data.timestamp) // Timestamp vom Server übernehmen
      }]);
    };

    return () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.close();
        ws.current = null; // Wichtig für garbage collection
      }
    };
  }, [params.id]); // Nur bei ID-Änderung neu verbinden

  const sendMessage = () => {
    if (input.trim() && ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        username: username, // Use the extracted username
        message: input
      }));
      setInput('');
    }
  };

  // Icon-Mapping-Funktion
  const getRoomIcon = (roomName) => {
    const lowerName = roomName.toLowerCase();
    
    if (lowerName.includes('gaming')) return <Gamepad2 className="h-6 w-6" />;
    if (lowerName.includes('allgemein')) return <Messages className="h-6 w-6" />;
    if (lowerName.includes('technik')) return <Laptop2 className="h-6 w-6" />;
    if (lowerName.includes('programmierung')) return <Code2 className="h-6 w-6" />;
    if (lowerName.includes('off-topic')) return <MessageCircle className="h-6 w-6" />;
    return <Globe className="h-6 w-6" />; // Default
  };

  return (
    <div className="bg-gray-900 min-h-screen text-gray-100">
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/')}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg p-2 transition-colors flex items-center gap-2 cursor-pointer"
            title="Zurück zur Übersicht"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-blue-400">
              {getRoomIcon(chatroomName)}
            </span>
            <h2 className="text-2xl font-bold text-blue-400">{chatroomName}</h2>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 shadow-xl mb-4 h-[70vh] overflow-y-auto">
          {Object.entries(
            messages.reduce((groups, msg) => {
              // Ändere hier: Verwende das originale Date-Objekt
              const dateKey = msg.timestamp.toDateString(); // "Mon Jan 01 2024"
              if (!groups[dateKey]) groups[dateKey] = [];
              groups[dateKey].push(msg);
              return groups;
            }, {})
          ).map(([dateKey, dateMessages]) => {
            // Erste Nachricht der Gruppe für korrektes Datum
            const firstTimestamp = dateMessages[0].timestamp;
            
            return (
              <div key={dateKey}>
                {/* Datums-Trenner */}
                <div className="flex items-center my-6">
                  <div className="flex-1 border-t border-gray-600"></div>
                  <span className="px-3 text-sm text-gray-400 bg-gray-800 rounded-full">
                    {firstTimestamp.toLocaleDateString('de-DE', {
                      weekday: 'long',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </span>
                  <div className="flex-1 border-t border-gray-600"></div>
                </div>

                {dateMessages.map((msg, i) => (
                  <div key={i} className={`group mb-4 ${msg.username === username ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`flex ${msg.username === username ? 'flex-row-reverse' : 'flex-row'} gap-3 max-w-[80%]`}>
                      {/* Avatar Circle */}
                      <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center 
                        ${msg.username === username ? 'bg-blue-600' : 'bg-gray-600'} text-sm font-medium`}>
                        {msg.username.substring(0,2).toUpperCase()}
                      </div>

                      {/* Message Bubble */}
                      <div className={`p-3 rounded-2xl ${
                        msg.username === username 
                          ? 'bg-blue-600/90 rounded-br-none' 
                          : 'bg-gray-700/80 rounded-bl-none'
                      }`}>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-semibold">{msg.username}</span>
                          {/* Geänderte Zeitstempel-Anzeige */}
                          <span className="text-xs text-gray-300 opacity-80">
                            {new Date(msg.timestamp).toLocaleTimeString('de-DE', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            {new Date(msg.timestamp).toDateString() !== new Date().toDateString() && (
                              <>
                                {' • '}
                                {new Date(msg.timestamp).toLocaleDateString('de-DE', {
                                  day: '2-digit',
                                  month: '2-digit'
                                })}
                              </>
                            )}
                          </span>
                        </div>
                        <p className="text-gray-100 text-[15px] leading-snug">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          <div ref={messagesEndRef} /> {/* Scroll-Anchor */}
        </div>

        <div className="bg-gray-800 rounded-lg p-4 shadow-xl">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Nachricht schreiben..."
              className="flex-1 bg-gray-700 text-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={sendMessage}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer"
            >
              Senden
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
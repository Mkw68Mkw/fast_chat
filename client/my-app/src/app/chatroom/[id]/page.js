"use client";
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';  // Korrekte Import-Syntax
import { useRouter } from 'next/navigation';

export default function ChatRoom() {
  const router = useRouter();
  const params = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatroomName, setChatroomName] = useState('Loading...');
  const ws = useRef(null);
  const [username, setUsername] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Extract username from JWT token
  useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) {
    router.push('/login');
  }
  if (token) {
    try {
      const decodedToken = jwtDecode(token);
      setUsername(decodedToken.sub);
      setCheckingAuth(false);; // Assuming 'sub' contains the username
    } catch (error) {
      console.error('Invalid token:', error);
    }
  }
}, [router]);

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
    ws.current = new WebSocket(`ws://localhost:8000/ws/chatrooms/${params.id}`);
    
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

  return (
    <div className="bg-gray-900 min-h-screen text-gray-100">
      <div className="max-w-3xl mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/')}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg p-2 transition-colors flex items-center gap-2"
            title="Zurück zur Übersicht"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-blue-400">{chatroomName}</h2>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 shadow-xl mb-4 h-[70vh] overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className="group mb-4 hover:bg-gray-700/50 rounded-lg p-2 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-blue-300">{msg.username}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.timestamp).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                      {' • '}
                      {new Date(msg.timestamp).toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-gray-100 ml-1 break-words">{msg.content}</p>
                </div>
              </div>
            </div>
          ))}
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
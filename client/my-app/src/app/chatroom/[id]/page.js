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
    // Fetch chatroom name
    fetch(`http://localhost:8000/chatrooms/${params.id}`)
      .then(response => response.json())
      .then(data => setChatroomName(data.name))
      .catch(error => {
        console.error('Error fetching chatroom name:', error);
        setChatroomName('Unknown Room');
      });

    ws.current = new WebSocket(`ws://localhost:8000/ws/chatrooms/${params.id}`);
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages(prev => [...prev, data]);
    };

    return () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
    };
  }, [params.id]);

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
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">{chatroomName}</h2>
      <div className="mb-4 h-64 overflow-y-auto border p-2">
        {messages.map((msg, i) => (
          <div key={i} className="mb-2">
            <strong>{msg.username}:</strong> {msg.message}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 border p-2"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Senden
        </button>
      </div>
    </div>
  );
}
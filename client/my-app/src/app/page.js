"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from 'jwt-decode';  // Korrekte Import-Syntax
import useAuth from "@/hooks/useAuth";
import { ArrowRight, LogOut, Gamepad2, Messages, Laptop2, Code2, Globe, MessageCircle } from 'lucide-react'; // Neuer Import

// Icon-Mapping-Funktion
const getRoomIcon = (roomName) => {
  const lowerName = roomName.toLowerCase();
  
  if (lowerName.includes('gaming')) return <Gamepad2 className="h-5 w-5" />;
  if (lowerName.includes('allgemein')) return <Messages className="h-5 w-5" />;
  if (lowerName.includes('technik')) return <Laptop2 className="h-5 w-5" />;
  if (lowerName.includes('programmierung')) return <Code2 className="h-5 w-5" />;
  if (lowerName.includes('off-topic')) return <MessageCircle className="h-5 w-5" />;
  return <Globe className="h-5 w-5" />; // Default
};

export default function Home() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [username, setUsername] = useState("");
  const [chatrooms, setChatrooms] = useState([]);

  useAuth();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      const decodedToken = jwtDecode(token);  // Jetzt als Funktion verfügbar
      setUsername(decodedToken.sub);
      setCheckingAuth(false);
    }
  }, [router]);

  useEffect(() => {
    // Chatrooms laden
    fetch('http://localhost:8000/chatrooms')
      .then(response => response.json())
      .then(data => setChatrooms(data))
      .catch(error => console.error('Error loading chatrooms:', error));
  }, []);

  if (checkingAuth) return null; // oder Ladeanzeige

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
    router.refresh(); // Erzwingt Neuladen der Routen
  };

  return (
    <div className="bg-gray-900 min-h-screen text-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-blue-400">Willkommen <span className="text-blue-600">{username}</span></h1>
          <div className="flex items-center gap-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-md ml-4 cursor-pointer"
            >
              Dashboard
            </button>
            <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-md cursor-pointer flex items-center gap-2"
          >
            <LogOut className="h-5 w-5" />
            Abmelden
          </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-blue-300 mb-4">Verfügbare Chatrooms</h2>
          <div className="grid gap-4">
            {chatrooms.map(room => (
              <div 
                key={room.id}
                onClick={() => router.push(`/chatroom/${room.id}`)}
                className="group bg-gray-700 hover:bg-gray-600 rounded-lg p-4 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 group-hover:text-blue-400 transition-colors">
                      {getRoomIcon(room.name)}
                    </span>
                    <span className="font-medium text-gray-100">{room.name}</span>
                  </div>
                  <ArrowRight 
                    className="h-5 w-5 text-gray-400 group-hover:text-blue-400 transition-colors"
                    strokeWidth={2}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { LogOut, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import useAuth from '@/hooks/useAuth';

export default function Dashboard() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
    router.refresh(); // Erzwingt Neuladen der Routen
  };

  return (
    <div className="bg-gray-900 min-h-screen text-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-blue-400">Willkommen, <span className="text-blue-600">{username}</span>, auf deinem Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-md cursor-pointer flex items-center gap-2"
          >
            <LogOut className="h-5 w-5" />
            Abmelden
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
          <Link 
            href="/"
            className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 shadow-sm"
          >
            <Home className="h-5 w-5" />
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    </div>
  );
}
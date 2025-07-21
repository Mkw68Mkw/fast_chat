"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from 'jwt-decode';  // Korrekte Import-Syntax

export default function Home() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [username, setUsername] = useState("");

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

  if (checkingAuth) return null; // oder Ladeanzeige

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
    router.refresh(); // Erzwingt Neuladen der Routen
  };

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <div className="absolute top-4 right-4">
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-md"
        >
          Abmelden
        </button>
      </div>
      <h1>Willkommen {username}</h1>
      
    </div>
  );
}

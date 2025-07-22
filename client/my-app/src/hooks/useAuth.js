'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

export default function useAuth() {
  const router = useRouter();
  const checkInterval = useRef();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/login');
        return false;
      }

      try {
        const decoded = jwtDecode(token);
        const now = Date.now() / 1000;
        
        if (decoded.exp < now) {
          localStorage.removeItem('token');
          router.push('/login');
          return false;
        }
        
        // Berechne verbleibende Zeit bis zum Ablauf
        const timeLeft = decoded.exp - now;
        
        // Setze Timer für automatischen Check beim Ablauf
        if (timeLeft > 0) {
          clearTimeout(checkInterval.current);
          checkInterval.current = setTimeout(checkAuth, (timeLeft * 1000) + 1000);
        }
        
        return true;

      } catch (error) {
        localStorage.removeItem('token');
        router.push('/login');
        return false;
      }
    };

    // Initial check
    if (!checkAuth()) return;

    // Event-Listener für Fokus und regelmäßigen Check
    window.addEventListener('focus', checkAuth);
    
    // Zusätzlicher Sicherheitscheck alle 30 Sekunden
    const interval = setInterval(checkAuth, 30000);

    return () => {
      window.removeEventListener('focus', checkAuth);
      clearInterval(interval);
      clearTimeout(checkInterval.current);
    };
  }, [router]);
}

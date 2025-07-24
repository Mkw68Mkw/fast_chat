"use client";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({username, password})
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Login fehlgeschlagen');
        return;
      }

      console.log('Erfolgreich eingeloggt:', data);
      // Save token and redirect
      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch (error) {
      console.error('Fehler beim Login:', error);
      setError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen text-gray-100 p-8 flex items-center">
      <div className="max-w-3xl mx-auto w-full">
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-blue-400 mb-6">Anmelden</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Benutzername</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-gray-700 text-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Passwort</label>
              <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="h-full flex items-center text-gray-500 hover:text-gray-400 focus:outline-none px-2 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              </div>
            </div>
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Anmelden
            </button>
            <p className="text-center text-gray-400 mt-4">
              Noch kein Konto?{' '}
              <Link 
                href="/signup" 
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Registrieren
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

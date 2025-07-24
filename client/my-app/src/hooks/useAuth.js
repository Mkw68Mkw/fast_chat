'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

export default function useAuth() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            try {
                const decoded = jwtDecode(storedToken);
                setUser({ username: decoded.sub });
                setToken(storedToken);
            } catch (error) {
                console.error("Invalid token:", error);
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    }, []);

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setToken(null);
        router.push('/login');
    };

    const updateUser = (newUsername, newToken) => {
        localStorage.setItem('token', newToken);
        setUser({ username: newUsername });
        setToken(newToken);
    };

    return { user, token, loading, logout, updateUser };
}

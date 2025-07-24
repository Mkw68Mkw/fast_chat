'use client'

import { LogOut, Home, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import useAuth from '@/hooks/useAuth';

export default function Dashboard() {
    const { user, token, loading, logout, updateUser } = useAuth();
    const router = useRouter();
    const [chatrooms, setChatrooms] = useState([]);
    const [newUsername, setNewUsername] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        const fetchChatrooms = async () => {
            try {
                const res = await fetch('http://localhost:8000/chatrooms');
                if (res.ok) {
                    const data = await res.json();
                    setChatrooms(data);
                }
            } catch (error) {
                console.error('Failed to fetch chatrooms:', error);
            }
        };
        fetchChatrooms();
    }, []);

    const handleUpdateUsername = async (e) => {
        e.preventDefault();
        setSuccessMessage('');
        setErrorMessage('');
        try {
            const res = await fetch('http://localhost:8000/user/username', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ new_username: newUsername })
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMessage(data.message);
                updateUser(data.new_username, data.token);
            } else {
                setErrorMessage(data.detail);
            }
        } catch (error) {
            setErrorMessage('Failed to update username');
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setSuccessMessage('');
        setErrorMessage('');
        try {
            const res = await fetch('http://localhost:8000/user/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMessage(data.message);
            } else {
                setErrorMessage(data.detail);
            }
        } catch (error) {
            setErrorMessage('Failed to update password');
        }
    };

    if (loading) {
        return <p>Loading...</p>;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-100">
            <div className="w-full max-w-4xl p-8 bg-gray-800 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-blue-400">Welcome to the Dashboard, {user?.username}!</h1>
                    <button
                        onClick={logout}
                        className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <LogOut className="h-5 w-5" />
                        Logout
                    </button>
                </div>

                {successMessage && <p className="mb-4 text-center text-green-400">{successMessage}</p>}
                {errorMessage && <p className="mb-4 text-center text-red-400">{errorMessage}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h2 className="text-xl font-semibold text-blue-300 mb-4">Chatrooms</h2>
                        <ul className="space-y-2">
                            {chatrooms.map(room => (
                                <li key={room.id}
                                    className="group bg-gray-700 hover:bg-gray-600 rounded-lg p-4 cursor-pointer transition-colors"
                                    onClick={() => router.push(`/chatroom/${room.id}`)}>
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium text-gray-100">{room.name}</span>
                                      <ArrowRight 
                                        className="h-5 w-5 text-gray-400 group-hover:text-blue-400 transition-colors"
                                        strokeWidth={2}
                                      />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold text-blue-300 mb-4">Update Username</h2>
                            <form onSubmit={handleUpdateUsername} className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="New Username"
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                <button type="submit" className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium transition-colors">
                                    Update Username
                                </button>
                            </form>
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-blue-300 mb-4">Update Password</h2>
                            <form onSubmit={handleUpdatePassword} className="space-y-4">
                                <input
                                    type="password"
                                    placeholder="Old Password"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="New Password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                <button type="submit" className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium transition-colors">
                                    Update Password
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { LogOut, BookOpen, Newspaper, Award, LayoutDashboard, Shield, ShieldCheck, User } from 'lucide-react';
import io from 'socket.io-client';

// Pages
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Feed from './pages/Feed.jsx';
import TestList from './pages/TestList.jsx';
import TestInterface from './pages/TestInterface.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [socket, setSocket] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (token) {
      const socketUrl = 'http://localhost:5000';
      const newSocket = io(socketUrl);
      setSocket(newSocket);

      newSocket.on('LEADERBOARD_PUBLISHED', (data) => {
        setNotification(data.message);
        setTimeout(() => setNotification(null), 10000); // 10 seconds warning
      });

      return () => {
        newSocket.close();
      };
    }
  }, [token]);

  const handleLogin = (userPayload, userToken) => {
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userPayload));
    setToken(userToken);
    setUser(userPayload);
  };

  const handleUserUpdate = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    if (socket) {
      socket.disconnect();
    }
  };

  // Protected Route Wrapper
  const ProtectedRoute = ({ children, allowedRoles }) => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

    if (!savedToken) {
      return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(savedUser?.role)) {
      return <Navigate to="/" replace />;
    }

    return children;
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-600 selection:text-white">
        {/* WebSocket Notification Banner */}
        {notification && (
          <div className="bg-indigo-600 text-white font-medium py-3 px-4 text-center sticky top-0 z-50 shadow-lg animate-pulse flex items-center justify-center gap-2">
            <Award size={18} />
            <span>{notification}</span>
            <button onClick={() => setNotification(null)} className="ml-4 underline hover:text-slate-200 text-sm">Dismiss</button>
          </div>
        )}

        {/* Header / Navigation */}
        {token && user && (
          <header className="glass sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg text-white font-extrabold text-lg tracking-wider">
                CB
              </div>
              <span className="text-xl font-bold tracking-tight text-white bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                CampusBit
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
              <Link to="/feed" className="flex items-center gap-1.5 hover:text-indigo-400 transition">
                <Newspaper size={16} /> Feed
              </Link>
              
              {user.role === 'STUDENT' && (
                <Link to="/tests" className="flex items-center gap-1.5 hover:text-indigo-400 transition">
                  <BookOpen size={16} /> Tests
                </Link>
              )}

              <Link to="/leaderboard" className="flex items-center gap-1.5 hover:text-indigo-400 transition">
                <Award size={16} /> Leaderboards
              </Link>

              {(user.role === 'SUPER_ADMIN' || user.role === 'INSTITUTE_ADMIN') && (
                <Link to="/admin" className="flex items-center gap-1.5 hover:text-indigo-400 transition">
                  <LayoutDashboard size={16} /> Admin Portal
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-right hidden sm:flex">
                <div>
                  <div className="text-xs font-semibold text-indigo-400 flex items-center gap-1 justify-end">
                    {user.role === 'SUPER_ADMIN' && <Shield size={12} />}
                    {user.role === 'INSTITUTE_ADMIN' && <ShieldCheck size={12} />}
                    {user.role === 'STUDENT' && <User size={12} />}
                    {user.role.replace('_', ' ')}
                  </div>
                  <div className="text-sm font-bold text-slate-100">{user.name}</div>
                </div>
              </div>

              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-red-500/50 hover:bg-red-500/10 text-slate-300 hover:text-red-400 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition cursor-pointer"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </header>
        )}

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login onLogin={handleLogin} user={user} />} />
            <Route path="/register" element={<Register />} />

            {/* Authenticated Base Redirection */}
            <Route path="/" element={
              token ? (
                user?.role === 'STUDENT' ? <Navigate to="/feed" replace /> : <Navigate to="/admin" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } />

            {/* Shared Feeds & Leaderboards */}
            <Route path="/feed" element={
              <ProtectedRoute>
                <Feed user={user} />
              </ProtectedRoute>
            } />
            <Route path="/leaderboard" element={
              <ProtectedRoute>
                <LeaderboardPage user={user} />
              </ProtectedRoute>
            } />

            {/* Student Tests */}
            <Route path="/tests" element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <TestList />
              </ProtectedRoute>
            } />
            <Route path="/tests/:testId" element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <TestInterface user={user} />
              </ProtectedRoute>
            } />

            {/* Admins Dashboard */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'INSTITUTE_ADMIN']}>
                <AdminDashboard user={user} onUserUpdate={handleUserUpdate} />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

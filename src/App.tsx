import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import GameList from './components/GameList';
import GameDetails from './components/GameDetails';
import AuthForm from './components/AuthForm';
import AdminPanel from './components/AdminPanel';
import GameUpload from './components/GameUpload';
import Profile from './components/Profile';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'home' | 'login' | 'register' | 'admin' | 'upload' | 'profile' | 'game-details'>('home');
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  // YENİ: Arama state'i buraya taşındı
  const [searchTerm, setSearchTerm] = useState('');

  const handleGameSelect = (gameId: string) => {
    setSelectedGameId(gameId);
    setCurrentView('game-details');
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view as any);
    if (view === 'login') {
      setAuthMode('login');
    } else if (view === 'register') {
      setAuthMode('register');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user && (currentView === 'login' || currentView === 'register')) {
    return (
      <AuthForm
        mode={authMode}
        onModeChange={setAuthMode}
      />
    );
  }

  if (!user && (currentView === 'admin' || currentView === 'upload' || currentView === 'profile')) {
    setCurrentView('home');
  }

  return (
    // YENİ: Layout'a arama state'i ve fonksiyonu eklendi
    <Layout
      currentView={currentView}
      onViewChange={handleViewChange}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      onGameSelect={handleGameSelect}
    >
      {currentView === 'home' && (
        // YENİ: GameList'e arama state'i ve fonksiyonu eklendi
        <GameList 
            onGameSelect={handleGameSelect} 
            searchTerm={searchTerm} 
        />
      )}
      {currentView === 'game-details' && (
        <GameDetails 
          gameId={selectedGameId} 
          onBack={() => setCurrentView('home')} 
        />
      )}
      {currentView === 'admin' && user && (
        <AdminPanel />
      )}
      {currentView === 'upload' && user && (
        <GameUpload />
      )}
      {currentView === 'profile' && user && (
        <Profile />
      )}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
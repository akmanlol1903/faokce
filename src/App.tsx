import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import GameList from './components/GameList';
import GameDetails from './components/GameDetails';
import AuthForm from './components/AuthForm';
import AdminPanel from './components/AdminPanel';
import GameUpload from './components/GameUpload';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'home' | 'login' | 'register' | 'admin' | 'upload' | 'profile' | 'game-details'>('home');
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

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

  // Show auth form if not authenticated and trying to access auth views
  if (!user && (currentView === 'login' || currentView === 'register')) {
    return (
      <AuthForm
        mode={authMode}
        onModeChange={setAuthMode}
      />
    );
  }

  // Redirect to home if not authenticated
  if (!user && (currentView === 'admin' || currentView === 'upload' || currentView === 'profile')) {
    setCurrentView('home');
  }

  return (
    <Layout currentView={currentView} onViewChange={handleViewChange}>
      {currentView === 'home' && (
        <GameList onGameSelect={handleGameSelect} />
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
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">User Profile</div>
          <p className="text-gray-500 mt-2">Profile page coming soon...</p>
        </div>
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
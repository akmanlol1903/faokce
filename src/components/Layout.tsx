import React, { useState } from 'react';
import { Gamepad2, User, LogOut, Shield, Home, Upload, Search, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onViewChange, searchTerm, setSearchTerm }) => {
  const { user, signOut, isAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onViewChange('home');
    setIsSearchOpen(false); 
  };

  const handleNavClick = (view: string) => {
    onViewChange(view);
    setIsMenuOpen(false);
  }

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
    onViewChange('home');
  }

  const navItems = [
    { view: 'home', label: 'Home', requiredAuth: false },
    { view: 'profile', label: 'Profile', requiredAuth: true },
    { view: 'admin', label: 'Admin', requiredAuth: true, requiredAdmin: true },
    { view: 'upload', label: 'Upload', requiredAuth: true, requiredAdmin: true },
  ];

  const mainHeaderContent = () => {
    if (isSearchOpen) {
      return (
        <form onSubmit={handleSearchSubmit} className="w-full">
          <div className="relative">
            <input
              type="text"
              placeholder="Search and press enter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-700/50 rounded-full py-2 pl-4 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              autoFocus
              onBlur={() => setIsSearchOpen(false)}
            />
            <button type="submit" className="absolute right-0 top-0 mt-2 mr-3 text-gray-400 hover:text-white">
              <Search className="h-5 w-5" />
            </button>
          </div>
        </form>
      );
    }
    return (
      <div onClick={() => handleNavClick('home')} className="flex items-center gap-2 cursor-pointer">
        <Gamepad2 className="h-8 w-8 text-purple-500" />
        {/* YAZI STİLİ GÜNCELLENDİ */}
        <span className="text-xl font-black text-white hidden sm:block">GameHub</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="fixed top-0 left-0 right-0 z-50 p-4 flex justify-center">
        <div className={`
          relative w-full max-w-2xl bg-slate-800/70 backdrop-blur-md rounded-3xl border border-slate-700 shadow-lg
          transition-[height] duration-500 ease-in-out
          ${isMenuOpen ? 'h-80' : 'h-16'}
        `}>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between h-16 px-6 flex-shrink-0">
              <div className="flex-1 flex justify-start">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-300 hover:text-white transition-colors">
                  {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
              
              <div className="flex-1 flex justify-center transition-opacity duration-300">
                {mainHeaderContent()}
              </div>

              <div className="flex-1 flex justify-end">
                {!isSearchOpen && (
                  <button onClick={() => setIsSearchOpen(true)} className="p-2 text-gray-300 hover:text-white transition-colors">
                    <Search className="h-6 w-6" />
                  </button>
                )}
              </div>
            </div>

            <div className={`flex-grow flex flex-col justify-center items-center overflow-hidden transition-opacity duration-300 ease-in-out ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`}>
               <nav className="flex flex-col items-center space-y-3 text-center">
                  {navItems.map(item => {
                      if (item.requiredAuth && !user) return null;
                      if (item.requiredAdmin && !isAdmin) return null;
                      return (
                          <button
                          key={item.view}
                          onClick={() => handleNavClick(item.view)}
                          // YAZI STİLİ GÜNCELLENDİ
                          className="text-2xl font-black text-gray-300 hover:text-white transition-colors"
                          >
                          {item.label}
                          </button>
                      );
                  })}
                  {user ? (
                     // YAZI STİLİ GÜNCELLENDİ
                     <button onClick={handleSignOut} className="text-2xl font-black text-red-400 hover:text-red-300 transition-colors">Sign Out</button>
                  ) : (
                     <>
                        {/* YAZI STİLİ GÜNCELLENDİ */}
                        <button onClick={() => handleNavClick('login')} className="text-2xl font-black text-gray-300 hover:text-white transition-colors">Login</button>
                        <button onClick={() => handleNavClick('register')} className="text-2xl font-black text-gray-300 hover:text-white transition-colors">Sign Up</button>
                     </>
                  )}
               </nav>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28">
        {children}
      </main>
    </div>
  );
};

export default Layout;
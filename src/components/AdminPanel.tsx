import React, { useState, useEffect } from 'react';
import { Trash2, Edit, Users, GamepadIcon, MessageSquare, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Game {
  id: string;
  title: string;
  description: string;
  category: string;
  download_count: number;
  rating: number;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  username: string;
  is_admin: boolean;
  created_at: string;
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'games' | 'users' | 'stats'>('games');
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalGames: 0,
    totalUsers: 0,
    totalDownloads: 0,
    avgRating: 0,
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'games') {
        const { data } = await supabase
          .from('games')
          .select('*')
          .order('created_at', { ascending: false });
        setGames(data || []);
      } else if (activeTab === 'users') {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        setUsers(data || []);
      } else if (activeTab === 'stats') {
        await fetchStats();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [gamesRes, usersRes] = await Promise.all([
        supabase.from('games').select('download_count, rating'),
        supabase.from('profiles').select('id'),
      ]);

      const totalGames = gamesRes.data?.length || 0;
      const totalUsers = usersRes.data?.length || 0;
      const totalDownloads = gamesRes.data?.reduce((sum, game) => sum + game.download_count, 0) || 0;
      const avgRating = gamesRes.data?.length 
        ? gamesRes.data.reduce((sum, game) => sum + game.rating, 0) / gamesRes.data.length
        : 0;

      setStats({
        totalGames,
        totalUsers,
        totalDownloads,
        avgRating,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;

    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId);

      if (error) {
        console.error('Error deleting game:', error);
        return;
      }

      setGames(games.filter(game => game.id !== gameId));
    } catch (error) {
      console.error('Error deleting game:', error);
    }
  };

  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !isAdmin })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user:', error);
        return;
      }

      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_admin: !isAdmin } : user
      ));
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const tabs = [
    { id: 'games', label: 'Games', icon: GamepadIcon },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {activeTab === 'games' && (
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-gray-300">Title</th>
                      <th className="text-left py-3 px-4 text-gray-300">Category</th>
                      <th className="text-left py-3 px-4 text-gray-300">Downloads</th>
                      <th className="text-left py-3 px-4 text-gray-300">Rating</th>
                      <th className="text-left py-3 px-4 text-gray-300">Created</th>
                      <th className="text-left py-3 px-4 text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {games.map((game) => (
                      <tr key={game.id} className="border-b border-slate-700">
                        <td className="py-3 px-4 text-white">{game.title}</td>
                        <td className="py-3 px-4 text-gray-300">{game.category}</td>
                        <td className="py-3 px-4 text-gray-300">{game.download_count}</td>
                        <td className="py-3 px-4 text-gray-300">{game.rating.toFixed(1)}</td>
                        <td className="py-3 px-4 text-gray-300">
                          {new Date(game.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleDeleteGame(game.id)}
                            className="text-red-400 hover:text-red-300 p-1 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-gray-300">Username</th>
                      <th className="text-left py-3 px-4 text-gray-300">Email</th>
                      <th className="text-left py-3 px-4 text-gray-300">Role</th>
                      <th className="text-left py-3 px-4 text-gray-300">Joined</th>
                      <th className="text-left py-3 px-4 text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-slate-700">
                        <td className="py-3 px-4 text-white">{user.username}</td>
                        <td className="py-3 px-4 text-gray-300">{user.email}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.is_admin 
                              ? 'bg-purple-600 text-white' 
                              : 'bg-gray-600 text-gray-300'
                          }`}>
                            {user.is_admin ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                            className="text-purple-400 hover:text-purple-300 text-sm px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
                          >
                            {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-700 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Games</p>
                      <p className="text-2xl font-bold text-white">{stats.totalGames}</p>
                    </div>
                    <GamepadIcon className="h-8 w-8 text-purple-400" />
                  </div>
                </div>
                <div className="bg-slate-700 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Users</p>
                      <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                    </div>
                    <Users className="h-8 w-8 text-green-400" />
                  </div>
                </div>
                <div className="bg-slate-700 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Downloads</p>
                      <p className="text-2xl font-bold text-white">{stats.totalDownloads}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-blue-400" />
                  </div>
                </div>
                <div className="bg-slate-700 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Average Rating</p>
                      <p className="text-2xl font-bold text-white">{stats.avgRating.toFixed(1)}</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-yellow-400" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
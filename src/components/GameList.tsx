import React, { useState, useEffect } from 'react';
import { Filter, Grid, List } from 'lucide-react';
import { supabase } from '../lib/supabase';
import GameCard from './GameCard';

interface Game {
  id: string;
  title: string;
  description: string;
  category: string;
  file_url: string;
  image_url: string | null;
  screenshots: string[] | null;
  download_count: number;
  rating: number;
  created_by: string;
  created_at: string;
}

interface GameListProps {
  onGameSelect: (gameId: string) => void;
  searchTerm: string; // YENİ: Arama terimi prop olarak alınıyor
}

const GameList: React.FC<GameListProps> = ({ onGameSelect, searchTerm }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'action', label: 'Action' },
    { value: 'adventure', label: 'Adventure' },
    { value: 'puzzle', label: 'Puzzle' },
    { value: 'rpg', label: 'RPG' },
    { value: 'strategy', label: 'Strategy' },
    { value: 'simulation', label: 'Simulation' },
    { value: 'arcade', label: 'Arcade' },
  ];

  useEffect(() => {
    fetchGames();
  }, [selectedCategory, sortBy]);

  const fetchGames = async () => {
    try {
      setLoading(true);
      let query = supabase.from('games').select('*');

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (sortBy === 'rating') {
        query = query.order('rating', { ascending: false });
      } else if (sortBy === 'downloads') {
        query = query.order('download_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching games:', error);
        return;
      }

      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGames = games.filter(game =>
    game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    game.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = async (gameId: string) => {
    try {
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('file_url, title, download_count')
        .eq('id', gameId)
        .single();

      if (gameError || !game) {
        throw new Error('Game not found or error fetching game details.');
      }

      const { error: updateError } = await supabase
        .from('games')
        .update({ download_count: game.download_count + 1 })
        .eq('id', gameId);

      if (updateError) {
        console.error('Error updating download count:', updateError);
      }
      
      let downloadLink = game.file_url;
      if (downloadLink.includes('drive.google.com')) {
        const fileIdMatch = downloadLink.match(/drive\.google\.com\/file\/d\/([^/]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
          const fileId = fileIdMatch[1];
          downloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
        }
      }

      window.open(downloadLink, '_blank');
      
      fetchGames();
      
    } catch (error: any) {
      console.error('Download failed:', error.message);
      alert(`Error: Could not process the download. ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-800 text-white px-3 py-2 rounded-lg border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-800 text-white px-3 py-2 rounded-lg border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
          >
            <option value="created_at">Newest</option>
            <option value="rating">Highest Rated</option>
            <option value="downloads">Most Downloaded</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-gray-400 hover:text-white'}`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-gray-400 hover:text-white'}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Games Grid */}
      {filteredGames.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">No games found</div>
          <p className="text-gray-500 mt-2">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {filteredGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onDownload={handleDownload}
              onViewDetails={onGameSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default GameList;
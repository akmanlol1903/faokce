import React from 'react';
import { Download, Star, MessageCircle, Calendar } from 'lucide-react';

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

interface GameCardProps {
  game: Game;
  onDownload: (gameId: string) => void;
  onViewDetails: (gameId: string) => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, onDownload, onViewDetails }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20">
      <div className="relative group">
        <img
          src={game.image_url || 'https://images.pexels.com/photos/275033/pexels-photo-275033.jpeg?auto=compress&cs=tinysrgb&w=800'}
          alt={game.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-4 right-4">
          <span className="bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-medium">
            {game.category}
          </span>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{game.title}</h3>
        <p className="text-gray-300 text-sm mb-4 line-clamp-2">{game.description}</p>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span>{game.rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Download className="h-4 w-4" />
              <span>{game.download_count}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-sm text-gray-400">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(game.created_at)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => onViewDetails(game.id)}
            className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>View Details</span>
          </button>
          <button
            onClick={() => onDownload(game.id)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameCard;
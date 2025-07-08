import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Star, MessageCircle, Calendar, User, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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

interface Comment {
  id: string;
  game_id: string;
  user_id: string;
  content: string;
  rating: number;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface GameDetailsProps {
  gameId: string;
  onBack: () => void;
}

const GameDetails: React.FC<GameDetailsProps> = ({ gameId, onBack }) => {
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchGameDetails();
    fetchComments();
  }, [gameId]);

  const fetchGameDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) {
        console.error('Error fetching game details:', error);
        return;
      }

      setGame(data);
    } catch (error) {
      console.error('Error fetching game details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles (
            username,
            avatar_url
          )
        `)
        .eq('game_id', gameId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching comments:', error);
        return;
      }

      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleDownload = async () => {
    if (!game) return;

    try {
      // Increment download count
      const { error } = await supabase
        .from('games')
        .update({ download_count: game.download_count + 1 })
        .eq('id', gameId);

      if (error) {
        console.error('Error updating download count:', error);
        return;
      }

      // Trigger download
      const link = document.createElement('a');
      link.href = game.file_url;
      link.download = `${game.title}.zip`;
      link.click();

      // Update local state
      setGame(prev => prev ? { ...prev, download_count: prev.download_count + 1 } : null);
    } catch (error) {
      console.error('Error downloading game:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('comments')
        .insert([
          {
            game_id: gameId,
            user_id: user.id,
            content: newComment.trim(),
            rating: newRating,
          },
        ]);

      if (error) {
        console.error('Error submitting comment:', error);
        return;
      }

      setNewComment('');
      setNewRating(5);
      fetchComments();
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg">Game not found</div>
        <button
          onClick={onBack}
          className="mt-4 text-purple-400 hover:text-purple-300"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Games</span>
        </button>
      </div>

      {/* Game Details */}
      <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
        <div className="md:flex">
          <div className="md:w-1/2">
            <img
              src={game.image_url || 'https://images.pexels.com/photos/275033/pexels-photo-275033.jpeg?auto=compress&cs=tinysrgb&w=800'}
              alt={game.title}
              className="w-full h-64 md:h-full object-cover"
            />
          </div>
          <div className="md:w-1/2 p-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-white">{game.title}</h1>
              <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                {game.category}
              </span>
            </div>

            <div className="flex items-center space-x-6 mb-6 text-sm text-gray-400">
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span>{game.rating.toFixed(1)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Download className="h-4 w-4" />
                <span>{game.download_count} downloads</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(game.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <p className="text-gray-300 mb-6 leading-relaxed">{game.description}</p>

            <button
              onClick={handleDownload}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors font-medium"
            >
              <Download className="h-5 w-5" />
              <span>Download Game</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">
        <div className="flex items-center space-x-2 mb-6">
          <MessageCircle className="h-6 w-6 text-purple-400" />
          <h2 className="text-xl font-bold text-white">Comments & Reviews</h2>
        </div>

        {/* Add Comment Form */}
        {user && (
          <div className="bg-slate-700 rounded-lg p-6 mb-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-400" />
                <span className="text-white font-medium">Rating:</span>
              </div>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setNewRating(star)}
                    className={`h-6 w-6 ${
                      star <= newRating ? 'text-yellow-400 fill-current' : 'text-gray-400'
                    }`}
                  >
                    <Star className="h-full w-full" />
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write your review..."
              className="w-full bg-slate-800 text-white p-4 rounded-lg border border-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none resize-none"
              rows={4}
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={handleSubmitComment}
                disabled={submitting || !newComment.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Send className="h-4 w-4" />
                <span>Submit Review</span>
              </button>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No comments yet. Be the first to review this game!
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-slate-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-medium">{comment.profiles.username}</div>
                      <div className="text-gray-400 text-sm">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= comment.rating ? 'text-yellow-400 fill-current' : 'text-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-gray-300 leading-relaxed">{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GameDetails;
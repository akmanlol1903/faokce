import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Star, MessageCircle, Calendar, ChevronLeft, ChevronRight, Loader2, Send, User as UserIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../lib/supabase';

// Tipler
type Game = Database['public']['Tables']['games']['Row'];
type Comment = Database['public']['Tables']['comments']['Row'] & {
  profiles: { username: string; avatar_url: string | null; };
};
interface SteamDetails {
  about_the_game: string;
  screenshots: { id: number; url: string }[];
  pc_requirements: { minimum: string; recommended?: string };
  short_description: string;
}

const GameDetails: React.FC<{ gameId: string; onBack: () => void; }> = ({ gameId, onBack }) => {
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [steamDetails, setSteamDetails] = useState<SteamDetails | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState(0);

  useEffect(() => {
    fetchGameData();
  }, [gameId]);

  const fetchGameData = async () => {
    setLoading(true);
    setError(null);
    setSteamDetails(null);
    try {
      const { data: gameData, error: gameError } = await supabase.from('games').select('*').eq('id', gameId).single();
      if (gameError) throw new Error("Oyun bulunamadı.");
      setGame(gameData);
      
      await fetchComments();

      if (gameData.steam_appid) {
        const { data: steamData, error: steamError } = await supabase.functions.invoke('steam-get-details', {
          body: { appId: gameData.steam_appid },
        });
        if (steamError || !steamData.success) console.warn("Steam detayları alınamadı:", steamError || steamData.message);
        else setSteamDetails(steamData);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchComments = async () => {
    const { data, error } = await supabase.from('comments').select('*, profiles(username, avatar_url)').eq('game_id', gameId).order('created_at', { ascending: false });
    if (error) console.error("Error fetching comments:", error);
    else setComments(data || []);
  };
  
  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('comments').insert([{ game_id: gameId, user_id: user.id, content: newComment.trim(), rating: newRating }]);
      if (error) throw error;
      setNewComment('');
      setNewRating(5);
      await fetchComments();
    } catch (e: any) {
      console.error("Error submitting comment:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!game) return;
    try {
        const { error: updateError } = await supabase
            .from('games')
            .update({ download_count: game.download_count + 1 })
            .eq('id', game.id);
        if (updateError) console.error('Error updating download count:', updateError);
        let downloadLink = game.file_url;
        if (downloadLink.includes('drive.google.com')) {
            const fileIdMatch = downloadLink.match(/drive\.google\.com\/file\/d\/([^/]+)/);
            if (fileIdMatch && fileIdMatch[1]) {
                const fileId = fileIdMatch[1];
                downloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
            }
        }
        window.open(downloadLink, '_blank');
        setGame(prev => prev ? { ...prev, download_count: prev.download_count + 1 } : null);
    } catch (error: any) {
        console.error('Download failed:', error.message);
        alert(`Error: Could not process the download. ${error.message}`);
    }
  };

  const screenshots = game?.screenshots || [];
  const nextScreenshot = () => setCurrentScreenshot((p) => (p + 1) % screenshots.length);
  const prevScreenshot = () => setCurrentScreenshot((p) => (p - 1 + screenshots.length) % screenshots.length);

  if (loading) return <div className="flex justify-center items-center h-96"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>;
  if (error) return <div className="text-center text-red-400 p-8">{error}</div>;
  if (!game) return null;

  return (
    <div className="space-y-8">
      <button onClick={onBack} className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors">
        <ArrowLeft className="h-4 w-4" /><span>Back to Games</span>
      </button>

      <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1"><img src={game.image_url || 'https://via.placeholder.com/460x215'} alt={game.title} className="w-full rounded-lg object-cover shadow-lg" /></div>
          <div className="md:col-span-2 flex flex-col">
            <h1 className="text-4xl font-bold text-white">{game.title}</h1>
            <p className="text-gray-300 leading-relaxed mt-4 flex-grow">{steamDetails?.short_description || game.description}</p>
            <div className="flex items-center space-x-6 text-sm text-gray-400 pt-4 mt-auto">
              <div className="flex items-center space-x-1"><Star className="h-4 w-4 text-yellow-400 fill-current" /><span>{game.rating.toFixed(1)}</span></div>
              <div className="flex items-center space-x-1"><Download className="h-4 w-4" /><span>{game.download_count}</span></div>
              <div className="flex items-center space-x-1"><Calendar className="h-4 w-4" /><span>{new Date(game.created_at).toLocaleDateString()}</span></div>
            </div>
            <button onClick={handleDownload} className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center justify-center space-x-2 font-medium transition-colors">
              <Download className="h-5 w-5" /><span>Download Game</span>
            </button>
          </div>
        </div>
      </div>
      
      {screenshots.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-6 md:p-8 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">Screenshots</h2>
          <div className="relative">
            <img src={screenshots[currentScreenshot]} alt={`Screenshot ${currentScreenshot + 1}`} className="w-full rounded-lg aspect-video object-cover" />
            <button onClick={prevScreenshot} className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/80 transition-colors"><ChevronLeft /></button>
            <button onClick={nextScreenshot} className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/80 transition-colors"><ChevronRight /></button>
          </div>
        </div>
      )}

      {steamDetails && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            <div className="lg:col-span-2 bg-slate-800 rounded-xl p-6 md:p-8 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">About This Game</h2>
              <div className="prose prose-invert text-gray-300 max-w-none" dangerouslySetInnerHTML={{ __html: steamDetails.about_the_game }} />
            </div>
            <div className="lg:col-span-1 bg-slate-800 rounded-xl p-6 md:p-8 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">System Requirements</h2>
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold text-purple-400 mb-2">Minimum:</h3>
                  <div className="text-gray-300 prose prose-invert max-w-none prose-sm" dangerouslySetInnerHTML={{ __html: steamDetails.pc_requirements.minimum }} />
                </div>
                {steamDetails.pc_requirements.recommended && (
                  <div>
                    <h3 className="font-semibold text-purple-400 mt-4 mb-2">Recommended:</h3>
                    <div className="text-gray-300 prose prose-invert max-w-none prose-sm" dangerouslySetInnerHTML={{ __html: steamDetails.pc_requirements.recommended }} />
                  </div>
                )}
              </div>
            </div>
          </div>
      )}
      
      <div className="bg-slate-800 rounded-xl p-6 md:p-8 border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3"><MessageCircle />Comments & Reviews</h2>
        {user && (
          <div className="bg-slate-700/50 rounded-lg p-6 mb-8">
            <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write your review..." className="w-full bg-slate-800 text-white p-4 rounded-lg border border-slate-600 focus:border-purple-500" rows={3}/>
            <div className="flex justify-between items-center mt-4">
                <div className="flex items-center space-x-1">{[1, 2, 3, 4, 5].map(star => (<button key={star} onClick={() => setNewRating(star)} className={`h-6 w-6 ${star <= newRating ? 'text-yellow-400 fill-current' : 'text-gray-400'}`}><Star /></button>))}</div>
                <button onClick={handleSubmitComment} disabled={submitting || !newComment.trim()} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-6 py-2 rounded-lg flex items-center space-x-2"><Send className="h-4 w-4" /><span>Submit</span></button>
            </div>
          </div>
        )}
        <div className="space-y-4">
          {comments.length === 0 ? (<p className="text-center text-gray-400 py-8">No comments yet. Be the first to review!</p>) : (
            comments.map(c => (
              <div key={c.id} className="bg-slate-700 rounded-lg p-4 flex gap-4">
                <img src={c.profiles?.avatar_url || `https://api.dicebear.com/8.x/bottts/svg?seed=${c.profiles?.username}`} alt="avatar" className="w-10 h-10 rounded-full bg-slate-800"/>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-white">{c.profiles?.username || 'User'}</span>
                    <div className="flex items-center gap-1">{[...Array(c.rating)].map((_, i) => <Star key={i} className="h-4 w-4 text-yellow-400 fill-current"/>)}{[...Array(5 - c.rating)].map((_, i) => <Star key={i} className="h-4 w-4 text-gray-500"/>)}</div>
                  </div>
                  <p className="text-gray-300 mt-1">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GameDetails;
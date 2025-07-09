import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Download, Star, ChevronLeft, ChevronRight, Loader2, Send, ArrowUpRight } from 'lucide-react';
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
  const [creatorName, setCreatorName] = useState('');

  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const screenshotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGameData();
  }, [gameId]);

  const fetchGameData = async () => {
    setLoading(true);
    try {
      const { data: gameData, error: gameError } = await supabase.from('games').select('*').eq('id', gameId).single();
      if (gameError) throw new Error("Oyun bulunamadı.");
      setGame(gameData);

      const { data: profileData } = await supabase.from('profiles').select('username').eq('id', gameData.created_by).single();
      setCreatorName(profileData?.username || 'Anonymous');

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

  const handleScrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollScreenshots = (direction: 'left' | 'right') => {
    if (screenshotsRef.current) {
        const scrollAmount = screenshotsRef.current.clientWidth * 0.8;
        screenshotsRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from('comments').insert([{ game_id: gameId, user_id: user.id, content: newComment.trim(), rating: newRating }]);
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
        await supabase.from('games').update({ download_count: game.download_count + 1 }).eq('id', game.id);
        let downloadLink = game.file_url;
        if (downloadLink.includes('drive.google.com')) {
            const fileIdMatch = downloadLink.match(/drive\.google\.com\/file\/d\/([^/]+)/);
            if (fileIdMatch && fileIdMatch[1]) {
                downloadLink = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
            }
        }
        window.open(downloadLink, '_blank');
        setGame(prev => prev ? { ...prev, download_count: prev.download_count + 1 } : null);
    } catch (error: any) {
        console.error('Download failed:', error.message);
    }
  };

  const screenshots = game?.screenshots || [];

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>;
  if (error) return <div className="text-center text-red-400 p-8">{error}</div>;
  if (!game) return null;

  return (
    <div className="bg-slate-900 text-white min-h-screen">
      <div className="max-w-7xl mx-auto p-8">
        <button onClick={onBack} className="flex items-center justify-center h-12 w-12 border border-slate-700 hover:border-slate-500 transition-colors mb-8">
          <ArrowLeft className="h-6 w-6" />
        </button>

        <div className="w-full space-y-16">
          {/* Main Game Image */}
          <img src={game.image_url || 'https://via.placeholder.com/1280x720'} alt={game.title} className="w-full h-auto object-cover" />

          {/* Game Info Section */}
          <div>
            <div className="mb-8">
              <h1 className="text-5xl lg:text-8xl font-black uppercase tracking-wider mb-2">{game.title}</h1>
              <div className="flex justify-between items-baseline text-slate-400">
                <p>{creatorName}</p>
                <p>{new Date(game.created_at).getFullYear()}</p>
              </div>
            </div>
            <p className="text-slate-300 leading-relaxed text-lg mb-12">{steamDetails?.short_description || game.description}</p>
          </div>

          {/* Section Links */}
          <div className="w-full space-y-4 border-y border-slate-700 text-lg">
            {steamDetails && <SectionLink title="ABOUT" onClick={() => handleScrollTo('about-section')} />}
            {steamDetails?.pc_requirements?.minimum && <SectionLink title="SYSTEM REQUIREMENTS" onClick={() => handleScrollTo('requirements-section')} />}
            {screenshots.length > 0 && <SectionLink title="SCREENSHOTS" onClick={() => handleScrollTo('screenshots-section')} />}
            <SectionLink title="COMMENTS & REVIEWS" onClick={() => handleScrollTo('comments-section')} />
            <SectionLink title="DOWNLOAD" onClick={handleDownload} icon={<Download className="h-5 w-5"/>} />
          </div>

          {/* Screenshots Section */}
          {screenshots.length > 0 && (
            <div id="screenshots-section" className="space-y-8">
              <h2 className="text-3xl font-bold">SCREENSHOTS</h2>
              <div className="relative">
                  <div ref={screenshotsRef} className="flex space-x-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
                      {screenshots.map((src, index) => (
                          <img key={index} src={src} alt={`${game.title} screenshot ${index + 1}`} className="snap-center w-10/12 md:w-2/3 flex-shrink-0 h-auto object-cover" />
                      ))}
                  </div>
                  <button onClick={() => scrollScreenshots('left')} className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/80 transition-colors z-10">
                      <ChevronLeft />
                  </button>
                  <button onClick={() => scrollScreenshots('right')} className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/80 transition-colors z-10">
                      <ChevronRight />
                  </button>
              </div>
            </div>
          )}

          {/* About Section */}
          {steamDetails && (
            <div id="about-section" className="space-y-8 pt-16 border-t border-slate-700">
              <h2 className="text-3xl font-bold">ABOUT</h2>
              <div className="prose prose-invert text-gray-300 max-w-none text-base" dangerouslySetInnerHTML={{ __html: steamDetails.about_the_game }} />
            </div>
          )}

          {/* System Requirements Section */}
          {steamDetails?.pc_requirements?.minimum && (
            <div id="requirements-section" className="space-y-8 pt-16 border-t border-slate-700">
              <h2 className="text-3xl font-bold">SYSTEM REQUIREMENTS</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-purple-400 mb-2">MINIMUM:</h3>
                  <div className="text-gray-300 prose prose-invert max-w-none prose-sm" dangerouslySetInnerHTML={{ __html: steamDetails.pc_requirements.minimum }} />
                </div>
                {steamDetails.pc_requirements.recommended && (
                  <div>
                    <h3 className="font-semibold text-purple-400 mb-2">RECOMMENDED:</h3>
                    <div className="text-gray-300 prose prose-invert max-w-none prose-sm" dangerouslySetInnerHTML={{ __html: steamDetails.pc_requirements.recommended }} />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Comments Section */}
          <div id="comments-section" className="space-y-8 pt-16 border-t border-slate-700">
            <h2 className="text-3xl font-bold">COMMENTS & REVIEWS</h2>
            {user && (
              <div className="bg-slate-800/50 p-4">
                <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write your review..." className="w-full bg-slate-800 text-white p-3 border border-slate-600 focus:border-purple-500" rows={3}/>
                <div className="flex justify-between items-center mt-3">
                    <div className="flex items-center space-x-1">{[1, 2, 3, 4, 5].map(star => (<button key={star} onClick={() => setNewRating(star)} className={`h-6 w-6 ${star <= newRating ? 'text-yellow-400 fill-current' : 'text-gray-400'}`}><Star /></button>))}</div>
                    <button onClick={handleSubmitComment} disabled={submitting || !newComment.trim()} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-5 py-2 flex items-center space-x-2 text-sm"><Send className="h-4 w-4" /><span>Submit</span></button>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {comments.length === 0 ? (<p className="text-center text-gray-400 py-8">No comments yet.</p>) : (
                comments.map(c => (
                  <div key={c.id} className="bg-slate-800 p-4 flex gap-4">
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
      </div>
    </div>
  );
};

// Yardımcı bileşen
const SectionLink: React.FC<{title: string, onClick: () => void, icon?: React.ReactNode}> = ({ title, onClick, icon }) => (
    <button onClick={onClick} className="w-full flex justify-between items-center py-4 border-b border-slate-700 last:border-b-0 hover:text-purple-400 transition-colors group">
        <span className="font-bold">{title}</span>
        <div className="transform transition-transform duration-300 group-hover:translate-x-2">
            {icon || <ArrowUpRight className="h-5 w-5"/>}
        </div>
    </button>
);

export default GameDetails;
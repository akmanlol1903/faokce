import React, { useState } from 'react';
import { Upload, Image as ImageIcon, FileText, Tag, Save, Search, Link as LinkIcon, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Tipler
interface SteamSearchResult {
  appid: number;
  name: string;
}

const GameUpload: React.FC = () => {
  const { user } = useAuth();

  // Form verileri için state'ler
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'action',
  });
  const [steamAppId, setSteamAppId] = useState<number | null>(null);
  const [gameFile, setGameFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Arayüz durumları için state'ler
  const [loading, setLoading] = useState(false); // Ana form gönderme işlemi için
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false); // Steam arama/detay getirme işlemi için
  
  // HATA BURADA OLUŞUYORDU: searchTerm state'i eksik veya yanlış tanımlanmış olabilir.
  // Doğru tanımlama aşağıdadır.
  const [searchTerm, setSearchTerm] = useState(''); 
  const [searchResults, setSearchResults] = useState<SteamSearchResult[]>([]);

  const categories = [
    { value: 'action', label: 'Action' },
    { value: 'adventure', label: 'Adventure' },
    { value: 'puzzle', label: 'Puzzle' },
    { value: 'rpg', label: 'RPG' },
    { value: 'strategy', label: 'Strategy' },
    { value: 'simulation', label: 'Simulation' },
    { value: 'arcade', label: 'Arcade' },
  ];

  // Steam'de arama yapar veya linki çözer
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsProcessing(true);
    setSearchResults([]);
    setMessage('');

    const isSteamUrl = /store\.steampowered\.com\/app\/(\d+)/.test(searchTerm);

    try {
      if (isSteamUrl) {
        setMessage("Resolving Steam link...");
        const { data, error } = await supabase.functions.invoke('steam-resolve-url', { body: { url: searchTerm } });
        if (error || !data.success) throw new Error(error?.message || data.message);
        await fillFormWithSteamData(data);
      } else {
        setMessage("Searching on Steam...");
        const { data, error } = await supabase.functions.invoke('steam-search', { body: { searchTerm } });
        if (error) throw new Error(error.message);
        setSearchResults(data);
        setMessage(data.length > 0 ? `${data.length} results found.` : 'No results found.');
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Arama listesinden seçilen oyunun detaylarını getirir
  const handleSelectGame = async (game: SteamSearchResult) => {
    setSearchTerm(game.name);
    setFormData(prev => ({ ...prev, title: game.name, description: '', category: 'action' }));
    setSearchResults([]);
    setImageUrl(null);
    setImageFile(null);
    setIsProcessing(true);
    setMessage('Fetching details from Steam Store...');
    try {
      const { data, error } = await supabase.functions.invoke('steam-get-details', { body: { appId: game.appid } });
      if (error || !data.success) throw new Error(error?.message || data.message);
      await fillFormWithSteamData(data);
    } catch (e: any) {
      setMessage(`Could not find store details for "${game.name}". Please fill in manually.`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Gelen Steam verisiyle formu doldurur
  const fillFormWithSteamData = async (steamData: any) => {
    setFormData({
      title: steamData.title,
      description: steamData.short_description || steamData.about_the_game || '',
      category: steamData.genres?.[0]?.description.toLowerCase() || 'action',
    });
    setSteamAppId(steamData.appid);
    setImageUrl(steamData.header_image);
    setMessage('Game details loaded successfully!');
    try {
      const response = await fetch(steamData.header_image);
      const blob = await response.blob();
      const file = new File([blob], `${steamData.appid}.jpg`, { type: blob.type });
      setImageFile(file);
    } catch (error) {
      console.error("Could not fetch image file from Steam:", error);
    }
  };

  // Manuel form girişlerini yönetir
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Manuel dosya seçimini yönetir
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'game' | 'image') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'game') {
        setGameFile(file);
      } else {
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => { setImageUrl(reader.result as string) };
        reader.readAsDataURL(file);
      }
    }
  };

  // Dosyayı Supabase Storage'a yükler
  const uploadFile = async (file: File, bucket: string, fileName: string) => {
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  // Tüm formu veritabanına kaydeder
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !gameFile || !formData.title || !formData.description) {
      setMessage("Game title, description, and a game file are required.");
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const gameFileName = `${user.id}_${Date.now()}_${gameFile.name}`;
      const gameUrl = await uploadFile(gameFile, 'games', gameFileName);
      let finalImageUrl = null;
      if (imageFile) {
        const imageFileName = `${user.id}_${Date.now()}_${imageFile.name}`;
        finalImageUrl = await uploadFile(imageFile, 'images', imageFileName);
      }
      const { error } = await supabase.from('games').insert([{
        title: formData.title,
        description: formData.description,
        category: formData.category,
        file_url: gameUrl,
        image_url: finalImageUrl,
        created_by: user.id,
        steam_appid: steamAppId,
        download_count: 0,
        rating: 0,
      }]);
      if (error) throw error;
      setMessage('Game uploaded successfully!');
      setFormData({ title: '', description: '', category: 'action' });
      setGameFile(null);
      setImageFile(null);
      setImageUrl(null);
      setSearchTerm('');
      setSteamAppId(null);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Upload Game</h1>
      
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Autofill from Steam</h2>
        <div className="flex gap-4 relative">
          <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {/store\.steampowered\.com/.test(searchTerm) ? <LinkIcon size={18}/> : <Search size={18}/>}
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter game name or Steam store link..."
              className="w-full bg-slate-700 text-white pl-10 pr-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-purple-500"
              disabled={isProcessing}
            />
          </div>
          <button onClick={handleSearch} disabled={isProcessing} className="bg-purple-600 px-4 py-2 rounded-lg flex items-center disabled:opacity-50 transition-colors">
            {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : "Search"}
          </button>
          {searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-slate-700 rounded-lg border border-slate-600 z-10 max-h-60 overflow-y-auto">
              {searchResults.map(game => (
                <div key={game.appid} onClick={() => handleSelectGame(game)} className="p-3 hover:bg-slate-600 cursor-pointer text-white border-b border-slate-600 last:border-b-0">
                  {game.name} <span className='text-xs text-gray-400'>(AppID: {game.appid})</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {message && <p className="text-sm text-purple-400 mt-2">{message}</p>}
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">Game Title</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input id="title" name="title" type="text" required value={formData.title} onChange={handleInputChange} className="w-full bg-slate-700 text-white pl-10 pr-4 py-3 rounded-lg border border-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"/>
              </div>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select id="category" name="category" value={formData.category} onChange={handleInputChange} className="w-full bg-slate-700 text-white pl-10 pr-4 py-3 rounded-lg border border-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500">
                  {categories.map((cat) => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
                </select>
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea id="description" name="description" required value={formData.description} onChange={handleInputChange} rows={6} className="w-full bg-slate-700 text-white p-4 rounded-lg border border-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Game File (ZIP, RAR, etc.)</label>
              <label htmlFor="gameFile" className="w-full bg-slate-700 p-4 rounded-lg border-2 border-dashed border-slate-600 hover:border-purple-500 cursor-pointer flex items-center justify-center space-x-2">
                <Upload className="h-5 w-5 text-gray-400" />
                <span className="text-gray-300 truncate">{gameFile ? gameFile.name : 'Click to upload game file'}</span>
                <input id="gameFile" type="file" accept=".zip,.rar,.7z" onChange={(e) => handleFileChange(e, 'game')} className="hidden" />
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Game Image (Optional)</label>
              <label htmlFor="imageFile" className="w-full bg-slate-700 p-4 rounded-lg border-2 border-dashed border-slate-600 hover:border-purple-500 cursor-pointer flex flex-col items-center justify-center space-y-2 h-[120px]">
                {imageUrl ? (
                    <img src={imageUrl} alt="Preview" className="max-h-full w-auto rounded-md object-cover" />
                ) : ( <ImageIcon className="h-8 w-8 text-gray-400" /> )}
                <span className="text-gray-300 text-xs truncate">{imageFile ? imageFile.name : 'Click to upload image'}</span>
                <input id="imageFile" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'image')} className="hidden" />
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={loading || !gameFile || !formData.title || !formData.description} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg flex items-center space-x-2 font-medium transition-colors">
              {loading ? (<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>) : (<><Save className="h-5 w-5" /><span>Upload Game</span></>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GameUpload;
import React, { useState } from 'react';
import { Upload, Image as ImageIcon, FileText, Tag, Save, Search, Link as LinkIcon, Loader2, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Tipler
interface SteamSearchResult {
  appid: number;
  name: string;
}

const GameUpload: React.FC = () => {
  const { user, session } = useAuth();

  // Form verileri için state'ler
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'action',
  });
  const [steamAppId, setSteamAppId] = useState<number | null>(null);
  const [gameLink, setGameLink] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<string[]>([]);

  // Arayüz durumları için state'ler
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SteamSearchResult[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const categories = [
    { value: 'action', label: 'Action' },
    { value: 'adventure', label: 'Adventure' },
    { value: 'puzzle', label: 'Puzzle' },
    { value: 'rpg', label: 'RPG' },
    { value: 'strategy', label: 'Strategy' },
    { value: 'simulation', label: 'Simulation' },
    { value: 'arcade', label: 'Arcade' },
  ];

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsProcessing(true);
    setSearchResults([]);
    setMessage('');
    const isSteamUrl = /store\.steampowered\.com\/app\/(\d+)/.test(searchTerm);
    try {
      if (isSteamUrl) {
        setMessage("Resolving Steam link...");
        const { data: resolvedData, error: resolveError } = await supabase.functions.invoke('steam-resolve-url', { body: { url: searchTerm } });
        if (resolveError || !resolvedData.success) throw new Error(resolveError?.message || resolvedData.message);

        setMessage("Fetching additional details...");
        const { data: detailsData, error: detailsError } = await supabase.functions.invoke('steam-get-details', { body: { appId: resolvedData.appid } });
        if (detailsError || !detailsData.success) {
            console.warn("Could not fetch extra details, continuing with basic info.");
            await fillFormWithSteamData(resolvedData);
        } else {
            const combinedData = { ...resolvedData, ...detailsData };
            await fillFormWithSteamData(combinedData);
        }
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

  const handleSelectGame = async (game: SteamSearchResult) => {
    setSearchTerm(game.name);
    setSearchResults([]);
    setImageUrl(null);
    setImageFile(null);
    setScreenshots([]);
    setIsProcessing(true);
    setMessage('Fetching details from Steam Store...');
    try {
      const { data, error } = await supabase.functions.invoke('steam-get-details', { body: { appId: game.appid } });
      if (error || !data.success) throw new Error(error?.message || data.message);
      await fillFormWithSteamData({ ...data, title: game.name, appid: game.appid });
    } catch (e: any) {
      setMessage(`Could not find store details for "${game.name}". Please fill in manually.`);
      setFormData({ title: game.name, description: '', category: 'action' });
    } finally {
      setIsProcessing(false);
    }
  };

  const fillFormWithSteamData = async (steamData: any) => {
    const finalImageUrl = steamData.header_image || steamData.imageUrl;
    const finalAppId = steamData.appid || steamData.steam_appid;
    const screenshotUrls = steamData.screenshots?.map((ss: any) => ss.url || ss.path_full) || [];

    setFormData({
      title: steamData.title || steamData.name,
      description: steamData.short_description || steamData.about_the_game || steamData.description || '',
      category: steamData.category || steamData.genres?.[0]?.description.toLowerCase() || 'action',
    });
    setSteamAppId(finalAppId);
    setImageUrl(finalImageUrl);
    setScreenshots(screenshotUrls);
    setMessage('Game details loaded successfully!');

    if (finalImageUrl) {
        try {
          const response = await fetch(finalImageUrl);
          const blob = await response.blob();
          const file = new File([blob], `${finalAppId}.jpg`, { type: blob.type });
          setImageFile(file);
        } catch (error) {
          console.error("Could not fetch image file from Steam:", error);
        }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGameLink(e.target.value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => { setImageUrl(reader.result as string) };
        reader.readAsDataURL(file);
    }
  };

  const uploadImageWithProgress = (file: File, bucket: string, fileName: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!session) {
        reject(new Error("User is not authenticated."));
        return;
      }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const url = `${supabaseUrl}/storage/v1/object/${bucket}/${fileName}`;
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.setRequestHeader('X-Upsert', 'true');
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(percentage);
        }
      };
      xhr.onload = () => {
        if (xhr.status === 200) {
          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
          resolve(urlData.publicUrl);
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            reject(new Error(errorResponse.message || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
          }
        }
      };
      xhr.onerror = () => reject(new Error('An error occurred during the upload. Check network connection.'));
      xhr.send(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !gameLink || !formData.title || !formData.description) {
      setMessage("Game title, description, and a Google Drive link are required.");
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      let finalImageUrl = imageUrl;
      if (imageFile && imageFile.size > 0 && !imageUrl?.startsWith('http')) {
        setMessage(`Uploading image file: ${imageFile.name}...`);
        setUploadProgress(0);
        const imageFileName = `${user.id}_${Date.now()}_${imageFile.name}`;
        finalImageUrl = await uploadImageWithProgress(imageFile, 'images', imageFileName);
        setUploadProgress(null);
      }
      
      setMessage('Saving game data...');
      const { error } = await supabase.from('games').insert([{
        title: formData.title,
        description: formData.description,
        category: formData.category,
        file_url: gameLink,
        image_url: finalImageUrl,
        screenshots: screenshots,
        created_by: user.id,
        steam_appid: steamAppId,
        download_count: 0,
        rating: 0,
      }]);
      if (error) throw error;
      
      setMessage('Game uploaded successfully!');
      setFormData({ title: '', description: '', category: 'action' });
      setGameLink('');
      setImageFile(null);
      setImageUrl(null);
      setSearchTerm('');
      setSteamAppId(null);
      setScreenshots([]);

    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
      setUploadProgress(null);
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
              <label htmlFor="gameLink" className="block text-sm font-medium text-gray-300 mb-2">Google Drive Link</label>
              <div className="relative">
                 <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                 <input 
                    id="gameLink" 
                    name="gameLink" 
                    type="url" 
                    required 
                    value={gameLink} 
                    onChange={handleLinkChange} 
                    placeholder="Enter Google Drive download link"
                    className="w-full bg-slate-700 text-white pl-10 pr-4 py-3 rounded-lg border border-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                 />
              </div>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Info size={14} />
                Make sure file sharing is set to "Anyone with the link".
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Game Image (Optional)</label>
              <label htmlFor="imageFile" className="w-full bg-slate-700 p-4 rounded-lg border-2 border-dashed border-slate-600 hover:border-purple-500 cursor-pointer flex flex-col items-center justify-center space-y-2 h-[120px]">
                {imageUrl ? (
                    <img src={imageUrl} alt="Preview" className="max-h-full w-auto rounded-md object-cover" />
                ) : ( <ImageIcon className="h-8 w-8 text-gray-400" /> )}
                <span className="text-gray-300 text-xs truncate">{imageFile ? imageFile.name : 'Click to upload image'}</span>
                <input id="imageFile" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>

          {uploadProgress !== null && (
            <div className="space-y-2">
                <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                </div>
                <p className="text-right text-sm text-purple-400">{uploadProgress}%</p>
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={loading || !gameLink || !formData.title || !formData.description} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg flex items-center space-x-2 font-medium transition-colors">
              {loading ? (<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>) : (<><Save className="h-5 w-5" /><span>Upload Game</span></>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GameUpload;
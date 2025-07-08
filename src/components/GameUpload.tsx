import React, { useState } from 'react';
import { Upload, Image, FileText, Tag, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const GameUpload: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'action',
  });
  const [gameFile, setGameFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const categories = [
    { value: 'action', label: 'Action' },
    { value: 'adventure', label: 'Adventure' },
    { value: 'puzzle', label: 'Puzzle' },
    { value: 'rpg', label: 'RPG' },
    { value: 'strategy', label: 'Strategy' },
    { value: 'simulation', label: 'Simulation' },
    { value: 'arcade', label: 'Arcade' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'game' | 'image') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'game') {
        setGameFile(file);
      } else {
        setImageFile(file);
      }
    }
  };

  const uploadFile = async (file: File, bucket: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !gameFile) return;

    setLoading(true);
    setMessage('');

    try {
      // Upload game file
      const gameFileName = `${Date.now()}_${gameFile.name}`;
      const gameUrl = await uploadFile(gameFile, 'games', gameFileName);

      // Upload image file if provided
      let imageUrl = null;
      if (imageFile) {
        const imageFileName = `${Date.now()}_${imageFile.name}`;
        imageUrl = await uploadFile(imageFile, 'images', imageFileName);
      }

      // Create game record
      const { error } = await supabase
        .from('games')
        .insert([
          {
            title: formData.title,
            description: formData.description,
            category: formData.category,
            file_url: gameUrl,
            image_url: imageUrl,
            created_by: user.id,
            download_count: 0,
            rating: 0,
          },
        ]);

      if (error) {
        throw error;
      }

      setMessage('Game uploaded successfully!');
      setFormData({ title: '', description: '', category: 'action' });
      setGameFile(null);
      setImageFile(null);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Upload Game</h1>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {message && (
            <div className={`p-4 rounded-lg ${
              message.includes('Error') 
                ? 'bg-red-900/20 border border-red-500 text-red-400' 
                : 'bg-green-900/20 border border-green-500 text-green-400'
            }`}>
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                Game Title
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full bg-slate-700 text-white pl-10 pr-4 py-3 rounded-lg border border-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  placeholder="Enter game title"
                />
              </div>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">
                Category
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full bg-slate-700 text-white pl-10 pr-4 py-3 rounded-lg border border-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              required
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full bg-slate-700 text-white p-4 rounded-lg border border-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none resize-none"
              placeholder="Describe your game..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="gameFile" className="block text-sm font-medium text-gray-300 mb-2">
                Game File (ZIP)
              </label>
              <div className="relative">
                <input
                  id="gameFile"
                  type="file"
                  accept=".zip,.rar,.7z"
                  onChange={(e) => handleFileChange(e, 'game')}
                  className="hidden"
                />
                <label
                  htmlFor="gameFile"
                  className="w-full bg-slate-700 text-white p-4 rounded-lg border-2 border-dashed border-slate-600 hover:border-purple-500 cursor-pointer flex items-center justify-center space-x-2 transition-colors"
                >
                  <Upload className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-300">
                    {gameFile ? gameFile.name : 'Click to upload game file'}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="imageFile" className="block text-sm font-medium text-gray-300 mb-2">
                Game Image (Optional)
              </label>
              <div className="relative">
                <input
                  id="imageFile"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'image')}
                  className="hidden"
                />
                <label
                  htmlFor="imageFile"
                  className="w-full bg-slate-700 text-white p-4 rounded-lg border-2 border-dashed border-slate-600 hover:border-purple-500 cursor-pointer flex items-center justify-center space-x-2 transition-colors"
                >
                  <Image className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-300">
                    {imageFile ? imageFile.name : 'Click to upload image'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !gameFile || !formData.title || !formData.description}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors font-medium"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>Upload Game</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GameUpload;
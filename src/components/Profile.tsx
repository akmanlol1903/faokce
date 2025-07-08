import React, { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Save, Upload, Gamepad, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../lib/supabase';

// Supabase'den gelen tipleri tanımla
type Profile = Database['public']['Tables']['profiles']['Row'];
type Game = Database['public']['Tables']['games']['Row'];
type Comment = Database['public']['Tables']['comments']['Row'] & {
  games: { title: string } | null; // Yorumun hangi oyuna ait olduğunu göstermek için
};

const Profile: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]); // Admin'in yüklediği oyunlar için
  const [comments, setComments] = useState<Comment[]>([]); // Kullanıcının yorumları için

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserComments();
      if (isAdmin) {
        fetchAdminGames();
      }
    }
  }, [user, isAdmin]);

  // Mevcut kullanıcının profil bilgilerini çeker
  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      if (data) {
        setProfile(data);
        setUsername(data.username);
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Eğer kullanıcı admin ise, kendi yüklediği oyunları çeker
  const fetchAdminGames = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Error fetching admin games:', error);
    }
  };

  // Kullanıcının yaptığı yorumları çeker
  const fetchUserComments = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, games (title)') // Yorumla birlikte oyunun başlığını da çek
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching user comments:', error);
    }
  };

  // Profil güncelleme işlemini yönetir
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    let new_avatar_url = profile?.avatar_url;

    try {
      // Eğer yeni bir avatar dosyası seçildiyse...
      if (avatarFile) {
        // Güvenli ve benzersiz bir dosya yolu oluştur: /kullanici_id/dosya_adi.png
        const filePath = `${user.id}/${avatarFile.name}`;
        
        // Önce mevcut avatarı Storage'dan sil (varsa)
        if (profile?.avatar_url) {
            const oldFilePath = new URL(profile.avatar_url).pathname.split('/avatars/').pop();
            if(oldFilePath && oldFilePath.length > 0) {
                await supabase.storage.from('avatars').remove([oldFilePath]);
            }
        }

        // Yeni avatarı Storage'a yükle
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true }); // upsert: true, dosya varsa üzerine yazar

        if (uploadError) throw uploadError;

        // Yüklenen dosyanın genel URL'ini al
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        new_avatar_url = urlData.publicUrl;
        setAvatarUrl(new_avatar_url);
      }
      
      // 'profiles' tablosundaki veriyi güncelle
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: username,
          avatar_url: new_avatar_url,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      alert('Profile updated successfully!');
      
      // Başarılı güncellemeden sonra seçilen dosyayı temizle
      setAvatarFile(null);
      
    } catch (error: any) {
      alert(`Error updating profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Avatar dosyası seçildiğinde önizleme için state'i günceller
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Veriler yüklenirken gösterilecek olan yüklenme animasyonu
  if (loading && !profile) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">My Profile</h1>
      
      {/* Profil Güncelleme Formu */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">
        <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Avatar Yükleme Alanı */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <img
                src={avatarUrl || `https://api.dicebear.com/8.x/bottts/svg?seed=${profile?.username}`}
                alt="Avatar"
                className="w-32 h-32 rounded-full object-cover border-4 border-slate-600"
              />
              <label htmlFor="avatar-upload" className="absolute -bottom-2 -right-2 bg-purple-600 p-2 rounded-full cursor-pointer hover:bg-purple-700 transition-colors">
                <Upload className="h-5 w-5 text-white" />
                <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
          </div>
          
          {/* Kullanıcı Bilgileri Formu */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-700 text-white pl-10 pr-4 py-3 rounded-lg border border-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full bg-slate-900 text-gray-400 pl-10 pr-4 py-3 rounded-lg border border-slate-700 cursor-not-allowed"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg flex items-center space-x-2 font-medium transition-colors"
              >
                {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <><Save className="h-5 w-5" /><span>Save Changes</span></>}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Admin tarafından yüklenen oyunlar bölümü (sadece adminler görür) */}
      {isAdmin && games.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2"><Gamepad /><span>My Uploaded Games</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map(game => (
               <div key={game.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4 hover:border-purple-500 transition-colors">
                   <h3 className="text-lg font-bold text-white truncate">{game.title}</h3>
                   <p className="text-gray-400 text-sm truncate">{game.description}</p>
               </div>
            ))}
          </div>
        </div>
      )}

      {/* Kullanıcının Yorumları Bölümü */}
      {comments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2"><MessageSquare /><span>My Comments</span></h2>
          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <p className="text-gray-300">"{comment.content}"</p>
                <p className="text-sm text-purple-400 mt-2">
                  on game: <span className="font-bold">{comment.games?.title || 'a game'}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;
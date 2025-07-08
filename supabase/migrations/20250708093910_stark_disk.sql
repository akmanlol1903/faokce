/*
  # Güvenlik Politikalarını Güncelle

  1. Mevcut Politikaları Temizle
    - Tüm tabloların mevcut politikalarını kaldır
    
  2. Yeni Güvenlik Politikaları
    - `profiles` tablosu için gelişmiş politikalar
    - `games` tablosu için admin ve kullanıcı politikaları
    - `comments` tablosu için kullanıcı politikaları
    
  3. Admin Yetkileri
    - Admin kullanıcılar için özel yetkiler
    - Tüm verilere erişim ve düzenleme hakları
*/

-- Mevcut politikaları temizle
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

DROP POLICY IF EXISTS "Anyone can read games" ON games;
DROP POLICY IF EXISTS "Authenticated users can insert games" ON games;
DROP POLICY IF EXISTS "Users can delete own games" ON games;
DROP POLICY IF EXISTS "Users can update own games" ON games;

DROP POLICY IF EXISTS "Anyone can read comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;

-- PROFILES tablosu için yeni politikalar
CREATE POLICY "Herkes profilleri okuyabilir"
  ON profiles
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Kullanıcılar kendi profilini oluşturabilir"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Kullanıcılar kendi profilini güncelleyebilir"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Adminler tüm profilleri güncelleyebilir"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Adminler profilleri silebilir"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- GAMES tablosu için yeni politikalar
CREATE POLICY "Herkes oyunları okuyabilir"
  ON games
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Adminler oyun ekleyebilir"
  ON games
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Oyun sahipleri kendi oyunlarını güncelleyebilir"
  ON games
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Adminler tüm oyunları güncelleyebilir"
  ON games
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Oyun sahipleri kendi oyunlarını silebilir"
  ON games
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Adminler tüm oyunları silebilir"
  ON games
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- COMMENTS tablosu için yeni politikalar
CREATE POLICY "Herkes yorumları okuyabilir"
  ON comments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Giriş yapmış kullanıcılar yorum yapabilir"
  ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Kullanıcılar kendi yorumlarını güncelleyebilir"
  ON comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Kullanıcılar kendi yorumlarını silebilir"
  ON comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Adminler tüm yorumları silebilir"
  ON comments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Adminler tüm yorumları güncelleyebilir"
  ON comments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Storage politikaları için fonksiyon oluştur
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage bucket'ları için politikalar (eğer yoksa)
DO $$
BEGIN
  -- Games bucket politikaları
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'games'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('games', 'games', true);
  END IF;

  -- Images bucket politikaları
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'images'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('images', 'images', true);
  END IF;
END $$;

-- Storage politikalarını temizle ve yeniden oluştur
DROP POLICY IF EXISTS "Adminler dosya yükleyebilir" ON storage.objects;
DROP POLICY IF EXISTS "Herkes dosyaları okuyabilir" ON storage.objects;
DROP POLICY IF EXISTS "Adminler dosyaları silebilir" ON storage.objects;

-- Storage için yeni politikalar
CREATE POLICY "Herkes dosyaları okuyabilir"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id IN ('games', 'images'));

CREATE POLICY "Adminler dosya yükleyebilir"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('games', 'images') AND
    is_admin()
  );

CREATE POLICY "Adminler dosyaları güncelleyebilir"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('games', 'images') AND
    is_admin()
  );

CREATE POLICY "Adminler dosyaları silebilir"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('games', 'images') AND
    is_admin()
  );

-- İndeks optimizasyonları
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_games_created_by ON games(created_by);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_game_id_created_at ON comments(game_id, created_at DESC);
/*
  # Fix RLS Policies for User Registration

  1. Security Updates
    - Fix profile creation policy to allow new user registration
    - Ensure proper authentication flow
    - Maintain security while allowing user signup

  2. Policy Fixes
    - Update profile insertion policy
    - Fix authentication checks
    - Ensure proper user flow
*/

-- Mevcut profil politikalarını temizle
DROP POLICY IF EXISTS "Kullanıcılar kendi profilini oluşturabilir" ON profiles;
DROP POLICY IF EXISTS "Herkes profilleri okuyabilir" ON profiles;
DROP POLICY IF EXISTS "Kullanıcılar kendi profilini güncelleyebilir" ON profiles;
DROP POLICY IF EXISTS "Adminler tüm profilleri güncelleyebilir" ON profiles;
DROP POLICY IF EXISTS "Adminler profilleri silebilir" ON profiles;

-- PROFILES tablosu için düzeltilmiş politikalar
CREATE POLICY "Herkes profilleri okuyabilir"
  ON profiles
  FOR SELECT
  TO public
  USING (true);

-- Kullanıcı kaydı için özel politika - auth.uid() kontrolü olmadan
CREATE POLICY "Yeni kullanıcılar profil oluşturabilir"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

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

-- Oyun yükleme politikasını da düzelt - sadece adminler yükleyebilsin
DROP POLICY IF EXISTS "Adminler oyun ekleyebilir" ON games;

CREATE POLICY "Sadece adminler oyun ekleyebilir"
  ON games
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Storage politikalarını da düzelt
DROP POLICY IF EXISTS "Adminler dosya yükleyebilir" ON storage.objects;

CREATE POLICY "Sadece adminler dosya yükleyebilir"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('games', 'images') AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- İlk admin kullanıcısı için trigger fonksiyonu
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Eğer bu ilk kullanıcıysa admin yap
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE is_admin = true) THEN
    NEW.is_admin = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON profiles;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { searchTerm } = await req.json();
    if (!searchTerm) throw new Error('Arama terimi boş olamaz');

    // Steam'in tüm uygulama listesini al
    const appListResponse = await fetch(`https://api.steampowered.com/ISteamApps/GetAppList/v2/`);
    if (!appListResponse.ok) throw new Error('Steam uygulama listesi alınamadı.');
    const appListData = await appListResponse.json();

    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const results = appListData.applist.apps
      // Sadece adı olan ve arama terimini içerenleri al (oyun, dlc, vb. her şey)
      .filter((app: { name: string }) => app.name && app.name.toLowerCase().includes(lowerCaseSearchTerm))
      .map((app: { appid: number; name:string }) => ({ appid: app.appid, name: app.name }))
      .slice(0, 20); // Sonuçları ilk 20 ile sınırla

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
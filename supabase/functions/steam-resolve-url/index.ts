import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json();
    if (!url) throw new Error('URL gereklidir');

    // Regex ile URL'den appid'yi çıkar
    const match = url.match(/store\.steampowered\.com\/app\/(\d+)/);
    if (!match || !match[1]) {
      throw new Error('Geçersiz Steam uygulama URLsi');
    }
    const appId = match[1];

    // Detayları çek
    const detailsResponse = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=tr&l=turkish`);
    if (!detailsResponse.ok) throw new Error('Detaylar alınamadı');
    const detailsData = await detailsResponse.json();

    const gameDetails = detailsData[appId];

    if (!gameDetails || gameDetails.success === false) {
      return new Response(JSON.stringify({ success: false, message: 'Oyun mağazada bulunamadı.' }), { status: 404 });
    }

    // Gerekli bilgileri formatla
    const result = {
      success: true,
      appid: gameDetails.data.steam_appid,
      title: gameDetails.data.name,
      description: gameDetails.data.short_description,
      imageUrl: gameDetails.data.header_image,
      category: gameDetails.data.genres?.[0]?.description || 'Action',
    };

    return new Response(JSON.stringify(result), {
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
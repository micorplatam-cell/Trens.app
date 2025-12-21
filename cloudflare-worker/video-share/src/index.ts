// =============================================================================
// TRENS VIDEO SHARE WORKER
// Sirve páginas de video con Open Graph para compartir en redes sociales
// =============================================================================

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ENVIRONMENT: string;
}

interface VideoData {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  video_url: string;
  hls_url?: string;
  duration?: number;
  views?: number;
  user_name?: string;
  user_avatar?: string;
  exercise_name?: string;
  weight_kg?: number;
  reps?: number;
  created_at: string;
}

// =============================================================================
// FETCH VIDEO DATA FROM SUPABASE
// =============================================================================
async function fetchVideoData(videoId: string, env: Env): Promise<VideoData | null> {
  try {
    // Intentar primero en user_assets (videos de ejercicios)
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/user_assets?id=eq.${videoId}&select=*,profiles!user_assets_user_id_fkey(display_name,avatar_url)`,
      {
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Supabase error:', await response.text());
      return null;
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      const asset = data[0];
      return {
        id: asset.id,
        title: asset.exercise_name 
          ? `${asset.exercise_name} ${asset.weight_kg ? `${asset.weight_kg}kg` : ''} ${asset.reps ? `x${asset.reps}` : ''}`.trim()
          : 'Entrenamiento TRENS',
        description: asset.notes || 'Video de entrenamiento en TRENS - High-Performance Fitness',
        thumbnail_url: asset.thumbnail_url || 'https://media.trens.app/default-thumb.jpg',
        video_url: asset.media_url || asset.video_url,
        hls_url: asset.hls_url,
        duration: asset.duration,
        views: asset.views || 0,
        user_name: asset.profiles?.display_name || 'Atleta TRENS',
        user_avatar: asset.profiles?.avatar_url,
        exercise_name: asset.exercise_name,
        weight_kg: asset.weight_kg,
        reps: asset.reps,
        created_at: asset.created_at,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching video:', error);
    return null;
  }
}

// =============================================================================
// GENERATE HTML PAGE
// =============================================================================
function generateVideoPage(video: VideoData, videoId: string): string {
  const appStoreUrl = 'https://apps.apple.com/app/trens/id123456789'; // Actualizar con ID real
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.trens.app';
  const deepLink = `trensdev://video/${videoId}`;
  const webUrl = `https://share.trens.app/v/${videoId}`;
  
  // Formatear stats
  const statsText = [
    video.weight_kg ? `${video.weight_kg}kg` : null,
    video.reps ? `${video.reps} reps` : null,
  ].filter(Boolean).join(' × ');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${video.title} | TRENS</title>
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="video.other">
  <meta property="og:url" content="${webUrl}">
  <meta property="og:title" content="${video.title}">
  <meta property="og:description" content="${video.description}">
  <meta property="og:image" content="${video.thumbnail_url}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:video" content="${video.video_url}">
  <meta property="og:video:type" content="video/mp4">
  <meta property="og:video:width" content="1080">
  <meta property="og:video:height" content="1920">
  <meta property="og:site_name" content="TRENS">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="player">
  <meta name="twitter:site" content="@trensapp">
  <meta name="twitter:title" content="${video.title}">
  <meta name="twitter:description" content="${video.description}">
  <meta name="twitter:image" content="${video.thumbnail_url}">
  <meta name="twitter:player" content="${webUrl}?embed=1">
  <meta name="twitter:player:width" content="480">
  <meta name="twitter:player:height" content="854">
  
  <!-- App Links -->
  <meta property="al:ios:url" content="${deepLink}">
  <meta property="al:ios:app_store_id" content="123456789">
  <meta property="al:ios:app_name" content="TRENS">
  <meta property="al:android:url" content="${deepLink}">
  <meta property="al:android:package" content="com.trens.app">
  <meta property="al:android:app_name" content="TRENS">
  <meta property="al:web:url" content="${webUrl}">
  
  <!-- Smart App Banner (iOS) -->
  <meta name="apple-itunes-app" content="app-id=123456789, app-argument=${deepLink}">
  
  <!-- Theme -->
  <meta name="theme-color" content="#000000">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    :root {
      --savage-red: #DC2626;
      --savage-red-dark: #B91C1C;
      --black: #000000;
      --zinc-900: #18181B;
      --zinc-800: #27272A;
      --zinc-700: #3F3F46;
      --zinc-600: #52525B;
      --zinc-500: #71717A;
      --zinc-400: #A1A1AA;
      --white: #FFFFFF;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--black);
      color: var(--white);
      min-height: 100vh;
      min-height: -webkit-fill-available;
      overflow-x: hidden;
    }
    
    .container {
      max-width: 480px;
      margin: 0 auto;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      background: linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%);
    }
    
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 900;
      font-size: 20px;
      letter-spacing: -0.5px;
    }
    
    .logo-icon {
      width: 32px;
      height: 32px;
      background: var(--savage-red);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 18px;
    }
    
    .get-app-btn {
      background: var(--savage-red);
      color: var(--white);
      border: none;
      padding: 10px 20px;
      border-radius: 24px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
    }
    
    .get-app-btn:hover {
      background: var(--savage-red-dark);
      transform: scale(1.02);
    }
    
    /* Video Section */
    .video-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 80px 0 0;
    }
    
    .video-container {
      position: relative;
      width: 100%;
      aspect-ratio: 9/16;
      max-height: 70vh;
      background: var(--zinc-900);
      border-radius: 0;
      overflow: hidden;
    }
    
    .video-player {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .video-poster {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .play-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.3);
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .play-overlay:hover {
      background: rgba(0,0,0,0.4);
    }
    
    .play-button {
      width: 80px;
      height: 80px;
      background: rgba(255,255,255,0.95);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      transition: transform 0.2s;
    }
    
    .play-overlay:hover .play-button {
      transform: scale(1.1);
    }
    
    .play-icon {
      width: 0;
      height: 0;
      border-left: 28px solid var(--savage-red);
      border-top: 16px solid transparent;
      border-bottom: 16px solid transparent;
      margin-left: 6px;
    }
    
    /* Video Info */
    .video-info {
      padding: 20px;
    }
    
    .user-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--zinc-800);
      border: 2px solid var(--savage-red);
      object-fit: cover;
    }
    
    .avatar-placeholder {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--savage-red) 0%, var(--savage-red-dark) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 18px;
      border: 2px solid var(--savage-red);
    }
    
    .user-info {
      flex: 1;
    }
    
    .user-name {
      font-weight: 700;
      font-size: 16px;
    }
    
    .video-date {
      color: var(--zinc-500);
      font-size: 13px;
    }
    
    .video-title {
      font-weight: 800;
      font-size: 22px;
      margin-bottom: 8px;
      line-height: 1.2;
    }
    
    .video-stats {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }
    
    .stat {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--zinc-400);
      font-size: 14px;
    }
    
    .stat-value {
      color: var(--white);
      font-weight: 700;
    }
    
    .exercise-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--savage-red);
      color: var(--white);
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 14px;
    }
    
    /* CTA Section */
    .cta-section {
      padding: 20px;
      padding-bottom: max(20px, env(safe-area-inset-bottom));
      background: linear-gradient(to top, var(--black) 0%, rgba(0,0,0,0.95) 50%, transparent 100%);
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
    }
    
    .cta-container {
      max-width: 480px;
      margin: 0 auto;
    }
    
    .cta-button {
      width: 100%;
      background: var(--savage-red);
      color: var(--white);
      border: none;
      padding: 18px 24px;
      border-radius: 16px;
      font-weight: 800;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      text-decoration: none;
      transition: all 0.2s;
      box-shadow: 0 4px 20px rgba(220, 38, 38, 0.4);
    }
    
    .cta-button:hover {
      background: var(--savage-red-dark);
      transform: translateY(-2px);
      box-shadow: 0 6px 28px rgba(220, 38, 38, 0.5);
    }
    
    .cta-icon {
      font-size: 20px;
    }
    
    .store-buttons {
      display: flex;
      gap: 12px;
      margin-top: 12px;
    }
    
    .store-btn {
      flex: 1;
      background: var(--zinc-800);
      border: 1px solid var(--zinc-700);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--white);
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.2s;
    }
    
    .store-btn:hover {
      background: var(--zinc-700);
      border-color: var(--zinc-600);
    }
    
    .store-icon {
      font-size: 18px;
    }
    
    /* Footer spacing for fixed CTA */
    .footer-spacer {
      height: 160px;
    }
    
    /* Animations */
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    
    .loading {
      animation: pulse 1.5s infinite;
    }
    
    /* Hide video controls on mobile */
    video::-webkit-media-controls {
      display: none !important;
    }
    
    video::-webkit-media-controls-enclosure {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <div class="logo">
        <div class="logo-icon">T</div>
        <span>TRENS</span>
      </div>
      <a href="${deepLink}" class="get-app-btn" id="headerCta">Abrir App</a>
    </header>
    
    <!-- Video Section -->
    <main class="video-section">
      <div class="video-container" id="videoContainer">
        <img 
          src="${video.thumbnail_url}" 
          alt="${video.title}" 
          class="video-poster" 
          id="videoPoster"
        >
        <video 
          id="videoPlayer"
          class="video-player"
          poster="${video.thumbnail_url}"
          playsinline
          webkit-playsinline
          preload="metadata"
          style="display: none;"
        >
          ${video.hls_url ? `<source src="${video.hls_url}" type="application/x-mpegURL">` : ''}
          <source src="${video.video_url}" type="video/mp4">
        </video>
        <div class="play-overlay" id="playOverlay">
          <div class="play-button">
            <div class="play-icon"></div>
          </div>
        </div>
      </div>
      
      <!-- Video Info -->
      <div class="video-info">
        <div class="user-row">
          ${video.user_avatar 
            ? `<img src="${video.user_avatar}" alt="${video.user_name}" class="avatar">`
            : `<div class="avatar-placeholder">${(video.user_name || 'A')[0].toUpperCase()}</div>`
          }
          <div class="user-info">
            <div class="user-name">${video.user_name}</div>
            <div class="video-date">${formatDate(video.created_at)}</div>
          </div>
        </div>
        
        <h1 class="video-title">${video.title}</h1>
        
        ${statsText ? `
        <div class="exercise-badge">
          🏋️ ${statsText}
        </div>
        ` : ''}
        
        ${video.views ? `
        <div class="video-stats">
          <div class="stat">
            <span>👁️</span>
            <span class="stat-value">${formatNumber(video.views)}</span>
            <span>visualizaciones</span>
          </div>
        </div>
        ` : ''}
      </div>
      
      <div class="footer-spacer"></div>
    </main>
    
    <!-- CTA Section -->
    <div class="cta-section">
      <div class="cta-container">
        <a href="${deepLink}" class="cta-button" id="mainCta">
          <span class="cta-icon">🔥</span>
          <span>Ver en TRENS</span>
        </a>
        <div class="store-buttons">
          <a href="${appStoreUrl}" class="store-btn">
            <span class="store-icon">🍎</span>
            <span>App Store</span>
          </a>
          <a href="${playStoreUrl}" class="store-btn">
            <span class="store-icon">🤖</span>
            <span>Google Play</span>
          </a>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    // Video player logic
    const videoContainer = document.getElementById('videoContainer');
    const videoPlayer = document.getElementById('videoPlayer');
    const videoPoster = document.getElementById('videoPoster');
    const playOverlay = document.getElementById('playOverlay');
    const mainCta = document.getElementById('mainCta');
    const headerCta = document.getElementById('headerCta');
    
    let isPlaying = false;
    
    function playVideo() {
      videoPoster.style.display = 'none';
      videoPlayer.style.display = 'block';
      playOverlay.style.display = 'none';
      videoPlayer.play();
      isPlaying = true;
    }
    
    function pauseVideo() {
      playOverlay.style.display = 'flex';
      videoPlayer.pause();
      isPlaying = false;
    }
    
    playOverlay.addEventListener('click', playVideo);
    
    videoPlayer.addEventListener('ended', () => {
      playOverlay.style.display = 'flex';
      isPlaying = false;
    });
    
    videoPlayer.addEventListener('click', () => {
      if (isPlaying) {
        pauseVideo();
      }
    });
    
    // Deep link handling
    const deepLink = '${deepLink}';
    
    function tryOpenApp() {
      // Try to open the app
      window.location.href = deepLink;
      
      // Fallback to store after delay
      setTimeout(() => {
        // If still here, app probably isn't installed
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          window.location.href = '${appStoreUrl}';
        } else {
          window.location.href = '${playStoreUrl}';
        }
      }, 2500);
    }
    
    // Check if coming from social media (probably doesn't have app)
    const referrer = document.referrer.toLowerCase();
    const isSocialReferrer = referrer.includes('facebook') || 
                             referrer.includes('twitter') || 
                             referrer.includes('instagram') ||
                             referrer.includes('tiktok') ||
                             referrer.includes('whatsapp');
    
    // Auto-try deep link on mobile if not from social
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && !isSocialReferrer) {
      // Commented out for now - let user click
      // tryOpenApp();
    }
  </script>
</body>
</html>`;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
  if (days < 365) return `Hace ${Math.floor(days / 30)} meses`;
  return `Hace ${Math.floor(days / 365)} años`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// =============================================================================
// 404 PAGE
// =============================================================================
function generate404Page(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Video no encontrado | TRENS</title>
  <meta name="theme-color" content="#000000">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: #000;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 20px;
    }
    .container { max-width: 400px; }
    .icon { font-size: 80px; margin-bottom: 24px; }
    h1 { font-size: 28px; font-weight: 900; margin-bottom: 12px; }
    p { color: #71717A; margin-bottom: 32px; line-height: 1.5; }
    .btn {
      display: inline-block;
      background: #DC2626;
      color: #fff;
      padding: 16px 32px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 700;
      transition: all 0.2s;
    }
    .btn:hover { background: #B91C1C; transform: scale(1.02); }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🎬</div>
    <h1>Video no encontrado</h1>
    <p>Este video puede haber sido eliminado, configurado como privado, o el enlace es incorrecto.</p>
    <a href="https://trens.app" class="btn">Ir a TRENS</a>
  </div>
</body>
</html>`;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Health check
    if (path === '/health' || path === '/') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        service: 'TRENS Video Share',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Video page: /v/:videoId
    const videoMatch = path.match(/^\/v\/([a-zA-Z0-9-]+)$/);
    if (videoMatch) {
      const videoId = videoMatch[1];
      
      // Fetch video data
      const video = await fetchVideoData(videoId, env);
      
      if (!video) {
        return new Response(generate404Page(), {
          status: 404,
          headers: { 'Content-Type': 'text/html;charset=UTF-8' },
        });
      }

      // Check if embed mode (for Twitter player)
      if (url.searchParams.get('embed') === '1') {
        // Return just the video for embedding
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              * { margin: 0; padding: 0; }
              body { background: #000; }
              video { width: 100%; height: 100vh; object-fit: contain; }
            </style>
          </head>
          <body>
            <video autoplay muted playsinline loop>
              <source src="${video.video_url}" type="video/mp4">
            </video>
          </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html;charset=UTF-8' },
        });
      }

      // Return full video page
      return new Response(generateVideoPage(video, videoId), {
        headers: { 
          'Content-Type': 'text/html;charset=UTF-8',
          'Cache-Control': 'public, max-age=300', // Cache 5 min
        },
      });
    }

    // 404 for unknown routes
    return new Response(generate404Page(), {
      status: 404,
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  },
};

// Runs in the MAIN world — has access to YouTube's JS context (ytInitialPlayerResponse, ytcfg, etc.)
// Communicates with content.js (ISOLATED world) via window.postMessage

window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data?.type === 'TLDW_REQUEST_CAPTIONS') {
    try {
      let tracks = null;

      // Try ytInitialPlayerResponse (available on page load)
      if (window.ytInitialPlayerResponse) {
        tracks = window.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      }

      // Try the movie_player element
      if (!tracks) {
        const player = document.querySelector('#movie_player');
        if (player && player.getPlayerResponse) {
          const resp = player.getPlayerResponse();
          tracks = resp?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        }
      }

      if (tracks && tracks.length > 0) {
        window.postMessage({ type: 'TLDW_CAPTION_TRACKS', tracks }, '*');
      } else {
        window.postMessage({ type: 'TLDW_CAPTION_TRACKS', error: 'No caption tracks found in page context' }, '*');
      }
    } catch (e) {
      window.postMessage({ type: 'TLDW_CAPTION_TRACKS', error: e.message }, '*');
    }
  }

  if (event.data?.type === 'TLDW_REQUEST_YTCFG') {
    const key = event.data.key;
    const val = (window.ytcfg && window.ytcfg.get) ? window.ytcfg.get(key) : null;
    window.postMessage({ type: 'TLDW_YTCFG_VALUE', key, value: val }, '*');
  }
});

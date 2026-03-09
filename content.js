// Content script for YouTube transcript extraction

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVideoInfo') {
    sendResponse(getVideoInfo());
  } else if (request.action === 'getTranscript') {
    getTranscript()
      .then(transcript => sendResponse({ transcript }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep message channel open for async response
  }
});

// Get video info from page
function getVideoInfo() {
  try {
    const title = document.querySelector('h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata yt-formatted-string')?.textContent ||
                  document.querySelector('meta[name="title"]')?.content ||
                  document.title.replace(' - YouTube', '');

    const channel = document.querySelector('#channel-name a, #owner #text a, ytd-channel-name yt-formatted-string a')?.textContent ||
                    document.querySelector('meta[itemprop="author"]')?.content ||
                    '';

    return { title: title.trim(), channel: channel.trim() };
  } catch (error) {
    console.error('Error getting video info:', error);
    return { title: '', channel: '' };
  }
}

// Get transcript from YouTube
async function getTranscript() {
  const videoId = getVideoId();

  if (!videoId) {
    throw new Error('Could not find video ID');
  }

  // Try Innertube API first (most reliable), then fall back to page scraping
  let transcript = null;

  try {
    transcript = await fetchViaInnertubeAPI(videoId);
  } catch (e) {
    console.warn('Innertube API failed, trying page extraction:', e.message);
  }

  if (!transcript) {
    try {
      transcript = await getTranscriptFromPage();
    } catch (e) {
      console.warn('Page extraction failed:', e.message);
    }
  }

  if (!transcript || transcript.length === 0) {
    throw new Error('No transcript available for this video. The video may not have captions enabled.');
  }

  return transcript;
}

function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// Primary method: Use YouTube's Innertube API (same-origin from content script)
async function fetchViaInnertubeAPI(videoId) {
  const response = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20250301.00.00'
        }
      },
      videoId: videoId
    })
  });

  if (!response.ok) {
    throw new Error(`Innertube API returned ${response.status}`);
  }

  const data = await response.json();
  const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!tracks || tracks.length === 0) {
    throw new Error('No caption tracks found');
  }

  // Prefer English captions, fall back to first available
  const track = tracks.find(t => t.languageCode === 'en') ||
                tracks.find(t => t.languageCode?.startsWith('en')) ||
                tracks[0];

  // Fetch the caption track - use JSON format for more reliable parsing
  const captionUrl = track.baseUrl + '&fmt=json3';
  const captionResponse = await fetch(captionUrl);

  if (!captionResponse.ok) {
    // Fall back to XML format
    return await fetchCaptionTrackXML(track.baseUrl);
  }

  const captionData = await captionResponse.json();
  return parseCaptionJSON3(captionData);
}

// Parse JSON3 caption format
function parseCaptionJSON3(data) {
  const texts = [];

  if (data.events) {
    for (const event of data.events) {
      if (event.segs) {
        const segmentText = event.segs
          .map(seg => seg.utf8)
          .filter(text => text && text.trim() !== '\n')
          .join('');

        if (segmentText.trim()) {
          texts.push(segmentText.trim());
        }
      }
    }
  }

  return texts.join(' ');
}

// Fallback: Parse XML caption format
async function fetchCaptionTrackXML(baseUrl) {
  const response = await fetch(baseUrl);
  const xml = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const textElements = doc.querySelectorAll('text');

  const texts = [];
  textElements.forEach(el => {
    let text = el.textContent;
    text = text.replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, "'")
               .replace(/\n/g, ' ');
    texts.push(text.trim());
  });

  return texts.join(' ');
}

// Fallback method: Extract transcript from YouTube's DOM
async function getTranscriptFromPage() {
  try {
    let transcriptItems = document.querySelectorAll('ytd-transcript-segment-renderer');

    if (transcriptItems.length === 0) {
      // Try to open transcript panel
      const moreActionsButton = document.querySelector('button[aria-label="More actions"]');
      if (moreActionsButton) {
        moreActionsButton.click();
        await sleep(500);

        const menuItems = document.querySelectorAll('tp-yt-paper-listbox ytd-menu-service-item-renderer');
        for (const item of menuItems) {
          if (item.textContent.toLowerCase().includes('transcript')) {
            item.click();
            await sleep(1000);
            break;
          }
        }

        transcriptItems = document.querySelectorAll('ytd-transcript-segment-renderer');
      }
    }

    if (transcriptItems.length > 0) {
      const texts = [];
      transcriptItems.forEach(item => {
        const text = item.querySelector('.segment-text, yt-formatted-string')?.textContent?.trim();
        if (text) {
          texts.push(text);
        }
      });

      if (texts.length > 0) {
        return texts.join(' ');
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting transcript from page:', error);
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Log that content script is loaded
console.log('TLDW content script loaded');

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
  
  // Try to get transcript from YouTube's transcript feature
  const transcript = await fetchYouTubeTranscript(videoId);
  
  if (!transcript || transcript.length === 0) {
    throw new Error('No transcript available for this video. The video may not have captions enabled.');
  }
  
  return transcript;
}

function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// Fetch transcript using YouTube's internal API
async function fetchYouTubeTranscript(videoId) {
  try {
    // First, try to get the transcript from the page
    const transcriptFromPage = await getTranscriptFromPage();
    if (transcriptFromPage) {
      return transcriptFromPage;
    }
    
    // If not available from page, try fetching from timedtext API
    return await fetchFromTimedTextAPI(videoId);
  } catch (error) {
    console.error('Error fetching transcript:', error);
    throw error;
  }
}

// Try to get transcript by clicking the transcript button
async function getTranscriptFromPage() {
  try {
    // Check if transcript panel is already open
    let transcriptItems = document.querySelectorAll('ytd-transcript-segment-renderer');
    
    if (transcriptItems.length === 0) {
      // Try to open transcript panel
      const moreActionsButton = document.querySelector('button[aria-label="More actions"]');
      if (moreActionsButton) {
        moreActionsButton.click();
        await sleep(500);
        
        // Find and click "Show transcript" option
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
        const text = item.querySelector('.segment-text')?.textContent?.trim();
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

// Fetch transcript from YouTube's timedtext API
async function fetchFromTimedTextAPI(videoId) {
  try {
    // Get the video page to extract caption tracks
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();
    
    // Extract caption tracks from the page
    const captionTracksMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
    
    if (!captionTracksMatch) {
      // Try alternative method using ytInitialPlayerResponse
      const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
      if (playerResponseMatch) {
        try {
          const playerResponse = JSON.parse(playerResponseMatch[1]);
          const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          
          if (captions && captions.length > 0) {
            // Prefer English captions, fall back to first available
            const track = captions.find(t => t.languageCode === 'en') || captions[0];
            return await fetchCaptionTrack(track.baseUrl);
          }
        } catch (e) {
          console.error('Error parsing player response:', e);
        }
      }
      
      throw new Error('No captions available for this video');
    }
    
    const captionTracks = JSON.parse(captionTracksMatch[1]);
    
    if (captionTracks.length === 0) {
      throw new Error('No captions available for this video');
    }
    
    // Prefer English captions
    const track = captionTracks.find(t => t.languageCode === 'en') || captionTracks[0];
    
    return await fetchCaptionTrack(track.baseUrl);
  } catch (error) {
    console.error('Error fetching from timedtext API:', error);
    throw error;
  }
}

async function fetchCaptionTrack(baseUrl) {
  const response = await fetch(baseUrl);
  const xml = await response.text();
  
  // Parse XML transcript
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const textElements = doc.querySelectorAll('text');
  
  const texts = [];
  textElements.forEach(el => {
    let text = el.textContent;
    // Decode HTML entities
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Log that content script is loaded
console.log('TLDW content script loaded');


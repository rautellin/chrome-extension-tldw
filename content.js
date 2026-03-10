// Content script for YouTube transcript extraction

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[TLDW]', ...args);
}
function logError(...args) {
  console.error('[TLDW]', ...args);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVideoInfo') {
    sendResponse(getVideoInfo());
  } else if (request.action === 'getTranscript') {
    getTranscript()
      .then(transcript => sendResponse({ transcript }))
      .catch(error => sendResponse({ error: error.message }));
    return true;
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
    logError('Error getting video info:', error);
    return { title: '', channel: '' };
  }
}

// Get transcript from YouTube
async function getTranscript() {
  const videoId = getVideoId();
  log('Video ID:', videoId);

  if (!videoId) {
    throw new Error('Could not find video ID');
  }

  let transcript = null;

  // Method 1: Re-fetch the watch page HTML and parse ytInitialPlayerResponse
  try {
    log('--- Trying HTML parsing method ---');
    transcript = await fetchViaHTMLParsing(videoId);
    log('HTML parsing result:', transcript ? `${transcript.length} chars` : 'null/empty');
  } catch (e) {
    logError('HTML parsing failed:', e.message, e);
  }

  // Method 2: DOM scraping (if transcript panel is open)
  if (!transcript) {
    try {
      log('--- Trying page DOM extraction ---');
      transcript = await getTranscriptFromPage();
      log('Page extraction result:', transcript ? `${transcript.length} chars` : 'null/empty');
    } catch (e) {
      logError('Page extraction failed:', e.message, e);
    }
  }

  if (!transcript || transcript.length === 0) {
    throw new Error('No transcript available for this video. The video may not have captions enabled.');
  }

  log('Final transcript length:', transcript.length);
  return transcript;
}

function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// Method 1: Fetch the watch page HTML and extract ytInitialPlayerResponse
async function fetchViaHTMLParsing(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  log('Fetching page HTML for:', url);

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status}`);
  }

  const html = await response.text();
  log('Page HTML length:', html.length);

  // Extract ytInitialPlayerResponse from the HTML
  const playerResponseMatch = html.match(/var ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
  if (!playerResponseMatch) {
    // Try alternative pattern
    const altMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
    if (!altMatch) {
      throw new Error('Could not find ytInitialPlayerResponse in page HTML');
    }
    return extractCaptionsFromPlayerResponse(altMatch[1]);
  }

  return extractCaptionsFromPlayerResponse(playerResponseMatch[1]);
}

function extractCaptionsFromPlayerResponse(jsonString) {
  // The JSON might be cut off by the greedy regex, so we need to parse carefully
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    // Try to find the correct end of the JSON by counting braces
    log('Direct JSON parse failed, trying brace-counting approach');
    data = parseJsonFromString(jsonString);
  }

  log('Player response playability:', data.playabilityStatus?.status);

  const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!tracks || tracks.length === 0) {
    throw new Error(`No caption tracks found. Playability: ${data.playabilityStatus?.status}`);
  }

  log('Found caption tracks:', tracks.length);
  log('Tracks:', JSON.stringify(tracks.map(t => ({ lang: t.languageCode, name: t.name?.simpleText, kind: t.kind }))));

  const track = tracks.find(t => t.languageCode === 'en' && t.kind !== 'asr') ||
                tracks.find(t => t.languageCode === 'en') ||
                tracks.find(t => t.languageCode?.startsWith('en')) ||
                tracks[0];

  if (!track?.baseUrl) {
    throw new Error('No usable caption track found');
  }

  log('Selected track:', track.languageCode, track.kind || '');
  return fetchCaptionTrack(track.baseUrl);
}

// Safely parse JSON that might have trailing content
function parseJsonFromString(str) {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{' || ch === '[') depth++;
    if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) {
        return JSON.parse(str.substring(0, i + 1));
      }
    }
  }

  throw new Error('Could not find valid JSON object');
}

// Fetch caption track content (JSON3 preferred, XML fallback)
async function fetchCaptionTrack(baseUrl) {
  const json3Url = baseUrl + '&fmt=json3';
  log('Fetching captions (JSON3):', json3Url.substring(0, 200));

  try {
    const response = await fetch(json3Url);
    log('JSON3 response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      log('JSON3 events count:', data.events?.length);
      const result = parseCaptionJSON3(data);
      if (result) return result;
    }
  } catch (e) {
    log('JSON3 parsing failed, trying XML:', e.message);
  }

  return await fetchCaptionTrackXML(baseUrl);
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

  log('Parsed', texts.length, 'text segments from JSON3');
  return texts.length > 0 ? texts.join(' ') : null;
}

// Fallback: Parse XML caption format
async function fetchCaptionTrackXML(baseUrl) {
  log('Fetching XML captions from:', baseUrl.substring(0, 200));
  const response = await fetch(baseUrl);
  const xml = await response.text();
  log('XML response length:', xml.length);

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const textElements = doc.querySelectorAll('text');
  log('Found', textElements.length, 'text elements in XML');

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

// Method 2: Extract transcript from YouTube's DOM
async function getTranscriptFromPage() {
  try {
    let transcriptItems = document.querySelectorAll('ytd-transcript-segment-renderer');
    log('Transcript items already on page:', transcriptItems.length);

    if (transcriptItems.length === 0) {
      const moreActionsButton = document.querySelector('button[aria-label="More actions"]');
      log('More actions button found:', !!moreActionsButton);

      if (moreActionsButton) {
        moreActionsButton.click();
        await sleep(500);

        const menuItems = document.querySelectorAll('tp-yt-paper-listbox ytd-menu-service-item-renderer');
        log('Menu items found:', menuItems.length);
        menuItems.forEach((item, i) => log(`  Menu item ${i}:`, item.textContent.trim()));

        for (const item of menuItems) {
          if (item.textContent.toLowerCase().includes('transcript')) {
            log('Clicking transcript menu item');
            item.click();
            await sleep(1000);
            break;
          }
        }

        transcriptItems = document.querySelectorAll('ytd-transcript-segment-renderer');
        log('Transcript items after opening panel:', transcriptItems.length);
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

      log('Extracted', texts.length, 'text segments from DOM');
      if (texts.length > 0) {
        return texts.join(' ');
      }
    }

    return null;
  } catch (error) {
    logError('Error getting transcript from page:', error);
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

log('Content script loaded');

# ⚡ TLDW - YouTube Video Summarizer

A Chrome extension that generates instant TLDR summaries of YouTube videos using OpenAI's GPT API.

## Features

- 🎥 Works on any YouTube video with captions/transcripts
- 🤖 Uses OpenAI's GPT-4o-mini for intelligent summarization
- ⚡ Fast and efficient transcript extraction
- 🎨 Beautiful, modern dark UI
- 📋 One-click copy to clipboard
- ⚙️ Customizable summary length (brief, standard, detailed)

## Installation

### 1. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right corner)
3. Click **Load unpacked**
4. Select the `chrome-extension-tldw` folder
5. The extension icon (⚡) will appear in your toolbar

### 2. Pin the Extension (Recommended)

1. Click the puzzle piece icon (Extensions) in the Chrome toolbar
2. Find "TLDW - YouTube Summarizer"
3. Click the pin icon to keep it visible in your toolbar

### 3. Add Your OpenAI API Key

1. Click on the TLDW extension icon
2. Enter your OpenAI API key when prompted
3. Click "Save & Continue"

**Don't have an API key?** Get one at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

## Usage

1. Navigate to any YouTube video
2. Click the TLDW extension icon
3. Click **"Generate Summary"**
4. Wait a few seconds for the AI to analyze the transcript
5. Read your summary or copy it to clipboard!

## Settings

Access settings by clicking the gear icon in the extension popup:

- **API Key**: Update or change your OpenAI API key
- **Summary Length**: Choose between:
  - **Brief**: 2-3 sentences
  - **Standard**: 1 paragraph (default)
  - **Detailed**: Multiple paragraphs with bullet points

## Requirements

- Google Chrome browser (version 88+)
- OpenAI API key with credits
- YouTube videos must have captions/transcripts enabled

## Troubleshooting

### "No transcript available"
- The video doesn't have captions enabled
- Try a different video with CC (closed captions)

### "Invalid API key"
- Double-check your API key starts with `sk-`
- Ensure your OpenAI account has available credits
- Generate a new API key if needed

### Extension not working on YouTube
- Make sure you're on a video page (URL contains `/watch?v=`)
- Try refreshing the YouTube page
- Reload the extension from `chrome://extensions/`

## Privacy

- Your API key is stored locally in Chrome's storage
- Transcripts are sent directly to OpenAI for processing
- No data is collected or stored by the extension

## Files Structure

```
chrome-extension-tldw/
├── manifest.json      # Extension configuration
├── popup.html         # Extension popup UI
├── popup.css          # Popup styles
├── popup.js           # Popup logic
├── content.js         # YouTube page interaction
├── background.js      # Service worker
├── icons/
│   ├── icon16.png     # 16x16 icon
│   ├── icon48.png     # 48x48 icon
│   └── icon128.png    # 128x128 icon
└── README.md          # This file
```

## Development

To modify the extension:

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the TLDW extension card
4. Test your changes

### Viewing Logs

- **Popup logs**: Right-click popup → Inspect → Console
- **Content script logs**: Open YouTube → F12 → Console
- **Background logs**: Extensions page → "Service worker" link

## License

MIT License - Feel free to modify and distribute!

---

Made with ❤️ for people who want the TLDR


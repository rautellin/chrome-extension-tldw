from flask import Flask, jsonify, request
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi

app = Flask(__name__)
CORS(app)
api = YouTubeTranscriptApi()

@app.route('/transcript')
def get_transcript():
    video_id = request.args.get('v')
    if not video_id:
        return jsonify({'error': 'Missing video ID parameter "v"'}), 400

    try:
        transcript = api.fetch(video_id, languages=['en'])
        text = ' '.join(snippet.text for snippet in transcript)
        return jsonify({'transcript': text})
    except Exception as e:
        try:
            transcript_list = api.list(video_id)
            transcript = transcript_list.find_generated_transcript(['en']).fetch()
            text = ' '.join(snippet.text for snippet in transcript)
            return jsonify({'transcript': text})
        except Exception:
            return jsonify({'error': str(e)}), 404

if __name__ == '__main__':
    print('TLDW transcript server running on http://localhost:5055')
    app.run(port=5055)

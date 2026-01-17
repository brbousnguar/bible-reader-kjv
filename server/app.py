from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import os, base64, requests, io

app = Flask(__name__)
CORS(app)

def escape_xml(unsafe):
    return (unsafe.replace('&', '&amp;')
                  .replace('<', '&lt;')
                  .replace('>', '&gt;')
                  .replace('"', '&quot;')
                  .replace("'", '&apos;'))

@app.route('/tts', methods=['POST'])
def tts():
    body = request.get_json() or {}
    text = body.get('text')
    provider = body.get('provider')
    voice = body.get('voice')
    rate = float(body.get('rate', 1.0))
    pitch = float(body.get('pitch', 1.0))

    if not text or not provider:
        return jsonify({'error':'missing text or provider'}), 400

    try:
        if provider == 'google':
            api_key = os.environ.get('GOOGLE_API_KEY')
            if not api_key:
                return jsonify({'error':'Google API key not configured (GOOGLE_API_KEY)'}), 500
            req = {
                'input': {'text': text},
                'voice': {'languageCode': 'en-US', 'name': voice or 'en-US-Wavenet-D'},
                'audioConfig': {'audioEncoding': 'MP3', 'speakingRate': rate, 'pitch': (pitch-1.0)*2}
            }
            r = requests.post(f'https://texttospeech.googleapis.com/v1/text:synthesize?key={api_key}', json=req)
            j = r.json()
            if not j or 'audioContent' not in j:
                return jsonify({'error':'google tts failed', 'detail': j}), 500
            audio = base64.b64decode(j['audioContent'])
            return send_file(io.BytesIO(audio), mimetype='audio/mpeg')

        elif provider == 'azure':
            key = os.environ.get('AZURE_KEY')
            region = os.environ.get('AZURE_REGION')
            if not key or not region:
                return jsonify({'error':'Azure credentials not configured (AZURE_KEY + AZURE_REGION)'}), 500
            ssml = """<?xml version='1.0' encoding='utf-8'?><speak version='1.0' xml:lang='en-US'><voice name='{}'><prosody rate='{}%'>{}</prosody></voice></speak>""".format(
                voice or 'en-US-GuyNeural', int((rate-1.0)*50), escape_xml(text)
            )
            headers = {
                'Ocp-Apim-Subscription-Key': key,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
            }
            r = requests.post(f'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1', headers=headers, data=ssml)
            if not r.ok:
                return jsonify({'error':'azure tts failed', 'status': r.status_code, 'text': r.text}), 500
            return send_file(io.BytesIO(r.content), mimetype='audio/mpeg')

        else:
            return jsonify({'error':'unknown provider'}), 400

    except Exception as e:
        return jsonify({'error':'tts proxy error', 'detail': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port)

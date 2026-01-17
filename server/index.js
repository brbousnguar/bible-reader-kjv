import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

// POST /tts
// body: { text, provider, voice, rate, pitch }
// Returns: audio/mpeg (binary) or 500

app.post('/tts', async (req, res) => {
  const { text, provider, voice, rate, pitch } = req.body || {};
  if(!text || !provider) return res.status(400).json({ error: 'missing text or provider' });

  try{
    if(provider === 'google'){
      const apiKey = process.env.GOOGLE_API_KEY;
      if(!apiKey) return res.status(500).json({ error: 'Google API key not configured (GOOGLE_API_KEY)' });
      const body = {
        input: { text },
        voice: { languageCode: 'en-US', name: voice || 'en-US-Wavenet-D' },
        audioConfig: { audioEncoding: 'MP3', speakingRate: rate || 1.0, pitch: ((pitch||1.0)-1.0)*2 }
      };
      const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const j = await r.json();
      if(!j || !j.audioContent) return res.status(500).json({ error: 'google tts failed', detail:j });
      const buffer = Buffer.from(j.audioContent, 'base64');
      res.set('Content-Type','audio/mpeg');
      return res.send(buffer);
    }

    if(provider === 'azure'){
      const key = process.env.AZURE_KEY;
      const region = process.env.AZURE_REGION;
      if(!key || !region) return res.status(500).json({ error: 'Azure credentials not configured (AZURE_KEY + AZURE_REGION)' });
      // Use REST Speech Synthesis API
      const ssml = `<?xml version='1.0' encoding='utf-8'?><speak version='1.0' xml:lang='en-US'><voice name='${voice || 'en-US-GuyNeural'}'><prosody rate='${((rate||1.0)-1.0)*50}%'>${escapeXml(text)}</prosody></voice></speak>`;
      const r = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST', headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
        }, body: ssml
      });
      if(!r.ok) return res.status(500).json({ error: 'azure tts failed', status:r.status });
      const buffer = await r.arrayBuffer();
      res.set('Content-Type','audio/mpeg');
      return res.send(Buffer.from(buffer));
    }

    if(provider === 'aws'){
      // For AWS Polly, recommend using AWS SDK on server with credentials; here return 501 with instructions
      return res.status(501).json({ error: 'AWS Polly not implemented in this proxy. Please add server-side AWS SDK integration.' });
    }

    return res.status(400).json({ error: 'unknown provider' });
  }catch(err){
    console.error('TTS proxy error', err);
    return res.status(500).json({ error: 'tts proxy error', detail: String(err) });
  }
});

function escapeXml(unsafe){ return unsafe.replace(/[<>&'\"]/g, (c)=> ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":"&apos;"})[c]); }

const port = process.env.PORT || 3000;
app.listen(port, ()=> console.log(`TTS proxy listening on ${port}`));

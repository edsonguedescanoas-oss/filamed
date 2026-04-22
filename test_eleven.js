
const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = "XrExE9yKIg1WjnnlVkGX"; // Matilda

async function test() {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: "Teste de voz.",
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed: 1.0
      }
    }),
  });

  console.log("Status:", res.status);
  if (!res.ok) {
    console.log("Error body:", await res.text());
  } else {
    console.log("Success! Received audio buffer of size:", (await res.arrayBuffer()).byteLength);
  }
}

test();

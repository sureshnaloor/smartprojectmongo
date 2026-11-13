const TTS_URL = "https://tts.us.assemblyai.com/v1/speech";

/** Kyla is AssemblyAI's default English woman's voice for voice agents. */
const VOICE_ID = "aai-kyla";

export async function speakWithKyla(text: string): Promise<Buffer> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY?.trim();
  if (!apiKey) throw new Error("ASSEMBLYAI_API_KEY is not configured");
  const spoken = text.trim().slice(0, 600);
  if (!spoken) throw new Error("Nothing to say");

  const response = await fetch(TTS_URL, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: spoken,
      voice_id: VOICE_ID,
      language: "english",
      container: "wav",
      stream: false,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(detail || `Voice agent failed (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

import { Surah, Reciter, TranslationEdition, AyahData } from '../types';

const BASE_URL = 'https://api.alquran.cloud/v1';

export async function getSurahs(): Promise<Surah[]> {
  const res = await fetch(`${BASE_URL}/surah`);
  const data = await res.json();
  return data.data;
}

export async function getReciters(): Promise<Reciter[]> {
  const res = await fetch(`${BASE_URL}/edition?format=audio&language=ar&type=versebyverse`);
  const data = await res.json();
  // Filter for high quality / common reciters if needed, returning all for now
  return data.data;
}

export async function getTranslations(): Promise<TranslationEdition[]> {
  const res = await fetch(`${BASE_URL}/edition?format=text&type=translation`);
  const data = await res.json();
  return data.data;
}

export async function getAyahsData(
  surah: number,
  start: number,
  end: number,
  reciterId: string,
  translationId: string | null
): Promise<AyahData[]> {
  // We need to fetch:
  // 1. Text (Uthmani)
  // 2. Audio (Reciter)
  // 3. Translation (optional)

  // Determine editions to fetch
  const editions = ['quran-uthmani', reciterId];
  if (translationId) editions.push(translationId);

  const res = await fetch(`${BASE_URL}/surah/${surah}/editions/${editions.join(',')}`);
  const data = await res.json();

  if (!data.data || data.data.length < 2) {
      throw new Error("Could not fetch required data");
  }

  const uthmaniData = data.data[0];
  const audioData = data.data[1];
  const translationData = translationId ? data.data[2] : null;

  const result: AyahData[] = [];

  // Filter within start and end ayah
  for (let i = start - 1; i < end && i < uthmaniData.ayahs.length; i++) {
    result.push({
      numberInSurah: uthmaniData.ayahs[i].numberInSurah,
      text: uthmaniData.ayahs[i].text,
      audioUrl: audioData.ayahs[i].audioSecondary?.[0] || audioData.ayahs[i].audio, // Prefer secondary if primary fails, but primary is usually fine
      translationText: translationData ? translationData.ayahs[i].text : undefined
    });
  }

  return result;
}

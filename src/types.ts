export interface Surah {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
}

export interface Reciter {
  identifier: string;
  language: string;
  name: string;
  englishName: string;
  format: string;
  type: string;
}

export interface TranslationEdition {
  identifier: string;
  language: string;
  name: string;
  englishName: string;
}

export interface AyahData {
  numberInSurah: number;
  text: string;
  audioUrl: string;
  translationText?: string;
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '21:9';
export type VideoResolution = 'SD' | 'HD' | 'FHD' | '4K';
export type VideoFPS = 24 | 30 | 60 | 120;
export type AnimationStyle = 'fade' | 'slideUp' | 'zoom' | 'blur';

export interface BackgroundProps {
  type: 'image' | 'video' | 'color';
  url: string;
}

export interface WordTimestamp {
  word: string;
  timestamp: number;
}

export interface TimelineItem {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'quran';
  url: string; // text content or media URL
  startTime: number; // in seconds
  duration: number; // in seconds
  trackId: string;
  // Visual properties (0-100 for percentages/base values)
  x: number; 
  y: number;
  width: number;
  height: number;
  opacity: number;
  zIndex: number;
  rotation: number;
  scale: number;
  // Metadata
  isSystem?: boolean; // For auto-generated items like Quran text
}

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text';
  isVisible: boolean;
  isLocked: boolean;
}

export interface VideoSettings {
  aspectRatio: AspectRatio;
  borderRadius: number;
  backgrounds: BackgroundProps[];
  backgroundOpacity: number;
  wordsPerScreen: number;
  surahNumber: number;
  startAyah: number;
  endAyah: number;
  reciterId: string;
  customAudioUrl: string | null;
  customAudioTimestamps: number[];
  customWordTimestamps: WordTimestamp[];
  translationId: string | null;
  
  // Advanced Text Styling
  fontFamily: 'cairo' | 'quran' | 'custom';
  customFontUrl: string | null;
  fontSize: number;
  textColor: string;
  textOpacity: number;
  textShadowColor: string;
  textShadowBlur: number;
  glassEffect: 'none' | 'frame' | 'text';
  textAnimation: AnimationStyle;

  resolution: VideoResolution;
  fps: VideoFPS;

  // AI Options
  aiMode: 'cloud' | 'local';
  aiModelPower: number;
  
  // Editor State
  tracks: Track[];
  items: TimelineItem[];
  duration: number; // total duration
}


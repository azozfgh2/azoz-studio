import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import PreviewCanvas from './components/PreviewCanvas';
import Timeline from './components/Timeline';
import { VideoSettings, Surah, Reciter, TranslationEdition, AyahData } from './types';
import { getSurahs, getReciters, getTranslations, getAyahsData } from './lib/api';
import { Sun, Moon, Download } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'editor' | 'library'>('editor');
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [translations, setTranslations] = useState<TranslationEdition[]>([]);
  
  const [ayahsToPlay, setAyahsToPlay] = useState<AyahData[]>([]);
  const [isLoadingAyahs, setIsLoadingAyahs] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // App initialization state
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const canvasRef = useRef<{ exportVideo: () => void }>(null);

  // Main video settings state
  const [settings, setSettings] = useState<VideoSettings>({
    aspectRatio: '9:16',
    backgrounds: [{
      type: 'image',
      url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80'
    }],
    backgroundOpacity: 60,
    wordsPerScreen: 0,
    surahNumber: 1, // Al-Fatiha
    startAyah: 1,
    endAyah: 7,
    reciterId: 'ar.alafasy', // Default to Mishary
    customAudioUrl: null,
    customAudioTimestamps: [],
    customWordTimestamps: [],
    translationId: null, // No translation by default
    fontFamily: 'quran',
    customFontUrl: null,
    fontSize: 40,
    textColor: '#ffffff',
    textOpacity: 100,
    textShadowColor: '#000000',
    textShadowBlur: 10,
    glassEffect: 'none',
    textAnimation: 'slideUp',
    resolution: 'FHD',
    fps: 30,
    borderRadius: 16,
    aiMode: 'cloud',
    aiModelPower: 50,
    tracks: [
      { id: 'bg-track', name: 'الخلفية', type: 'video', isVisible: true, isLocked: false },
      { id: 'overlay-track', name: 'التراكبات', type: 'video', isVisible: true, isLocked: false },
      { id: 'quran-track', name: 'القرآن الكريم', type: 'text', isVisible: true, isLocked: false },
      { id: 'audio-track', name: 'الصوت', type: 'audio', isVisible: true, isLocked: false }
    ],
    items: [],
    duration: 30
  });

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Update total duration as items change
  useEffect(() => {
    const maxTime = Math.max(
      ...settings.items.map(i => i.startTime + i.duration),
      settings.duration || 60
    );
    if (maxTime !== settings.duration) {
      setSettings(prev => ({ ...prev, duration: maxTime }));
    }
  }, [settings.items]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Inject custom font globally if selected
  useEffect(() => {
    if (settings.customFontUrl) {
      const newStyle = document.createElement('style');
      newStyle.id = 'custom-font-style';
      newStyle.appendChild(document.createTextNode(`
        @font-face {
          font-family: 'CustomFont';
          src: url('${settings.customFontUrl}');
        }
      `));
      
      const existing = document.getElementById('custom-font-style');
      if (existing) {
        document.head.removeChild(existing);
      }
      document.head.appendChild(newStyle);
    }
  }, [settings.customFontUrl]);

  // Fetch initial metadata
  useEffect(() => {
    async function loadData() {
      try {
        const [surahData, reciterData, translationData] = await Promise.all([
          getSurahs(),
          getReciters(),
          getTranslations()
        ]);
        
        setSurahs(surahData);
        // Sort some known popular reciters to the top if we wanted to
        setReciters(reciterData.filter(r => r.identifier !== 'ar.quran-uthmani')); // exclude text editions that might be marked as audio
        
        // Filter out non-popular translations or just sort
        setTranslations(translationData);
      } catch (error) {
        console.error("Failed to load metadata:", error);
        setInitError(error instanceof Error ? error.message : String(error));
      } finally {
        setIsInitializing(false);
      }
    }
    loadData();
  }, []);

  // Fetch ayahs when settings change
  useEffect(() => {
    // Basic validation
    if (settings.startAyah < 1 || settings.endAyah < settings.startAyah) return;
    if (isInitializing || initError) return;

    let isMounted = true;
    
    async function fetchPlayData() {
      setIsLoadingAyahs(true);
      try {
        const data = await getAyahsData(
          settings.surahNumber,
          settings.startAyah,
          settings.endAyah,
          settings.reciterId,
          settings.translationId
        );
        if (isMounted) {
          setAyahsToPlay(data);
        }
      } catch (error) {
        console.error("Failed to fetch ayahs data:", error);
        // Reset or show error
        if (isMounted) setAyahsToPlay([]);
      } finally {
        if (isMounted) setIsLoadingAyahs(false);
      }
    }

    // Debounce the fetch slightly to avoid spamming the API while typing numbers
    const timeoutId = setTimeout(() => {
      fetchPlayData();
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [settings.surahNumber, settings.startAyah, settings.endAyah, settings.reciterId, settings.translationId, isInitializing, initError]);

  if (isInitializing) {
    return (
      <div className="w-full h-screen flex items-center justify-center font-bold text-2xl app-bg-light">
        <div className="animate-pulse flex items-center gap-4">
          <div className="flex items-center justify-center text-primary">
             <div className="text-4xl font-black tracking-tighter" style={{ fontFamily: 'Cairo, sans-serif' }}>عزوز</div>
          </div>
          <span className="text-primary tracking-tighter">جاري تهيئة الاستوديو...</span>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center font-bold text-2xl app-bg-light text-red-500 gap-4 p-8 text-center">
        <span>حدث خطأ في الاتصال بالخادم. يرجى التأكد من اتصال الإنترنت أو إيقاف مانع الإعلانات.</span>
        <span className="text-sm font-normal font-mono text-gray-500 max-w-2xl">{initError}</span>
        <button className="px-6 py-2 bg-primary text-black text-sm rounded-lg hover:bg-primary/80 transition-colors" onClick={() => window.location.reload()}>إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <>
      <div className="app-bg-light"></div>
      <div className="flex flex-col h-screen w-full overflow-hidden text-gray-900 dark:text-gray-200 font-sans selection:bg-primary/30 z-10 relative">
        {/* Header Navigation */}
        <header className="h-16 glass-header flex items-center justify-between px-6 shrink-0 relative z-20">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center text-primary drop-shadow-md bg-white/50 dark:bg-black/50 px-3 py-1.5 rounded-lg border border-black/5 dark:border-white/5">
               <div className="text-2xl font-black tracking-tighter" style={{ fontFamily: 'Cairo, sans-serif' }}>عزوز</div>
               <span className="text-xs font-bold tracking-widest text-gray-500 mr-2 mt-1 uppercase opacity-80">ستوديو</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="w-10 h-10 flex items-center justify-center rounded-full glass-surface text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary !rounded-full transition-all hover:scale-105"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="flex bg-black/5 dark:bg-white/5 rounded-xl p-1 shadow-inner border border-black/5 dark:border-white/5 relative">
              <div className="absolute inset-y-1 w-1/2 bg-white dark:bg-[#3f3f46] rounded-lg shadow-sm border border-black/5 dark:border-white/5 transition-transform duration-300 ease-in-out z-0" style={{ transform: currentView === 'library' ? 'translateX(-100%)' : 'translateX(0)' }}></div>
              
              <button className={`relative z-10 px-6 py-2 text-xs font-bold rounded-lg transition-colors duration-300 ${currentView === 'editor' ? 'text-primary dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`} onClick={() => setCurrentView('editor')}>المحرر</button>
              <button className={`relative z-10 px-6 py-2 text-xs font-bold rounded-lg transition-colors duration-300 ${currentView === 'library' ? 'text-primary dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`} onClick={() => setCurrentView('library')}>المكتبة</button>
            </div>
            <button 
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-black text-xs font-black rounded-xl hover:bg-primary-dark transition-all shadow-[0_4px_16px_rgba(197,160,89,0.3)] hover:shadow-[0_6px_24px_rgba(197,160,89,0.5)] transform hover:-translate-y-0.5" 
              onClick={() => canvasRef.current?.exportVideo()}
            >
              <Download size={16} />
              تصدير الفيديو
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden">
          {currentView === 'editor' ? (
            <>
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                <Sidebar 
                  settings={settings} 
                  setSettings={setSettings} 
                  surahs={surahs}
                  reciters={reciters}
                  translations={translations.filter(t => ['en', 'ur', 'fr', 'es', 'id'].includes(t.language))}
                  selectedItemId={selectedItemId}
                  setSelectedItemId={setSelectedItemId}
                />
                <main className="flex-1 overflow-y-auto relative z-0">
                  <div className="absolute inset-0 bg-black/5 dark:bg-white/5 pointer-events-none mix-blend-overlay"></div>
                  <div className="min-h-full flex flex-col p-4 lg:p-8 items-center justify-center relative z-10">
                    <div className="w-full shrink-0 flex items-center justify-center">
                      <PreviewCanvas 
                         ref={canvasRef}
                         settings={settings}
                         ayahs={ayahsToPlay}
                         isLoading={isLoadingAyahs}
                         currentTime={currentTime}
                         setCurrentTime={setCurrentTime}
                         isPlaying={isPlaying}
                         setIsPlaying={setIsPlaying}
                      />
                    </div>
                  </div>
                </main>
              </div>
              <Timeline 
                  settings={settings} 
                  setSettings={setSettings} 
                  currentTime={currentTime}
                  onTimeChange={setCurrentTime} 
                  isPlaying={isPlaying} 
                  onTogglePlay={() => setIsPlaying(!isPlaying)}
                  duration={settings.duration}
                  selectedItemId={selectedItemId}
                  setSelectedItemId={setSelectedItemId}
              />
            </>
          ) : (
             <main className="flex-1 overflow-y-auto p-4 lg:p-8 relative z-0 w-full bg-black/5 dark:bg-black/20">
               <div className="max-w-5xl mx-auto glass p-8 rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl">
                   <h2 className="text-3xl font-black mb-4 font-cairo">مكتبة المشاريع</h2>
                   <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed">سيتم حفظ الفيديوهات السابقة التي قمت بإنشائها والإعدادات الخاصة بها هنا، لتتمكن من التعديل عليها أو إعادة تصديرها لاحقاً. (سيتم توفير هذه الميزة قريباً)</p>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
                       <div className="aspect-[9/16] bg-black/5 dark:bg-white/5 rounded-2xl border-2 border-dashed border-black/10 dark:border-white/10 flex flex-col items-center justify-center text-sm text-gray-500 gap-4">
                          <Download size={32} className="opacity-20" />
                          <span>تطبيق المعاينة 1</span>
                       </div>
                       <div className="aspect-[9/16] bg-black/5 dark:bg-white/5 rounded-2xl border-2 border-dashed border-black/10 dark:border-white/10 flex flex-col items-center justify-center text-sm text-gray-400 gap-4 opacity-50">
                          <span>تطبيق المعاينة 2</span>
                       </div>
                       <div className="aspect-[9/16] bg-black/5 dark:bg-white/5 rounded-2xl border-2 border-dashed border-black/10 dark:border-white/10 flex flex-col items-center justify-center text-sm text-gray-400 gap-4 opacity-30">
                          <span>تطبيق المعاينة 3</span>
                       </div>
                   </div>
               </div>
             </main>
          )}
        </div>
      </div>
    </>
  );
}

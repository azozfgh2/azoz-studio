import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { VideoSettings, AyahData } from '../types';
import { Play, Pause, Download, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toPng } from 'html-to-image';

interface PreviewCanvasProps {
  settings: VideoSettings;
  ayahs: AyahData[];
  isLoading: boolean;
}

const PreviewCanvas = forwardRef<{ exportVideo: () => void }, PreviewCanvasProps>(({ settings, ayahs, isLoading }, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const exportVideoLogic = async () => {
    try {
      // @ts-ignore
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true,
        preferCurrentTab: true,
      });
      
      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
       ? 'video/webm; codecs=vp9'
       : MediaRecorder.isTypeSupported('video/webm')
       ? 'video/webm'
       : 'video/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        a.download = `quran-video-${settings.surahNumber}-${settings.startAyah}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      alert("بدأ التسجيل! قم بتشغيل المقطع للبدء.\nأوقف مشاركة الشاشة من المتصفح عند الانتهاء ليتم تحميل الفيديو تلقائياً.");
    } catch (err) {
      console.error("Export failed", err);
      alert("تعذر تسجيل الشاشة. قد يكون المتصفح لا يدعم هذه الميزة أو تم الإلغاء.");
    }
  };

  useImperativeHandle(ref, () => ({
    exportVideo: exportVideoLogic
  }));

  // Aspect Ratio Dimensions calculation
  const getContainerStyles = (): React.CSSProperties => {
    const base = { borderRadius: `${settings.borderRadius}px` };
    switch (settings.aspectRatio) {
      case '9:16': return { ...base, width: '100%', maxWidth: '360px', aspectRatio: '9/16' };
      case '16:9': return { ...base, width: '100%', maxWidth: '640px', aspectRatio: '16/9' };
      case '1:1': return { ...base, width: '100%', maxWidth: '500px', aspectRatio: '1/1' };
      case '4:3': return { ...base, width: '100%', maxWidth: '640px', aspectRatio: '4/3' };
      case '3:4': return { ...base, width: '100%', maxWidth: '480px', aspectRatio: '3/4' };
      case '21:9': return { ...base, width: '100%', maxWidth: '640px', aspectRatio: '21/9' };
      default: return { ...base, width: '100%', maxWidth: '360px', aspectRatio: '9/16' };
    }
  };

  const getAnimationProps = () => {
    switch (settings.textAnimation) {
      case 'fade': return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
      case 'slideUp': return { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } };
      case 'zoom': return { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.1 } };
      case 'blur': return { initial: { opacity: 0, filter: 'blur(10px)' }, animate: { opacity: 1, filter: 'blur(0px)' }, exit: { opacity: 0, filter: 'blur(10px)' } };
      default: return { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } };
    }
  };

  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Reset playback if ayahs change
  useEffect(() => {
    setIsPlaying(false);
    setCurrentAyahIndex(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, [ayahs, settings.reciterId, settings.customAudioUrl]);

  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying && ayahs.length > 0) {
      if (settings.reciterId === 'custom') {
        const audioUrlToPlay = settings.customAudioUrl || '';
        if (audioUrlToPlay && audioRef.current.src !== audioUrlToPlay && !audioRef.current.src.includes(audioUrlToPlay)) {
          audioRef.current.src = audioUrlToPlay;
        }
        if (audioRef.current.paused) {
          playPromiseRef.current = audioRef.current.play();
          playPromiseRef.current?.catch(e => {
            if (e.name !== 'AbortError') setIsPlaying(false);
          });
        }
      } else {
        const audioUrlToPlay = currentAyahIndex < ayahs.length ? ayahs[currentAyahIndex].audioUrl : '';
        if (audioUrlToPlay && audioRef.current.src !== audioUrlToPlay) {
          audioRef.current.src = audioUrlToPlay;
        }
        if (audioRef.current.paused) {
          playPromiseRef.current = audioRef.current.play();
          playPromiseRef.current?.catch(e => {
            if (e.name !== 'AbortError') setIsPlaying(false);
          });
        }
      }
    } else {
      if (!audioRef.current.paused) {
         if (playPromiseRef.current) {
           playPromiseRef.current.then(() => audioRef.current?.pause()).catch(() => {});
         } else {
           audioRef.current.pause();
         }
      }
    }
  }, [isPlaying, currentAyahIndex, ayahs, settings.reciterId, settings.customAudioUrl]);

  const handleAudioEnded = () => {
    if (settings.reciterId === 'custom') {
        // entire audio ended
        setIsPlaying(false);
        setCurrentAyahIndex(0);
        return;
    }

    if (currentAyahIndex < ayahs.length - 1) {
      setCurrentAyahIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
      setCurrentAyahIndex(0); // Reset to start
    }
  };

  const handleTimeUpdate = () => {
    if (settings.reciterId !== 'custom') return;
    if (!audioRef.current) return;
    
    const currentTime = audioRef.current.currentTime;
    const timestamps = settings.customAudioTimestamps;
    
    if (timestamps && timestamps.length > 0) {
        let newIndex = 0;
        for (let i = timestamps.length - 1; i >= 0; i--) {
            if (currentTime >= timestamps[i]) {
                newIndex = i;
                break;
            }
        }
        if (newIndex !== currentAyahIndex && newIndex < ayahs.length) {
            setCurrentAyahIndex(newIndex);
        }
    }
  };

  const togglePlay = () => {
    if (ayahs.length === 0) return;
    if (settings.reciterId === 'custom' && !settings.customAudioUrl) {
       alert("الرجاء رفع ملف صوتي أولاً لتفعيل ميزة التزامن.");
       return;
    }
    setIsPlaying(!isPlaying);
  };

  const currentAyah = ayahs[currentAyahIndex];

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
      <div className="mb-4 flex items-center justify-between w-full">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight drop-shadow-sm">المعاينة <span className="text-gray-500 dark:text-white/40 font-light text-sm">(Preview)</span></h2>
        <div className="flex gap-2">
            <button 
                onClick={togglePlay}
                disabled={isLoading || ayahs.length === 0}
                className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white dark:text-black px-4 py-2 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                {isPlaying ? 'إيقاف' : 'تشغيل'}
            </button>
            <button 
                className="flex items-center gap-2 glass-btn px-4 py-2 rounded-lg font-bold transition-colors text-xs"
                onClick={exportVideoLogic}
                title="تصدير كفيديو"
                >
                <Download size={14} />
                تصدير
            </button>
        </div>
      </div>

      <div 
        ref={captureRef}
        className={`relative bg-black shadow-2xl transition-all duration-300 flex items-center justify-center overflow-hidden border border-black/10 dark:border-white/10 ${
          settings.glassEffect === 'frame'
            ? 'glass'
            : ''
        }`}
        style={getContainerStyles()}
      >
        {/* Background Layer */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {settings.background.type === 'color' && (
            <div className="w-full h-full" style={{ backgroundColor: settings.background.url }} />
          )}
          {settings.background.type === 'image' && (
             <img crossOrigin="anonymous" src={settings.background.url} alt="bg" className="w-full h-full object-cover opacity-60" />
          )}
          {settings.background.type === 'video' && (
            <video crossOrigin="anonymous" src={settings.background.url} autoPlay loop muted className="w-full h-full object-cover opacity-60" />
          )}
          {/* Overlay to ensure text readability */}
          <div className="absolute inset-0 bg-black/40 mix-blend-multiply" />
        </div>

        {/* Content Layer */}
        <div className="relative z-10 p-8 flex flex-col items-center justify-center h-full w-full text-center drop-shadow-lg">
          {isLoading ? (
            <div className="animate-pulse text-primary font-bold">جاري تحميل البيانات...</div>
          ) : ayahs.length === 0 ? (
            <div className="text-white/40 font-bold">اختر سورة وآيات للبدء</div>
          ) : currentAyah ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentAyahIndex}
                {...getAnimationProps()}
                transition={{ duration: 0.5 }}
                className={`flex flex-col gap-6 w-full ${
                  settings.glassEffect === 'text'
                    ? 'glass p-6 rounded-2xl shadow-2xl' 
                    : ''
                }`}
              >
                <p 
                  className={`text-white leading-relaxed ${settings.fontFamily === 'quran' ? 'font-quran' : settings.fontFamily === 'cairo' ? 'font-cairo' : ''}`}
                  style={{ 
                    fontFamily: settings.fontFamily === 'custom' ? 'CustomFont, sans-serif' : undefined,
                    fontSize: `${settings.fontSize}px`, 
                    color: `color-mix(in srgb, ${settings.textColor} ${settings.textOpacity}%, transparent)`, 
                    textShadow: `0 0 ${settings.textShadowBlur}px ${settings.textShadowColor}` 
                  }}
                  dir="rtl"
                >
                  {currentAyah.text}
                  <span className="inline-block mx-2 text-[0.8em] whitespace-nowrap" dir="rtl" style={{ color: `color-mix(in srgb, ${settings.textColor} ${settings.textOpacity}%, transparent)`, textShadow: `0 0 ${settings.textShadowBlur}px ${settings.textShadowColor}`, fontFamily: settings.fontFamily === 'quran' ? undefined : '"Amiri Quran", serif' }}>
                    ﴿{currentAyah.numberInSurah.toLocaleString('ar-EG')}﴾
                  </span>
                </p>

                {currentAyah.translationText && (
                  <p 
                    className="mt-2 leading-relaxed font-cairo"
                    style={{ color: `color-mix(in srgb, ${settings.textColor} ${settings.textOpacity * 0.8}%, transparent)`, fontSize: `${settings.fontSize * 0.6}px`, textShadow: `0 0 ${settings.textShadowBlur}px ${settings.textShadowColor}` }}
                    dir="ltr"
                  >
                    {currentAyah.translationText}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          ) : null}
        </div>
      </div>

       {/* Hidden Audio Player */}
       <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onTimeUpdate={handleTimeUpdate}
        className="hidden"
      />
    </div>
  );
});

export default PreviewCanvas;

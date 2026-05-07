import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { VideoSettings, AyahData } from '../types';
import { Play, Pause, Download, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { wrapText } from './exportUtils';

interface PreviewCanvasProps {
  settings: VideoSettings;
  ayahs: AyahData[];
  isLoading: boolean;
}

const PreviewCanvas = forwardRef<{ exportVideo: () => void }, PreviewCanvasProps>(({ settings, ayahs, isLoading }, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [activeBgIndex, setActiveBgIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const exportVideoLogic = async () => {
    if (ayahs.length === 0) {
       alert('الرجاء اختيار السورة والآيات أولاً.');
       return;
    }
    
    // Create and resume AudioContext immediately synchronously or on first await cycle 
    // to bypass browser user-gesture restrictions restrictions.
    let audioCtx: AudioContext | null = null;
    let dest: MediaStreamAudioDestinationNode | null = null;
    const exportAudio = new Audio();
    try {
       audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
       await audioCtx.resume();
       dest = audioCtx.createMediaStreamDestination();
       const sourceNode = audioCtx.createMediaElementSource(exportAudio);
       sourceNode.connect(audioCtx.destination); // For preview during export
       sourceNode.connect(dest); // For media recorder
    } catch (e) {
       console.warn("Could not capture audio natively", e);
    }
    
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      await document.fonts.ready;
      if (!captureRef.current || !audioRef.current) throw new Error("Missing refs");

      const width = document.body.clientWidth > 720 ? 720 : 480;
      let height = (width * 16) / 9;
      if (settings.aspectRatio === '16:9') height = (width * 9) / 16;
      if (settings.aspectRatio === '1:1') height = width;
      if (settings.aspectRatio === '4:3') height = (width * 3) / 4;
      if (settings.aspectRatio === '3:4') height = (width * 4) / 3;
      if (settings.aspectRatio === '21:9') height = (width * 9) / 21;

      // Determine pixel ratio for desired resolution
      // Target widths: SD=480, HD=720, FHD=1080, 4K=2160
      let targetResWidth = 720;
      if (settings.resolution === 'SD') targetResWidth = 480;
      if (settings.resolution === 'FHD') targetResWidth = 1080;
      if (settings.resolution === '4K') targetResWidth = 2160;
      
      const pixelRatio = targetResWidth / width;
      const finalWidth = width * pixelRatio;
      const finalHeight = height * pixelRatio;

      const canvas = document.createElement('canvas');
      canvas.width = finalWidth;
      canvas.height = finalHeight;
      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) throw new Error("Canvas not supported");
      
      ctx.clearRect(0, 0, finalWidth, finalHeight);

      // Preload audio files as blob to avoid CORS blocking Web Audio API
      alert("جاري تحضير موارد التصدير (الصوتيات والخلفيات)... يرجى عدم إغلاق النافذة.");
      
      let audioSources: string[] = [];
      const fetchAudioBlobUrl = async (url: string) => {
         try {
             const res = await fetch(url);
             if (!res.ok) throw new Error("Direct fetch failed");
             const blob = await res.blob();
             return URL.createObjectURL(blob);
         } catch {
             try {
                 const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
                 const res = await fetch(proxyUrl);
                 if (!res.ok) throw new Error("Proxy 1 failed");
                 const blob = await res.blob();
                 return URL.createObjectURL(blob);
             } catch {
                 try {
                    const proxyUrl2 = `https://corsproxy.org/?${encodeURIComponent(url)}`;
                    const resProxy = await fetch(proxyUrl2);
                    if (!resProxy.ok) throw new Error("Proxy 2 failed");
                    const blobProxy = await resProxy.blob();
                    return URL.createObjectURL(blobProxy);
                 } catch (e) {
                    return url; // ultimate fallback
                 }
             }
         }
      };

      if (settings.reciterId === 'custom' && settings.customAudioUrl) {
         audioSources.push(settings.customAudioUrl); // custom is already blob or local
      } else {
         for (const ayah of ayahs) {
            audioSources.push(await fetchAudioBlobUrl(ayah.audioUrl));
         }
      }

      const playAudio = async (src: string) => {
          if (src.startsWith('blob:')) {
              exportAudio.crossOrigin = "anonymous";
          } else {
              exportAudio.removeAttribute("crossOrigin");
          }
          exportAudio.src = src;
          
          try {
             await exportAudio.play();
          } catch (err) {
             console.error("Audio play failed in export", err);
             // Fallback: clear src and just pause so recording can still proceed without audio
             exportAudio.removeAttribute("crossOrigin");
             exportAudio.src = src;
             await exportAudio.play().catch(e => console.error("Final audio fallback failed", e));
          }
      };
      
      const fps = settings.fps || 60;
      const stream = canvas.captureStream(fps);
      if (dest) {
         const audioTracks = dest.stream.getAudioTracks();
         if (audioTracks.length > 0) stream.addTrack(audioTracks[0]);
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
       ? 'video/webm; codecs=vp9'
       : MediaRecorder.isTypeSupported('video/webm')
       ? 'video/webm'
       : 'video/mp4';

      let videoBitsPerSecond = 5000000;
      if (settings.resolution === 'SD') videoBitsPerSecond = 2000000;
      if (settings.resolution === 'FHD') videoBitsPerSecond = 8000000;
      if (settings.resolution === '4K') videoBitsPerSecond = 16000000;

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      recorder.onstop = () => {
         const blob = new Blob(chunks, { type: mimeType });
         const url = URL.createObjectURL(blob);
         const a = document.createElement("a");
         a.href = url;
         a.download = `quran-video-${settings.surahNumber}-${settings.startAyah}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         URL.revokeObjectURL(url);
         
         audioSources.forEach(src => {
             if (src.startsWith('blob:')) URL.revokeObjectURL(src);
         });
         
         setIsExporting(false);
         alert("✅ اكتمل التصدير بنجاح!");
      };

      recorder.start();

      let isRecording = true;
      let ayahIdx = 0;

      exportAudio.ontimeupdate = () => {
          if (!isRecording) return;
          if (settings.reciterId === 'custom' && settings.customAudioTimestamps) {
              const currentTime = exportAudio.currentTime;
              const timestamps = settings.customAudioTimestamps;
              if (timestamps && timestamps.length > 0) {
                  let newIndex = 0;
                  for (let i = timestamps.length - 1; i >= 0; i--) {
                      if (currentTime >= timestamps[i]) {
                          newIndex = i;
                          break;
                      }
                  }
                  if (newIndex !== ayahIdx && newIndex < ayahs.length) {
                      ayahIdx = newIndex;
                  }
              }
          }
      };

      setIsPlaying(true);
      setCurrentAyahIndex(0);
      playAudio(audioSources[0] || '');

      exportAudio.onended = () => {
          if (settings.reciterId === 'custom') {
              isRecording = false;
              recorder.stop();
          } else {
              ayahIdx++;
              if (ayahIdx < ayahs.length) {
                  setCurrentAyahIndex(ayahIdx);
                  playAudio(audioSources[ayahIdx]);
              } else {
                  isRecording = false;
                  recorder.stop();
              }
          }
      };

      // Background extraction refs
      const bgImgEl = captureRef.current?.querySelector('img') as HTMLImageElement;
      const bgVideoEl = captureRef.current?.querySelector('video') as HTMLVideoElement;
      
      const drawFrame = async () => {
         if (!isRecording) return;
         
         try {
             ctx.save();
             ctx.clearRect(0, 0, finalWidth, finalHeight);
             if (settings.borderRadius && settings.borderRadius > 0) {
                 ctx.beginPath();
                 ctx.roundRect(0, 0, finalWidth, finalHeight, settings.borderRadius * pixelRatio);
                 ctx.clip();
             }

             // 1. Draw Background
             const bgOpacity = settings.backgroundOpacity !== undefined ? settings.backgroundOpacity / 100 : 0.6;
             if (settings.backgrounds[activeBgIndex]?.type === 'color') {
                 ctx.globalAlpha = bgOpacity;
                 ctx.fillStyle = settings.backgrounds[activeBgIndex].url;
                 ctx.fillRect(0, 0, finalWidth, finalHeight);
                 ctx.globalAlpha = 1.0;
             } else if (settings.backgrounds[activeBgIndex]?.type === 'image' && bgImgEl) {
                 ctx.globalAlpha = bgOpacity;
                 const scale = Math.max(finalWidth / bgImgEl.naturalWidth, finalHeight / bgImgEl.naturalHeight);
                 const w = bgImgEl.naturalWidth * scale;
                 const h = bgImgEl.naturalHeight * scale;
                 const x = (finalWidth - w) / 2;
                 const y = (finalHeight - h) / 2;
                 ctx.drawImage(bgImgEl, x, y, w, h);
                 ctx.globalAlpha = 1.0;
             } else if (settings.backgrounds[activeBgIndex]?.type === 'video' && bgVideoEl) {
                 ctx.globalAlpha = bgOpacity;
                 const scale = Math.max(finalWidth / bgVideoEl.videoWidth, finalHeight / bgVideoEl.videoHeight);
                 const w = bgVideoEl.videoWidth * scale;
                 const h = bgVideoEl.videoHeight * scale;
                 const x = (finalWidth - w) / 2;
                 const y = (finalHeight - h) / 2;
                 ctx.drawImage(bgVideoEl, x, y, w, h);
                 ctx.globalAlpha = 1.0;
             } else {
                 ctx.globalAlpha = 1.0;
                 ctx.fillStyle = '#000';
                 ctx.fillRect(0, 0, finalWidth, finalHeight);
             }
             
             // 2. Draw Overlay
             ctx.globalAlpha = 1;
             ctx.fillStyle = 'rgba(0,0,0,0.4)';
             ctx.fillRect(0, 0, finalWidth, finalHeight);
             
             // 3. Draw Text
             if (ayahIdx < ayahs.length) {
                 const currentAyah = ayahs[ayahIdx];
                 
                 ctx.globalAlpha = settings.textOpacity / 100;
                 ctx.shadowColor = settings.textShadowColor;
                 ctx.shadowBlur = settings.textShadowBlur * pixelRatio * 2;
                 ctx.fillStyle = settings.textColor;
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'middle';
                 
                 // Ayah Text
                 const mainFontSize = Math.round(finalWidth * 0.08 * (settings.fontSize / 32));
                 const fontFamily = settings.fontFamily === 'quran' ? 'Amiri Quran' : settings.fontFamily === 'cairo' ? 'Cairo' : 'sans-serif';
                 
                 ctx.font = `bold ${mainFontSize}px "${fontFamily}", serif`;
                 
                 const textWithNumber = `${currentAyah.text} ﴿${currentAyah.numberInSurah.toLocaleString('ar-EG')}﴾`;
                 wrapText(ctx, textWithNumber, finalWidth / 2, finalHeight / 2 - (finalHeight * 0.05), finalWidth * 0.8, mainFontSize * 1.5);
                 
                 // Translation Text
                 if (settings.showTranslation && currentAyah.translationText) {
                     ctx.globalAlpha = (settings.textOpacity / 100) * 0.8;
                     const transFontSize = finalWidth * 0.04 * (settings.fontSize / 32);
                     ctx.font = `${transFontSize}px "Cairo", Arial, sans-serif`;
                     wrapText(ctx, currentAyah.translationText, finalWidth / 2, finalHeight / 2 + (finalHeight * 0.15), finalWidth * 0.8, transFontSize * 1.5);
                 }
             }

             ctx.globalAlpha = 1;
             ctx.shadowBlur = 0;

         } catch(e) {
             // Ignore frame drop
         }
         
         if (isRecording) {
             const prog = Math.floor((ayahIdx / ayahs.length) * 100);
             setExportProgress(prog);
             ctx.restore();
             
             requestAnimationFrame(drawFrame);
         }
      };
      
      requestAnimationFrame(drawFrame);

    } catch (err) {
      console.error("Export failed", err);
      alert("حدث خطأ أثناء إعداد التصدير. قد تكون دقة الفيديو عالية جداً على متصفحك.");
      setIsExporting(false);
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
          {settings.backgrounds[activeBgIndex]?.type === 'color' && (
            <div className="w-full h-full" style={{ backgroundColor: settings.backgrounds[activeBgIndex].url, opacity: settings.backgroundOpacity / 100 }} />
          )}
          {settings.backgrounds[activeBgIndex]?.type === 'image' && (
             <img src={settings.backgrounds[activeBgIndex].url} alt="bg" className="w-full h-full object-cover" style={{ opacity: settings.backgroundOpacity / 100 }} />
          )}
          {settings.backgrounds[activeBgIndex]?.type === 'video' && (
            <video 
              src={settings.backgrounds[activeBgIndex].url} 
              autoPlay 
              muted 
              onEnded={() => setActiveBgIndex((prev) => (prev + 1) % settings.backgrounds.length)}
              className="w-full h-full object-cover" 
              style={{ opacity: settings.backgroundOpacity / 100 }} 
            />
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

      <AnimatePresence>
        {isExporting && (
          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm glass p-8 rounded-3xl flex flex-col items-center justify-center border border-white/10 shadow-2xl">
              <div className="w-16 h-16 border-4 border-white/20 border-t-primary rounded-full mb-6 animate-spin" />
              <h3 className="text-xl font-bold text-white mb-2 font-cairo">جاري التصدير... ({exportProgress}%)</h3>
              <p className="text-sm text-gray-400 mb-8 text-center leading-relaxed">
                يرجى الانتظار، لا تغلق هذه الصفحة. يتم معالجة الفيديو بجودة عالية!
              </p>
              
              <div className="w-full bg-white/10 rounded-full h-3 mb-2 overflow-hidden shadow-inner flex justify-end">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default PreviewCanvas;

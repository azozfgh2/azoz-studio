import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { VideoSettings, AyahData } from '../types';
import { Play, Pause, Download, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { wrapText } from './exportUtils';

interface PreviewCanvasProps {
  settings: VideoSettings;
  ayahs: AyahData[];
  isLoading: boolean;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

const getDisplayChunk = (text: string, wordsPerScreen: number, currentTime: number, duration: number) => {
    if (wordsPerScreen <= 0) return text;
    const words = text.split(' ');
    if (words.length === 0) return text;
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += wordsPerScreen) {
        chunks.push(words.slice(i, i + wordsPerScreen).join(' '));
    }
    if (chunks.length === 0) return text;
    
    let chunkIndex = Math.floor((currentTime / duration) * chunks.length);
    if (isNaN(chunkIndex) || chunkIndex < 0) chunkIndex = 0;
    if (chunkIndex >= chunks.length) chunkIndex = chunks.length - 1;
    
    return chunks[chunkIndex];
};

const PreviewCanvas = forwardRef<{ exportVideo: () => void }, PreviewCanvasProps>(({ 
  settings, 
  ayahs, 
  isLoading, 
  currentTime, 
  setCurrentTime, 
  isPlaying, 
  setIsPlaying 
}, ref) => {
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [activeBgIndex, setActiveBgIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const imageElementsRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const canvasRefUI = useRef<HTMLCanvasElement>(null);

  // Helper to get or create media element
  const getMediaElement = async (item: any): Promise<HTMLVideoElement | HTMLImageElement | null> => {
    if (item.type === 'video') {
      if (videoElementsRef.current.has(item.url)) return videoElementsRef.current.get(item.url)!;
      const v = document.createElement('video');
      v.src = item.url;
      if (!item.url.startsWith('blob:')) v.crossOrigin = "anonymous";
      v.load();
      videoElementsRef.current.set(item.url, v);
      return new Promise((res) => { 
        v.onloadedmetadata = () => res(v); 
        v.onerror = () => res(v); // Return video anyway, it might play
      });
    } else if (item.type === 'image') {
      if (imageElementsRef.current.has(item.url)) return imageElementsRef.current.get(item.url)!;
      const img = new Image();
      if (!item.url.startsWith('blob:')) img.crossOrigin = "anonymous";
      img.src = item.url;
      imageElementsRef.current.set(item.url, img);
      return new Promise((res) => { img.onload = () => res(img); img.onerror = () => res(null); });
    }
    return null;
  };

  const renderCanvas = async (ctx: CanvasRenderingContext2D, width: number, height: number, time: number, isExport: boolean) => {
    const pixelRatio = isExport ? (width / (canvasRefUI.current?.clientWidth || width)) : 1;
    
    ctx.clearRect(0, 0, width, height);

    // Filter and sort items to draw
    const activeItems = (settings.items || [])
      .filter(item => time >= item.startTime && time <= (item.startTime + item.duration))
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    // 1. Draw Timeline Items
    for (const item of activeItems) {
      ctx.save();
      ctx.globalAlpha = (item.opacity || 100) / 100;
      
      const x = (item.x / 100) * width;
      const y = (item.y / 100) * height;
      const w = (item.width / 100) * width;
      const h = (item.height / 100) * height;

      if (item.type === 'video' || item.type === 'image') {
        const el = await getMediaElement(item);
        if (el) {
          if (item.type === 'video') {
            const v = el as HTMLVideoElement;
            v.currentTime = time - item.startTime;
          }
          ctx.translate(x + w / 2, y + h / 2);
          ctx.rotate((item.rotation || 0) * Math.PI / 180);
          ctx.scale(item.scale || 1, item.scale || 1);
          ctx.drawImage(el, -w / 2, -h / 2, w, h);
        }
      } else if (item.type === 'text') {
        ctx.fillStyle = settings.textColor;
        ctx.font = `${(settings.fontSize / 100) * width}px Cairo`;
        ctx.textAlign = 'center';
        ctx.fillText(item.url, x, y);
      }
      ctx.restore();
    }

    // 2. Draw Legacy Background if no timeline backgrounds
    if (activeItems.filter(i => i.type === 'video' || i.type === 'image').length === 0) {
        // Fallback to settings.backgrounds (compatibility)
        const bg = settings.backgrounds[isExport ? 0 : activeBgIndex]; // Using activeBgIndex
        if (bg) {
          ctx.save();
          ctx.globalAlpha = settings.backgroundOpacity !== undefined ? settings.backgroundOpacity / 100 : 0.6;
          
          if (bg.type === 'color') {
             ctx.fillStyle = bg.url;
             ctx.fillRect(0, 0, width, height);
          } else {
             const el = await getMediaElement({ type: bg.type, url: bg.url });
             if (el) {
                 const elWidth = bg.type === 'video' ? (el as HTMLVideoElement).videoWidth : (el as HTMLImageElement).naturalWidth;
                 const elHeight = bg.type === 'video' ? (el as HTMLVideoElement).videoHeight : (el as HTMLImageElement).naturalHeight;
                 if (elWidth && elHeight) {
                     const scale = Math.max(width / elWidth, height / elHeight);
                     const w = elWidth * scale;
                     const h = elHeight * scale;
                     const x = (width - w) / 2;
                     const y = (height - h) / 2;
                     ctx.drawImage(el, x, y, w, h);
                 } else {
                     ctx.drawImage(el, 0, 0, width, height);
                 }
                 
                 // If it is playing and exporting, maybe scrub video time, but for legacy backgrounds we might just let it play or just use 0 during export if we don't have global sync
             }
          }
          
          ctx.restore();
          
          // Overlay to ensure text readability
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }
    }

    // 3. Draw Quran Overlay (Default UI)
    if (ayahs.length > 0) {
       ctx.save();
       // Find current ayah and current timing info
       let localAyahIdx = currentAyahIndex;
       if (settings.reciterId === 'custom' && settings.customAudioTimestamps) {
          const idx = settings.customAudioTimestamps.findIndex((t, i) => time >= t && (i === settings.customAudioTimestamps.length - 1 || time < settings.customAudioTimestamps[i+1]));
          if (idx !== -1) localAyahIdx = idx;
       }
       
       const ayahToDraw = ayahs[localAyahIdx];
       if (ayahToDraw) {
          const audioDuration = audioRef.current?.duration || 1;
          let ayahDuration = audioDuration;
          let ayahCurrentTime = time;
          
          if (settings.reciterId === 'custom' && settings.customAudioTimestamps) {
              const start = settings.customAudioTimestamps[localAyahIdx] || 0;
              const end = settings.customAudioTimestamps[localAyahIdx + 1] || audioDuration || start + 1;
              ayahDuration = end - start;
              ayahCurrentTime = time - start;
          }

          ctx.fillStyle = settings.textColor;
          ctx.globalAlpha = settings.textOpacity / 100;
          ctx.shadowColor = settings.textShadowColor;
          ctx.shadowBlur = settings.textShadowBlur;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const fontSize = (settings.fontSize / 40) * (width * 0.08);
          const fontFamily = settings.fontFamily === 'quran' ? 'Amiri Quran' : settings.fontFamily === 'cairo' ? 'Cairo' : 'sans-serif';
          ctx.font = `bold ${fontSize}px "${fontFamily}", serif`;
          
          let text = ayahToDraw.text;
          if (settings.wordsPerScreen > 0) {
             text = getDisplayChunk(text, settings.wordsPerScreen, ayahCurrentTime, Math.max(0.1, ayahDuration));
          }
          
          // Add Ayah Number indicator
          const fullText = `${text} ﴿${ayahToDraw.numberInSurah.toLocaleString('ar-EG')}﴾`;
          
          wrapText(ctx, fullText, width / 2, height / 2 - (height * 0.05), width * 0.8, fontSize * 1.5);
          
          // Translation
          if (settings.showTranslation && ayahToDraw.translationText) {
             const transSize = fontSize * 0.5;
             ctx.font = `bold ${transSize}px "Cairo", sans-serif`;
             ctx.globalAlpha = (settings.textOpacity / 100) * 0.8;
             let transText = ayahToDraw.translationText;
             if (settings.wordsPerScreen > 0) {
                 transText = getDisplayChunk(transText, settings.wordsPerScreen * 2, ayahCurrentTime, Math.max(0.1, ayahDuration));
             }
             wrapText(ctx, transText, width / 2, height / 2 + (height * 0.15), width * 0.8, transSize * 1.5);
          }
       }
       ctx.restore();
    }
  };

  useEffect(() => {
    const canvas = canvasRefUI.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    const loop = async () => {
      await renderCanvas(ctx, canvas.width, canvas.height, currentTime, false);
      if (isPlaying) {
         // This is a simple mock, real sync with audio happens in handleTimeUpdate
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [currentTime, settings, ayahs, currentAyahIndex, isPlaying]);

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
      if (!audioRef.current) throw new Error("Missing refs");

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
             await exportAudio.play().catch(e => {
                 console.error("Final audio fallback failed", e);
                 // Simulate audio passing if playback totally fails so export doesn't freeze forever
                 setTimeout(() => {
                     exportAudio.dispatchEvent(new Event('ended'));
                 }, 3000);
             });
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

      let recorder: MediaRecorder;
      try {
          recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond });
      } catch (e1) {
          try {
              recorder = new MediaRecorder(stream, { mimeType });
          } catch (e2) {
              recorder = new MediaRecorder(stream);
          }
      }
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      recorder.onstop = () => {
         const blob = new Blob(chunks, { type: mimeType });
         const url = URL.createObjectURL(blob);
         const a = document.createElement("a");
         a.href = url;
         a.download = `azoz-project-${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
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

      setIsPlaying(true);
      setCurrentAyahIndex(0);
      playAudio(audioSources[0] || '');

      let startGlobalTime = performance.now();
      let lastAudioTime = 0;
      let ayahCumulativeDuration = 0;

      const drawFrame = async () => {
         if (!isRecording) return;
         
         let globalTime = 0;
         if (settings.reciterId === 'custom') {
             globalTime = exportAudio.currentTime || 0;
         } else {
             // For standard sequential ayahs, we approximate global time by keeping track of played time
             if (exportAudio.currentTime < lastAudioTime) {
                 ayahCumulativeDuration += lastAudioTime;
             }
             lastAudioTime = exportAudio.currentTime;
             globalTime = ayahCumulativeDuration + exportAudio.currentTime;
         }

         await renderCanvas(ctx, finalWidth, finalHeight, globalTime, true);
         
         setExportProgress(Math.floor((ayahIdx / ayahs.length) * 100));
         
         requestAnimationFrame(drawFrame);
      };
      
      requestAnimationFrame(drawFrame);

    } catch (err: any) {
      console.error("Export failed", err);
      alert("حدث خطأ أثناء إعداد التصدير:\n" + (err?.message || String(err)) + "\n\nالحل: حاول تقليل الدقة (مثلاً: SD) أو استخدام متصفح يدعم تسجيل الفيديو بشكل كامل.");
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
    if (!audioRef.current) return;
    
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    
    if (settings.reciterId !== 'custom') return;
    const timestamps = settings.customAudioTimestamps;
    
    if (timestamps && timestamps.length > 0) {
        let newIndex = 0;
        for (let i = timestamps.length - 1; i >= 0; i--) {
            if (time >= timestamps[i]) {
                newIndex = i;
                break;
            }
        }
        if (newIndex !== currentAyahIndex && newIndex < ayahs.length) {
            setCurrentAyahIndex(newIndex);
        }
    }
  };

  useEffect(() => {
    if (audioRef.current) {
        // If currentTime changed from outside (Timeline), sync audio
        if (Math.abs(audioRef.current.currentTime - currentTime) > 0.3) {
            audioRef.current.currentTime = currentTime;
        }
    }
  }, [currentTime]);

  const togglePlay = () => {
    if (ayahs.length === 0) return;
    if (settings.reciterId === 'custom' && !settings.customAudioUrl) {
       alert("الرجاء رفع ملف صوتي أولاً لتفعيل ميزة التزامن.");
       return;
    }
    setIsPlaying(!isPlaying);
  };

  const currentAyah = ayahs[currentAyahIndex];
  
  let previewText = currentAyah?.text || '';
  let previewTrans = currentAyah?.translationText || '';
  
  if (settings.wordsPerScreen > 0) {
      const audioDuration = audioRef.current?.duration || 1;
      let ayahDuration = audioDuration;
      let ayahCurrentTime = currentTime;
      if (settings.reciterId === 'custom' && settings.customAudioTimestamps) {
          const start = settings.customAudioTimestamps[currentAyahIndex] || 0;
          const end = settings.customAudioTimestamps[currentAyahIndex + 1] || audioDuration || start + 1;
          ayahDuration = end - start;
          ayahCurrentTime = currentTime - start;
      }
      previewText = getDisplayChunk(previewText, settings.wordsPerScreen, ayahCurrentTime, Math.max(0.1, ayahDuration));
      if (previewTrans) previewTrans = getDisplayChunk(previewTrans, settings.wordsPerScreen * 2, ayahCurrentTime, Math.max(0.1, ayahDuration));
  }

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
        className={`relative bg-black shadow-2xl transition-all duration-300 flex items-center justify-center overflow-hidden border border-black/10 dark:border-white/10 ${
          settings.glassEffect === 'frame'
            ? 'glass'
            : ''
        }`}
        style={getContainerStyles()}
      >
        <canvas 
          ref={canvasRefUI}
          width={settings.aspectRatio === '16:9' ? 1280 : settings.aspectRatio === '9:16' ? 720 : 1080}
          height={settings.aspectRatio === '16:9' ? 720 : settings.aspectRatio === '9:16' ? 1280 : 1080}
          className="w-full h-full object-contain"
        />
        
        {/* Progress Overlay for loading items */}
        {isLoading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
               <div className="animate-pulse text-primary font-bold">جاري تحميل الوسائط...</div>
            </div>
        )}
      </div>

       {/* Hidden Background Videos for state tracking */}
       {settings.backgrounds.map((bg, idx) => (
           bg.type === 'video' ? (
              <video
                key={`bg-${idx}`}
                src={bg.url}
                className="hidden"
                muted
                playsInline
                autoPlay={isPlaying && activeBgIndex === idx}
                onEnded={() => setActiveBgIndex((prev) => (prev + 1) % settings.backgrounds.length)}
              />
           ) : null
       ))}

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

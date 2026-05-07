import React, { useRef, useState, useEffect } from 'react';
import { VideoSettings, TimelineItem, Track } from '../types';
import { Play, Pause, Plus, Image as ImageIcon, Video, Type, Music } from 'lucide-react';

interface TimelineProps {
  settings: VideoSettings;
  setSettings: React.Dispatch<React.SetStateAction<VideoSettings>>;
  currentTime: number;
  onTimeChange: (time: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  duration: number;
}

const pixelsPerSecond = 20;

export default function Timeline({ settings, setSettings, currentTime, onTimeChange, isPlaying, onTogglePlay, duration }: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
     if (!scrollRef.current) return;
     const rect = scrollRef.current.getBoundingClientRect();
     const scrollLeft = scrollRef.current.scrollLeft;
     const x = e.clientX - rect.left + scrollLeft - 100; // 100 is track header width
     if (x < 0) return;
     const newTime = Math.max(0, Math.min(x / pixelsPerSecond, duration));
     onTimeChange(newTime);
  };

  const addTrack = (type: 'video' | 'audio' | 'text') => {
     const newTrack: Track = { id: Date.now().toString(), name: `مسار جديد`, type };
     setSettings(prev => ({ ...prev, tracks: [...(prev.tracks || []), newTrack] }));
  };

  return (
    <div className="h-64 w-full bg-black/10 dark:bg-black/40 border-t border-black/10 dark:border-white/10 flex flex-col user-select-none">
      {/* Toolbar */}
      <div className="h-10 border-b border-black/10 dark:border-white/10 flex items-center px-4 gap-4 bg-white/5 glass-surface">
         <button onClick={onTogglePlay} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded">
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
         </button>
         <div className="text-xs font-mono">{currentTime.toFixed(1)}s / {duration.toFixed(1)}s</div>
         <div className="flex bg-black/10 dark:bg-white/10 rounded-lg p-0.5 ml-auto gap-1">
            <button onClick={() => addTrack('video')} className="px-2 py-1 text-[10px] flex items-center gap-1 hover:bg-white/10 rounded"><Video size={12}/> فيديو/صورة</button>
            <button onClick={() => addTrack('text')} className="px-2 py-1 text-[10px] flex items-center gap-1 hover:bg-white/10 rounded"><Type size={12}/> نص</button>
         </div>
      </div>
      
      {/* Timeline Editor */}
      <div className="flex-1 flex overflow-hidden relative">
         {/* Track Headers */}
         <div className="w-[100px] bg-white/5 border-l border-black/10 dark:border-white/10 flex flex-col shrink-0 overflow-hidden relative z-10">
            <div className="h-6 border-b border-black/10 dark:border-white/10 text-[10px] p-1 text-center shrink-0">الوقت</div>
            {settings.tracks?.map(track => (
               <div key={track.id} className="h-12 border-b border-black/10 dark:border-white/10 flex items-center px-2 text-[10px] truncate shrink-0">
                  {track.type === 'video' && <Video size={12} className="ml-1 inline" />}
                  {track.type === 'text' && <Type size={12} className="ml-1 inline" />}
                  {track.type === 'audio' && <Music size={12} className="ml-1 inline" />}
                  {track.name}
               </div>
            ))}
         </div>
         
         {/* Timeline Tracks */}
         <div 
           ref={scrollRef}
           className="flex-1 overflow-x-auto overflow-y-auto relative bg-[linear-gradient(to_right,#80808012_1px,transparent_1px)] bg-[size:20px_100%]"
           onClick={handleTimelineClick}
         >
             {/* Playhead */}
             <div 
               className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-20 pointer-events-none"
               style={{ left: `${currentTime * pixelsPerSecond}px` }}
             >
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-red-500 absolute -top-[1px] -translate-x-[5px]" />
             </div>
             
             <div className="h-6 border-b border-black/10 dark:border-white/10 relative shrink-0">
               {/* Time markers */}
               {Array.from({ length: Math.ceil(duration) + 5 }).map((_, i) => (
                  <div key={i} className="absolute text-[8px] text-gray-500" style={{ left: `${i * pixelsPerSecond}px`, top: '4px' }}>
                     {i}s
                  </div>
               ))}
             </div>

             <div className="relative min-w-full" style={{ width: `${Math.max(duration * pixelsPerSecond, scrollRef.current?.clientWidth || 0)}px` }}>
                 {settings.tracks?.map((track, i) => (
                    <div key={track.id} className="h-12 border-b border-black/10 dark:border-white/10 relative shrink-0 bg-black/5 dark:bg-white/[0.02]">
                       {settings.items?.filter(item => item.trackId === track.id).map(item => (
                          <div 
                             key={item.id} 
                             className="absolute top-[4px] h-[40px] rounded bg-primary/80 border border-primary text-[10px] p-1 overflow-hidden pointer-events-none"
                             style={{ 
                                left: `${item.startTime * pixelsPerSecond}px`, 
                                width: `${item.duration * pixelsPerSecond}px`
                             }}
                          >
                             {item.type}
                          </div>
                       ))}
                    </div>
                 ))}
             </div>
         </div>
      </div>
    </div>
  );
}

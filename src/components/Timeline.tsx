import React, { useRef } from 'react';
import { VideoSettings, TimelineItem, Track } from '../types';
import { Play, Pause, Plus, Video, Type, Music } from 'lucide-react';

interface TimelineProps {
  settings: VideoSettings;
  setSettings: React.Dispatch<React.SetStateAction<VideoSettings>>;
  currentTime: number;
  onTimeChange: (time: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  duration: number;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
}

const pixelsPerSecond = 20;

export default function Timeline({ 
  settings, 
  setSettings, 
  currentTime, 
  onTimeChange, 
  isPlaying, 
  onTogglePlay, 
  duration,
  selectedItemId,
  setSelectedItemId
}: TimelineProps) {
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
     const newTrack: Track = { 
       id: Date.now().toString(), 
       name: `مسار جديد`, 
       type,
       isVisible: true,
       isLocked: false
     };
     setSettings(prev => ({ ...prev, tracks: [...(prev.tracks || []), newTrack] }));
  };

  const addItemToTrack = (trackId: string) => {
     const track = settings.tracks.find(t => t.id === trackId);
     if (!track) return;

     const newItem: TimelineItem = {
        id: Math.random().toString(36).substring(7),
        type: track.type === 'video' ? 'video' : track.type === 'text' ? 'text' : 'image',
        url: track.type === 'text' ? 'نص جديد' : 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80',
        startTime: currentTime,
        duration: 5,
        trackId,
        x: 0, y: 0, width: 50, height: 50, opacity: 100, zIndex: settings.items.length, rotation: 0, scale: 1
     };

     setSettings(prev => ({ ...prev, items: [...prev.items, newItem] }));
     setSelectedItemId(newItem.id);
  };

  return (
    <div className="h-64 w-full bg-black/10 dark:bg-black/40 border-t border-black/10 dark:border-white/10 flex flex-col user-select-none">
      {/* Toolbar */}
      <div className="h-12 border-b border-black/10 dark:border-white/10 flex items-center px-4 gap-4 bg-white/50 dark:bg-black/20 backdrop-blur-md">
         <button onClick={onTogglePlay} className="w-8 h-8 flex items-center justify-center bg-primary text-white rounded-full hover:scale-105 transition-all shadow-md">
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-1" />}
         </button>
         <div className="text-xs font-mono font-medium text-gray-700 dark:text-gray-300 bg-black/5 dark:bg-white/5 px-3 py-1 rounded-md">
            {currentTime.toFixed(1)}s <span className="opacity-50 mx-1">/</span> {duration.toFixed(1)}s
         </div>
         <div className="flex bg-black/5 dark:bg-white/5 rounded-lg p-1 ml-auto gap-1 border border-black/5 dark:border-white/5">
            <button onClick={() => addTrack('video')} className="px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5 hover:bg-white dark:hover:bg-white/10 rounded-md transition-colors text-gray-700 dark:text-gray-200"><Video size={14}/> فيديو/صورة</button>
            <button onClick={() => addTrack('text')} className="px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5 hover:bg-white dark:hover:bg-white/10 rounded-md transition-colors text-gray-700 dark:text-gray-200"><Type size={14}/> نص</button>
         </div>
      </div>
      
      {/* Timeline Editor */}
      <div className="flex-1 flex overflow-hidden relative bg-gray-50/50 dark:bg-[#18181b]/50">
         {/* Track Headers */}
         <div className="w-[120px] bg-white/80 dark:bg-[#27272a]/90 backdrop-blur-xl border-l border-black/10 dark:border-white/10 flex flex-col shrink-0 overflow-hidden relative z-10 shadow-[2px_0_10px_rgba(0,0,0,0.02)] dark:shadow-[2px_0_10px_rgba(0,0,0,0.2)]">
            <div className="h-8 border-b border-black/10 dark:border-white/10 text-[10px] font-bold text-gray-400 p-2 text-center shrink-0 flex items-center justify-center tracking-wider">الوقت</div>
            {settings.tracks?.map(track => (
               <div key={track.id} className="h-14 border-b border-black/5 dark:border-white/5 flex items-center px-3 text-[11px] font-medium gap-2 shrink-0 group hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <div className="flex-1 truncate flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    {track.type === 'video' && <Video size={14} className="text-blue-500" />}
                    {track.type === 'text' && <Type size={14} className="text-orange-500" />}
                    {track.type === 'audio' && <Music size={14} className="text-green-500" />}
                    {track.name}
                  </div>
                  <button onClick={() => addItemToTrack(track.id)} className="w-6 h-6 flex items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-primary hover:text-white rounded opacity-0 group-hover:opacity-100 transition-all text-gray-500 dark:text-gray-400">
                    <Plus size={12} />
                  </button>
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
               className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-20 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.5)]"
               style={{ left: `${currentTime * pixelsPerSecond}px` }}
             >
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-red-500 absolute -top-[1px] -translate-x-[5px]" />
             </div>
             
             <div className="h-8 border-b border-black/5 dark:border-white/5 relative shrink-0">
               {/* Time markers */}
               {Array.from({ length: Math.ceil(duration) + 5 }).map((_, i) => (
                  <div key={i} className="absolute text-[9px] font-mono text-gray-400" style={{ left: `${i * pixelsPerSecond}px`, top: '8px' }}>
                     {i}s
                  </div>
               ))}
             </div>

             <div className="relative min-w-full" style={{ width: `${Math.max(duration * pixelsPerSecond, scrollRef.current?.clientWidth || 0)}px` }}>
                 {settings.tracks?.map((track) => (
                    <div key={track.id} className="h-14 border-b border-black/5 dark:border-white/5 relative shrink-0 group hover:bg-black-[0.01] dark:hover:bg-white/[0.01]">
                       {settings.items?.filter(item => item.trackId === track.id).map(item => (
                          <div 
                             key={item.id} 
                             onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItemId(item.id);
                             }}
                             className={`absolute top-[4px] bottom-[4px] rounded-md border text-[10px] p-1.5 overflow-hidden transition-all cursor-pointer shadow-sm ${
                                selectedItemId === item.id 
                                ? 'bg-primary dark:bg-primary text-white border-primary shadow-[0_4px_12px_rgba(197,160,89,0.3)] z-10 scale-[1.01]' 
                                : 'bg-white dark:bg-[#3f3f46] text-gray-800 dark:text-gray-200 border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#52525b] hover:border-black/20 dark:hover:border-white/20'
                             }`}
                             style={{ 
                                left: `${item.startTime * pixelsPerSecond}px`, 
                                width: `${item.duration * pixelsPerSecond}px`
                             }}
                          >
                             <div className="font-bold truncate flex items-center gap-1.5 opacity-90"><div className={`w-2 h-2 rounded-full ${track.type === 'video' ? 'bg-blue-500' : track.type === 'text' ? 'bg-orange-500' : 'bg-green-500'}`} /> {item.type}</div>
                             <div className="opacity-60 text-[9px] mt-1 truncate tracking-tighter mix-blend-luminosity">{item.url}</div>
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

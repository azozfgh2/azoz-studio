import React, { useRef, useState } from 'react';
import { VideoSettings, AspectRatio, Surah, Reciter, TranslationEdition } from '../types';
import { Monitor, Image as ImageIcon, BookOpen, Mic, Type, FileUp, Settings as SettingsIcon } from 'lucide-react';

interface SidebarProps {
  settings: VideoSettings;
  setSettings: React.Dispatch<React.SetStateAction<VideoSettings>>;
  surahs: Surah[];
  reciters: Reciter[];
  translations: TranslationEdition[];
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
}

export default function Sidebar({ 
  settings, 
  setSettings, 
  surahs, 
  reciters, 
  translations,
  selectedItemId,
  setSelectedItemId
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const [activeTextTab, setActiveTextTab] = useState<'font' | 'style' | 'animation'>('font');

  const handleAspectRatioChange = (ratio: AspectRatio) => {
    setSettings((prev) => ({ ...prev, aspectRatio: ratio }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      setSettings(prev => ({
        ...prev,
        backgrounds: [...prev.backgrounds, {
          type: isVideo ? 'video' : 'image',
          url
        }]
      }));
    }
  };

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSettings(prev => ({
        ...prev,
        fontFamily: 'custom',
        customFontUrl: url
      }));
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      // Determine duration to simulate AI sync
      const tempAudio = new Audio(url);
      tempAudio.onloadedmetadata = () => {
         const duration = tempAudio.duration;
         const numAyahs = settings.endAyah - settings.startAyah + 1;
         const ayahDuration = duration / numAyahs;
         const timestamps = Array.from({length: numAyahs}).map((_, i) => ayahDuration * i);
         setSettings(prev => ({
             ...prev,
             reciterId: 'custom',
             customAudioUrl: url,
             customAudioTimestamps: timestamps
         }));
      };
    }
  };

  // Preset backgrounds
  const presetBackgrounds = [
    { type: 'image', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80' }, // Mountains
    { type: 'image', url: 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=800&q=80' }, // Space/Stars
    { type: 'video', url: 'https://cdn.pixabay.com/video/2020/07/22/45330-441639359_tiny.mp4' }, // Clouds moving
    { type: 'color', url: '#0f172a' }, // Dark slate
  ];

  const selectedItem = settings.items.find(i => i.id === selectedItemId);

  const updateSelectedItem = (updates: Partial<typeof settings.items[0]>) => {
    setSettings(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === selectedItemId ? { ...item, ...updates } : item)
    }));
  };

  return (
    <div className="w-[340px] h-full overflow-y-auto glass border-l border-black/5 dark:border-white/20 flex flex-col p-6 gap-8 custom-scrollbar">
      {selectedItem ? (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
           <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                 خصائص العنصر ({selectedItem.type})
              </h2>
              <button onClick={() => setSelectedItemId(null)} className="text-[10px] bg-black/10 dark:bg-white/10 px-2 py-1 rounded">إغلاق</button>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="text-[10px] text-gray-500 block mb-1">الموضع X (%)</label>
                 <input type="number" value={selectedItem.x} onChange={e => updateSelectedItem({ x: Number(e.target.value) })} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded p-1 text-xs" />
              </div>
              <div>
                 <label className="text-[10px] text-gray-500 block mb-1">الموضع Y (%)</label>
                 <input type="number" value={selectedItem.y} onChange={e => updateSelectedItem({ y: Number(e.target.value) })} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded p-1 text-xs" />
              </div>
              <div>
                 <label className="text-[10px] text-gray-500 block mb-1">العرض (%)</label>
                 <input type="number" value={selectedItem.width} onChange={e => updateSelectedItem({ width: Number(e.target.value) })} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded p-1 text-xs" />
              </div>
              <div>
                 <label className="text-[10px] text-gray-500 block mb-1">الارتفاع (%)</label>
                 <input type="number" value={selectedItem.height} onChange={e => updateSelectedItem({ height: Number(e.target.value) })} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded p-1 text-xs" />
              </div>
           </div>

           <div>
              <label className="text-[10px] text-gray-500 block mb-1">الشفافية ({selectedItem.opacity}%)</label>
              <input type="range" min="0" max="100" value={selectedItem.opacity} onChange={e => updateSelectedItem({ opacity: Number(e.target.value) })} className="w-full accent-primary h-1" />
           </div>

           {selectedItem.type === 'text' && (
              <div>
                 <label className="text-[10px] text-gray-500 block mb-1">محتوى النص</label>
                 <textarea value={selectedItem.url} onChange={e => updateSelectedItem({ url: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded p-2 text-xs" rows={3} />
              </div>
           )}

           <button 
              onClick={() => {
                setSettings(prev => ({ ...prev, items: prev.items.filter(i => i.id !== selectedItemId) }));
                setSelectedItemId(null);
              }}
              className="w-full py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[10px] font-bold hover:bg-red-500/20 transition-colors"
           >
              حذف العنصر
           </button>
           
           <div className="border-t border-black/10 dark:border-white/10 my-2" />
        </div>
      ) : null}

      <div>
        <h1 className="text-xl font-bold text-primary mb-1 flex items-center gap-2 drop-shadow-sm">
            <span>الإعدادات</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">تخصيص الفيديو والمحتوى</p>
      </div>

      {/* 1. أبعاد الشاشة */}
      <section className="flex flex-col gap-3">
        <label className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
          <Monitor size={14} className="text-primary"/> أبعاد الشاشة
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['9:16', '16:9', '1:1', '4:3', '3:4', '21:9'] as AspectRatio[]).map((ratio) => (
            <button
              key={ratio}
              onClick={() => handleAspectRatioChange(ratio)}
              className={`py-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all text-xs ${
                settings.aspectRatio === ratio
                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-inner'
                  : 'border-black/5 dark:border-white/20 bg-black/5 dark:bg-white/[0.08] text-gray-600 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/20'
              }`}
            >
              <span dir="ltr">{ratio}</span>
              <span className="text-[9px] opacity-70 font-normal">
                {ratio === '9:16' ? '(Reels)' : ratio === '16:9' ? '(YouTube)' : ratio === '1:1' ? '(Insta)' : ratio === '4:3' ? '(Classic)' : ratio === '3:4' ? '(Vertical)' : '(Cinematic)'}
              </span>
            </button>
          ))}
        </div>
        
        <div>
            <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-2 flex justify-between">
              <span>حدة الزوايا (Border Radius)</span>
              <span>{settings.borderRadius}px</span>
            </label>
            <input 
                type="range" 
                min={0} 
                max={50} 
                value={settings.borderRadius}
                onChange={(e) => setSettings(prev => ({ ...prev, borderRadius: Number(e.target.value) }))}
                className="w-full accent-primary h-1 bg-black/10 dark:bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
        </div>
      </section>

      {/* 2. الخلفية */}
      <section className="flex flex-col gap-3">
        <label className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
          <ImageIcon size={14} className="text-primary"/> الخلفية
        </label>

        <div className="grid grid-cols-4 gap-2 mb-2">
           {presetBackgrounds.map((bg, idx) => (
             <button 
                key={idx}
                onClick={() => setSettings(prev => ({ ...prev, backgrounds: [bg as any] }))}
                className={`aspect-video rounded-md overflow-hidden border transition-all hover:border-black/20 dark:hover:border-white/40`}
             >
                {bg.type === 'color' ? (
                   <div className="w-full h-full" style={{ backgroundColor: bg.url }} />
                ) : bg.type === 'image' ? (
                    <img src={bg.url} className="w-full h-full object-cover" alt="preset" />
                ) : (
                    <div className="w-full h-full bg-black/5 dark:bg-white/[0.08] flex items-center justify-center text-[10px] text-gray-500 dark:text-gray-400 font-bold hover:bg-black/10 dark:hover:bg-white/20 transition-colors">فيديو</div>
                )}
             </button>
           ))}
        </div>

        <div className="flex gap-2 w-full overflow-x-auto pb-2 min-h-[60px]">
            {settings.backgrounds.map((bg, i) => (
                <div key={i} className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-black/10 dark:border-white/20">
                    {bg.type === 'color' ? (
                       <div className="w-full h-full" style={{ backgroundColor: bg.url }} />
                    ) : bg.type === 'image' ? (
                        <img src={bg.url} className="w-full h-full object-cover" alt="bg" />
                    ) : (
                        <video src={bg.url} className="w-full h-full object-cover" />
                    )}
                    <button 
                       onClick={() => setSettings(prev => ({ ...prev, backgrounds: prev.backgrounds.filter((_, idx) => idx !== i) }))}
                       className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                    >×</button>
                </div>
            ))}
        </div>

        <input 
          type="file" 
          accept="image/*,video/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 w-full py-2.5 glass-surface hover:bg-black/5 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 text-xs rounded-lg border border-dashed border-black/20 dark:border-white/30 transition-colors"
        >
          <FileUp size={14} /> <span className="uppercase text-[10px] font-bold">رفع ملف جديد (إضافة مقطع)</span>
        </button>

        <div>
             <label className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-2">
               <span>خافتية الخلفية (Opacity)</span>
               <span>{settings.backgroundOpacity}%</span>
             </label>
             <input 
                 type="range" 
                 min={10} 
                 max={100} 
                 value={settings.backgroundOpacity}
                 onChange={(e) => setSettings(prev => ({ ...prev, backgroundOpacity: Number(e.target.value) }))}
                 className="w-full accent-primary h-1 bg-black/10 dark:bg-white/20 rounded-lg appearance-none cursor-pointer"
             />
        </div>
      </section>

      {/* 3. السورة والآيات */}
      <section className="flex flex-col gap-3">
        <label className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
          <BookOpen size={14} className="text-primary"/> السورة والآيات
        </label>
        <div className="flex flex-col gap-2">
          <select 
            value={settings.surahNumber}
            onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                surahNumber: Number(e.target.value),
                startAyah: 1, // Reset on surah change
                endAyah: surahs.find(s => s.number === Number(e.target.value))?.numberOfAyahs || 1
            }))}
            className="w-full glass-surface border border-black/10 dark:border-white/20 rounded-lg py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-primary text-gray-800 dark:text-gray-100 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%208l5%205%205-5%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:left_0.5rem_center] bg-no-repeat"
          >
            {surahs.map(surah => (
              <option key={surah.number} value={surah.number} className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-200">
                {surah.number}. سورة {surah.name.replace('سُورَةُ ', '')}
              </option>
            ))}
          </select>

          <div className="flex gap-2 items-center w-full mt-2">
            <div className="flex-1">
                <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-2">من آية</label>
                <input 
                    type="number" 
                    min={1} 
                    max={settings.endAyah}
                    value={settings.startAyah}
                    onChange={(e) => setSettings(prev => ({ ...prev, startAyah: Number(e.target.value) }))}
                    className="w-full glass-surface border border-black/10 dark:border-white/20 text-gray-800 dark:text-gray-100 rounded-lg py-2 px-3 text-center text-sm focus:outline-none focus:border-primary"
                />
            </div>
            <span className="text-gray-400 dark:text-gray-500 mt-6 text-sm">-</span>
            <div className="flex-1">
                <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-2">إلى آية</label>
                <input 
                    type="number" 
                    min={settings.startAyah} 
                    max={surahs.find(s => s.number === settings.surahNumber)?.numberOfAyahs || 1}
                    value={settings.endAyah}
                    onChange={(e) => setSettings(prev => ({ ...prev, endAyah: Number(e.target.value) }))}
                    className="w-full glass-surface border border-black/10 dark:border-white/20 text-gray-800 dark:text-gray-100 rounded-lg py-2 px-3 text-center text-sm focus:outline-none focus:border-primary"
                />
            </div>
          </div>
        </div>
      </section>

      {/* 4. القارئ (الشيخ) والصوت المخصص */}
      <section className="flex flex-col gap-3">
        <label className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
          <Mic size={14} className="text-primary"/> الصوت
        </label>
        <select 
          value={settings.reciterId}
          onChange={(e) => setSettings(prev => ({ ...prev, reciterId: e.target.value }))}
          className="w-full glass-surface border border-black/10 dark:border-white/20 rounded-lg py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-primary text-gray-800 dark:text-gray-100 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%208l5%205%205-5%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:left_0.5rem_center] bg-no-repeat"
        >
          <option value="custom" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-200 font-bold">-- صوت مخصص (ذكاء اصطناعي) --</option>
          {reciters.map(reciter => (
            <option key={reciter.identifier} value={reciter.identifier} className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-200">
              {reciter.name}
            </option>
          ))}
        </select>

        <input 
          type="file" 
          accept="audio/*" 
          className="hidden" 
          ref={audioInputRef} 
          onChange={handleAudioUpload} 
        />
        <button 
          onClick={() => audioInputRef.current?.click()}
          className="flex items-center justify-center gap-2 w-full py-2 bg-gradient-to-l from-primary/20 to-primary/5 hover:from-primary/30 hover:to-primary/10 text-primary text-xs rounded-lg border border-primary/30 transition-colors shadow-sm"
        >
          <Mic size={14} /> <span className="uppercase text-[10px] font-bold">رفع صوت مخصص</span>
        </button>

        {settings.reciterId === 'custom' && settings.customAudioUrl && (
            <div className="flex flex-col gap-2 p-3 border border-black/10 dark:border-white/20 rounded-lg bg-black/5 dark:bg-white/[0.05]">
                <button 
                    onClick={() => {
                        // Simulate Local AI Transcription
                        alert('جاري تشغيل نموذج Whisper المحلي لاستخراج النصوص... (محاكاة)');
                        setTimeout(() => {
                           // Generate mock timestamps
                           const numAyahs = settings.endAyah - settings.startAyah + 1;
                           const t: number[] = [];
                           for (let i=0; i<numAyahs; i++) t.push(i * 3.5); // fake timing
                           setSettings(prev => ({ ...prev, customAudioTimestamps: t }));
                        }, 1000);
                    }}
                    className="w-full bg-primary/90 hover:bg-primary text-black font-bold text-[10px] py-1.5 rounded"
                >
                    استخراج النصوص (AI محلي)
                </button>
                
                {settings.customAudioTimestamps.length > 0 && (
                    <div className="text-[10px] space-y-1 mt-2 max-h-32 overflow-y-auto">
                        <div className="text-gray-500 font-bold mb-1">محرر الخط الزمني (Timeline)</div>
                        {settings.customAudioTimestamps.map((t, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <span className="text-gray-500 w-12 truncate dark:text-gray-400">آية {settings.startAyah + idx}</span>
                                <input 
                                   type="number" 
                                   step="0.1"
                                   value={t.toFixed(1)} 
                                   onChange={(e) => {
                                      const newT = [...settings.customAudioTimestamps];
                                      newT[idx] = parseFloat(e.target.value) || 0;
                                      setSettings(prev => ({ ...prev, customAudioTimestamps: newT }));
                                   }}
                                   className="w-full bg-white dark:bg-black/50 border border-black/10 dark:border-white/20 rounded px-1 text-center"
                                />
                                <span className="text-gray-400">ثانية</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
      </section>

      {/* 5. النصوص والترجمة */}
      <section className="flex flex-col gap-3">
        <label className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
          <Type size={14} className="text-primary"/> النص (Style)
        </label>
        
        <div className="flex border-b border-black/10 dark:border-white/20 mb-2">
           <button onClick={() => setActiveTextTab('font')} className={`flex-1 pb-2 text-xs font-bold transition-colors ${activeTextTab === 'font' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}>الخط</button>
           <button onClick={() => setActiveTextTab('style')} className={`flex-1 pb-2 text-xs font-bold transition-colors ${activeTextTab === 'style' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}>النمط</button>
           <button onClick={() => setActiveTextTab('animation')} className={`flex-1 pb-2 text-xs font-bold transition-colors ${activeTextTab === 'animation' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}>الحركة</button>
        </div>

        {activeTextTab === 'font' && (
           <div className="space-y-3 animate-in fade-in slide-in-from-left-2 duration-200">
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => setSettings(prev => ({ ...prev, fontFamily: 'quran' }))}
                        className={`py-3 text-[12px] font-quran rounded-lg border transition-all ${settings.fontFamily === 'quran' ? 'border-primary bg-primary/10 text-primary scale-[0.98]' : 'border-black/5 dark:border-white/20 bg-black/5 dark:bg-white/[0.05] text-gray-600 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/10'}`}
                    >
                        الخط الأصلي
                    </button>
                    <button 
                        onClick={() => setSettings(prev => ({ ...prev, fontFamily: 'cairo' }))}
                        className={`py-3 text-[12px] font-cairo rounded-lg border transition-all ${settings.fontFamily === 'cairo' ? 'border-primary bg-primary/10 text-primary scale-[0.98]' : 'border-black/5 dark:border-white/20 bg-black/5 dark:bg-white/[0.05] text-gray-600 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/10'}`}
                    >
                        Cairo (عصري)
                    </button>
                    {settings.customFontUrl && (
                        <button 
                            onClick={() => setSettings(prev => ({ ...prev, fontFamily: 'custom' }))}
                            className={`py-3 text-[12px] col-span-2 rounded-lg border transition-all ${settings.fontFamily === 'custom' ? 'border-primary bg-primary/10 text-primary scale-[0.98]' : 'border-black/5 dark:border-white/20 bg-black/5 dark:bg-white/[0.05] text-gray-600 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/10'}`}
                            style={{ fontFamily: 'CustomFont, sans-serif' }}
                        >
                            الخط المخصص (محلي)
                        </button>
                    )}
                </div>
                
                <input 
                  type="file" 
                  accept=".ttf,.otf,.woff,.woff2" 
                  className="hidden" 
                  ref={fontInputRef} 
                  onChange={handleFontUpload} 
                />
                <button 
                  onClick={() => fontInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 w-full py-2 glass-surface hover:bg-black/5 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 text-xs rounded-lg border border-dashed border-black/20 dark:border-white/30 transition-colors"
                >
                  <Type size={14} /> <span className="uppercase text-[10px] font-bold">إضافة خط مخصص</span>
                </button>
           </div>
        )}

        {activeTextTab === 'style' && (
           <div className="space-y-3 animate-in fade-in slide-in-from-left-2 duration-200">
               <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-2 flex justify-between">
                      <span>حجم الخط</span>
                      <span>{settings.fontSize}px</span>
                    </label>
                    <input 
                        type="range" 
                        min={20} 
                        max={80} 
                        value={settings.fontSize}
                        onChange={(e) => setSettings(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                        className="w-full accent-primary h-1 bg-black/10 dark:bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div>
                     <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-2 flex justify-between">
                       <span>عنصر الآية (عدد الكلمات المعروضة)</span>
                       <span>{settings.wordsPerScreen === 0 ? 'الآية كاملة' : `${settings.wordsPerScreen} كلمة`}</span>
                     </label>
                     <input 
                         type="range" 
                         min={0} 
                         max={15} 
                         value={settings.wordsPerScreen}
                         onChange={(e) => setSettings(prev => ({ ...prev, wordsPerScreen: Number(e.target.value) }))}
                         className="w-full accent-primary h-1 bg-black/10 dark:bg-white/20 rounded-lg appearance-none cursor-pointer"
                     />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">لون النص</label>
                        <div className="flex items-center gap-2 bg-black/5 dark:bg-white/[0.08] border border-black/10 dark:border-white/20 rounded overflow-hidden p-1">
                          <input 
                              type="color" 
                              value={settings.textColor}
                              onChange={(e) => setSettings(prev => ({ ...prev, textColor: e.target.value }))}
                              className="w-6 h-6 border-0 p-0 bg-transparent cursor-pointer"
                          />
                          <span className="text-[10px] text-gray-600 dark:text-gray-300 uppercase">{settings.textColor}</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-2 mt-1 flex justify-between">
                          <span>شفافية النص</span>
                          <span>{settings.textOpacity}%</span>
                        </label>
                        <input 
                            type="range" 
                            min={0} 
                            max={100} 
                            value={settings.textOpacity}
                            onChange={(e) => setSettings(prev => ({ ...prev, textOpacity: Number(e.target.value) }))}
                            className="w-full accent-primary h-1 bg-black/10 dark:bg-white/20 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">لون الظل</label>
                        <div className="flex items-center gap-2 bg-black/5 dark:bg-white/[0.08] border border-black/10 dark:border-white/20 rounded overflow-hidden p-1">
                          <input 
                              type="color" 
                              value={settings.textShadowColor}
                              onChange={(e) => setSettings(prev => ({ ...prev, textShadowColor: e.target.value }))}
                              className="w-6 h-6 border-0 p-0 bg-transparent cursor-pointer"
                          />
                          <span className="text-[10px] text-gray-600 dark:text-gray-300 uppercase">{settings.textShadowColor}</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-2 mt-1 flex justify-between">
                          <span>الانتشار (Blur)</span>
                          <span>{settings.textShadowBlur}px</span>
                        </label>
                        <input 
                            type="range" 
                            min={0} 
                            max={50} 
                            value={settings.textShadowBlur}
                            onChange={(e) => setSettings(prev => ({ ...prev, textShadowBlur: Number(e.target.value) }))}
                            className="w-full accent-primary h-1 bg-black/10 dark:bg-white/20 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>

                <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/10">
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-2">تأثير الزجاج (Glassmorphism)</label>
                    <select 
                    value={settings.glassEffect}
                    onChange={(e) => setSettings(prev => ({ ...prev, glassEffect: e.target.value as any }))}
                    className="w-full glass-surface border border-black/10 dark:border-white/20 rounded-lg py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-primary text-gray-800 dark:text-gray-100 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%208l5%205%205-5%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:left_0.5rem_center] bg-no-repeat"
                    >
                      <option value="none" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-200">بدون (None)</option>
                      <option value="frame" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-200">على الإطار (Container)</option>
                      <option value="text" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-200">على النص فقط (Text Box)</option>
                    </select>
                </div>
           </div>
        )}

        {activeTextTab === 'animation' && (
           <div className="space-y-3 animate-in fade-in slide-in-from-left-2 duration-200">
               <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-2">دخول وخروج النص (In/Out)</label>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { id: 'slideUp', label: 'القفز لأعلى' },
                            { id: 'fade', label: 'تلاشي تدريجي' },
                            { id: 'zoom', label: 'تكبير ناعم' },
                            { id: 'blur', label: 'تآكل ضبابي' },
                        ].map((anim) => (
                            <button
                                key={anim.id}
                                onClick={() => setSettings(prev => ({ ...prev, textAnimation: anim.id as any }))}
                                className={`py-3 text-[11px] rounded-lg border transition-all ${settings.textAnimation === anim.id ? 'border-primary bg-primary/10 text-primary scale-[0.98]' : 'border-black/5 dark:border-white/20 bg-black/5 dark:bg-white/[0.05] text-gray-600 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/10'}`}
                            >
                                {anim.label}
                            </button>
                        ))}
                    </div>
                </div>
           </div>
        )}

        <div className="mt-2 pt-4 border-t border-black/10 dark:border-white/10">
            <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-2">لغة الترجمة الفرعية (اختياري)</label>
            <select 
            value={settings.translationId || ''}
            onChange={(e) => setSettings(prev => ({ ...prev, translationId: e.target.value || null }))}
            className="w-full glass-surface border border-black/10 dark:border-white/20 rounded-lg py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-primary text-gray-800 dark:text-gray-100 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%208l5%205%205-5%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:left_0.5rem_center] bg-no-repeat"
            >
            <option value="" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-200">بدون ترجمة</option>
            {translations.map(t => (
                <option key={t.identifier} value={t.identifier} className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-200">
                {t.language.toUpperCase()} - {t.englishName}
                </option>
            ))}
            </select>
        </div>
      </section>

      {/* 6. إعدادات التصدير */}
      <section className="flex flex-col gap-3">
        <label className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
          <SettingsIcon size={14} className="text-primary"/> إعدادات التصدير
        </label>
        
        <div className="grid grid-cols-2 gap-2">
            <div>
                <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-2">الدقة (Resolution)</label>
                <select 
                    value={settings.resolution}
                    onChange={(e) => setSettings(prev => ({ ...prev, resolution: e.target.value as any }))}
                    className="w-full glass-surface border border-black/10 dark:border-white/20 rounded-lg py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-primary text-gray-800 dark:text-gray-100 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%208l5%205%205-5%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:left_0.5rem_center] bg-no-repeat"
                >
                    <option value="SD" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-200">SD (480p)</option>
                    <option value="HD" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-200">HD (720p)</option>
                    <option value="FHD" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-200">FHD (1080p)</option>
                    <option value="4K" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-200">4K (2160p)</option>
                </select>
            </div>

            <div>
                <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-2">معدل الإطارات (FPS)</label>
                <select 
                    value={settings.fps}
                    onChange={(e) => setSettings(prev => ({ ...prev, fps: Number(e.target.value) as any }))}
                    className="w-full glass-surface border border-black/10 dark:border-white/20 rounded-lg py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-primary text-gray-800 dark:text-gray-100 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%208l5%205%205-5%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:left_0.5rem_center] bg-no-repeat"
                >
                    <option value={24} className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-200">24 fps (سينمائي)</option>
                    <option value={30} className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-200">30 fps (قياسي)</option>
                    <option value={60} className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-200">60 fps (سلس)</option>
                    <option value={120} className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-200">120 fps (فائق السلاسة)</option>
                </select>
            </div>
        </div>
      </section>

      <div className="py-4"></div> {/* Bottom Padding spacer */}
    </div>
  );
}

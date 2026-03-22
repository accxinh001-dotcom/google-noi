import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Settings, 
  Zap,
  Trash2,
  Heart,
  User,
  MessageSquare,
  Gift,
  X,
  VolumeX,
  Palette,
  Upload,
  Image as ImageIcon,
  Music
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type EffectType = 'tomato' | 'slime' | 'ink' | 'custom';

interface Splat {
  id: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  createdAt: number;
  nickname: string;
  profilePictureUrl: string;
  type: EffectType;
}

interface TikTokEvent {
  uniqueId: string;
  nickname: string;
  profilePictureUrl: string;
  likeCount?: number;
}

interface UserStats {
  nickname: string;
  profilePictureUrl: string;
  count: number;
}

interface GiftExplosion {
  id: string;
  profilePictureUrl: string;
  centerX: number;
  centerY: number;
  miniAvatars: Array<{
    id: string;
    angle: number;
    distance: number;
    size: number;
  }>;
}

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [tiktokId, setTiktokId] = useState('');
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [splats, setSplats] = useState<Splat[]>([]);
  const [giftExplosions, setGiftExplosions] = useState<GiftExplosion[]>([]);
  const [showConfig, setShowConfig] = useState(true);
  const [configTab, setConfigTab] = useState<'like' | 'gift' | 'chat'>('like');
  const [userStats, setUserStats] = useState<Record<string, UserStats>>({});
  const [bgColor, setBgColor] = useState('#00FF00');
  
  // TTS Settings
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [welcomeTemplate, setWelcomeTemplate] = useState('Chào mừng {name} đã tham gia phòng.');
  const [ttsVoice, setTtsVoice] = useState<string>('');
  const [ttsPitch, setTtsPitch] = useState(1);
  const [ttsRate, setTtsRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // Like Settings
  const [likeSoundEnabled, setLikeSoundEnabled] = useState(true);
  const [likeEffect, setLikeEffect] = useState<EffectType>('tomato');
  const [likeSplatCount, setLikeSplatCount] = useState(1);
  const [likeThreshold, setLikeThreshold] = useState(1);
  
  // Gift Settings
  const [giftSoundEnabled, setGiftSoundEnabled] = useState(true);
  const [giftEffect, setGiftEffect] = useState<EffectType>('slime');
  const [giftSplatCount, setGiftSplatCount] = useState(5);
  const [giftCoinsPerSplat, setGiftCoinsPerSplat] = useState(1);

  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [customSoundUrl, setCustomSoundUrl] = useState<string | null>(null);

  const splatSound = useRef<HTMLAudioElement | null>(null);
  const customSound = useRef<HTMLAudioElement | null>(null);
  
  const likeSoundEnabledRef = useRef(likeSoundEnabled);
  const likeEffectRef = useRef(likeEffect);
  const likeSplatCountRef = useRef(likeSplatCount);
  const likeThresholdRef = useRef(likeThreshold);
  const giftSoundEnabledRef = useRef(giftSoundEnabled);
  const giftEffectRef = useRef(giftEffect);
  const giftSplatCountRef = useRef(giftSplatCount);
  const giftCoinsPerSplatRef = useRef(giftCoinsPerSplat);
  
  const ttsEnabledRef = useRef(ttsEnabled);
  const welcomeEnabledRef = useRef(welcomeEnabled);
  const welcomeTemplateRef = useRef(welcomeTemplate);
  const ttsVoiceRef = useRef(ttsVoice);
  const ttsPitchRef = useRef(ttsPitch);
  const ttsRateRef = useRef(ttsRate);
  
  const customImageUrlRef = useRef(customImageUrl);
  const customSoundUrlRef = useRef(customSoundUrl);
  const userLikeBuffer = useRef<Record<string, number>>({});
  const ttsQueue = useRef<string[]>([]);
  const isSpeaking = useRef(false);

  // Sync refs with state
  useEffect(() => {
    likeSoundEnabledRef.current = likeSoundEnabled;
  }, [likeSoundEnabled]);

  useEffect(() => {
    likeEffectRef.current = likeEffect;
  }, [likeEffect]);

  useEffect(() => {
    likeSplatCountRef.current = likeSplatCount;
  }, [likeSplatCount]);

  useEffect(() => {
    likeThresholdRef.current = likeThreshold;
  }, [likeThreshold]);

  useEffect(() => {
    giftSoundEnabledRef.current = giftSoundEnabled;
  }, [giftSoundEnabled]);

  useEffect(() => {
    giftEffectRef.current = giftEffect;
  }, [giftEffect]);

  useEffect(() => {
    giftSplatCountRef.current = giftSplatCount;
  }, [giftSplatCount]);

  useEffect(() => {
    giftCoinsPerSplatRef.current = giftCoinsPerSplat;
  }, [giftCoinsPerSplat]);

  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled;
  }, [ttsEnabled]);

  useEffect(() => {
    welcomeEnabledRef.current = welcomeEnabled;
  }, [welcomeEnabled]);

  useEffect(() => {
    welcomeTemplateRef.current = welcomeTemplate;
  }, [welcomeTemplate]);

  useEffect(() => {
    ttsVoiceRef.current = ttsVoice;
  }, [ttsVoice]);

  useEffect(() => {
    ttsPitchRef.current = ttsPitch;
  }, [ttsPitch]);

  useEffect(() => {
    ttsRateRef.current = ttsRate;
  }, [ttsRate]);

  useEffect(() => {
    customImageUrlRef.current = customImageUrl;
  }, [customImageUrl]);

  useEffect(() => {
    customSoundUrlRef.current = customSoundUrl;
    if (customSoundUrl) {
      customSound.current = new Audio(customSoundUrl);
      customSound.current.volume = 0.4;
    }
  }, [customSoundUrl]);

  useEffect(() => {
    // Initialize sound with a more reliable URL
    splatSound.current = new Audio('https://www.soundjay.com/buttons/sounds/button-10.mp3');
    splatSound.current.volume = 0.4;
    
    // Preload sound
    splatSound.current.load();

    // Load TTS voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Always try to find a Vietnamese voice if ttsVoice is not set or not a VI voice
      const currentVoice = availableVoices.find(v => v.name === ttsVoice);
      if (!currentVoice || !currentVoice.lang.includes('vi')) {
        const viVoices = availableVoices.filter(v => v.lang.includes('vi') || v.lang.includes('VI'));
        // Prioritize Google voices if available
        const googleViVoice = viVoices.find(v => v.name.toLowerCase().includes('google'));
        const preferredVoice = googleViVoice || viVoices[0];
        
        if (preferredVoice) {
          setTtsVoice(preferredVoice.name);
        } else if (availableVoices.length > 0 && !ttsVoice) {
          setTtsVoice(availableVoices[0].name);
        }
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('tiktok-status', (data) => {
      if (data.status === 'connected') {
        setStatus('connected');
        setShowConfig(false);
      } else if (data.status === 'error') {
        setStatus('error');
        setErrorMessage(data.message);
      } else if (data.status === 'disconnected') {
        setStatus('disconnected');
      }
    });

    newSocket.on('tiktok-like', (data: TikTokEvent) => {
      const count = data.likeCount || 1;
      
      // Update buffer for this user
      const currentBuffer = (userLikeBuffer.current[data.uniqueId] || 0) + count;
      const threshold = likeThresholdRef.current;
      
      const splatsToTrigger = Math.floor(currentBuffer / threshold);
      const remainder = currentBuffer % threshold;
      
      // Save remainder
      userLikeBuffer.current[data.uniqueId] = remainder;

      setUserStats(prev => {
        const current = prev[data.uniqueId] || { nickname: data.nickname, profilePictureUrl: data.profilePictureUrl, count: 0 };
        return {
          ...prev,
          [data.uniqueId]: {
            ...current,
            count: current.count + count
          }
        };
      });

      if (splatsToTrigger > 0) {
        // Add splats for likes
        const splatCount = Math.min(splatsToTrigger * likeSplatCountRef.current, 20); 
        for (let i = 0; i < splatCount; i++) {
          setTimeout(() => {
            addSplat(data.nickname, data.profilePictureUrl, likeEffectRef.current, likeSoundEnabledRef.current);
          }, i * 100);
        }
      }
    });

    newSocket.on('tiktok-gift', (data: any) => {
      // Create flying avatar explosion effect
      const coinSplats = Math.floor((data.diamondCount || 0) / giftCoinsPerSplatRef.current);
      const explosionCount = Math.min(giftSplatCountRef.current + coinSplats, 50);
      
      for (let i = 0; i < explosionCount; i++) {
        setTimeout(() => {
          const explosionId = Math.random().toString(36).substring(7);
          const centerX = Math.random() * 80 + 10; // 10% to 90%
          const centerY = Math.random() * 60 + 20; // 20% to 80%
          
          // Create mini avatars for explosion - vây quanh avatar lớn
          const miniAvatarCount = 12;
          const miniAvatars = Array.from({ length: miniAvatarCount }, (_, idx) => ({
            id: Math.random().toString(36).substring(7),
            angle: (idx / miniAvatarCount) * Math.PI * 2,
            distance: 150 + Math.random() * 100, // Tăng khoảng cách
            size: 24 + Math.random() * 24 // Tăng kích thước từ 24px-48px
          }));
          
          const newExplosion: GiftExplosion = {
            id: explosionId,
            profilePictureUrl: data.profilePictureUrl,
            centerX,
            centerY,
            miniAvatars
          };
          
          setGiftExplosions(prev => [...prev, newExplosion]);
          
          // Play sound
          if (giftSoundEnabledRef.current && splatSound.current) {
            const sound = splatSound.current.cloneNode() as HTMLAudioElement;
            sound.volume = 0.4;
            sound.play().catch(() => {});
          }
          
          // Remove explosion after animation
          setTimeout(() => {
            setGiftExplosions(prev => prev.filter(e => e.id !== explosionId));
          }, 1800);
        }, i * 40);
      }
    });

    newSocket.on('tiktok-chat', (data: any) => {
      if (ttsEnabledRef.current && data && data.nickname) {
        const message = data.comment || data.message || data.text || '';
        if (message) {
          speak(`${data.nickname} nói: ${message}`);
        }
      }
    });

    newSocket.on('tiktok-member', (data: any) => {
      if (welcomeEnabledRef.current) {
        // strip icons out of the user name itself first
        const cleanName = stripIcons(data.nickname || '');
        let message = welcomeTemplateRef.current.replace('{name}', cleanName);
        // remove any remaining emoji/icon characters from the full sentence
        message = stripIcons(message);
        speak(message);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // helper to remove emoji/icon characters from text before speaking
  const stripIcons = (text: string) => {
    // basic regex covering common emoji ranges
    return text.replace(/([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDDFF])/g, '');
  };

  // helper to expand common Vietnamese abbreviations
  const abbreviationMap: Record<string, string> = {
    'k': 'không',
    'ko': 'không',
    'ns': 'nói',
    'v': 'vậy',
    'dc': 'được',
    'ok': 'oke',
    't': 'tao',
    'm': 'mày',
    'j': 'gì',
    'r': 'rồi',
    'cx': 'cũng',
    'bt': 'bình thường',
    'h': 'hơi',
    'vs': 'với',
    'th': 'thế',
    'ad': 'admin',
    'mod': 'moderator'
  };

  const expandAbbreviations = (text: string) => {
    let result = text;
    for (const [abbr, full] of Object.entries(abbreviationMap)) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
      result = result.replace(regex, full);
    }
    return result;
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    
    let processedText = stripIcons(text);
    processedText = expandAbbreviations(processedText);
    ttsQueue.current.push(processedText);
    processQueue();
  };

  const processQueue = () => {
    if (isSpeaking.current || ttsQueue.current.length === 0) return;
    
    const text = ttsQueue.current.shift();
    if (!text) return;
    
    isSpeaking.current = true;
    const utterance = new SpeechSynthesisUtterance(text);
    const availableVoices = window.speechSynthesis.getVoices();
    const selectedVoice = availableVoices.find(v => v.name === ttsVoiceRef.current);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      // Fallback to Vietnamese if no voice is selected or found
      utterance.lang = 'vi-VN';
    }
    
    utterance.pitch = ttsPitchRef.current;
    utterance.rate = ttsRateRef.current;
    utterance.volume = 1;

    utterance.onend = () => {
      isSpeaking.current = false;
      processQueue();
    };

    utterance.onerror = () => {
      isSpeaking.current = false;
      processQueue();
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const addSplat = (nickname: string, profilePictureUrl: string, effect: EffectType, soundEnabled: boolean) => {
    const id = Math.random().toString(36).substring(7);
    const newSplat: Splat = {
      id,
      x: Math.random() * 90 + 5, // 5% to 95%
      y: Math.random() * 80 + 10, // 10% to 90%
      rotation: 0,
      scale: 0.8 + Math.random() * 0.7,
      createdAt: Date.now(),
      nickname,
      profilePictureUrl,
      type: effect
    };

    setSplats(prev => [...prev, newSplat].slice(-50)); // Keep last 50 splats

    // Play sound
    if (soundEnabled) {
      if (effect === 'custom' && customSound.current) {
        const sound = customSound.current.cloneNode() as HTMLAudioElement;
        sound.volume = 0.4;
        sound.play().catch((err) => console.log("Custom audio play failed:", err));
      } else if (splatSound.current) {
        const sound = splatSound.current.cloneNode() as HTMLAudioElement;
        sound.volume = 0.4;
        sound.play().catch((err) => console.log("Audio play failed:", err));
      }
    }

    // Remove splat after 2 seconds
    setTimeout(() => {
      setSplats(prev => prev.filter(s => s.id !== id));
    }, 2000);
  };

  const clearSplats = () => {
    setSplats([]);
    setUserStats({});
  };

  const connectTiktok = () => {
    if (!tiktokId || !socket) return;
    setStatus('connecting');
    socket.emit('connect-tiktok', tiktokId);
  };

  const disconnectTiktok = () => {
    if (socket) {
      socket.emit('disconnect-tiktok');
    }
  };

  const getEffectColors = (type: EffectType) => {
    switch (type) {
      case 'slime': return { primary: '#22c55e', secondary: '#16a34a', text: 'text-green-600' };
      case 'ink': return { primary: '#1e1b4b', secondary: '#312e81', text: 'text-indigo-900' };
      case 'custom': return { primary: '#94a3b8', secondary: '#64748b', text: 'text-slate-600' };
      default: return { primary: '#ef4444', secondary: '#dc2626', text: 'text-red-600' };
    }
  };

  return (
    <div 
      className="relative min-h-screen overflow-hidden font-sans select-none"
      style={{ backgroundColor: bgColor }}
    >
      {/* Background Texture / Grid - Removed for Green Screen */}

      {/* Main Splat Area */}
      <div className="absolute inset-0 z-10">
        <AnimatePresence>
          {splats.map((splat) => (
            <motion.div
              key={splat.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: splat.scale, opacity: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              style={{
                position: 'absolute',
                left: `${splat.x}%`,
                top: `${splat.y}%`,
                rotate: `${splat.rotation}deg`,
                transform: 'translate(-50%, -50%)',
              }}
              className="pointer-events-none"
            >
              {/* Splat Shape */}
              <div className="relative">
                {splat.type === 'custom' && customImageUrl ? (
                  <img 
                    src={customImageUrl} 
                    alt="" 
                    className="w-[120px] h-[120px] object-contain drop-shadow-xl"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <svg width="120" height="120" viewBox="0 0 100 100" className="drop-shadow-xl">
                    <path
                      fill={getEffectColors(splat.type).primary}
                      d="M50,10 C65,10 80,20 85,35 C90,50 85,65 75,75 C65,85 50,90 35,85 C20,80 10,65 10,50 C10,35 20,20 35,15 C40,12 45,10 50,10 Z"
                      className="animate-pulse"
                      style={{ animationDuration: '3s' }}
                    />
                    <path
                      fill={getEffectColors(splat.type).secondary}
                      d="M30,30 C35,25 45,25 50,30 C55,35 55,45 50,50 C45,55 35,55 30,50 C25,45 25,35 30,30 Z"
                      opacity="0.4"
                    />
                    {/* Splat droplets */}
                    <circle cx="85" cy="25" r="5" fill={getEffectColors(splat.type).primary} />
                    <circle cx="15" cy="75" r="4" fill={getEffectColors(splat.type).primary} />
                    <circle cx="70" cy="85" r="6" fill={getEffectColors(splat.type).primary} />
                    <circle cx="20" cy="20" r="3" fill={getEffectColors(splat.type).primary} />
                  </svg>
                )}
                
                {/* Mini User Info */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm border px-2.5 py-1 rounded-full shadow-md ${
                    splat.type === 'tomato' ? 'border-red-100' : splat.type === 'slime' ? 'border-green-100' : splat.type === 'ink' ? 'border-indigo-100' : 'border-slate-100'
                  }`}
                >
                  <img src={splat.profilePictureUrl} alt="" className="w-4 h-4 rounded-full" referrerPolicy="no-referrer" />
                  <span className={`text-[10px] font-black whitespace-nowrap ${getEffectColors(splat.type).text}`}>{splat.nickname}</span>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Gift Explosions Area */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <AnimatePresence>
          {giftExplosions.map((explosion) => (
            <div key={explosion.id}>
              {/* Center Large Avatar */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  left: `${explosion.centerX}%`,
                  top: `${explosion.centerY}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="z-20"
              >
                <img 
                  src={explosion.profilePictureUrl} 
                  alt="" 
                  className="w-20 h-20 rounded-full border-4 border-white drop-shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
              
              {/* Mini Avatars Flying Out */}
              {explosion.miniAvatars.map((miniAvatar) => (
                <motion.div
                  key={miniAvatar.id}
                  initial={{
                    x: 0,
                    y: 0,
                    opacity: 1,
                    scale: 0.8
                  }}
                  animate={{
                    x: Math.cos(miniAvatar.angle) * miniAvatar.distance,
                    y: Math.sin(miniAvatar.angle) * miniAvatar.distance,
                    opacity: 0,
                    scale: 0.3
                  }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${explosion.centerX}%`,
                    top: `${explosion.centerY}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <img 
                    src={explosion.profilePictureUrl} 
                    alt="" 
                    className="rounded-full border-2 border-white drop-shadow-lg"
                    style={{
                      width: `${miniAvatar.size}px`,
                      height: `${miniAvatar.size}px`,
                    }}
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              ))}
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none z-40 flex flex-col p-6">
        {/* Header Stats - Leaderboard */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2 pointer-events-auto">
            <div className="bg-white/80 backdrop-blur-md border border-slate-200 p-4 rounded-3xl shadow-sm min-w-[200px]">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-red-100 rounded-lg">
                  <Heart className="text-red-500 fill-red-500" size={14} />
                </div>
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Top Người Thả Tim</span>
              </div>
              
              <div className="space-y-2">
                {(Object.values(userStats) as UserStats[])
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 5)
                  .map((user, idx) => (
                    <motion.div 
                      key={user.nickname}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[10px] font-black w-4 ${idx === 0 ? 'text-yellow-500' : 'text-slate-400'}`}>
                          {idx + 1}
                        </span>
                        <img 
                          src={user.profilePictureUrl} 
                          alt="" 
                          className="w-6 h-6 rounded-full border border-slate-100" 
                          referrerPolicy="no-referrer" 
                        />
                        <span className="text-[11px] font-bold text-slate-700 truncate">{user.nickname}</span>
                      </div>
                      <span className="text-[11px] font-black text-red-500">
                        {user.count.toLocaleString()}
                      </span>
                    </motion.div>
                  ))}
                
                {Object.keys(userStats).length === 0 && (
                  <div className="py-2 text-center">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Chưa có ai thả tim</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button 
              onClick={() => setShowConfig(true)}
              className="p-3 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors text-slate-600"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={clearSplats}
              className="p-3 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-sm hover:bg-red-50 hover:text-red-500 transition-colors text-slate-600"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        {/* Bottom Status - Removed */}
      </div>

      {/* Config Modal */}
      <AnimatePresence>
        {showConfig && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => status === 'connected' && setShowConfig(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
                      <Zap size={20} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800 tracking-tight">Tomato Splat</h2>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">TikTok Interactive</p>
                    </div>
                  </div>
                  {status === 'connected' && (
                    <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                      <X size={20} className="text-slate-400" />
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">TikTok Username</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={tiktokId}
                        onChange={(e) => setTiktokId(e.target.value)}
                        placeholder="@username"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-800 font-bold outline-none focus:border-red-500/50 transition-all"
                      />
                      {status === 'connecting' && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <button 
                      onClick={() => setConfigTab('like')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        configTab === 'like' ? 'bg-white shadow-sm text-red-500' : 'text-slate-400'
                      }`}
                    >
                      <Heart size={14} className={configTab === 'like' ? 'fill-red-500' : ''} />
                      Thả Tim
                    </button>
                    <button 
                      onClick={() => setConfigTab('gift')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        configTab === 'gift' ? 'bg-white shadow-sm text-yellow-500' : 'text-slate-400'
                      }`}
                    >
                      <Gift size={14} className={configTab === 'gift' ? 'fill-yellow-500' : ''} />
                      Tặng Quà
                    </button>
                    <button 
                      onClick={() => setConfigTab('chat')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        configTab === 'chat' ? 'bg-white shadow-sm text-blue-500' : 'text-slate-400'
                      }`}
                    >
                      <MessageSquare size={14} className={configTab === 'chat' ? 'fill-blue-500' : ''} />
                      Bình Luận
                    </button>
                  </div>

                  {configTab !== 'chat' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Âm thanh</label>
                          <button 
                            onClick={() => configTab === 'like' ? setLikeSoundEnabled(!likeSoundEnabled) : setGiftSoundEnabled(!giftSoundEnabled)}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all font-bold text-sm ${
                              (configTab === 'like' ? likeSoundEnabled : giftSoundEnabled)
                              ? 'bg-red-50 border-red-200 text-red-600' 
                              : 'bg-slate-50 border-slate-100 text-slate-400'
                            }`}
                          >
                            {(configTab === 'like' ? likeSoundEnabled : giftSoundEnabled) ? '🔊' : '🔇'}
                            {(configTab === 'like' ? likeSoundEnabled : giftSoundEnabled) ? 'Bật' : 'Tắt'}
                          </button>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hiệu ứng</label>
                          <div className="flex bg-slate-50 border-2 border-slate-100 rounded-2xl p-1">
                            {(['tomato', 'slime', 'ink', 'custom'] as EffectType[]).map((eff) => (
                              <button
                                key={eff}
                                onClick={() => configTab === 'like' ? setLikeEffect(eff) : setGiftEffect(eff)}
                                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${
                                  (configTab === 'like' ? likeEffect : giftEffect) === eff 
                                  ? 'bg-white shadow-sm text-slate-800 scale-105' 
                                  : 'text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                {eff === 'tomato' ? '🍅' : eff === 'slime' ? '🤢' : eff === 'ink' ? '🖋️' : <Upload size={12} className="mx-auto" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            {configTab === 'like' ? 'Số splat mỗi lần thả' : 'Số splat cơ bản'}
                          </label>
                          <input 
                            type="number" 
                            min="1"
                            max="50"
                            value={configTab === 'like' ? likeSplatCount : giftSplatCount}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              if (configTab === 'like') setLikeSplatCount(val);
                              else setGiftSplatCount(val);
                            }}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-slate-800 font-bold outline-none focus:border-red-500/50 transition-all text-sm"
                          />
                        </div>
                        {configTab === 'like' ? (
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Số Tim mỗi lần thả</label>
                            <input 
                              type="number" 
                              min="1"
                              max="1000"
                              value={likeThreshold}
                              onChange={(e) => setLikeThreshold(parseInt(e.target.value) || 1)}
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-slate-800 font-bold outline-none focus:border-red-500/50 transition-all text-sm"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Xu mỗi Splat</label>
                            <input 
                              type="number" 
                              min="1" 
                              max="1000"
                              value={giftCoinsPerSplat}
                              onChange={(e) => setGiftCoinsPerSplat(parseInt(e.target.value) || 1)}
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-slate-800 font-bold outline-none focus:border-red-500/50 transition-all text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Đọc Bình Luận (TTS)</label>
                          <button 
                            onClick={() => setTtsEnabled(!ttsEnabled)}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all font-bold text-sm ${
                              ttsEnabled 
                              ? 'bg-blue-50 border-blue-200 text-blue-600' 
                              : 'bg-slate-50 border-slate-100 text-slate-400'
                            }`}
                          >
                            {ttsEnabled ? '🔊' : '🔇'}
                            {ttsEnabled ? 'Đang Bật' : 'Đang Tắt'}
                          </button>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Chào người tham gia</label>
                          <button 
                            onClick={() => setWelcomeEnabled(!welcomeEnabled)}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all font-bold text-sm ${
                              welcomeEnabled 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                              : 'bg-slate-50 border-slate-100 text-slate-400'
                            }`}
                          >
                            {welcomeEnabled ? '🔊' : '🔇'}
                            {welcomeEnabled ? 'Đang Bật' : 'Đang Tắt'}
                          </button>
                        </div>
                      </div>

                      {welcomeEnabled && (
                        <div className="pt-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                            <span>Câu chào (Dùng {'{name}'} để thay tên)</span>
                          </label>
                          <input 
                            type="text" 
                            value={welcomeTemplate}
                            onChange={(e) => setWelcomeTemplate(e.target.value)}
                            placeholder="Chào mừng {name} đã tham gia phòng."
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-slate-800 font-bold outline-none focus:border-emerald-500/50 transition-all text-sm"
                          />
                        </div>
                      )}

                      {(ttsEnabled || welcomeEnabled) && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Giọng nói</label>
                            <select 
                              value={voices.length > 0 ? ttsVoice : ''}
                              onChange={(e) => setTtsVoice(e.target.value)}
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-slate-800 font-bold outline-none focus:border-blue-500/50 transition-all text-sm appearance-none"
                            >
                              {voices.length === 0 ? (
                                <option value="">Đang tải giọng nói...</option>
                              ) : (
                                voices.map((voice) => (
                                  <option key={voice.name} value={voice.name}>
                                    {voice.name} ({voice.lang})
                                  </option>
                                ))
                              )}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tốc độ ({ttsRate}x)</label>
                              <input 
                                type="range" 
                                min="0.5" 
                                max="2" 
                                step="0.1"
                                value={ttsRate}
                                onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cao độ ({ttsPitch})</label>
                              <input 
                                type="range" 
                                min="0.5" 
                                max="2" 
                                step="0.1"
                                value={ttsPitch}
                                onChange={(e) => setTtsPitch(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Màu nền</label>
                    <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-100 rounded-2xl p-2">
                      {['#00FF00', '#0000FF', '#000000', '#FFFFFF', '#f8fafc'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setBgColor(color)}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            bgColor === color ? 'border-red-500 scale-110 shadow-sm' : 'border-white'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <div className="w-px h-6 bg-slate-200 mx-1" />
                      <div className="relative flex-1">
                        <input 
                          type="color" 
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-lg py-1 px-2 pointer-events-none">
                          <Palette size={12} className="text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-600 uppercase">{bgColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {((configTab === 'like' ? likeEffect : giftEffect) === 'custom') && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 pt-2"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative group">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = URL.createObjectURL(file);
                                setCustomImageUrl(url);
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                          <div className={`p-4 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 transition-all ${
                            customImageUrl ? 'border-red-200 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                          }`}>
                            {customImageUrl ? (
                              <img src={customImageUrl} alt="" className="w-8 h-8 object-contain rounded-lg" />
                            ) : (
                              <ImageIcon size={20} className="text-slate-400" />
                            )}
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                              {customImageUrl ? 'Đổi Ảnh' : 'Tải Ảnh'}
                            </span>
                          </div>
                        </div>

                        <div className="relative group">
                          <input 
                            type="file" 
                            accept="audio/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = URL.createObjectURL(file);
                                setCustomSoundUrl(url);
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                          <div className={`p-4 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 transition-all ${
                            customSoundUrl ? 'border-red-200 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                          }`}>
                            <Music size={20} className={customSoundUrl ? 'text-red-500' : 'text-slate-400'} />
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 truncate w-full text-center px-2">
                              {customSoundUrl ? 'Đổi Nhạc' : 'Tải Nhạc'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {status === 'error' && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold">
                      {errorMessage}
                    </div>
                  )}

                  <div className="flex gap-3">
                    {status === 'connected' ? (
                      <button 
                        onClick={disconnectTiktok}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs"
                      >
                        Ngắt kết nối
                      </button>
                    ) : (
                      <button 
                        onClick={connectTiktok}
                        disabled={!tiktokId || status === 'connecting'}
                        className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-red-500/25 uppercase tracking-widest text-xs"
                      >
                        Kết nối ngay
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-100">
                  <div className="flex items-center gap-4 text-slate-400">
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <Heart size={16} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Thả Tim</span>
                    </div>
                    <div className="w-px h-4 bg-slate-100" />
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <MessageSquare size={16} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Bình Luận</span>
                    </div>
                    <div className="w-px h-4 bg-slate-100" />
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <Gift size={16} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Tặng Quà</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Instructions for user */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="bg-white/80 backdrop-blur-md border border-slate-200 px-4 py-2 rounded-2xl shadow-sm text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Thả tim để ném cà chua 🍅
        </div>
      </div>
    </div>
  );
}

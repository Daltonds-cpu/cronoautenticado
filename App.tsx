
import React, { useState, useEffect, Suspense, useRef, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { GlobeView } from './components/Globe';
import { SlotData, UserProfile, HistoryItem, Notification as NotificationType } from './types';
import { GLOBE_RADIUS, MOCK_USERS } from './constants';
import { Trophy, Camera, X, Clock, Heart, Bell, ChevronLeft, Loader2, Repeat, LogOut, Users, HelpCircle, MessageCircle, Maximize2, Zap, Target, ShieldCheck, Sparkles, Award, Wand2, RefreshCcw, Download, Tv, Ghost, Palette, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzePostImpact } from './services/geminiService';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User, 
  db, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  getDocs, 
  writeBatch, 
  increment 
} from './services/firebase';
import * as THREE from 'three';

const CAMERA_FILTERS = [
  { id: 'none', name: 'NORMAL', icon: <RefreshCcw size={16} /> },
  { id: 'noir', name: 'NOIR', icon: <div className="w-3 h-3 bg-zinc-500 rounded-full" /> },
  { id: 'neon', name: 'NEON', icon: <div className="w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(0,229,255,1)]" /> },
  { id: 'vhs', name: 'VHS', icon: <Tv size={14} className="text-purple-400" /> },
  { id: 'pixel', name: 'PIXEL', icon: <div className="w-3 h-3 bg-white grid grid-cols-2"><div className="bg-black"/><div className="bg-white"/><div className="bg-white"/><div className="bg-black"/></div> },
  { id: 'psycho', name: 'PSYCHO', icon: <Sparkles size={14} className="text-yellow-400" /> },
  { id: 'thermal', name: 'THERMAL', icon: <div className="w-3 h-3 bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500 rounded-full" /> },
  { id: 'invert', name: 'INVERT', icon: <div className="w-3 h-3 bg-white border border-black rounded-full" /> },
  { id: 'blur', name: 'DREAM', icon: <div className="w-3 h-3 bg-cyan-200/50 blur-[2px] rounded-full" /> },
  { id: 'mirror_h', name: 'ESPELHO H', icon: <div className="flex gap-0.5"><div className="w-1.5 h-3 bg-white" /><div className="w-1.5 h-3 bg-white/30" /></div> },
  { id: 'mirror_v', name: 'ESPELHO V', icon: <div className="flex flex-col gap-0.5"><div className="w-3 h-1.5 bg-white" /><div className="w-3 h-1.5 bg-white/30" /></div> },
  { id: 'kaleido', name: 'KALEIDO', icon: <Eye size={14} /> },
  { id: 'split', name: 'SPLIT', icon: <div className="flex flex-col gap-0.5"><div className="w-3 h-1.5 bg-white" /><div className="w-3 h-1.5 bg-white" /></div> },
  { id: 'rgb_shift', name: 'RGB', icon: <Zap size={14} className="text-red-400" /> },
  { id: 'sketch', name: 'SKETCH', icon: <Palette size={14} /> },
  { id: 'sepia', name: 'SEPIA', icon: <div className="w-3 h-3 bg-[#704214] rounded-full" /> },
  { id: 'glitch', name: 'GLITCH', icon: <Zap size={14} className="text-purple-400" /> },
  { id: 'poster', name: 'POSTER', icon: <div className="w-3 h-3 bg-gradient-to-tr from-red-500 via-yellow-500 to-blue-500 rounded-full" /> }
];

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
};

const generateInitialSlots = (): SlotData[] => {
  const slots: SlotData[] = [];
  const baseIco = new THREE.IcosahedronGeometry(GLOBE_RADIUS, 2);
  const positionAttribute = baseIco.getAttribute('position');
  const vertexMap = new Map<string, THREE.Vector3>();

  for (let i = 0; i < positionAttribute.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
    const key = `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`;
    if (!vertexMap.has(key)) vertexMap.set(key, v.clone());
  }

  const points = Array.from(vertexMap.values());
  points.forEach((pos: THREE.Vector3, i: number) => {
    const randomUser = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
    slots.push({
      id: i,
      occupantName: randomUser.name,
      occupantAvatar: randomUser.avatar,
      occupantId: `mock_user_${i % 5}`,
      title: "SETOR ATIVO",
      imageUrl: `https://picsum.photos/seed/crono${i + 9000}/800/800`,
      startTime: Date.now() - Math.floor(Math.random() * 8000000),
      likes: 0,
      position: [pos.x, pos.y, pos.z],
      sides: (i % 7 === 0) ? 5 : 6
    });
  });
  return slots;
};

const DynamicMedia: React.FC<{ src: string; className?: string }> = ({ src, className }) => {
  const [frames, setFrames] = useState<string[]>([]);
  const [currentFrame, setCurrentFrame] = useState<number>(0);

  useEffect(() => {
    if (src.startsWith('LOOP:')) {
      try { 
        const parsed = JSON.parse(src.replace('LOOP:', ''));
        if (Array.isArray(parsed)) setFrames(parsed);
      } 
      catch (e) { setFrames([src]); }
    } else { setFrames([src]); }
  }, [src]);

  useEffect(() => {
    if (frames.length > 1) {
      const interval = setInterval(() => setCurrentFrame((p) => (p + 1) % frames.length), 120);
      return () => clearInterval(interval);
    }
  }, [frames]);

  return <img src={frames[currentFrame] || ''} className={className} alt="Crono Media" />;
};

const App: React.FC = () => {
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userHistory, setUserHistory] = useState<HistoryItem[]>([]);
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [hoveredSlotId, setHoveredSlotId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isRankingOpen, setIsRankingOpen] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isIntroOpen, setIsIntroOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [postingStep, setPostingStep] = useState<'mode_select' | 'camera' | 'preview'>('mode_select');
  const [captureMode, setCaptureMode] = useState<'photo' | 'gif'>('photo');
  const [activeFilter, setActiveFilter] = useState<string>('none');
  const [capturedMedia, setCapturedMedia] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingProgress, setRecordingProgress] = useState<number>(0);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [visitCount, setVisitCount] = useState<number>(0);
  const [introStep, setIntroStep] = useState<number>(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const framesBuffer = useRef<string[]>([]);
  const userSubRef = useRef<(() => void) | null>(null);

  // Callback ref to handle video element mounting and stream assignment
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    if (node) {
      (videoRef as any).current = node;
      if (stream) {
        node.srcObject = stream;
        node.play().catch(e => console.error("Video play error on mount:", e));
      }
    }
  }, [stream]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.log("SW registration error: ", err));
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setDeferredPrompt(null);
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user: User | null) => {
      if (userSubRef.current) {
        userSubRef.current();
        userSubRef.current = null;
      }

      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        userSubRef.current = onSnapshot(userDocRef, (docSnap) => {
          const profileData = {
            name: user.displayName?.toUpperCase() || 'VIAJANTE DO TEMPO',
            avatar: user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`,
          };

          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile({
              ...profileData,
              maxTimeSeconds: data.maxTimeSeconds || 0,
              totalLikes: data.totalLikes || 0,
              likedPosts: data.likedPosts || []
            });
            setIsLoggedIn(true);
            setIsAuthChecking(false);
          } else {
            const initialProfile = {
              ...profileData,
              maxTimeSeconds: 0,
              totalLikes: 0,
              likedPosts: []
            };
            setDoc(userDocRef, initialProfile).then(() => {
              setUserProfile(initialProfile);
              setIsLoggedIn(true);
              setIsAuthChecking(false);
            });
          }
        });
        
        const savedHistory = localStorage.getItem(`crono_history_${user.uid}`);
        if (savedHistory) setUserHistory(JSON.parse(savedHistory));
      } else {
        setIsLoggedIn(false);
        setUserProfile(null);
        setIsAuthChecking(false);
      }
    });

    const q = query(collection(db, "slots"));
    const unsubscribeSlots = onSnapshot(q, (snapshot) => {
      const fetchedSlots: SlotData[] = [];
      snapshot.forEach((doc) => {
        fetchedSlots.push(doc.data() as SlotData);
      });

      if (fetchedSlots.length === 0) {
        const initial = generateInitialSlots();
        setSlots(initial);
        if (auth.currentUser) {
          const batch = writeBatch(db);
          initial.forEach(slot => {
            const docRef = doc(db, "slots", slot.id.toString());
            batch.set(docRef, slot);
          });
          batch.commit();
        }
      } else {
        setSlots(fetchedSlots.sort((a, b) => a.id - b.id));
      }
    });

    const statsRef = doc(db, "stats", "global");
    updateDoc(statsRef, { visits: increment(1) }).catch(() => {
      setDoc(statsRef, { visits: 1 }, { merge: true });
    });

    const unsubscribeGlobalStats = onSnapshot(statsRef, (docSnap) => {
      if (docSnap.exists()) {
        setVisitCount(docSnap.data().visits || 0);
      }
    });

    const introSeen = localStorage.getItem('crono_intro_seen');
    if (!introSeen) setIsIntroOpen(true);

    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      unsubscribeAuth();
      unsubscribeSlots();
      unsubscribeGlobalStats();
      if (userSubRef.current) userSubRef.current();
      clearInterval(timer);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      addNotification("O App já está na tela inicial.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      addNotification("Sincronizando com a Malha Local...");
      setDeferredPrompt(null);
    }
  };

  const calculatedTotalLikes = useMemo(() => {
    return userProfile ? userProfile.totalLikes : 0;
  }, [userProfile]);

  useEffect(() => {
    if (postingStep === 'camera' && stream && videoRef.current) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch(e => console.error("Camera playback error:", e));
    }
  }, [postingStep, stream]);

  const handleCloseIntro = () => {
    localStorage.setItem('crono_intro_seen', 'true');
    setIsIntroOpen(false);
  };

  const addNotification = (message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, message, timestamp: Date.now() }]);
    setTimeout(() => setNotifications((p) => p.filter((n) => n.id !== id)), 6000);
  };

  const handleGoogleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      addNotification("Conexão estabelecida.");
    } catch (error: any) {
      console.error("Erro no login:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        addNotification("Login cancelado.");
      } else {
        addNotification("Falha na sincronização.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      addNotification("Sessão encerrada.");
    } catch (error) {
      console.error("Erro no logout:", error);
    }
  };

  const handleWhatsAppInvite = () => {
    const text = encodeURIComponent("Junte-se a mim na Crono Esfera! Domine o tempo agora: " + window.location.href);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleLike = async (id: number, isSimulated: boolean = false) => {
    const slot = slots.find((s) => s.id === id);
    if (!slot) return;
    
    if (!userProfile && !isSimulated) {
      addNotification("Faça login para curtir.");
      return;
    }

    const postKey = `${slot.id}-${slot.startTime}`;
    if (!isSimulated && userProfile?.likedPosts?.includes(postKey)) {
      addNotification("Este registro já foi reconhecido.");
      return;
    }

    try {
      const batch = writeBatch(db);
      
      const slotRef = doc(db, "slots", id.toString());
      batch.update(slotRef, { likes: increment(1) });
      
      if (slot.occupantId) {
        const occupantRef = doc(db, "users", slot.occupantId);
        batch.set(occupantRef, { totalLikes: increment(1) }, { merge: true });
      }

      if (auth.currentUser && !isSimulated) {
        const currentUserRef = doc(db, "users", auth.currentUser.uid);
        const updatedLikedPosts = [...(userProfile?.likedPosts || []), postKey];
        batch.set(currentUserRef, { likedPosts: updatedLikedPosts }, { merge: true });
        addNotification("Reconhecimento enviado com sucesso.");
      }

      await batch.commit();
    } catch (error) {
      console.error("Erro crítico na operação de Like:", error);
      addNotification("Erro na sincronização de reconhecimento.");
    }
  };

  const startCamera = async (mode: 'user' | 'environment' = 'user') => {
    setIsCameraLoading(true);
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: mode, width: 480, height: 480 }, 
        audio: false 
      });
      setStream(newStream);
      setPostingStep('camera');
      setActiveFilter('none');
    } catch (err) { 
      addNotification("Câmera bloqueada."); 
      console.error(err);
    } finally { 
      setIsCameraLoading(false); 
    }
  };

  const handleSwitchCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    cancelAnimationFrame(requestRef.current);
  };

  const processFrame = () => {
    if (postingStep !== 'camera') return;

    if (!videoRef.current || !canvasRef.current) {
      requestRef.current = requestAnimationFrame(processFrame);
      return;
    }
    
    // Safety check for stream attachment
    if (stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }

    if (videoRef.current.readyState < 2) {
      requestRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvasRef.current;
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;

    // Reset Filter
    ctx.filter = 'none';

    // Apply Filter Logic
    if (activeFilter === 'noir') ctx.filter = 'grayscale(100%) contrast(1.4)';
    if (activeFilter === 'neon') ctx.filter = 'brightness(1.5) saturate(2.5) contrast(1.1) hue-rotate(180deg)';
    if (activeFilter === 'invert') ctx.filter = 'invert(100%)';
    if (activeFilter === 'blur') ctx.filter = 'blur(4px) brightness(1.2)';
    if (activeFilter === 'poster') ctx.filter = 'contrast(2) saturate(2) brightness(0.9) grayscale(20%)';
    if (activeFilter === 'vhs') ctx.filter = 'contrast(1.2) saturate(0.5) brightness(1.1) grayscale(20%)';
    if (activeFilter === 'psycho') ctx.filter = `hue-rotate(${Date.now() % 360}deg) saturate(3)`;
    if (activeFilter === 'thermal') ctx.filter = 'invert(100%) hue-rotate(180deg) saturate(5)';
    if (activeFilter === 'sepia') ctx.filter = 'sepia(100%) contrast(1.1)';
    if (activeFilter === 'sketch') ctx.filter = 'grayscale(100%) contrast(1000%) invert(100%)';

    ctx.save();
    
    // Selfie mode flipping (only for user camera)
    if (facingMode === 'user') {
      ctx.scale(-1, 1);
      ctx.translate(-width, 0);
    }

    if (activeFilter === 'pixel') {
      ctx.imageSmoothingEnabled = false;
      const pixelSize = 16;
      ctx.drawImage(videoRef.current, 0, 0, pixelSize, pixelSize, 0, 0, width, height);
    } else if (activeFilter === 'mirror_h') {
      ctx.drawImage(videoRef.current, 0, 0, width / 2, height, 0, 0, width / 2, height);
      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0, width / 2, height, 0, 0, width / 2, height);
      ctx.restore();
    } else if (activeFilter === 'mirror_v') {
      ctx.drawImage(videoRef.current, 0, 0, width, height / 2, 0, 0, width, height / 2);
      ctx.save();
      ctx.translate(0, height);
      ctx.scale(1, -1);
      ctx.drawImage(videoRef.current, 0, 0, width, height / 2, 0, 0, width, height / 2);
      ctx.restore();
    } else if (activeFilter === 'kaleido') {
      const halfW = width / 2;
      const halfH = height / 2;
      ctx.drawImage(videoRef.current, 0, 0, halfW, halfH, 0, 0, halfW, halfH);
      ctx.save(); ctx.translate(width, 0); ctx.scale(-1, 1); ctx.drawImage(videoRef.current, 0, 0, halfW, halfH, 0, 0, halfW, halfH); ctx.restore();
      ctx.save(); ctx.translate(0, height); ctx.scale(1, -1); ctx.drawImage(videoRef.current, 0, 0, halfW, halfH, 0, 0, halfW, halfH); ctx.restore();
      ctx.save(); ctx.translate(width, height); ctx.scale(-1, -1); ctx.drawImage(videoRef.current, 0, 0, halfW, halfH, 0, 0, halfW, halfH); ctx.restore();
    } else if (activeFilter === 'split') {
      ctx.drawImage(videoRef.current, 0, 0, width, height / 2, 0, 0, width, height / 2);
      ctx.drawImage(videoRef.current, 0, 0, width, height / 2, 0, height / 2, width, height / 2);
    } else if (activeFilter === 'rgb_shift') {
      const shift = 5;
      ctx.globalCompositeOperation = 'screen';
      ctx.filter = 'none'; 
      ctx.fillStyle = 'red';
      ctx.drawImage(videoRef.current, shift, 0, width, height);
      ctx.fillStyle = 'green';
      ctx.drawImage(videoRef.current, 0, 0, width, height);
      ctx.fillStyle = 'blue';
      ctx.drawImage(videoRef.current, -shift, 0, width, height);
    } else if (activeFilter === 'glitch') {
      const offset = Math.sin(Date.now() / 50) * 10;
      ctx.drawImage(videoRef.current, offset, 0, width, height);
      ctx.globalAlpha = 0.5;
      ctx.filter = 'hue-rotate(90deg) brightness(2)';
      ctx.drawImage(videoRef.current, -offset, 2, width, height);
    } else {
      ctx.drawImage(videoRef.current, 0, 0, width, height);
    }

    ctx.restore();

    // Overlays
    if (activeFilter === 'vhs') {
      // Scanlines
      ctx.fillStyle = 'rgba(18, 16, 16, 0.1)';
      for (let i = 0; i < height; i += 4) {
        ctx.fillRect(0, i, width, 1);
      }
      // Noise
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (Math.random() > 0.95) {
          const val = Math.random() * 255;
          data[i] = val; data[i+1] = val; data[i+2] = val;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }
    
    requestRef.current = requestAnimationFrame(processFrame);
  };

  useEffect(() => { 
    if (postingStep === 'camera' && stream) {
      processFrame(); 
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [postingStep, activeFilter, stream, facingMode]);

  const handleCapture = () => {
    if (!canvasRef.current) return;
    if (captureMode === 'photo') {
      setCapturedMedia(canvasRef.current.toDataURL('image/jpeg', 0.8));
      stopCamera(); 
      setPostingStep('preview');
    } else {
      setIsRecording(true);
      setRecordingProgress(0);
      framesBuffer.current = [];
      const interval = setInterval(() => {
        if (framesBuffer.current.length >= 20) {
          clearInterval(interval); 
          setIsRecording(false);
          setCapturedMedia(`LOOP:${JSON.stringify(framesBuffer.current)}`);
          stopCamera(); 
          setPostingStep('preview');
        } else {
          if (canvasRef.current) {
            framesBuffer.current.push(canvasRef.current.toDataURL('image/jpeg', 0.45));
            setRecordingProgress((framesBuffer.current.length / 20) * 100);
          }
        }
      }, 100);
    }
  };

  const handleFinalPost = async () => {
    if (!newTitle || !capturedMedia || selectedSlotId === null || !userProfile || !auth.currentUser) return;
    setIsAnalyzing(true);
    const now = Date.now();
    const aiFeedbackPromise = analyzePostImpact(newTitle, userProfile.name);
    const newHistoryItem: HistoryItem = { id: `${selectedSlotId}-${now}`, imageUrl: capturedMedia, title: newTitle.toUpperCase(), finalDurationSeconds: 0, timestamp: now };
    setUserHistory((prev) => {
      const updatedHistory = [newHistoryItem, ...prev].slice(0, 50);
      localStorage.setItem(`crono_history_${auth.currentUser?.uid}`, JSON.stringify(updatedHistory));
      return updatedHistory;
    });
    try {
      const slotRef = doc(db, "slots", selectedSlotId.toString());
      const updatedSlot: Partial<SlotData> = { 
        occupantName: userProfile.name, 
        occupantAvatar: userProfile.avatar, 
        occupantId: auth.currentUser.uid,
        title: newTitle.toUpperCase(), 
        startTime: now, 
        imageUrl: capturedMedia, 
        likes: 0 
      };
      await updateDoc(slotRef, updatedSlot);
      setIsPosting(false); setPostingStep('mode_select'); setCapturedMedia(null); setNewTitle(''); setSelectedSlotId(null);
      setFacingMode('user'); // Reset to front camera for next time
      const aiComment = await aiFeedbackPromise;
      setIsAnalyzing(false);
      addNotification(`IA: "${aiComment}"`);
    } catch (error) {
      console.error("Erro ao publicar:", error);
      setIsAnalyzing(false);
      addNotification("Erro na malha temporal.");
    }
  };

  const handleBackStep = () => {
    if (postingStep === 'camera') {
      stopCamera();
      setFacingMode('user'); // Reset to front camera
      setPostingStep('mode_select');
    } else if (postingStep === 'preview') {
      setCapturedMedia(null);
      // Ensure we clear any old stream before starting a new one
      stopCamera(); 
      setTimeout(() => {
        startCamera(facingMode);
      }, 50);
    } else {
      stopCamera();
      setFacingMode('user'); // Reset to front camera
      setIsPosting(false);
    }
  };

  const leaderboard = useMemo(() => [...slots].sort((a, b) => a.startTime - b.startTime).slice(0, 10), [slots]);
  const currentSlot = useMemo(() => slots.find((s) => s.id === selectedSlotId), [slots, selectedSlotId]);
  const recentHistory = useMemo(() => [...userHistory].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5), [userHistory]);

  const introSteps = [
    { title: "BEM-VINDO À CRONO ESFERA", desc: "Uma arena global onde a visibilidade é o único recurso que importa.", icon: <Clock className="text-cyan-400" size={40} /> },
    { title: "O TEMPO É SEU PODER", desc: "Cada setor é disputado em tempo real. Quanto mais tempo você dominar, maior será seu legado.", icon: <Zap className="text-yellow-400" size={40} /> },
    { title: "REIVINDIQUE O ESPAÇO", desc: "Use sua câmera para registrar sua presença e expulsar o ocupante atual.", icon: <Target className="text-red-400" size={40} /> },
    { title: "ESTEJA PRONTO", desc: "Sua imagem ficará exposta para o mundo até que alguém seja mais rápido que você.", icon: <ShieldCheck className="text-green-400" size={40} /> }
  ];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#020205] text-white font-inter">
      
      <AnimatePresence>
        {isAuthChecking ? (
          <motion.div key="auth-splash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[11000] bg-[#020205] flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="animate-spin text-cyan-400 mb-6" size={48} />
            <h2 className="text-xs font-orbitron font-black text-cyan-500 uppercase tracking-[0.5em] animate-pulse">Sincronizando Malha Temporal...</h2>
          </motion.div>
        ) : isIntroOpen ? (
          <motion.div key="intro-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-6 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-md bg-zinc-900 border border-cyan-500/20 rounded-[2.5rem] p-10 text-center">
              <div className="mb-8 flex justify-center">{introSteps[introStep].icon}</div>
              <h2 className="text-2xl font-orbitron font-black uppercase mb-4 tracking-tighter italic">{introSteps[introStep].title}</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-10 h-16">{introSteps[introStep].desc}</p>
              <div className="flex gap-2 justify-center mb-10">
                {introSteps.map((_, i) => (
                  <div key={i} className={`h-1 w-8 rounded-full transition-all ${i === introStep ? 'bg-cyan-400' : 'bg-white/10'}`} />
                ))}
              </div>
              <button onClick={() => introStep < introSteps.length - 1 ? setIntroStep(introStep + 1) : handleCloseIntro()} className="w-full py-5 bg-cyan-500 text-black font-orbitron font-black rounded-2xl text-xs uppercase tracking-[0.2em] shadow-lg">
                {introStep < introSteps.length - 1 ? "PRÓXIMO" : "SINCRONIZAR"}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="fixed top-20 right-4 z-[5000] flex flex-col gap-2 pointer-events-none w-full max-w-[280px]">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div key={n.id} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 50, opacity: 0 }} className="pointer-events-auto bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-xl flex gap-3 items-center shadow-2xl">
              <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg"><Bell size={14} /></div>
              <p className="text-[10px] font-bold uppercase tracking-wider">{n.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!isAuthChecking && (isLoggedIn && userProfile ? (
        <>
          <div className="absolute inset-0 z-0">
            <Canvas camera={{ position: [0, 0, 22], fov: 40 }} dpr={[1, 2]}>
              <Suspense fallback={null}>
                <GlobeView 
                  slots={slots} 
                  onSlotClick={(id) => setSelectedSlotId(id)} 
                  onHover={(id) => setHoveredSlotId(id)} 
                  selectedSlotId={selectedSlotId} 
                  hoveredSlotId={hoveredSlotId} 
                />
              </Suspense>
            </Canvas>
          </div>

          <header className="absolute top-0 left-0 w-full p-4 md:p-8 flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4 z-[100] pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-4">
              <div className="text-center sm:text-left">
                <h1 className="text-lg md:text-2xl font-orbitron font-black italic tracking-tighter flex items-center gap-2">
                  <Clock className="text-cyan-400" size={24} /> <span>CRONO</span> <span className="text-cyan-400">ESFERA</span>
                </h1>
                <p className="text-[8px] font-orbitron text-cyan-500/50 tracking-[0.6em] mt-1 uppercase">Malha Ativa</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setIsAboutOpen(true); }} className="p-2 bg-white/5 border border-white/10 rounded-full hover:text-cyan-400 transition-all pointer-events-auto shadow-xl">
                <HelpCircle size={18} />
              </button>
            </div>
            <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 pointer-events-auto">
              <button onClick={() => setIsProfileOpen(true)} className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 p-1.5 pr-4 rounded-full flex items-center gap-3 hover:bg-white/10 transition-all shadow-xl group">
                <img src={userProfile.avatar} className="w-8 h-8 rounded-full border border-cyan-500" alt="Avatar" />
                <div className="flex flex-col items-start min-w-[80px]">
                  <span className="text-[10px] font-black font-orbitron text-cyan-400 uppercase tracking-widest truncate max-w-[120px]">{userProfile.name}</span>
                  <span className="text-[8px] font-orbitron text-red-500 flex items-center gap-1"><Heart size={8} className="fill-current" /> {calculatedTotalLikes} LIKES</span>
                </div>
              </button>
              <button onClick={() => setIsRankingOpen(true)} className="bg-cyan-500/10 border border-cyan-500/30 px-5 py-2 rounded-full text-cyan-400 font-orbitron font-black text-[9px] flex items-center gap-2 hover:bg-cyan-500/20 transition-all shadow-md">
                <Trophy size={14} /> <span>LEADERBOARD</span>
              </button>
            </div>
          </header>

          <div className="fixed bottom-8 right-8 z-[1000] flex gap-4">
            <AnimatePresence>
              {deferredPrompt && (
                <motion.button 
                  initial={{ opacity: 0, scale: 0.5, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.5, x: 20 }}
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.9 }} 
                  onClick={handleInstallApp} 
                  className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-purple-600 text-white rounded-2xl flex items-center justify-center shadow-2xl border-2 border-white/20 hover:brightness-110 transition-all cursor-pointer"
                  title="Instalar App Android"
                >
                  <Download size={28} />
                </motion.button>
              )}
            </AnimatePresence>
            <motion.button 
              whileHover={{ scale: 1.1 }} 
              whileTap={{ scale: 0.9 }} 
              onClick={handleWhatsAppInvite} 
              className="w-14 h-14 bg-[#25D366] text-white rounded-2xl flex items-center justify-center shadow-2xl border-2 border-white/20 hover:brightness-110 transition-all cursor-pointer"
              title="Compartilhar"
            >
              <MessageCircle size={28} />
            </motion.button>
          </div>

          {!selectedSlotId && !isPosting && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-24 sm:bottom-12 left-0 right-0 z-[50] pointer-events-none flex flex-col items-center px-6">
              <p className="font-orbitron text-[10px] font-bold text-cyan-400 tracking-[0.5em] uppercase text-center drop-shadow-xl">SELECIONE UM SETOR NA ESFERA</p>
            </motion.div>
          )}
        </>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[9000] bg-black flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-6xl md:text-8xl font-orbitron font-black tracking-tighter italic glitch-text mb-12" data-text="CRONOESFERA">CRONO<span className="text-cyan-400">ESFERA</span></h1>
          <div className="max-w-xs w-full space-y-6">
            <p className="text-zinc-500 font-orbitron text-[9px] uppercase tracking-[0.3em] mb-4">Acesso exclusivo via rede neural Google</p>
            <button onClick={handleGoogleLogin} disabled={isLoggingIn} className="w-full bg-white text-black px-12 py-5 rounded-2xl font-orbitron font-black text-xs tracking-[0.2em] flex items-center justify-center gap-4 hover:scale-105 transition-all shadow-2xl active:scale-95 cursor-pointer disabled:opacity-50">
              {isLoggingIn ? <Loader2 className="animate-spin" size={18} /> : <><Users size={18} /> ENTRAR COM GOOGLE</>}
            </button>
          </div>
        </motion.div>
      ))}

      <AnimatePresence>
        {isRankingOpen && (
          <motion.div key="ranking-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
            <div onClick={() => setIsRankingOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-[2rem] p-8 shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-orbitron font-black text-white italic uppercase flex items-center gap-4"><Trophy className="text-yellow-500" size={24} /> LEADERBOARD</h2>
                <button onClick={() => setIsRankingOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                {leaderboard.map((slot, idx) => (
                  <div key={slot.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                    <span className="text-xl font-orbitron font-black text-white/20 w-8 text-center">#{idx + 1}</span>
                    <img src={slot.occupantAvatar} className="w-10 h-10 rounded-full border border-white/10" alt="Avatar" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-orbitron font-bold text-cyan-400 truncate uppercase">{slot.occupantName}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{slot.title}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2"><p className="text-[10px] font-orbitron font-bold">{formatDuration(currentTime - slot.startTime)}</p></div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {isProfileOpen && (
          <motion.div key="profile-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
            <div onClick={() => setIsProfileOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-[2rem] p-8 md:p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
              <button onClick={() => setIsProfileOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              <div className="text-center mb-8">
                <img src={userProfile?.avatar} className="w-24 h-24 rounded-full border-2 border-cyan-500 mx-auto mb-4" alt="Avatar" />
                <h3 className="text-2xl font-orbitron font-black uppercase mb-6 tracking-tight">{userProfile?.name}</h3>
                <div className="flex justify-center gap-8">
                  <div className="text-center">
                    <p className="text-[10px] font-orbitron text-zinc-500 uppercase tracking-widest mb-1">TOTAL DE LIKES</p>
                    <div className="flex items-center gap-2 justify-center text-red-500"><Heart size={20} className="fill-current" /><span className="text-3xl font-orbitron font-black">{calculatedTotalLikes}</span></div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <h4 className="text-[11px] font-orbitron font-black text-cyan-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Clock size={14} /> ÚLTIMAS 5 ATIVIDADES</h4>
                  <div className="space-y-3">
                    {recentHistory.length > 0 ? recentHistory.map((item, idx) => (
                      <div key={item.id} className="bg-white/5 border border-white/5 rounded-2xl p-3 flex items-center gap-4 group hover:bg-white/10 transition-all">
                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 shrink-0"><DynamicMedia src={item.imageUrl} className="w-full h-full object-cover" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-orbitron font-black text-cyan-400 uppercase truncate mb-1">{item.title}</p>
                          <div className="flex items-center gap-2 text-zinc-500"><Clock size={12} /><span className="text-[10px] font-medium">{new Date(item.timestamp).toLocaleDateString()}</span></div>
                        </div>
                        <div className="text-zinc-700 font-orbitron font-black text-lg">#{idx + 1}</div>
                      </div>
                    )) : (
                      <div className="py-8 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl">
                        <p className="text-[10px] font-orbitron text-zinc-600 uppercase tracking-widest">Nenhuma atividade registrada ainda</p>
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={handleLogout} className="w-full py-5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-500 font-orbitron font-black text-xs uppercase flex items-center justify-center gap-3 hover:bg-red-500/20 transition-all shadow-xl"><LogOut size={16} /> ENCERRAR SESSÃO</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isAboutOpen && (
          <motion.div key="about-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[7000] flex items-center justify-center p-4">
            <div onClick={() => setIsAboutOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative w-full max-w-md bg-zinc-950 border border-cyan-500/30 rounded-[2.5rem] p-10 text-center shadow-2xl">
              <h2 className="text-2xl font-orbitron font-black text-white italic uppercase mb-6 tracking-tighter">SOBRE O PROJETO</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-8">CRONO ESFERA é uma arena social experimental onde sua presença física e o tempo são os pilares da sua reputação na malha temporal.</p>
              <div className="mt-2 pt-6 border-t border-cyan-500/20 mb-10">
                <p className="text-[10px] font-orbitron text-cyan-500/50 uppercase tracking-[0.3em] mb-4">Pulsações na Rede</p>
                <div className="flex justify-center gap-2">
                  {visitCount.toString().padStart(6, '0').split('').map((digit, i) => (
                    <div key={i} className="w-9 h-12 bg-cyan-500/5 border border-cyan-500/20 rounded-md flex items-center justify-center relative overflow-hidden shadow-inner">
                      <span className="text-2xl font-orbitron font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]">{digit}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setIsAboutOpen(false)} className="w-full py-4 bg-cyan-500 text-black rounded-2xl font-orbitron font-black text-[10px] uppercase tracking-widest hover:brightness-110 shadow-lg">RETORNAR À ESFERA</button>
            </motion.div>
          </motion.div>
        )}

        {selectedSlotId !== null && !isPosting && currentSlot && (
          <motion.div key="slot-details-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] flex items-center justify-center p-4">
             <div onClick={() => setSelectedSlotId(null)} className="absolute inset-0 bg-black/90" />
             <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-lg bg-zinc-950/50 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col">
                <div className="absolute top-4 left-0 right-0 px-6 flex justify-between items-center z-10">
                   <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10"><span className="text-[9px] font-orbitron font-black text-cyan-400 uppercase tracking-widest">SETOR #{currentSlot.id}</span></div>
                   <button onClick={() => setSelectedSlotId(null)} className="p-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-white/50 hover:text-white transition-all"><X size={20} /></button>
                </div>
                <div className="relative aspect-square w-full bg-black flex items-center justify-center group overflow-hidden">
                   <DynamicMedia src={currentSlot.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]" />
                   <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent pointer-events-none" />
                </div>
                <div className="p-8 space-y-6">
                   <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                         <h3 className="text-xl md:text-2xl font-orbitron font-black italic tracking-tight truncate uppercase">{currentSlot.title}</h3>
                         <div className="flex items-center gap-2 mt-2">
                            <img src={currentSlot.occupantAvatar} className="w-6 h-6 rounded-full border border-cyan-500/50" alt="Occupant" />
                            <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">{currentSlot.occupantName}</span>
                         </div>
                      </div>
                      <div className="text-right shrink-0">
                         <p className="text-[9px] font-orbitron text-zinc-500 font-bold uppercase tracking-widest mb-1">Reconhecimentos</p>
                         <div className="flex items-center gap-2 justify-end text-red-500"><Heart size={14} className="fill-current" /><span className="text-lg font-orbitron font-black tracking-tighter">{currentSlot.likes || 0}</span></div>
                      </div>
                   </div>
                   <div className="flex gap-3">
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleLike(currentSlot.id)} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-orbitron font-black text-xs flex items-center justify-center gap-3 hover:bg-white/10 transition-all uppercase tracking-widest"><Heart size={18} className="text-red-500" /> CURTIR REGISTRO</motion.button>
                   </div>
                   <div className="pt-2 border-t border-white/5">
                      <div className="flex justify-between items-center mb-4">
                          <p className="text-[9px] font-orbitron text-zinc-500 font-bold uppercase tracking-widest">Permanência Atual</p>
                          <div className="flex items-center gap-2 text-cyan-400"><Clock size={14} /><span className="text-lg font-orbitron font-black tracking-tighter">{formatDuration(currentTime - currentSlot.startTime)}</span></div>
                      </div>
                      {currentSlot.occupantName !== userProfile?.name && (
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsPosting(true)} className="w-full py-5 bg-cyan-500 text-black rounded-2xl font-orbitron font-black text-xs uppercase tracking-[0.2em] hover:bg-cyan-400 transition-all flex items-center justify-center gap-3"><Maximize2 size={18} /> REIVINDICAR ESTE ESPAÇO</motion.button>
                      )}
                   </div>
                </div>
             </motion.div>
          </motion.div>
        )}

        {isPosting && (
          <motion.div key="posting-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[8000] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-[3rem] overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center shrink-0">
                <button onClick={handleBackStep} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><ChevronLeft size={20} /></button>
                <h2 className="text-lg md:text-xl font-orbitron font-black uppercase italic tracking-wider">Módulo de Captura</h2>
                <div className="w-10" />
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                {postingStep === 'mode_select' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-10">
                    <button onClick={() => { setCaptureMode('photo'); startCamera('user'); }} className="bg-white/5 border border-white/10 p-10 rounded-[2rem] flex flex-col items-center gap-6 hover:bg-cyan-500/10 transition-all group cursor-pointer"><Camera size={48} className="text-cyan-400 group-hover:scale-110 transition-transform" /><p className="font-orbitron font-black text-sm uppercase tracking-widest">REGISTRO FOTO</p></button>
                    <button onClick={() => { setCaptureMode('gif'); startCamera('user'); }} className="bg-white/5 border border-white/10 p-10 rounded-[2rem] flex flex-col items-center gap-6 hover:bg-purple-500/10 transition-all group cursor-pointer"><Repeat size={48} className="text-purple-400 group-hover:scale-110 transition-transform" /><p className="font-orbitron font-black text-sm uppercase tracking-widest">MALHA LOOP</p></button>
                  </div>
                )}
                {postingStep === 'camera' && (
                  <div className="space-y-8 flex flex-col items-center">
                    <div className="relative aspect-square w-full max-w-sm rounded-[2.5rem] overflow-hidden border-2 border-cyan-500/20 bg-black shadow-[0_0_30px_rgba(0,229,255,0.1)]">
                      <video ref={setVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none" />
                      <canvas ref={canvasRef} width={480} height={480} className="w-full h-full object-cover" />
                      
                      {/* Discrete Switch Camera Button */}
                      {!isRecording && !isCameraLoading && (
                        <button 
                          onClick={handleSwitchCamera} 
                          className="absolute top-6 right-6 p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-black/60 transition-all z-20 shadow-xl"
                        >
                          <RefreshCcw size={18} />
                        </button>
                      )}

                      {isRecording && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                           <Loader2 className="animate-spin text-cyan-400 mb-4" size={40} />
                           <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/10">
                             <motion.div initial={{ width: 0 }} animate={{ width: `${recordingProgress}%` }} className="h-full bg-cyan-400" />
                           </div>
                        </div>
                      )}
                    </div>

                    <div className="w-full">
                       <p className="text-[10px] font-orbitron font-black text-cyan-500/60 uppercase tracking-[0.3em] mb-4 text-center">Filtros de Legado</p>
                       <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-2 justify-center">
                         {CAMERA_FILTERS.map((f) => (
                           <button 
                             key={f.id} 
                             onClick={() => setActiveFilter(f.id)}
                             className={`flex flex-col items-center gap-2 shrink-0 transition-all ${activeFilter === f.id ? 'opacity-100 scale-110' : 'opacity-40 grayscale'}`}
                           >
                             <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center bg-zinc-800 ${activeFilter === f.id ? 'border-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.3)]' : 'border-white/10'}`}>
                               {f.icon}
                             </div>
                             <span className="text-[8px] font-orbitron font-black uppercase tracking-tighter">{f.name}</span>
                           </button>
                         ))}
                       </div>
                    </div>

                    {!isRecording && !isCameraLoading && (
                      <button onClick={handleCapture} className="w-full py-6 bg-cyan-500 text-black rounded-[2rem] font-orbitron font-black uppercase text-xs tracking-[0.3em] hover:brightness-110 transition-all shadow-[0_10px_30px_rgba(0,229,255,0.3)] flex items-center justify-center gap-4 cursor-pointer">
                        <Wand2 size={18} /> CAPTURAR REGISTRO
                      </button>
                    )}
                  </div>
                )}
                {postingStep === 'preview' && (
                  <div className="space-y-8">
                    <div className="flex flex-col md:flex-row gap-8 items-center bg-white/5 p-6 rounded-[2.5rem] border border-white/5">
                      <div className="w-48 h-48 rounded-[2rem] overflow-hidden border border-cyan-500/30 shrink-0 shadow-2xl"><DynamicMedia src={capturedMedia!} className="w-full h-full object-cover" /></div>
                      <div className="flex-1 w-full space-y-6">
                        <div className="space-y-2">
                           <p className="text-[10px] font-orbitron font-black text-cyan-500 uppercase tracking-widest">Título do Legado</p>
                           <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="INSIRA SUA MENSAGEM..." className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-cyan-500 uppercase font-orbitron font-bold tracking-tight shadow-inner" />
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-xl">
                           <Award size={16} className="text-cyan-400" />
                           <span className="text-[9px] font-orbitron text-cyan-400/80 uppercase font-bold tracking-widest">Protocolo de sincronização ativo</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={handleFinalPost} disabled={!newTitle || isAnalyzing} className="w-full py-6 bg-cyan-500 text-black rounded-[2rem] font-orbitron font-black uppercase text-xs tracking-[0.3em] shadow-[0_10px_30px_rgba(0,229,255,0.3)] flex items-center justify-center gap-4 disabled:opacity-50 transition-all cursor-pointer">
                      {isAnalyzing ? <><Loader2 className="animate-spin" size={18} /> SINCRONIZANDO...</> : <><Sparkles size={18} /> PUBLICAR NA MALHA</>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;

import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  getDoc 
} from 'firebase/firestore';
import { 
  Dices, 
  RotateCcw, 
  Trophy, 
  Copy, 
  Users, 
  Play, 
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  FlaskConical,
  Swords,
  HelpCircle,
  Check,
  Volume2,
  VolumeX,
  Sparkles,
  LogOut,
  Timer,
  AlertTriangle,
  CheckCheck
} from 'lucide-react';

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyCZmehJJD1XE-jhIt8GC9KCceiuNre_SuM",
  authDomain: "yachtdicepepe.firebaseapp.com",
  projectId: "yachtdicepepe",
  storageBucket: "yachtdicepepe.firebasestorage.app",
  messagingSenderId: "868674479708",
  appId: "1:868674479708:web:05017052d97dd4bc22e899",
  measurementId: "G-MVSGH4L3JQ"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "my-yacht-game-v1"; // 데이터 격리용

// --- Robust Copy Function ---
const copyToClipboard = (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers or restricted iframes
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Copy failed', err);
    }
    document.body.removeChild(textArea);
  }
};

// --- Sound Engine (Final Clean Version) ---
let globalAudioCtx = null;

const getAudioContext = () => {
  if (!globalAudioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      globalAudioCtx = new AudioContext();
    }
  }
  return globalAudioCtx;
};

const playSound = (type) => {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(e => console.error("Audio resume failed", e));
  }

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  switch (type) {
    case 'roll':
      // "Trrrck" - Short, crisp triplet sound (Final)
      const times = [0, 0.05, 0.1]; // 3 short ticks
      times.forEach((tOffset, i) => {
        const t = now + tOffset;
        const tickOsc = ctx.createOscillator();
        const tickGain = ctx.createGain();
        tickOsc.connect(tickGain);
        tickGain.connect(ctx.destination);
        
        tickOsc.frequency.value = 600 + (Math.random() * 200) - (i * 50); 
        tickOsc.type = 'square'; 
        
        tickGain.gain.setValueAtTime(0.08, t);
        tickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        
        tickOsc.start(t);
        tickOsc.stop(t + 0.04);
      });
      break;

    case 'lock':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.start(now);
      osc.stop(now + 0.03);
      break;

    case 'score':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      break;

    case 'yacht':
      const freqs = [440, 554, 659, 880];
      freqs.forEach((f, i) => {
        const yOsc = ctx.createOscillator();
        const yGain = ctx.createGain();
        yOsc.connect(yGain);
        yGain.connect(ctx.destination);
        yOsc.type = 'sine';
        yOsc.frequency.value = f;
        yGain.gain.setValueAtTime(0, now);
        yGain.gain.linearRampToValueAtTime(0.05, now + 0.1 + (i * 0.05));
        yGain.gain.linearRampToValueAtTime(0, now + 2);
        yOsc.start(now);
        yOsc.stop(now + 2.5);
      });
      break;

    case 'win':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.1);
      osc.frequency.linearRampToValueAtTime(800, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 1.5);
      osc.start(now);
      osc.stop(now + 1.5);
      break;
      
    default:
      break;
  }
};

// --- Game Constants & Logic ---
const CATEGORIES = [
  { id: 'ones', label: 'Ones', section: 'upper' },
  { id: 'twos', label: 'Twos', section: 'upper' },
  { id: 'threes', label: 'Threes', section: 'upper' },
  { id: 'fours', label: 'Fours', section: 'upper' },
  { id: 'fives', label: 'Fives', section: 'upper' },
  { id: 'sixes', label: 'Sixes', section: 'upper' },
  { id: 'choice', label: 'Choice', section: 'lower' },
  { id: 'fourOfAKind', label: '4 of a Kind', section: 'lower' },
  { id: 'fullHouse', label: 'Full House', section: 'lower' },
  { id: 'smallStraight', label: 'S. Straight (15)', section: 'lower' },
  { id: 'largeStraight', label: 'L. Straight (30)', section: 'lower' },
  { id: 'yacht', label: 'Yacht (50)', section: 'lower' },
];

const TURN_TIME_LIMIT = 45; // 45 Seconds

const calculateScore = (dice, categoryId) => {
  if (dice.some(d => d === 0)) return 0;

  const counts = {};
  dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
  const sum = dice.reduce((a, b) => a + b, 0);
  const uniqueDice = Object.keys(counts).map(Number).sort((a, b) => a - b);

  switch (categoryId) {
    case 'ones': return (counts[1] || 0) * 1;
    case 'twos': return (counts[2] || 0) * 2;
    case 'threes': return (counts[3] || 0) * 3;
    case 'fours': return (counts[4] || 0) * 4;
    case 'fives': return (counts[5] || 0) * 5;
    case 'sixes': return (counts[6] || 0) * 6;
    case 'choice': return sum;
    case 'fourOfAKind': 
      return Object.values(counts).some(c => c >= 4) ? sum : 0;
    case 'fullHouse':
      const hasThree = Object.values(counts).includes(3);
      const hasTwo = Object.values(counts).includes(2);
      const hasFive = Object.values(counts).includes(5); 
      return (hasThree && hasTwo) || hasFive ? sum : 0;
    case 'smallStraight':
      let consecutive = 0;
      for (let i = 0; i < uniqueDice.length - 1; i++) {
        if (uniqueDice[i+1] === uniqueDice[i] + 1) consecutive++;
        else consecutive = 0;
        if (consecutive >= 3) return 15;
      }
      return 0;
    case 'largeStraight':
      let lConsecutive = 0;
      for (let i = 0; i < uniqueDice.length - 1; i++) {
        if (uniqueDice[i+1] === uniqueDice[i] + 1) lConsecutive++;
        else lConsecutive = 0;
        if (lConsecutive >= 4) return 30;
      }
      return 0;
    case 'yacht':
      return Object.values(counts).includes(5) ? 50 : 0;
    default: return 0;
  }
};

const getUpperSum = (scores) => {
  return CATEGORIES
    .filter(c => c.section === 'upper')
    .reduce((acc, cat) => acc + (scores[cat.id] || 0), 0);
};

const calculateBonus = (scores) => {
  return getUpperSum(scores) >= 63 ? 35 : 0;
};

const calculateTotal = (scores) => {
  const sum = Object.values(scores).reduce((a, b) => a + b, 0);
  return sum + calculateBonus(scores);
};

// --- Components ---

const Dice = ({ value, isHeld, onClick, rolling, disabled, soundEnabled }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let interval;
    if (rolling && !isHeld) {
      interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
        // Sound is handled in parent
      }, 70); 
    } else {
      setDisplayValue(value);
    }
    return () => clearInterval(interval);
  }, [rolling, isHeld, value]);

  return (
    <button
      onClick={() => {
        if (!disabled) {
          onClick();
          if (soundEnabled) playSound('lock');
        }
      }}
      disabled={disabled}
      className={`
        w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-3xl font-bold
        transition-all duration-200 relative overflow-hidden select-none
        ${isHeld 
          ? 'bg-indigo-600 text-white shadow-inner ring-4 ring-indigo-300 scale-95' 
          : 'bg-white text-gray-800 shadow-[0_4px_0_0_rgba(0,0,0,0.2)] border-2 border-gray-200'}
        ${!disabled && !isHeld ? 'hover:-translate-y-1 hover:shadow-[0_6px_0_0_rgba(0,0,0,0.2)] cursor-pointer active:translate-y-0 active:shadow-none' : ''}
        ${disabled ? 'cursor-default opacity-90' : ''}
      `}
    >
      {displayValue === 0 ? <HelpCircle className="w-8 h-8 text-slate-300" /> : displayValue}
    </button>
  );
};

const YachtEffect = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none rounded-2xl">
      <div className="relative animate-in zoom-in-50 fade-in duration-500">
        <div className="absolute inset-0 bg-indigo-600 blur-3xl opacity-20"></div>
        <div className="bg-slate-900/90 backdrop-blur-md border border-indigo-500/50 px-10 py-6 rounded-2xl shadow-2xl flex flex-col items-center">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 tracking-tighter drop-shadow-sm">
            YACHT!
            </h1>
            <div className="text-sm font-bold text-indigo-200 tracking-[0.3em] mt-2 uppercase">
            50 Points
            </div>
        </div>
        <Sparkles className="absolute -top-6 -right-6 w-10 h-10 text-yellow-300 animate-pulse" />
        <Sparkles className="absolute -bottom-6 -left-6 w-10 h-10 text-pink-300 animate-pulse delay-300" />
      </div>
    </div>
  );
};

// Quit Modal Component
const QuitModal = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
        <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">나가시겠습니까?</h3>
        <p className="text-slate-400 mb-6 text-sm">
          게임을 종료하면 상대방이 승리(기권승)하게 됩니다.
        </p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition"
          >
            취소
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition"
          >
            나가기
          </button>
        </div>
      </div>
    </div>
  );
};

export default function YachtGame() {
  const [user, setUser] = useState(null);
  const [gameId, setGameId] = useState('');
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [authError, setAuthError] = useState(null);
  const [copied, setCopied] = useState(false);
  
  // UI State
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showYachtEffect, setShowYachtEffect] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState(TURN_TIME_LIMIT);
  const [showQuitModal, setShowQuitModal] = useState(false);

  // Test Mode State
  const [isTestMode, setIsTestMode] = useState(false);

  // Auth Init
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
        setAuthError("이 환경에서는 익명 로그인이 제한될 수 있습니다.");
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Active User Logic
  const activeUser = useMemo(() => {
    if (isTestMode && gameData?.currentTurn) {
      return { uid: gameData.currentTurn, displayName: 'Test Player' };
    }
    return user;
  }, [user, isTestMode, gameData?.currentTurn]);

  // Reset UI on turn change
  useEffect(() => {
    setSelectedCategory(null);
    setTimeLeft(TURN_TIME_LIMIT);
  }, [gameData?.currentTurn]);

  // Game Sync & Yacht Detection
  useEffect(() => {
    if (!user || !gameId) return;

    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGameData(data);
      } else {
        setErrorMsg("게임을 찾을 수 없습니다.");
        setGameData(null);
      }
    }, (error) => {
      console.error("Snapshot error:", error);
      setErrorMsg("데이터 로드 오류");
    });

    return () => unsubscribe();
  }, [user, gameId]);

  // Timer Logic
  useEffect(() => {
    if (!gameData || gameData.status !== 'playing') return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (activeUser?.uid === gameData.currentTurn) {
             handleTimeOut();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameData?.currentTurn, gameData?.status, activeUser]);

  // Yacht Effect Trigger
  useEffect(() => {
    if (gameData?.dice && !rolling) {
      const isYacht = gameData.dice.every(d => d !== 0 && d === gameData.dice[0]);
      if (isYacht) {
        setShowYachtEffect(true);
        if (soundEnabled) playSound('yacht');
        const timer = setTimeout(() => setShowYachtEffect(false), 2000); 
        return () => clearTimeout(timer);
      }
    }
  }, [gameData?.dice, rolling, soundEnabled]);

  const handleTimeOut = async () => {
    if (!gameData || !activeUser) return;
    
    // Auto-select first empty category with 0 score
    const currentPlayer = gameData.players[activeUser.uid];
    const emptyCat = CATEGORIES.find(c => currentPlayer.scores[c.id] === undefined);
    
    if (emptyCat) {
      const updatedScores = { ...currentPlayer.scores, [emptyCat.id]: 0 };
      const updatedPlayers = {
        ...gameData.players,
        [activeUser.uid]: { ...currentPlayer, scores: updatedScores }
      };
      
      const nextPlayerIndex = (gameData.playerOrder.indexOf(activeUser.uid) + 1) % 2;
      const nextPlayerUid = gameData.playerOrder[nextPlayerIndex];
      let nextStatus = gameData.status;
      let winner = null;

      const isGameEnd = Object.values(updatedPlayers).every(p => Object.keys(p.scores).length === CATEGORIES.length);
      if (isGameEnd) {
        nextStatus = 'finished';
        const p1Score = calculateTotal(updatedPlayers[gameData.playerOrder[0]].scores);
        const p2Score = calculateTotal(updatedPlayers[gameData.playerOrder[1]].scores);
        if (p1Score > p2Score) winner = gameData.playerOrder[0];
        else if (p2Score > p1Score) winner = gameData.playerOrder[1];
        else winner = 'draw';
      }

      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId), {
        players: updatedPlayers,
        currentTurn: nextStatus === 'finished' ? null : nextPlayerUid,
        rollsLeft: 3,
        dice: [0, 0, 0, 0, 0], 
        held: [false, false, false, false, false],
        status: nextStatus,
        winner: winner
      });
    }
  };

  const createGame = async () => {
    if (!user) return;
    setLoading(true);
    const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const initialData = {
      id: newGameId,
      players: {
        [user.uid]: { name: `플레이어 1`, uid: user.uid, scores: {} },
      },
      playerOrder: [user.uid],
      currentTurn: user.uid,
      dice: [0, 0, 0, 0, 0], 
      held: [false, false, false, false, false],
      rollsLeft: 3,
      round: 1,
      status: 'waiting', 
      winner: null,
      createdAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'games', newGameId), initialData);
      setGameId(newGameId);
      setIsTestMode(false);
    } catch (err) {
      console.error(err);
      setErrorMsg("생성 실패");
    }
    setLoading(false);
  };

  const startTestGame = async () => {
    if (!user) return;
    setLoading(true);
    const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const opponentId = 'TEST_BOT_' + Math.random().toString(36).substring(2, 6);
    
    const initialData = {
      id: newGameId,
      players: {
        [user.uid]: { name: `플레이어 1`, uid: user.uid, scores: {} },
        [opponentId]: { name: `플레이어 2`, uid: opponentId, scores: {} }
      },
      playerOrder: [user.uid, opponentId],
      currentTurn: user.uid,
      dice: [0, 0, 0, 0, 0],
      held: [false, false, false, false, false],
      rollsLeft: 3,
      round: 1,
      status: 'playing',
      winner: null,
      createdAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'games', newGameId), initialData);
      setGameId(newGameId);
      setIsTestMode(true);
    } catch (err) {
      console.error(err);
      setErrorMsg("테스트 게임 생성 실패");
    }
    setLoading(false);
  };

  const joinGame = async (inputGameId) => {
    if (!user || !inputGameId) return;
    setLoading(true);
    const cleanId = inputGameId.toUpperCase();
    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', cleanId);
    
    try {
      const snap = await getDoc(gameRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.status !== 'waiting' && !data.players[user.uid]) {
          setErrorMsg("입장 불가: 게임 중이거나 만원입니다.");
          setLoading(false);
          return;
        }

        if (!data.players[user.uid]) {
          const updatedPlayers = {
            ...data.players,
            [user.uid]: { name: `플레이어 2`, uid: user.uid, scores: {} }
          };
          const updatedOrder = [...data.playerOrder, user.uid];
          
          await updateDoc(gameRef, {
            players: updatedPlayers,
            playerOrder: updatedOrder,
            status: 'playing'
          });
        }
        setGameId(cleanId);
        setIsTestMode(false);
      } else {
        setErrorMsg("잘못된 코드입니다.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("입장 실패");
    }
    setLoading(false);
  };

  const quitGame = async () => {
    if (!gameData || !activeUser) return;

    const opponentId = gameData.playerOrder.find(uid => uid !== activeUser.uid);
    const winner = opponentId || 'draw'; 

    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId), {
      status: 'finished',
      winner: winner,
      quitBy: activeUser.uid
    });
    setShowQuitModal(false);
  };

  const handleCopyCode = () => {
    copyToClipboard(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rollDice = async () => {
    if (!gameData || gameData.rollsLeft <= 0) return;
    
    setRolling(true);
    setSelectedCategory(null);
    if (soundEnabled) playSound('roll'); 

    // Animation delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const newDice = gameData.dice.map((die, i) => {
      return (gameData.held[i] && die !== 0) ? die : Math.floor(Math.random() * 6) + 1;
    });

    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId), {
      dice: newDice,
      rollsLeft: gameData.rollsLeft - 1
    });
    setRolling(false);
  };

  const toggleHold = async (index) => {
    if (!gameData || gameData.rollsLeft === 3) return;
    
    const newHeld = [...gameData.held];
    newHeld[index] = !newHeld[index];

    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId), {
      held: newHeld
    });
  };

  const handleScoreClick = (categoryId, playerUid) => {
    if (activeUser?.uid !== gameData.currentTurn) return;
    if (playerUid !== activeUser.uid) return;
    if (gameData.rollsLeft === 3) return;
    if (gameData.players[playerUid].scores[categoryId] !== undefined) return;
    
    setSelectedCategory(categoryId);
  };

  const confirmScore = async () => {
    if (!gameData || !activeUser || !selectedCategory) return;
    
    if (soundEnabled) playSound('score');

    const potentialScore = calculateScore(gameData.dice, selectedCategory);
    const currentPlayer = gameData.players[activeUser.uid];
    
    if (currentPlayer.scores[selectedCategory] !== undefined) return; 

    const updatedScores = { ...currentPlayer.scores, [selectedCategory]: potentialScore };
    const updatedPlayers = {
      ...gameData.players,
      [activeUser.uid]: { ...currentPlayer, scores: updatedScores }
    };

    const nextPlayerIndex = (gameData.playerOrder.indexOf(activeUser.uid) + 1) % 2;
    const nextPlayerUid = gameData.playerOrder[nextPlayerIndex];
    
    let nextStatus = gameData.status;
    let winner = null;

    const isGameEnd = Object.values(updatedPlayers).every(p => Object.keys(p.scores).length === CATEGORIES.length);

    if (isGameEnd) {
      nextStatus = 'finished';
      const p1Score = calculateTotal(updatedPlayers[gameData.playerOrder[0]].scores);
      const p2Score = calculateTotal(updatedPlayers[gameData.playerOrder[1]].scores);
      if (p1Score > p2Score) winner = gameData.playerOrder[0];
      else if (p2Score > p1Score) winner = gameData.playerOrder[1];
      else winner = 'draw';
      
      if (soundEnabled) setTimeout(() => playSound('win'), 500);
    }

    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId), {
      players: updatedPlayers,
      currentTurn: nextStatus === 'finished' ? null : nextPlayerUid,
      rollsLeft: 3,
      dice: [0, 0, 0, 0, 0], 
      held: [false, false, false, false, false],
      status: nextStatus,
      winner: winner
    });
    
    setSelectedCategory(null);
  };

  // --- Render Helpers ---

  if (authError) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-900 text-white p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">접속 오류</h2>
        <p className="text-slate-400 mb-4">{authError}</p>
        <p className="text-sm text-slate-500 max-w-md">
          이 미리보기(Preview) 환경은 보안상 익명 로그인이 제한되어 있을 수 있습니다.<br/>
          친구와 플레이하려면 이 코드를 Vercel 등에 배포하거나, 일반 브라우저 창에서 실행해 주세요.
        </p>
      </div>
    );
  }

  if (!user) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white">로그인 중...</div>;

  // 1. Lobby View
  if (!gameId) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans text-slate-100">
        <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
          <div className="text-center mb-8">
            <Dices className="w-16 h-16 mx-auto text-indigo-400 mb-4" />
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">YACHT DICE</h1>
            <p className="text-slate-400 mt-2">1:1 멀티플레이어 온라인</p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={createGame} 
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? '생성 중...' : <><Play className="w-5 h-5" /> 방 만들기</>}
            </button>
            
            <button 
              onClick={startTestGame} 
              disabled={loading}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl font-medium text-slate-300 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FlaskConical className="w-5 h-5" /> 혼자서 테스트 (1인 2역)
            </button>
            
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-600"></span></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-slate-800 text-slate-500">또는</span></div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); joinGame(e.target.code.value); }} className="flex gap-2">
              <input 
                name="code" 
                placeholder="참여 코드 (6자리)" 
                className="flex-1 bg-slate-700 border-none rounded-xl px-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                maxLength={6}
              />
              <button 
                type="submit" 
                disabled={loading}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-500 rounded-xl font-bold transition disabled:opacity-50"
              >
                입장
              </button>
            </form>
            {errorMsg && <p className="text-red-400 text-center text-sm">{errorMsg}</p>}
          </div>
        </div>
      </div>
    );
  }

  // 2. Waiting Room
  if (gameData && gameData.status === 'waiting') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-700">
          <Users className="w-12 h-12 mx-auto text-indigo-400 mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold mb-2">상대방 대기 중...</h2>
          <p className="text-slate-400 mb-6">아래 코드를 친구에게 공유하세요.</p>
          
          <div className="bg-slate-900 p-4 rounded-xl border border-dashed border-slate-600 flex items-center justify-between mb-6">
            <span className="text-3xl font-mono tracking-widest text-indigo-300 select-all">{gameId}</span>
            <button 
              onClick={handleCopyCode}
              className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
            >
              {copied ? <CheckCheck className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Game Board
  if (gameData) {
    const isMyTurn = gameData.currentTurn === activeUser.uid && gameData.status === 'playing';
    const p1Uid = gameData.playerOrder[0];
    const p2Uid = gameData.playerOrder[1];
    const p1 = gameData.players[p1Uid];
    const p2 = p2Uid ? gameData.players[p2Uid] : null;

    const p1Score = calculateTotal(p1.scores);
    const p2Score = p2 ? calculateTotal(p2.scores) : 0;
    
    // Subtotals
    const p1Upper = getUpperSum(p1.scores);
    const p2Upper = p2 ? getUpperSum(p2.scores) : 0;

    // Status logic
    let turnLabel = "";
    let turnColorClass = "";
    if (gameData.status === 'finished') {
        turnLabel = "게임 종료";
        turnColorClass = "bg-slate-700 text-slate-300";
    } else {
        const currentName = gameData.players[gameData.currentTurn]?.name || 'Unknown';
        turnLabel = `${currentName}의 차례`;
        if (isMyTurn) turnColorClass = "bg-green-500/20 text-green-400";
        else turnColorClass = "bg-red-500/20 text-red-400";
    }

    const hasRolled = gameData.rollsLeft < 3;

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6 overflow-y-auto pb-20">
        {showQuitModal && (
          <QuitModal 
            onConfirm={quitGame} 
            onCancel={() => setShowQuitModal(false)} 
          />
        )}

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Mobile Header */}
          <div className="lg:hidden col-span-1 bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="font-bold text-sm">{turnLabel}</span>
                </div>
                <button onClick={() => setShowQuitModal(true)} className="text-red-400 hover:text-red-300 p-1">
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
            {gameData.status === 'playing' && (
                <div className="w-full bg-slate-900 rounded-full h-2 mb-1 overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-1000 ${timeLeft < 10 ? 'bg-red-500' : 'bg-indigo-500'}`}
                        style={{ width: `${(timeLeft / TURN_TIME_LIMIT) * 100}%` }}
                    ></div>
                </div>
            )}
            <div className="text-right text-xs text-slate-500 font-mono">
                {gameData.status === 'playing' ? `${timeLeft}s` : ''}
            </div>
          </div>

          {/* Left: Scorecard */}
          <div className="col-span-1 lg:col-span-5 bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700">
            <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
               <h3 className="font-bold flex items-center gap-2">
                 <Trophy className="w-5 h-5 text-yellow-500" /> 점수판
               </h3>
               <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-slate-400 hover:text-white">
                 {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
               </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-400">
                    <th className="p-3 text-left">항목</th>
                    <th className={`p-3 text-center w-24 ${gameData.currentTurn === p1Uid ? 'text-indigo-400 bg-indigo-500/10' : ''}`}>
                      {p1.name}
                    </th>
                    <th className={`p-3 text-center w-24 ${gameData.currentTurn === p2Uid ? 'text-pink-400 bg-pink-500/10' : ''}`}>
                      {p2 ? p2.name : '대기'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {CATEGORIES.map((cat, idx) => {
                    const p1Val = p1.scores[cat.id];
                    const p2Val = p2?.scores[cat.id];
                    
                    const isP1Turn = gameData.currentTurn === p1Uid;
                    const isP2Turn = gameData.currentTurn === p2Uid;

                    const canP1Select = isP1Turn && isMyTurn && p1Val === undefined && hasRolled;
                    const canP2Select = isP2Turn && isMyTurn && p2Val === undefined && hasRolled;
                    const potential = calculateScore(gameData.dice, cat.id);
                    const isSelected = selectedCategory === cat.id;

                    return (
                      <React.Fragment key={cat.id}>
                        {/* Subtotal Row injected before Choice */}
                        {cat.id === 'choice' && (
                          <tr className="bg-slate-800/80 font-bold text-sm">
                            <td className="p-2 pl-3 text-slate-500 opacity-60">중간 합계 (35)</td>
                            <td className={`p-2 text-center text-sm ${p1Upper >= 63 ? 'text-indigo-400 opacity-100' : 'text-slate-500 opacity-60'}`}>
                                {p1Upper >= 63 ? '35' : `${p1Upper} / 63`}
                            </td>
                            <td className={`p-2 text-center text-sm ${p2Upper >= 63 ? 'text-pink-400 opacity-100' : 'text-slate-500 opacity-60'}`}>
                                {p2Upper >= 63 ? '35' : `${p2Upper} / 63`}
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td className="p-3 font-medium text-slate-300">
                            {cat.label}
                          </td>
                          <td 
                            className={`p-3 text-center transition-colors relative
                              ${p1Val !== undefined ? 'text-indigo-400 font-bold' : 'text-slate-600'}
                              ${canP1Select ? 'cursor-pointer hover:bg-indigo-500/20' : ''}
                              ${isSelected && isP1Turn ? 'bg-indigo-600/30 ring-inset ring-2 ring-indigo-500' : ''}
                            `}
                            onClick={() => handleScoreClick(cat.id, p1Uid)}
                          >
                            {p1Val !== undefined ? p1Val : (canP1Select ? <span className="text-indigo-500/50">{potential}</span> : '-')}
                            {isSelected && isP1Turn && <Check className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-indigo-400" />}
                          </td>
                          <td 
                            className={`p-3 text-center transition-colors relative
                              ${p2Val !== undefined ? 'text-pink-400 font-bold' : 'text-slate-600'}
                              ${canP2Select ? 'cursor-pointer hover:bg-pink-500/20' : ''}
                              ${isSelected && isP2Turn ? 'bg-pink-600/30 ring-inset ring-2 ring-pink-500' : ''}
                            `}
                            onClick={() => handleScoreClick(cat.id, p2Uid)}
                          >
                            {p2Val !== undefined ? p2Val : (canP2Select ? <span className="text-pink-500/50">{potential}</span> : '-')}
                            {isSelected && isP2Turn && <Check className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-pink-400" />}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                  <tr className="bg-slate-800 font-black text-white border-t-2 border-slate-600">
                    <td className="p-3">총점</td>
                    <td className="p-3 text-center text-indigo-400 text-lg">{p1Score}</td>
                    <td className="p-3 text-center text-pink-400 text-lg">{p2Score}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Game Area */}
          <div className="col-span-1 lg:col-span-7 flex flex-col gap-6">
            
            {/* Desktop Status Banner */}
            <div className="hidden lg:flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700 relative overflow-hidden">
                {gameData.status === 'playing' && (
                    <div className="absolute bottom-0 left-0 h-1 bg-indigo-500 transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / TURN_TIME_LIMIT) * 100}%` }}></div>
                )}
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isMyTurn ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="font-bold text-lg">{turnLabel}</span>
                {isMyTurn && <span className="text-sm text-green-400 font-normal ml-2">(나의 턴)</span>}
              </div>
              <div className="flex items-center gap-4 relative z-10">
                 {gameData.status === 'playing' && (
                    <div className="flex items-center gap-2 text-slate-400 font-mono">
                        <Timer className="w-4 h-4" />
                        <span className={`${timeLeft <= 10 ? 'text-red-400 font-bold animate-pulse' : ''}`}>{timeLeft}s</span>
                    </div>
                 )}
                 <div className="h-6 w-px bg-slate-700"></div>
                 <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-slate-400 hover:text-white p-2 bg-slate-900 rounded-full">
                   {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                 </button>
                 <button 
                    onClick={() => setShowQuitModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-bold transition"
                 >
                    <LogOut className="w-4 h-4" /> 나가기
                 </button>
              </div>
            </div>

            {/* Dice Area */}
            <div className={`flex-1 bg-slate-800 rounded-2xl border transition-colors duration-500 p-6 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden
              ${isMyTurn ? 'border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.1)]' : 'border-slate-700 grayscale-[0.3]'}`}>
              
              {showYachtEffect && <YachtEffect />}

              {/* Game Over Modal */}
              {gameData.status === 'finished' && (
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                  <Trophy className="w-24 h-24 text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-bounce" />
                  <h2 className="text-5xl font-black text-white mb-2">게임 종료</h2>
                  <div className="text-2xl mb-8 font-bold">
                    {gameData.winner === 'draw' ? '무승부!' : (
                       isTestMode 
                         ? <span className="text-indigo-400">{gameData.players[gameData.winner].name} 승리!</span>
                         : (gameData.winner === user.uid ? <span className="text-green-400">승리했습니다! 🏆</span> : <span className="text-red-400">패배했습니다 😢</span>)
                    )}
                    {gameData.quitBy && <div className="text-sm text-slate-500 mt-2 font-normal">(상대방의 기권으로 종료됨)</div>}
                  </div>
                  
                  {/* Detailed Results Card */}
                  <div className="bg-slate-800 p-8 rounded-2xl border border-slate-600 w-full max-w-md shadow-2xl mb-8">
                     <div className="flex justify-between items-center mb-6">
                        <div className="text-left">
                           <div className="text-slate-400 text-sm">Player 1</div>
                           <div className="text-2xl font-bold text-indigo-400">{p1.name}</div>
                        </div>
                        <div className="text-4xl font-black text-white">{p1Score}</div>
                     </div>
                     <div className="w-full h-px bg-slate-600 mb-6"></div>
                     <div className="flex justify-between items-center">
                        <div className="text-left">
                           <div className="text-slate-400 text-sm">Player 2</div>
                           <div className="text-2xl font-bold text-pink-400">{p2 ? p2.name : 'Unknown'}</div>
                        </div>
                        <div className="text-4xl font-black text-white">{p2Score}</div>
                     </div>
                  </div>

                  <button 
                    onClick={() => window.location.reload()} 
                    className="px-10 py-4 bg-white text-slate-900 font-bold rounded-full hover:bg-slate-200 transition transform hover:scale-105 shadow-xl flex items-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" /> 새 게임 시작
                  </button>
                </div>
              )}

              {/* Dice Container */}
              <div className="flex gap-3 sm:gap-6 mb-12">
                {gameData.dice.map((value, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-3">
                    <Dice 
                      value={value} 
                      isHeld={gameData.held[idx]} 
                      rolling={rolling && !gameData.held[idx]}
                      disabled={!isMyTurn || gameData.status === 'finished' || value === 0}
                      onClick={() => isMyTurn && toggleHold(idx)}
                      soundEnabled={soundEnabled}
                    />
                    <div className="h-5">
                      {gameData.held[idx] ? <Lock className="w-5 h-5 text-indigo-400" /> : (value !== 0 && <div className="w-5 h-5" />)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Controls */}
              <div className="w-full max-w-md relative z-10">
                
                {/* 1. Initial Roll Button */}
                {!hasRolled && (
                  <button
                    onClick={rollDice}
                    disabled={!isMyTurn || rolling || gameData.status === 'finished'}
                    className={`
                      w-full py-5 rounded-2xl font-bold text-xl shadow-lg flex items-center justify-center gap-3 transition-all border-4 border-transparent
                      ${!isMyTurn 
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-[1.02] hover:shadow-indigo-500/25'}
                    `}
                  >
                    <RotateCcw className={`w-6 h-6 ${rolling ? 'animate-spin' : ''}`} />
                    Roll (3)
                  </button>
                )}

                {/* 2. Split Buttons (Roll & Play) */}
                {hasRolled && (
                  <div className="flex gap-4">
                    <button
                      onClick={rollDice}
                      disabled={!isMyTurn || rolling || gameData.rollsLeft === 0 || gameData.status === 'finished'}
                      className={`
                        flex-1 py-5 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all border-4 border-transparent
                        ${!isMyTurn || gameData.rollsLeft === 0 
                          ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                          : 'bg-slate-600 hover:bg-slate-500 text-white hover:bg-slate-500'}
                      `}
                    >
                      <RotateCcw className={`w-5 h-5 ${rolling ? 'animate-spin' : ''}`} />
                      Roll ({gameData.rollsLeft})
                    </button>

                    <button
                      onClick={confirmScore}
                      disabled={!selectedCategory || !isMyTurn || rolling}
                      className={`
                        flex-1 py-5 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all border-4
                        ${!selectedCategory 
                          ? 'bg-indigo-900/50 text-indigo-300/50 cursor-not-allowed border-indigo-900/50' 
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-[1.02] border-indigo-400 shadow-indigo-500/25'}
                      `}
                    >
                      <CheckCircle2 className="w-6 h-6" />
                      Play
                    </button>
                  </div>
                )}
                
                {/* Info Text */}
                <div className="h-8 mt-6 text-center">
                  {gameData.rollsLeft === 0 && isMyTurn && !selectedCategory && (
                    <div className="text-amber-400 text-sm animate-pulse flex items-center justify-center gap-2 bg-amber-900/20 py-1 px-3 rounded-full inline-flex">
                      <AlertCircle className="w-4 h-4" />
                      점수판을 클릭하여 등록할 점수를 선택하세요
                    </div>
                  )}
                  {hasRolled && isMyTurn && selectedCategory && (
                    <div className="text-indigo-300 text-sm flex items-center justify-center gap-2 bg-indigo-900/30 py-1 px-3 rounded-full inline-flex animate-bounce">
                      <CheckCircle2 className="w-4 h-4" />
                      우측 'Play' 버튼을 눌러 턴을 마치세요
                    </div>
                  )}
                  {!isMyTurn && gameData.status !== 'finished' && (
                     <div className="text-slate-500 text-sm flex items-center justify-center gap-2">
                        <Swords className="w-4 h-4" />
                        상대방이 플레이 중입니다...
                     </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
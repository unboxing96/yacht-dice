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
  getDoc,
  increment
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
// Optional icon assets (user-replaceable)
import choiceIcon from './assets/lower/choice.svg';
import fourOfAKindIcon from './assets/lower/fourOfAKind.svg';
import fullHouseIcon from './assets/lower/fullHouse.svg';
import smallStraightIcon from './assets/lower/smallStraight.svg';
import largeStraightIcon from './assets/lower/largeStraight.svg';
import yachtIcon from './assets/lower/yacht.svg';
import onesIcon from './assets/upper/ones.svg';
import twosIcon from './assets/upper/twos.svg';
import threesIcon from './assets/upper/threes.svg';
import foursIcon from './assets/upper/fours.svg';
import fivesIcon from './assets/upper/fives.svg';
import sixesIcon from './assets/upper/sixes.svg';

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

// --- Sound Engine ---
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
  
  // Sound logic...
};


// --- Game Logic & Constants ---
const CATEGORIES = [
  { id: 'ones', label: 'Ones', section: 'upper' }, { id: 'twos', label: 'Twos', section: 'upper' },
  { id: 'threes', label: 'Threes', section: 'upper' }, { id: 'fours', label: 'Fours', section: 'upper' },
  { id: 'fives', label: 'Fives', section: 'upper' }, { id: 'sixes', label: 'Sixes', section: 'upper' },
  { id: 'choice', label: 'Choice', section: 'lower' }, { id: 'fourOfAKind', label: '4 of a Kind', section: 'lower' },
  { id: 'fullHouse', label: 'Full House', section: 'lower' }, { id: 'smallStraight', label: 'S. Straight (15)', section: 'lower' },
  { id: 'largeStraight', label: 'L. Straight (30)', section: 'lower' }, { id: 'yacht', label: 'Yacht (50)', section: 'lower' },
];
const TURN_TIME_LIMIT = 45;

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
    case 'fourOfAKind': return Object.values(counts).some(c => c >= 4) ? sum : 0;
    case 'fullHouse':
      const hasThree = Object.values(counts).includes(3);
      const hasTwo = Object.values(counts).includes(2);
      const hasFive = Object.values(counts).includes(5); 
      return (hasThree && hasTwo) || hasFive ? sum : 0;
    case 'smallStraight':
      let consecutive = 0;
      for (let i = 0; i < uniqueDice.length - 1; i++) {
        if (uniqueDice[i+1] === uniqueDice[i] + 1) consecutive++; else consecutive = 0;
        if (consecutive >= 3) return 15;
      }
      return 0;
    case 'largeStraight':
      let lConsecutive = 0;
      for (let i = 0; i < uniqueDice.length - 1; i++) {
        if (uniqueDice[i+1] === uniqueDice[i] + 1) lConsecutive++; else lConsecutive = 0;
        if (lConsecutive >= 4) return 30;
      }
      return 0;
    case 'yacht': return Object.values(counts).includes(5) ? 50 : 0;
    default: return 0;
  }
};
const getUpperSum = (scores) => CATEGORIES.filter(c => c.section === 'upper').reduce((acc, cat) => acc + (scores[cat.id] || 0), 0);
const calculateBonus = (scores) => getUpperSum(scores) >= 63 ? 35 : 0;
const calculateTotal = (scores) => Object.values(scores).reduce((a, b) => a + b, 0) + calculateBonus(scores);


// --- Components ---
const Dice = ({ value, isHeld, onClick, rolling, disabled, soundEnabled }) => {
  const [displayValue, setDisplayValue] = useState(value);
  useEffect(() => {
    let interval;
    if (rolling && !isHeld) {
      interval = setInterval(() => setDisplayValue(Math.floor(Math.random() * 6) + 1), 70);
    } else { setDisplayValue(value); }
    return () => clearInterval(interval);
  }, [rolling, isHeld, value]);

  return (
    <button
      onClick={() => !disabled && (onClick(), soundEnabled && playSound('lock'))}
      disabled={disabled}
      className={`w-full h-full rounded-2xl flex items-center justify-center text-4xl sm:text-5xl font-bold transition-all duration-200 relative overflow-hidden select-none ${isHeld ? 'bg-indigo-600 text-white shadow-inner ring-4 ring-indigo-300 scale-95' : 'bg-white text-gray-800 shadow-lg border-2 border-gray-200'} ${!disabled && !isHeld ? 'hover:-translate-y-1 hover:shadow-xl cursor-pointer active:translate-y-0 active:shadow-md' : ''} ${disabled ? 'cursor-default opacity-90' : ''}`}
    >
      {displayValue === 0 ? <HelpCircle className="w-2/5 h-2/5 text-slate-300" /> : displayValue}
    </button>
  );
};
const CategoryIcon = ({ id, section }) => {
  const container = (children) => (
    <div className="relative w-10 h-10 rounded-lg bg-white border-2 border-gray-200 shadow-sm overflow-hidden flex items-center justify-center flex-shrink-0">
      {children}
    </div>
  );
  const dot = (x, y, i) => (
    <div key={i} className="absolute bg-slate-700 rounded-full" style={{ width: 6, height: 6, left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }} />
  );
  const DiceFace = ({ value }) => {
    const L = 18, C = 50, R = 82, T = 18, M = 50, B = 82;
    const map = {
      1: [[C, M]], 2: [[L, T], [R, B]], 3: [[L, T], [C, M], [R, B]], 4: [[L, T], [R, T], [L, B], [R, B]], 5: [[L, T], [R, T], [C, M], [L, B], [R, B]], 6: [[L, T], [R, T], [L, M], [R, M], [L, B], [R, B]],
    };
    return container(map[value].map(([x, y], i) => dot(x, y, i)));
  };

  if (section === 'upper') {
    const UPPER_ICON_MAP = { ones: onesIcon, twos: twosIcon, threes: threesIcon, fours: foursIcon, fives: fivesIcon, sixes: sixesIcon };
    const url = UPPER_ICON_MAP[id];
    if (url) return container(<img src={url} alt={id} className="w-7 h-7 object-contain" draggable={false} />);
    const order = { ones: 1, twos: 2, threes: 3, fours: 4, fives: 5, sixes: 6 };
    return <DiceFace value={order[id]} />;
  }
  const LOWER_ICON_MAP = { choice: choiceIcon, fourOfAKind: fourOfAKindIcon, fullHouse: fullHouseIcon, smallStraight: smallStraightIcon, largeStraight: largeStraightIcon, yacht: yachtIcon };
  const url = LOWER_ICON_MAP[id];
  if (url) return container(<img src={url} alt={id} className="w-7 h-7 object-contain" draggable={false} />);
  return container(null);
};
const YachtEffect = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

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
const QuitModal = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
    <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
      <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-red-400" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">나가시겠습니까?</h3>
      <p className="text-slate-400 mb-6 text-sm">게임을 종료하면 상대방이 승리(기권승)하게 됩니다.</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition">취소</button>
        <button onClick={onConfirm} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition">나가기</button>
      </div>
    </div>
  </div>
);

export default function YachtGame() {
  const [user, setUser] = useState(null);
  const [gameId, setGameId] = useState('');
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [authError, setAuthError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showYachtEffect, setShowYachtEffect] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState(TURN_TIME_LIMIT);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);

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

  const activeUser = useMemo(() => {
    if (isTestMode && gameData?.currentTurn) {
      return { uid: gameData.currentTurn, displayName: 'Test Player' };
    }
    return user;
  }, [user, isTestMode, gameData?.currentTurn]);

  useEffect(() => {
    if (!user || !gameId) return;
    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) { setGameData(docSnap.data()); } 
      else { setErrorMsg("게임을 찾을 수 없습니다."); setGameData(null); }
    }, (error) => { console.error("Snapshot error:", error); setErrorMsg("데이터 로드 오류"); });
    return () => unsubscribe();
  }, [user, gameId]);

  useEffect(() => {
    if (!gameData || gameData.status !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (activeUser?.uid === gameData.currentTurn) { handleTimeOut(); }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameData?.currentTurn, gameData?.status, activeUser]);
  
  useEffect(() => {
    setSelectedCategory(null);
    setTimeLeft(TURN_TIME_LIMIT);
  }, [gameData?.currentTurn]);

  useEffect(() => {
    if (gameData?.dice && !rolling) {
      const isYacht = gameData.dice.every(d => d > 0 && d === gameData.dice[0]);
      if (isYacht) {
        setShowYachtEffect(true);
        if (soundEnabled) playSound('yacht');
      }
    }
  }, [gameData?.dice, rolling, soundEnabled]);

  const handleTimeOut = async () => {
    if (!gameData || gameData.currentTurn !== activeUser?.uid) return;
    
    // Find first available category and submit score of 0 or whatever is there
    const availableCategory = CATEGORIES.find(cat => gameData.players[gameData.currentTurn].scores[cat.id] === undefined);
    
    if (availableCategory) {
      await confirmScore(availableCategory.id);
    } else {
      console.error("Timeout but no available category found.");
    }
  };
  const createGame = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', newGameId);

      const newGameData = {
        id: newGameId,
        players: {
          [user.uid]: { uid: user.uid, name: `Player ${Math.floor(Math.random() * 1000)}`, scores: {} }
        },
        playerOrder: [user.uid],
        status: 'waiting',
        currentTurn: user.uid,
        rollsLeft: 3,
        dice: [0, 0, 0, 0, 0],
        held: [false, false, false, false, false],
        createdAt: new Date().toISOString(),
        winner: null,
      };

      await setDoc(gameRef, newGameData);
      setGameId(newGameId);
    } catch (err) {
      console.error("Error creating game:", err);
      setErrorMsg("게임 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };
  const startTestGame = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const newGameId = `test-${Math.random().toString(36).substring(2, 8)}`;
      const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', newGameId);
      
      const p1_uid = 'test_player_1';
      const p2_uid = 'test_player_2';

      const newGameData = {
        id: newGameId,
        players: {
          [p1_uid]: { uid: p1_uid, name: 'Player 1', scores: {} },
          [p2_uid]: { uid: p2_uid, name: 'Player 2', scores: {} },
        },
        playerOrder: [p1_uid, p2_uid],
        status: 'playing',
        currentTurn: p1_uid,
        rollsLeft: 3,
        dice: [0,0,0,0,0],
        held: [false,false,false,false,false],
        createdAt: new Date().toISOString(),
        winner: null,
      };

      await setDoc(gameRef, newGameData);
      setIsTestMode(true);
      setGameId(newGameId);
    } catch (err) {
      console.error("Error starting test game:", err);
      setErrorMsg("테스트 게임 시작에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };
  const joinGame = async (inputGameId) => {
    const idToJoin = inputGameId.trim().toUpperCase();
    if (!idToJoin) {
      setErrorMsg("게임 ID를 입력하세요.");
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', idToJoin);
      const gameSnap = await getDoc(gameRef);

      if (gameSnap.exists()) {
        const game = gameSnap.data();
        if (game.status === 'waiting' && game.playerOrder.length === 1) {
          if (game.playerOrder[0] === user.uid) {
             setGameId(idToJoin); // If the user is rejoining their own waiting game
          } else {
            const updatedPlayers = {
              ...game.players,
              [user.uid]: { uid: user.uid, name: `Player ${Math.floor(Math.random() * 1000)}`, scores: {} }
            };
            const updatedPlayerOrder = [...game.playerOrder, user.uid];
            
            await updateDoc(gameRef, {
              players: updatedPlayers,
              playerOrder: updatedPlayerOrder,
              status: 'playing',
              currentTurn: game.playerOrder[0], // First player starts
            });
            setGameId(idToJoin);
          }
        } else if (game.status === 'playing' && game.playerOrder.includes(user.uid)) {
          setGameId(idToJoin); // Allow rejoining an ongoing game
        } else {
          setErrorMsg("게임이 가득 찼거나 이미 시작되었습니다.");
        }
      } else {
        setErrorMsg("해당 ID의 게임을 찾을 수 없습니다.");
      }
    } catch (err) {
      console.error("Error joining game:", err);
      setErrorMsg("게임 참가 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };
  const quitGame = async () => {
    if (!gameData || !activeUser) return;
    const opponent = gameData.playerOrder.find(p => p !== activeUser.uid);
    try {
      const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId);
      await updateDoc(gameRef, {
        status: 'finished',
        winner: opponent || 'draw',
        quitBy: activeUser.uid,
      });
      setShowQuitModal(false);
    } catch(err) {
      console.error("Error quitting game:", err);
      setErrorMsg("게임을 나가는 중 오류가 발생했습니다.");
    }
  };
  const handleCopyCode = () => {
    copyToClipboard(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const rollDice = async () => {
    if (!gameData || gameData.rollsLeft === 0 || gameData.currentTurn !== activeUser?.uid) return;
    
    setRolling(true);
    if (soundEnabled) playSound('roll');

    setTimeout(async () => {
      const newDice = gameData.dice.map((d, i) => 
        gameData.held[i] ? d : Math.floor(Math.random() * 6) + 1
      );
      
      const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId);
      try {
        await updateDoc(gameRef, {
          dice: newDice,
          rollsLeft: increment(-1),
        });
      } catch (err) {
        console.error("Roll dice error:", err);
        setErrorMsg("주사위 굴리기 오류");
      } finally {
        setRolling(false);
      }
    }, 800);
  };
  const toggleHold = async (index) => {
    if (!gameData || gameData.rollsLeft === 3 || gameData.currentTurn !== activeUser?.uid) return;
    const newHeld = [...gameData.held];
    newHeld[index] = !newHeld[index];
    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId);
    try {
      await updateDoc(gameRef, { held: newHeld });
    } catch (err) {
      console.error("Toggle hold error:", err);
    }
  };
  const handleScoreClick = (categoryId, playerUid) => {
    if (gameData.currentTurn !== activeUser?.uid || playerUid !== activeUser.uid) return;
    if (gameData.rollsLeft === 3) return; // Must roll first
    if (gameData.players[playerUid].scores[categoryId] !== undefined) return;
    
    setSelectedCategory(categoryId);
    if(soundEnabled) playSound('select');
  };
  const confirmScore = async (categoryToUse = selectedCategory) => {
    if (!categoryToUse || !gameData || gameData.currentTurn !== activeUser?.uid) return;

    const score = calculateScore(gameData.dice, categoryToUse);
    const currentPlayerUid = gameData.currentTurn;
    
    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'games', gameId);

    const nextTurnIndex = (gameData.playerOrder.indexOf(currentPlayerUid) + 1) % gameData.playerOrder.length;
    const nextPlayerUid = gameData.playerOrder[nextTurnIndex];
    
    const updates = {
      [`players.${currentPlayerUid}.scores.${categoryToUse}`]: score,
      currentTurn: nextPlayerUid,
      rollsLeft: 3,
      dice: [0,0,0,0,0],
      held: [false,false,false,false,false],
    };

    const newScores = { ...gameData.players[currentPlayerUid].scores, [categoryToUse]: score };
    const allScoresFilled = gameData.playerOrder.every(p_uid => {
        const p_scores = (p_uid === currentPlayerUid) ? newScores : gameData.players[p_uid].scores;
        return CATEGORIES.length === Object.keys(p_scores).length;
    });

    if (allScoresFilled) {
      const p1_uid = gameData.playerOrder[0];
      const p2_uid = gameData.playerOrder[1];
      const p1_scores = (p1_uid === currentPlayerUid) ? newScores : gameData.players[p1_uid].scores;
      const p2_scores = (p2_uid === currentPlayerUid) ? newScores : gameData.players[p2_uid].scores;
      
      const p1_final_score = calculateTotal(p1_scores);
      const p2_final_score = calculateTotal(p2_scores);

      let winner;
      if (p1_final_score > p2_final_score) winner = p1_uid;
      else if (p2_final_score > p1_final_score) winner = p2_uid;
      else winner = 'draw';

      updates.status = 'finished';
      updates.winner = winner;
    }

    try {
      if(soundEnabled) playSound('confirm');
      await updateDoc(gameRef, updates);
      setSelectedCategory(null);
    } catch(err) {
      console.error("Confirm score error", err);
      setErrorMsg("점수 확정 오류");
    }
  };

  if (authError) {
    return <div className="flex h-screen items-center justify-center bg-slate-900 text-white p-4 text-center"><div className="bg-red-900/50 border border-red-500/50 p-6 rounded-xl max-w-sm"><AlertCircle className="mx-auto w-10 h-10 text-red-400 mb-4" />{authError}</div></div>;
  }

  if (!user) {
    return <div className="flex h-screen items-center justify-center bg-slate-900 text-white">Connecting...</div>;
  }

  if (!gameId) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white p-4">
        <div className="w-full max-w-sm text-center">
          <Dices className="mx-auto w-16 h-16 text-indigo-400 mb-6" />
          <h1 className="text-5xl font-bold mb-2">Yacht Dice</h1>
          <p className="text-slate-400 mb-8">A web-based dice game.</p>
          
          <form onSubmit={(e) => { e.preventDefault(); joinGame(e.target.elements.gameId.value); }} className="flex flex-col gap-3">
            <input 
              name="gameId"
              type="text" 
              placeholder="Enter Game ID" 
              className="bg-slate-800 border-2 border-slate-700 text-white text-center rounded-xl py-3 px-4 font-mono uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button type="submit" disabled={loading} className="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
              <Users className="w-5 h-5"/> Join Game
            </button>
          </form>

          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-slate-700"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-xs font-bold">OR</span>
            <div className="flex-grow border-t border-slate-700"></div>
          </div>

          <button onClick={createGame} disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
            <Play className="w-5 h-5" /> Create New Game
          </button>
          
          {errorMsg && <p className="text-red-400 mt-4 text-sm">{errorMsg}</p>}
          
          <div className="mt-8 border-t border-slate-800 pt-4">
             <button onClick={startTestGame} className="text-slate-500 hover:text-indigo-400 text-xs font-semibold flex items-center justify-center gap-2 w-full"><FlaskConical className="w-4 h-4" /> Enter Test Mode</button>
          </div>
        </div>
      </div>
    );
  }

  if (gameData && gameData.status === 'waiting') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white p-4">
        <div className="w-full max-w-md text-center bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <Users className="mx-auto w-12 h-12 text-indigo-400 mb-6" />
          <h2 className="text-3xl font-bold mb-2">Waiting for Opponent...</h2>
          <p className="text-slate-400 mb-6">Share the game ID with a friend to start playing.</p>
          
          <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-between gap-4">
            <span className="font-mono text-2xl tracking-widest text-indigo-300">{gameId}</span>
            <button 
              onClick={handleCopyCode}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${copied ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
            >
              <div className="flex items-center gap-2">
                {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </div>
            </button>
          </div>
          
          <button onClick={() => setGameId('')} className="mt-6 text-slate-500 hover:text-white text-sm font-semibold">Back to Lobby</button>
        </div>
      </div>
    );
  }

  if (gameData) {
    const isMyTurn = gameData.currentTurn === activeUser?.uid && gameData.status === 'playing';
    const p1 = gameData.players[gameData.playerOrder[0]];
    const p2 = gameData.playerOrder[1] ? gameData.players[gameData.playerOrder[1]] : null;
    const turnLabel = gameData.status === 'finished' ? "Game Over" : `${gameData.players[gameData.currentTurn]?.name || '...'}s Turn`;
    const hasRolled = gameData.rollsLeft < 3;
    
    const Scoreboard = () => {
      const p1Score = p1 ? calculateTotal(p1.scores) : 0;
      const p2Score = p2 ? calculateTotal(p2.scores) : 0;
      const p1Upper = p1 ? getUpperSum(p1.scores) : 0;
      const p2Upper = p2 ? getUpperSum(p2.scores) : 0;
      const upperSection = CATEGORIES.filter(c => c.section === 'upper');
      const lowerSection = CATEGORIES.filter(c => c.section === 'lower');

      const BonusRow = () => (
        <tr className="bg-slate-900/80 font-bold text-lg">
          <td className="py-2.5 px-3 text-slate-400">Bonus (+35)</td>
          <td className={`py-2.5 px-3 text-center ${p1Upper >= 63 ? 'text-green-400' : 'text-slate-500'}`}>{p1Upper >= 63 ? '✓' : `${p1Upper}/63`}</td>
          <td className={`py-2.5 px-3 text-center ${p2Upper >= 63 ? 'text-green-400' : 'text-slate-500'}`}>{p2 ? (p2Upper >= 63 ? '✓' : `${p2Upper}/63`) : '-'}</td>
        </tr>
      );

            const ScoreTable = ({ categories, showBonus }) => (

              <table className="w-full text-base">

                <thead className="sticky top-0 bg-slate-800 z-10">

                  <tr className="bg-slate-900/50 text-slate-400">

                    <th className="py-3 px-3 text-left font-semibold">Category</th>

                    <th className="py-3 px-3 text-center w-20 font-semibold truncate">{p1.name}</th>

                    <th className="py-3 px-3 text-center w-20 font-semibold truncate">{p2 ? p2.name : '...'}</th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-700/50">

                  {categories.map((cat) => (

                    <React.Fragment key={cat.id}>

                      <tr className="hover:bg-slate-700/30">

                        <td className="py-2.5 px-3 font-medium text-slate-300 flex items-center gap-3">

                          <div className="w-12 h-12"><CategoryIcon id={cat.id} section={cat.section} /></div>

                          <span className="text-lg sm:text-xl">{cat.label}</span>

                        </td>

                        <td className={`py-2.5 px-3 text-center text-2xl transition-colors relative ${p1.scores[cat.id] !== undefined ? 'text-indigo-300 font-bold' : 'text-slate-500'} ${gameData.currentTurn === p1.uid && p1.scores[cat.id] === undefined && hasRolled ? 'cursor-pointer hover:bg-indigo-500/20' : ''} ${selectedCategory === cat.id && gameData.currentTurn === p1.uid ? 'bg-indigo-600/30' : ''}`} onClick={() => handleScoreClick(cat.id, p1.uid)}>

                          {p1.scores[cat.id] !== undefined ? p1.scores[cat.id] : (gameData.currentTurn === p1.uid && p1.scores[cat.id] === undefined && hasRolled ? <span className="text-indigo-500/60 font-semibold">{calculateScore(gameData.dice, cat.id)}</span> : ' ')}

                        </td>

                        <td className={`py-2.5 px-3 text-center text-2xl transition-colors relative ${p2?.scores[cat.id] !== undefined ? 'text-pink-400 font-bold' : 'text-slate-500'} ${gameData.currentTurn === p2?.uid && p2?.scores[cat.id] === undefined && hasRolled ? 'cursor-pointer hover:bg-pink-500/20' : ''} ${selectedCategory === cat.id && gameData.currentTurn === p2?.uid ? 'bg-pink-600/30' : ''}`} onClick={() => handleScoreClick(cat.id, p2.uid)}>

                          {p2?.scores[cat.id] !== undefined ? p2?.scores[cat.id] : (gameData.currentTurn === p2?.uid && p2?.scores[cat.id] === undefined && hasRolled ? <span className="text-pink-500/60 font-semibold">{calculateScore(gameData.dice, cat.id)}</span> : ' ')}

                        </td>

                      </tr>

                    </React.Fragment>

                  ))}

                  {showBonus && <BonusRow />}

                </tbody>

              </table>

            );

      return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col h-full">
          <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex-shrink-0 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2 text-base"><Trophy className="w-5 h-5 text-yellow-500" /> Score</h3>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-indigo-400 truncate">{p1.name}</div>
                <div className="text-lg font-bold text-white">{p1Score}</div>
              </div>
              <div className="w-px h-6 bg-slate-600"></div>
              <div className="text-right">
                <div className="text-sm font-medium text-pink-400 truncate">{p2 ? p2.name : '...'}</div>
                <div className="text-lg font-bold text-white">{p2Score}</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 p-2 overflow-y-auto">
            <ScoreTable categories={upperSection} showBonus={true} />
            <ScoreTable categories={lowerSection} />
          </div>
        </div>
      );
    }

    return (
      <div className="h-screen bg-slate-900 text-slate-100 p-1 flex flex-col gap-1">
        {showQuitModal && <QuitModal onConfirm={quitGame} onCancel={() => setShowQuitModal(false)} />}
        
        <header className="flex-shrink-0 bg-slate-800 p-2 rounded-lg border border-slate-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isMyTurn ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-bold text-sm truncate">{turnLabel}</span>
            </div>
            {gameData.status === 'playing' && (
              <div className="flex items-center gap-2 flex-1 mx-2">
                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div className={`${timeLeft < 10 ? 'bg-red-500' : 'bg-indigo-500'} h-full transition-all duration-1000`} style={{ width: `${(timeLeft / TURN_TIME_LIMIT) * 100}%` }} />
                </div>
                <span className={`text-xs font-mono ${timeLeft <= 10 ? 'text-red-400' : 'text-slate-500'}`}>{timeLeft}s</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-slate-400 hover:text-white p-1.5"><span className="sr-only">Toggle Sound</span>{soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}</button>
              <button onClick={() => setShowQuitModal(true)} className="text-red-400 hover:text-red-300 p-1.5"><span className="sr-only">Quit Game</span><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </header>

        <div className="flex-grow-[4] min-h-0">
          <Scoreboard />
        </div>

        <main className="flex flex-col flex-grow-[1]">
            <div className={`h-full bg-slate-800 rounded-xl border p-1 flex flex-col items-center justify-around relative overflow-hidden ${isMyTurn ? 'border-indigo-500/50' : 'border-slate-700'}`}>
              {showYachtEffect && <YachtEffect onComplete={() => setShowYachtEffect(false)} />}
              {gameData.status === 'finished' && (
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-500">
                  <Trophy className="w-20 h-20 text-yellow-400 mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-bounce" />
                  <h2 className="text-5xl font-black text-white mb-2">Game Over</h2>
                  <div className="text-xl mb-6 font-bold">
                    {gameData.winner === 'draw' ? 'Draw!' : (isTestMode ? <span className="text-indigo-400">{gameData.players[gameData.winner].name} Wins!</span> : (gameData.winner === user?.uid ? <span className="text-green-400">You Win! 🏆</span> : <span className="text-red-400">You Lose! 😢</span>))}
                    {gameData.quitBy && <div className="text-sm text-slate-500 mt-1 font-normal">(Opponent forfeited)</div>}
                  </div>
                  <div className="bg-slate-800 p-6 rounded-xl border border-slate-600 w-full max-w-sm shadow-xl mb-6">
                    <div className="flex justify-between items-center mb-3"><div className="text-left"><div className="text-slate-400 text-sm">Player 1</div><div className="text-xl font-bold text-indigo-400">{p1.name}</div></div><div className="text-4xl font-black text-white">{calculateTotal(p1.scores)}</div></div>
                    <div className="w-full h-px bg-slate-600 my-3"></div>
                    <div className="flex justify-between items-center"><div className="text-left"><div className="text-slate-400 text-sm">Player 2</div><div className="text-xl font-bold text-pink-400">{p2 ? p2.name : 'Unknown'}</div></div><div className="text-4xl font-black text-white">{p2 ? calculateTotal(p2.scores) : 0}</div></div>
                  </div>
                  <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white text-slate-900 font-bold rounded-full hover:bg-slate-200 transition transform hover:scale-105 shadow-lg flex items-center gap-2 text-base"><RotateCcw className="w-5 h-5" /> New Game</button>
                </div>
              )}
              
              <div className="w-full max-w-md flex justify-center items-start gap-3">
                {gameData.dice.map((value, idx) => (
                  <div key={idx} className="w-[18%]">
                    <div className="aspect-square">
                      <Dice value={value} isHeld={gameData.held[idx]} onClick={() => toggleHold(idx)} rolling={rolling && !gameData.held[idx]} disabled={!isMyTurn || gameData.status === 'finished' || value === 0} soundEnabled={soundEnabled} />
                    </div>
                    <div className="h-5 flex items-center justify-center">{gameData.held[idx] && <Lock className="w-5 h-5 text-indigo-400" />}</div>
                  </div>
                ))}
              </div>

              <div className="w-full max-w-xs relative z-10">
                {!hasRolled && (
                  <button onClick={rollDice} disabled={!isMyTurn || rolling || gameData.status === 'finished'} className={`w-full py-3 rounded-xl font-bold text-xl shadow-lg flex items-center justify-center gap-3 transition-all border-2 ${!isMyTurn ? 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-[1.02] hover:shadow-indigo-500/25 border-transparent'}`}><RotateCcw className="w-6 h-6 ${rolling && 'animate-spin'}" /> Roll (3)</button>
                )}
                {hasRolled && (
                  <div className="flex gap-3">
                    <button onClick={rollDice} disabled={!isMyTurn || rolling || gameData.rollsLeft === 0 || gameData.status === 'finished'} className={`flex-1 py-3 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all border-2 border-transparent ${!isMyTurn || gameData.rollsLeft === 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-600 hover:bg-slate-500 text-white'}`}><RotateCcw className={`w-5 h-5 ${rolling && 'animate-spin'}`} /> Roll ({gameData.rollsLeft})</button>
                    <button onClick={() => confirmScore()} disabled={!selectedCategory || !isMyTurn || rolling} className={`flex-1 py-3 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all border-2 ${!selectedCategory ? 'bg-indigo-900/50 text-indigo-300/50 cursor-not-allowed border-indigo-900/50' : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-[1.02] border-indigo-400 shadow-indigo-500/25'}`}><CheckCircle2 className="w-6 h-6" /> Play</button>
                  </div>
                )}
                <div className="h-6 mt-2 text-center">
                  {gameData.rollsLeft === 0 && isMyTurn && !selectedCategory && <div className="text-amber-400 text-sm animate-pulse flex items-center justify-center gap-2"><AlertCircle className="w-4 h-4" /> Select a score to record</div>}
                </div>
              </div>
            </div>
        </main>
      </div>
    );
  }
  
  return <div className="flex h-screen items-center justify-center bg-slate-900 text-white">Loading...</div>;
}
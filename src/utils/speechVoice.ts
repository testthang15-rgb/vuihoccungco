// Natural Vietnamese Voice Reader for Preschool Children
// Combines ultra-natural Vietnamese audio stream via /api/tts with intelligent Web Speech API fallback
// Fully hardened for iOS Safari / WebKit auto-read and user gesture lifecycle

let speakingListeners: Set<(isSpeaking: boolean) => void> = new Set();
let cachedVoices: SpeechSynthesisVoice[] = [];
let speechWatchdogTimer: any = null;

// Audio context singleton for ultra-low latency & bypass of HTML5 Audio readyState stalls
let speechAudioCtx: AudioContext | null = null;
let currentBufferSource: AudioBufferSourceNode | null = null;
let currentHtmlAudio: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;

// Reused pre-unlocked HTMLAudioElement specifically to bypass iOS WebKit autoplay policy on dynamic fetch
let warmHtmlAudio: HTMLAudioElement | null = null;
let keepAliveSource: AudioBufferSourceNode | null = null;

// Keep an in-memory cache of decoded audio buffers for repeated questions
const audioBufferCache = new Map<string, AudioBuffer>();

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Android|Edg/.test(ua);
}

function maintainAudioContextAlive(ctx: AudioContext) {
  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (keepAliveSource) return;
    const buffer = ctx.createBuffer(1, 1024, ctx.sampleRate || 44100);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.00001; // Silent keep-alive
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(0);
    keepAliveSource = source;
  } catch {}
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!speechAudioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      speechAudioCtx = new AudioCtx();
    }
  }
  if (speechAudioCtx) {
    if (speechAudioCtx.state === 'suspended') {
      speechAudioCtx.resume().catch(() => {});
    }
    maintainAudioContextAlive(speechAudioCtx);
  }
  return speechAudioCtx;
}

/**
 * Pre-unlocks audio context, warm HTMLAudioElement, and speech synthesis during any user gesture (click or tap)
 * Essential for iOS Safari / WebKit auto-play
 */
export function unlockSpeechAudio(): void {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      maintainAudioContextAlive(ctx);

      // Play a 1-sample silent buffer to decisively unlock Web Audio on iOS Safari
      try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch {}
    }

    // Warm up an HTMLAudioElement with silent audio during this gesture
    if (!warmHtmlAudio) {
      try {
        warmHtmlAudio = new Audio();
        // 1-sample silent WAV base64
        warmHtmlAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        const p = warmHtmlAudio.play();
        if (p !== undefined) {
          p.then(() => {
            warmHtmlAudio?.pause();
          }).catch(() => {});
        }
      } catch {}
    }

    // Prime Web Speech API on iOS
    if ('speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        // Small utterance to activate iOS WebKit speech engine
        const dummyUtterance = new SpeechSynthesisUtterance(' ');
        dummyUtterance.volume = 0.01;
        dummyUtterance.onend = () => {};
        dummyUtterance.onerror = () => {};
        window.speechSynthesis.speak(dummyUtterance);
      } catch {}
    }
  } catch {}
}

// Continuously listen to user gestures to keep AudioContext and Audio unblocked across the session
if (typeof window !== 'undefined') {
  const handleUserGesture = () => {
    unlockSpeechAudio();
  };
  window.addEventListener('click', handleUserGesture, { passive: true });
  window.addEventListener('touchstart', handleUserGesture, { passive: true });
  window.addEventListener('touchend', handleUserGesture, { passive: true });
  window.addEventListener('pointerdown', handleUserGesture, { passive: true });
  window.addEventListener('keydown', handleUserGesture, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      unlockSpeechAudio();
    }
  });

  // Initialize voice list if browser supports Web Speech
  if ('speechSynthesis' in window) {
    try {
      cachedVoices = window.speechSynthesis.getVoices() || [];
      window.speechSynthesis.onvoiceschanged = () => {
        try {
          cachedVoices = window.speechSynthesis.getVoices() || [];
        } catch {}
      };
    } catch {}
  }
}

export function subscribeSpeakingState(listener: (isSpeaking: boolean) => void) {
  speakingListeners.add(listener);
  return () => {
    speakingListeners.delete(listener);
  };
}

function notifySpeakingState(isSpeaking: boolean) {
  speakingListeners.forEach((fn) => {
    try {
      fn(isSpeaking);
    } catch {}
  });
}

/**
 * Checks if Speech or Audio is supported in the current environment
 */
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && (typeof Audio !== 'undefined' || 'speechSynthesis' in window);
}

/**
 * Stops any active speech (AudioContext, HTML5 Audio, and Web Speech)
 */
export function stopSpeaking() {
  if (speechWatchdogTimer) {
    clearTimeout(speechWatchdogTimer);
    speechWatchdogTimer = null;
  }

  // Stop Web Audio Buffer Source
  if (currentBufferSource) {
    try {
      currentBufferSource.onended = null;
      currentBufferSource.stop(0);
      currentBufferSource.disconnect();
    } catch {}
    currentBufferSource = null;
  }

  // Stop HTML5 Audio element
  if (currentHtmlAudio) {
    try {
      currentHtmlAudio.pause();
      currentHtmlAudio.currentTime = 0;
      currentHtmlAudio.onplay = null;
      currentHtmlAudio.onended = null;
      currentHtmlAudio.onerror = null;
    } catch {}
    currentHtmlAudio = null;
  }

  // Stop Web Speech
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  currentUtterance = null;
  if (typeof window !== 'undefined') {
    (window as any).__currentUtterance = null;
  }
  notifySpeakingState(false);
}

/**
 * Clean text for pleasant preschool voice delivery
 */
export function cleanVietnameseText(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[⭐✨🎈🐶🐱🦁🐘🐰🦆🐟🦀🐒🐻🍎🍌🍇🍓🍊🍉🌽🚗🚌✈️🚲✍️🎯🧩💡❓📝🔘☑️✓]/g, '')
    .replace(/["\x27"''«»„]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fallback to browser's built-in Web Speech API with best Vietnamese voice
 */
function speakViaWebSpeech(
  cleanText: string,
  options: {
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
  }
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    notifySpeakingState(false);
    return false;
  }

  try {
    const isCurrentlySpeaking = window.speechSynthesis.speaking;
    if (isCurrentlySpeaking) {
      window.speechSynthesis.cancel();
    }
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const doSpeak = () => {
      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'vi-VN';
        utterance.rate = options.rate ?? 0.9;
        utterance.pitch = options.pitch ?? 1.05;

        const voices = cachedVoices.length > 0 ? cachedVoices : (window.speechSynthesis.getVoices?.() || []);
        const viVoice =
          voices.find((v) => v.lang.toLowerCase() === 'vi-vn' || v.lang.toLowerCase() === 'vi_vn') ||
          voices.find((v) => v.name.toLowerCase().includes('vietnam') || v.name.toLowerCase().includes('tiếng việt')) ||
          voices.find((v) => v.lang.toLowerCase().startsWith('vi'));

        if (viVoice) {
          utterance.voice = viVoice;
        }

        utterance.onstart = () => {
          notifySpeakingState(true);
          options.onStart?.();
        };

        utterance.onend = () => {
          if (typeof window !== 'undefined') {
            (window as any).__currentUtterance = null;
          }
          stopSpeaking();
          options.onEnd?.();
        };

        utterance.onerror = (e) => {
          if (typeof window !== 'undefined') {
            (window as any).__currentUtterance = null;
          }
          console.warn('[WebSpeech error]', e);
          stopSpeaking();
        };

        currentUtterance = utterance;
        (window as any).__currentUtterance = utterance;

        window.speechSynthesis.speak(utterance);
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (innerErr) {
        console.warn('Web speech speak failed:', innerErr);
        stopSpeaking();
      }
    };

    if (isCurrentlySpeaking) {
      // Allow WebKit's internal cancel cycle to clear
      setTimeout(doSpeak, 30);
    } else {
      doSpeak();
    }

    return true;
  } catch (err) {
    console.warn('Web speech synthesis failed:', err);
    stopSpeaking();
    return false;
  }
}

function decodeAudioDataSafely(ctx: AudioContext, buffer: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    try {
      const promise = ctx.decodeAudioData(
        buffer,
        (decoded) => resolve(decoded),
        (err) => reject(err)
      );
      if (promise && typeof (promise as any).then === 'function') {
        (promise as any).then(resolve).catch(reject);
      }
    } catch (err) {
      reject(err);
    }
  });
}


/**
 * Speaks arbitrary text in clear, warm and natural Vietnamese
 */
export function speakVietnamese(
  text: string,
  options: {
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
  } = {}
): boolean {
  if (!isSpeechSupported() || !text?.trim()) return false;

  stopSpeaking();

  const cleanText = cleanVietnameseText(text);
  if (!cleanText) return false;

  // Maximum watchdog timer: stops speaking state if anything hangs
  const maxExpectedMs = Math.max(8000, Math.min(35000, cleanText.length * 160));
  speechWatchdogTimer = setTimeout(() => {
    stopSpeaking();
  }, maxExpectedMs);

  notifySpeakingState(true);

  const ttsUrl = `/api/tts?text=${encodeURIComponent(cleanText)}`;

  // Priority 1: Web Audio API (Decoded AudioBuffer) - works seamlessly across iOS Safari, macOS Safari, Android, and Desktop
  const ctx = getAudioContext();
  if (ctx) {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // If cached in audioBufferCache, play immediately
    const cachedBuffer = audioBufferCache.get(cleanText);
    if (cachedBuffer) {
      try {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const source = ctx.createBufferSource();
        source.buffer = cachedBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
          stopSpeaking();
          options.onEnd?.();
        };
        currentBufferSource = source;
        source.start(0);
        options.onStart?.();
        return true;
      } catch (err) {
        console.warn('Playing cached buffer failed, will refetch:', err);
      }
    }

    // Fetch and decode from /api/tts
    fetch(ttsUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`TTS server returned ${res.status}`);
        return res.arrayBuffer();
      })
      .then((arrayBuffer) => {
        return decodeAudioDataSafely(ctx, arrayBuffer);
      })
      .then((audioBuffer) => {
        if (audioBufferCache.size > 50) {
          const firstKey = audioBufferCache.keys().next().value;
          if (firstKey) audioBufferCache.delete(firstKey);
        }
        audioBufferCache.set(cleanText, audioBuffer);

        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
          stopSpeaking();
          options.onEnd?.();
        };
        currentBufferSource = source;
        source.start(0);
        options.onStart?.();
      })
      .catch((err) => {
        console.warn('Web Audio TTS failed, falling back to HTMLAudioElement:', err);
        playViaHtmlAudio(cleanText, ttsUrl, options);
      });

    return true;
  }

  // Priority 2: Fallback to HTML Audio if no AudioContext
  playViaHtmlAudio(cleanText, ttsUrl, options);
  return true;
}

function playViaHtmlAudio(
  cleanText: string,
  ttsUrl: string,
  options: {
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
  }
) {
  try {
    // Re-use warm pre-unlocked audio element on iOS if available, otherwise new Audio
    const audio = warmHtmlAudio || new Audio();
    currentHtmlAudio = audio;
    audio.src = ttsUrl;
    audio.volume = 1.0;

    audio.onplay = () => {
      notifySpeakingState(true);
      options.onStart?.();
    };

    audio.onended = () => {
      stopSpeaking();
      options.onEnd?.();
    };

    audio.onerror = () => {
      console.warn('HTMLAudio failed, falling back to Web Speech API');
      stopSpeaking();
      speakViaWebSpeech(cleanText, options);
    };

    const p = audio.play();
    if (p !== undefined) {
      p.catch(() => {
        // If autoplay blocked HTML Audio, try Web Speech API
        speakViaWebSpeech(cleanText, options);
      });
    }
  } catch {
    speakViaWebSpeech(cleanText, options);
  }
}

/**
 * Reads a question aloud: ONLY reads the question prompt, skipping answer options
 * (Theo yêu cầu: "đối với câu hỏi có đọc đáp án: bỏ đọc đáp án, chỉ đọc câu hỏi.")
 */
export function speakQuestionWithOptions(
  questionTitle: string,
  _options?: { text: string }[],
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
  }
): boolean {
  const cleanTitle = (questionTitle || '').trim();
  if (!cleanTitle) return false;

  // Chỉ đọc nội dung câu hỏi, bỏ toàn bộ phần đọc các đáp án
  return speakVietnamese(cleanTitle, callbacks);
}

export function speakText(text: string, onEnd?: () => void): boolean {
  return speakVietnamese(text, { onEnd });
}


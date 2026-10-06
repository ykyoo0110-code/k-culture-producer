import { useEffect, useRef, useState } from 'react';
import { AUDIO_STEPS } from '../utils/audioSettings';

export default function ExperienceAudio({ step, settings, started, language = 'ko' }) {
  const [muted, setMuted] = useState(() => localStorage.getItem('kcp-master-muted') === '1');
  const [unlocked, setUnlocked] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [retry, setRetry] = useState(0);
  const bgmRef = useRef(null), aiRef = useRef(null);
  const scene = settings?.audioScenes?.[AUDIO_STEPS[step]?.key || 'intro'] || {};
  const bgmUrl = scene.bgmUrl || settings?.commonBgmUrl || '';
  const aiUrl = scene.aiAudioUrls && Object.values(scene.aiAudioUrls).some(Boolean)
    ? scene.aiAudioUrls[language] || '' : scene.aiAudioUrl || '';
  const enabled = settings?.masterSoundEnabled !== false && !muted;
  const volume = Math.min(1, Math.max(0, Number(scene.bgmVolume ?? 35) / 100));
  const delay = Math.max(0, Number(scene.aiDelayMs ?? 1000));

  useEffect(() => {
    const bgm = bgmRef.current, voice = aiRef.current;
    let frame, timer, disposed = false, scheduled = false;
    const fade = target => {
      cancelAnimationFrame(frame);
      const from = bgm.volume, start = performance.now();
      const tick = now => {
        const progress = Math.min(1, (now - start) / 400);
        bgm.volume = from + (target - from) * progress;
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const duck = () => fade(Math.min(volume, 0.12));
    const restore = () => fade(volume);
    const playVoice = () => {
      if (scheduled || disposed || !scene.aiEnabled || !aiUrl) return;
      scheduled = true;
      timer = setTimeout(() => voice.play().catch(() => { if (!disposed) { setBlocked(true); restore(); } }), delay);
    };
    bgm.pause(); voice.pause(); bgm.currentTime = 0; voice.currentTime = 0;
    bgm.volume = volume; bgm.loop = scene.bgmLoop !== false;
    setBlocked(false);
    voice.addEventListener('playing', duck);
    ['ended', 'pause', 'error', 'waiting'].forEach(event => voice.addEventListener(event, restore));
    bgm.addEventListener('playing', playVoice);
    bgm.addEventListener('error', playVoice);
    if (enabled && (started || unlocked)) {
      if (bgmUrl) bgm.play().catch(() => { if (!disposed) setBlocked(true); });
      else playVoice();
    }
    return () => {
      disposed = true; clearTimeout(timer); cancelAnimationFrame(frame);
      voice.removeEventListener('playing', duck);
      ['ended', 'pause', 'error', 'waiting'].forEach(event => voice.removeEventListener(event, restore));
      bgm.removeEventListener('playing', playVoice);
      bgm.removeEventListener('error', playVoice);
      bgm.pause(); voice.pause(); bgm.volume = volume;
    };
  }, [step, language, bgmUrl, aiUrl, enabled, started, unlocked, retry, volume, scene.bgmLoop, scene.aiEnabled, delay]);

  const toggle = () => {
    if (blocked || (!started && !unlocked && !muted)) {
      setUnlocked(true); setRetry(value => value + 1); return;
    }
    const next = !muted;
    localStorage.setItem('kcp-master-muted', next ? '1' : '0');
    setMuted(next); if (!next) setUnlocked(true);
  };
  return <>
    <audio ref={bgmRef} src={bgmUrl || undefined} preload="metadata" />
    <audio ref={aiRef} src={aiUrl || undefined} preload="metadata" />
    <button type="button" className="kcp-sound-toggle" onClick={toggle} aria-pressed={enabled}>
      {muted ? 'SOUND OFF' : blocked || (!started && !unlocked) ? 'SOUND START' : 'SOUND ON'}
    </button>
  </>;
}

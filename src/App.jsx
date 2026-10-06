import { useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header';
import ExperienceAudio from './components/ExperienceAudio';
import AdminDashboard from './pages/AdminDashboard';
import PassportPanel from './components/PassportPanel';
import { budgetByLevel, finalOptions, incidents, initialState, programs, text } from './data/content';
import ArrivalPage from './pages/ArrivalPage';
import IncidentPage from './pages/IncidentPage';
import IntroPage from './pages/IntroPage';
import PlanPage from './pages/PlanPage';
import ProfilePage from './pages/ProfilePage';
import ProgramPage from './pages/ProgramPage';
import ResultPage from './pages/ResultPage';
import SecondIncidentPage from './pages/SecondIncidentPage';
import SetupPage from './pages/SetupPage';
import { applyChanges, createResult } from './utils/score';
import { loadAdminSettings, normalizeAdminSettings, resetAdminSettings, saveAdminSettings } from './utils/adminSettings';
import { createExperienceSession, updateExperienceSession, getLatestCharacter } from './services/systemApi';
import { getSceneMedia } from './services/systemApi';

const TOTAL_STEPS = 9;
const budgetKeys = ['small', 'standard', 'premium'];
const DEFAULT_FALLBACK_KEYS = ['mina', 'joon', 'yuna', 'haru', 'leo'];
const initialProfile = { nickname: '', imageMode: 'basic', characterKey: 'mina', promptText: '', promptGenerated: false, photoGenerated: false, imageUrl: '/characters/mina.svg', consent: false };
const profileStorageKey = (id) => `k-culture-profile:${id}`;
const validSavedImage = (url) => typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('/'));
const readSavedProfile = () => {
  try {
    const id = localStorage.getItem('k-culture-session-id');
    if (!id) return initialProfile;
    const saved = JSON.parse(sessionStorage.getItem(profileStorageKey(id)) || 'null');
    return saved && typeof saved === 'object' && validSavedImage(saved.imageUrl)
      ? { ...initialProfile, ...saved, nickname: '', consent: Boolean(saved.photoGenerated) }
      : initialProfile;
  } catch { return initialProfile; }
};

export default function App() {
  // 관리 화면은 체험 콘텐츠와 분리하며 API에서 관리자 토큰을 확인합니다.
  if (/^\/admin\/?$/i.test(window.location.pathname)) return <AdminDashboard />;
  return <ExperienceApp />;
}

function ExperienceApp() {
  const [settings, setSettings] = useState(loadAdminSettings);
  const [maxVisited, setMaxVisited] = useState(0);
  useEffect(() => {
    // 다른 컴퓨터에서도 같은 관리자 설정을 쓰도록 백엔드 설정을 우선 읽습니다.
    fetch(`${import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || '')}/api/site-content`)
      .then(r=>{ if(!r.ok) throw Error('site content');return r.json(); })
      .then(remote => { if(Object.keys(remote).length) setSettings(previous=>normalizeAdminSettings({...previous,...remote,introKo:{...previous.introKo,...remote.introKo},introJa:{...previous.introJa,...remote.introJa},introEn:{...previous.introEn,...remote.introEn}})); })
      .catch(()=>{});
  }, []);
  const [remoteVideos, setRemoteVideos] = useState({});
  const [slotMedia, setSlotMedia] = useState({});
  useEffect(() => {
    // 관리자가 올린 영상이 있으면 해당 장면만 교체하고 기존 영상은 안전하게 유지합니다.
    Promise.all(['V01','V02','V03','V04','V05','V06','V07','V08'].map(async scene => {
      try { const rows = await getSceneMedia(scene); return [scene, rows.find(row => row.kind === 'video')?.file_url]; }
      catch { return [scene, null]; }
    })).then(rows => setRemoteVideos(Object.fromEntries(rows.filter(([,url]) => url))));
  }, []);
  useEffect(() => {
    // 원래 V01~V08 파일은 그대로 두고 관리자에서 선택한 슬롯만 추가 적용합니다.
    Promise.all(['INTRO','LOGO','PROGRAM_AI','PROGRAM_WAIT','INCIDENT_AI','INCIDENT_WAIT'].map(async key=>{
      try { const rows=await getSceneMedia(key); return [key,rows.find(row=>['video','image'].includes(row.kind))||null]; }
      catch { return [key,null]; }
    })).then(items=>setSlotMedia(Object.fromEntries(items.filter(([,row])=>row))));
  }, []);
  const videos = useMemo(() => ({ ...settings.videos, ...remoteVideos }), [settings.videos, remoteVideos]);
  // 관리자에서 정한 기본 언어로 첫 화면을 시작합니다.
  const [language, setLanguage] = useState(() => loadAdminSettings().defaultLanguage);
  const contentLanguage = language;
  const [step, setStep] = useState(0);
  const [state, setState] = useState(initialState);
  const [profile, setProfile] = useState(readSavedProfile);
  // 아티스트는 관리자 CMS에 등록된 목록에서 참가자가 직접 선택합니다.
  const [selectedArtistKey, setSelectedArtistKey] = useState(() => loadAdminSettings().defaultArtistKey || 'kkugi');
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [selectedFinal, setSelectedFinal] = useState(null);
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [passportOpen, setPassportOpen] = useState(false);
  // FastAPI/Supabase에 저장할 현재 체험 세션 ID입니다. 서버가 꺼져 있어도 UI는 계속 동작합니다.
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('k-culture-session-id') || '');
  // 사용자가 화면 글자 크기를 직접 조절할 수 있게 90%~110% 범위로 유지합니다.
  const [fontScale, setFontScale] = useState(() => {
    const saved = Number(localStorage.getItem('k-culture-font-scale'));
    return saved >= 0.9 && saved <= 1.1 ? saved : 1;
  });
  const [startedAt, setStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (!startedAt) return undefined;
    const tick=()=>setElapsedSeconds(Math.max(0,Math.floor((Date.now()-startedAt)/1000)));
    tick(); const timer=setInterval(tick,1000); return()=>clearInterval(timer);
  }, [startedAt]);

  const activeArtists = useMemo(() => (settings.artistCatalog || [])
    .filter(item => item.active !== false)
    .sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)), [settings.artistCatalog]);
  const selectedArtist = activeArtists.find(item => item.key === selectedArtistKey) || activeArtists[0] || {
    key:'kkugi', name:settings.artistName || 'KKUGI', role:{ko:settings.artistRoleKo||'',ja:settings.artistRoleJa||'',en:settings.artistRoleEn||''},
    arrivalVideoUrl:videos.V07, resultVideoUrl:videos.V08, imageUrl:''
  };
  useEffect(() => {
    if (!activeArtists.length) return;
    if (activeArtists.some(item => item.key === selectedArtistKey)) return;
    const preferred = activeArtists.find(item => item.key === settings.defaultArtistKey) || activeArtists[0];
    setSelectedArtistKey(preferred.key);
  }, [activeArtists, selectedArtistKey, settings.defaultArtistKey]);
  const activeStages = useMemo(() => (settings.stageCatalog || []).filter(item=>item.active!==false).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)), [settings.stageCatalog]);
  const selectedStage = activeStages.find(item=>item.key === settings.defaultStageKey) || activeStages[0] || {key:'stage-main',name:'MAIN STAGE',imageUrl:''};

  // 뒤로 갔다가 다시 선택해도 점수가 중복되지 않도록 기준 상태를 보관합니다.
  const programBase = useRef(null);
  const incidentBase = useRef(null);
  const finalBase = useRef(null);

  // 관리자에서 수정한 V01 문구를 기본 번역 데이터에 합칩니다.
  const t = useMemo(() => {
    const base = text[contentLanguage];
    // 화면별 CMS의 편집값을 실제 사용자 문구에 연결합니다. 미설정 항목은 기존 문구 유지.
    const overrides = settings.pageCopy?.[language] || {};
    return {
      ...base,
      step: language==='en'?'STEP':base.step,
      home: language==='en'?'Home':base.home,
      intro: { ...base.intro,
        ...(language === 'ja' ? settings.introJa : language==='en' ? settings.introEn : settings.introKo),
      },
      profile: {...base.profile, ...overrides.profile},
      setup: {...base.setup, ...overrides.setup},
      plan: {...base.plan, ...overrides.plan},
      incident1: {...base.incident1, ...overrides.incident1},
      program: {...base.program, ...overrides.program},
      incident2: {...base.incident2, ...overrides.incident2},
      arrival: {...base.arrival, ...overrides.arrival},
      result: {...base.result, ...overrides.result},
    };
  }, [language, contentLanguage, settings.introJa, settings.introKo, settings.introEn, settings.pageCopy]);

  // 관리자 CMS에서 수정한 프로그램/돌발상황 텍스트와 미디어를 실제 화면에 연결합니다.
  const withProgramCopy = (key, base) => ({
    ...base,
    ko:{...base.ko,...(settings.programOverrides?.[key]?.ko || {})},
    ja:{...base.ja,...(settings.programOverrides?.[key]?.ja || {})},
    en:{...base.en,...(settings.programOverrides?.[key]?.en || {})},
  });
  const withIncidentCopy = (key, base) => ({
    ...base,
    ko:{...base.ko,...(settings.incidentOverrides?.[key]?.ko || {})},
    ja:{...base.ja,...(settings.incidentOverrides?.[key]?.ja || {})},
    en:{...base.en,...(settings.incidentOverrides?.[key]?.en || {})},
    options:(base.options || []).map((option,index)=>({
      ...option,
      ko:settings.incidentOptionOverrides?.[key]?.ko?.[index] || option.ko,
      ja:settings.incidentOptionOverrides?.[key]?.ja?.[index] || option.ja,
      en:settings.incidentOptionOverrides?.[key]?.en?.[index] || option.en,
    })),
  });
  const runtimePrograms = useMemo(() => ({
    kimchi: withProgramCopy('kimchi', { ...programs.kimchi, video: videos.V03 }),
    dance: withProgramCopy('dance', { ...programs.dance, video: videos.V04 }),
    ai: withProgramCopy('ai', { ...programs.ai, video: slotMedia.PROGRAM_AI?.kind==='video'?slotMedia.PROGRAM_AI.file_url: '', poster: slotMedia.PROGRAM_AI?.kind==='image'?slotMedia.PROGRAM_AI.file_url: programs.ai.poster, ko:{...programs.ai.ko,copy:settings.sceneNotes?.ai?.ko||programs.ai.ko.copy},ja:{...programs.ai.ja,copy:settings.sceneNotes?.ai?.ja||programs.ai.ja.copy},en:{...programs.ai.en,copy:settings.sceneNotes?.ai?.en||programs.ai.en.copy} }),
    wait: withProgramCopy('wait', { ...programs.wait, video: slotMedia.PROGRAM_WAIT?.kind==='video'?slotMedia.PROGRAM_WAIT.file_url: '', poster: slotMedia.PROGRAM_WAIT?.kind==='image'?slotMedia.PROGRAM_WAIT.file_url: programs.wait.poster, ko:{...programs.wait.ko,copy:settings.sceneNotes?.wait?.ko||programs.wait.ko.copy},ja:{...programs.wait.ja,copy:settings.sceneNotes?.wait?.ja||programs.wait.ja.copy},en:{...programs.wait.en,copy:settings.sceneNotes?.wait?.en||programs.wait.en.copy} }),
  }), [videos, slotMedia, settings.sceneNotes, settings.programOverrides]);
  const runtimeIncidents = useMemo(() => ({
    kimchi: withIncidentCopy('kimchi', { ...incidents.kimchi, video: videos.V05 }),
    dance: withIncidentCopy('dance', { ...incidents.dance, video: videos.V06 }),
    ai: withIncidentCopy('ai', { ...incidents.ai, video: slotMedia.INCIDENT_AI?.kind==='video'?slotMedia.INCIDENT_AI.file_url: '', poster: slotMedia.INCIDENT_AI?.kind==='image'?slotMedia.INCIDENT_AI.file_url: incidents.ai.poster }),
    wait: withIncidentCopy('wait', { ...incidents.wait, video: slotMedia.INCIDENT_WAIT?.kind==='video'?slotMedia.INCIDENT_WAIT.file_url: '', poster: slotMedia.INCIDENT_WAIT?.kind==='image'?slotMedia.INCIDENT_WAIT.file_url: incidents.wait.poster }),
  }), [videos, slotMedia, settings.incidentOverrides, settings.incidentOptionOverrides]);

  const program = selectedProgram ? runtimePrograms[selectedProgram] : null;
  const incident = selectedProgram ? runtimeIncidents[selectedProgram] : null;

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = `${t.intro.title1} ${t.intro.title2}`;
  }, [language, t.intro.title1, t.intro.title2]);

  useEffect(() => {
    // rem 단위로 만든 전체 UI가 같은 비율로 커지고 작아지도록 html 기준 글자 크기를 조절합니다.
    document.documentElement.style.fontSize = `${fontScale * 100}%`;
    localStorage.setItem('k-culture-font-scale', String(fontScale));
  }, [fontScale]);


  useEffect(() => {
    let cancelled = false;
    if (sessionId) return undefined;
    createExperienceSession({ language, nickname: profile.nickname })
      .then((row) => {
        if (cancelled) return;
        setSessionId(row.id);
        localStorage.setItem('k-culture-session-id', row.id);
      })
      .catch(() => { /* FastAPI 미실행 시 프런트 체험만 계속합니다. */ });
    return () => { cancelled = true; };
  }, [sessionId]);

  useEffect(() => {
    // 이동·새로고침 때 AI 결과를 보존합니다. 파일(data:) 원본은 보존하지 않습니다.
    if (!sessionId || !validSavedImage(profile.imageUrl)) return;
    try { sessionStorage.setItem(profileStorageKey(sessionId), JSON.stringify(profile)); } catch { /* 저장 공간 제한 시 현재 화면은 유지 */ }
  }, [sessionId, profile]);

  useEffect(() => {
    let cancelled = false;
    if (!sessionId) return undefined;
    getLatestCharacter(sessionId)
      .then((row) => {
        if (cancelled || !row?.image_url) return;
        setProfile((current) => {
          // 현재 화면에서 선택·생성한 이미지를 느리게 도착한 예전 서버 기록으로 덮지 않습니다.
          if ((current.imageMode === 'prompt' && current.promptGenerated && validSavedImage(current.imageUrl)) ||
              (current.imageMode === 'photo' && current.photoGenerated && validSavedImage(current.imageUrl))) return current;
          // 업로드 중 임시 미리보기는 서버의 예전 캐릭터로 덮지 않습니다.
          if (typeof current.imageUrl === 'string' && current.imageUrl.startsWith('data:')) return current;
          const mode = row.mode === 'photo' ? 'photo' : row.mode === 'prompt' ? 'prompt' : 'basic';
          const nextKey = DEFAULT_FALLBACK_KEYS.includes(row.character_key) ? row.character_key : current.characterKey;
          return { ...current,
            nickname: current.nickname || row.nickname || '', imageMode: mode, characterKey: nextKey,
            promptText: mode === 'prompt' ? (row.prompt_text || '') : '',
            promptGenerated: mode === 'prompt', photoGenerated: mode === 'photo',
            consent: mode === 'photo', imageUrl: row.image_url };
        });
      }).catch(() => {});
    return () => { cancelled = true; };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const sceneMap = ['V01', 'PROFILE', 'SETUP', 'PLAN', 'V02', selectedProgram ? runtimePrograms[selectedProgram]?.code : 'PROGRAM', selectedProgram ? runtimeIncidents[selectedProgram]?.code : 'INCIDENT', 'V07', 'V08'];
    updateExperienceSession(sessionId, {
      step,
      scene: sceneMap[step] || `STEP-${step}`,
      language,
      decision: state.decisions.at(-1) || null,
    }).catch(() => {});
  }, [step, language, sessionId, state.decisions, selectedProgram, runtimePrograms, runtimeIncidents]);

  useEffect(() => {
    const closeWithEscape = (event) => event.key === 'Escape' && setCertificateOpen(false);
    window.addEventListener('keydown', closeWithEscape);
    return () => window.removeEventListener('keydown', closeWithEscape);
  }, []);

  const moveTo = (nextStep) => {
    const target = Math.max(0, Math.min(nextStep, TOTAL_STEPS - 1));
    if (target > 0 && !startedAt) setStartedAt(Date.now());
    setStep(target);
    setMaxVisited(previous => Math.max(previous, target));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateSetup = (key, value) => {
    setState((current) => {
      const next = {
        ...initialState,
        fansKey: current.fansKey,
        fanCustom: current.fanCustom,
        cityKey: current.cityKey,
        budgetKey: current.budgetKey,
        moodKey: current.moodKey,
        [key]: value,
      };
      next.budget = budgetByLevel[budgetKeys[next.budgetKey]];
      return next;
    });
    // 조건을 바꾸면 이후 선택 결과를 초기화합니다.
    setSelectedProgram(null);
    setSelectedResponse(null);
    setSelectedFinal(null);
    setMaxVisited(2);
    programBase.current = null;
    incidentBase.current = null;
    finalBase.current = null;
  };

  const confirmProgram = () => {
    if (!selectedProgram) return;
    if (!programBase.current) programBase.current = { ...state, decisions: [] };
    const base = programBase.current;
    const selected = runtimePrograms[selectedProgram];
    let next = applyChanges(base, selected.changes);
    next = {
      ...next,
      time: base.time + selected.minutes,
      budget: base.budget - selected.cost,
      decisions: [{ type: 'program', key: selectedProgram }],
    };
    setState(next);
    incidentBase.current = next;
    finalBase.current = null;
    setSelectedResponse(null);
    setSelectedFinal(null);
    moveTo(5);
  };

  const confirmResponse = () => {
    if (selectedResponse === null || !incidentBase.current) return;
    const option = runtimeIncidents[selectedProgram].options[selectedResponse];
    let next = applyChanges(incidentBase.current, option.changes);
    next = { ...next, decisions: [...incidentBase.current.decisions, { type: 'incident', key: selectedProgram, index: selectedResponse }] };
    setState(next);
    finalBase.current = next;
    moveTo(7);
  };

  const confirmFinal = () => {
    if (!selectedFinal || !finalBase.current) return;
    const option = finalOptions[selectedFinal];
    let next = applyChanges(finalBase.current, option.changes);
    next = { ...next, decisions: [...finalBase.current.decisions, { type: 'final', key: selectedFinal }] };
    setState(next);
    moveTo(8);
  };

  const restart = () => {
    setMaxVisited(0);
    setState(initialState);
    setProfile(initialProfile);
    setSelectedProgram(null);
    setSelectedResponse(null);
    setSelectedFinal(null);
    setCertificateOpen(false);
    setPassportOpen(false);
    setStartedAt(null);
    setElapsedSeconds(0);
    programBase.current = null;
    incidentBase.current = null;
    finalBase.current = null;
    if (sessionId) sessionStorage.removeItem(profileStorageKey(sessionId));
    localStorage.removeItem('k-culture-session-id');
    setSessionId('');
    moveTo(0);
  };

  const setupText = {
    fans: `${state.fanCustom ?? settings.fanDefault ?? 100}${language==='ja'?'名':language==='en'?' people':'명'}`, 
    city: t.setup.cityOptions[state.cityKey],
    mood: t.setup.moodOptions[state.moodKey],
  };

  const decisionLabels = useMemo(() => state.decisions.map((decision) => {
    if (decision.type === 'program') return runtimePrograms[decision.key][contentLanguage].label;
    if (decision.type === 'incident') return runtimeIncidents[decision.key].options[decision.index][contentLanguage][2];
    return finalOptions[decision.key][contentLanguage];
  }), [state.decisions, language, runtimePrograms, runtimeIncidents]);

  const result = useMemo(() => createResult(state, contentLanguage), [state, contentLanguage]);
  const artistDisplay = `${selectedArtist.name} · ${(selectedArtist.role?.[language] || selectedArtist.role?.ko || '')}`;

  const updateAdminSettings = (nextSettings) => {
    saveAdminSettings(nextSettings);
    setSettings(nextSettings);
    setLanguage(nextSettings.defaultLanguage);
    setAdminOpen(false);
  };

  const restoreAdminSettings = () => {
    const defaults = resetAdminSettings();
    setSettings(defaults);
    setLanguage(defaults.defaultLanguage);
  };

  const pages = [
    <IntroPage t={t.intro} language={language} settings={{...settings, introVideoUrl: slotMedia.INTRO?.kind==='video' ? slotMedia.INTRO.file_url : settings.introVideoUrl, introPosterUrl: slotMedia.INTRO?.kind==='image'?slotMedia.INTRO.file_url:settings.introPosterUrl}} video={videos.V01} onNext={() => moveTo(1)} />,
    <ProfilePage characterCatalog={settings.characterCatalog || []} artistCatalog={activeArtists} selectedArtistKey={selectedArtist.key} onArtistChange={setSelectedArtistKey} t={{ ...t.profile, description: settings.screenCopy?.[`profile${language==='ja'?'Ja':language==='en'?'En':'Ko'}`] || t.profile.description, backLabel: t.prev }} language={language} sessionId={sessionId} profile={profile} artistName={selectedArtist.name} onChange={(changes) => setProfile((current) => ({ ...current, ...changes }))} onBack={() => moveTo(0)} onNext={() => moveTo(2)} />,
    <SetupPage t={t.setup} description={settings.screenCopy?.[`setup${language==='ja'?'Ja':language==='en'?'En':'Ko'}`]} language={language} settings={settings} backgroundVideoUrl={settings.setupBackgroundVideoUrl || ''} setup={{ ...state, backLabel: t.prev }} onSetup={updateSetup} onBack={() => moveTo(1)} onNext={() => moveTo(3)} />,
    <PlanPage t={t.plan} setupText={setupText} state={state} fanCount={Number(state.fanCustom ?? settings.fanDefault ?? 100)} planVariants={settings.planVariants || []} scheduleItems={settings.scheduleItems?.[language] || settings.scheduleItems?.ko || []} planNote={settings.planNotes?.[language] || settings.planNotes?.ko} language={language} artistDisplay={artistDisplay} backgroundVideoUrl={settings.planBackgroundVideoUrl || ''} onBack={() => moveTo(2)} onNext={() => moveTo(4)} />,
    <IncidentPage t={t.incident1} incidentCopy={settings.incidentCopy?.[language] || t.incident1.copy} delayMinutes={settings.delayMinutes} yenPerManWon={settings.yenPerManWon ?? 100} statusText={t.status} state={state} language={contentLanguage} programs={runtimePrograms} video={videos.V02} selected={selectedProgram} onSelect={key => { setSelectedProgram(key); setSelectedResponse(null); setSelectedFinal(null); setMaxVisited(4); }} onBack={() => moveTo(3)} onNext={confirmProgram} />,
    program && <ProgramPage t={t.program} statusText={t.status} state={state} language={contentLanguage} program={program} yenPerManWon={settings.yenPerManWon ?? 100} onBack={() => moveTo(4)} onNext={() => moveTo(6)} />,
    incident && <SecondIncidentPage t={t.incident2} statusText={t.status} state={state} language={contentLanguage} incident={incident} selected={selectedResponse} onSelect={setSelectedResponse} onBack={() => moveTo(5)} onNext={confirmResponse} />,
    <ArrivalPage t={t.arrival} statusText={t.status} backLabel={t.incident2.back} state={state} language={contentLanguage} artistName={selectedArtist.name} artist={selectedArtist} video={selectedArtist.arrivalVideoUrl || ''} options={finalOptions} cmsOptions={settings.finalProgramOptions} selected={selectedFinal} onSelect={setSelectedFinal} onBack={() => moveTo(6)} onNext={confirmFinal} />,
    <ResultPage sessionId={sessionId} billboardBackgroundVideoUrl={settings.billboardBackgroundVideoUrl || ''} connectCopy={settings.connectWallCopy} tickerDurationSeconds={settings.tickerDurationSeconds} t={t.result} language={contentLanguage} state={state} result={result} profile={profile} artistName={selectedArtist.name} artist={selectedArtist} stage={selectedStage} video={selectedArtist.resultVideoUrl || ''} programLabel={program?.[contentLanguage].label ?? ''} decisionLabels={decisionLabels} certificateOpen={certificateOpen} onCertificate={() => setCertificateOpen(true)} onClose={() => setCertificateOpen(false)} onRestart={restart} />,
  ];

  return (
    <>
      <Header
        step={step}
        total={TOTAL_STEPS}
        elapsedSeconds={elapsedSeconds}
        language={language}
        t={t}
        settings={{...settings,logoImageUrl:slotMedia.LOGO?.kind==='image'?slotMedia.LOGO.file_url:settings.logoImageUrl}}
        maxVisited={maxVisited}
        onStep={index=>index<=maxVisited && pages[index] && moveTo(index)}
        fontScale={fontScale}
        onHome={restart}
        onLanguage={setLanguage}
        onFontDecrease={() => setFontScale((current) => Math.max(0.9, Number((current - 0.1).toFixed(1))))}
        onFontReset={() => setFontScale(1)}
        onFontIncrease={() => setFontScale((current) => Math.min(1.1, Number((current + 0.1).toFixed(1))))}
        onAdmin={() => { window.location.href = "/admin"; }}
      />
      <ExperienceAudio step={step} language={language} settings={settings} started={Boolean(startedAt || step > 0)} />
      {step > 0 && <button type="button" className="passport-launch" onClick={() => setPassportOpen(true)}>📘 {language === 'ja' ? 'マイパスポート' : '나의 여권'} · {Math.round(step / 8 * 100)}%</button>}
      <main>{pages[step]}</main>
      {passportOpen && <PassportPanel language={language} nickname={profile.nickname} image={profile.imageUrl} sessionId={sessionId} step={step} onClose={() => setPassportOpen(false)} />}
    </>
  );
}

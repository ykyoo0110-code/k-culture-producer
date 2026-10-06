import { useCallback, useEffect, useState } from 'react';
import { adminLogin, adminRequest } from '../services/adminApi';
import AdminAudioPanel from '../components/AdminAudioPanel';
import AdminSceneWorkspace from '../components/AdminSceneWorkspace';
import { defaultAdminSettings, loadAdminSettings, normalizeAdminSettings, saveAdminSettings, resetAdminSettings } from '../utils/adminSettings';

const SCENES = ['V01','V02','V03','V04','V05','V06','V07','V08'];
export default function AdminDashboard() {
  const [stepPreview, setStepPreview] = useState(null);
  const [token, setToken] = useState(() => sessionStorage.getItem('kcp-admin-token') || '');
  const [settings, setSettings] = useState(loadAdminSettings);
  const [password, setPassword] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [audioNotice, setAudioNotice] = useState({});
  const [busy, setBusy] = useState(false);
  // 화면별 작업공간: 다른 화면의 편집/기록이 섞이지 않도록 한 패널씩 표시합니다.
  const [activePanel, setActivePanel] = useState('intro');
  const [mediaView, setMediaView] = useState('active');
  const [scene, setScene] = useState('LIBRARY');
  const [kind, setKind] = useState('video');
  const [file, setFile] = useState(null);
  // 선택 즉시 로컬 파일을 미리 보여줍니다. 서버 연결 없이도 동작합니다.
  const [previewUrl, setPreviewUrl] = useState('');
  useEffect(() => {
    if (!file) { setPreviewUrl(''); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const [characterKey, setCharacterKey] = useState('mina');
  const [mediaTitle, setMediaTitle] = useState('');
  const [editingMedia, setEditingMedia] = useState(null);
  const [quickUploading, setQuickUploading] = useState('');
  const [cleanupPreview, setCleanupPreview] = useState(null);
  const [dataNotice, setDataNotice] = useState('');
  const [previewModal, setPreviewModal] = useState(null);
  const refresh = useCallback(async () => {
    if (!token) return;
    try { setData(await adminRequest('/api/admin/overview', token)); setError(''); }
    catch (err) { setError(err.message); if (err.message.includes('401')) { sessionStorage.removeItem('kcp-admin-token'); setToken(''); } }
  }, [token]);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    // 서버 설정을 읽어 브라우저별로 관리 내용이 달라지지 않게 합니다.
    fetch(`${import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || '')}/api/site-content`)
      .then(r => { if (!r.ok) throw new Error('content'); return r.json(); })
      .then(remote => setSettings(current => normalizeAdminSettings({...current,...remote,introKo:{...current.introKo,...remote.introKo},introJa:{...current.introJa,...remote.introJa},introEn:{...current.introEn,...remote.introEn}})))
      .catch(() => {});
  }, []);
  const saveSiteSettings = async (next, audioOnly = false) => {
    setBusy(true); setError(''); setSaveNotice('');
    try {
      const saved = await adminRequest(audioOnly ? '/api/admin/audio-settings' : '/api/admin/site-content', token, {method:audioOnly ? 'PATCH' : 'PUT', body:JSON.stringify(audioOnly ? {audioScenes:next.audioScenes,commonBgmUrl:next.commonBgmUrl||'',masterSoundEnabled:next.masterSoundEnabled!==false} : next)});
      const merged={...loadAdminSettings(),...saved};
      saveAdminSettings(merged); setSettings(merged);
      setSaveNotice(audioOnly ? '오디오 설정이 저장되었습니다. 사용자 화면을 새로고침하세요.' : '설정이 저장되었습니다. 번역 결과를 확인하고 사용자 화면을 새로고침하세요.');
      return true;
    } catch(err) { setError(`콘텐츠 저장 실패: ${err.message}`); return false; }
    finally { setBusy(false); }
  };
  const login = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await adminLogin(password); sessionStorage.setItem('kcp-admin-token', result.token); setToken(result.token); setPassword(''); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const changeStatus = async (id, status) => {
    setBusy(true);
    try { await adminRequest(`/api/messages/${id}/status?status=${status}`, token, { method:'PATCH' }); await refresh(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const toggleMedia = async (id, active) => {
    setBusy(true);
    try { await adminRequest(`/api/admin/media/${id}?active=${active}`, token, { method:'PATCH' }); await refresh(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const upload = async (event) => {
    event.preventDefault(); if (!file) return;
    setBusy(true); setError('');
    try { const form = new FormData(); form.append('scene',scene); form.append('kind',['CHARACTERS','LOGO','SOUVENIR_STAGE'].includes(scene) ? 'image' : kind); form.append('title', scene === 'CHARACTERS' ? characterKey : mediaTitle.trim()); form.append('file',file);
      const uploaded = await adminRequest('/api/media/upload', token, { method:'POST', body:form });
      if (scene === 'LOGO' || scene === 'INTRO') {
        const url = uploaded.file_url;
        if (url) {
          const updated = {...settings, [scene === 'LOGO' ? 'logoImageUrl' : kind === 'video' ? 'introVideoUrl' : 'introPosterUrl']: url,
            ...(scene === 'INTRO' && kind !== 'video' ? { articleImageUrl: url } : {})};
          if (!await saveSiteSettings(updated)) throw new Error('파일 등록은 완료됐지만 화면 설정 저장에 실패했습니다. 기존 화면 연결을 확인하고 설정 저장을 다시 시도하세요.');
        }
      }
      setFile(null); setMediaTitle(''); await refresh(); } 
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const quickUpload = async (event, target) => {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    const isStep = target.startsWith('homeStep');
    // 스텝마다 등록 구분을 분리해 업로드가 메인 배경(INTRO)이나 다른 스텝을 비활성화하지 않게 합니다.
    // 저장 인덱스를 사용하므로 PHOTO 추가로 표시 순서가 바뀌어도 기존 연결을 유지합니다.
    const sceneName = isStep ? `HOME_STEP_${Number(target.replace('homeStep', '')) + 1}`
      : target === 'logo' ? 'LOGO' : 'INTRO';
    const kindName = isStep ? (selected.type.startsWith('video/') ? 'video' : 'image') : (target === 'logo' || target === 'introPoster' ? 'image' : 'video');
    setQuickUploading(target); setError('');
    try {
      const form = new FormData();
      form.append('scene', sceneName);
      form.append('kind', kindName);
      form.append('title', isStep ? `메인 단계 ${[0,1,2,4,3].indexOf(Number(target.replace('homeStep','')))+1}` : target === 'logo' ? '메인 로고' : target === 'introPoster' ? '메인 기사 이미지' : '메인 배경 영상');
      form.append('file', selected);
      const uploaded = await adminRequest('/api/media/upload', token, {method:'POST', body:form});
      if (uploaded?.file_url) {
        let updated;
        if (isStep) {
          const index = Number(target.replace('homeStep',''));
          const media = [...(settings.homeStepMedia || [])];
          media[index] = {url: uploaded.file_url, type: kindName};
          updated = {...settings, homeStepMedia: media};
        } else {
          updated = {...settings, ...(target === 'introPoster' ? {introPosterUrl:uploaded.file_url,articleImageUrl:uploaded.file_url} : {[target === 'logo' ? 'logoImageUrl' : 'introVideoUrl']:uploaded.file_url})};
        }
        if (!await saveSiteSettings(updated)) throw new Error('파일 등록은 완료됐지만 화면 설정 저장에 실패했습니다. 기존 화면 연결을 확인하고 설정 저장을 다시 시도하세요.');
      }
      await refresh();
    } catch (err) {
      setError(`${isStep ? '단계 미디어' : target === 'logo' ? '로고' : target === 'introPoster' ? '기사 이미지' : '메인 영상'} 업로드 실패: ${err.message}`);
    } finally { setQuickUploading(''); }
  };
  const uploadCharacterImage = async (event, characterKey) => {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    setQuickUploading(`character-${characterKey}`); setError('');
    try {
      const form = new FormData();
      form.append('scene', 'CHARACTERS');
      form.append('kind', 'image');
      form.append('title', characterKey);
      form.append('file', selected);
      await adminRequest('/api/media/upload', token, {method:'POST', body:form});
      await refresh();
    } catch (err) {
      setError(`캐릭터 이미지 업로드 실패: ${err.message}`);
    } finally { setQuickUploading(''); }
  };
  const goToSection = (id) => document.getElementById(id)?.scrollIntoView({behavior:'smooth', block:'start'});
  const activeMedia = (data?.media || []).filter(row => row.active);
  // 보관함과 비활성 기록도 확인할 수 있게 하되, 처음에는 활성 등록 자료만 표시합니다.
  const currentMedia = (data?.media || []).filter(row => mediaView === 'all' || (mediaView === 'library' ? row.scene === 'LIBRARY' : mediaView === 'inactive' ? !row.active : row.active && row.scene !== 'LIBRARY'));
  // overview는 created_at DESC 순서입니다. 같은 캐릭터의 과거 active 데이터가 남아 있어도
  // 가장 최신 행(첫 번째)만 관리자 미리보기에 사용합니다.
  const characterImages = activeMedia
    .filter(row => row.scene === 'CHARACTERS' && row.kind === 'image')
    .reduce((images, row) => {
      const key = String(row.title || '').trim().toLowerCase();
      if (key && !images[key]) {
        const version = encodeURIComponent(row.updated_at || row.created_at || row.id || 'latest');
        const joiner = String(row.file_url || '').includes('?') ? '&' : '?';
        images[key] = row.file_url ? `${row.file_url}${joiner}v=${version}` : '';
      }
      return images;
    }, {});
  const updateIntroQuick = (lang, key, value) => {
    const group = lang === 'ko' ? 'introKo' : lang === 'ja' ? 'introJa' : 'introEn';
    setSettings(current => ({...current, [group]: {...current[group], [key]: value}}));
  };
  const updateArticleQuick = (lang, key, value) => {
    setSettings(current => ({...current, articleCopy: {...current.articleCopy, [lang]: {...(current.articleCopy?.[lang] || {}), [key]: value}}}));
  };

  // Register/edit/delete operate on the actual DB and Supabase Storage, not browser-only state.
  const saveMedia = async (event) => {
    event.preventDefault(); if (!editingMedia) return;
    setBusy(true); setError('');
    try {
      await adminRequest(`/api/admin/media/${editingMedia.id}`, token, {
        method: 'PUT', body: JSON.stringify({title: editingMedia.title, sort_order: Number(editingMedia.sort_order), active: editingMedia.active})
      });
      setEditingMedia(null); await refresh();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const deleteMedia = async (row) => {
    if (!window.confirm(`미디어 [${row.title || row.scene}]를 영구 삭제할까요?`)) return;
    setBusy(true); setError('');
    try { await adminRequest(`/api/admin/media/${row.id}`, token, {method: 'DELETE'}); await refresh(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const updateArtist = (key, changes) => setSettings(current => ({
    ...current,
    artistCatalog: (current.artistCatalog || []).map(item => item.key === key ? {...item, ...changes} : item),
  }));
  // 연예인 이름을 바꾸면 기본 이름과 07 도착 제목도 같이 맞춰집니다.
  const updateArtistName = (key, name) => setSettings(current => ({
    ...current,
    artistName: current.defaultArtistKey === key ? name : current.artistName,
    artistCatalog: (current.artistCatalog || []).map(item => item.key === key ? {
      ...item, name,
      arrivalTitle: { ko:`${name}가 도착했습니다`, ja:`${name}が到着しました`, en:`${name} has arrived` },
    } : item),
  }));
  const addArtist = () => {
    const key=`artist-${Date.now()}`;
    const next={key,name:'NEW ARTIST',active:true,sortOrder:(settings.artistCatalog?.length||0)+1,
      role:{ko:'연예인',ja:'アーティスト',en:'Artist'},description:{ko:'',ja:'',en:''},imageUrl:'',relatedVideo1Url:'',relatedVideo2Url:'',arrivalVideoUrl:'',resultVideoUrl:'',
      arrivalTitle:{ko:'연예인이 도착했습니다',ja:'アーティストが到着しました',en:'The artist has arrived'},arrivalCopy:{ko:'남은 시간을 고려해 마지막 프로그램을 조정하세요.',ja:'残り時間を考慮して最後のプログラムを調整してください。',en:'Adjust the final program for the remaining time.'}};
    setSettings(current=>({...current,artistCatalog:[...(current.artistCatalog||[]),next]}));
  };
  const removeArtist = key => {
    if (!window.confirm('이 연예인 항목을 관리자 목록에서 삭제할까요?')) return;
    setSettings(current=>({...current,artistCatalog:(current.artistCatalog||[]).filter(item=>item.key!==key),defaultArtistKey:current.defaultArtistKey===key?'':current.defaultArtistKey}));
  };
  const updateStage = (key, changes) => setSettings(current => ({
    ...current, stageCatalog:(current.stageCatalog||[]).map(item=>item.key===key?{...item,...changes}:item),
  }));
  const addStage = () => {
    const key=`stage-${Date.now()}`;
    setSettings(current=>({...current,stageCatalog:[...(current.stageCatalog||[]),{key,name:'NEW STAGE',imageUrl:'',active:true,sortOrder:(current.stageCatalog?.length||0)+1}]}));
  };
  const removeStage = key => {
    if (!window.confirm('이 무대 항목을 관리자 목록에서 삭제할까요?')) return;
    setSettings(current=>({...current,stageCatalog:(current.stageCatalog||[]).filter(item=>item.key!==key),defaultStageKey:current.defaultStageKey===key?'':current.defaultStageKey}));
  };
  const uploadCatalogAsset = async (event, {scene, key, field, kind='image', type='artist'}) => {
    const selected=event.target.files?.[0]; event.target.value='';
    if (!selected) return;
    const busyKey=`catalog-${scene}-${key}`; setQuickUploading(busyKey); setError('');
    try {
      const form=new FormData(); form.append('scene',scene); form.append('kind',kind); form.append('title',key); form.append('file',selected);
      const uploaded=await adminRequest('/api/media/upload',token,{method:'POST',body:form});
      if (uploaded?.file_url) {
        const next={...settings};
        if (type==='stage') next.stageCatalog=(settings.stageCatalog||[]).map(item=>item.key===key?{...item,[field]:uploaded.file_url}:item);
        else next.artistCatalog=(settings.artistCatalog||[]).map(item=>item.key===key?{...item,[field]:uploaded.file_url}:item);
        if (!await saveSiteSettings(next)) throw new Error('파일 등록은 완료됐지만 화면 설정 저장에 실패했습니다. 설정 저장을 다시 시도하세요.');
      }
      await refresh();
    } catch(err) { setError(`CMS 파일 업로드 실패: ${err.message}`); }
    finally { setQuickUploading(''); }
  };
  const uploadAudioAsset = async (event, sceneKey, field, audioLanguage = '') => {
    const selected=event.target.files?.[0]; event.target.value='';
    if (!selected) return;
    // 언어별 등록 구분을 분리해 다른 언어의 음성을 교체 대상으로 잡지 않습니다.
    const sceneName=`AUDIO_${sceneKey.toUpperCase()}_${field==='bgmUrl'?'BGM':audioLanguage ? `AI_${audioLanguage.toUpperCase()}` : 'AI'}`;
    const busyKey=`audio-${sceneName}`; setQuickUploading(busyKey); setError('');
    setAudioNotice(current=>({...current,[sceneKey]:{state:'pending',text:`${selected.name} · 변환 및 업로드 중…`}}));
    try {
      const form=new FormData(); form.append('scene',sceneName); form.append('kind','audio'); form.append('title',`${sceneKey}-${field}`); form.append('file',selected);
      const uploaded=await adminRequest('/api/media/upload',token,{method:'POST',body:form});
      if (uploaded?.file_url) {
        const existing = settings.audioScenes?.[sceneKey] || {};
        const change = audioLanguage ? {aiAudioUrls:{...(existing.aiAudioUrls||{}),[audioLanguage]:uploaded.file_url}} : {[field]:uploaded.file_url};
        const next=sceneKey==='common' ? {...settings,commonBgmUrl:uploaded.file_url} : {...settings,audioScenes:{...settings.audioScenes,[sceneKey]:{...existing,...change, ...(audioLanguage ? {aiEnabled:true} : {})}}};
        if (!await saveSiteSettings(next,true)) throw new Error('파일 등록은 완료됐지만 화면 설정 저장에 실패했습니다. 설정 저장을 다시 시도하세요.');
      }
      setAudioNotice(current=>({...current,[sceneKey]:{state:'success',text:`${selected.name} · 등록 및 적용 완료. 위에서 미리 듣기를 확인하세요.`}}));
      await refresh();
    } catch(err) { setError(`오디오 업로드 실패: ${err.message}`); setAudioNotice(current=>({...current,[sceneKey]:{state:'error',text:err.message}})); }
    finally { setQuickUploading(''); }
  };
  const downloadBackup = async () => {
    setBusy(true); setError(''); setDataNotice('');
    try {
      const base=import.meta.env.DEV?'':(import.meta.env.VITE_API_BASE_URL||'');
      const response=await fetch(`${base}/api/admin/backup.zip`,{headers:{Authorization:`Bearer ${token}`}});
      if(!response.ok) throw new Error(await response.text());
      const blob=await response.blob(); const url=URL.createObjectURL(blob); const a=document.createElement('a');
      a.href=url; a.download=`k_culture_backup_${new Date().toISOString().slice(0,10)}.zip`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      setDataNotice('백업 ZIP을 다운로드했습니다. DB 정리 전에 이 파일을 별도로 보관하세요.');
    } catch(err) { setError(`백업 실패: ${err.message}`); }
    finally { setBusy(false); }
  };
  const retentionPayload = (confirm=false) => ({
    session_days:Number(settings.dataRetention?.sessionDays||180), character_days:Number(settings.dataRetention?.characterDays||90),
    message_days:Number(settings.dataRetention?.messageDays||180), certificate_days:Number(settings.dataRetention?.certificateDays||365), confirm,
  });
  const previewCleanup = async () => {
    setBusy(true); setError(''); setDataNotice('');
    try { setCleanupPreview(await adminRequest('/api/admin/data/cleanup-preview',token,{method:'POST',body:JSON.stringify(retentionPayload(false))})); }
    catch(err){ setError(`DB 정리 미리보기 실패: ${err.message}`); }
    finally{ setBusy(false); }
  };
  const runCleanup = async () => {
    if(!cleanupPreview) return;
    const total=Object.values(cleanupPreview).reduce((sum,row)=>sum+Number(row?.count||0),0);
    if(!window.confirm(`백업을 완료했는지 확인해 주세요. 오래된 데이터 ${total}건을 실제 DB에서 삭제할까요?`)) return;
    setBusy(true); setError(''); setDataNotice('');
    try { const result=await adminRequest('/api/admin/data/cleanup',token,{method:'POST',body:JSON.stringify(retentionPayload(true))}); setDataNotice(`DB 정리 완료: ${Object.entries(result.deleted||{}).map(([k,v])=>`${k} ${v}건`).join(' · ')}`); setCleanupPreview(null); await refresh(); }
    catch(err){ setError(`DB 정리 실패: ${err.message}`); }
    finally{ setBusy(false); }
  };
  const logout = () => { sessionStorage.removeItem('kcp-admin-token'); setToken(''); setData(null); };
  return <div className="admin-dashboard">
    <header><h1>K-CULTURE · ADMIN</h1><div className="admin-header-actions"><button type="button" className="admin-experience-button" onClick={()=>{ window.location.href='/'; }}>체험 화면으로</button>{token && <button type="button" onClick={logout}>로그아웃</button>}</div></header>
    {!token ? <form className="admin-login" onSubmit={login}><h2>관리자 로그인</h2><p>backend/.env의 ADMIN_PASSWORD를 입력하세요.</p><input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/><button disabled={busy}>로그인</button></form>
      : <><nav className="admin-nav" aria-label="관리 화면 선택">
        {[
          ['intro','01 · 시작/기사'],['profile','02 · 캐릭터'],['setup','03 · 조건 설정'],
          ['plan','04 · 운영안'],['program','05~06 · 프로그램'],['incident','07 · 돌발상황'],
          ['arrival','08 · 배우 도착'],['result','09 · 결과/기념사진'],
          ['artists','연예인 CMS'],['stages','무대 CMS'],['audio','BGM / AI 안내'],['wall','결과 화면 · 메시지 관리'],['records','참가자/확인증'],['data','백업 / DB 관리'],['media','전체 미디어'],
        ].map(([key,label])=><button key={key} type="button" className={activePanel===key?'admin-nav-primary':''} aria-current={activePanel===key?'page':undefined} onClick={()=>{setActivePanel(key);setEditingMedia(null);}}>{label}</button>)}
        <button type="button" className="admin-nav-refresh" onClick={refresh}>새로고침</button>
      </nav>
      <p className="admin-save-scope-note">설정 저장 버튼은 다른 메뉴에서 수정 중인 설정도 함께 저장합니다. 파일 업로드는 별도로 등록되며, 사용자 화면은 새로고침 후 확인하세요.</p>
      {saveNotice && <p className="admin-save-notice" role="status">{saveNotice}</p>}
      {data && <>
        <section id="screen-management" className="admin-screen-management" data-admin-panel="intro" data-visible={activePanel==='intro'}>
          <div className="admin-section-head">
            <div><p className="admin-kicker">SCREEN 01</p><h2>첫 화면 관리</h2><p>현재 사용자 화면에 들어가 있는 로고·기사 영상·문구를 바로 확인하고 교체합니다.</p></div>
            <div className="admin-header-inline-controls"><label>문구 크기(%) <input type="number" min="80" max="140" value={settings.introFontSize||100} onChange={e=>setSettings(current=>({...current,introFontSize:Number(e.target.value)}))}/></label><label>정렬 <select value={settings.introAlign||'left'} onChange={e=>setSettings(current=>({...current,introAlign:e.target.value}))}><option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option></select></label></div>
          </div>
          <div className="admin-screen-cards">
            <article className="admin-screen-card">
              <div className="admin-card-title"><strong>메인 왼쪽 로고</strong><span>현재 적용값</span></div>
              <div className="admin-logo-preview">
                {settings.logoImageUrl ? <img src={settings.logoImageUrl} alt="현재 메인 로고"/> : <div className="admin-logo-text-preview"><b>{settings.logoMark || 'K'}</b><span>{settings.logoName || 'K-CULTURE PRODUCER'}</span></div>}
              </div>
              <label className="admin-file-button">
                {quickUploading==='logo' ? '로고 업로드 중…' : '로고 이미지 교체'}
                <input type="file" accept="image/png,image/jpeg,image/webp" disabled={!!quickUploading} onChange={e=>quickUpload(e,'logo')}/>
              </label>
              <small>PNG / JPG / WEBP · 업로드하면 사용자 화면 로고에 바로 연결됩니다.</small>
            </article>
            <article className="admin-screen-card">
              <div className="admin-card-title"><strong>메인 배경 영상</strong><span>현재 적용값</span></div>
              <div className="admin-intro-preview"><video src={settings.introVideoUrl || '/videos/KCULTURE_HOME_DEMO.mp4'} controls muted playsInline preload="metadata"/></div>
              <label className="admin-file-button">
                {quickUploading==='intro' ? '영상 업로드 중…' : '메인 배경 영상 업로드 / 교체'}
                <input type="file" accept="video/mp4,video/webm" disabled={!!quickUploading} onChange={e=>quickUpload(e,'intro')}/>
              </label>
              <small>기본 K-CULTURE 데모 영상이 자동 재생됩니다. MP4 / WEBM을 올리면 메인 배경 영상이 즉시 교체됩니다.</small>
              <div className="admin-intro-poster-management">
                <strong>하단 5단계 이미지 / 영상</strong>
                <small>CHOOSE · PLAN · CREATE · PHOTO · CONNECT 각각 이미지 또는 MP4/WEBM을 등록할 수 있습니다.</small>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:'8px',marginTop:'10px'}}>
                  {/* 표시 순서와 저장 인덱스를 구분해 기존 CONNECT 자료 연결을 유지합니다. */}
                  {[0,1,2,4,3].map((index,displayIndex)=>{const media=(settings.homeStepMedia||[])[index]||{};const fallback=['/images/V01_fanmeeting_arrival.png','/images/V02_artist_delay.png','/images/V04_dance_keyframe.png','/images/kcp-artwork-donga-reference.png','/images/kcp-artwork-souvenir-reference.png'][index];return <article className="admin-step-asset" key={index}><strong>{String(displayIndex+1).padStart(2,'0')} · {['CHOOSE','PLAN','CREATE','PHOTO','CONNECT'][displayIndex]}</strong>{media.type==='video'&&media.url?<video src={media.url} controls muted playsInline preload="metadata"/>:<img src={media.url||fallback} alt="현재 메인 스텝 이미지"/>}<small>{media.url?'등록 자료 적용':'기본 이미지 사용'}</small><label className="admin-file-button">{quickUploading===`homeStep${index}`?'업로드 중…':'이미지 / 영상 교체'}<input type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" disabled={!!quickUploading} onChange={e=>quickUpload(e,`homeStep${index}`)}/></label></article>;})}
                </div>
              </div>
              <div className="admin-intro-poster-management">
                <strong>기사 포스터·이미지</strong>
                <img src={settings.articleImageUrl || '/images/article-reference.png'} alt="현재 기사 이미지" />
                <label className="admin-file-button">{quickUploading==='introPoster'?'이미지 업로드 중…':'기사 이미지 교체'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={!!quickUploading} onChange={e=>quickUpload(e,'introPoster')}/></label>
              </div>
            </article>
            <article className="admin-screen-card admin-copy-preview admin-copy-editor-card">
              <div className="admin-card-title"><strong>메인 기사·헤더 문구 수정</strong><span>편집 후 저장</span></div>
              <section className="admin-inline-language">
                <b>한국어 (관리자 입력)</b>
                <label>로고 옆 문구<input value={settings.logoSideText || ''} onChange={e=>setSettings(current=>({...current,logoSideText:e.target.value}))}/></label>
                <label>기사 출처/분류<input value={settings.articleCopy?.ko?.source || ''} onChange={e=>updateArticleQuick('ko','source',e.target.value)}/></label>
                <label>기사 제목<input value={settings.articleCopy?.ko?.headline || ''} onChange={e=>updateArticleQuick('ko','headline',e.target.value)}/></label>
              </section>
              <div className="admin-inline-actions"><button type="button" className="admin-save-copy" disabled={busy} onClick={()=>saveSiteSettings(settings)}>{busy?'저장 중…':'저장 + 일본어·영어 자동번역'}</button></div>
              <small>관리자는 한국어만 수정합니다. 저장할 때 일본어·영어가 자동 생성됩니다.</small>
            </article>
          </div>
        </section>
        {activePanel!=='intro' && activePanel!=='records' && activePanel!=='media' && activePanel!=='artists' && activePanel!=='stages' && activePanel!=='audio' && activePanel!=='data' && <AdminSceneWorkspace panel={activePanel} settings={settings} setSettings={setSettings} saveSettings={saveSiteSettings} token={token} media={data.media||[]} refresh={refresh} busy={busy} setError={setError} />}
        <section className="admin-cms-catalog" data-admin-panel="artists" data-visible={activePanel==='artists'}>
          <div className="admin-list-head"><div><h2>연예인 CMS</h2><p>2번 선택 화면의 배우 이미지, 8번 도착 영상, 9번 결과 영상을 배우별로 관리합니다. 기념사진 합성용 이미지는 배경이 투명한 PNG를 권장합니다.</p></div><button type="button" onClick={addArtist}>+ 연예인 추가</button></div>
          <label className="admin-workspace-field">기본 연예인<select value={settings.defaultArtistKey||''} onChange={e=>setSettings(current=>({...current,defaultArtistKey:e.target.value}))}><option value="">첫 번째 활성 연예인</option>{(settings.artistCatalog||[]).map(item=><option key={item.key} value={item.key}>{item.name||item.key}</option>)}</select></label>
          <div className="admin-cms-grid">{[...(settings.artistCatalog||[])].sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)).map(item=><article className="admin-cms-card" key={item.key}>
            <div className="admin-cms-preview admin-preview-clickable" onClick={()=>item.imageUrl&&setPreviewModal({src:item.imageUrl,title:item.name||item.key})}>{item.imageUrl?<img src={item.imageUrl} alt={item.name}/>:<span>ARTIST IMAGE</span>}{item.imageUrl&&<em>클릭해서 크게 보기</em>}</div>
            <small>{item.key}</small>
            <label>이름<input value={item.name||''} onChange={e=>updateArtistName(item.key,e.target.value)}/><small>이름을 바꾸면 기본 연예인 이름과 도착 제목에도 같이 반영됩니다.</small></label>
            <label>역할(한국어)<input value={item.role?.ko||''} onChange={e=>updateArtist(item.key,{role:{...(item.role||{}),ko:e.target.value}})}/></label>
            <label>8번 도착 화면 · 제목(한국어)<input value={item.arrivalTitle?.ko||''} onChange={e=>updateArtist(item.key,{arrivalTitle:{...(item.arrivalTitle||{}),ko:e.target.value}})}/></label>
            <label>8번 도착 화면 · 설명(한국어)<textarea rows="2" value={item.arrivalCopy?.ko||''} onChange={e=>updateArtist(item.key,{arrivalCopy:{...(item.arrivalCopy||{}),ko:e.target.value}})}/></label>
            <label>순서<input type="number" min="1" value={item.sortOrder||1} onChange={e=>updateArtist(item.key,{sortOrder:Number(e.target.value)})}/></label>
            <label className="admin-card-check"><input type="checkbox" checked={item.active!==false} onChange={e=>updateArtist(item.key,{active:e.target.checked})}/> 참가자 선택 화면에 표시</label>
            <details className="admin-cms-current-paths"><summary>고급 설정 · 이미지/영상 URL 직접 입력</summary><label>선택·기념사진 배우 이미지 URL<input value={item.imageUrl||''} onChange={e=>updateArtist(item.key,{imageUrl:e.target.value})}/></label><label>8번 도착 영상 URL<input value={item.arrivalVideoUrl||''} onChange={e=>updateArtist(item.key,{arrivalVideoUrl:e.target.value})}/></label><label>9번 결과 영상 URL<input value={item.resultVideoUrl||''} onChange={e=>updateArtist(item.key,{resultVideoUrl:e.target.value})}/></label></details>
            <div className="admin-linked-previews">{[['arrivalVideoUrl','8번 · 배우 도착'],['resultVideoUrl','9번 · 체험 결과']].map(([field,label])=><div key={field}><strong>{label}</strong>{item[field]?<video src={item[field]} controls muted playsInline preload="metadata"/>:<p>영상 미등록 · 배우 이미지로 대체 표시</p>}</div>)}</div>
            <div className="admin-cms-files">
              <label>{quickUploading===`catalog-ARTIST_IMAGE-${item.key}`?'업로드 중…':'연예인 캐릭터 이미지'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>uploadCatalogAsset(e,{scene:'ARTIST_IMAGE',key:item.key,field:'imageUrl',kind:'image'})}/></label>
              <label>{quickUploading===`catalog-ARTIST_ARRIVAL-${item.key}`?'업로드 중…':'8번 배우 도착 영상'}<input type="file" accept="video/mp4,video/webm" onChange={e=>uploadCatalogAsset(e,{scene:'ARTIST_ARRIVAL',key:item.key,field:'arrivalVideoUrl',kind:'video'})}/></label>
              <label>{quickUploading===`catalog-ARTIST_RESULT-${item.key}`?'업로드 중…':'9번 결과 영상'}<input type="file" accept="video/mp4,video/webm" onChange={e=>uploadCatalogAsset(e,{scene:'ARTIST_RESULT',key:item.key,field:'resultVideoUrl',kind:'video'})}/></label>
            </div>
            <button type="button" className="danger" onClick={()=>removeArtist(item.key)}>연예인 삭제</button>
          </article>)}</div>
          <button type="button" className="admin-save-copy" disabled={busy} onClick={()=>saveSiteSettings(settings)}>연예인 CMS 저장</button>
        </section>
        <section className="admin-cms-catalog" data-admin-panel="stages" data-visible={activePanel==='stages'}>
          <div className="admin-list-head"><div><h2>기념사진 무대 CMS</h2><p>배우가 박혀 있지 않은 무대 이미지를 여러 개 등록하고 기본 무대를 선택합니다.</p></div><button type="button" onClick={addStage}>+ 무대 추가</button></div>
          <label className="admin-workspace-field">기본 무대<select value={settings.defaultStageKey||''} onChange={e=>setSettings(current=>({...current,defaultStageKey:e.target.value}))}><option value="">첫 번째 활성 무대</option>{(settings.stageCatalog||[]).map(item=><option key={item.key} value={item.key}>{item.name||item.key}</option>)}</select></label>
          <div className="admin-cms-grid">{[...(settings.stageCatalog||[])].sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)).map(item=><article className="admin-cms-card" key={item.key}>
            <div className="admin-cms-preview admin-preview-clickable" onClick={()=>setPreviewModal({src:item.imageUrl || (item.key==='stage-main'?'/api/souvenir-stage/preview':''),title:item.name||item.key})}>{item.imageUrl?<img src={item.imageUrl} alt={item.name}/>:item.key==='stage-main'?<img src="/api/souvenir-stage/preview" alt="현재 기본 무대"/>:<span>STAGE IMAGE</span>}{(item.imageUrl||item.key==='stage-main')&&<em>클릭해서 크게 보기</em>}</div>
            <small>{item.key}</small><label>무대명<input value={item.name||''} onChange={e=>updateStage(item.key,{name:e.target.value})}/></label>
            <label>현재 무대 이미지 URL<input value={item.imageUrl||''} onChange={e=>updateStage(item.key,{imageUrl:e.target.value})}/></label>
            <label>순서<input type="number" min="1" value={item.sortOrder||1} onChange={e=>updateStage(item.key,{sortOrder:Number(e.target.value)})}/></label>
            <label className="admin-card-check"><input type="checkbox" checked={item.active!==false} onChange={e=>updateStage(item.key,{active:e.target.checked})}/> 사용</label>
            <label className="admin-character-upload">{quickUploading===`catalog-STAGE_IMAGE-${item.key}`?'업로드 중…':'무대 이미지 등록/교체'}<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>uploadCatalogAsset(e,{scene:'STAGE_IMAGE',key:item.key,field:'imageUrl',kind:'image',type:'stage'})}/></label>
            <button type="button" className="danger" onClick={()=>removeStage(item.key)}>무대 삭제</button>
          </article>)}</div>
          <button type="button" className="admin-save-copy" disabled={busy} onClick={()=>saveSiteSettings(settings)}>무대 CMS 저장</button>
        </section>
        {activePanel==='audio' && <AdminAudioPanel settings={settings} setSettings={setSettings} uploadAudioAsset={uploadAudioAsset} quickUploading={quickUploading} busy={busy} saveSiteSettings={next=>saveSiteSettings(next,true)} audioNotice={audioNotice}/>}
        <section className="admin-cms-catalog admin-data-cms" data-admin-panel="data" data-visible={activePanel==='data'}>
          <div className="admin-list-head"><div><h2>백업 / DB 관리</h2><p>먼저 백업 ZIP을 내려받은 뒤 오래된 참가 데이터를 정리합니다. 미디어 실제 파일은 Storage에 유지되고 백업에는 URL 목록이 포함됩니다.</p></div></div>
          <div className="admin-data-actions"><button type="button" disabled={busy} onClick={downloadBackup}>전체 데이터 백업 ZIP 다운로드</button></div>
          <div className="admin-retention-grid"><label>체험 세션 보관일<input type="number" min="7" value={settings.dataRetention?.sessionDays||180} onChange={e=>setSettings(current=>({...current,dataRetention:{...current.dataRetention,sessionDays:Number(e.target.value)}}))}/></label><label>참가자 캐릭터 보관일<input type="number" min="7" value={settings.dataRetention?.characterDays||90} onChange={e=>setSettings(current=>({...current,dataRetention:{...current.dataRetention,characterDays:Number(e.target.value)}}))}/></label><label>메시지 보관일<input type="number" min="7" value={settings.dataRetention?.messageDays||180} onChange={e=>setSettings(current=>({...current,dataRetention:{...current.dataRetention,messageDays:Number(e.target.value)}}))}/></label><label>확인증 기록 보관일<input type="number" min="7" value={settings.dataRetention?.certificateDays||365} onChange={e=>setSettings(current=>({...current,dataRetention:{...current.dataRetention,certificateDays:Number(e.target.value)}}))}/></label></div>
          <div className="admin-inline-actions"><button type="button" disabled={busy} onClick={()=>saveSiteSettings(settings)}>보관정책 저장</button><button type="button" disabled={busy} onClick={previewCleanup}>정리 대상 미리보기</button></div>
          {cleanupPreview && <div className="admin-cleanup-preview"><h3>현재 정리 대상</h3>{Object.entries(cleanupPreview).map(([key,row])=><p key={key}><b>{key}</b> · {row.days}일 초과 · <strong>{row.count}건</strong></p>)}<button type="button" className="danger" disabled={busy} onClick={runCleanup}>백업 완료 후 실제 DB 정리</button></div>}
          {dataNotice && <p className="admin-save-notice" role="status">{dataNotice}</p>}
        </section>
        <section className="admin-stats" data-admin-panel="records" data-visible={activePanel==='records'}>{[
          ['sessions','체험 기록'],['characters','참가자 캐릭터'],['certificates','확인증 발급'],['messages','메시지'],['media','미디어']
        ].map(([name,label])=><article key={name}><b>{data[name]?.length || 0}</b><span>{label}</span></article>)}</section>
        <section id="sessions" className="admin-compact-section" data-admin-panel="records" data-visible={activePanel==='records'}><div className="admin-list-head"><div><h2>체험 기록</h2><p>최근 기록을 작은 영역에서 확인합니다.</p></div><span>{data.sessions.length}건</span></div><div className="admin-table admin-scroll-list"><table><thead><tr><th>닉네임</th><th>언어</th><th>단계</th><th>장면</th><th>시작일 (현지 시간)</th></tr></thead><tbody>{data.sessions.map(row=><tr key={row.id}><td>{row.nickname || '참가자'}</td><td>{row.language}</td><td>{row.current_step}</td><td>{row.current_scene}</td><td>{new Date(row.created_at).toLocaleString()}</td></tr>)}</tbody></table></div></section>
        <section id="characters" className="admin-compact-section" data-admin-panel="records" data-visible={activePanel==='records'}><div className="admin-list-head"><div><h2>참가자 캐릭터 기록</h2><p>참가자가 생성·선택한 최근 캐릭터 기록입니다.</p></div><span>{data.characters.length}건</span></div><div className="admin-gallery admin-scroll-gallery">{data.characters.map(row=><article key={row.id}>{row.image_url && <img src={row.image_url} alt="참가자 캐릭터" />}<strong>{row.nickname}</strong><small>{row.mode} · {row.character_key}</small></article>)}</div></section>
        <section className="admin-character-master" data-admin-panel="profile" data-visible={activePanel==='profile'}><div className="admin-list-head"><div><h2>기본 캐릭터 설정</h2><p>선택 화면에 표시되는 이름·역할·순서·이미지를 관리합니다.</p></div></div><div className="admin-master-cards">{[...(settings.characterCatalog || [])].sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)).map(item=><article key={item.key}><div className="admin-character-preview admin-preview-clickable" onClick={()=>setPreviewModal({src:characterImages[item.key] || `/characters/${item.key}.svg`,title:item.name||item.key})}><img src={characterImages[item.key] || `/characters/${item.key}.svg`} alt={item.name || item.key}/><em>클릭해서 크게 보기</em></div><b>{item.name || item.key.toUpperCase()}</b>
          {[['name','이름'],['role','역할']].map(([field,label])=><label className="admin-card-edit" key={field}>{label}<input value={item[field]||''} maxLength={field==='description'?140:60} onChange={event=>setSettings(current=>({...current,characterCatalog:current.characterCatalog.map(c=>c.key===item.key?{...c,[field]:event.target.value}:c)}))}/></label>)}
          <label className="admin-card-edit">순서<input type="number" min="1" max="20" value={item.sortOrder??1} onChange={event=>setSettings(current=>({...current,characterCatalog:current.characterCatalog.map(c=>c.key===item.key?{...c,sortOrder:Number(event.target.value)}:c)}))}/></label>
          <label className="admin-card-check"><input type="checkbox" checked={item.active!==false} onChange={event=>setSettings(current=>({...current,characterCatalog:current.characterCatalog.map(c=>c.key===item.key?{...c,active:event.target.checked}:c)}))}/> 사용자 화면에 표시</label><label className="admin-character-upload">{quickUploading===`character-${item.key}` ? '업로드 중…' : '이미지 교체'}<input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={!!quickUploading} onChange={event=>uploadCharacterImage(event,item.key)}/></label></article>)}</div><button type="button" disabled={busy} className="admin-save-copy" onClick={()=>saveSiteSettings(settings)}>전체 설정 저장 · 캐릭터 변경 포함</button></section>
        <section id="certificates" className="admin-compact-section" data-admin-panel="records" data-visible={activePanel==='records'}><div className="admin-list-head"><div><h2>확인증 발급 기록</h2><p>최근 발급 기록을 확인합니다.</p></div><span>{data.certificates.length}건</span></div><div className="admin-table admin-scroll-list"><table><thead><tr><th>인증번호</th><th>참가자</th><th>유형</th><th>점수</th><th>발급일</th><th>PDF</th></tr></thead><tbody>{data.certificates.map(row=><tr key={row.id}><td>{row.certificate_no}</td><td>{row.nickname}</td><td>{row.producer_type}</td><td>{row.score}</td><td>{new Date(row.created_at).toLocaleString()}</td><td><a href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/certificates/${encodeURIComponent(row.certificate_no)}/pdf`}>PDF</a></td></tr>)}</tbody></table></div></section>
        <section id="messages" className="admin-compact-section" data-admin-panel="wall" data-visible={activePanel==='wall'}><div className="admin-list-head"><div><h2>CONNECT WALL 메시지 승인</h2><p>승인·숨김 처리가 필요한 메시지만 빠르게 확인합니다.</p></div><span>{data.messages.length}건</span></div><div className="admin-table admin-scroll-list"><table><thead><tr><th>메시지</th><th>작성자</th><th>상태</th><th>관리</th></tr></thead><tbody>{data.messages.map(row=><tr key={row.id}><td>{row.message}</td><td>{row.nickname}</td><td>{row.status}</td><td><button disabled={busy} onClick={()=>changeStatus(row.id,'approved')}>승인</button><button disabled={busy} onClick={()=>changeStatus(row.id,'hidden')}>숨김</button></td></tr>)}</tbody></table></div></section>
        <section id="media" data-admin-panel="media" data-visible={activePanel==='media'}>
          <h2>영상·이미지 라이브러리 관리</h2><p><b>메인 영상 교체:</b> 등록 위치에서 <b>01 시작 화면 기사/인트로 영상 (INTRO)</b>을 선택하고 파일 종류를 <b>영상</b>으로 지정해 업로드하세요. 저장 후 사용자 화면을 새로고침하면 새 영상이 우선 적용됩니다.</p>
          <p>첫 화면 인트로/로고를 교체하려면 INTRO/LOGO를 선택하세요. CONNECT WALL 배경은 현재 변경하지 않습니다. 새 일반 자료는 <b>LIBRARY (보관함)</b>에 등록하세요. 기존 V01~V08은 그대로 유지됩니다. 특정 장면에 반영하려면 해당 장면을 선택해 업로드합니다.</p>
          <p>최초 업로드 전에 Supabase Storage에서 공개 버킷 <code>k-culture-media</code>를 한 번만 만들어 주세요.</p>
          <form className="admin-upload" onSubmit={upload}>
            <label>등록 위치<select value={scene} onChange={e=>{setScene(e.target.value);if(['LOGO','CHARACTERS'].includes(e.target.value))setKind('image');setFile(null);}}><option value="LIBRARY">LIBRARY (새 자료 보관)</option><option value="INTRO">01 시작 화면 기사/인트로 영상</option><option value="LOGO">전체 화면 로고 (이미지 전용)</option><option value="SOUVENIR_STAGE">마지막 기념사진 · 무대 원본 이미지</option><option value="PROGRAM_AI">05 AI 안내 장면</option><option value="PROGRAM_WAIT">05 자유 대기 장면</option><option value="INCIDENT_AI">06 AI 후속 상황 장면</option><option value="INCIDENT_WAIT">06 대기 후속 상황 장면</option>{[...SCENES,'CHARACTERS'].map(value=><option key={value}>{value}</option>)}</select></label>
            <label>파일 종류<select disabled={['CHARACTERS','LOGO','SOUVENIR_STAGE'].includes(scene)} value={['CHARACTERS','LOGO','SOUVENIR_STAGE'].includes(scene) ? 'image' : kind} onChange={e=>setKind(e.target.value)}><option value="video">영상</option><option value="image">이미지</option><option value="poster">포스터</option><option value="thumbnail">썸네일</option></select></label>
            {scene === 'CHARACTERS' ? <label>기존 캐릭터 이미지 교체<select value={characterKey} onChange={e=>setCharacterKey(e.target.value)}>{(settings.characterCatalog||[]).map(item=><option key={item.key} value={item.key}>{item.name || item.key.toUpperCase()}</option>)}</select></label> : <label>자료 제목<input value={mediaTitle} onChange={e=>setMediaTitle(e.target.value)} maxLength={160} placeholder="예: 김치 체험 추가 영상" /></label>}
            <label>파일 선택<input type="file" accept={kind==='video' && !['CHARACTERS','LOGO','SOUVENIR_STAGE'].includes(scene) ? 'video/mp4,video/webm' : 'image/png,image/jpeg,image/webp'} onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
            {file && <div className="admin-selected-preview">
              <strong>선택한 파일 미리보기 (아직 저장 전)</strong>
              {file.type.startsWith('video/') ? <video key={previewUrl} src={previewUrl} controls playsInline preload="metadata" /> : <img src={previewUrl} alt="선택한 이미지 전체 미리보기" />}
              <small>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</small>
              <button type="button" onClick={()=>setFile(null)}>선택 취소</button>
            </div>}
            <button disabled={busy || !file}>{busy ? '업로드 중…' : '미리본 파일 등록'}</button>
          </form>
          {editingMedia && <form className="admin-media-edit" onSubmit={saveMedia}>
            <strong>등록 자료 수정</strong>
            <label>제목<input maxLength={160} value={editingMedia.title} onChange={e=>setEditingMedia({...editingMedia,title:e.target.value})}/></label>
            <label>정렬 순서<input type="number" min="0" max="100000" value={editingMedia.sort_order} onChange={e=>setEditingMedia({...editingMedia,sort_order:e.target.value})}/></label>
            <label><input type="checkbox" checked={editingMedia.active} onChange={e=>setEditingMedia({...editingMedia,active:e.target.checked})}/> 노출</label>
            <button disabled={busy}>수정 저장</button><button type="button" onClick={()=>setEditingMedia(null)}>취소</button>
          </form>}
          <div className="admin-list-head"><div><h3>등록 미디어 확인</h3><p>활성 등록 기록입니다. 실제 화면 적용 여부는 해당 화면·배우 CMS의 현재 자료에서 확인하세요.</p></div><label>보기<select value={mediaView} onChange={e=>setMediaView(e.target.value)}><option value="active">활성 화면 자료</option><option value="library">보관함</option><option value="inactive">비활성 기록</option><option value="all">전체 등록 기록</option></select> · {currentMedia.length}개</label></div><div className="admin-table admin-scroll-list"><table><thead><tr><th>위치</th><th>제목</th><th>종류</th><th>파일</th><th>노출</th><th>관리</th></tr></thead><tbody>{currentMedia.map(row=><tr key={row.id}><td>{row.scene}</td><td>{row.title || '제목 없음'}</td><td>{row.kind}</td><td><div className="admin-media-thumb">{row.kind === 'video' ? <video src={row.file_url} controls preload="metadata" playsInline /> : row.kind === 'audio' ? <audio src={row.file_url} controls preload="none"/> : <img src={row.file_url} alt={row.title || '등록된 이미지'} loading="lazy" />}<a href={row.file_url} target="_blank" rel="noreferrer">원본 열기</a></div></td><td>{row.active?'사용':'숨김'}</td><td><button disabled={busy} onClick={()=>setEditingMedia({id:row.id,title:row.title||'',sort_order:row.sort_order||0,active:row.active})}>수정</button><button disabled={busy} onClick={()=>toggleMedia(row.id,!row.active)}>{row.active?'비활성화':'활성화'}</button><button disabled={busy} onClick={()=>deleteMedia(row)}>삭제</button></td></tr>)}</tbody></table></div>
        </section>
      </>}
      {stepPreview && <div className="front-step-modal" role="dialog" aria-modal="true" onClick={()=>setStepPreview(null)}>
        <div className="front-step-modal-inner" onClick={e=>e.stopPropagation()}>
          <button className="front-step-modal-close" onClick={()=>setStepPreview(null)}>×</button>
          {stepPreview.type==='video'?<video src={stepPreview.url} controls autoPlay playsInline/>:<img src={stepPreview.url} alt={stepPreview.title||'STEP media'}/>}
        </div>
      </div>}
      </>}
    {previewModal && <div className="admin-image-modal" role="dialog" aria-modal="true" onClick={()=>setPreviewModal(null)}>
      <div className="admin-image-dialog" onClick={event=>event.stopPropagation()}>
        <button type="button" onClick={()=>setPreviewModal(null)} aria-label="닫기">×</button>
        <img src={previewModal.src} alt={previewModal.title} />
        <strong>{previewModal.title}</strong>
      </div>
    </div>}
    {error && <p className="admin-error" role="alert">{error}</p>}
  </div>;
}

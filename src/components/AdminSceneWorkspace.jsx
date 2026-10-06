import { useEffect, useState } from 'react';
import { text as defaultText, programs as defaultPrograms, incidents as defaultIncidents } from '../data/content';
import { adminRequest } from '../services/adminApi';

// 실제 사용자 화면과 저장된 설정 키를 한 곳에서 연결합니다.
// 지원하지 않는 문구를 임의로 만들어 저장하지 않도록, 기존 설정 키만 편집합니다.
const PANELS = {
  profile: { title:'02 · 캐릭터 선택', page:'profile', text:[['title','화면 상단 제목'],['nickname','닉네임 라벨'],['nicknamePlaceholder','닉네임 예시'],['basicTitle','기본 캐릭터 제목'],['basicCopy','기본 캐릭터 설명'],['promptTitle','설명으로 만들기 제목'],['promptCopy','설명으로 만들기 설명'],['photoTitle','내 사진 제목'],['photoCopy','내 사진 설명'],['continue','시작 버튼']], media:[], note:'이 화면의 미디어는 참가자 기본 캐릭터 이미지입니다. 별도 영상은 사용하지 않습니다. 연예인 선택 목록은 연예인 CMS에서 관리합니다.' },
  setup: { title:'03 · 행사 조건 설정', page:'setup', text:[['title','화면 상단 제목'],['fans','팬 규모 라벨'],['city','개최 지역 라벨'],['budget','예산 라벨'],['mood','행사 분위기 라벨'],['create','AI 운영안 버튼']], media:[], note:'조건 선택 화면의 문구·팬 수·배경 영상을 관리합니다.' },
  plan: { title:'04 · 운영안', page:'plan', text:[['title','제목'],['artist','아티스트 라벨'],['language','언어 라벨'],['safety','안전 라벨'],['operatingBudget','운영 예산 라벨'],['edit','수정 버튼'],['enter','다음 버튼']], media:[], note:'운영안 문구·일정·배경 영상을 관리합니다.' },
  program: { title:'05 선택 · 06 프로그램 진행', page:'incident1', text:[['alert','상황 라벨'],['title','제목'],['emphasis','강조 문구'],['media','영상 라벨'],['question','질문'],['back','뒤로 버튼'],['confirm','확인 버튼']], media:[], note:'프로그램 4개를 카드별로 보고 문구와 영상을 바로 수정합니다.' },
  incident: { title:'07 · 돌발상황 대응', page:'incident2', text:[['alert','상황 라벨'],['back','뒤로 버튼'],['confirm','확인 버튼']], media:[], note:'돌발상황 4개를 카드별로 보고 상황 문구·대응 선택지·영상을 바로 수정합니다.' },
  arrival: { title:'08 · 배우 도착', page:'arrival', text:[['media','영상 라벨'],['eyebrow','상단 라벨'],['title','제목'],['copy','설명'],['confirm','확인 버튼']], media:[], note:'공통 문구와 최종 선택지를 관리합니다. 배우별 제목·설명·영상이 등록되어 있으면 연예인 CMS 값이 우선합니다.' },
  result: { title:'09 · 결과·확인증·기념사진', page:'result', text:[['media','영상 라벨'],['eyebrow','상단 라벨'],['prefix','결과 앞 문구'],['suffix','결과 뒤 문구'],['total','총점 라벨'],['report','리포트 라벨'],['log','운영 기록 라벨'],['restart','다시 시작 버튼'],['certificate','확인증 버튼'],['certTitle','확인증 제목'],['certCopy','확인증 설명'],['souvenir','기념사진 제목'],['souvenirCopy','기념사진 설명'],['articleTitle','기사 제목 라벨'],['downloadArticle','기사 다운로드 버튼'],['share','공유 버튼'],['disclaimer','기사 안내 문구']], media:[], note:'결과·확인증·기사 문구를 관리합니다. 결과 영상은 연예인 CMS, 기념사진 배경은 무대 CMS에서 확인·교체합니다.' },
  wall: { title:'결과 화면 · CONNECT WALL 메시지', page:null, text:[], media:[], note:'전광판 원본 시안과 메시지 흐름은 그대로 유지합니다. 아래에서 입력 문구를 관리하고 메시지 승인/숨김을 처리합니다.' },
};
const LANGUAGES = [['ja','日本語'],['ko','한국어'],['en','English']];
const EXTRA_FIELDS = {
  profile:[['profile','화면 제목 아래 · 선택 방법 안내']],
  setup:[['setup','화면 제목 아래 · 행사 조건 안내']],
};

const PROGRAM_MEDIA = [
  { key:'kimchi', label:'김치 만들기 미니 체험', scene:'V03', fallback:'/videos/V03_kimchi_experience.mp4' },
  { key:'dance', label:'K-POP 포인트 댄스', scene:'V04', fallback:'/videos/V04_kpop_dance.mp4' },
  { key:'ai', label:'AI 메시지와 팬 퀴즈', scene:'PROGRAM_AI', fallback:'' },
  { key:'wait', label:'지연 안내 후 자유 대기', scene:'PROGRAM_WAIT', fallback:'' },
];
const INCIDENT_MEDIA = [
  { key:'kimchi', label:'김치 체험 · 알레르기 대응', scene:'V05', fallback:'/videos/V05_allergy_response.mp4' },
  { key:'dance', label:'댄스 · 발목 통증 대응', scene:'V06', fallback:'/videos/V06_ankle_safety_response.mp4' },
  { key:'ai', label:'AI 메시지 진위 확인', scene:'INCIDENT_AI', fallback:'' },
  { key:'wait', label:'대기 불만/SNS 대응', scene:'INCIDENT_WAIT', fallback:'' },
];

export default function AdminSceneWorkspace({ panel, settings, setSettings, saveSettings, token, media, refresh, busy, setError }) {
  const config=PANELS[panel];
  const [lang,setLang]=useState('ko');
  const [asset,setAsset]=useState('');
  const [kind,setKind]=useState('video');
  const [file,setFile]=useState(null);
  const [title,setTitle]=useState('');
  const [uploading,setUploading]=useState(false);
  const [assetPreview,setAssetPreview]=useState('');
  const [saved,setSaved]=useState('');

  useEffect(()=>{
    setAsset(config?.media?.[0] || '');
    setKind('video'); setFile(null); setSaved('');
  },[panel]);
  useEffect(()=>{
    if (!file) {setAssetPreview('');return;}
    const objectUrl=URL.createObjectURL(file);
    setAssetPreview(objectUrl);
    return ()=>URL.revokeObjectURL(objectUrl);
  },[file]);
  if (!config) return null;

  const changePage=(key,value)=>setSettings(current=>({ ...current,
    pageCopy:{ ...current.pageCopy,[lang]:{
      ...(current.pageCopy?.[lang] || {}),
      [config.page]:{...(current.pageCopy?.[lang]?.[config.page] || {}),[key]:value},
    }} }));
  const changeScreen=(name,value)=>setSettings(current=>({ ...current,
    screenCopy:{...current.screenCopy,[`${name}${lang[0].toUpperCase()}${lang.slice(1)}`]:value} }));
  const changeConnect=(key,value)=>setSettings(current=>({ ...current,
    connectWallCopy:{...current.connectWallCopy,[lang]:{...(current.connectWallCopy?.[lang] || {}),[key]:value}} }));
  const changeLanguageNote=(group,value)=>setSettings(current=>({ ...current,[group]:{...(current[group]||{}),[lang]:value} }));
  const changeSceneNote=(key,value)=>setSettings(current=>({ ...current,sceneNotes:{...current.sceneNotes,[key]:{...(current.sceneNotes?.[key]||{}),[lang]:value}} }));
  const changeProgramOverride=(programKey,field,value)=>setSettings(current=>({
    ...current,programOverrides:{...current.programOverrides,[programKey]:{...(current.programOverrides?.[programKey]||{}),[lang]:{...(current.programOverrides?.[programKey]?.[lang]||{}),[field]:value}}}
  }));
  const changeIncidentOverride=(incidentKey,field,value)=>setSettings(current=>({
    ...current,incidentOverrides:{...current.incidentOverrides,[incidentKey]:{...(current.incidentOverrides?.[incidentKey]||{}),[lang]:{...(current.incidentOverrides?.[incidentKey]?.[lang]||{}),[field]:value}}}
  }));
  const changeIncidentOption=(incidentKey,index,fieldIndex,value)=>setSettings(current=>({
    ...current,
    incidentOptionOverrides:{
      ...(current.incidentOptionOverrides||{}),
      [incidentKey]:{
        ...(current.incidentOptionOverrides?.[incidentKey]||{}),
        // 별도 수정값이 없을 때도 기본 선택지를 표시하고 그 내용을 바탕으로 편집합니다.
        [lang]:(current.incidentOptionOverrides?.[incidentKey]?.[lang]?.length ? current.incidentOptionOverrides[incidentKey][lang] : (defaultIncidents[incidentKey]?.options||[]).map(option=>option[lang]||option.ko||[])).map((row,i)=>i===index ? row.map((cell,j)=>j===fieldIndex?value:cell) : row),
      },
    },
  }));
  const updateVideo=(value)=>setSettings(current=>({...current,videos:{...current.videos,[asset]:value}}));
  const rows=media.filter(row=>row.active && config.media.includes(row.scene));
  const active=rows.filter(row=>row.scene===asset).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const video=active.find(item=>item.kind==='video');
  const selectedPhoto=active.find(item=>item.kind!=='video');

  const upload=async event=>{
    event.preventDefault();
    if (!asset || !file || uploading) return;
    setUploading(true);setSaved('');setError('');
    try {
      const form=new FormData();
      form.append('scene',asset); form.append('kind',kind);
      form.append('title',title.trim() || `${asset} ${kind}`);
      form.append('file',file);
      await adminRequest('/api/media/upload',token,{method:'POST',body:form});
      setFile(null);setTitle('');
      await refresh();
      setSaved('등록했습니다. 사용자 화면은 새로고침하면 변경 내용이 보입니다.');
    } catch(err) {setError(`미디어 업로드 실패: ${err.message}`);}
    finally {setUploading(false);}
  };

  // 설정·운영안 배경은 장면 파일 등록과 실제 화면 URL 연결을 함께 관리합니다.
  const backgroundField = panel === 'setup' ? 'setupBackgroundVideoUrl' : panel === 'plan' ? 'planBackgroundVideoUrl' : '';
  const uploadBackground = async event => {
    const selected = event.target.files?.[0]; event.target.value = '';
    if (!selected || !backgroundField || uploading) return;
    setUploading(true); setError(''); setSaved('');
    try {
      const form = new FormData();
      form.append('scene', panel === 'setup' ? 'SETUP_BACKGROUND' : 'PLAN_BACKGROUND');
      form.append('kind', 'video'); form.append('title', config.title + ' 배경'); form.append('file', selected);
      const uploaded = await adminRequest('/api/media/upload', token, {method:'POST',body:form});
      if (!uploaded?.file_url) throw new Error('등록 파일 URL이 없습니다.');
      if (!await saveSettings({...settings,[backgroundField]:uploaded.file_url})) throw new Error('배경 파일은 등록됐지만 화면 설정 저장에 실패했습니다. 설정 저장을 다시 시도하세요.');
      await refresh();
      setSaved('파일을 등록했습니다. 설정 저장 결과를 상단에서 확인하세요.');
    } catch(error) { setError(error.message); }
    finally { setUploading(false); }
  };

  const latestVideoForScene=(sceneName)=>media
    .filter(row=>row.active && row.scene===sceneName && row.kind==='video')
    .sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))[0];
  const uploadDirectVideo=async(event, sceneName, label)=>{
    const selected=event.target.files?.[0]; event.target.value='';
    if(!selected || uploading) return;
    setUploading(true); setSaved(''); setError('');
    try{
      const form=new FormData();
      form.append('scene',sceneName); form.append('kind','video'); form.append('title',label); form.append('file',selected);
      await adminRequest('/api/media/upload',token,{method:'POST',body:form});
      await refresh();
      setSaved(`${label} 영상을 등록했습니다.`);
    }catch(err){setError(`${label} 영상 업로드 실패: ${err.message}`);}
    finally{setUploading(false);}
  };

  return <section className="admin-workspace" aria-label={config.title}>
    <header className="admin-workspace-head"><div><p className="admin-kicker">SCREEN EDITOR</p><h2>{config.title}</h2><p>{config.note}</p></div><button disabled={busy} type="button" onClick={()=>saveSettings(settings)}>전체 설정 저장</button></header>
    <div className="admin-workspace-grid">
      <div className="admin-workspace-text">
        <div className="admin-workspace-fieldbar"><h3>텍스트·화면 설정</h3><label>편집 언어 <select value={lang} onChange={e=>setLang(e.target.value)}>{LANGUAGES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
        {config.text.map(([key,label])=><label className="admin-workspace-field" key={key}>{label}<input value={settings.pageCopy?.[lang]?.[config.page]?.[key] ?? defaultText[lang]?.[config.page]?.[key] ?? ''} maxLength={220} onChange={e=>changePage(key,e.target.value)}/></label>)}
        {(EXTRA_FIELDS[panel] || []).map(([key,label])=><label className="admin-workspace-field" key={key}>{label}<textarea rows={2} value={settings.screenCopy?.[`${key}${lang[0].toUpperCase()}${lang.slice(1)}`] || settings.pageCopy?.[lang]?.[key]?.description || defaultText[lang]?.[key]?.description || ''} onChange={e=>changeScreen(key,e.target.value)} /></label>)}
        {['setup','plan'].includes(panel) && <>
          <label className="admin-workspace-field">운영 플랜 안내 ({lang})<textarea rows={2} value={settings.planNotes?.[lang]||''} onChange={e=>changeLanguageNote('planNotes',e.target.value)}/></label>
          <div className="admin-workspace-numbers"><label>기본 팬 수 <input type="number" min="1" max="100000" value={settings.fanDefault??100} onChange={e=>setSettings(current=>({...current,fanDefault:Number(e.target.value)}))}/></label><label>최대 팬 수 <input type="number" min="1" max="100000" value={settings.fanLimit??300} onChange={e=>setSettings(current=>({...current,fanLimit:Number(e.target.value)}))}/></label></div>
          {panel==='plan' && <div className="admin-cms-subsection admin-plan-manager"><div className="admin-subsection-head"><div><h4>인원별 기본 운영안</h4><p>처음부터 준비한 소규모·표준·대규모 운영안입니다. 참가 인원에 맞는 운영안 1개가 자동 선택됩니다. 관리자는 이름, 적용 인원, 실제 일정을 그대로 수정하면 됩니다.</p></div><button type="button" onClick={()=>setSettings(current=>({...current,planVariants:[...(current.planVariants||[]),{key:`plan-${Date.now()}`,label:'새 운영안',minFans:1,maxFans:300,schedule:{ko:[{time:'09:00',title:'새 일정',copy:'일정 설명'}],ja:[{time:'09:00',title:'新しい日程',copy:'日程説明'}],en:[{time:'09:00',title:'New schedule',copy:'Schedule description'}]}}]}))}>+ 운영안 추가</button></div>{(settings.planVariants||[]).map((item,index)=><article className="admin-plan-card" key={item.key||index}><div className="admin-plan-card-head"><strong>{index+1}. {item.label||'운영안'}</strong><span>{item.minFans||1}명 ~ {item.maxFans||300}명</span></div><div className="admin-plan-basic"><label>운영안 이름<input value={item.label||''} onChange={e=>setSettings(current=>({...current,planVariants:current.planVariants.map((row,i)=>i===index?{...row,label:e.target.value}:row)}))}/></label><label>최소 인원<input type="number" min="1" value={item.minFans||1} onChange={e=>setSettings(current=>({...current,planVariants:current.planVariants.map((row,i)=>i===index?{...row,minFans:Number(e.target.value)}:row)}))}/></label><label>최대 인원<input type="number" min="1" value={item.maxFans||300} onChange={e=>setSettings(current=>({...current,planVariants:current.planVariants.map((row,i)=>i===index?{...row,maxFans:Number(e.target.value)}:row)}))}/></label></div><div className="admin-plan-schedule"><b>이 운영안의 실제 일정 ({lang})</b>{((item.schedule?.[lang]?.length?item.schedule[lang]:settings.scheduleItems?.[lang])||[]).map((scheduleRow,rowIndex)=><div className="admin-schedule-row" key={`${item.key}-${lang}-${rowIndex}`}><input type="time" value={scheduleRow.time||''} onChange={e=>setSettings(current=>({...current,planVariants:current.planVariants.map((row,i)=>i===index?{...row,schedule:{...(row.schedule||{}),[lang]:((row.schedule?.[lang]?.length?row.schedule[lang]:current.scheduleItems?.[lang])||[]).map((r,j)=>j===rowIndex?{...r,time:e.target.value}:r)}}:row)}))}/><input value={scheduleRow.title||''} placeholder="일정명" onChange={e=>setSettings(current=>({...current,planVariants:current.planVariants.map((row,i)=>i===index?{...row,schedule:{...(row.schedule||{}),[lang]:((row.schedule?.[lang]?.length?row.schedule[lang]:current.scheduleItems?.[lang])||[]).map((r,j)=>j===rowIndex?{...r,title:e.target.value}:r)}}:row)}))}/><input value={scheduleRow.copy||''} placeholder="일정 설명" onChange={e=>setSettings(current=>({...current,planVariants:current.planVariants.map((row,i)=>i===index?{...row,schedule:{...(row.schedule||{}),[lang]:((row.schedule?.[lang]?.length?row.schedule[lang]:current.scheduleItems?.[lang])||[]).map((r,j)=>j===rowIndex?{...r,copy:e.target.value}:r)}}:row)}))}/><button type="button" className="danger" onClick={()=>setSettings(current=>({...current,planVariants:current.planVariants.map((row,i)=>i===index?{...row,schedule:{...(row.schedule||{}),[lang]:((row.schedule?.[lang]?.length?row.schedule[lang]:current.scheduleItems?.[lang])||[]).filter((_,j)=>j!==rowIndex)}}:row)}))}>삭제</button></div>)}<button type="button" onClick={()=>setSettings(current=>({...current,planVariants:current.planVariants.map((row,i)=>i===index?{...row,schedule:{...(row.schedule||{}),[lang]:[...((row.schedule?.[lang]?.length?row.schedule[lang]:current.scheduleItems?.[lang])||[]),{time:'19:00',title:'새 일정',copy:'일정 설명'}]}}:row)}))}>+ 이 운영안에 일정 추가</button></div><button type="button" className="danger" onClick={()=>setSettings(current=>({...current,planVariants:(current.planVariants||[]).filter((_,i)=>i!==index)}))}>운영안 삭제</button></article>)}</div>}

        </>}
        {['program','incident'].includes(panel) && <>
          {panel==='program' && <>
          <div className="admin-workspace-numbers"><label>예상 지연 시간(분) <input type="number" min="0" max="180" value={settings.delayMinutes??20} onChange={e=>setSettings(current=>({...current,delayMinutes:Number(e.target.value)}))}/></label><label>일본어 금액 환산 (1만원 → 엔) <input type="number" min="1" max="10000" value={settings.yenPerManWon??100} onChange={e=>setSettings(current=>({...current,yenPerManWon:Number(e.target.value)}))}/><small>기본 100: 35만원 → 3,500円</small></label></div>
          <label className="admin-workspace-field">지연 안내 ({lang})<textarea rows={2} value={settings.incidentCopy?.[lang]||''} onChange={e=>changeLanguageNote('incidentCopy',e.target.value)}/></label></>}
          {panel==='program' && ['ai','wait'].map(key=><label className="admin-workspace-field" key={key}>{key==='ai'?'AI 프로그램':'대기 프로그램'} 설명 ({lang})<textarea rows={2} value={settings.sceneNotes?.[key]?.[lang]||''} onChange={e=>changeSceneNote(key,e.target.value)}/></label>)}
          {panel==='program' && <div className="admin-cms-subsection"><h4>현재 프로그램 4종 문구 수정</h4><p>사용자 화면에 보이는 현재 문구를 그대로 표시합니다.</p>{['kimchi','dance','ai','wait'].map(key=><fieldset key={key}><legend>{key.toUpperCase()}</legend><label>선택지 제목<input value={settings.programOverrides?.[key]?.[lang]?.label ?? defaultPrograms[key]?.[lang]?.label ?? ''} onChange={e=>changeProgramOverride(key,'label',e.target.value)}/></label><label>시간·비용·특징<input value={settings.programOverrides?.[key]?.[lang]?.meta ?? defaultPrograms[key]?.[lang]?.meta ?? ''} onChange={e=>changeProgramOverride(key,'meta',e.target.value)}/></label><label>프로그램 결과 제목<input value={settings.programOverrides?.[key]?.[lang]?.title ?? defaultPrograms[key]?.[lang]?.title ?? ''} onChange={e=>changeProgramOverride(key,'title',e.target.value)}/></label><label>프로그램 설명<textarea rows={2} value={settings.programOverrides?.[key]?.[lang]?.copy ?? defaultPrograms[key]?.[lang]?.copy ?? ''} onChange={e=>changeProgramOverride(key,'copy',e.target.value)}/></label></fieldset>)}</div>}
          {panel==='incident' && <div className="admin-cms-subsection"><h4>돌발상황 4종 문구·선택지 수정</h4><p>김치/댄스/AI/자유대기의 현재 텍스트와 대응 선택지를 모두 관리자에서 관리합니다.</p>{['kimchi','dance','ai','wait'].map(key=><fieldset key={key}><legend>{key.toUpperCase()}</legend><label>영상 라벨<input value={settings.incidentOverrides?.[key]?.[lang]?.media ?? defaultIncidents[key]?.[lang]?.media ?? ''} onChange={e=>changeIncidentOverride(key,'media',e.target.value)}/></label><label>제목<input value={settings.incidentOverrides?.[key]?.[lang]?.title ?? defaultIncidents[key]?.[lang]?.title ?? ''} onChange={e=>changeIncidentOverride(key,'title',e.target.value)}/></label><label>강조 문구<input value={settings.incidentOverrides?.[key]?.[lang]?.emphasis ?? defaultIncidents[key]?.[lang]?.emphasis ?? ''} onChange={e=>changeIncidentOverride(key,'emphasis',e.target.value)}/></label><label>상황 설명<textarea rows={2} value={settings.incidentOverrides?.[key]?.[lang]?.copy ?? defaultIncidents[key]?.[lang]?.copy ?? ''} onChange={e=>changeIncidentOverride(key,'copy',e.target.value)}/></label><div className="admin-incident-options"><b>대응 선택지</b>{(settings.incidentOptionOverrides?.[key]?.[lang]?.length ? settings.incidentOptionOverrides[key][lang] : (defaultIncidents[key]?.options||[]).map(option=>option[lang]||option.ko||[])).map((row,index)=><div className="admin-incident-option-row" key={`${key}-${lang}-${index}`}><span>{index+1}</span><input value={row?.[0]||''} placeholder="선택지" onChange={e=>changeIncidentOption(key,index,0,e.target.value)}/><input value={row?.[1]||''} placeholder="효과" onChange={e=>changeIncidentOption(key,index,1,e.target.value)}/><input value={row?.[2]||''} placeholder="운영기록" onChange={e=>changeIncidentOption(key,index,2,e.target.value)}/></div>)}</div></fieldset>)}</div>}
        </>}
        {['program','incident'].includes(panel) && <div className="admin-cms-subsection admin-direct-media"><h4>{panel==='program'?'프로그램별 영상 등록':'돌발상황별 영상 등록'}</h4><p>아래 카드가 실제 사용자 화면의 각 항목과 1:1로 연결됩니다. 영상을 선택해 등록하면 해당 항목의 영상으로 사용됩니다.</p><div className="admin-direct-media-grid">{(panel==='program'?PROGRAM_MEDIA:INCIDENT_MEDIA).map(item=>{const current=latestVideoForScene(item.scene);const src=current?.file_url||item.fallback;return <article className="admin-direct-media-card" key={item.scene}><div className="admin-direct-media-title"><strong>{item.label}</strong><span>{item.scene}</span></div><div className="admin-direct-media-preview">{src?<video src={src} controls muted playsInline preload="metadata"/>:<p>현재 등록된 영상이 없습니다.</p>}</div><label className="admin-file-button">{uploading?'업로드 중…':'영상 등록 / 교체'}<input type="file" accept="video/mp4,video/webm" disabled={uploading} onChange={e=>uploadDirectVideo(e,item.scene,item.label)}/></label><small>{current?'관리자 업로드 영상 사용 중':'기본 영상 또는 미등록 상태'}</small></article>})}</div>{saved&&<p className="admin-save-notice" role="status">{saved}</p>}</div>}
        {panel==='arrival' && <div className="admin-cms-subsection"><h4>마지막 프로그램 선택지</h4><p>연예인이 도착한 뒤 참가자에게 보여줄 최종 운영 선택지를 언어별로 수정하거나 숨길 수 있습니다.</p>{(settings.finalProgramOptions||[]).map((item,index)=><fieldset key={item.key||index}><legend>{String(item.key||`OPTION ${index+1}`).toUpperCase()}</legend><label>선택 문구 ({lang})<input value={item[lang]||''} onChange={e=>setSettings(current=>({...current,finalProgramOptions:(current.finalProgramOptions||[]).map((row,i)=>i===index?{...row,[lang]:e.target.value}:row)}))}/></label><label className="admin-check-row"><input type="checkbox" checked={item.active!==false} onChange={e=>setSettings(current=>({...current,finalProgramOptions:(current.finalProgramOptions||[]).map((row,i)=>i===index?{...row,active:e.target.checked}:row)}))}/> 참가자 화면에 표시</label></fieldset>)}</div>}
        {false && <label className="admin-workspace-field">메시지 띠 이동 시간(초)<input type="number" min="18" max="90" value={settings.tickerDurationSeconds??34} onChange={e=>setSettings(current=>({...current,tickerDurationSeconds:Number(e.target.value)}))}/><small>숫자가 클수록 천천히 흐릅니다.</small></label>}
        {panel==='wall' && [['eyebrow','상단 라벨'],['title','제목'],['body','설명'],['country','국가 입력 문구'],['placeholder','메시지 입력 안내'],['send','보내기 버튼']].map(([key,label])=><label className="admin-workspace-field" key={key}>{label}<input value={settings.connectWallCopy?.[lang]?.[key]||''} maxLength={220} onChange={e=>changeConnect(key,e.target.value)}/></label>)}
        {panel==='profile' && <p className="admin-workspace-hint">기본 캐릭터의 이미지·이름·설명·노출 여부는 아래 카드에서 수정합니다.</p>}
        {panel==='result' && <p className="admin-workspace-hint">기념사진은 무대 CMS에서 고른 무대 + 연예인 캐릭터 + 참가자 캐릭터를 합성합니다. V08 결과 영상은 별도로 관리합니다.</p>}
        <button disabled={busy} onClick={()=>saveSettings(settings)}>{busy?'저장 중…':'전체 설정 저장'}</button>
      </div>
      <div className="admin-workspace-assets">
        <h3>영상·이미지</h3>
        {backgroundField && <div className="admin-background-editor"><strong>{panel==='setup'?'3번 조건 설정':'4번 운영안'} · 화면 배경 영상</strong>{settings[backgroundField]?<video src={settings[backgroundField]} controls muted playsInline preload="metadata"/>:<p>배경 영상 미등록 · 기존 기본 배경 사용</p>}<label className="admin-file-button">배경 영상 등록 / 교체<input type="file" accept="video/mp4,video/webm" disabled={uploading} onChange={uploadBackground}/></label><details><summary>고급 설정 · 영상 URL</summary><input value={settings[backgroundField]||''} onChange={e=>setSettings(current=>({...current,[backgroundField]:e.target.value}))}/></details></div>}
        {config.media.length ? <>
          <label className="admin-workspace-field">화면 내 미디어 위치<select value={asset} onChange={e=>{setAsset(e.target.value);setFile(null);setKind(e.target.value==='SOUVENIR_STAGE'?'image':'video');}}>{config.media.map(key=><option key={key} value={key}>{key}</option>)}</select></label>
          <div className="admin-workspace-preview">
            {asset==='SOUVENIR_STAGE' && !selectedPhoto && <img src={`${import.meta.env.DEV?'':(import.meta.env.VITE_API_BASE_URL||'')}/api/souvenir-stage/preview`} alt="현재 기본 무대 원본 미리보기" />}{video ? <video key={video.file_url} src={video.file_url} controls playsInline preload="metadata" /> : settings.videos?.[asset] && asset.startsWith('V0') ? <video src={settings.videos[asset]} controls playsInline preload="metadata" /> : <p>{asset==='SOUVENIR_STAGE' ? '기념사진 무대 이미지를 아래에서 등록하세요.' : '등록된 영상 없음'}</p>}
            {selectedPhoto && <img src={selectedPhoto.file_url} alt="현재 등록된 화면 이미지" />}
          </div>
          <form onSubmit={upload} className="admin-workspace-upload">
            <label>파일 종류<select value={kind} onChange={e=>{setKind(e.target.value);setFile(null);}}>{asset!=='SOUVENIR_STAGE'&&<option value="video">영상 MP4/WEBM</option>}<option value="image">이미지 JPG/PNG/WEBP</option>{asset!=='SOUVENIR_STAGE'&&<option value="poster">포스터 이미지</option>}{asset!=='SOUVENIR_STAGE'&&<option value="thumbnail">썸네일 이미지</option>}</select></label>
            <label>자료 제목<input value={title} maxLength={160} onChange={e=>setTitle(e.target.value)} placeholder={`${asset} 자료`}/></label>
            <label>파일 선택<input type="file" accept={kind==='video'?'video/mp4,video/webm':'image/jpeg,image/png,image/webp'} onChange={e=>setFile(e.target.files?.[0]||null)} /></label>
            {assetPreview && <div className="admin-workspace-preview">{kind==='video'?<video src={assetPreview} controls playsInline />:<img src={assetPreview} alt="새로 선택한 파일 미리보기"/>}<small>등록 전: {file?.name}</small></div>}
            <button type="submit" disabled={!file||uploading}>{uploading?'업로드 중…':'이 화면에 미디어 등록'}</button>
            {saved && <small role="status">{saved}</small>}
          </form>
          {asset.startsWith('V0') && <label className="admin-workspace-field">원본 영상 경로 (직접 입력)<input value={settings.videos?.[asset]||''} onChange={e=>updateVideo(e.target.value)} /><small>직접 경로를 바꿨다면 ‘문구·설정 저장’도 눌러주세요. 업로드 자료가 있으면 업로드 자료가 우선합니다.</small></label>}
          {rows.length > 0 && <div className="admin-workspace-registered"><h4>현재 활성 자료</h4>{rows.map(row=><p key={row.id}><b>{row.scene} · {row.kind}</b> {row.title||'제목 없음'} <a href={row.file_url} target="_blank" rel="noreferrer">파일 보기</a></p>)}</div>}
        </>:<p className="admin-workspace-hint">{['program','incident'].includes(panel)?'이 화면의 영상은 왼쪽 항목별 카드에서 바로 등록/교체합니다.':'배우 이미지·영상은 연예인 CMS, 기념사진 무대는 무대 CMS에서 확인합니다. 전광판 배치는 유지합니다.'}</p>}
      </div>
    </div>
  </section>;
}

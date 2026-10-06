import { AUDIO_STEPS } from '../utils/audioSettings';

const LANGUAGES = [['ko','한국어'],['ja','日本語'],['en','English']];
const filename = url => { try { return decodeURIComponent(url.split('/').pop().split('?')[0]); } catch { return url; } };
function Player({url, empty='미등록'}) {
  return url ? <div className="admin-audio-listen"><small>등록됨 · {filename(url)}</small><audio src={url} controls preload="metadata" /></div> : <small>{empty}</small>;
}
export default function AdminAudioPanel({settings, setSettings, uploadAudioAsset, quickUploading, busy, saveSiteSettings, audioNotice = {}}) {
  const update = (key, patch) => setSettings(current => ({...current,audioScenes:{...current.audioScenes,[key]:{...current.audioScenes?.[key],...patch}}}));
  const upload = (key, field, lang, label) => <label className="admin-character-upload">{quickUploading ? '업로드 처리 중…' : label}<input type="file" accept=".mp3,.wav,.m4a,.ogg,.aac,.mp4" disabled={busy || !!quickUploading} onChange={e=>uploadAudioAsset(e,key,field,lang)} /></label>;
  const notice = key => audioNotice[key] && <p role={audioNotice[key].state==='error'?'alert':'status'} className={`admin-audio-notice ${audioNotice[key].state}`}>{audioNotice[key].text}</p>;
  return <section className="admin-cms-catalog admin-audio-cms" data-admin-panel="audio" data-visible="true">
    <h2>BGM / 언어별 안내 음성 · 9 STEP</h2>
    <p>MP4는 오디오를 추출해 M4A로 등록합니다. 파일 업로드는 즉시 저장됩니다. 원고·URL·볼륨·삭제 변경은 아래 설정 저장 버튼을 누르세요. 사용자 화면을 새로고침하면 반영됩니다.</p>
    <p>BGM 먼저 → 기본 1초 뒤 선택 언어 음성 → BGM 35%에서 12%로 400ms 전환 → 음성 종료 후 설정 볼륨으로 400ms 복귀.</p>
    <label className="admin-card-check"><input type="checkbox" checked={settings.masterSoundEnabled!==false} onChange={e=>setSettings(current=>({...current,masterSoundEnabled:e.target.checked}))}/> 전체 사운드 사용</label>
    <article className="admin-audio-card"><h3>공통 BGM · 개별 BGM이 없는 STEP에 적용</h3><Player url={settings.commonBgmUrl}/>
      {upload('common','bgmUrl','','공통 BGM 등록 / 교체')}{notice('common')}
      <label>공통 BGM URL<input value={settings.commonBgmUrl||''} onChange={e=>setSettings(current=>({...current,commonBgmUrl:e.target.value}))}/></label>
      <button type="button" onClick={()=>setSettings(current=>({...current,commonBgmUrl:''}))}>공통 BGM 연결 해제</button>
    </article>
    <div className="admin-audio-grid">{AUDIO_STEPS.map(({key,label,bgmOnly})=>{
      const row=settings.audioScenes?.[key]||{};
      return <article className="admin-audio-card" key={key}><h3>STEP {label}</h3>{notice(key)}
        <strong>{row.bgmUrl?'개별 BGM 적용':'공통 BGM 적용'}</strong><Player url={row.bgmUrl||settings.commonBgmUrl}/>
        {upload(key,'bgmUrl','','이 STEP BGM 등록 / 교체')}
        <label>개별 BGM URL<input value={row.bgmUrl||''} placeholder="비워 두면 공통 BGM" onChange={e=>update(key,{bgmUrl:e.target.value})}/></label>
        <button type="button" onClick={()=>update(key,{bgmUrl:''})}>개별 BGM 해제 · 공통 사용</button>
        <label>BGM 볼륨 {row.bgmVolume??35}%<input type="range" min="0" max="100" value={row.bgmVolume??35} onChange={e=>update(key,{bgmVolume:Number(e.target.value)})}/></label>
        <label className="admin-card-check"><input type="checkbox" checked={row.bgmLoop!==false} onChange={e=>update(key,{bgmLoop:e.target.checked})}/> BGM 반복</label>
        {bgmOnly&&<p>제공된 제작표 기준: BGM만 사용합니다. 필요하면 아래에서 안내 음성을 추가할 수 있습니다.</p>}
        <label className="admin-card-check"><input type="checkbox" checked={Boolean(row.aiEnabled)} onChange={e=>update(key,{aiEnabled:e.target.checked})}/> 선택 언어 안내 자동재생</label>
        <label>음성 시작 지연(ms)<input type="number" min="0" max="15000" value={row.aiDelayMs??1000} onChange={e=>update(key,{aiDelayMs:Number(e.target.value)})}/></label>
        <div className="admin-audio-languages">{LANGUAGES.map(([lang,name])=><div key={lang}><strong>{name} · 안내 음성</strong>
          <Player url={row.aiAudioUrls?.[lang]} empty="해당 언어 음성 미등록"/>
          {upload(key,'aiAudioUrl',lang,`${name} 음성 등록 / 교체`)}
          <button type="button" onClick={()=>update(key,{aiAudioUrls:{...row.aiAudioUrls,[lang]:''}})}>음성 연결 해제</button>
          <label>음성 URL<input value={row.aiAudioUrls?.[lang]||''} onChange={e=>update(key,{aiAudioUrls:{...row.aiAudioUrls,[lang]:e.target.value}})}/></label>
          <label>제작 원고 · {name}<textarea rows="4" value={row.aiCopy?.[lang]||''} placeholder={bgmOnly?'BGM 전용 STEP · 원고 없음':'제작 원고 입력'} onChange={e=>update(key,{aiCopy:{...row.aiCopy,[lang]:e.target.value}})}/></label>
        </div>)}</div>
        <small>원고 편집만으로 녹음 파일이 바뀌지는 않습니다. 해당 언어 파일을 교체하세요.</small>
        <details><summary>이전 공통 음성 등록값</summary><label>기존 음성 URL<input value={row.aiAudioUrl||''} onChange={e=>update(key,{aiAudioUrl:e.target.value})}/></label></details>
      </article>;
    })}</div>
    <button type="button" className="admin-save-copy" disabled={busy||!!quickUploading} onClick={()=>saveSiteSettings(settings)}>BGM / 음성 설정 저장</button>
  </section>;
}

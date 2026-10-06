import { useEffect, useState } from 'react';
import { defaultAdminSettings } from '../utils/adminSettings';

function SettingField({ label, value, onChange, maxLength = 40 }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export default function AdminSettingsModal({ open, initialTab='intro', settings, onSave, onReset, onClose }) {
  const [draft, setDraft] = useState(settings);
  const [tab, setTab] = useState(initialTab || 'intro');

  // 모달을 다시 열 때 현재 저장된 값을 입력창에 표시합니다.
  useEffect(() => {
    if (open) { setDraft(settings); setTab(initialTab || 'intro'); }
  }, [open, settings, initialTab]);

  if (!open) return null;
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const updateIntro = (language, key, value) => {
    const group = language === 'ko' ? 'introKo' : language === 'ja' ? 'introJa' : 'introEn';
    setDraft((current) => ({ ...current, [group]: { ...current[group], [key]: value } }));
  };
  const updateVideo = (key, value) => setDraft((current) => ({
    ...current,
    videos: { ...current.videos, [key]: value },
  }));
  const updateArticle = (language, key, value) => setDraft((current) => ({
    ...current,
    articleCopy: { ...current.articleCopy, [language]: { ...(current.articleCopy?.[language] || {}), [key]: value } },
  }));
  const updateCatalog = (index, key, value) => setDraft((current) => ({
    ...current,
    characterCatalog: current.characterCatalog.map((item, itemIndex) => itemIndex === index ? {...item, [key]: value} : item),
  }));
  const updatePageCopy = (language, page, key, value) => setDraft((current) => ({
    ...current,
    pageCopy: {
      ...current.pageCopy,
      [language]: {
        ...(current.pageCopy?.[language] || {}),
        [page]: { ...(current.pageCopy?.[language]?.[page] || {}), [key]: value },
      },
    },
  }));
  const updateConnect = (language, key, value) => setDraft((current) => ({
    ...current,
    connectWallCopy: { ...current.connectWallCopy, [language]: { ...(current.connectWallCopy?.[language] || {}), [key]: value } },
  }));
  const isReady = draft.logoName.trim() && draft.artistName.trim();

  return (
    <div className="modal admin-settings-modal" role="dialog" aria-modal="true" aria-labelledby="admin-title" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <form className="admin-panel" onSubmit={(event) => { event.preventDefault(); if (isReady) onSave(draft); }}>
        <button className="close" type="button" onClick={onClose} aria-label="닫기">×</button>
        <p className="eyebrow">ADMIN SETTINGS</p>
        <h2 id="admin-title">기본 콘텐츠 설정</h2>
        <p className="admin-help">저장 시 FastAPI 서버에 반영되며, 현재 브라우저에도 캐시합니다. (서버 연결 필요)</p>

        <nav className="admin-screen-tabs" aria-label="화면별 관리자 설정">
          {[['intro','01 · 시작'],['character','02 · 캐릭터'],['screens','화면 문구'],['plan','03~04 · 조건·운영안'],['incident','05~06 · 돌발상황'],['connect','CONNECT WALL'],['videos','영상 경로']].map(([key,label])=><button type="button" key={key} aria-current={tab===key?'page':undefined} onClick={()=>setTab(key)}>{label}</button>)}
        </nav>
        {tab==='intro' && <>
        <div className="admin-grid">
          <SettingField label="로고 문자" value={draft.logoMark} maxLength={2} onChange={(value) => update('logoMark', value)} />
          <SettingField label="로고 옆 제목" value={draft.logoName} maxLength={60} onChange={(value) => update('logoName', value)} />
          <SettingField label="로고 옆 작은 문구" value={draft.logoSubtitle || ''} maxLength={80} onChange={(value) => update('logoSubtitle', value)} />
          <label className="admin-field"><span>로고와 문구 간격(px)</span><input type="number" min="4" max="60" value={draft.logoGap ?? 14} onChange={e=>update('logoGap',Number(e.target.value))}/></label>
          <SettingField label="출연자명" value={draft.artistName} onChange={(value) => update('artistName', value)} />
          <SettingField label="출연자 설명(한국어)" value={draft.artistRoleKo} onChange={(value) => update('artistRoleKo', value)} />
          <SettingField label="출연자 설명(일본어)" value={draft.artistRoleJa} onChange={(value) => update('artistRoleJa', value)} />
          <label className="admin-field">
            <span>시작 언어</span>
            <select value={draft.defaultLanguage} onChange={(event) => update('defaultLanguage', event.target.value)}>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>

        <h3 className="admin-section-title">01 · 첫 화면 / 기사 / 로고</h3>
        <div className="admin-grid">
          <SettingField label="로고 이미지 URL (미디어에서 LOGO 업로드 후 자동 적용)" value={draft.logoImageUrl || ''} maxLength={500} onChange={value=>update('logoImageUrl',value)} />
          <SettingField label="인트로 영상 URL (미등록 시 기사 이미지 사용)" value={draft.introVideoUrl || ''} maxLength={500} onChange={value=>update('introVideoUrl',value)} />
          <SettingField label="기사 이미지 URL" value={draft.articleImageUrl || ''} maxLength={500} onChange={value=>update('articleImageUrl',value)} />
          <SettingField label="원문 기사 링크" value={draft.articleUrl || ''} maxLength={500} onChange={value=>update('articleUrl',value)} />
          <label className="admin-field"><span>첫 화면 글자 크기 (%)</span><input type="number" min="80" max="140" value={draft.introFontSize || 100} onChange={e=>update('introFontSize',Number(e.target.value))}/></label>
          <label className="admin-field"><span>첫 화면 텍스트 정렬</span><select value={draft.introAlign||'left'} onChange={e=>update('introAlign',e.target.value)}><option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option></select></label>
        </div>
        <h3 className="admin-section-title">기사 표시 문구 (한국어 / 일본어 / 영어)</h3>
        <div className="admin-language-grid">
          {['ko','ja','en'].map(lang => <section key={lang}>
            <b>{lang==='ko'?'한국어':lang==='ja'?'日本語':'English'}</b>
            <SettingField label="기사 출처" value={draft.articleCopy?.[lang]?.source || ''} maxLength={80} onChange={value=>updateArticle(lang,'source',value)} />
            <SettingField label="기사 제목" value={draft.articleCopy?.[lang]?.headline || ''} maxLength={160} onChange={value=>updateArticle(lang,'headline',value)} />
            <SettingField label="기사 하단 설명" value={draft.articleCopy?.[lang]?.detail || ''} maxLength={180} onChange={value=>updateArticle(lang,'detail',value)} />
            <SettingField label="기사 링크 버튼" value={draft.articleCopy?.[lang]?.open || ''} maxLength={80} onChange={value=>updateArticle(lang,'open',value)} />
          </section>)}
        </div>

        <h3 className="admin-section-title">02 · 첫 화면 문구 (한국어 / 일본어 / 영어)</h3>
        <div className="admin-language-grid">
          <section>
            <b>한국어</b>
            <SettingField label="첫째 제목" value={draft.introKo.title1} onChange={(value) => updateIntro('ko', 'title1', value)} />
            <SettingField label="둘째 제목" value={draft.introKo.title2} onChange={(value) => updateIntro('ko', 'title2', value)} />
            <SettingField label="설명" value={draft.introKo.lead} maxLength={140} onChange={(value) => updateIntro('ko', 'lead', value)} />
            <SettingField label="시작 버튼" value={draft.introKo.start} onChange={(value) => updateIntro('ko', 'start', value)} />
          </section>
          <section>
            <b>日本語</b>
            <SettingField label="タイトル 1" value={draft.introJa.title1} onChange={(value) => updateIntro('ja', 'title1', value)} />
            <SettingField label="タイトル 2" value={draft.introJa.title2} onChange={(value) => updateIntro('ja', 'title2', value)} />
            <SettingField label="説明" value={draft.introJa.lead} maxLength={140} onChange={(value) => updateIntro('ja', 'lead', value)} />
            <SettingField label="スタートボタン" value={draft.introJa.start} onChange={(value) => updateIntro('ja', 'start', value)} />
          </section>
        </div>

        <section className="admin-language-grid">
          <div><b>English</b>{['title1','title2','lead','start'].map(key=><SettingField key={key} label={key} value={draft.introEn?.[key] || ''} maxLength={180} onChange={value=>updateIntro('en',key,value)} />)}</div>
        </section>
        </>}
        {tab==='character' && <>
        <h3 className="admin-section-title">02 · 기본 캐릭터 관리</h3>
        <p className="admin-help">이미지가 아직 없어도 이름·역할·설명·순서를 먼저 관리할 수 있습니다. 이미지는 미디어 관리의 CHARACTERS에서 교체합니다.</p>
        <div className="admin-character-settings">
          {(draft.characterCatalog || []).map((item,index)=><article key={item.key} className="admin-character-setting-card">
            <div className="admin-character-setting-head"><b>{item.key.toUpperCase()}</b><label><input type="checkbox" checked={item.active !== false} onChange={e=>updateCatalog(index,'active',e.target.checked)}/> 사용</label></div>
            <SettingField label="표시 이름" value={item.name || ''} maxLength={40} onChange={value=>updateCatalog(index,'name',value)} />
            <SettingField label="역할/타입" value={item.role || ''} maxLength={60} onChange={value=>updateCatalog(index,'role',value)} />
            <SettingField label="설명" value={item.description || ''} maxLength={140} onChange={value=>updateCatalog(index,'description',value)} />
            <label className="admin-field"><span>표시 순서</span><input type="number" min="1" max="20" value={item.sortOrder ?? index+1} onChange={e=>updateCatalog(index,'sortOrder',Number(e.target.value))}/></label>
          </article>)}
        </div>
        <h3 className="admin-section-title">캐릭터 선택 화면 안내 문구</h3>
        {['Ko','Ja','En'].map(lang=><SettingField key={lang} label={`캐릭터 선택 설명 (${lang})`} value={draft.screenCopy?.['profile'+lang]||''} maxLength={220} onChange={value=>update('screenCopy',{...draft.screenCopy,['profile'+lang]:value})} />)}
        </>}
        {tab==='screens' && <>
        <h3 className="admin-section-title">화면별 핵심 문구 관리</h3>
        <p className="admin-help">자주 바꾸는 제목·설명·주요 버튼 문구를 코드 수정 없이 관리합니다.</p>
        {['ko','ja','en'].map(lang => <section key={lang} className="admin-screen-copy-language">
          <h4>{lang==='ko'?'한국어':lang==='ja'?'日本語':'English'}</h4>
          {[
            ['profile','캐릭터 화면',[['title','제목'],['description','설명'],['continue','다음 버튼']]],
            ['setup','조건 설정',[['title','제목'],['description','설명'],['create','진행 버튼']]],
            ['plan','운영 플랜',[['title','제목'],['edit','이전/수정 버튼'],['enter','다음 버튼']]],
            ['incident1','첫 돌발상황',[['title','제목'],['emphasis','강조 문구'],['question','질문'],['confirm','확인 버튼']]],
            ['arrival','도착 화면',[['title','제목'],['copy','설명'],['confirm','확인 버튼']]],
            ['result','결과 화면',[['restart','처음 버튼'],['certificate','확인증 버튼'],['souvenir','기념사진 제목']]],
          ].map(([page,label,fields]) => <div key={page} className="admin-screen-copy-group"><b>{label}</b>{fields.map(([key,fieldLabel])=><SettingField key={key} label={fieldLabel} value={draft.pageCopy?.[lang]?.[page]?.[key] || ''} maxLength={220} onChange={value=>updatePageCopy(lang,page,key,value)} />)}</div>)}
        </section>)}
        </>}
        {tab==='plan' && <>
        <h3 className="admin-section-title">03~04 · 팬 규모·운영 플랜</h3>
        <div className="admin-grid">
          <label className="admin-field"><span>기본 팬 수</span><input type="number" min="1" max="100000" value={draft.fanDefault ?? 100} onChange={e=>update('fanDefault',Number(e.target.value))}/></label>
          <label className="admin-field"><span>팬 수 최대</span><input type="number" min="1" max="100000" value={draft.fanLimit ?? 300} onChange={e=>update('fanLimit',Number(e.target.value))}/></label>
        </div>
        {['ko','ja','en'].map(lang=><SettingField key={lang} label={`운영 플랜 안내 (${lang})`} value={draft.planNotes?.[lang]||''} maxLength={220} onChange={value=>update('planNotes',{...draft.planNotes,[lang]:value})} />)}
        {['Ko','Ja','En'].map(lang=><SettingField key={lang} label={`행사 조건 설명 (${lang})`} value={draft.screenCopy?.['setup'+lang]||''} maxLength={220} onChange={value=>update('screenCopy',{...draft.screenCopy,['setup'+lang]:value})} />)}
        </>}
        {tab==='incident' && <>
        <h3 className="admin-section-title">05~06 · 돌발상황 및 선택별 장면</h3>
        <label className="admin-field"><span>지연 분 (화면·안내 문구 반영)</span><input type="number" min="0" max="180" value={draft.delayMinutes ?? 20} onChange={e=>update('delayMinutes',Number(e.target.value))} /></label>
        {['ko','ja','en'].map(lang=><SettingField key={lang} label={`지연 안내 (${lang})`} value={draft.incidentCopy?.[lang]||''} maxLength={220} onChange={value=>update('incidentCopy',{...draft.incidentCopy,[lang]:value})} />)}
        {['ai','wait'].map(scene=>['ko','ja','en'].map(lang=><SettingField key={scene+lang} label={`${scene} 장면 설명 (${lang})`} value={draft.sceneNotes?.[scene]?.[lang]||''} maxLength={220} onChange={value=>update('sceneNotes',{...draft.sceneNotes,[scene]:{...draft.sceneNotes?.[scene],[lang]:value}})} />))}
        </>}
        {tab==='connect' && <>
        <h3 className="admin-section-title">CONNECT WALL 문구 관리</h3>
        <p className="admin-help">마지막 메시지 화면의 제목·안내·입력 문구를 직접 수정합니다.</p>
        <div className="admin-language-grid">
          {['ko','ja','en'].map(lang=><section key={lang}><b>{lang==='ko'?'한국어':lang==='ja'?'日本語':'English'}</b>
            {[
              ['eyebrow','상단 라벨'],['title','제목'],['body','설명'],['country','도시/국가 입력'],['placeholder','메시지 입력 안내'],['send','전송 버튼']
            ].map(([key,label])=><SettingField key={key} label={label} value={draft.connectWallCopy?.[lang]?.[key] || ''} maxLength={220} onChange={value=>updateConnect(lang,key,value)} />)}
          </section>)}
        </div>
        </>}
        {tab==='videos' && <>
        <h3 className="admin-section-title">장면 V01~V08 영상 경로</h3>
        <p className="admin-help">파일 업로드는 관리자 페이지의 영상·이미지 라이브러리에서 진행하세요.</p>
        <div className="admin-video-grid">
          {Object.entries(draft.videos).map(([key, value]) => (
            <SettingField key={key} label={`${key} 영상`} value={value} maxLength={200} onChange={(nextValue) => updateVideo(key, nextValue)} />
          ))}
        </div>

        </>}
        <div className="admin-actions">
          <button className="secondary" type="button" onClick={() => { setDraft(defaultAdminSettings); onReset(); }}>기본값 복원</button>
          <button className="primary" type="submit" disabled={!isReady}>설정 저장</button>
        </div>
      </form>
    </div>
  );
}

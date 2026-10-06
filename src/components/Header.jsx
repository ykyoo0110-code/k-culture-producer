export default function Header({
  step,
  total,
  elapsedSeconds=0,
  language,
  t,
  settings,
  fontScale,
  onHome,
  onLanguage,
  onFontDecrease,
  onFontReset,
  onFontIncrease,
  onAdmin,
  onStep,
  maxVisited=0,
}) {
  const decreaseLabel = language === 'ja' ? '文字を小さく' : language === 'en' ? 'Smaller text' : '글자 작게';
  const resetLabel = language === 'ja' ? '標準サイズ' : language === 'en' ? 'Default size' : '기본 크기';
  const increaseLabel = language === 'ja' ? '文字を大きく' : language === 'en' ? 'Larger text' : '글자 크게';
  const elapsedText = `${String(Math.floor(elapsedSeconds/60)).padStart(2,'0')}:${String(elapsedSeconds%60).padStart(2,'0')}`;

  return (
    <header className="topbar">
      <button className="brand" type="button" onClick={onHome} aria-label={t.home} style={{'--brand-gap': `${settings.logoGap ?? 14}px`}}>
        <span className="brand-logo-circle">
          {settings.logoImageUrl ? <img className="header-logo" src={settings.logoImageUrl} alt="프로젝트 로고"/> : <b>{settings.logoMark}</b>}
        </span>
        <span className="brand-copy"><span className="brand-name">{settings.logoName}</span>{settings.logoSubtitle && <small className="brand-subtitle">{settings.logoSubtitle}</small>}</span>{settings.logoSideText && <span className="brand-side-text">{settings.logoSideText}</span>}
      </button>
      <div className="step-indicator" aria-label={`${t.step} ${step + 1}`}>
        <span>{t.step.toUpperCase()} {step + 1} / {total} · {language==='ja'?'経過':language==='en'?'ELAPSED':'경과'} {elapsedText}</span>
        <div><i style={{ width: `${((step + 1) / total) * 100}%` }} /></div>
        <div className="step-history" aria-label="이미 방문한 화면 바로 이동">
          {Array.from({length: total}, (_,index)=><button key={index} type="button" title={`${index+1} / ${total}`} aria-label={`${index+1}단계로 이동`} disabled={index>maxVisited} aria-current={index===step?'step':undefined} onClick={()=>onStep?.(index)}>{index+1}</button>)}
        </div>
      </div>
      <div className="header-tools">
        {/* 화면마다 글자가 길어질 수 있어 90% / 100% / 110%로 즉시 조절합니다. */}
        <div className="font-controls" aria-label={language === 'ja' ? '文字サイズ' : language === 'en' ? 'Text size' : '글자 크기'}>
          <button type="button" onClick={onFontDecrease} disabled={fontScale <= 0.9} aria-label={decreaseLabel} title={decreaseLabel}>A−</button>
          <button type="button" className="font-reset" onClick={onFontReset} aria-label={resetLabel} title={resetLabel}>{Math.round(fontScale * 100)}%</button>
          <button type="button" onClick={onFontIncrease} disabled={fontScale >= 1.1} aria-label={increaseLabel} title={increaseLabel}>A+</button>
        </div>
        <button className="admin-button" type="button" onClick={onAdmin} aria-label="관리자 설정" title="관리자 설정">⚙</button>
        <label className="language-select"><span className="sr-only">Language</span><select value={language} onChange={e=>onLanguage(e.target.value)} aria-label="언어 선택"><option value="ja">日本語</option><option value="ko">한국어</option><option value="en">English</option></select></label>
      </div>
    </header>
  );
}

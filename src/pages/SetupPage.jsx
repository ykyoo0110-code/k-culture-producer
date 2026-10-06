import Actions from '../components/Actions';

function OptionGroup({ title, options, selected, onSelect }) {
  return (
    <div className="control-card">
      <h3>{title}</h3>
      <div className="choices">
        {options.map((option, index) => (
          <button className={selected === index ? 'selected' : ''} type="button" key={option} onClick={() => onSelect(index)}>{option}</button>
        ))}
      </div>
    </div>
  );
}

export default function SetupPage({ t, setup, onSetup, onBack, onNext, settings={}, description, language='ko', backgroundVideoUrl='' }) {
  return (
    <section className={`screen active setup ${backgroundVideoUrl ? 'scene-with-video' : ''}`}>
      {backgroundVideoUrl && <div className="scene-video-bg" aria-hidden="true"><video src={backgroundVideoUrl} autoPlay muted loop playsInline preload="auto" /><span /></div>}
      <div className="scene-video-content">
      <div className="section-heading"><p className="eyebrow">{t.eyebrow}</p><h2>{t.title}</h2><p>{description || t.description}</p></div>
      <div className="setup-grid">
        <div className="control-card"><h3>{t.fans}</h3><label className="fan-count"><span>{t.fans} (1~{settings.fanLimit || 300})</span><input aria-label={t.fans} type="number" min="1" max={settings.fanLimit || 300} value={setup.fanCustom ?? settings.fanDefault ?? 100} onChange={e=>onSetup('fanCustom', Math.max(1, Math.min(Number(settings.fanLimit)||300, Number(e.target.value)||1)))} /></label><small>{language === 'ja' ? '100名など希望する人数を直接入力できます。' : language === 'en' ? 'Enter any fan count, such as 100.' : '100명 등 원하는 팬 수를 직접 입력할 수 있습니다.'}</small></div>
        <OptionGroup title={t.city} options={t.cityOptions} selected={setup.cityKey} onSelect={(value) => onSetup('cityKey', value)} />
        <OptionGroup title={t.budget} options={t.budgetOptions} selected={setup.budgetKey} onSelect={(value) => onSetup('budgetKey', value)} />
        <OptionGroup title={t.mood} options={t.moodOptions} selected={setup.moodKey} onSelect={(value) => onSetup('moodKey', value)} />
      </div>
      <Actions backLabel={setup.backLabel} nextLabel={t.create} onBack={onBack} onNext={onNext} />
      </div>
    </section>
  );
}

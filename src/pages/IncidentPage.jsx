import Actions from '../components/Actions';
import ChoiceCard from '../components/ChoiceCard';
import MediaFrame from '../components/MediaFrame';
import StatusStrip from '../components/StatusStrip';
import { formatJapaneseCurrencyText } from '../utils/currency';
import SceneVideoBackground from '../components/SceneVideoBackground';

const icons = { kimchi: '🥬', dance: '♪', ai: '✦', wait: '⌛' };

export default function IncidentPage({ t, statusText, state, language, programs, video, selected, onSelect, onBack, onNext, incidentCopy, delayMinutes, yenPerManWon = 100 }) {
  return (
    <section className="screen active incident reuse-video-screen"><SceneVideoBackground video={video} />
      <StatusStrip state={state} language={language} labels={statusText} />
      <div className="split-stage">
        <div className="incident-copy"><p className="alert-label">⚠ {t.alert}</p><h2>{t.title}<br /><em>{(t.emphasis||'').replace(/20|２０/g,String(delayMinutes ?? 20))}</em></h2><p>{incidentCopy || t.copy}</p>
      <h3 className="choice-title">{t.question}</h3>
      <div className="response-grid">
        {Object.entries(programs).map(([key, program], index) => <ChoiceCard key={key} number={index + 1} icon={icons[key]} title={program[language].label} meta={language === 'ja' ? formatJapaneseCurrencyText(program[language].meta, yenPerManWon) : program[language].meta} selected={selected === key} featured={index < 2} onClick={() => onSelect(key)} />)}
      </div>
        </div>
        {/* 영상 아래의 여유 공간에 버튼을 배치해 별도 하단 행을 줄입니다. */}
        <div className="incident-media-column">
        <MediaFrame video={video} poster="/images/V02_artist_delay.png" code="V02" label={t.media} className="compact" />
          <Actions backLabel={t.back} nextLabel={t.confirm} onBack={onBack} onNext={onNext} disabled={!selected} />
        </div>
      </div>
    </section>
  );
}

import Actions from '../components/Actions';
import ChoiceCard from '../components/ChoiceCard';
import MediaFrame from '../components/MediaFrame';
import StatusStrip from '../components/StatusStrip';
import SceneVideoBackground from '../components/SceneVideoBackground';

export default function SecondIncidentPage({ t, statusText, state, language, incident, selected, onSelect, onBack, onNext }) {
  const copy = incident[language];
  return (
    <section className="screen active second-incident reuse-video-screen"><SceneVideoBackground video={incident.video} />
      <StatusStrip state={state} language={language} labels={statusText} />
      <div className="split-stage">
        <MediaFrame video={incident.video} poster={incident.poster} code={incident.code} label={copy.media} className="compact" controls />
        <div className="incident-copy"><p className="alert-label">⚠ {t.alert}</p><h2>{copy.title}<br /><em>{copy.emphasis}</em></h2><p>{copy.copy}</p></div>
      </div>
      <div className="response-grid second-grid">
        {incident.options.map((option, index) => <ChoiceCard key={option[language][0]} number={index + 1} title={option[language][0]} meta={option[language][1]} selected={selected === index} onClick={() => onSelect(index)} />)}
      </div>
      <Actions backLabel={t.back} nextLabel={t.confirm} onBack={onBack} onNext={onNext} disabled={selected === null} />
    </section>
  );
}

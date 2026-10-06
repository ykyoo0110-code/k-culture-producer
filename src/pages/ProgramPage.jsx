import Actions from '../components/Actions';
import MediaFrame from '../components/MediaFrame';
import StatusStrip from '../components/StatusStrip';
import { formatJapaneseCurrencyText } from '../utils/currency';
import SceneVideoBackground from '../components/SceneVideoBackground';

export default function ProgramPage({ t, statusText, state, language, program, onBack, onNext, yenPerManWon = 100 }) {
  const sourceCopy = program[language];
  const copy = language === 'ja' ? {
    ...sourceCopy,
    meta: formatJapaneseCurrencyText(sourceCopy.meta, yenPerManWon),
    effects: (sourceCopy.effects || []).map(item => formatJapaneseCurrencyText(item, yenPerManWon)),
  } : sourceCopy;
  return (
    <section className="screen active program reuse-video-screen"><SceneVideoBackground video={program.video} />
      <StatusStrip state={state} language={language} labels={statusText} />
      <div className="video-stage">
        <MediaFrame video={program.video} poster={program.poster} code={program.code} label={copy.label} className="program-media" controls />
        <aside className="scene-note"><p className="eyebrow">{t.eyebrow}</p><h2>{copy.title}</h2><p>{copy.copy}</p><ul>{copy.effects.map((effect) => <li key={effect}>{effect}</li>)}</ul></aside>
      </div>
      <Actions backLabel={t.change} nextLabel={t.check} onBack={onBack} onNext={onNext} />
    </section>
  );
}

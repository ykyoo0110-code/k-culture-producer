import Actions from '../components/Actions';
import MediaFrame from '../components/MediaFrame';
import StatusStrip from '../components/StatusStrip';
import SceneVideoBackground from '../components/SceneVideoBackground';

export default function ArrivalPage({ t, statusText, backLabel, state, language, artistName, artist, video, options, cmsOptions = [], selected, onSelect, onBack, onNext }) {
  const title = artist?.arrivalTitle?.[language] || t.title.replaceAll('KKUGI', artistName);
  const arrivalCopy = artist?.arrivalCopy?.[language] || t.copy;
  const cmsByKey = Object.fromEntries((cmsOptions || []).map(item => [item.key, item]));
  const visibleOptions = Object.entries(options).filter(([key]) => cmsByKey[key]?.active !== false);
  return (
    <section className="screen active arrival reuse-video-screen"><SceneVideoBackground video={video} />
      <StatusStrip state={state} language={language} labels={statusText} />
      <div className="video-stage reverse">
        <MediaFrame video={video} poster={artist?.key === 'kkugi' ? '/images/V07_KKUGI_arrival.png' : (artist?.imageUrl || '')} allowLocalFallback={artist?.key === 'kkugi'} code="V07" label={t.media} className="program-media" controls />
        <aside className="scene-note"><p className="eyebrow">{t.eyebrow}</p><h2>{title}</h2><p>{arrivalCopy}</p><div className="final-options">
          {visibleOptions.map(([key, option]) => <button className={selected === key ? 'selected' : ''} type="button" key={key} onClick={() => onSelect(key)}>{cmsByKey[key]?.[language] || option[language]}</button>)}
        </div></aside>
      </div>
      <Actions backLabel={backLabel} nextLabel={t.confirm} onBack={onBack} onNext={onNext} disabled={!selected} />
    </section>
  );
}

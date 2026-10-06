import { useMemo } from 'react';
import Actions from '../components/Actions';
import { formatMoney } from '../utils/score';

export default function PlanPage({ t, setupText, state, language, artistDisplay, onBack, onNext, planNote, backgroundVideoUrl, fanCount = 100, planVariants = [], scheduleItems = [] }) {
  const summary = t.summary({ city: setupText.city, fans: setupText.fans, mood: setupText.mood });
  // 참가 인원에 맞는 운영안 1개를 자동 선택합니다. 관리자는 각 운영안의 실제 일정을 CMS에서 직접 편집합니다.
  const chosenVariant = useMemo(() => {
    const matches=(planVariants || []).filter(item=>fanCount >= Number(item.minFans||0) && fanCount <= Number(item.maxFans||999999));
    return matches[0] || planVariants?.[0] || {label:'기본 운영안'};
  }, [fanCount, planVariants]);
  const variantSchedule = chosenVariant?.schedule?.[language];
  const baseSchedule = (variantSchedule?.length ? variantSchedule : scheduleItems?.length ? scheduleItems : []).map(item => [item.time, item.title, item.copy]);
  const adjustedSchedule = (baseSchedule.length ? baseSchedule : t.schedule).map(([time,title,copy],index)=>[
    time, title,
    index===2 ? `${copy} · ${setupText.fans} · ${setupText.city}` : index===4 ? `${copy} · ${setupText.mood}` : copy
  ]);
  return (
    <section className={`screen active plan ${backgroundVideoUrl ? 'plan-with-video' : ''}`}>
      {backgroundVideoUrl && <div className="plan-video-bg" aria-hidden="true"><video src={backgroundVideoUrl} autoPlay muted loop playsInline preload="auto" /><span /></div>}
      <div className="plan-content-layer">
      <div className="section-heading"><p className="eyebrow">{t.eyebrow}</p><h2>{t.title}</h2><p>{summary}</p><p className="plan-custom-note">{planNote}</p></div>
      <div className="plan-layout">
        <article className="timeline-card"><h3>REAL RUN OF SHOW</h3><p className="plan-variant-label">{chosenVariant.label || '운영안'}</p><ol>
          {adjustedSchedule.map(([time, title, copy]) => <li key={time}><time>{time}</time><div><b>{title}</b><span>{copy}</span></div></li>)}
        </ol></article>
        <aside className="brief-card">
          <div><span>{t.artist}</span><b>{artistDisplay}</b></div>
          <div><span>{t.language}</span><b>{t.languageValue}</b></div>
          <div><span>{t.safety}</span><b>{t.safetyValue}</b></div>
          <div><span>{t.operatingBudget}</span><b>{formatMoney(state.budget, language)}</b></div>
        </aside>
      </div>
      <Actions backLabel={t.edit} nextLabel={t.enter} onBack={onBack} onNext={onNext} />
      </div>
    </section>
  );
}

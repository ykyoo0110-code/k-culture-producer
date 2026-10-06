import { useEffect, useRef, useState } from 'react';
import Actions from '../components/Actions';

const NEWS = {
  ko:{source:'동아일보 · 경제',news:'K콘텐츠 성공은 인프라-생태계 구축 결과',open:'기사 원문 보기'},
  ja:{source:'東亜日報 · 経済',news:'Kコンテンツの成功はインフラと生態系の成果',open:'記事を読む'},
  en:{source:'DONG-A ILBO · ECONOMY',news:'K-content success reflects a strong cultural ecosystem',open:'Read article'},
};
const HERO = {
  ko:{kicker:'DONG-A ILBO · AI INTERACTIVE EXPERIENCE',title:'오늘, 내가',accent:'K-컬처 프로듀서',lead:'당신의 선택으로 K-컬처 현장을 기획하고, AI와 함께 콘텐츠를 만들고, 전 세계와 연결되는 하루를 시작하세요.',cta:'K-CULTURE DAY 시작',why:'WHY THIS EXPERIENCE?',steps:[['01','CHOOSE','나의 K-컬처 선택'],['02','PLAN','AI와 행사 기획'],['03','CREATE','나만의 결과 만들기'],['04','PHOTO','함께한 기념사진'],['05','CONNECT','메시지로 연결']]},
  ja:{kicker:'DONG-A ILBO · AI INTERACTIVE EXPERIENCE',title:'今日、私が',accent:'K-CULTURE PRODUCER',lead:'あなたの選択でK-CULTUREの現場を企画し、AIと一緒にコンテンツを作り、世界とつながる一日を始めましょう。',cta:'K-CULTURE DAYを始める',why:'WHY THIS EXPERIENCE?',steps:[['01','CHOOSE','K-CULTUREを選ぶ'],['02','PLAN','AIと企画する'],['03','CREATE','自分の結果を作る'],['04','PHOTO','一緒の記念写真'],['05','CONNECT','メッセージでつながる']]},
  en:{kicker:'DONG-A ILBO · AI INTERACTIVE EXPERIENCE',title:'TODAY, YOU ARE THE',accent:'K-CULTURE PRODUCER',lead:'Make the choices. Plan the experience with AI. Create your own K-culture moment and connect it with the world.',cta:'START YOUR K-CULTURE DAY',why:'WHY THIS EXPERIENCE?',steps:[['01','CHOOSE','Choose your K-culture'],['02','PLAN','Plan it with AI'],['03','CREATE','Create your moment'],['04','PHOTO','Keep a souvenir photo'],['05','CONNECT','Connect your story']]},
};

export default function IntroPage({ t, language='en', settings={}, video, onNext }) {
  const [preview, setPreview] = useState(null);
  const previewDialog = useRef(null);
  const previewCopy = language === 'ko' ? {open:'크게 보기', close:'닫기'}
    : language === 'ja' ? {open:'拡大表示', close:'閉じる'} : {open:'Enlarge preview', close:'Close'};
  // 네이티브 모달로 키보드 포커스를 가두고 Esc·닫기 후 원래 카드로 돌아갑니다.
  useEffect(() => {
    if (preview && !previewDialog.current?.open) previewDialog.current?.showModal();
  }, [preview]);
  const base = NEWS[language] || NEWS.en;
  const hero = HERO[language] || HERO.en;
  const article = settings.articleCopy?.[language] || settings.articleCopy?.ko || {};
  const c = {...base,...article,news:article.headline || article.news || base.news};
  // 관리자에서 등록한 메인 영상을 우선 사용하고, 없으면 패키지의 K-CULTURE 데모 영상을 자동 재생합니다.
  const introVideo = settings.introVideoUrl || '/videos/KCULTURE_HOME_DEMO.mp4';
  const articleUrl = settings.articleUrl || 'https://www.donga.com/news/Economy/article/all/20260526/133995102/2';
  return <section className="screen active kcp-home" style={{'--intro-scale':(Number(settings.introFontSize)||100)/100}}>
    <div className="kcp-home-media">
      <video key={introVideo} autoPlay muted loop playsInline preload="metadata" src={introVideo}/>
    </div>
    <div className="kcp-home-shade" />
    <div className="kcp-home-content">
      <div className="kcp-home-copy" style={{textAlign:['left','right','center'].includes(settings.introAlign)?settings.introAlign:'left'}}>
        <p className="kcp-home-kicker">{hero.kicker}</p>
        <h1>{hero.title}<br/><em>{hero.accent}</em></h1>
        <p className="kcp-home-lead">{hero.lead}</p>
        <p className="kcp-home-ai">YOU CHOOSE <b>→</b> AI CREATES <b>→</b> YOU PRODUCE</p>
        <Actions nextLabel={hero.cta || t.start} onNext={onNext}/>
      </div>
      <a className="kcp-home-article" href={articleUrl} target="_blank" rel="noopener noreferrer">
        <div><b>DONG-A ILBO</b><span>{hero.why} ↗</span></div>
        <img className="kcp-home-article-thumb" src={settings.articleImageUrl || '/images/article-reference.png'} alt="Dong-A Ilbo article"/><small>{c.source}</small><strong>{c.news}</strong>
        <p>{article.detail || (language==='ja'?'東亜日報の記事から始まる参加型K-CULTUREプロジェクト':language==='ko'?'동아일보 기사에서 출발한 참여형 K-CULTURE 프로젝트':'An interactive K-culture experience inspired by Dong-A Ilbo reporting.')}</p>
        <span className="kcp-home-article-open">{c.open} →</span>
      </a>
    </div>
    <div className="kcp-home-steps">{hero.steps.map(([no,name,copy],index)=>{
      // 기존 CONNECT 등록값(3번)은 유지하고, 새 PHOTO는 별도 등록값(4번)을 사용합니다.
      const mediaIndex = [0,1,2,4,3][index];
      const media = (settings.homeStepMedia || [])[mediaIndex] || {};
      const fallback = ['/images/V01_fanmeeting_arrival.png','/images/V02_artist_delay.png','/images/V04_dance_keyframe.png','/images/kcp-artwork-souvenir-reference.png','/images/kcp-artwork-donga-reference.png'][index];
      const item = {url:media.url || fallback, type:media.type === 'video' && media.url ? 'video' : 'image', title:no+' '+name, copy};
      return <div className="kcp-home-step-card" key={no}>
        <div className="kcp-home-step-copy"><span>{no}</span><b>{name}</b><small>{copy}</small></div>
        <button type="button" className="kcp-home-step-media" aria-label={item.title+' · '+previewCopy.open} onClick={()=>setPreview(item)}>
          {item.type === 'video' ? <video src={item.url} muted playsInline preload="metadata"/> : <img src={item.url} alt={copy}/>}
          <span className="kcp-home-step-zoom" aria-hidden="true">⤢</span>
        </button>
      </div>;
    })}</div>
    <dialog ref={previewDialog} className="kcp-home-preview" aria-labelledby="kcp-home-preview-title" onClose={()=>setPreview(null)} onClick={event=>{if(event.target===event.currentTarget)event.currentTarget.close();}}>
      {preview && <div className="kcp-home-preview-inner">
        <div className="kcp-home-preview-heading"><h2 id="kcp-home-preview-title">{preview.title} · {preview.copy}</h2><button type="button" autoFocus onClick={()=>previewDialog.current.close()} aria-label={previewCopy.close}>×</button></div>
        {preview.type === 'video' ? <video key={preview.url} src={preview.url} controls autoPlay muted playsInline preload="metadata"/> : <img src={preview.url} alt={preview.copy}/>}
      </div>}
    </dialog>
  </section>;
}

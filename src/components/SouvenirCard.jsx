export default function SouvenirCard({ profile, artistName, artist, stage, title, copy, photoUrl, onCreatePhoto, photoBusy, photoError, language }) {
  const label = language === 'ja' ? '記念写真を作る' : language === 'en' ? 'Create souvenir photo' : 'AI 기념사진 만들기';
  return (
    <article className="souvenir-card souvenir-card-v19">
      <div className="souvenir-visual-v19">
        {photoUrl ? (
          <img src={photoUrl} alt={`${profile.nickname || 'PRODUCER'} · ${artistName} 기념사진`} />
        ) : (
          <div className="souvenir-live-preview souvenir-stage-only-preview">
            {/* 생성 전에는 빈 무대만 보여줍니다. 배우/캐릭터는 백엔드에서 무대 위에 합성합니다. */}
            <img className="souvenir-preview-stage" src={stage?.imageUrl || '/images/fanmeeting-stage.png'} alt="fan meeting stage" />
            <div className="souvenir-preview-label"><small>K-CULTURE MOMENT</small><b>{profile.nickname || 'PRODUCER'} × {artistName}</b><span>{language === 'ja' ? 'このステージに人物を合成します' : language === 'en' ? 'People will be composited onto this stage' : '이 무대 위에 배우와 캐릭터를 합성합니다'}</span></div>
          </div>
        )}
      </div>
      <div className="souvenir-copy"><span>K-CULTURE MOMENT</span><h3>{title}</h3><p>{copy}</p>
        {!photoUrl && <button className="souvenir-create-btn" type="button" onClick={onCreatePhoto} disabled={photoBusy}>{photoBusy ? (language === 'ja' ? '生成中…' : language === 'en' ? 'Generating…' : 'AI 기념사진 생성 중…') : label}</button>}
        {photoUrl && <a className="souvenir-download-btn" href={photoUrl} download={`K-CULTURE_${profile.nickname || 'PRODUCER'}.png`} target="_blank" rel="noreferrer">{language === 'ja' ? '記念写真を見る・保存' : language === 'en' ? 'View / Save photo' : '기념사진 보기·저장'}</a>}
        {photoError && <p className="souvenir-error" role="alert">{photoError}</p>}
      </div>
    </article>
  );
}

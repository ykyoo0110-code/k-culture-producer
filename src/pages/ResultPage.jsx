import { useEffect, useMemo, useRef, useState } from 'react';
import Actions from '../components/Actions';
import CertificateModal from '../components/CertificateModal';
import ConnectWall from '../components/ConnectWall';
import MediaFrame from '../components/MediaFrame';
import SceneVideoBackground from '../components/SceneVideoBackground';
import SouvenirCard from '../components/SouvenirCard';
import { downloadArticle, shareResult } from '../services/share';
import { createCertificate, downloadCertificatePdf, generateSouvenirPhoto } from '../services/systemApi';
import { articleToText, createArticle } from '../utils/article';

export default function ResultPage({ sessionId, billboardBackgroundVideoUrl='', connectCopy, tickerDurationSeconds = 34, t, language, state, result, profile, artistName, artist, stage, video, programLabel, decisionLabels, certificateOpen, onCertificate, onClose, onRestart }) {
  const [shareMessage, setShareMessage] = useState('');
  const [certificateData, setCertificateData] = useState(null);
  const [certificateStatus, setCertificateStatus] = useState('');
  const [certificateBusy, setCertificateBusy] = useState(false);

  // 실제 합성 입력을 모두 구분해 같은 배우·무대의 이미지 교체도 새 사진으로 처리합니다.
  // 배열 직렬화로 URL 안의 구분 문자가 캐시 키의 의미를 바꾸지 않게 합니다.
  const photoCacheKey = sessionId && profile?.imageUrl
    ? 'kcp-souvenir-v8-inputs-' + JSON.stringify([
        sessionId, profile.imageUrl, profile.characterKey || 'mina',
        artist?.imageUrl || '', artist?.key || '', stage?.imageUrl || '', stage?.key || '',
      ]) : '';
  const photoRequestVersion = useRef(0);

  const [souvenir, setSouvenir] = useState({ key: '', url: '', busy: false, error: '' });

  useEffect(() => {
    photoRequestVersion.current += 1;
    let url = '';
    if (photoCacheKey) {
      try {
        url = sessionStorage.getItem(photoCacheKey) || '';
      } catch {}
    }
    setSouvenir({ key: photoCacheKey, url, busy: false, error: '' });
    // 선택 변경·화면 이동 뒤에 이전 요청이 완료되어도 현재 미리보기에 적용하지 않습니다.
    return () => { photoRequestVersion.current += 1; };
  }, [photoCacheKey]);

  const photoUrl = souvenir.key === photoCacheKey ? souvenir.url : '';

  const createPhoto = async () => {
    if (!sessionId || !profile?.imageUrl || souvenir.busy || photoUrl) return;

    const requestVersion = photoRequestVersion.current;
    setSouvenir({ key: photoCacheKey, url: '', busy: true, error: '' });
    try {
      const saved = await generateSouvenirPhoto({
        session_id: sessionId,
        nickname: profile.nickname || 'PRODUCER',
        character_url: profile.imageUrl,
        character_key: profile.characterKey || 'mina',
        artist_url: artist?.imageUrl || '',
        artist_key: artist?.key || '',
        stage_url: stage?.imageUrl || '',
        stage_key: stage?.key || '',
      });

      if (requestVersion !== photoRequestVersion.current) return;
      if (!saved?.image_url) throw new Error('기념사진 결과 URL을 확인하지 못했습니다. 다시 시도해 주세요.');
      if (photoCacheKey) {
        try {
          sessionStorage.setItem(photoCacheKey, saved.image_url);
        } catch {}
      }
      setSouvenir({ key: photoCacheKey, url: saved.image_url, busy: false, error: '' });
    } catch (error) {
      if (requestVersion !== photoRequestVersion.current) return;
      setSouvenir({
        key: photoCacheKey,
        url: '',
        busy: false,
        error: error.message || '기념사진 생성 실패',
      });
    }
  };

  const reportTitle = language === 'ja'
    ? `${programLabel}と現場対応を組み合わせました`
    : `${programLabel}과 현장 대응을 연결했습니다`;
  const reportText = language === 'ja'
    ? `${decisionLabels.join(' → ')}の順に判断しました。安全${result.scores[2]}点、進行${result.scores[3]}点、コミュニケーション${result.scores[4]}点で終了しました。`
    : `${decisionLabels.join(' → ')} 순서로 판단했습니다. 안전 ${result.scores[2]}점, 일정 ${result.scores[3]}점, 소통 ${result.scores[4]}점으로 팬미팅을 마무리했습니다.`;

  const article = useMemo(() => createArticle({
    language,
    nickname: profile.nickname,
    programLabel,
    decisionLabels,
    result,
  }), [language, profile.nickname, programLabel, decisionLabels, result]);

  const systemCopy = language === 'ja' ? {
    save: '確認証を保存', download: 'PDFダウンロード', saved: '確認証を保存しました。',
    demo: 'FastAPIを起動すると保存・PDF発行ができます。',
  } : {
    save: '확인증 저장', download: 'PDF 다운로드', saved: '확인증을 저장했습니다.',
    demo: 'FastAPI를 실행하면 실제 저장·PDF 발급이 가능합니다.',
  };

  const saveArticle = () => {
    const safeName = profile.nickname.replace(/[^a-zA-Z0-9가-힣ぁ-んァ-ン一-龥_-]/g, '_');
    downloadArticle(`${safeName}_K-CULTURE_ARTICLE.txt`, articleToText(article, t.disclaimer));
  };

  const share = async () => {
    try {
      const status = await shareResult({ title: article.title, text: article.lead });
      setShareMessage(status === 'copied' ? t.copied : '');
    } catch {
      setShareMessage('');
    }
  };

  const saveCertificate = async () => {
    if (certificateData || certificateBusy) { onCertificate(); return; }
    setCertificateBusy(true);
    setCertificateStatus('');
    try {
      const saved = await createCertificate({
        session_id: sessionId || null,
        nickname: profile.nickname || 'PARTICIPANT',
        producer_type: result.type,
        score: result.total,
        language,
      });
      setCertificateData(saved);
      setCertificateStatus(systemCopy.saved);
      onCertificate();
    } catch {
      setCertificateStatus(systemCopy.demo);
      onCertificate();
    } finally { setCertificateBusy(false); }
  };

  const downloadCertificate = async () => {
    if (certificateBusy) return;
    setCertificateBusy(true);
    try {
      let current = certificateData;
      if (!current) {
        current = await createCertificate({
          session_id: sessionId || null,
          nickname: profile.nickname || 'PARTICIPANT',
          producer_type: result.type,
          score: result.total,
          language,
        });
        setCertificateData(current);
      }
      await downloadCertificatePdf(current.certificate_no, profile);
      setCertificateStatus('');
    } catch {
      setCertificateStatus(systemCopy.demo);
    } finally { setCertificateBusy(false); }
  };

  return (
    <section className="screen active result reuse-video-screen"><SceneVideoBackground video={video} />
      <div className="result-hero">
        <MediaFrame video={video} poster={artist?.key === 'kkugi' ? '/images/V08_fanmeeting_success.png' : (artist?.imageUrl || '')} allowLocalFallback={artist?.key === 'kkugi'} code="V08" label={t.media} className="result-media" />
        <div className="result-summary"><p className="eyebrow">{t.eyebrow}</p><h2>{t.prefix} <em>{result.type}</em>{t.suffix}</h2><p>{result.copy}</p><div className="total-score"><span>{t.total}</span><strong>{result.total}</strong><small>/ 100</small></div></div>
      </div>

      <div className="score-grid">
        {t.scoreNames.map((name, index) => <div key={name}><span>{name}</span><b>{result.scores[index]}</b><i style={{ '--w': `${result.scores[index]}%` }} /></div>)}
      </div>

      <Actions backLabel={t.restart} nextLabel={t.certificate} onBack={onRestart} onNext={saveCertificate} />
      <div className="system-actions">
        <button type="button" onClick={saveCertificate} disabled={certificateBusy}>{systemCopy.save}</button>
        <button type="button" onClick={downloadCertificate} disabled={certificateBusy}>{systemCopy.download}</button>
        {certificateStatus && <small role="status">{certificateStatus}</small>}
      </div>

      <div className="result-bottom">
        <article><span>{t.report}</span><h3>{reportTitle}</h3><p>{reportText}</p></article>
        <aside><span>{t.log}</span><ol>{decisionLabels.map((decision, index) => <li key={`${decision}-${index}`}><b>{String(index + 1).padStart(2, '0')}</b><span>{decision}</span></li>)}</ol></aside>
      </div>

      <div className="generated-results">
        <SouvenirCard profile={profile} artistName={artistName} artist={artist} stage={stage} title={t.souvenir} copy={t.souvenirCopy} badge={t.aiBadge} photoUrl={photoUrl} onCreatePhoto={createPhoto} photoBusy={souvenir.busy} photoError={souvenir.error} language={language} />
        <article className="news-card">
          <div className="news-masthead"><b>K-CULTURE DAILY</b><span>{t.aiBadge}</span></div>
          <p className="eyebrow">{t.articleTitle}</p>
          <h2>{article.title}</h2>
          <p className="news-lead">{article.lead}</p>
          {article.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <blockquote>{article.quote}</blockquote>
          <small>{t.disclaimer}</small>
          <div className="share-actions">
            <button type="button" onClick={saveArticle}>{t.downloadArticle}</button>
            <button type="button" onClick={share}>{t.share}</button>
            {shareMessage && <span role="status">{shareMessage}</span>}
          </div>
        </article>
      </div>

      <ConnectWall artistVideoUrl={artist?.resultVideoUrl || video || ''} billboardBackgroundVideoUrl={billboardBackgroundVideoUrl} connectCopy={connectCopy} tickerDurationSeconds={tickerDurationSeconds} language={language} sessionId={sessionId} nickname={profile.nickname} profile={profile} artistName={artistName} photoUrl={photoUrl} />

      <CertificateModal
        open={certificateOpen}
        onClose={onClose}
        t={t}
        type={result.type}
        score={result.total}
        profile={profile}
        certificateNo={certificateData?.certificate_no}
        onSave={saveCertificate}
        onDownload={downloadCertificate}
        saving={certificateBusy}
        message={certificateStatus}
        language={language}
      />
    </section>
  );
}

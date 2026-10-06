import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

function resolvePhotoUrl(url) {
  const value = (url || '').trim();
  if (!value) return '/characters/mina.svg';
  if (value.startsWith('/generated/')) return `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}${value}`;
  return value;
}

async function toDataUrl(src) {
  if (src.startsWith('data:image/')) return src;
  const response = await fetch(src);
  if (!response.ok) throw new Error('character image load failed');
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function loadCanvasImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export default function CertificateModal({ open, onClose, t, type, score, profile, certificateNo, onSave, onDownload, saving, message, language='ko' }) {
  const [localStatus, setLocalStatus] = useState('');
  const photo = useMemo(() => resolvePhotoUrl(profile?.imageUrl), [profile?.imageUrl]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  const saveCertificateImage = async () => {
    setLocalStatus('');
    try {
      // 브라우저에서 확인증 한 장을 PNG로 직접 만들어 저장합니다.
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1500;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f7f4eb';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#c8c3b6';
      ctx.lineWidth = 18;
      ctx.strokeRect(30, 30, 1140, 1440);
      ctx.strokeStyle = '#8c8576';
      ctx.lineWidth = 2;
      ctx.strokeRect(58, 58, 1084, 1384);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#4d5568';
      ctx.font = '700 28px Arial, sans-serif';
      ctx.fillText('K-CULTURE PRODUCER', 600, 150);
      ctx.fillStyle = '#121722';
      ctx.font = '800 58px Arial, sans-serif';
      ctx.fillText(t.certTitle || 'PRODUCER CERTIFICATE', 600, 240);

      const dataUrl = await toDataUrl(photo);
      const image = await loadCanvasImage(dataUrl);
      const boxW = 360, boxH = 360, boxX = 420, boxY = 310;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(boxX - 10, boxY - 10, boxW + 20, boxH + 20);
      const scale = Math.min(boxW / image.width, boxH / image.height);
      const drawW = image.width * scale;
      const drawH = image.height * scale;
      ctx.drawImage(image, boxX + (boxW - drawW) / 2, boxY + (boxH - drawH) / 2, drawW, drawH);

      ctx.fillStyle = '#566079';
      ctx.font = '700 26px Arial, sans-serif';
      ctx.fillText(profile?.nickname || 'PARTICIPANT', 600, 740);
      ctx.fillStyle = '#d72578';
      ctx.font = '800 44px Arial, sans-serif';
      ctx.fillText(type || '', 600, 815);
      ctx.fillStyle = '#232938';
      ctx.font = '32px Arial, sans-serif';
      const lines = String(t.certCopy || '').split('\n');
      lines.forEach((line, index) => ctx.fillText(line, 600, 900 + index * 48));
      ctx.font = '800 48px Arial, sans-serif';
      ctx.fillText(`${score} POINTS`, 600, 1050);
      ctx.fillStyle = '#6c7382';
      ctx.font = '24px Arial, sans-serif';
      if (certificateNo) ctx.fillText(certificateNo, 600, 1130);
      ctx.fillText('AI INTERACTIVE PROJECT · PROJECT CONTACT · 2026', 600, 1230);

      const url = canvas.toDataURL('image/png');
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${certificateNo || 'K-CULTURE-CERTIFICATE'}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setLocalStatus(language === 'ja' ? '確認証画像を保存しました。' : language === 'en' ? 'Certificate image saved.' : '확인증 이미지를 저장했습니다.');
    } catch (error) {
      setLocalStatus(language === 'ja' ? '画像の保存に失敗しました。' : language === 'en' ? 'Image save failed.' : '확인증 이미지 저장에 실패했습니다.');
    }
  };

  if (!open) return null;
  return createPortal(
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="cert-title" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="certificate">
        <button className="close" type="button" onClick={onClose} aria-label={t.close}>×</button>
        <p>K-CULTURE PRODUCER</p>
        <h2 id="cert-title">{t.certTitle}</h2>
        <div className="cert-photo"><img src={photo} alt={`${profile?.nickname || 'PARTICIPANT'} character`} onError={(event) => { event.currentTarget.src = '/characters/mina.svg'; }} /></div>
        <p className="cert-name">{profile?.nickname}</p>
        <h3>{type}</h3>
        <p>{String(t.certCopy || '').split('\n').map((line) => <span key={line}>{line}<br /></span>)}</p>
        <strong>{score} POINTS</strong>
        {certificateNo && <small>{certificateNo}</small>}
        <small>AI INTERACTIVE PROJECT · PROJECT CONTACT · 2026</small>
        <div className="certificate-controls">
          <button type="button" onClick={saveCertificateImage} disabled={saving}>{language==='ja'?'確認証を保存':language==='en'?'Save certificate':'확인증 저장'}</button>
          <button type="button" onClick={onDownload} disabled={saving}>{saving ? (language==='ja'?'処理中…':language==='en'?'Processing…':'처리 중…') : (language==='ja'?'PDFダウンロード':language==='en'?'Download PDF':'PDF 다운로드')}</button>
        </div>
        {(localStatus || message) && <small role="status">{localStatus || message}</small>}
      </div>
    </div>,
    document.body,
  );
}

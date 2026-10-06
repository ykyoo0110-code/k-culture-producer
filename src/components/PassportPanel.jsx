import React, { useEffect, useState } from 'react';
import { getSceneMedia } from '../services/systemApi';
import './passport.css';

// 기존 experience_sessions.current_step을 재사용하므로 DB 테이블 추가가 필요하지 않습니다.
// 같은 세션은 같은 여권 번호를 유지하며, 실제 체험 진행에 따라 스탬프가 열립니다.
const SCENES = ['START', 'CHARACTER', 'SETUP', 'PLAN', 'SITUATION', 'PROGRAM', 'RESPONSE', 'ARRIVAL', 'FINISH'];
export default function PassportPanel({language, nickname, image, imageMode, characterKey, sessionId, step, onClose}) {
  const [mediaImage, setMediaImage] = useState('');

  // 기본 캐릭터는 프로필의 오래된 SVG 대신 관리자에서 현재 등록한 이미지를 불러옵니다.
  // 프롬프트/사진 생성 캐릭터는 참가자의 실제 생성 이미지를 그대로 사용합니다.
  useEffect(() => {
    if (imageMode !== 'basic' || !characterKey) {
      setMediaImage('');
      return;
    }
    let alive = true;
    setMediaImage('');
    getSceneMedia('CHARACTERS')
      .then(rows => {
        if (!alive || !Array.isArray(rows)) return;
        const latest = rows
          .filter(row => row.active !== false && row.kind === 'image' &&
            String(row.title || '').trim().toLowerCase() === String(characterKey).trim().toLowerCase())
          .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];
        setMediaImage(latest?.file_url || '');
      })
      .catch(() => { /* 연결 실패 시 기존 프로필 이미지를 표시합니다. */ });
    return () => { alive = false; };
  }, [imageMode, characterKey]);

  const passportImage = imageMode === 'basic' ? (mediaImage || image || '/characters/mina.svg') : (image || '/characters/mina.svg');
  const japanese = language === 'ja';
  const english = language === 'en';
  const passportNo = sessionId ? `KCP-${sessionId.replaceAll('-', '').slice(0, 12).toUpperCase()}` : 'SESSION PENDING';
  const stamps = SCENES.slice(1).map((scene, idx) => ({scene, earned: step >= idx + 1}));
  return <div className="passport-shade" role="presentation" onClick={onClose}>
    <section className="passport-book" role="dialog" aria-modal="true" aria-label="K-CULTURE PASSPORT" onClick={e=>e.stopPropagation()}>
      <header><small>PROJECT CONTACT · K-CULTURE</small><button type="button" onClick={onClose} aria-label="Close">✕</button></header>
      <h2>K-CULTURE PASSPORT</h2><p className="passport-number">{passportNo}</p>
      <div className="passport-identity"><img src={passportImage} alt="Participant avatar"/><div><small>PARTICIPANT</small><strong>{nickname || 'GUEST'}</strong><small>{japanese ? '体験パスポート' : english ? 'Experience Passport' : '체험 여권'} · {language.toUpperCase()}</small></div></div>
      <p className="passport-progress">{japanese ? '体験進行率' : english ? 'Experience progress' : '체험 진행률'} <b>{Math.round(step / 8 * 100)}%</b></p>
      <div className="passport-progressbar"><div style={{width:`${step / 8 * 100}%`}} /></div>
      <div className="passport-stamps">{stamps.map(({scene,earned},idx)=><div className={earned ? 'stamp earned' : 'stamp'} key={scene}><span>{earned ? '✓' : String(idx+1).padStart(2,'0')}</span><small>{scene}</small></div>)}</div>
      <p className="passport-foot">{step === 8 ? 'MISSION COMPLETE · CERTIFICATE READY' : japanese ? '体験を進めるとスタンプが増えます。' : english ? 'Complete each stage to collect more stamps.' : '체험을 진행하면 스탬프가 쌓입니다.'}</p>
    </section>
  </div>;
}

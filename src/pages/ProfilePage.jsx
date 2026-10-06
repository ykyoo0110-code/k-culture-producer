import { useEffect, useMemo, useState } from 'react';
import Actions from '../components/Actions';
import { generatePromptCharacter, suggestCharacterPrompt, getAiStatus, saveCharacterProfile, uploadPhotoCharacter, getSceneMedia } from '../services/systemApi';

const DEFAULT_CHARACTERS = [
  { key: 'mina', image: '/characters/mina.svg' },
  { key: 'joon', image: '/characters/joon.svg' },
  { key: 'yuna', image: '/characters/yuna.svg' },
  { key: 'haru', image: '/characters/haru.svg' },
  { key: 'leo', image: '/characters/leo.svg' },
];

const MODES = [
  { key: 'basic', icon: '◉', titleKey: 'basicTitle', copyKey: 'basicCopy' },
  { key: 'prompt', icon: '✦', titleKey: 'promptTitle', copyKey: 'promptCopy' },
  { key: 'photo', icon: '◎', titleKey: 'photoTitle', copyKey: 'photoCopy' },
];

export default function ProfilePage({ t, language, sessionId, profile, artistName, artistCatalog = [], selectedArtistKey, onArtistChange, characterCatalog = [], onChange, onBack, onNext }) {
  const [error, setError] = useState('');
  const [previewModal, setPreviewModal] = useState(null);
  const [customBasicImages, setCustomBasicImages] = useState({});
  useEffect(() => {
    getSceneMedia('CHARACTERS').then(rows => {
      // 미디어 관리자가 지정한 기본 캐릭터 이미지가 있으면 기존 SVG보다 우선합니다.
      const images = {};
      rows.filter(row => row.kind === 'image').forEach(row => { if (!images[row.title]) images[row.title] = row.file_url; });
      setCustomBasicImages(images);
    }).catch(() => {});
  }, []);
  const [working, setWorking] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [aiStatus, setAiStatus] = useState({ loading: true, ready: false, model: '' });

  useEffect(() => {
    let alive = true;
    getAiStatus().then((data) => { if (alive) setAiStatus({ loading: false, ready: Boolean(data.image_ai), model: data.model || '' }); })
      .catch(() => { if (alive) setAiStatus({ loading: false, ready: false, model: '' }); });
    return () => { alive = false; };
  }, []);

  const labels = t.characterNames || ['MINA', 'JOON', 'YUNA', 'HARU', 'LEO'];
  const catalogByKey = useMemo(() => Object.fromEntries((characterCatalog || []).map(item => [item.key, item])), [characterCatalog]);
  const activeCharacters = useMemo(() => DEFAULT_CHARACTERS
    .filter(item => catalogByKey[item.key]?.active !== false)
    .sort((a,b) => (catalogByKey[a.key]?.sortOrder ?? 99) - (catalogByKey[b.key]?.sortOrder ?? 99)), [catalogByKey]);
  const selectedBasic = activeCharacters.find((item) => item.key === profile.characterKey) || activeCharacters[0] || DEFAULT_CHARACTERS[0];
  // 선택 상태를 그대로 읽어 미리보기만 갱신합니다. 생성·저장 로직은 유지합니다.
  const previewArtist = artistCatalog.find(item => item.key === selectedArtistKey);
  const previewImage = profile.imageMode === 'basic' ? (customBasicImages[selectedBasic.key] || profile.imageUrl || selectedBasic.image) : (profile.imageUrl || selectedBasic.image);

  const characterCards = useMemo(() => activeCharacters.map((item, index) => {
    const managed = catalogByKey[item.key] || {};
    return {
      ...item,
      image: customBasicImages[item.key] || item.image,
      label: managed.name || labels[index] || item.key.toUpperCase(),
      role: managed.role || '',
      description: managed.description || '',
    };
  }), [labels, customBasicImages, activeCharacters, catalogByKey]);

  const chooseMode = (mode) => {
    // 이미 선택된 모드를 다시 누를 때 생성된 이미지가 지워지지 않도록 합니다.
    if (mode === profile.imageMode) return;
    // 생성 방식 변경 시 이전 방식의 이미지/프롬프트/동의를 함께 초기화합니다.
    const changes = { imageMode: mode, promptText: '', promptGenerated: false,
      photoGenerated: false, consent: false, imageUrl: '', characterKey: 'mina' };
    if (mode === 'basic') changes.imageUrl = customBasicImages[selectedBasic.key] || selectedBasic.image;
    setPhotoFile(null);
    onChange(changes);
    setError('');
  };

  const chooseBasic = (item) => {
    onChange({ imageMode: 'basic', characterKey: item.key, imageUrl: customBasicImages[item.key] || item.image, promptText: '', promptGenerated: false, photoGenerated: false, consent: false });
    setError('');
  };

  const handlePromptGenerate = async () => {
    if (working) return;
    if (!profile.promptText?.trim()) {
      setError(t.errorPrompt);
      return;
    }
    setWorking(true);
    setError('');
    try {
      // 버튼 한 번으로 설명 정리와 이미지 생성을 순서대로 실행합니다.
      // 입력한 설명은 유지해 다음 수정 때도 그대로 편집할 수 있습니다.
      const suggestion = await suggestCharacterPrompt(profile.promptText.trim());
      if (!suggestion.prompt?.trim()) throw new Error('AI 프롬프트 작성에 실패했습니다.');
      const generated = await generatePromptCharacter({
        session_id: sessionId || null,
        nickname: profile.nickname || 'PARTICIPANT',
        language,
        prompt: suggestion.prompt.trim().slice(0, 600),
      });
      onChange({ imageMode: 'prompt', characterKey: generated.character_key, imageUrl: generated.image_url,
        promptGenerated: true, photoGenerated: false, consent: false });
    } catch (err) {
      // 생성 실패 시 기존 캐릭터를 지우지 않고 오류를 안내합니다.
      setError(err.message || 'AI 이미지 생성에 실패했습니다.');
    } finally {
      setWorking(false);
    }
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // 같은 파일도 다시 선택할 수 있게 합니다.
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(t.errorType);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(t.errorSize);
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      onChange({ imageMode: 'photo', imageUrl: reader.result, photoGenerated: false,
        promptText: '', promptGenerated: false, characterKey: 'mina' });
      setError('');
    };
    reader.readAsDataURL(file);
  };

  // 브라우저가 사진을 디코딩해 표준 JPEG로 재저장하면 확장자만 JPG인 파일도 구분할 수 있습니다.
  const normalizePhoto = async (file) => {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('이미지 변환을 시작할 수 없습니다.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob || !blob.size) throw new Error('사진을 JPG로 변환하지 못했습니다.');
      return new File([blob], 'character_photo.jpg', { type: 'image/jpeg' });
    } finally { URL.revokeObjectURL(objectUrl); }
  };

  const handlePhotoGenerate = async () => {
    if (!photoFile) {
      setError(language === 'ja' ? '먼저 사진을 올려주세요.' : language === 'en' ? 'Upload a photo first.' : '먼저 사진을 올려주세요.');
      return;
    }
    if (!profile.consent) {
      setError(t.errorRequired);
      return;
    }
    setWorking(true);
    setError('');
    try {
      const cleanFile = await normalizePhoto(photoFile);
      const uploaded = await uploadPhotoCharacter({ sessionId, nickname: profile.nickname, language, file: cleanFile });
      onChange({ imageMode: 'photo', imageUrl: uploaded.image_url, photoGenerated: true,
        promptText: '', promptGenerated: false, characterKey: 'mina' });
    } catch (err) {
      // 실패했을 때 기존 서버 기록을 다시 띄우지 않고 업로드한 사진 미리보기를 유지합니다.
      onChange({ imageMode: 'photo', photoGenerated: false });
      setError(err.message || '사진 변환에 실패했습니다.');
    } finally {
      setWorking(false);
    }
  };

  const isReady = Boolean(profile.nickname.trim())
    && Boolean(previewImage)
    && (profile.imageMode !== 'photo' || Boolean(profile.imageUrl && profile.consent && profile.photoGenerated))
    && (profile.imageMode !== 'prompt' || Boolean(profile.promptText?.trim() && profile.promptGenerated));

  const confirm = async () => {
    if (!isReady) {
      setError(t.errorRequired);
      return;
    }
    setWorking(true);
    setError('');
    try {
      let finalImage = profile.imageMode === 'basic' ? (customBasicImages[selectedBasic.key] || profile.imageUrl || selectedBasic.image) : (profile.imageUrl || selectedBasic.image);
      if (profile.imageMode === 'photo') {
        if (!profile.photoGenerated) {
          setError(language === 'ja' ? 'AI 캐릭터 만들기를 먼저 눌러주세요.' : language === 'en' ? 'Generate the AI character first.' : 'AI 캐릭터 만들기를 먼저 눌러주세요.');
          setWorking(false);
          return;
        }
      } else if (profile.imageMode !== 'prompt' || !profile.promptGenerated) {
        // 프롬프트로 생성된 캐릭터는 /api/characters/generate에서 이미 기록했습니다.
        try {
          await saveCharacterProfile({
            session_id: sessionId || null,
            nickname: profile.nickname,
            language,
            mode: profile.imageMode,
            character_key: profile.characterKey || selectedBasic.key,
            prompt: profile.promptText || '',
            image_url: finalImage,
          });
        } catch { /* FastAPI가 꺼져 있어도 체험은 계속합니다. */ }
      }
      onChange({ imageUrl: finalImage });
      onNext();
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="screen active profile-screen">
      <div className="section-heading"><p className="eyebrow">{t.eyebrow}</p><h2>{t.title}</h2><p>{t.description}</p></div>
      <div className="profile-layout">
        <div className="profile-form">
          <label className="field-label" htmlFor="producer-name">{t.nickname}</label>
          <input id="producer-name" className="text-input" value={profile.nickname} maxLength={20} placeholder={t.nicknamePlaceholder} onChange={(event) => onChange({ nickname: event.target.value })} />

          <div className="artist-select-panel">
            <p className="character-panel-title">{language === 'ja' ? '担当アーティストを選択' : language === 'en' ? 'Choose the artist' : '담당 연예인 선택'}</p>
            <div className="artist-select-grid">
              {(artistCatalog || []).map((artist) => (
                <button type="button" key={artist.key} className={`artist-select-card ${selectedArtistKey === artist.key ? 'selected' : ''}`} onClick={() => onArtistChange?.(artist.key)}>
                  <span className="select-image-shell">
                    {artist.imageUrl ? <img src={artist.imageUrl} alt={artist.name || artist.key} /> : <span className="artist-placeholder">★</span>}
                    {artist.imageUrl && <span role="button" tabIndex="0" className="image-zoom-trigger" onClick={(event)=>{event.stopPropagation();setPreviewModal({src:artist.imageUrl,title:artist.name||artist.key});}} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();setPreviewModal({src:artist.imageUrl,title:artist.name||artist.key});}}}>{language==='ja'?'拡大':language==='en'?'Preview':'크게 보기'}</span>}
                  </span>
                  <b>{artist.name || artist.key}</b>
                  <small>{artist.role?.[language] || artist.role?.ko || ''}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="profile-modes">
            {MODES.map((mode) => (
              <button type="button" key={mode.key} className={`profile-mode ${profile.imageMode === mode.key ? 'selected' : ''}`} onClick={() => chooseMode(mode.key)} disabled={working}>
                <span>{mode.icon}</span><b>{t[mode.titleKey]}</b><small>{t[mode.copyKey]}</small>
              </button>
            ))}
          </div>

          {profile.imageMode === 'basic' && (
            <div className="character-library">
              <p className="character-panel-title">{t.basicSelect}</p>
              <div className="character-grid">
                {characterCards.map((item) => (
                  <button type="button" key={item.key} className={`character-card ${profile.characterKey === item.key ? 'selected' : ''}`} onClick={() => chooseBasic(item)}>
                    <span className="select-image-shell"><img src={item.image} alt={item.label} onLoad={(event) => { const img=event.currentTarget; img.dataset.shape = img.naturalWidth > img.naturalHeight * 1.15 ? 'wide' : 'portrait'; }} /><span role="button" tabIndex="0" className="image-zoom-trigger" onClick={(event)=>{event.stopPropagation();setPreviewModal({src:item.image,title:item.label});}} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();setPreviewModal({src:item.image,title:item.label});}}}>{language==='ja'?'拡大':language==='en'?'Preview':'크게 보기'}</span></span><b>{item.label}</b>{item.role && <small>{item.role}</small>}
                  </button>
                ))}
              </div>
              <small>{t.basicReplaceNote}</small>
            </div>
          )}

          {profile.imageMode === 'prompt' && (
            <div className="character-panel">
              <label className="field-label" htmlFor="character-prompt">{t.promptLabel}</label>
              <textarea id="character-prompt" disabled={working} className="text-input character-prompt" value={profile.promptText || ''} maxLength={500} placeholder={t.promptPlaceholder} onChange={(event) => onChange({ promptText: event.target.value, promptGenerated: false, imageUrl: '' })} />
              <button type="button" className="character-generate" onClick={handlePromptGenerate} disabled={working}>{working ? t.working : language === 'ja' ? 'キャラクターを設定' : language === 'en' ? 'Set character' : '캐릭터 설정'}</button>
              <small>{language === 'ja' ? '説明を入力すると、AIが内容を整えて背景が透明なキャラクターを作成します。' : language === 'en' ? 'Enter a description. AI refines it and creates a character with a transparent background.' : '설명을 입력하면 AI가 내용을 정리하고 배경이 투명한 캐릭터를 만듭니다.'}</small>
            </div>
          )}

          {profile.imageMode === 'photo' && (
            <div className="upload-panel">
              <label className="upload-button" htmlFor="producer-photo">{t.upload}</label>
              <input id="producer-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} hidden />
              <label className="consent-row"><input type="checkbox" checked={profile.consent} onChange={(event) => onChange({ consent: event.target.checked })} /><span>{t.consent}</span></label>
              <button type="button" className="character-generate" onClick={handlePhotoGenerate} disabled={working || !photoFile || !profile.consent}>{working ? t.working : language === 'ja' ? 'AI 캐릭터로 만들기' : language === 'en' ? 'Create AI Character' : 'AI 캐릭터로 만들기'}</button>
              <small>{t.photoNote}</small>
            </div>
          )}

          <div className={`ai-status ${aiStatus.ready ? 'ready' : 'offline'}`}><b>IMAGE AI</b><span>{aiStatus.loading ? 'CHECKING...' : aiStatus.ready ? `READY · ${aiStatus.model}` : 'FASTAPI / OPENAI KEY REQUIRED'}</span></div>
          <p className="privacy-note">{t.privacy}</p>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>

        <aside className="producer-pass">
          <span className="pass-label">{t.pass}</span>
          <div className="pass-photo profile-pair-preview">
            <figure>{previewArtist?.imageUrl ? <img src={previewArtist.imageUrl} alt={previewArtist.name || artistName}/> : <span className="artist-placeholder">★</span>}<figcaption>{previewArtist?.name || artistName}</figcaption></figure>
            <figure><img src={previewImage} alt={profile.nickname || t.basicSelect}/><figcaption>{profile.nickname || characterCards.find(item=>item.key===selectedBasic.key)?.label || 'CHARACTER'}</figcaption></figure>
          </div>
          <div><small>NAME</small><strong>{profile.nickname || 'YOUR NAME'}</strong></div>
          <div><small>CHARACTER</small><strong>{profile.imageMode.toUpperCase()}</strong></div>
          <div><small>MISSION</small><strong>{artistName} FAN MEETING</strong></div>
          <div><small>ROLE</small><strong>{t.role}</strong></div>
        </aside>
      </div>
      {previewModal && <div className="character-preview-modal" role="dialog" aria-modal="true" aria-label={previewModal.title} onClick={()=>setPreviewModal(null)}>
        <div className="character-preview-dialog" onClick={event=>event.stopPropagation()}>
          <button type="button" className="character-preview-close" onClick={()=>setPreviewModal(null)} aria-label="Close">×</button>
          <img src={previewModal.src} alt={previewModal.title} />
          <strong>{previewModal.title}</strong>
        </div>
      </div>}
      <Actions backLabel={t.backLabel} nextLabel={working ? t.working : t.continue} onBack={onBack} onNext={confirm} disabled={!isReady || working} />
    </section>
  );
}

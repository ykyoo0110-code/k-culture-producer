// 개발 중에는 Vite /api 프록시를 사용해 5173/5174 포트 변화에 의한 CORS 충돌을 막습니다.
const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || '');

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === "string" ? data.detail : `API ${response.status}`);
  }
  return response.json();
}

export function createExperienceSession(payload) {
  return request('/api/sessions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
}

export function updateExperienceSession(id, payload) {
  return request(`/api/sessions/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
}

export function getConnectMessages(limit = 30) {
  return request(`/api/messages?limit=${limit}`);
}

export function createConnectMessage(payload) {
  return request('/api/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
}

export function createCertificate(payload) {
  return request('/api/certificates', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
}

export async function downloadCertificatePdf(certificateNo, profile = {}) {
  // PDF 생성 시 현재 선택한 캐릭터 정보를 함께 보내서
  // DB 저장 여부와 관계없이 확인증 안에 캐릭터가 들어가게 합니다.
  const response = await fetch(`${API_BASE_URL}/api/certificates/${certificateNo}/pdf-with-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: profile.imageUrl || '',
      character_key: profile.characterKey || 'mina',
    }),
  });
  if (!response.ok) throw new Error('certificate download failed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${certificateNo}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export function saveCharacterProfile(payload) {
  return request('/api/characters', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
}

export function generatePromptCharacter(payload) {
  return request('/api/characters/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
}

export async function uploadPhotoCharacter({ sessionId, nickname, language, file }) {
  const form = new FormData();
  if (sessionId) form.append('session_id', sessionId);
  form.append('nickname', nickname || 'PARTICIPANT');
  form.append('language', language || 'ja');
  form.append('file', file);
  const response = await fetch(`${API_BASE_URL}/api/characters/photo`, { method: 'POST', body: form });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === "string" ? data.detail : `API ${response.status}`);
  }
  return response.json();
}

export function getAiStatus() { return request('/api/ai/status'); }

export function getSceneMedia(scene) { return request(`/api/media/${scene}`); }

// 이미지 생성과 별개로 사용자 설명을 AI가 프롬프트로 정리합니다.
export function suggestCharacterPrompt(idea) {
  return request('/api/ai/character-prompt', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea }),
  });
}

export function getLatestCharacter(sessionId) {
  return request(`/api/characters/latest?session_id=${encodeURIComponent(sessionId)}`);
}

// PATCH20: 생성된 기념사진 한 장을 기념사진/동아일보 사옥 전광판에서 함께 사용합니다.
export function generateSouvenirPhoto(payload) {
  return request('/api/souvenir-photo', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
}

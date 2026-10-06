const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || '');

// FastAPI가 연결되면 사용자의 선택을 보내 AI 기사를 받아옵니다.
export async function generateAiArticle(payload) {
  const response = await fetch(`${API_BASE_URL}/api/ai/article`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('AI article generation failed');
  return response.json();
}

// 이미지 파일은 FormData로 보내며, API 키는 React가 아닌 FastAPI 서버에서 관리합니다.
export async function generateSouvenirImage({ photo, payload }) {
  const formData = new FormData();
  if (photo) formData.append('photo', photo);
  formData.append('payload', JSON.stringify(payload));
  const response = await fetch(`${API_BASE_URL}/api/ai/image`, { method: 'POST', body: formData });
  if (!response.ok) throw new Error('AI image generation failed');
  return response.json();
}

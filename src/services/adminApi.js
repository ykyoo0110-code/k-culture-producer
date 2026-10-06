// 관리자 API는 개발 중 Vite의 /api 프록시를 사용합니다.
// 다른 프론트엔드 서비스의 API 주소 설정은 바꾸지 않습니다.
const BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || '');

async function parseResponse(response) {
  const raw = await response.text();
  let payload;
  try { payload = raw ? JSON.parse(raw) : null; } catch { payload = null; }
  if (!response.ok) {
    const detail = payload?.detail;
    const message = typeof detail === 'string' ? detail :
      Array.isArray(detail) ? detail.map(item => item.msg || String(item)).join('; ') :
      raw.slice(0, 250) || '응답 내용 없음';
    throw new Error(`서버 응답 ${response.status}: ${message}`);
  }
  return payload;
}

async function apiFetch(path, options) {
  try {
    return await parseResponse(await fetch(`${BASE}${path}`, options));
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('백엔드에 연결되지 않았습니다. FastAPI(8000) 실행 상태와 React(5173) 터미널을 확인하세요.');
    }
    throw error;
  }
}

export function adminRequest(path, token, options = {}) {
  // FormData는 브라우저가 multipart boundary를 지정하도록 Content-Type을 생략합니다.
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };
  return apiFetch(path, { ...options, headers });
}

export function adminLogin(password) {
  return apiFetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}

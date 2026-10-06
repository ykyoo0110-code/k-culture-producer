// 3차 단계에서 FastAPI 주소를 연결할 자리입니다.
// 지금은 화면 기능만 완성하고, AI 연결 시 이 함수만 수정합니다.
export async function requestAiReport(payload) {
  const response = await fetch('/api/ai/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('AI 리포트를 불러오지 못했습니다.');
  }

  return response.json();
}

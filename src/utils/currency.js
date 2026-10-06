// 일본어 화면에서 프로젝트용 원화→엔화 표시를 통일합니다.
// 기본 기준: 1만원 = 100엔 (예: 35만원 → 3,500엔).
export function formatJapaneseCurrencyText(value, yenPerManWon = 100) {
  if (typeof value !== 'string') return value;
  const rate = Number(yenPerManWon) || 100;
  return value.replace(/(\d+(?:\.\d+)?)万ウォン/g, (_, manWon) => {
    const yen = Math.round(Number(manWon) * rate);
    return `${yen.toLocaleString('ja-JP')}円`;
  });
}

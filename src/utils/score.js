// 점수는 항상 0점에서 100점 사이로 표시합니다.
export const clamp = (value) => Math.max(0, Math.min(100, value));

export const formatTime = (minutes) => {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

export const formatMoney = (money, lang) =>
  new Intl.NumberFormat(lang === 'ja' ? 'ja-JP' : lang === 'en' ? 'en-US' : 'ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(money);

// 점수 객체를 직접 바꾸지 않고 새로운 객체를 만들어 React 상태 오류를 막습니다.
export const applyChanges = (state, changes = {}) => {
  const next = { ...state };
  Object.entries(changes).forEach(([key, value]) => {
    next[key] = (next[key] ?? 0) + value;
  });
  return next;
};

export function createResult(state, language) {
  const scores = ['fan', 'culture', 'safety', 'schedule', 'communication'].map((key) => clamp(state[key]));
  let total = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
  if (scores[2] < 50) total = Math.min(total, 69);

  const profiles = {
    ko: {
      growth: ['성장형 프로듀서', '현장의 즐거움보다 먼저 지켜야 할 운영 원칙을 다시 확인했습니다.'],
      safety: ['안전 중심 운영자', '행사의 즐거움과 함께 참가자의 안전을 가장 먼저 지켰습니다.'],
      culture: ['따뜻한 현장 해결사', '사람의 감정을 먼저 살피며 위기를 문화교류의 기회로 바꿨습니다.'],
      fan: ['에너지 메이커', '팬들의 에너지를 모아 기다림을 즐거운 참여로 바꿨습니다.'],
      communication: ['스마트 소통가', '정확한 정보와 빠른 안내로 불안한 현장을 안정시켰습니다.'],
    },
    ja: {
      growth: ['成長型プロデューサー', '現場の楽しさより先に守るべき運営原則を再確認しました。'],
      safety: ['安全重視の運営者', 'イベントの楽しさと参加者の安全を両立しました。'],
      culture: ['温かい現場の解決者', '人の気持ちを優先し、危機を文化交流の機会に変えました。'],
      fan: ['エネルギーメーカー', 'ファンのエネルギーを集め、待ち時間を楽しい参加時間に変えました。'],
      communication: ['スマートコミュニケーター', '正確な情報と素早い案内で不安な現場を安定させました。'],
    },
    en: {
      growth: ['Growth Producer', 'You reviewed the operating principles that come before entertainment.'],
      safety: ['Safety-first Producer', 'You protected participant safety while preserving the event experience.'],
      culture: ['Warm Field Solver', 'You turned a difficult moment into an opportunity for cultural connection.'],
      fan: ['Energy Maker', 'You turned waiting time into active participation with fan energy.'],
      communication: ['Smart Communicator', 'You stabilized the situation with accurate information and timely guidance.'],
    },
  };

  let key = 'growth';
  if (scores[2] >= 90) key = 'safety';
  else if (scores[1] >= 85) key = 'culture';
  else if (scores[0] >= 88) key = 'fan';
  else if (scores[4] >= 85) key = 'communication';

  return { scores, total, type: profiles[language][key][0], copy: profiles[language][key][1] };
}

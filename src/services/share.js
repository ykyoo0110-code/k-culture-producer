// 기사 내용을 UTF-8 텍스트 파일로 내려받습니다.
export function downloadArticle(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// 모바일에서는 기본 공유창을 열고, 지원하지 않는 환경에서는 링크를 복사합니다.
export async function shareResult({ title, text }) {
  const data = { title, text, url: window.location.href };
  if (navigator.share) {
    await navigator.share(data);
    return 'shared';
  }
  await navigator.clipboard.writeText(window.location.href);
  return 'copied';
}

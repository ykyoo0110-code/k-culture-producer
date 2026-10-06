// 실제 AI API를 연결하기 전에도 전체 결과 흐름을 시험할 수 있는 기사 생성 함수입니다.
export function createArticle({ language, nickname, programLabel, decisionLabels, result }) {
  if (language === 'ja') {
    return {
      title: `20分の遅延をチャンスに変えた…${nickname}プロデューサーの現場判断`,
      lead: `${nickname}プロデューサーは、KKUGIのファンミーティングで突然発生した遅延を参加型プログラムへ切り替え、ファン体験を守った。`,
      paragraphs: [
        `最初に選んだプログラムは「${programLabel}」だった。待ち時間を単なる待機にせず、ファンが直接参加できる時間へ変えた。`,
        `現場では「${decisionLabels[1] ?? '安全を優先した対応'}」を選択した。楽しさだけでなく、安全と信頼を守る判断だった。`,
        `最後に「${decisionLabels[2] ?? '進行時間の調整'}」を決定し、ファン満足度${result.scores[0]}点、安全性${result.scores[2]}点でイベントを終えた。`,
      ],
      quote: `「ファンの時間と安全を同時に守ることがプロデューサーの役割です」`,
    };
  }

  if (language === 'en') {
    return {
      title: `Turning a 20-minute delay into an opportunity… ${nickname}'s on-site decisions`,
      lead: `${nickname} transformed an unexpected delay at the KKUGI fan meeting into a participatory program and protected the fan experience.`,
      paragraphs: [
        `The first program selected was “${programLabel}.” Instead of leaving fans to simply wait, the delay became time for direct participation.`,
        `On site, the response “${decisionLabels[1] ?? 'prioritize safety'}” was chosen. It was a decision to protect both enjoyment and trust.`,
        `Finally, “${decisionLabels[2] ?? 'adjust the operating schedule'}” was selected, ending the event with fan satisfaction ${result.scores[0]} and safety ${result.scores[2]}.`,
      ],
      quote: '“A producer’s role is to protect both the fans’ time and their safety.”',
    };
  }

  return {
    title: `20분 지연을 기회로 바꿨다…${nickname} 프로듀서의 현장 판단`,
    lead: `${nickname} 프로듀서는 KKUGI 팬미팅에서 갑작스럽게 발생한 공연 지연을 참여형 프로그램으로 전환해 팬 경험을 지켰다.`,
    paragraphs: [
      `첫 번째로 선택한 프로그램은 ‘${programLabel}’였다. 기다리는 시간을 단순한 대기가 아니라 팬이 직접 참여하는 시간으로 바꿨다.`,
      `현장에서는 ‘${decisionLabels[1] ?? '안전을 우선한 대응'}’을 선택했다. 즐거움뿐 아니라 안전과 신뢰를 지키기 위한 판단이었다.`,
      `마지막으로 ‘${decisionLabels[2] ?? '운영 시간 조정'}’을 결정해 팬 만족도 ${result.scores[0]}점, 안전성 ${result.scores[2]}점으로 행사를 마무리했다.`,
    ],
    quote: '“팬의 시간과 안전을 함께 지키는 것이 프로듀서의 역할입니다.”',
  };
}

export function articleToText(article, disclaimer) {
  return [article.title, '', article.lead, '', ...article.paragraphs.flatMap((paragraph) => [paragraph, '']), article.quote, '', disclaimer].join('\n');
}

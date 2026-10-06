const STORAGE_KEY = 'k-culture-producer-admin-settings';

// 관리자 화면을 처음 열었을 때 사용하는 기본값입니다.
export const defaultAdminSettings = {
  logoMark: 'K',
  logoName: 'K-CULTURE PRODUCER',
  logoSubtitle: 'AI INTERACTIVE PROJECT',
  logoSideText: 'DONG-A ILBO · K-CULTURE EXPERIENCE',
  logoGap: 14,
  logoImageUrl: '',
  // 기본 메인 영상: 사용자가 직접 캡처한 동아일보 기사 영상. 관리자 INTRO 업로드 시 교체됩니다.
  introVideoUrl: '/videos/KCULTURE_HOME_DEMO.mp4',
  introPosterUrl: '',
  // 운영안 화면의 선택형 배경 영상. 비어 있으면 기존 정적 화면을 그대로 사용합니다.
  // STEP 03 조건설정 / STEP 04 운영안 배경 영상
  setupBackgroundVideoUrl: '',
  planBackgroundVideoUrl: '',
  // CONNECT WALL 사옥 배경을 정지 이미지 대신 루프 영상으로 교체할 수 있습니다.
  billboardBackgroundVideoUrl: '',
  articleImageUrl: '/images/article-reference.png',
  articleUrl: 'https://www.donga.com/news/Economy/article/all/20260526/133995102/2',
  // 메인 기사 영상 위/아래에 표시되는 기사 정보도 관리자에서 바꿀 수 있습니다.
  articleCopy: {
    ko: { source:'동아일보 · 경제', headline:'K콘텐츠 성공은 인프라-생태계 구축 결과', detail:'동아일보 기사에서 출발한 참여형 K-CULTURE 프로젝트', open:'기사 원문 보기' },
    ja: { source:'東亜日報 · 経済', headline:'Kコンテンツの成功はインフラと生態系の成果', detail:'東亜日報の記事から始まる参加型K-CULTUREプロジェクト', open:'記事を読む' },
    en: { source:'DONG-A ILBO · ECONOMY', headline:'K-content success reflects a strong cultural ecosystem', detail:'An interactive K-CULTURE experience inspired by Dong-A Ilbo reporting', open:'Read the original article' },
  },
  introFontSize: 100,
  introAlign: 'left',
  fanDefault: 100,
  fanLimit: 300,
  delayMinutes: 20,
  // 일본어 금액 표시용 환산값: 1만원당 엔화 표시값 (기본 100엔)
  yenPerManWon: 100,
  planNotes: { ko: '팬 규모와 행사 분위기를 고려하여 안내·안전 동선을 조정합니다.', ja: 'ファンの規模と公演の雰囲気に合わせて案内と安全動線を調整します。', en: 'The schedule adapts to audience size and event atmosphere.' },
  incidentCopy: { ko: '현재 시각은 16시 25분입니다. 귀국 항공편과 막차를 고려해 대기 시간을 관리하세요.', ja: '現在16時25分です。帰国便と終電に配慮して待機時間を調整してください。', en: 'It is 16:25. Consider return flights and last trains while managing the delay.' },
  sceneNotes: { ai: {ko:'AI 안내와 팬 퀴즈로 참여를 이어갑니다.',ja:'AI案内とファンクイズで参加をつなげます。',en:'AI guidance and fan quizzes keep guests engaged.'},wait:{ko:'정확한 지연 시간을 알리고 편안한 대기 공간을 제공합니다.',ja:'遅延時間を伝え、快適な待機場所を提供します。',en:'Share the delay and offer a comfortable waiting area.'} },
  // 사용자 화면에 보이는 현재 프로그램 문구를 관리자에서 그대로 불러와 수정할 수 있게 기본값으로 저장합니다.
  programOverrides: {
    kimchi:{
      ko:{label:'김치 만들기 미니 체험',meta:'30분 · 35만원 · 문화교류 중심',title:'기다림을 문화체험으로 바꿨습니다',copy:'일본인 팬들은 작은 테이블에서 직접 김치를 만들며 한국의 식문화를 경험합니다.'},
      ja:{label:'キムチ作りミニ体験',meta:'30分 · 35万ウォン · 文化交流型',title:'待ち時間を文化体験に変えました',copy:'日本人ファンは小さなテーブルでキムチを作りながら、韓国の食文化を体験します。'},
      en:{label:'Mini kimchi-making experience',meta:'30 min · ₩350,000 · cultural exchange',title:'You turned waiting time into a cultural experience',copy:'Fans make kimchi at small tables and experience Korean food culture together.'},
    },
    dance:{
      ko:{label:'K-POP 포인트 댄스',meta:'25분 · 25만원 · 참여 중심',title:'팬의 에너지로 무대를 먼저 열었습니다',copy:'누구나 따라 할 수 있는 쉬운 후렴 동작과 앉아서 하는 응원 동작을 함께 진행합니다.'},
      ja:{label:'K-POPポイントダンス',meta:'25分 · 25万ウォン · 参加型',title:'ファンのエネルギーでステージを先に開きました',copy:'誰でもまねできる簡単なサビの動きと、座ったままできる応援動作を行います。'},
      en:{label:'K-POP point dance',meta:'25 min · ₩250,000 · participation',title:'You opened the stage with fan energy',copy:'Fans learn an easy chorus move and a seated cheering routine anyone can join.'},
    },
    ai:{
      ko:{label:'AI 메시지와 팬 퀴즈',meta:'20분 · 5만원 · 소통 중심',title:'빠른 소통으로 불안을 줄였습니다',copy:'일본어 안내와 팬 퀴즈로 대기시간을 짧은 참여 시간으로 바꿉니다.'},
      ja:{label:'AIメッセージ＆ファンクイズ',meta:'20分 · 5万ウォン · 交流型',title:'素早い案内で不安を減らしました',copy:'日本語での案内とファンクイズで、待ち時間を参加の時間に変えます。'},
      en:{label:'AI message & fan quiz',meta:'20 min · ₩50,000 · communication',title:'Fast communication reduced uncertainty',copy:'Multilingual guidance and a fan quiz turn waiting time into participation time.'},
    },
    wait:{
      ko:{label:'지연 안내 후 자유 대기',meta:'40분 · 비용 없음 · 불만 위험',title:'예산은 지켰지만 팬 경험이 흔들립니다',copy:'정확한 지연 안내는 했지만 참여 프로그램이 없어 대기 피로와 불만이 커집니다.'},
      ja:{label:'遅延案内後に自由待機',meta:'40分 · 費用なし · 不満リスク',title:'予算は守りましたが、ファン体験が低下します',copy:'正確な遅延案内はしましたが、参加プログラムがなく待機疲れと不満が高まります。'},
      en:{label:'Free waiting after delay notice',meta:'40 min · no cost · complaint risk',title:'You saved budget, but the fan experience weakened',copy:'The delay was explained accurately, but without an activity, fatigue and frustration increase.'},
    },
  },
  incidentOverrides: {
    kimchi:{ko:{media:'알레르기 확인',title:'새우젓 알레르기',emphasis:'참가자가 확인됐습니다',copy:'문화체험보다 안전이 먼저입니다. 다른 참가자와 분리되지 않으면서 안전하게 참여할 방법을 선택하세요.'},ja:{media:'アレルギー確認',title:'アミの塩辛アレルギーの',emphasis:'参加者が確認されました',copy:'文化体験より安全が優先です。ほかの参加者から孤立せず、安全に参加できる方法を選んでください。'},en:{media:'Allergy check',title:'A participant has a shrimp-paste allergy',emphasis:'Safety comes first',copy:'Choose a way for the participant to join safely without being isolated from the group.'}},
    dance:{ko:{media:'발목 통증과 안전 대응',title:'참가자가 춤을 추다',emphasis:'발목 통증을 호소합니다',copy:'분위기를 유지하는 것보다 참가자의 상태 확인과 안전 기록이 먼저입니다.'},ja:{media:'足首の痛みと安全対応',title:'ダンス中の参加者が',emphasis:'足首の痛みを訴えています',copy:'雰囲気を保つことより、参加者の状態確認と安全記録が優先です。'},en:{media:'Ankle pain & safety response',title:'A participant reports ankle pain',emphasis:'during the dance activity',copy:'Checking the participant’s condition and documenting safety comes before keeping the mood going.'}},
    ai:{ko:{media:'AI 메시지 진위 확인',title:'팬들이 AI 메시지가',emphasis:'실제 발언인지 묻습니다',copy:'생성된 메시지와 실제 아티스트 발언을 분명하게 구분해 신뢰를 지켜야 합니다.'},ja:{media:'AIメッセージの確認',title:'ファンがAIメッセージを',emphasis:'本人の発言か尋ねています',copy:'生成メッセージと実際の発言を明確に区別し、信頼を守る必要があります。'},en:{media:'AI message verification',title:'Fans ask whether the AI message',emphasis:'was really said by the artist',copy:'Clearly distinguish generated messages from real artist statements to maintain trust.'}},
    wait:{ko:{media:'대기 불만 확산',title:'대기 중인 팬의 불만이',emphasis:'SNS에 올라오기 시작합니다',copy:'늦은 공지보다 지금이라도 정확한 상황과 예상 시간을 안내하는 것이 중요합니다.'},ja:{media:'待機への不満が拡散',title:'待機中のファンの不満が',emphasis:'SNSに投稿され始めました',copy:'遅い案内でも、今から正確な状況と開始予定時刻を伝えることが重要です。'},en:{media:'Waiting complaints spread',title:'Fans begin posting complaints',emphasis:'on social media',copy:'Even if the update is late, accurate information and an expected start time should be shared now.'}},
  },
  // 돌발상황 선택지까지 CMS에서 수정할 수 있게 기본 문구를 저장합니다.
  incidentOptionOverrides: {
    kimchi:{
      ko:[['비건 양념을 별도로 제공','안전 +18 · 배려 +15','비건 양념을 분리 제공'],['주먹밥 만들기로 변경','안전 +15 · 일정 -4','주먹밥 체험으로 변경'],['체험을 관람하도록 안내','안전 +8 · 만족 -12','알레르기 참가자는 관람'],['안내만 하고 계속 진행','안전 -25 · 만족 -10','알레르기 안내만 하고 진행']],
      ja:[['植物性の調味料を別に用意','安全 +18 · 配慮 +15','植物性調味料を別に提供'],['おにぎり作りに変更','安全 +15 · 進行 -4','おにぎり体験に変更'],['体験を見学してもらう','安全 +8 · 満足 -12','アレルギー参加者は見学'],['案内だけして続行','安全 -25 · 満足 -10','アレルギー案内のみで続行']],
      en:[['Provide a separate vegan seasoning','Safety +18 · Care +15','Provide vegan seasoning separately'],['Switch to rice-ball making','Safety +15 · Schedule -4','Switch to a rice-ball activity'],['Ask the participant to observe','Safety +8 · Satisfaction -12','Participant observes the activity'],['Give a warning and continue','Safety -25 · Satisfaction -10','Continue after only giving a warning']],
    },
    dance:{
      ko:[['체험을 멈추고 안전요원 호출','안전 +20 · 일정 -5','체험 중단 후 안전요원 호출'],['앉아서 하는 응원 동작으로 변경','안전 +15 · 참여 +10','앉은 응원 동작으로 전환'],['해당 참가자만 쉬도록 안내','안전 +6 · 만족 -5','해당 참가자만 휴식'],['괜찮다고 하면 계속 진행','안전 -25 · 운영 -15','본인 의사만 확인 후 진행']],
      ja:[['体験を止めて安全担当を呼ぶ','安全 +20 · 進行 -5','体験を中断し安全担当を要請'],['座ってできる応援動作に変更','安全 +15 · 参加 +10','座った応援動作へ変更'],['該当者だけ休んでもらう','安全 +6 · 満足 -5','該当者のみ休憩'],['本人が大丈夫なら続行','安全 -25 · 運営 -15','本人の意思だけ確認して続行']],
      en:[['Stop the activity and call safety staff','Safety +20 · Schedule -5','Stop and call safety staff'],['Switch to seated cheering moves','Safety +15 · Participation +10','Switch to seated cheering'],['Ask only that participant to rest','Safety +6 · Satisfaction -5','Only the participant rests'],['Continue if they say they are fine','Safety -25 · Operation -15','Continue based only on self-report']],
    },
    ai:{
      ko:[['AI 생성 메시지임을 즉시 표시','소통 +18 · 신뢰 +10','AI 생성 사실을 명확히 표시'],['MC가 직접 제작 과정을 설명','소통 +14 · 일정 -3','MC가 제작 과정을 설명'],['질문을 받지 않고 다음 순서 진행','소통 -10','질문 없이 다음 순서 진행'],['실제 메시지처럼 계속 소개','신뢰 -25','실제 메시지처럼 계속 소개']],
      ja:[['AI生成メッセージと明示','交流 +18 · 信頼 +10','AI生成であることを明示'],['MCが制作過程を説明','交流 +14 · 進行 -3','MCが制作過程を説明'],['質問を受けず次へ進行','交流 -10','質問を受けず次へ進行'],['本人のメッセージとして紹介','信頼 -25','本人の発言として紹介']],
      en:[['Immediately label it as AI-generated','Communication +18 · Trust +10','Clearly label the AI-generated message'],['Have the MC explain how it was made','Communication +14 · Schedule -3','MC explains the creation process'],['Take no questions and move on','Communication -10','Move on without questions'],['Keep presenting it as a real message','Trust -25','Present it as if it were real']],
    },
    wait:{
      ko:[['일본어 현장 공지와 개별 안내','소통 +18 · 만족 +8','일본어 현장 공지 실시'],['음료와 좌석을 추가 제공','만족 +12 · 예산 사용','대기 편의 제공'],['공연 시작 후 사과','소통 -8','공연 시작 후 사과'],['SNS 게시물 삭제 요청','신뢰 -20','SNS 게시물 삭제 요청']],
      ja:[['日本語の会場案内と個別対応','交流 +18 · 満足 +8','日本語で会場案内を実施'],['飲み物と座席を追加提供','満足 +12 · 予算使用','待機中の利便性を提供'],['公演開始後に謝罪','交流 -8','公演開始後に謝罪'],['SNS投稿の削除を依頼','信頼 -20','SNS投稿の削除を依頼']],
      en:[['Make an English/Japanese venue announcement','Communication +18 · Satisfaction +8','Provide multilingual venue guidance'],['Provide additional drinks and seats','Satisfaction +12 · Uses budget','Improve waiting comfort'],['Apologize after the show starts','Communication -8','Apologize after the show starts'],['Ask fans to delete social posts','Trust -20','Request deletion of social posts']],
    },
  },
  screenCopy: { profileKo: '', profileJa: '', profileEn: '', setupKo: '', setupJa: '', setupEn: '' },
  artistName: 'KKUGI',
  artistRoleKo: '가수 겸 배우',
  artistRoleJa: '歌手・俳優',
  defaultArtistKey: 'kkugi',
  artistCatalog: [
    {
      key: 'kkugi', name: 'KKUGI', active: true, sortOrder: 1,
      role: { ko:'가수 겸 배우', ja:'歌手・俳優', en:'Singer & Actor' },
      description: { ko:'기본 팬미팅 아티스트', ja:'基本ファンミーティングアーティスト', en:'Default fan-meeting artist' },
      imageUrl: '/images/V07_KKUGI_arrival.png', relatedVideo1Url: '', relatedVideo2Url: '', arrivalVideoUrl: '/videos/V07_KKUGI_arrival.mp4', resultVideoUrl: '/videos/V08_fanmeeting_success.mp4',
      arrivalTitle: { ko:'KKUGI가 도착했습니다', ja:'KKUGIが到着しました', en:'KKUGI has arrived' },
      arrivalCopy: { ko:'남은 시간과 팬의 귀가 일정을 고려해 마지막 프로그램을 조정하세요.', ja:'残り時間とファンの帰宅予定を考慮して、最後のプログラムを調整してください。', en:'Adjust the final program while considering the remaining time and fans’ travel schedules.' },
    },
    { key:'female-a',name:'HANA',active:true,sortOrder:2,role:{ko:'가수',ja:'歌手',en:'Singer'},description:{ko:'밝고 우아한 여성 아티스트',ja:'明るく上品な女性アーティスト',en:'Bright and elegant female artist'},imageUrl:'/artists/female_a.png',relatedVideo1Url:'',relatedVideo2Url:'',arrivalVideoUrl:'',resultVideoUrl:'',arrivalTitle:{ko:'HANA가 도착했습니다',ja:'HANAが到着しました',en:'HANA has arrived'},arrivalCopy:{ko:'남은 시간을 확인하고 마지막 프로그램을 준비하세요.',ja:'残り時間を確認し最後のプログラムを準備してください。',en:'Check the remaining time and prepare the final program.'}},
    { key:'female-b',name:'RINA',active:true,sortOrder:3,role:{ko:'아이돌',ja:'アイドル',en:'Idol'},description:{ko:'활기찬 여성 아이돌 아티스트',ja:'元気な女性アイドルアーティスト',en:'Energetic female idol artist'},imageUrl:'/artists/female_b.png',relatedVideo1Url:'',relatedVideo2Url:'',arrivalVideoUrl:'',resultVideoUrl:'',arrivalTitle:{ko:'RINA가 도착했습니다',ja:'RINAが到着しました',en:'RINA has arrived'},arrivalCopy:{ko:'팬들의 대기 상황을 확인하고 마지막 순서를 조정하세요.',ja:'ファンの待機状況を確認し最後の進行を調整してください。',en:'Check the waiting situation and adjust the final sequence.'}},
    { key:'male-a',name:'JUN',active:true,sortOrder:4,role:{ko:'가수 겸 배우',ja:'歌手・俳優',en:'Singer & Actor'},description:{ko:'친근하고 부드러운 남성 아티스트',ja:'親しみやすい男性アーティスト',en:'Friendly male singer and actor'},imageUrl:'/artists/male_a.png',relatedVideo1Url:'',relatedVideo2Url:'',arrivalVideoUrl:'',resultVideoUrl:'',arrivalTitle:{ko:'JUN이 도착했습니다',ja:'JUNが到着しました',en:'JUN has arrived'},arrivalCopy:{ko:'남은 시간에 맞춰 마지막 프로그램을 확정하세요.',ja:'残り時間に合わせて最後のプログラムを確定してください。',en:'Confirm the final program for the remaining time.'}},
  ],
  stageCatalog: [
    { key:'stage-main', name:'MAIN STAGE', imageUrl:'/images/fanmeeting-stage.png', active:true, sortOrder:1 },
  ],
  defaultStageKey: 'stage-main',
  tickerDurationSeconds: 34,
  planVariants: [
    {
      key:'small', label:'소규모 팬미팅 운영안', minFans:1, maxFans:80,
      schedule:{
        ko:[{time:'10:00',title:'무대·음향 점검',copy:'소규모 동선에 맞춰 핵심 장비를 점검합니다.'},{time:'12:00',title:'아티스트 리허설',copy:'MC·통역·아티스트 동선을 짧게 맞춥니다.'},{time:'14:00',title:'로비 오픈',copy:'본인 확인과 입장 대기를 한 줄로 운영합니다.'},{time:'15:20',title:'객석 입장',copy:'촬영 규정과 안전 안내를 진행합니다.'},{time:'16:00',title:'팬미팅 시작',copy:'토크·참여 프로그램·라이브를 진행합니다.'},{time:'17:40',title:'포토·배웅',copy:'소규모 장점을 살려 교류 시간을 확보합니다.'}],
        ja:[{time:'10:00',title:'ステージ・音響チェック',copy:'小規模動線に合わせて主要機器を確認します。'},{time:'12:00',title:'アーティストリハーサル',copy:'MC・通訳・アーティストの動線を確認します。'},{time:'14:00',title:'ロビーオープン',copy:'本人確認と入場待機をシンプルに運営します。'},{time:'15:20',title:'客席入場',copy:'撮影ルールと安全案内を行います。'},{time:'16:00',title:'ファンミーティング開始',copy:'トーク・参加プログラム・ライブを進行します。'},{time:'17:40',title:'フォト・お見送り',copy:'小規模ならではの交流時間を確保します。'}],
        en:[{time:'10:00',title:'Stage & sound check',copy:'Check core equipment for a small audience flow.'},{time:'12:00',title:'Artist rehearsal',copy:'Align artist, MC, and interpreter movement.'},{time:'14:00',title:'Lobby open',copy:'Run a simple identity-check and entry queue.'},{time:'15:20',title:'Audience entry',copy:'Explain filming rules and safety.'},{time:'16:00',title:'Fan meeting starts',copy:'Run talk, participation program, and live stage.'},{time:'17:40',title:'Photo & farewell',copy:'Use the smaller scale for closer interaction.'}],
      },
    },
    {
      key:'standard', label:'표준 팬미팅 운영안', minFans:81, maxFans:180,
      schedule:{
        ko:[{time:'09:00',title:'전체 셋업·기술 점검',copy:'무대·음향·조명·자막 시스템을 점검합니다.'},{time:'11:30',title:'큐 투 큐 리허설',copy:'아티스트·MC·통역·스태프 큐를 확인합니다.'},{time:'13:30',title:'로비 오픈',copy:'본인 확인·MD 판매·대기열을 구역별로 운영합니다.'},{time:'15:20',title:'객석 입장',copy:'좌석 안내와 안전 공지를 진행합니다.'},{time:'16:30',title:'본 공연',copy:'오프닝·팬 토크·체험·라이브를 운영합니다.'},{time:'18:30',title:'포토·배웅회',copy:'교류 시간과 귀가 동선을 함께 관리합니다.'}],
        ja:[{time:'09:00',title:'全体設営・技術チェック',copy:'ステージ・音響・照明・字幕システムを確認します。'},{time:'11:30',title:'キュー・トゥ・キュー',copy:'アーティスト・MC・通訳・スタッフのキューを確認します。'},{time:'13:30',title:'ロビーオープン',copy:'本人確認・MD販売・待機列をエリア別に運営します。'},{time:'15:20',title:'客席入場',copy:'座席案内と安全告知を行います。'},{time:'16:30',title:'本公演',copy:'オープニング・トーク・体験・ライブを運営します。'},{time:'18:30',title:'フォト・お見送り会',copy:'交流時間と帰宅動線を管理します。'}],
        en:[{time:'09:00',title:'Full setup & technical check',copy:'Check stage, sound, lighting, and subtitle systems.'},{time:'11:30',title:'Cue-to-cue rehearsal',copy:'Confirm artist, MC, interpreter, and staff cues.'},{time:'13:30',title:'Lobby open',copy:'Run identity check, merchandise, and zoned queues.'},{time:'15:20',title:'Audience entry',copy:'Provide seating and safety guidance.'},{time:'16:30',title:'Main show',copy:'Run opening, fan talk, activity, and live stage.'},{time:'18:30',title:'Photo & farewell',copy:'Manage interaction time and departure flow.'}],
      },
    },
    {
      key:'large', label:'대규모 팬미팅 운영안', minFans:181, maxFans:300,
      schedule:{
        ko:[{time:'08:00',title:'대형 무대 셋업',copy:'무대·음향·조명·스크린과 안전 펜스를 점검합니다.'},{time:'10:30',title:'전체 스태프 리허설',copy:'구역별 스태프와 비상 동선을 포함해 리허설합니다.'},{time:'12:30',title:'로비·MD 사전 오픈',copy:'대기열을 여러 구역으로 나누고 안내 인력을 배치합니다.'},{time:'14:40',title:'순차 객석 입장',copy:'구역별 입장과 혼잡도 관리를 진행합니다.'},{time:'16:30',title:'본 공연',copy:'대규모 관객 기준으로 프로그램 전환 시간을 확보합니다.'},{time:'18:40',title:'분산 퇴장·배웅',copy:'막차·귀국 일정을 고려해 구역별 순차 퇴장을 운영합니다.'}],
        ja:[{time:'08:00',title:'大型ステージ設営',copy:'ステージ・音響・照明・スクリーン・安全フェンスを確認します。'},{time:'10:30',title:'全スタッフリハーサル',copy:'エリア別スタッフと非常動線を含めて確認します。'},{time:'12:30',title:'ロビー・MD先行オープン',copy:'待機列を複数エリアに分け案内スタッフを配置します。'},{time:'14:40',title:'順次客席入場',copy:'エリア別入場と混雑管理を行います。'},{time:'16:30',title:'本公演',copy:'大規模観客向けにプログラム転換時間を確保します。'},{time:'18:40',title:'分散退場・お見送り',copy:'終電・帰国予定を考慮して順次退場を運営します。'}],
        en:[{time:'08:00',title:'Large-stage setup',copy:'Check stage, sound, lighting, screens, and safety barriers.'},{time:'10:30',title:'Full staff rehearsal',copy:'Rehearse zoned staffing and emergency movement.'},{time:'12:30',title:'Early lobby & MD open',copy:'Split queues into zones and assign guidance staff.'},{time:'14:40',title:'Phased audience entry',copy:'Control entry and congestion by zone.'},{time:'16:30',title:'Main show',copy:'Allow extra transition time for a large audience.'},{time:'18:40',title:'Phased exit & farewell',copy:'Manage zoned exits around last trains and travel plans.'}],
      },
    },
  ],
  // 04 운영안의 실제 타임라인을 언어별로 관리자에서 수정합니다.
  scheduleItems: {
    ko:[
      {time:'08:00',title:'셋업과 기술 점검',copy:'무대·음향·조명·일본어 자막 점검'},
      {time:'11:00',title:'큐 투 큐 리허설',copy:'아티스트·MC·통역 동선 확인'},
      {time:'13:00',title:'로비 오픈',copy:'본인 확인·MD 판매·대기열 분산'},
      {time:'15:30',title:'객석 입장',copy:'촬영 규정·시야 제한·안전 안내'},
      {time:'16:30',title:'본 공연',copy:'오프닝·팬 토크·체험·라이브'},
      {time:'18:30',title:'배웅회',copy:'접촉 시간·막차·귀국 일정 관리'},
    ],
    ja:[
      {time:'08:00',title:'設営・技術チェック',copy:'ステージ・音響・照明・日本語字幕を確認'},
      {time:'11:00',title:'通しリハーサル',copy:'アーティスト・MC・通訳の動線を確認'},
      {time:'13:00',title:'ロビーオープン',copy:'本人確認・MD販売・待機列の分散'},
      {time:'15:30',title:'客席入場',copy:'撮影ルール・見切れ席・安全案内'},
      {time:'16:30',title:'本公演',copy:'オープニング・トーク・体験・ライブ'},
      {time:'18:30',title:'お見送り会',copy:'交流時間・終電・帰国日程を管理'},
    ],
    en:[
      {time:'08:00',title:'Setup & technical check',copy:'Check stage, sound, lighting, and subtitles'},
      {time:'11:00',title:'Cue-to-cue rehearsal',copy:'Check artist, MC, and interpreter movement'},
      {time:'13:00',title:'Lobby open',copy:'Identity check, merchandise, and queue control'},
      {time:'15:30',title:'Audience entry',copy:'Explain filming rules, sightlines, and safety'},
      {time:'16:30',title:'Main show',copy:'Opening, fan talk, activity, and live stage'},
      {time:'18:30',title:'Farewell session',copy:'Manage interaction time and travel schedules'},
    ],
  },
  // 화면별 배경음악과 AI 안내 음성을 관리자에서 관리합니다. 브라우저 자동재생 제한을 고려해 사용자가 체험을 시작한 뒤 재생합니다.
  audioScenes: {
    intro:{bgmUrl:'',bgmVolume:35,bgmLoop:true,aiEnabled:false,aiAudioUrl:'',aiDelayMs:800,aiCopy:{ko:'오늘 하루 K-CULTURE PRODUCER가 되어보세요.',ja:'今日一日、K-CULTURE PRODUCERになってみましょう。',en:'Become the K-CULTURE PRODUCER for a day.'}},
    profile:{bgmUrl:'',bgmVolume:28,bgmLoop:true,aiEnabled:false,aiAudioUrl:'',aiDelayMs:700,aiCopy:{ko:'함께할 연예인과 나의 캐릭터를 선택해 주세요.',ja:'一緒に進むアーティストと自分のキャラクターを選んでください。',en:'Choose your artist and your producer character.'}},
    setup:{bgmUrl:'',bgmVolume:28,bgmLoop:true,aiEnabled:false,aiAudioUrl:'',aiDelayMs:700,aiCopy:{ko:'팬미팅 조건을 선택해 주세요.',ja:'ファンミーティングの条件を選んでください。',en:'Choose the fan meeting conditions.'}},
    plan:{bgmUrl:'',bgmVolume:28,bgmLoop:true,aiEnabled:false,aiAudioUrl:'',aiDelayMs:700,aiCopy:{ko:'인원과 조건에 맞춘 운영안을 확인해 주세요.',ja:'人数と条件に合わせた運営プランを確認してください。',en:'Review the operating plan for your audience and conditions.'}},
    delay:{bgmUrl:'',bgmVolume:35,bgmLoop:true,aiEnabled:false,aiAudioUrl:'',aiDelayMs:1000,aiCopy:{ko:'',ja:'',en:''}},
    program:{bgmUrl:'',bgmVolume:26,bgmLoop:true,aiEnabled:false,aiAudioUrl:'',aiDelayMs:500,aiCopy:{ko:'공연 지연 상황에 사용할 프로그램을 선택해 주세요.',ja:'公演の遅延時間に行うプログラムを選んでください。',en:'Choose a program for the delay period.'}},
    incident:{bgmUrl:'',bgmVolume:22,bgmLoop:true,aiEnabled:false,aiAudioUrl:'',aiDelayMs:400,aiCopy:{ko:'돌발상황이 발생했습니다. 대응 방법을 선택해 주세요.',ja:'トラブルが発生しました。対応方法を選んでください。',en:'An incident has occurred. Choose your response.'}},
    arrival:{bgmUrl:'',bgmVolume:30,bgmLoop:true,aiEnabled:false,aiAudioUrl:'',aiDelayMs:500,aiCopy:{ko:'연예인이 도착했습니다. 마지막 운영안을 결정해 주세요.',ja:'アーティストが到着しました。最後の運営案を決めてください。',en:'The artist has arrived. Choose the final operating plan.'}},
    result:{bgmUrl:'',bgmVolume:32,bgmLoop:true,aiEnabled:false,aiAudioUrl:'',aiDelayMs:500,aiCopy:{ko:'오늘의 프로듀서 활동이 완료되었습니다.',ja:'今日のプロデューサー体験が完了しました。',en:'Your producer experience is complete.'}},
  },
  masterSoundEnabled: true,
  dataRetention: {sessionDays:180,characterDays:90,messageDays:180,certificateDays:365},
  finalProgramOptions: [
    { key:'talk', ko:'토크를 줄이고 포토타임 유지', ja:'トークを短縮し撮影時間を維持', en:'Shorten the talk and keep photo time', active:true },
    { key:'short', ko:'모든 프로그램을 짧게 진행', ja:'すべてのプログラムを短縮', en:'Shorten every program', active:true },
    { key:'extend', ko:'종료 시간을 20분 연장', ja:'終了時間を20分延長', en:'Extend the ending time by 20 minutes', active:true },
    { key:'cancel', ko:'포토타임 취소', ja:'撮影時間を中止', en:'Cancel photo time', active:true },
  ],
  defaultLanguage: 'ja',
  introKo: {
    title1: '오늘은 내가',
    title2: 'K-CULTURE PRODUCER!',
    lead: '기사에서 시작된 K-CULTURE 체험. 나의 선택과 응원의 말로 다른 사람과 연결됩니다.',
    start: '프로젝트 시작하기',
  },
  introJa: {
    title1: '今日、あなたが',
    title2: 'K-CULTURE PRODUCER!',
    lead: '記事から始まるK-CULTURE体験。あなたの選択とメッセージが次の人につながります。',
    start: 'プロジェクトを始める',
  },
  introEn: { title1: 'Today, you are', title2: 'THE K-CULTURE PRODUCER!', lead: 'A story becomes an experience. Your choices and words connect you with others.', start: 'START EXPERIENCE' },
  characterCatalog: [
    { key: 'mina', name: 'MINA', role: 'K-POP FAN', description: '밝고 친근한 기본 여성 캐릭터', active: true, sortOrder: 1 },
    { key: 'joon', name: 'JOON', role: 'CREATOR', description: '차분하고 창의적인 남성 캐릭터', active: true, sortOrder: 2 },
    { key: 'yuna', name: 'YUNA', role: 'K-FOOD', description: 'K-FOOD를 좋아하는 여성 캐릭터', active: true, sortOrder: 3 },
    { key: 'haru', name: 'HARU', role: 'TRAVELER', description: '활동적인 여행자 캐릭터', active: true, sortOrder: 4 },
    { key: 'leo', name: 'LEO', role: 'GLOBAL FAN', description: '글로벌 팬 콘셉트의 남성 캐릭터', active: true, sortOrder: 5 },
  ],
  pageCopy: {
    ko: {
      profile: { title:'나의 K-컬처 프로듀서 캐릭터 만들기',description:'기본 캐릭터, 한 줄 설명, 내 사진 중 하나를 선택하세요.',nickname:'프로듀서 닉네임',nicknamePlaceholder:'예: YUKI',basicTitle:'기본 캐릭터',basicCopy:'준비된 오리지널 캐릭터를 골라 바로 시작합니다.',promptTitle:'설명으로 만들기',promptCopy:'짧은 프롬프트로 나만의 캐릭터 방향을 만듭니다.',photoTitle:'내 사진으로 만들기',photoCopy:'본인 사진을 업로드해 나를 캐릭터로 사용하는 흐름입니다.',continue:'이 캐릭터로 시작' },
      setup: { title:'팬미팅 조건을 정하세요',description:'선택한 조건은 운영안과 최종 평가에 반영됩니다.',fans:'팬 규모',city:'개최 지역',budget:'예산',mood:'행사 분위기',create:'AI 운영안 만들기' },
      plan: { title:'운영안이 완성됐습니다',artist:'아티스트',language:'언어',safety:'안전',operatingBudget:'운영 예산',edit:'조건을 변경',enter:'회장으로 이동' },
      incident1: { alert:'LIVE INCIDENT 01',title:'메이크업 수정으로',emphasis:'20분 지연되고 있습니다',media:'공연 시작 지연',question:'대기 시간을 어떤 프로그램으로 바꾸시겠습니까?',back:'운영안 보기',confirm:'이 프로그램으로 진행' },
      program:{eyebrow:'YOUR DECISION',change:'선택 변경',check:'현장 상황 확인'},
      incident2:{alert:'LIVE INCIDENT 02',back:'이전 장면',confirm:'이 대응으로 진행'},
      arrival: { media:'KKUGI 백스테이지 도착',eyebrow:'ARTIST READY',title:'KKUGI가 도착했습니다',copy:'남은 시간과 팬의 귀가 일정을 고려해 마지막 프로그램을 조정하세요.',confirm:'최종 운영 확정' },
      result: { media:'팬미팅 성공',eyebrow:'MISSION COMPLETE',prefix:'당신은',suffix:'입니다',total:'TOTAL SCORE',report:'AI 현장 리포트',log:'운영 기록',restart:'처음부터 다시',certificate:'확인증 보기',certTitle:'프로듀서 인증서',certCopy:'일본인 팬을 위한 팬미팅에서 문화적 이해와 현장 대응 능력을 보여주었습니다.',souvenir:'나의 K-컬처 기념사진',souvenirCopy:'실제 AI 이미지 API 연결 전의 구성 미리보기입니다.',articleTitle:'나의 팬미팅 기사',downloadArticle:'기사 내려받기',share:'공유하기',disclaimer:'이 콘텐츠는 사용자의 선택을 바탕으로 생성된 체험용 기사이며 실제 보도 기사가 아닙니다.' },
    },
    ja: {
      profile: { title: 'Kカルチャープロデューサーのキャラクターを作る', description: '基本キャラクター、説明、写真から選択してください。', continue: 'このキャラクターで開始' },
      setup: { title: 'ファンミーティングの条件を決めてください', description: '選択は運営プランと最終評価に反映されます。', create: 'AI運営プランを作る' },
      plan: { title: '運営プランが完成しました', edit: '条件を変更', enter: '会場へ移動' },
      incident1: { alert:'LIVE INCIDENT 01',title:'メイク直しにより',emphasis:'20分遅延しています',media:'公演開始の遅延',question:'待ち時間をどのプログラムに変更しますか？',back:'運営プランを見る',confirm:'このプログラムで進める' },
      program:{eyebrow:'YOUR DECISION',change:'選択を変更',check:'現場の状況を確認'},
      incident2:{alert:'LIVE INCIDENT 02',back:'前のシーン',confirm:'この対応で進める'},
      arrival: { title: 'KKUGIが到着しました', copy: '残り時間とファンの帰宅予定を考慮して、最後のプログラムを調整してください。', confirm: '最終運営を確定' },
      result: { restart: '最初からやり直す', certificate: '確認証を見る', souvenir: '私のKカルチャー記念写真' },
    },
    en: {
      profile: { title: 'Create your K-Culture Producer character', description: 'Choose a basic character, describe your own style, or use your photo.', continue: 'Start with this character' },
      setup: { title: 'Set the fan meeting conditions', description: 'Your choices affect the operating plan and final evaluation.', create: 'Create AI operation plan' },
      plan: { title: 'Your operation plan is ready', edit: 'Edit conditions', enter: 'Go to venue' },
      incident1: { alert:'LIVE INCIDENT 01',title:'Because of a makeup touch-up,',emphasis:'the show is delayed by 20 minutes',media:'Show start delay',question:'How will you use the waiting time?',back:'View operation plan',confirm:'Continue with this program' },
      program:{eyebrow:'YOUR DECISION',change:'Change choice',check:'Check the situation'},
      incident2:{alert:'LIVE INCIDENT 02',back:'Previous scene',confirm:'Continue with this response'},
      arrival: { title: 'KKUGI has arrived', copy: 'Adjust the final program while considering the remaining time and fans’ travel schedules.', confirm: 'Confirm final operation' },
      result: { restart: 'Restart', certificate: 'View certificate', souvenir: 'My K-Culture moment' },
    },
  },
  connectWallCopy: {
    ko: { eyebrow:'PROJECT CONTACT · CONNECT WALL', title:'당신의 한마디를 다음 사람에게.', body:'체험의 마지막에 누군가에게 전하고 싶은 짧은 메시지를 남겨주세요.', country:'CITY / COUNTRY', placeholder:'따뜻한 한마디를 입력하세요', send:'보내기' },
    ja: { eyebrow:'PROJECT CONTACT · CONNECT WALL', title:'あなたの言葉を、次の人へ。', body:'体験の最後に、誰かへ届けたい短いメッセージを残してください。', country:'CITY / COUNTRY', placeholder:'あたたかい一言を入力してください', send:'送信' },
    en: { eyebrow:'PROJECT CONTACT · CONNECT WALL', title:'Pass your words to the next person.', body:'At the end of the experience, leave a short message you want someone else to receive.', country:'CITY / COUNTRY', placeholder:'Write a warm message', send:'Send' },
  },
  videos: {
    V01: '/videos/V01_fanmeeting_arrival.mp4',
    V02: '/videos/V02_artist_delay.mp4',
    V03: '/videos/V03_kimchi_experience.mp4',
    V04: '/videos/V04_kpop_dance.mp4',
    V05: '/videos/V05_allergy_response.mp4',
    V06: '/videos/V06_ankle_safety_response.mp4',
    V07: '/videos/V07_KKUGI_arrival.mp4',
    V08: '/videos/V08_fanmeeting_success.mp4',
  },
};

// 저장값이 없거나 깨졌을 때도 사이트가 정상 실행되도록 기본값과 합칩니다.
export function normalizeAdminSettings(saved = {}) {
  const source = saved || {};
  return {
    ...defaultAdminSettings,
    ...source,
    introKo: { ...defaultAdminSettings.introKo, ...source?.introKo },
    introJa: { ...defaultAdminSettings.introJa, ...source?.introJa },
    introEn: { ...defaultAdminSettings.introEn, ...source?.introEn },
    articleCopy: {
      ko: { ...defaultAdminSettings.articleCopy.ko, ...source?.articleCopy?.ko },
      ja: { ...defaultAdminSettings.articleCopy.ja, ...source?.articleCopy?.ja },
      en: { ...defaultAdminSettings.articleCopy.en, ...source?.articleCopy?.en },
    },
    planNotes: { ...defaultAdminSettings.planNotes, ...source?.planNotes },
    incidentCopy: { ...defaultAdminSettings.incidentCopy, ...source?.incidentCopy },
    screenCopy: { ...defaultAdminSettings.screenCopy, ...source?.screenCopy },
    sceneNotes: { ...defaultAdminSettings.sceneNotes, ...source?.sceneNotes },
    programOverrides: { ...defaultAdminSettings.programOverrides, ...(source?.programOverrides || {}) },
    incidentOverrides: { ...defaultAdminSettings.incidentOverrides, ...(source?.incidentOverrides || {}) },
    incidentOptionOverrides: { ...defaultAdminSettings.incidentOptionOverrides, ...(source?.incidentOptionOverrides || {}) },
    scheduleItems: {
      ko: Array.isArray(source?.scheduleItems?.ko) && source.scheduleItems.ko.length ? source.scheduleItems.ko : defaultAdminSettings.scheduleItems.ko,
      ja: Array.isArray(source?.scheduleItems?.ja) && source.scheduleItems.ja.length ? source.scheduleItems.ja : defaultAdminSettings.scheduleItems.ja,
      en: Array.isArray(source?.scheduleItems?.en) && source.scheduleItems.en.length ? source.scheduleItems.en : defaultAdminSettings.scheduleItems.en,
    },
    audioScenes: Object.fromEntries(Object.entries(defaultAdminSettings.audioScenes).map(([key,value]) => [key,{...value,...(source?.audioScenes?.[key] || (key==='delay' ? source?.audioScenes?.program : {}) || {})}])),
    dataRetention: { ...defaultAdminSettings.dataRetention, ...(source?.dataRetention || {}) },
    characterCatalog: Array.isArray(source?.characterCatalog) && source.characterCatalog.length
      ? defaultAdminSettings.characterCatalog.map((item, index) => ({...item, ...(source.characterCatalog.find(row => row.key === item.key) || source.characterCatalog[index] || {})}))
      : defaultAdminSettings.characterCatalog,
    artistCatalog: defaultAdminSettings.artistCatalog.map(baseItem => { const savedItem=(source?.artistCatalog||[]).find(item=>item.key===baseItem.key)||{}; return {...baseItem,...savedItem,imageUrl:savedItem.imageUrl||baseItem.imageUrl,arrivalVideoUrl:savedItem.arrivalVideoUrl||baseItem.arrivalVideoUrl,resultVideoUrl:savedItem.resultVideoUrl||baseItem.resultVideoUrl}; }).concat((source?.artistCatalog||[]).filter(item=>!defaultAdminSettings.artistCatalog.some(base=>base.key===item.key))),
    stageCatalog: defaultAdminSettings.stageCatalog.map(baseItem => { const savedItem=(source?.stageCatalog||[]).find(item=>item.key===baseItem.key)||{}; return {...baseItem,...savedItem,imageUrl:savedItem.imageUrl||baseItem.imageUrl}; }).concat((source?.stageCatalog||[]).filter(item=>!defaultAdminSettings.stageCatalog.some(base=>base.key===item.key))),
    planVariants: Array.isArray(source?.planVariants) && source.planVariants.length && source.planVariants.some(item=>item?.schedule)
      ? source.planVariants
      : defaultAdminSettings.planVariants,
    finalProgramOptions: Array.isArray(source?.finalProgramOptions) && source.finalProgramOptions.length
      ? source.finalProgramOptions
      : defaultAdminSettings.finalProgramOptions,
    pageCopy: {
      ko: { ...defaultAdminSettings.pageCopy.ko, ...(source?.pageCopy?.ko || {}) },
      ja: { ...defaultAdminSettings.pageCopy.ja, ...(source?.pageCopy?.ja || {}) },
      en: { ...defaultAdminSettings.pageCopy.en, ...(source?.pageCopy?.en || {}) },
    },
    connectWallCopy: {
      ko: { ...defaultAdminSettings.connectWallCopy.ko, ...(source?.connectWallCopy?.ko || {}) },
      ja: { ...defaultAdminSettings.connectWallCopy.ja, ...(source?.connectWallCopy?.ja || {}) },
      en: { ...defaultAdminSettings.connectWallCopy.en, ...(source?.connectWallCopy?.en || {}) },
    },
    videos: { ...defaultAdminSettings.videos, ...source?.videos },
  };
}

export function loadAdminSettings() {
  try {
    return normalizeAdminSettings(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {});
  } catch {
    return normalizeAdminSettings({});
  }
}

export function saveAdminSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resetAdminSettings() {
  localStorage.removeItem(STORAGE_KEY);
  return defaultAdminSettings;
}

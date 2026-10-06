import { useEffect, useMemo, useState } from 'react';
import { createConnectMessage, getConnectMessages } from '../services/systemApi';
import CurvedBillboardCanvas from './CurvedBillboardCanvas';

const demoMessages = [
  { id: 'demo-1', nickname: 'TOKYO', message: '今日もお疲れさまでした。' },
  { id: 'demo-2', nickname: 'SEOUL', message: '오늘도 수고했어요.' },
  { id: 'demo-3', nickname: 'OSAKA', message: 'あなたは一人じゃない。' },
];

export default function ConnectWall({ language, sessionId, nickname, profile, artistName, photoUrl, artistVideoUrl='', billboardBackgroundVideoUrl='' }) {
  const [messages, setMessages] = useState(demoMessages);
  const [message, setMessage] = useState('');
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('');
  const [priorityMessageId, setPriorityMessageId] = useState('');

  const copy = useMemo(() => language === 'ja' ? {
    eyebrow: 'PROJECT CONTACT · CONNECT WALL', title: 'あなたの言葉を、次の人へ。',
    body: '体験の最後に、誰かへ届けたい短いメッセージを残してください。',
    country: 'CITY / COUNTRY', placeholder: 'あたたかい一言を入力してください', send: '送信',
    sent: 'あなたのメッセージがつながりました。', blocked: 'メッセージを確認してください。',
    feature: '今日の K-CULTURE MOMENT', current: '현재 메시지',
  } : language === 'en' ? {
    eyebrow: 'PROJECT CONTACT · CONNECT WALL', title: 'Pass your message to the next visitor.',
    body: 'Leave a short message at the end of the experience.',
    country: 'CITY / COUNTRY', placeholder: 'Write a warm message', send: 'Send',
    sent: 'Your message has been connected.', blocked: 'Please review your message.',
    feature: 'TODAY\'S K-CULTURE MOMENT', current: 'Current message',
  } : {
    eyebrow: 'PROJECT CONTACT · CONNECT WALL', title: '당신의 한마디를 다음 사람에게.',
    body: '체험의 마지막에 누군가에게 전하고 싶은 짧은 메시지를 남겨주세요.',
    country: 'CITY / COUNTRY', placeholder: '따뜻한 한마디를 입력하세요', send: '보내기',
    sent: '당신의 한마디가 연결되었습니다.', blocked: '메시지 내용을 확인해주세요.',
    feature: '오늘의 K-CULTURE MOMENT', current: '현재 메시지',
  }, [language]);

  const refresh = async () => {
    try {
      const rows = await getConnectMessages(20);
      if (rows.length) setMessages(rows);
    } catch {}
  };

  useEffect(() => { refresh(); const timer = setInterval(refresh, 15000); return () => clearInterval(timer); }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    setStatus('');
    try {
      const saved = await createConnectMessage({
        session_id: sessionId || null,
        nickname: nickname || 'ANONYMOUS',
        country,
        language,
        message: message.trim(),
      });
      if (saved.status !== 'approved') {
        setStatus(copy.blocked);
        return;
      }
      setMessages((current) => [saved, ...current].slice(0, 20));
      setMessage('');
      // 직접 보낸 메시지만 다음 문구 경계에서 우선 표시합니다.
      setPriorityMessageId(saved.id);
      setStatus(copy.sent);
    } catch {
      setStatus(language === 'ja' ? 'FastAPIを起動すると保存できます。' : language === 'en' ? 'Start FastAPI to save.' : 'FastAPI를 실행하면 실제 저장됩니다.');
    }
  };

  // 선택 배우의 결과 영상을 LED 면에 전달하며 건물 배경 영상은 유지합니다.
  const displayName = profile?.nickname || nickname || 'PRODUCER';
  const displayedMessages = messages.filter((item) => item?.message && item.status !== 'hidden');
  return (
    <section className="connect-wall" aria-labelledby="connect-wall-title">
      <div className="connect-wall-copy">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="connect-wall-title">{copy.title}</h2>
        <p>{copy.body}</p>
        <form className="connect-form" onSubmit={submit}>
          <input value={country} maxLength={30} onChange={(e) => setCountry(e.target.value)} placeholder={copy.country} />
          <textarea value={message} maxLength={120} onChange={(e) => setMessage(e.target.value)} placeholder={copy.placeholder} />
          <button type="submit">{copy.send}</button>
          {status && <span role="status">{status}</span>}
        </form>
      </div>
      <div className="donga-billboard-building" aria-label="동아일보 사옥 전광판 체험 시안">
        <video
          className="donga-building-photo donga-building-video"
          src="/videos/billboard-project.mp4" 
          autoPlay muted loop playsInline preload="auto"
          aria-label="동아일보 사옥 움직이는 배경 영상"
        />
        {photoUrl && (
          <CurvedBillboardCanvas
            photoUrl={photoUrl}
            backgroundVideoUrl={artistVideoUrl || billboardBackgroundVideoUrl}
            messages={displayedMessages}
            priorityMessageId={priorityMessageId}
            participantName={displayName}
          />
        )}
      </div>
      <p className="donga-wall-caption">DONG-A ILBO · CONNECT WALL · DIGITAL SIGNAGE MOCKUP</p>
    </section>
  );
}

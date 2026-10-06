import { useEffect, useState } from 'react';

const localVideoFallback = (code) => ({
  V01: '/videos/V01_fanmeeting_arrival.mp4',
  V02: '/videos/V02_artist_delay.mp4',
  V03: '/videos/V03_kimchi_experience.mp4',
  V04: '/videos/V04_kpop_dance.mp4',
  V05: '/videos/V05_allergy_response.mp4',
  V06: '/videos/V06_ankle_safety_response.mp4',
  V07: '/videos/V07_KKUGI_arrival.mp4',
  V08: '/videos/V08_fanmeeting_success.mp4',
}[code] || '');

export default function MediaFrame({ video, poster, code, label, className = '', controls = false, allowLocalFallback = true }) {
  // 배우 전용 장면에서는 다른 배우의 공통 기본 영상으로 대체하지 않습니다.
  const fallback = allowLocalFallback ? localVideoFallback(code) : '';
  const [activeVideo, setActiveVideo] = useState(video || fallback);

  useEffect(() => {
    setActiveVideo(video || fallback);
  }, [video, fallback]);

  const handleVideoError = () => {
    if (fallback && activeVideo !== fallback) setActiveVideo(fallback);
    else setActiveVideo('');
  };

  return (
    <div className={`media-frame ${className}`}>
      {activeVideo ? (
        <video
          key={activeVideo}
          muted
          loop
          playsInline
          autoPlay
          controls={controls}
          preload="auto"
          onError={handleVideoError}
        >
          <source
            src={activeVideo}
            type={activeVideo.toLowerCase().split('?')[0].endsWith('.webm') ? 'video/webm' : 'video/mp4'}
          />
        </video>
      ) : poster ? (
        <img
          className="scene-image-fallback"
          src={poster}
          alt="영상 미등록 장면: 관리자에서 영상을 등록해 주세요."
        />
      ) : (
        <div role="status" style={{display:'grid',placeItems:'center',height:'100%',minHeight:180,padding:24,color:'#aeb8d0',textAlign:'center'}}>영상·이미지가 등록되지 않았습니다.</div>
      )}
      <div className="media-label"><b>{code}</b><span>{label}</span></div>
    </div>
  );
}

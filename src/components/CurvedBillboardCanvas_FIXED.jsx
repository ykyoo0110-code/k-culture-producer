import { useEffect, useRef } from 'react';
import './CurvedBillboardCanvas.css';

const W = 720;
const H = 1280;

/**
 * 전광판 전용 오버레이
 * - 배경 영상(public/videos/billboard-project.mp4)은 그대로 유지
 * - 기념사진: 기준 이미지의 실제 상단 공연 화면 좌표에만 합성
 * - 참가자 이름: 우측 흰색 패널 안에 표시
 * - Connect Wall: 기존 하단 곡선 띠 위에 텍스트만 흐르게 표시
 */
export default function CurvedBillboardCanvas({
  photoUrl,
  messages = [],
  participantName = 'PRODUCER',
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!photoUrl) return undefined;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;

    canvas.width = W;
    canvas.height = H;

    let cancelled = false;
    let raf = 0;
    const startedAt = performance.now();

    const photo = new Image();
    photo.crossOrigin = 'anonymous';

    photo.onload = () => {
      if (cancelled) return;

      const iw = photo.naturalWidth || 1;
      const ih = photo.naturalHeight || 1;

      // 기준 이미지에서 실제 측정한 공연 화면 좌표(720x1280 영상 기준)
      // 좌측 상단/우측 상단/좌측 하단/우측 하단
      const SURFACE = {
        left: 260,
        right: 490,
        topLeftY: 340,
        topRightY: 378,
        bottomLeftY: 576,
        bottomRightY: 622,
      };

      const STRIPS = 120;

      // 사진을 화면 비율에 맞게 중앙 crop. 인물 얼굴이 잘리지 않도록 세로 방향은 조금 위쪽 우선.
      const surfaceMidHeight =
        ((SURFACE.bottomLeftY - SURFACE.topLeftY) +
          (SURFACE.bottomRightY - SURFACE.topRightY)) / 2;
      const surfaceAspect = (SURFACE.right - SURFACE.left) / surfaceMidHeight;

      let sx = 0;
      let sy = 0;
      let sw = iw;
      let sh = ih;

      if (iw / ih > surfaceAspect) {
        sw = ih * surfaceAspect;
        sx = (iw - sw) / 2;
      } else {
        sh = iw / surfaceAspect;
        sy = Math.max(0, Math.min(ih - sh, (ih - sh) * 0.32));
      }

      const topY = (t) =>
        SURFACE.topLeftY + (SURFACE.topRightY - SURFACE.topLeftY) * t;
      const bottomY = (t) =>
        SURFACE.bottomLeftY + (SURFACE.bottomRightY - SURFACE.bottomLeftY) * t;

      // 건물 좌측 곡면을 따라 왼쪽 구간을 조금 더 압축해 평면 스티커처럼 보이지 않게 함.
      const mappedX = (t) => {
        const curve = 0.12 * t + 0.88 * Math.pow(t, 0.72);
        return SURFACE.left + (SURFACE.right - SURFACE.left) * curve;
      };

      const drawPhoto = () => {
        ctx.save();

        // 사진은 기준 이미지의 공연 화면 경계 밖으로 절대 나오지 않음.
        ctx.beginPath();
        ctx.moveTo(SURFACE.left, SURFACE.topLeftY);
        ctx.lineTo(SURFACE.right, SURFACE.topRightY);
        ctx.lineTo(SURFACE.right, SURFACE.bottomRightY);
        ctx.lineTo(SURFACE.left, SURFACE.bottomLeftY);
        ctx.closePath();
        ctx.clip();

        for (let i = 0; i < STRIPS; i += 1) {
          const t0 = i / STRIPS;
          const t1 = (i + 1) / STRIPS;

          const x0 = mappedX(t0);
          const x1 = mappedX(t1);
          const y0 = topY(t0);
          const y1 = topY(t1);
          const b0 = bottomY(t0);
          const b1 = bottomY(t1);

          const srcX = sx + sw * t0;
          const srcW = sw / STRIPS + 1.2;
          const dstW = x1 - x0 + 0.8;
          const dstH = ((b0 - y0) + (b1 - y1)) / 2;
          const slope = y1 - y0;

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(x0 - 0.7, y0 - 0.7);
          ctx.lineTo(x1 + 0.8, y1 - 0.7);
          ctx.lineTo(x1 + 0.8, b1 + 0.8);
          ctx.lineTo(x0 - 0.7, b0 + 0.8);
          ctx.closePath();
          ctx.clip();

          const a = dstW / srcW;
          const b = slope / srcW;
          const d = dstH / sh;

          ctx.setTransform(
            a,
            b,
            0,
            d,
            x0 - a * srcX,
            y0 - b * srcX - d * sy,
          );
          ctx.drawImage(photo, 0, 0);
          ctx.restore();
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // LED 면의 원래 광량을 살리는 아주 약한 곡면 음영만 적용.
        const shade = ctx.createLinearGradient(SURFACE.left, 0, SURFACE.right, 0);
        shade.addColorStop(0, 'rgba(4, 12, 28, 0.24)');
        shade.addColorStop(0.12, 'rgba(4, 12, 28, 0.10)');
        shade.addColorStop(0.55, 'rgba(255,255,255,0.015)');
        shade.addColorStop(1, 'rgba(0,0,0,0.05)');
        ctx.fillStyle = shade;
        ctx.fillRect(
          SURFACE.left,
          SURFACE.topLeftY,
          SURFACE.right - SURFACE.left,
          SURFACE.bottomRightY - SURFACE.topLeftY,
        );

        ctx.restore();
      };

      const drawParticipantName = () => {
        const name = String(participantName || 'PRODUCER').trim().slice(0, 20);
        if (!name) return;

        ctx.save();

        // 기존 우측 흰색 WITH YOU 패널의 하단 문구 자리.
        ctx.beginPath();
        ctx.moveTo(417, 697);
        ctx.lineTo(486, 706);
        ctx.lineTo(486, 747);
        ctx.lineTo(416, 739);
        ctx.closePath();
        ctx.clip();

        ctx.font = '800 14px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#17233c';
        ctx.shadowColor = 'rgba(255,255,255,0.78)';
        ctx.shadowBlur = 2;
        ctx.fillText(name.toUpperCase(), 452, 722, 64);
        ctx.restore();
      };

      const tickerText = () => {
        const visible = (messages || []).filter((item) => item?.message).slice(0, 12);
        if (!visible.length) return 'CONNECT WALL  ·  K-CULTURE PRODUCER';
        return visible
          .map((item) => `${item.nickname || 'CONNECT'}  ${item.message}`)
          .join('   ♡   ');
      };

      const drawTicker = (now) => {
        const text = tickerText();

        ctx.save();

        // 영상에 이미 존재하는 맨 아래 곡선 띠만 사용. 새 배경/검은 박스는 그리지 않음.
        ctx.beginPath();
        ctx.moveTo(225, 756);
        ctx.bezierCurveTo(315, 765, 416, 780, 505, 793);
        ctx.lineTo(505, 818);
        ctx.bezierCurveTo(414, 806, 314, 793, 225, 785);
        ctx.closePath();
        ctx.clip();

        ctx.font = '800 12px Arial, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.98)';
        ctx.shadowColor = 'rgba(0,0,0,0.72)';
        ctx.shadowBlur = 2;

        const textWidth = Math.max(1, ctx.measureText(text).width + 90);
        const elapsed = now - startedAt;
        const offset = (elapsed / 36000) * (textWidth + 300);
        let x = 520 - (offset % textWidth);

        while (x < 530) {
          ctx.save();
          ctx.translate(x, 786);
          ctx.transform(0.97, 0.105, 0, 1, 0, 0);
          ctx.fillText(text, 0, 0);
          ctx.restore();
          x += textWidth;
        }

        ctx.restore();
      };

      const render = (now) => {
        if (cancelled) return;

        ctx.clearRect(0, 0, W, H);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        drawPhoto();
        drawParticipantName();
        drawTicker(now);

        raf = requestAnimationFrame(render);
      };

      raf = requestAnimationFrame(render);
    };

    photo.src = photoUrl;

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [photoUrl, messages, participantName]);

  if (!photoUrl) return null;

  return (
    <canvas
      ref={canvasRef}
      className="kkugi-curved-billboard-canvas"
      aria-label="K-Culture billboard souvenir"
    />
  );
}

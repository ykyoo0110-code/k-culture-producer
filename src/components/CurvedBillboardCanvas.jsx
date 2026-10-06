import { useEffect, useRef } from 'react';
import './CurvedBillboardCanvas.css';

const W = 720;
const H = 1280;
const P = (x, y) => ({ x, y });

function cubic(p0, p1, p2, p3, t) {
  const k = 1 - t;
  return {
    x: k*k*k*p0.x + 3*k*k*t*p1.x + 3*k*t*t*p2.x + t*t*t*p3.x,
    y: k*k*k*p0.y + 3*k*k*t*p1.y + 3*k*t*t*p2.y + t*t*t*p3.y,
  };
}

function affine(s0, s1, s2, d0, d1, d2) {
  const den =
    s0.x * (s1.y - s2.y) +
    s1.x * (s2.y - s0.y) +
    s2.x * (s0.y - s1.y);

  if (Math.abs(den) < 1e-7) return null;

  return {
    a: (d0.x*(s1.y-s2.y) + d1.x*(s2.y-s0.y) + d2.x*(s0.y-s1.y)) / den,
    b: (d0.y*(s1.y-s2.y) + d1.y*(s2.y-s0.y) + d2.y*(s0.y-s1.y)) / den,
    c: (d0.x*(s2.x-s1.x) + d1.x*(s0.x-s2.x) + d2.x*(s1.x-s0.x)) / den,
    d: (d0.y*(s2.x-s1.x) + d1.y*(s0.x-s2.x) + d2.y*(s1.x-s0.x)) / den,
    e: (d0.x*(s1.x*s2.y-s2.x*s1.y) + d1.x*(s2.x*s0.y-s0.x*s2.y) + d2.x*(s0.x*s1.y-s1.x*s0.y)) / den,
    f: (d0.y*(s1.x*s2.y-s2.x*s1.y) + d1.y*(s2.x*s0.y-s0.x*s2.y) + d2.y*(s0.x*s1.y-s1.x*s0.y)) / den,
  };
}

function drawTriangle(ctx, img, s0, s1, s2, d0, d1, d2, seamPadding = 0) {
  const m = affine(s0, s1, s2, d0, d1, d2);
  if (!m) return;

  // 사진 면만 삼각형 클립을 미세하게 겹쳐 안티앨리어싱 틈으로 원본 영상이 비치지 않게 합니다.
  // 실제 이미지 변환 좌표는 유지하고, 하단 띠에는 이 보정을 적용하지 않습니다.
  let points = [d0, d1, d2];
  if (seamPadding > 0) {
    const center = P((d0.x + d1.x + d2.x) / 3, (d0.y + d1.y + d2.y) / 3);
    const twiceArea = Math.abs((d1.x - d0.x) * (d2.y - d0.y) - (d1.y - d0.y) * (d2.x - d0.x));
    const longestEdge = Math.max(Math.hypot(d1.x - d0.x, d1.y - d0.y), Math.hypot(d2.x - d1.x, d2.y - d1.y), Math.hypot(d0.x - d2.x, d0.y - d2.y));
    const innerDistance = twiceArea / (3 * longestEdge);
    const scale = 1 + seamPadding / Math.max(innerDistance, 0.1);
    points = points.map(p => P(center.x + (p.x - center.x) * scale, center.y + (p.y - center.y) * scale));
  }
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  ctx.lineTo(points[1].x, points[1].y);
  ctx.lineTo(points[2].x, points[2].y);
  ctx.closePath();
  ctx.clip();

  ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

function coverCrop(img, targetRatio) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;

  if (iw / ih > targetRatio) {
    const sw = ih * targetRatio;
    return { sx: (iw - sw) / 2, sy: 0, sw, sh: ih };
  }

  const sh = iw / targetRatio;
  return { sx: 0, sy: (ih - sh) / 2, sw: iw, sh };
}

/* 기본 영상 720×1280의 LED 경계를 기준으로 사진과 띠를 함께 배치합니다.
   건물 오른쪽 벽까지 확장하던 이전 좌표와 인물별 압축은 사용하지 않습니다. */
// 영상 상단의 가는 노출선을 덮도록 위쪽 경계만 기준 해상도에서 2px 보정합니다.
const TL = P(234, 298);
const TR = P(493, 345);
const BL = P(217, 758);
const BR = P(506, 782);

const topEdge = (t) => cubic(TL, P(234, 258), P(390, 304), TR, t);
const bottomEdge = (t) => cubic(BL, P(245, 748), P(414, 767), BR, t);
const leftEdge = (t) => cubic(TL, P(229, 450), P(221, 630), BL, t);
const rightEdge = (t) => cubic(TR, P(497, 480), P(502, 640), BR, t);

// 배우와 캐릭터에 서로 다른 압축률을 적용하지 않습니다.
function mapU(sourceU) {
  return sourceU;
}

// 중앙의 두 인물은 같은 배율로 표시하고, 주변 무대만 크롭해 LED 하단의 큰 장면으로 연결합니다.
// 이 작업은 표시용이며 저장된 기념사진과 인물 자체를 변경하지 않습니다.
function makePhotoSurface(img, participantName, language, transparentBackground = false) {
  const surface = document.createElement('canvas');
  surface.width = 720;
  const faceWidth = (Math.hypot(TR.x - TL.x, TR.y - TL.y) + Math.hypot(BR.x - BL.x, BR.y - BL.y)) / 2;
  const faceHeight = (Math.hypot(BL.x - TL.x, BL.y - TL.y) + Math.hypot(BR.x - TR.x, BR.y - TR.y)) / 2;
  surface.height = Math.round(surface.width * faceHeight / faceWidth);
  const context = surface.getContext('2d');
  // 인물이 없는 원본 상단 조명 부분만 배경으로 사용해 흐릿한 인물 중복을 피합니다.
  const crop = coverCrop({ width: img.naturalWidth, height: img.naturalHeight * .30 }, surface.width / surface.height);

  // 문구·사진·이름을 한 장으로 구성한 뒤 기존 LED 곡면에 함께 매핑합니다.
  // 같은 기념사진을 배경으로 사용해 무대 색상이 자연스럽게 이어지게 합니다.
  // 밝기와 불투명도를 분리합니다. 바탕을 먼저 완전히 채워 기존 글씨를 차단합니다.
  // 영상 위의 전경은 배경만 투명하게 두고 문구·사진·이름은 그대로 유지합니다.
  if (!transparentBackground) {
    context.fillStyle = '#8575b4';
    context.fillRect(0, 0, surface.width, surface.height);
    context.save();
    context.filter = 'blur(10px) brightness(1.08) saturate(0.85)';
    context.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, -40, -40, surface.width + 80, surface.height + 80);
    context.restore();
  }
  // 영상에는 색상막을 덮지 않습니다. 정적 대체 배경의 명암만 유지합니다.
  if (!transparentBackground) {
    const wash = context.createLinearGradient(0, 0, 0, surface.height);
    // 상단은 문구 가독성을 확보하고, 중앙은 무대 조명 색상을 살립니다.
    wash.addColorStop(0, 'rgba(36,27,70,.40)');
    wash.addColorStop(.35, 'rgba(111,82,151,.14)');
    wash.addColorStop(.72, 'rgba(144,102,174,.08)');
    wash.addColorStop(1, 'rgba(35,24,60,.38)');
    context.fillStyle = wash;
    context.fillRect(0, 0, surface.width, surface.height);
  
  }

  const copy = language === 'ja'
    ? { title: ['今日も', 'お疲れさまでした。'], note: 'あなたの一日が、誰かの力になる。' }
    : language === 'en'
      ? { title: ['You did great', 'today.'], note: 'Your moment. Our connection.' }
      : { title: ['오늘도', '수고했어.'], note: '당신의 하루가 누군가의 힘이 됩니다.' };
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  // 문구만 약간 투명하게 해 영상과 연결하고 기념사진의 선명도는 유지합니다.
  context.save();
  context.globalAlpha = .88;
  context.fillStyle = '#f8eefb';
  context.font = '700 22px Arial, sans-serif';
  // 상단 곡선과의 여백은 남기고 표기만 위로 올립니다.
  context.fillText('K-CULTURE · CONNECT WALL', 260, surface.height * .065, 440);
  // 한국어·일본어는 오른쪽 위 두 세로줄로 배치해 영상 중앙을 열어 둡니다.
  // 글자를 회전하거나 가로로 압축하지 않고 이름 영역 위에서 끝나도록 간격을 맞춥니다.
  if (language === 'en') {
    context.font = '800 34px Arial, sans-serif';
    copy.title.forEach((line, index) => context.fillText(line, 610, surface.height * (.18 + index * .045), 190));
  } else {
    context.font = '800 42px Arial, sans-serif';
    const top = surface.height * .145;
    const availableHeight = surface.height * .30;
    copy.title.forEach((line, column) => {
      const chars = Array.from(line);
      const step = Math.min(48, availableHeight / Math.max(1, chars.length - 1));
      chars.forEach((char, index) => context.fillText(char, 650 - column * 52, top + index * step));
    });
  }
  context.restore();

  // 두 사람을 개별 변형하지 않고 사진 전체를 동일한 비율로 확대합니다.
  // 현재 합성 사진의 얼굴·발끝(.26~.81 높이)을 남기고 관객과 양옆 무대만 줄입니다.
  const photoBox = { x: 0, y: surface.height * .38, width: 600, height: surface.height * .62 };
  const sourceHeight = img.naturalHeight * .82;
  const sourceWidth = Math.min(img.naturalWidth, sourceHeight * photoBox.width / photoBox.height);
  const sourceX = Math.max(0, Math.min(img.naturalWidth - sourceWidth, img.naturalWidth * .51 - sourceWidth / 2));
  const sourceY = img.naturalHeight * .06;
  // 크롭 구도와 두 인물 비율을 유지하며 표시 크기만 기존의 80%로 줄입니다.
  const scale = Math.min(photoBox.width / sourceWidth, photoBox.height / sourceHeight) * .80;
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const photoX = photoBox.x + (photoBox.width - width) / 2;
  // 기념사진은 이전의 하단 배치로 유지하고, 이름만 오른쪽 아래에 표시합니다.
  const photoY = photoBox.y + photoBox.height - height;

  // 인물의 위치·배율은 그대로 두고 원본 무대의 좌우 범위만 넓혀 왼쪽 곡면까지 연결합니다.
  const leftExtension = Math.min(photoX, sourceX * scale);
  const rightExtension = Math.min(32, (img.naturalWidth - sourceX - sourceWidth) * scale);
  const extendedWidth = width + leftExtension + rightExtension;
  const extendedX = photoX - leftExtension;
  const layer = document.createElement('canvas');
  layer.width = Math.ceil(extendedWidth);
  layer.height = Math.ceil(height);
  const layerContext = layer.getContext('2d');
  layerContext.drawImage(img, sourceX - leftExtension / scale, sourceY, sourceWidth + (leftExtension + rightExtension) / scale, sourceHeight, 0, 0, layer.width, layer.height);
  layerContext.globalCompositeOperation = 'destination-in';
  const topFade = layerContext.createLinearGradient(0, 0, 0, layer.height);
  // 인물이 있는 구간까지 전환 범위를 넓히지 않고, 위쪽 무대만 더 옅게 연결합니다.
  topFade.addColorStop(0, 'rgba(0,0,0,0)');
  topFade.addColorStop(.12, 'rgba(0,0,0,.20)');
  topFade.addColorStop(.20, 'rgba(0,0,0,.55)');
  topFade.addColorStop(.27, 'rgba(0,0,0,1)');
  topFade.addColorStop(1, 'rgba(0,0,0,1)');
  layerContext.fillStyle = topFade;
  layerContext.fillRect(0, 0, layer.width, layer.height);
  const sideFade = layerContext.createLinearGradient(0, 0, layer.width, 0);
  // 왼쪽은 전광판 외곽까지 사진 배경을 채우고, 오른쪽 무대만 넓게 영상으로 연결합니다.
  sideFade.addColorStop(0, 'rgba(0,0,0,1)');
  sideFade.addColorStop(.78, 'rgba(0,0,0,1)');
  // 오른쪽 인물 영역은 유지하고, 바깥 무대 경계만 영상이 더 잘 비치게 합니다.
  sideFade.addColorStop(.90, 'rgba(0,0,0,.30)');
  sideFade.addColorStop(1, 'rgba(0,0,0,0)');
  layerContext.fillStyle = sideFade;
  layerContext.fillRect(0, 0, layer.width, layer.height);
  context.drawImage(layer, extendedX, photoY, extendedWidth, height);

  // 참가자 닉네임을 사진 오른쪽 아래로 이동합니다. 사진 아래나 띠 안으로 옮기지 않습니다.
  const name = String(participantName || 'PRODUCER').trim().slice(0, 18);
  const nameCenterX = 626;
  context.save();
  context.beginPath();
  context.rect(574, surface.height * .74, 105, surface.height * .25);
  context.clip();
  context.fillStyle = '#dfcfe8';
  context.font = '700 17px Arial, sans-serif';
  // WITH YOU는 줄바꿈된 이름의 바로 위에 그립니다.
  context.fillStyle = '#fff7fc';
  context.font = '800 30px Arial, sans-serif';
  // 좁은 이름 영역에서도 글자를 가로로 압축하지 않고 실제 폭으로 줄바꿈합니다.
  const lines = [];
  let line = '';
  for (const char of Array.from(name)) {
    if (line && context.measureText(line + char).width > 92) { lines.push(line); line = ''; }
    line += char;
  }
  if (line) lines.push(line);
  // 이름의 마지막 줄을 띠 바로 위에 고정하고, 긴 이름은 위쪽으로 쌓습니다.
  const lineStep = 36;
  const nameBottom = surface.height * .965;
  const nameY = nameBottom - (lines.length - 1) * lineStep;
  context.save();
  context.fillStyle = '#dfcfe8';
  context.font = '700 17px Arial, sans-serif';
  context.fillText('WITH YOU', nameCenterX, nameY - 30, 100);
  context.restore();
  lines.forEach((row, index) => context.fillText(row, nameCenterX, nameY + index * lineStep));
  context.restore();
  return surface;
}

function mainPoint(sourceU, v) {
  const u = mapU(sourceU);

  const T = topEdge(u);
  const B = bottomEdge(u);
  const L = leftEdge(v);
  const R = rightEdge(v);

  const qx =
    (1-u)*(1-v)*TL.x +
    u*(1-v)*TR.x +
    (1-u)*v*BL.x +
    u*v*BR.x;

  const qy =
    (1-u)*(1-v)*TL.y +
    u*(1-v)*TR.y +
    (1-u)*v*BL.y +
    u*v*BR.y;

  let x =
    (1-v)*T.x + v*B.x +
    (1-u)*L.x + u*R.x -
    qx;

  let y =
    (1-v)*T.y + v*B.y +
    (1-u)*L.y + u*R.y -
    qy;

  // 측정한 곡선 경계만 사용합니다. 추가 안쪽 이동은 인물과 외곽을 어긋나게 합니다.

  return { x, y };
}

function traceMain(ctx) {
  ctx.beginPath();

  let p = topEdge(0);
  ctx.moveTo(p.x, p.y);

  for (let i = 1; i <= 80; i++) {
    p = topEdge(i / 80);
    ctx.lineTo(p.x, p.y);
  }
  for (let i = 1; i <= 80; i++) {
    p = rightEdge(i / 80);
    ctx.lineTo(p.x, p.y);
  }
  for (let i = 79; i >= 0; i--) {
    p = bottomEdge(i / 80);
    ctx.lineTo(p.x, p.y);
  }
  for (let i = 79; i >= 1; i--) {
    p = leftEdge(i / 80);
    ctx.lineTo(p.x, p.y);
  }

  ctx.closePath();
}

function drawMainPhoto(ctx, img, { opaque = true, columns = 64, rows = 56 } = {}) {
  const COLS = columns;
  const ROWS = rows;
  const crop = { sx: 0, sy: 0, sw: img.width, sh: img.height };

  ctx.save();
  traceMain(ctx);
  // 삼각형 사이와 상단 외곽의 반투명 픽셀 아래에도 불투명한 LED 바탕을 둡니다.
  if (opaque) {
    ctx.fillStyle = '#8575b4';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#8575b4';
    ctx.stroke();
  }
  ctx.clip();

  for (let row = 0; row < ROWS; row++) {
    const v0 = row / ROWS;
    const v1 = (row + 1) / ROWS;

    for (let col = 0; col < COLS; col++) {
      const u0 = col / COLS;
      const u1 = (col + 1) / COLS;

      const sx0 = crop.sx + crop.sw * u0;
      const sx1 = crop.sx + crop.sw * u1;
      const sy0 = crop.sy + crop.sh * v0;
      const sy1 = crop.sy + crop.sh * v1;

      const p00 = mainPoint(u0, v0);
      const p10 = mainPoint(u1, v0);
      const p01 = mainPoint(u0, v1);
      const p11 = mainPoint(u1, v1);

      drawTriangle(
        ctx, img,
        P(sx0, sy0), P(sx1, sy0), P(sx0, sy1),
        p00, p10, p01, 0.35
      );

      drawTriangle(
        ctx, img,
        P(sx1, sy0), P(sx1, sy1), P(sx0, sy1),
        p10, p11, p01, 0.35
      );
    }
  }

  // 곡면 광량만 보정
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // 건물의 원통형 면을 따라 은은한 음영만 주고 LED 내용을 과하게 어둡게 하지 않습니다.
  const shade = ctx.createLinearGradient(217, 0, 506, 0);
  shade.addColorStop(0.00, 'rgba(16,12,35,.18)');
  shade.addColorStop(0.10, 'rgba(16,12,35,.08)');
  shade.addColorStop(0.30, 'rgba(255,255,255,.025)');
  shade.addColorStop(0.80, 'rgba(255,255,255,.015)');
  shade.addColorStop(1.00, 'rgba(16,12,35,.06)');
  ctx.fillStyle = shade;
  ctx.fillRect(195, 275, 400, 530);

  ctx.restore();
}

/* ------------------------------------------------------------------
   BOTTOM RIBBON
   텍스트를 그냥 직선으로 그리지 않고,
   먼저 평평한 offscreen strip에 그린 뒤
   그 strip 자체를 실제 리본 곡면에 mesh-warp 한다.
------------------------------------------------------------------ */

// 사진 하단과 띠 상단은 같은 곡선을 사용해 연결부의 틈을 방지합니다.
const RTL = BL;
const RTR = BR;
const RBL = P(216, 796);
const RBR = P(508, 809);

const ribbonTop = bottomEdge;
const ribbonBottom = (t) => cubic(RBL, P(245, 786), P(414, 794), RBR, t);
const ribbonLeft = (t) => cubic(RTL, P(217, 770), P(216, 785), RBL, t);
const ribbonRight = (t) => cubic(RTR, P(507, 791), P(508, 801), RBR, t);

function ribbonPoint(u, v) {
  const T = ribbonTop(u);
  const B = ribbonBottom(u);
  const L = ribbonLeft(v);
  const R = ribbonRight(v);

  const qx =
    (1-u)*(1-v)*RTL.x +
    u*(1-v)*RTR.x +
    (1-u)*v*RBL.x +
    u*v*RBR.x;

  const qy =
    (1-u)*(1-v)*RTL.y +
    u*(1-v)*RTR.y +
    (1-u)*v*RBL.y +
    u*v*RBR.y;

  // 곡면 보간의 세로 쏠림을 보정해 글자 중심이 상·하단 경계의 중간을 따르게 합니다.
  // 띠 외곽 클리핑과 위·아래 경계는 유지하고 내부 세로 배치만 보정합니다.
  const midL = ribbonLeft(.5);
  const midR = ribbonRight(.5);
  const midQy = ((1-u) * (RTL.y + RBL.y) + u * (RTR.y + RBR.y)) / 2;
  const centerOffset = (1-u) * midL.y + u * midR.y - midQy;

  return {
    x:
      (1-v)*T.x + v*B.x +
      (1-u)*L.x + u*R.x -
      qx,
    y:
      (1-v)*T.y + v*B.y +
      (1-u)*L.y + u*R.y -
      qy,
  };
}

// 사진과 같은 방식으로 띠 전체의 곡선 외곽을 제한해 모서리 밖에 그려지지 않게 합니다.
function traceRibbon(ctx) {
  ctx.beginPath();
  const start = ribbonTop(0);
  ctx.moveTo(start.x, start.y);
  for (let i = 1; i <= 80; i++) {
    const p = ribbonTop(i / 80);
    ctx.lineTo(p.x, p.y);
  }
  for (let i = 1; i <= 80; i++) {
    const p = ribbonRight(i / 80);
    ctx.lineTo(p.x, p.y);
  }
  for (let i = 79; i >= 0; i--) {
    const p = ribbonBottom(i / 80);
    ctx.lineTo(p.x, p.y);
  }
  for (let i = 79; i >= 1; i--) {
    const p = ribbonLeft(i / 80);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}

function makeRibbonStrip(participantName, messages, now, started, tickerState, priorityMessageId) {
  // 매 프레임 새 Canvas를 만들지 않고 같은 버퍼를 지워서 다시 사용합니다.
  if (!tickerState.strip) {
    tickerState.strip = document.createElement('canvas');
    tickerState.strip.width = 1050;
    tickerState.strip.height = 120;
    tickerState.started = started;
    tickerState.messages = messages;
    tickerState.name = participantName;
    if (messages[0]?.id === priorityMessageId) tickerState.handledPriorityId = priorityMessageId;
  }
  const strip = tickerState.strip;
  const sctx = strip.getContext('2d');
  const speed = 82 * (strip.width / 1400);
  // 목록 길이가 바뀌어도 현재 문구를 갑자기 점프시키지 않습니다.
  // 한 바퀴 경계에서 최신 목록으로 바꾸고 남은 이동 거리도 이어받습니다.
  const traveled = Math.max(0, (now - tickerState.started) / 1000) * speed;
  if (!tickerState.priorityTransition && tickerState.cycle && traveled >= tickerState.cycle) {
    const remainder = traveled % tickerState.cycle;
    tickerState.started = now - remainder / speed * 1000;
    tickerState.messages = messages;
    tickerState.name = participantName;
    tickerState.priorityText = null;
  }
  const latestMessages = messages;
  messages = tickerState.messages;
  participantName = tickerState.name;
  sctx.clearRect(0, 0, strip.width, strip.height);

  // 원본 리본 색상 계열
  const bg = sctx.createLinearGradient(0, 0, strip.width, 0);
  bg.addColorStop(0, '#372460');
  bg.addColorStop(.55, '#302058');
  bg.addColorStop(1, '#241a4b');
  sctx.fillStyle = bg;
  sctx.fillRect(0, 0, strip.width, strip.height);

  // 글자만 별도 버퍼에 그려 띠 배경·외곽을 움직이지 않고 높이를 보정합니다.
  if (!tickerState.textLayer) {
    tickerState.textLayer = document.createElement('canvas');
    tickerState.textLayer.width = strip.width;
    tickerState.textLayer.height = strip.height;
  }
  const textLayer = tickerState.textLayer;
  const textContext = textLayer.getContext('2d');
  textContext.clearRect(0, 0, textLayer.width, textLayer.height);

  const name = String(participantName || '').trim().slice(0, 18);

  const rows = (messages || [])
    .filter(m => m?.message && m.status !== 'hidden')
    .slice(0, 12);

  const separator = '   ♡   ';
  const formatMessage = m => {
    const nick = String(m.nickname || '').trim();
    const msg = String(m.message || '').trim();
    return nick ? `${nick} · ${msg}` : msg;
  };
  let messageText = tickerState.priorityText || (rows.length
    ? rows.map(formatMessage).join(separator)
    : 'CONNECT WALL');

  // 폰트의 em 박스 대신 실제 글자 위·아래 높이로 띠의 중앙을 맞춥니다.
  textContext.textBaseline = 'alphabetic';
  textContext.fillStyle = '#fff';
  textContext.shadowColor = 'rgba(0,0,0,.55)';
  textContext.shadowBlur = 2;

  // 곡면 가장자리에는 글자와 그림자가 닿지 않도록 안쪽 여백을 둡니다.
  const edgePadding = 36;
  const verticalPadding = 12;
  const tickerLeft = name ? 218 : edgePadding;
  const tickerRight = strip.width - edgePadding;

  // 긴 이름도 고정 이름 영역 안에 표시해 흐르는 메시지와 겹치지 않게 합니다.
  if (name) {
    const nameWidth = tickerLeft - edgePadding - 24;
    textContext.save();
    textContext.beginPath();
    textContext.rect(edgePadding, verticalPadding, nameWidth, strip.height - verticalPadding * 2);
    textContext.clip();
    textContext.font = '800 38px Arial, sans-serif';
    if (tickerState.measuredName !== name) {
      const metrics = textContext.measureText(name);
      tickerState.measuredName = name;
      tickerState.nameBaseline = strip.height / 2 + ((metrics.actualBoundingBoxAscent ?? 30) - (metrics.actualBoundingBoxDescent ?? 8)) / 2;
    }
    textContext.fillText(name, edgePadding, tickerState.nameBaseline, nameWidth);
    textContext.restore();
  }

  textContext.save();
  textContext.beginPath();
  textContext.rect(tickerLeft, verticalPadding, tickerRight - tickerLeft, strip.height - verticalPadding * 2);
  textContext.clip();

  textContext.font = '700 38px Arial, sans-serif';

  const priorityMessage = (latestMessages || []).find(m => m.id === priorityMessageId && m.message && m.status !== 'hidden');
  if (priorityMessage && !tickerState.priorityTransition && tickerState.handledPriorityId !== priorityMessageId && tickerState.cycle) {
    const oldText = tickerState.text;
    const oldShift = (Math.max(0, (now - tickerState.started) / 1000) * speed) % tickerState.cycle;
    const visibleEnd = oldShift + tickerRight - tickerLeft;
    // 한 바퀴를 기다리지 않으며, 현재 보이는 문구·속도·위치는 바꾸지 않습니다.
    const nextCycleOffset = tickerState.cycle;
    const starts = [0];
    let search = 0;
    while ((search = oldText.indexOf(separator, search)) !== -1) {
      search += separator.length;
      starts.push(search);
    }
    let prefixWidth = 0;
    for (const index of starts) {
      const candidate = oldText.slice(0, index);
      const width = textContext.measureText(candidate).width;
      if (width >= visibleEnd) { prefixWidth = width; break; }
    }
    if (!prefixWidth) {
      // 끝부분이 보이는 때에는 다음 복사본의 보이는 부분까지 보존합니다.
      let index = starts.find(i => nextCycleOffset + textContext.measureText(oldText.slice(0, i)).width >= visibleEnd);
      if (index === undefined) index = oldText.length;
      prefixWidth = nextCycleOffset + textContext.measureText(oldText.slice(0, index)).width;
    }
    const prioritized = [priorityMessage, ...(latestMessages || []).filter(m => m.id !== priorityMessageId && m.message && m.status !== 'hidden')].slice(0, 12);
    const nextText = prioritized.map(formatMessage).join(separator);
    // 줄 전체를 교체하지 않고 기존 글자와 새 목록을 별도로 그려 경계를 정확히 이어 줍니다.
    tickerState.priorityTransition = { oldText, oldCycle: tickerState.cycle, oldShift, prefixWidth, nextText, began: now };
    tickerState.messages = prioritized;
    tickerState.handledPriorityId = priorityMessageId;
  }

  // 동일한 문구의 폭은 캐시해 매 프레임 텍스트 측정을 반복하지 않습니다.
  if (tickerState.text !== messageText) {
    tickerState.text = messageText;
    const metrics = textContext.measureText(messageText);
    tickerState.textWidth = Math.max(1, metrics.width);
    // 곡면에 매핑되기 전 글자의 시각적 중심을 맞춰 오른쪽에서도 위로 붙지 않게 합니다.
    tickerState.messageBaseline = strip.height / 2 + ((metrics.actualBoundingBoxAscent ?? 30) - (metrics.actualBoundingBoxDescent ?? 8)) / 2;
  }
  const textWidth = tickerState.textWidth;
  const gap = 150;
  const cycle = textWidth + gap;
  tickerState.cycle = cycle;
  const elapsed = (now - tickerState.started) / 1000;
  const shift = (elapsed * speed) % cycle;

  const transition = tickerState.priorityTransition;
  if (transition) {
    const moved = Math.max(0, (now - transition.began) / 1000) * speed;
    const oldOffset = transition.oldShift + moved;
    // 이전 문구는 경계까지만 유지하고 새 문구는 같은 속도로 오른쪽에서 들어옵니다.
    textContext.save();
    textContext.beginPath();
    textContext.rect(tickerLeft, 0, Math.max(0, transition.prefixWidth - oldOffset), strip.height);
    textContext.clip();
    let oldX = tickerLeft - (oldOffset % transition.oldCycle);
    for (; oldX < strip.width; oldX += transition.oldCycle) {
      textContext.fillText(transition.oldText, oldX, tickerState.messageBaseline);
    }
    textContext.restore();
    const nextX = tickerLeft + transition.prefixWidth - oldOffset;
    textContext.fillText(transition.nextText, nextX, tickerState.messageBaseline);
    if (nextX <= tickerLeft) {
      // 새 문구가 기준점에 닿으면 일반 순차 재생으로 돌아갑니다.
      tickerState.started = now - Math.max(0, tickerLeft - nextX) / speed * 1000;
      tickerState.priorityText = transition.nextText;
      tickerState.priorityTransition = null;
    }
  } else {
    let x = tickerLeft - shift;
    while (x > tickerLeft - cycle) x -= cycle;
    for (; x < strip.width + cycle; x += cycle) {
      textContext.fillText(messageText, x, tickerState.messageBaseline);
    }
  }

  textContext.restore();

  // 중앙부터 완만하게 내려 오른쪽 끝을 약 2px(전광판 원본 좌표) 낮춥니다.
  // 위치에 따른 보정이므로 문구가 이동할 때도 높이가 갑자기 바뀌지 않습니다.
  for (let sliceX = 0; sliceX < strip.width; sliceX += 4) {
    const sliceWidth = Math.min(4, strip.width - sliceX);
    const progress = Math.max(0, Math.min(1, (sliceX / strip.width - .35) / .65));
    const offsetY = 8 * progress * progress * (3 - 2 * progress);
    sctx.drawImage(textLayer, sliceX, 0, sliceWidth, strip.height, sliceX, offsetY, sliceWidth, strip.height);
  }

  return strip;
}

function drawRibbon(ctx, participantName, messages, now, started, tickerState, priorityMessageId) {
  const strip = makeRibbonStrip(participantName, messages, now, started, tickerState, priorityMessageId);

  const COLS = 42;
  const ROWS = 8;

  ctx.save();
  traceRibbon(ctx);
  // 원본 영상 글귀가 삼각형 사이·외곽의 반투명 픽셀로 비치지 않도록 먼저 불투명하게 덮습니다.
  const base = ctx.createLinearGradient(RTL.x, 0, RTR.x, 0);
  base.addColorStop(0, '#372460');
  base.addColorStop(.55, '#302058');
  base.addColorStop(1, '#241a4b');
  ctx.fillStyle = base;
  ctx.fill();
  ctx.strokeStyle = base;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.clip();

  for (let row = 0; row < ROWS; row++) {
    const v0 = row / ROWS;
    const v1 = (row + 1) / ROWS;

    for (let col = 0; col < COLS; col++) {
      const u0 = col / COLS;
      const u1 = (col + 1) / COLS;

      const sx0 = strip.width * u0;
      const sx1 = strip.width * u1;
      const sy0 = strip.height * v0;
      const sy1 = strip.height * v1;

      const p00 = ribbonPoint(u0, v0);
      const p10 = ribbonPoint(u1, v0);
      const p01 = ribbonPoint(u0, v1);
      const p11 = ribbonPoint(u1, v1);

      drawTriangle(
        ctx, strip,
        P(sx0, sy0), P(sx1, sy0), P(sx0, sy1),
        p00, p10, p01, 0.35
      );

      drawTriangle(
        ctx, strip,
        P(sx1, sy0), P(sx1, sy1), P(sx0, sy1),
        p10, p11, p01, 0.35
      );
    }
  }

  ctx.restore();
}

export default function CurvedBillboardCanvas({
  photoUrl,
  backgroundVideoUrl = '',
  messages = [],
  participantName = '',
  priorityMessageId = '',
}) {
  const canvasRef = useRef(null);
  const tickerDataRef = useRef({ messages, participantName, priorityMessageId });
  useEffect(() => {
    // 15초마다 목록이 갱신되어도 이미지와 이동 시계를 다시 시작하지 않습니다.
    tickerDataRef.current = { messages, participantName, priorityMessageId };
  }, [messages, participantName, priorityMessageId]);

  useEffect(() => {
    if (!photoUrl) return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;
    canvas.width = W;
    canvas.height = H;
    let stopped = false;
    let raf = 0;
    const started = performance.now();

    // 재생 실패·CORS 오류·버퍼링 시 정적 배경을 사용합니다. 음성은 재생하지 않습니다.
    const backgroundVideo = backgroundVideoUrl ? document.createElement('video') : null;
    let videoFailed = false;
    if (backgroundVideo) {
      backgroundVideo.crossOrigin = 'anonymous';
      backgroundVideo.muted = true;
      backgroundVideo.loop = true;
      backgroundVideo.playsInline = true;
      backgroundVideo.preload = 'auto';
      backgroundVideo.onerror = () => { videoFailed = true; };
      backgroundVideo.src = backgroundVideoUrl;
      backgroundVideo.play().catch(() => { videoFailed = true; });
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (stopped) return;
      let surfaceKey;
      const tickerState = {};
      const makeLayer = () => {
        const layer = document.createElement('canvas');
        layer.width = W;
        layer.height = H;
        return layer;
      };
      const mappedPhoto = makeLayer();
      const mappedVideo = makeLayer();
      const mappedContext = mappedPhoto.getContext('2d');
      let foregroundSurface;
      const videoContext = mappedVideo.getContext('2d');
      const videoSurface = document.createElement('canvas');
      const surfaceContext = videoSurface.getContext('2d');
      let lastVideoTime = -1;
      let lastVideoRender = -Infinity;
      let videoFrameReady = false;
      const render = (now) => {
        if (stopped) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const language = document.documentElement.lang || 'ko';
        const name = tickerDataRef.current.participantName;
        const nextKey = JSON.stringify([language, name]);
        if (nextKey !== surfaceKey) {
          const photoSurface = makePhotoSurface(img, name, language);
          foregroundSurface = makePhotoSurface(img, name, language, true);
          for (const layerContext of [mappedContext]) {
            layerContext.clearRect(0, 0, W, H);
            layerContext.imageSmoothingEnabled = true;
            layerContext.imageSmoothingQuality = 'high';
          }
          drawMainPhoto(mappedContext, photoSurface);
          // 문구·사진을 영상에 먼저 합성한 뒤 한 번만 곡면화해 반투명 겹침 격자를 방지합니다.
          lastVideoTime = -1;
          lastVideoRender = -Infinity;
          videoFrameReady = false;
          if (videoSurface.width !== photoSurface.width || videoSurface.height !== photoSurface.height) {
            videoSurface.width = photoSurface.width;
            videoSurface.height = photoSurface.height;
            videoFrameReady = false;
          }
          surfaceKey = nextKey;
        }
        const videoAvailable = backgroundVideo && !videoFailed && !backgroundVideo.paused
          && backgroundVideo.readyState >= 2 && backgroundVideo.videoWidth > 0;
        // 영상은 최대 24fps의 가벼운 곡면 망으로 갱신하고 띠는 기존 애니메이션을 유지합니다.
        if (videoAvailable && (now - lastVideoRender >= 1000 / 24) && backgroundVideo.currentTime !== lastVideoTime) {
          try {
            const crop = coverCrop({ width: backgroundVideo.videoWidth, height: backgroundVideo.videoHeight }, videoSurface.width / videoSurface.height);
            surfaceContext.fillStyle = '#8575b4';
            surfaceContext.fillRect(0, 0, videoSurface.width, videoSurface.height);
            surfaceContext.save();
            surfaceContext.filter = 'brightness(0.9) saturate(0.9)';
            surfaceContext.drawImage(backgroundVideo, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, videoSurface.width, videoSurface.height);
            surfaceContext.restore();
            surfaceContext.drawImage(foregroundSurface, 0, 0);
            videoContext.clearRect(0, 0, W, H);
            drawMainPhoto(videoContext, videoSurface, { columns: 24, rows: 32 });
            lastVideoTime = backgroundVideo.currentTime;
            lastVideoRender = now;
            videoFrameReady = true;
          } catch {
            videoFailed = true;
          }
        }
        // 반복 재생·일시적인 버퍼링 중에는 마지막 영상 프레임을 유지합니다.
        // 아직 프레임이 없거나 실제 재생 오류가 발생한 경우에만 정적 배경을 사용합니다.
        if (videoFrameReady && !videoFailed) {
          ctx.drawImage(mappedVideo, 0, 0);
        } else {
          ctx.drawImage(mappedPhoto, 0, 0);
        }
        drawRibbon(ctx, tickerDataRef.current.participantName, tickerDataRef.current.messages, now, started, tickerState, tickerDataRef.current.priorityMessageId);
        raf = requestAnimationFrame(render);
      };
      raf = requestAnimationFrame(render);
    };
    img.src = photoUrl;
    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      img.onload = null;
      if (backgroundVideo) {
        backgroundVideo.onerror = null;
        backgroundVideo.pause();
        backgroundVideo.removeAttribute('src');
        backgroundVideo.load();
      }
    };
  }, [photoUrl, backgroundVideoUrl]);

  if (!photoUrl) return null;

  return (
    <canvas
      ref={canvasRef}
      className="kkugi-curved-billboard-canvas"
      aria-label="K-Culture curved LED billboard"
    />
  );
}

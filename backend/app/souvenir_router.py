"""기념사진 전용 API.

핵심 목표
- 배우 무대 이미지는 그대로 사용합니다.
- 사용자가 선택한 캐릭터 이미지도 그대로 사용합니다.
- AI로 다시 얼굴/캐릭터를 생성하지 않습니다.
- 코드 합성만 사용하므로, 남자 캐릭터를 골랐는데 여자 캐릭터로 바뀌는 문제를 막습니다.

결과
- 마지막 기념사진과 전광판 모두 같은 기념사진 파일을 사용하게 됩니다.
- 선택 캐릭터가 바뀌지 않고, 새 참가자 세션은 이전 사진을 재사용하지 않습니다.
"""
from __future__ import annotations

import base64
import hashlib
import io
import logging
from collections import deque
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, Field

router = APIRouter()


class SouvenirPhotoRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=100)
    nickname: str = Field(default="PRODUCER", max_length=40)
    character_url: str = Field(min_length=1, max_length=2048)
    character_key: str = Field(default="mina", max_length=80)
    artist_url: str = Field(default="", max_length=2048)
    artist_key: str = Field(default="", max_length=100)
    stage_url: str = Field(default="", max_length=2048)
    stage_key: str = Field(default="", max_length=100)


def _load_character(payload: SouvenirPhotoRequest) -> Image.Image:
    """현재 프로젝트 안에서 만든 캐릭터만 읽습니다.

    허용 대상
    1) 기본 캐릭터 (/characters/...)
    2) 백엔드 generated 폴더 이미지
    3) Supabase public storage 이미지
    """
    from . import main as core

    url = payload.character_url

    if url.startswith('/characters/'):
        if payload.character_key not in core.DEFAULT_CHARACTERS:
            raise HTTPException(400, '기본 캐릭터를 다시 선택해 주세요.')
        target = core.BASE_DIR / 'assets' / 'characters' / f'{payload.character_key}.png'
        if not target.is_file():
            raise HTTPException(400, '기본 캐릭터 이미지가 없습니다.')
        raw = target.read_bytes()
    else:
        parsed = urlparse(url)
        storage_host = urlparse(core.SUPABASE_URL).hostname
        generated_host = urlparse(core.BACKEND_PUBLIC_URL).hostname

        from_storage = (
            parsed.scheme == 'https'
            and storage_host
            and parsed.hostname == storage_host
            and '/storage/v1/object/public/k-culture-media/' in parsed.path
        )
        from_generated = (
            parsed.scheme in ('http', 'https')
            and parsed.hostname in {generated_host, 'localhost', '127.0.0.1'}
            and parsed.path.startswith('/generated/')
            and '..' not in parsed.path
        )

        if from_generated:
            target = core.GENERATED_DIR / Path(parsed.path).name
            if not target.is_file() or target.stat().st_size > 10 * 1024 * 1024:
                raise HTTPException(400, '참가자 캐릭터 파일을 찾지 못했습니다.')
            raw = target.read_bytes()
        elif from_storage:
            try:
                request = Request(url, headers={'User-Agent': 'KCultureProducer/1.0'})
                with urlopen(request, timeout=15) as response:
                    raw = response.read(10 * 1024 * 1024 + 1)
                if len(raw) > 10 * 1024 * 1024:
                    raise HTTPException(400, '캐릭터 이미지가 너무 큽니다.')
            except HTTPException:
                raise
            except Exception as exc:
                logging.exception('Souvenir character download failed')
                raise HTTPException(400, '캐릭터 이미지를 불러오지 못했습니다.') from exc
        else:
            raise HTTPException(400, '현재 프로젝트 캐릭터 이미지만 사용할 수 있습니다.')

    try:
        with Image.open(io.BytesIO(raw)) as image:
            image.load()
            if image.width * image.height > 24_000_000:
                raise HTTPException(400, '캐릭터 이미지가 너무 큽니다.')
            image = ImageOps.exif_transpose(image).convert('RGBA')
            # 너무 큰 이미지는 미리 줄여서 합성 속도를 안정화합니다.
            image.thumbnail((1200, 1400), Image.Resampling.LANCZOS)
            return image
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(400, '캐릭터 이미지 형식을 확인해 주세요.') from exc



def _load_admin_asset(url: str) -> Image.Image | None:
    """관리자가 등록한 Supabase/백엔드 이미지만 읽습니다."""
    from . import main as core
    value=(url or '').strip()
    if not value:
        return None
    parsed=urlparse(value)
    storage_host=urlparse(core.SUPABASE_URL).hostname
    generated_host=urlparse(core.BACKEND_PUBLIC_URL).hostname
    raw=None
    if parsed.scheme in ('http','https') and parsed.hostname in {generated_host,'localhost','127.0.0.1'} and parsed.path.startswith('/generated/') and '..' not in parsed.path:
        target=core.GENERATED_DIR / Path(parsed.path).name
        if target.is_file(): raw=target.read_bytes()
    elif parsed.scheme=='https' and storage_host and parsed.hostname==storage_host and '/storage/v1/object/public/k-culture-media/' in parsed.path:
        try:
            with urlopen(Request(value,headers={'User-Agent':'KCultureProducer/1.0'}),timeout=15) as response:
                raw=response.read(12*1024*1024+1)
        except Exception as exc:
            logging.exception('Admin asset download failed')
            raise HTTPException(400,'관리자 등록 이미지를 불러오지 못했습니다.') from exc
    if not raw or len(raw)>12*1024*1024:
        raise HTTPException(400,'관리자 등록 이미지 주소를 확인해 주세요.')
    try:
        with Image.open(io.BytesIO(raw)) as image:
            image.load()
            return ImageOps.exif_transpose(image).convert('RGBA')
    except Exception as exc:
        raise HTTPException(400,'관리자 등록 이미지 형식을 확인해 주세요.') from exc


def _cut_background(character: Image.Image) -> Image.Image:
    """밝은 단색 스튜디오 배경만 최대한 안전하게 제거합니다.

    - 이미 투명 배경이면 그대로 사용
    - 인물 내부는 건드리지 않기 위해 테두리에서 연결된 픽셀만 제거
    """
    if character.getchannel('A').getextrema()[0] < 255:
        return character

    w, h = character.size
    px = character.load()
    corners = [px[2, 2], px[w - 3, 2], px[2, h - 3], px[w - 3, h - 3]] if w > 6 and h > 6 else [px[0, 0]]

    # 배경이 너무 어두우면 무리하게 제거하지 않고 원본 유지
    if sum(min(c[:3]) for c in corners) / len(corners) < 190:
        return character

    bg = tuple(sorted(c[i] for c in corners)[len(corners) // 2] for i in range(3))

    def is_background(x: int, y: int) -> bool:
        r, g, b, _ = px[x, y]
        return (
            min(r, g, b) > 165
            and max(r, g, b) - min(r, g, b) < 68
            and max(abs(r - bg[0]), abs(g - bg[1]), abs(b - bg[2])) < 49
        )

    visited = bytearray(w * h)
    queue = deque()
    for x in range(w):
        queue.extend(((x, 0), (x, h - 1)))
    for y in range(h):
        queue.extend(((0, y), (w - 1, y)))

    mask = Image.new('L', (w, h), 255)
    alpha = mask.load()

    while queue:
        x, y = queue.popleft()
        index = y * w + x
        if visited[index]:
            continue
        visited[index] = 1
        if not is_background(x, y):
            continue
        alpha[x, y] = 0
        if x > 0:
            queue.append((x - 1, y))
        if x < w - 1:
            queue.append((x + 1, y))
        if y > 0:
            queue.append((x, y - 1))
        if y < h - 1:
            queue.append((x, y + 1))

    character.putalpha(mask.filter(ImageFilter.GaussianBlur(0.8)))
    return character


def _add_ground_shadow(stage: Image.Image, char_x: int, char_y: int, char_w: int, char_h: int, floor_y: int) -> None:
    """캐릭터 아래에 약한 그림자를 추가해서 떠 보이지 않게 합니다."""
    shadow_layer = Image.new('RGBA', stage.size, (0, 0, 0, 0))

    shadow_w = int(char_w * 0.72)
    shadow_h = max(18, int(char_w * 0.14))
    mask = Image.new('L', (shadow_w, shadow_h), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, shadow_w - 1, shadow_h - 1), fill=145)
    mask = mask.filter(ImageFilter.GaussianBlur(max(6, shadow_h // 4)))

    shadow = Image.new('RGBA', (shadow_w, shadow_h), (0, 0, 0, 0))
    shadow.putalpha(mask)

    shadow_x = char_x + (char_w - shadow_w) // 2
    shadow_y = floor_y - shadow_h // 3
    shadow_layer.alpha_composite(shadow, (shadow_x, shadow_y))
    stage.alpha_composite(shadow_layer)


def _place_subject(stage: Image.Image, subject: Image.Image, *, center_x: float, floor_ratio: float, max_w_ratio: float, max_h_ratio: float) -> int:
    subject=_cut_background(subject)
    bounds=subject.getchannel('A').getbbox()
    if not bounds: return 0
    subject=subject.crop(bounds)
    width,height=stage.size
    subject.thumbnail((int(width*max_w_ratio),int(height*max_h_ratio)),Image.Resampling.LANCZOS)
    floor_y=int(height*floor_ratio)
    x=int(width*center_x-subject.width/2)
    y=max(0,floor_y-subject.height)
    _add_ground_shadow(stage,x,y,subject.width,subject.height,floor_y)
    stage.alpha_composite(subject,(x,y))
    # 원본 여백을 제외하고 실제로 배치한 높이를 다음 인물의 기준으로 전달합니다.
    return subject.height


def _add_contact_shadow(stage: Image.Image, *, center_x: float, floor_ratio: float, width_ratio: float) -> None:
    """생성형 AI 없이 인물 발밑에 은은한 접지 그림자만 추가합니다."""
    from PIL import ImageDraw, ImageFilter
    w, h = stage.size
    layer = Image.new("RGBA", stage.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    cx, cy = int(w * center_x), int(h * floor_ratio)
    rx, ry = int(w * width_ratio / 2), max(3, int(h * .012))
    draw.ellipse((cx-rx, cy-ry, cx+rx, cy+ry), fill=(0, 0, 0, 52))
    layer = layer.filter(ImageFilter.GaussianBlur(max(3, int(w * .007))))
    stage.alpha_composite(layer)


def _compose(stage: Image.Image, character: Image.Image, artist: Image.Image | None = None) -> Image.Image:
    """무대 + 연예인 캐릭터 + 참가자 캐릭터를 레이어 합성합니다."""
    stage=stage.convert('RGBA')
    # 배우의 기존 무대 위치와 바닥선(.805)은 유지하고 실제 배치 높이를 비교합니다.
    if artist is not None:
        artist_height = _place_subject(stage,artist,center_x=.465,floor_ratio=.805,max_w_ratio=.185,max_h_ratio=.50)
        # 배우가 폭 제한 또는 작은 원본 때문에 낮아져도 캐릭터가 더 커지지 않게 합니다.
        # 캐릭터의 비율은 유지하며, 실제 배우 높이의 92%와 기존 높이 제한 중 작은 값을 씁니다.
        character_height_ratio = min(.455, max(1, int(artist_height * .92)) / stage.height) if artist_height else .455
        # 캐릭터만 바닥선을 1.5% 위로 옮겨 배우보다 앞에 서 있는 인상을 완화합니다.
        # 같은 floor_ratio로 발과 접지 그림자를 함께 배치하며, 인물 크기·비율은 유지합니다.
        character_floor_ratio = .790 if artist_height else .805
        _place_subject(stage,character,center_x=.555,floor_ratio=character_floor_ratio,max_w_ratio=.165,max_h_ratio=character_height_ratio)
    else:
        _place_subject(stage,character,center_x=.51,floor_ratio=.805,max_w_ratio=.175,max_h_ratio=.47)
    # 원본 무대의 16:9 구도를 그대로 유지합니다. 기존 완성사진 위에 덮는 방식이 아닙니다.
    return stage.convert('RGB')



def _ai_naturalize(composed: Image.Image) -> tuple[Image.Image, bool]:
    """완성된 합성본의 인물 정체성은 유지하고 조명/그림자/공간감만 자연화합니다.

    AI 호출이 실패하거나 API 키가 없으면 원래 합성본을 그대로 반환합니다.
    따라서 기념사진/전광판 흐름이 AI 때문에 멈추지 않습니다.
    """
    from . import main as core
    if not getattr(core, 'OPENAI_API_KEY', ''):
        return composed, False
    source = io.BytesIO()
    composed.convert('RGB').save(source, 'PNG')
    source.seek(0)
    source.name = 'souvenir_composite.png'
    prompt = (
        'Enhance this exact finished K-culture souvenir photo without redesigning it. '
        'Preserve the exact two people, their faces, identity, hairstyle, clothing, body proportions, pose, '
        'stage composition and camera framing. Do not add, remove, replace, duplicate or regenerate any person. '
        'Only harmonize stage lighting on the subjects, contact shadows at their feet, subtle floor reflections, '
        'edge integration, depth, atmospheric glow and cinematic color grading so the existing composite feels '
        'like one premium 3D concert photograph. Keep text and background structures unchanged. Photorealistic lighting, '
        'clean premium K-pop concert finish, no new objects.'
    )
    try:
        result = core.get_openai_client().images.edit(
            model=core.OPENAI_IMAGE_MODEL, image=source, prompt=prompt,
            size='1536x1024', quality='medium', output_format='png',
        )
        raw = base64.b64decode(result.data[0].b64_json)
        with Image.open(io.BytesIO(raw)) as enhanced:
            enhanced.load()
            # 화면 레이아웃은 기존 16:9를 유지합니다.
            final = ImageOps.fit(enhanced.convert('RGB'), composed.size, method=Image.Resampling.LANCZOS)
            return final, True
    except Exception:
        logging.exception('Souvenir AI naturalization failed; deterministic composite will be used')
        return composed, False


@router.get('/api/souvenir-stage/preview')
def preview_default_stage():
    """관리자에게 기존 무대 원본을 미리 보여줍니다. 업로드/기존 생성 기능에는 영향 없음."""
    from . import main as core
    path = core.BASE_DIR / 'assets' / 'souvenir_stage.png'
    if not path.is_file():
        raise HTTPException(404, '기본 무대 이미지가 없습니다.')
    return FileResponse(path, media_type='image/png')


@router.post('/api/souvenir-photo')
def generate_souvenir_photo(payload: SouvenirPhotoRequest):
    from . import main as core

    # 현재 참가자 세션 확인
    if core.supabase:
        rows = core.supabase.table('experience_sessions').select('id').eq('id', payload.session_id).limit(1).execute().data
        if not rows:
            raise HTTPException(404, '참가자 세션을 찾을 수 없습니다.')
    elif payload.session_id not in core.DEMO['sessions']:
        raise HTTPException(404, '참가자 세션을 찾을 수 없습니다.')

    # 관리자가 별도 등록한 기념사진용 무대 이미지가 있으면 그 이미지만 우선 사용합니다.
    # 기존 V01~V08 영상·전광판 이미지는 변경하지 않습니다.
    source_url = (payload.stage_url or '').strip()
    if core.supabase and not source_url:
        rows = (core.supabase.table('media_contents').select('id,file_url')
                .eq('scene', 'SOUVENIR_STAGE').eq('kind', 'image').eq('active', True)
                .order('created_at', desc=True).limit(1).execute().data)
        source_url = (rows[0].get('file_url') or '') if rows else ''

    # 새 무대 이미지를 등록해도 예전 합성 사진 캐시가 재사용되지 않도록 source_url을 포함합니다.
    # 합성 비율·바닥선이 바뀐 결과는 이전 서버 캐시와 분리합니다. 기존 결과는 보존합니다.
    digest_source = f'souvenir-stage-v292-depth92|{payload.session_id}|{payload.character_url}|{payload.character_key}|{payload.artist_url}|{payload.artist_key}|{source_url}|{payload.stage_key}'
    digest = hashlib.sha256(digest_source.encode()).hexdigest()[:32]
    cache = core.GENERATED_DIR / f'souvenir_v18_{digest}.txt'
    if cache.exists():
        return {'image_url': cache.read_text(encoding='utf-8').strip(), 'reused': True}

    stage_path = core.BASE_DIR / 'assets' / 'souvenir_stage.png'
    if not stage_path.is_file():
        raise HTTPException(500, '무대 원본 이미지를 찾지 못했습니다.')

    try:
        with Image.open(stage_path) as default_stage:
            default_base = default_stage.convert('RGBA')
            stage_size = default_stage.size
        # 관리자 URL이 예전 값/로컬 주소여도 기념사진 전체가 실패하지 않게 기본 무대로 안전하게 대체합니다.
        base = default_base
        if source_url:
            try:
                uploaded_stage = _load_admin_asset(source_url)
                if uploaded_stage is not None:
                    base = ImageOps.fit(uploaded_stage, stage_size, method=Image.Resampling.LANCZOS)
            except HTTPException:
                logging.warning('Invalid souvenir stage URL; falling back to bundled stage: %s', source_url)
        artist_image = None
        if payload.artist_url:
            try:
                artist_image = _load_admin_asset(payload.artist_url)
            except HTTPException:
                logging.warning('Invalid artist URL; souvenir will continue without artist layer: %s', payload.artist_url)
        composed = _compose(base, _load_character(payload), artist_image)
        # V28.7: 생성형 AI 재편집을 사용하지 않습니다.
        # 배우/캐릭터 원본 PNG를 그대로 유지하는 결정적 레이어 합성만 저장합니다.
        final_image = composed
        ai_enhanced = False
        output = io.BytesIO()
        final_image.save(output, 'PNG')
        image_url = core.save_generated_image(output.getvalue(), 'souvenir_v28')
        cache.write_text(image_url, encoding='utf-8')
        return {'image_url': image_url, 'reused': False, 'ai_enhanced': ai_enhanced}
    except HTTPException:
        raise
    except Exception as exc:
        logging.exception('Souvenir compositing failed')
        raise HTTPException(500, '기념사진 합성 실패: FastAPI 로그를 확인해 주세요.') from exc

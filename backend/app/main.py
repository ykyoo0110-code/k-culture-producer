from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import time
import io
import os
import re
import tempfile
import uuid
from pathlib import Path
from PIL import Image, ImageOps, UnidentifiedImageError
from urllib.parse import urlparse, unquote
from urllib.request import Request, urlopen
from datetime import datetime, timezone
from typing import Literal
import logging
import json
import zipfile
import shutil
import subprocess

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response, UploadFile, File, Form, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

BASE_DIR = Path(__file__).resolve().parents[1]
# VS Code의 실행 폴더가 달라도 backend/.env를 정확히 읽습니다.
load_dotenv(BASE_DIR / ".env")
GENERATED_DIR = BASE_DIR / "generated"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)
BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL", "http://localhost:8000").rstrip("/")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "").strip()
ADMIN_SIGNING_KEY = os.getenv("ADMIN_SIGNING_KEY", "").strip()
OPENAI_IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1").strip()
OPENAI_TEXT_MODEL = os.getenv("OPENAI_TEXT_MODEL", "gpt-4.1-mini").strip()

app = FastAPI(title="K-CULTURE PRODUCER API", version="1.1.0")
app.mount("/generated", StaticFiles(directory=str(GENERATED_DIR)), name="generated")
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys([os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"), "http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"])),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase 설정이 없을 때도 수업/시연이 가능하도록 메모리 저장소를 사용합니다.
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

DEMO = {"sessions": {}, "messages": [], "certificates": [], "media": [], "characters": []}

# 관리자 로그인 토큰은 서버가 서명하며, 모든 쓰기/조회 관리 API에서 검증합니다.
def require_admin(authorization: str = Header(default="")):
    if not ADMIN_PASSWORD or not ADMIN_SIGNING_KEY:
        raise HTTPException(503, "관리자 암호와 서명 키를 backend/.env에 설정하세요.")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        expire, signature = token.split(".", 1)
        expected = hmac.new(ADMIN_SIGNING_KEY.encode(), expire.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected) or int(expire) < time.time():
            raise ValueError("invalid token")
    except (ValueError, TypeError):
        raise HTTPException(401, "관리자 로그인이 필요합니다.") from None
    return True

class AdminLogin(BaseModel):
    password: str


class AdminTranslateRequest(BaseModel):
    items: dict[str, str]

@app.post("/api/admin/login")
def admin_login(payload: AdminLogin):
    if not ADMIN_PASSWORD or not ADMIN_SIGNING_KEY:
        raise HTTPException(503, "backend/.env에 ADMIN_PASSWORD와 ADMIN_SIGNING_KEY를 설정하세요.")
    if not hmac.compare_digest(payload.password.encode(), ADMIN_PASSWORD.encode()):
        raise HTTPException(401, "관리자 암호가 올바르지 않습니다.")
    expire = str(int(time.time()) + 8 * 3600)
    signature = hmac.new(ADMIN_SIGNING_KEY.encode(), expire.encode(), hashlib.sha256).hexdigest()
    return {"token": f"{expire}.{signature}", "expires_in": 8 * 3600}

@app.get("/api/admin/overview", dependencies=[Depends(require_admin)])
def admin_overview():
    if supabase:
        return {
            "sessions": supabase.table("experience_sessions").select("id,nickname,language,current_step,current_scene,created_at").order("created_at", desc=True).limit(100).execute().data,
            "certificates": supabase.table("certificates").select("*").order("created_at", desc=True).limit(100).execute().data,
            "characters": supabase.table("user_characters").select("id,nickname,mode,character_key,image_url,created_at").order("created_at", desc=True).limit(100).execute().data,
            "messages": supabase.table("connect_messages").select("*").order("created_at", desc=True).limit(100).execute().data,
            "media": supabase.table("media_contents").select("*").order("created_at", desc=True).limit(100).execute().data,
        }
    return {"sessions": list(DEMO["sessions"].values()), "certificates": DEMO["certificates"], "characters": DEMO["characters"], "messages": DEMO["messages"], "media": DEMO["media"]}



class SessionCreate(BaseModel):
    language: str = "ja"
    nickname: str = ""


class SessionProgress(BaseModel):
    step: int = Field(ge=0, le=30)
    scene: str = ""
    language: str = "ja"
    decision: dict | None = None


class MessageCreate(BaseModel):
    session_id: str | None = None
    nickname: str = "ANONYMOUS"
    country: str = ""
    language: str = "ja"
    message: str = Field(min_length=1, max_length=120)


class CertificateCreate(BaseModel):
    session_id: str | None = None
    nickname: str
    producer_type: str
    score: int
    language: str = "ja"


class CertificatePdfProfile(BaseModel):
    image_url: str = ""
    character_key: str = "mina"


class CharacterCreate(BaseModel):
    session_id: str | None = None
    nickname: str = "PARTICIPANT"
    language: str = "ja"
    mode: Literal["basic", "prompt", "photo"] = "basic"
    character_key: str = "mina"
    prompt: str = ""
    image_url: str = "/characters/mina.svg"


class CharacterPrompt(BaseModel):
    session_id: str | None = None
    nickname: str = "PARTICIPANT"
    language: str = "ja"
    prompt: str = Field(min_length=1, max_length=600)


BANNED = ["http://", "https://", "www."]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_openai_client():
    """API 키는 서버의 backend/.env에서만 읽습니다."""
    if not OPENAI_API_KEY:
        raise HTTPException(503, "backend/.env에 OPENAI_API_KEY를 설정한 후 FastAPI를 재시작하세요.")
    try:
        from openai import OpenAI
        return OpenAI(api_key=OPENAI_API_KEY, timeout=120.0)
    except Exception as exc:
        logging.exception("OpenAI client initialization failed")
        raise HTTPException(500, "OpenAI SDK 초기화 실패: python -m pip install -U openai") from exc


def save_generated_image(image_bytes: bytes, prefix: str) -> str:
    """AI가 생성한 결과만 저장; 원본 사진은 보관하지 않습니다.

    Supabase 설정 시 기존 공개 미디어 버킷에 저장해 다른 컴퓨터에서도 보여줍니다.
    로컬 폴더 저장은 개발용 대체 경로이며 배포/다른 PC와 공유되지 않습니다.
    """
    filename = f"{prefix}_{uuid.uuid4().hex}.png"
    if supabase:
        path = f"AI_CHARACTERS/{filename}"
        try:
            bucket = supabase.storage.from_("k-culture-media")
            bucket.upload(path, image_bytes, {"content-type": "image/png"})
            return bucket.get_public_url(path)
        except Exception as exc:
            logging.exception("AI image storage failed")
            raise HTTPException(502, "AI 이미지 저장 실패: Supabase Storage 버킷과 권한을 확인하세요.") from exc
    target = GENERATED_DIR / filename
    target.write_bytes(image_bytes)
    return f"{BACKEND_PUBLIC_URL}/generated/{filename}"


def get_character_style_reference() -> io.BytesIO:
    """사용자 첨부 없이 기본 캐릭터의 그림체를 생성 기준으로 전달합니다."""
    target = BASE_DIR / "assets" / "character_style_reference.png"
    with Image.open(target) as original:
        image = ImageOps.exif_transpose(original).convert("RGBA")
        image.thumbnail((1536, 1536), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        image.save(output, format="PNG")
    output.seek(0)
    output.name = "default_character_style.png"
    return output


def character_prompt(user_prompt: str) -> str:
    return (
        "Create an original K-culture producer character for an interactive journalism project. "
        "The supplied image is a STYLE REFERENCE: match its head-to-body proportions, eye scale, materials, clothing detail and lighting. "
        "Create a different original person from the description; do not copy the reference face, gender, hairstyle, outfit or props unless requested. "
        "Do not imitate or reproduce a real celebrity or public figure. "
        "Show the entire character from head to toe, centered, with comfortable margin around the body. "
        "Cute polished stylized 3D character consistent with the existing Yuki traveler character lineup, soft studio lighting, isolated character on a transparent background, no scene, no floor, no text, no logo. "
        "The character should feel like a global K-culture fan or producer, suitable for a press-style producer pass. "
        f"User description: {user_prompt}"
    )


def photo_character_prompt() -> str:
    return (
        "Transform this uploaded photo into an original K-culture producer character. "
        "Preserve the person's recognizable facial features and overall identity, but render them as a cute polished stylized 3D character consistent with the existing Yuki traveler character lineup. "
        "Keep the whole body visible when present in the source image, centered from head to toe with margin. "
        "Do not turn the person into or imitate any real celebrity. "
        "Isolate the character on a transparent background without the original photo background, scenery or floor. No text, no logos, suitable for a producer pass and interactive journalism project."
    )


def moderation(text: str) -> tuple[str, str]:
    """간단한 1차 필터. 추후 LLM moderation으로 교체할 위치입니다."""
    normalized = text.strip()
    if any(token in normalized.lower() for token in BANNED):
        return "hidden", "link"
    if re.search(r"\b(?:spam|advertisement)\b", normalized, re.I):
        return "hidden", "spam"
    return "approved", "safe"


@app.get("/health")
def health():
    return {"ok": True, "storage": "supabase" if supabase else "demo", "database_verified": False, "image_ai": bool(OPENAI_API_KEY), "image_model": OPENAI_IMAGE_MODEL if OPENAI_API_KEY else None}


@app.get("/api/ai/status")
def ai_status():
    return {"image_ai": bool(OPENAI_API_KEY), "model": OPENAI_IMAGE_MODEL if OPENAI_API_KEY else None, "message": "ready" if OPENAI_API_KEY else "OPENAI_API_KEY required"}


class CharacterIdea(BaseModel):
    idea: str = Field(min_length=1, max_length=600)


@app.post("/api/ai/character-prompt")
def make_character_prompt(payload: CharacterIdea):
    """참가자의 짧은 아이디어를 기존 유키 계열 캐릭터 제작 설명으로 구체화합니다."""
    client = get_openai_client()
    try:
        result = client.responses.create(
            model=OPENAI_TEXT_MODEL,
            instructions=(
                "Write a compact English character design prompt, 50-85 words, based on the user's idea. "
                "Use an original, friendly K-culture traveler, a polished stylized 3D look matching the Yuki character lineup; "
                "full body visible including head and shoes, centered, natural anatomy, isolated on a transparent background with no scenery or floor, "
                "consistent soft studio lighting, no text, no watermark, no celebrities. "
                "If the user requests a real person's likeness, replace it with an original person. "
                "Return the prompt only, no commentary."
            ),
            input=payload.idea,
            max_output_tokens=220,
        )
        prompt = (result.output_text or "").strip()
        if not prompt:
            raise RuntimeError("empty AI prompt")
        return {"prompt": prompt}
    except Exception as exc:
        logging.exception("Character prompt generation failed")
        raise HTTPException(502, "AI 프롬프트 생성 실패: API 설정·모델 권한·결제 한도를 확인하세요.") from exc


@app.post("/api/sessions")
def create_session(payload: SessionCreate):
    row = {
        "id": str(uuid.uuid4()),
        "language": payload.language,
        "nickname": payload.nickname,
        "current_step": 0,
        "current_scene": "V01",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    if supabase:
        try:
            result = supabase.table("experience_sessions").insert(row).execute()
            if not result.data:
                raise RuntimeError("Supabase insert returned no rows")
            return result.data[0]
        except Exception as exc:
            # API 키, URL 등 민감정보를 사용자 응답 또는 로그에 출력하지 않습니다.
            logging.getLogger("uvicorn.error").error(
                "Session DB insert failed: %s (status=%s, code=%s)",
                type(exc).__name__, getattr(exc, "status_code", "unknown"),
                getattr(exc, "code", "unknown"),
            )
            raise HTTPException(
                status_code=503,
                detail="세션 DB 저장에 실패했습니다. backend/check_db.py를 실행하여 원인을 확인하세요.",
            ) from None
    DEMO["sessions"][row["id"]] = row
    return row


@app.patch("/api/sessions/{session_id}")
def update_session(session_id: str, payload: SessionProgress):
    changes = {
        "current_step": payload.step,
        "current_scene": payload.scene,
        "language": payload.language,
        "last_decision": payload.decision,
        "updated_at": now_iso(),
    }
    if supabase:
        result = supabase.table("experience_sessions").update(changes).eq("id", session_id).execute()
        if not result.data:
            raise HTTPException(404, "session not found")
        return result.data[0]
    if session_id not in DEMO["sessions"]:
        raise HTTPException(404, "session not found")
    DEMO["sessions"][session_id].update(changes)
    return DEMO["sessions"][session_id]



DEFAULT_CHARACTERS = ["mina", "joon", "yuna", "haru", "leo"]


def save_character_row(row: dict):
    if supabase:
        result = supabase.table("user_characters").insert(row).execute()
        return result.data[0]
    DEMO["characters"].append(row)
    return row


@app.post("/api/characters")
def create_character(payload: CharacterCreate):
    """기본/프롬프트 캐릭터 선택 결과를 세션과 함께 저장합니다."""
    row = {
        "id": str(uuid.uuid4()),
        "session_id": payload.session_id,
        "nickname": payload.nickname,
        "language": payload.language,
        "mode": payload.mode,
        "character_key": payload.character_key,
        "prompt_text": payload.prompt,
        "image_url": payload.image_url,
        "provider": "project-original",
        "created_at": now_iso(),
    }
    return save_character_row(row)


@app.post("/api/characters/generate")
def generate_character(payload: CharacterPrompt):
    """설명으로 실제 AI 캐릭터 이미지를 생성합니다."""
    client = get_openai_client()
    try:
        result = client.images.edit(
            model=OPENAI_IMAGE_MODEL,
            # 기본 캐릭터 이미지는 서버가 자동 첨부하고 사용자는 설명만 입력합니다.
            image=get_character_style_reference(),
            prompt=character_prompt(payload.prompt.strip()),
            size="1024x1536",
            quality="medium",
            output_format="png",
            # 흰 배경을 그리는 대신 실제 알파 채널이 있는 PNG를 요청합니다.
            background="transparent",
        )
        image_bytes = base64.b64decode(result.data[0].b64_json)
        image_url = save_generated_image(image_bytes, "prompt_character")
    except Exception as exc:
        logging.exception("Character generation failed")
        raise HTTPException(502, "AI 이미지 생성 실패: 모델 권한, 결제 한도 및 FastAPI 로그를 확인하세요.") from exc
    row = {
        "id": str(uuid.uuid4()), "session_id": payload.session_id, "nickname": payload.nickname,
        "language": payload.language, "mode": "prompt", "character_key": "ai-generated",
        "prompt_text": payload.prompt.strip(), "image_url": image_url, "provider": OPENAI_IMAGE_MODEL,
        "created_at": now_iso(),
    }
    return save_character_row(row)


@app.post("/api/characters/photo")
async def create_photo_character(
    file: UploadFile = File(...),
    session_id: str | None = Form(None),
    nickname: str = Form("PARTICIPANT"),
    language: str = Form("ja"),
):
    """업로드 사진을 실제 AI 캐릭터 이미지로 변환합니다."""
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(400, "JPG, PNG 또는 WEBP만 사용할 수 있습니다.")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "10MB 이하 이미지만 사용할 수 있습니다.")
    # 실제 업로드 데이터는 확장자와 무관하게 열어 검증하고 OpenAI가 읽을 수 있는 RGB PNG로 정규화합니다.
    try:
        with Image.open(io.BytesIO(content)) as original:
            original.load()
            if original.width * original.height > 24_000_000:
                raise HTTPException(400, "사진 해상도가 너무 큽니다. 작은 사진을 올려주세요.")
            oriented = ImageOps.exif_transpose(original)
            if oriented.mode in {"RGBA", "LA"} or "transparency" in oriented.info:
                rgba = oriented.convert("RGBA")
                canvas = Image.new("RGB", rgba.size, "white")
                canvas.paste(rgba, mask=rgba.getchannel("A"))
                normalized = canvas
            else:
                normalized = oriented.convert("RGB")
            normalized.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
            normalized_buffer = io.BytesIO()
            normalized.save(normalized_buffer, format="PNG")
            normalized_buffer.seek(0)
            normalized_buffer.name = "participant_photo.png"
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(400, "사진 파일을 읽지 못했습니다. 일반 JPG 또는 PNG 사진을 다시 올려주세요.") from exc

    client = get_openai_client()
    try:
        # PNG를 명시적으로 전달해 원본 사진의 색상 모드/방향/웹 인코딩 문제를 방지합니다.
        result = client.images.edit(
            model=OPENAI_IMAGE_MODEL, image=normalized_buffer, prompt=photo_character_prompt(),
            # 사진에서 만든 캐릭터도 동일하게 배경 없는 PNG로 생성합니다.
            size="1024x1536", quality="medium", output_format="png", background="transparent",
        )
        image_bytes = base64.b64decode(result.data[0].b64_json)
        image_url = save_generated_image(image_bytes, "photo_character")
    except Exception as exc:
        logging.exception("Photo character conversion failed")
        raise HTTPException(502, "AI 사진 변환 실패: 다른 JPG/PNG 사진으로 시도하거나 FastAPI 오류 로그를 확인하세요.") from exc
    row = {
        "id": str(uuid.uuid4()), "session_id": session_id, "nickname": nickname, "language": language,
        "mode": "photo", "character_key": "ai-photo", "prompt_text": "photo character transform",
        "image_url": image_url, "provider": OPENAI_IMAGE_MODEL, "created_at": now_iso(),
    }
    return save_character_row(row)




@app.get("/api/characters/latest")
def get_latest_character(session_id: str):
    """현재 세션의 가장 최근 캐릭터를 다시 불러옵니다."""
    if supabase:
        result = supabase.table("user_characters").select("id,session_id,nickname,language,mode,character_key,prompt_text,image_url,provider,created_at").eq("session_id", session_id).order("created_at", desc=True).limit(1).execute()
        if result.data:
            return result.data[0]
        raise HTTPException(404, "character not found")
    rows = [row for row in DEMO["characters"] if row.get("session_id") == session_id]
    if rows:
        rows.sort(key=lambda row: row.get("created_at", ""), reverse=True)
        return rows[0]
    raise HTTPException(404, "character not found")


@app.post("/api/messages")
def create_message(payload: MessageCreate):
    status, reason = moderation(payload.message)
    row = {
        "id": str(uuid.uuid4()),
        "session_id": payload.session_id,
        "nickname": payload.nickname or "ANONYMOUS",
        "country": payload.country,
        "language": payload.language,
        "message": payload.message.strip(),
        "status": status,
        "moderation_reason": reason,
        "created_at": now_iso(),
    }
    if supabase:
        result = supabase.table("connect_messages").insert(row).execute()
        return result.data[0]
    DEMO["messages"].append(row)
    return row


@app.get("/api/messages")
def list_messages(limit: int = 30):
    limit = min(max(limit, 1), 100)
    if supabase:
        result = (
            supabase.table("connect_messages")
            .select("*")
            .eq("status", "approved")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data
    return [m for m in reversed(DEMO["messages"]) if m["status"] == "approved"][:limit]


@app.patch("/api/messages/{message_id}/status")
def change_message_status(message_id: str, status: Literal["approved", "hidden", "pending"], admin: bool = Depends(require_admin)):
    if supabase:
        result = supabase.table("connect_messages").update({"status": status}).eq("id", message_id).execute()
        if not result.data:
            raise HTTPException(404, "message not found")
        return result.data[0]
    for message in DEMO["messages"]:
        if message["id"] == message_id:
            message["status"] = status
            return message
    raise HTTPException(404, "message not found")


@app.post("/api/certificates")
def create_certificate(payload: CertificateCreate):
    # 같은 체험에서 다시 눌러도 중복 발급하지 않습니다.
    if payload.session_id:
        if supabase:
            existing = supabase.table("certificates").select("*").eq("session_id", payload.session_id).limit(1).execute().data
        else:
            existing = [c for c in DEMO["certificates"] if c.get("session_id") == payload.session_id]
        if existing:
            return existing[0]
    cert_no = f"KCP-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:10].upper()}"
    row = {
        "id": str(uuid.uuid4()),
        "certificate_no": cert_no,
        "session_id": payload.session_id,
        "nickname": payload.nickname,
        "producer_type": payload.producer_type,
        "score": payload.score,
        "language": payload.language,
        "created_at": now_iso(),
    }
    if supabase:
        result = supabase.table("certificates").insert(row).execute()
        return result.data[0]
    DEMO["certificates"].append(row)
    return row


def _resolve_certificate_image(image_url: str, character_key: str = "mina") -> bytes | None:
    """확인증용 이미지를 로컬/기본/원격/데이터URL 모두에서 읽어 RGB PNG로 정규화합니다."""
    value = (image_url or "").strip()
    raw = None
    try:
        if value.startswith("data:image/") and "," in value:
            raw = base64.b64decode(value.split(",", 1)[1])
        else:
            parsed = urlparse(value)
            if parsed.path.startswith("/generated/") and ".." not in parsed.path:
                target = GENERATED_DIR / Path(parsed.path).name
                if target.is_file():
                    raw = target.read_bytes()
            elif parsed.path.startswith("/characters/"):
                key = Path(parsed.path).stem.lower()
                target = BASE_DIR / "assets" / "characters" / f"{key}.png"
                if target.is_file():
                    raw = target.read_bytes()
            elif parsed.scheme in {"http", "https"}:
                request = Request(value, headers={"User-Agent": "KCultureProducer/1.0"})
                with urlopen(request, timeout=15) as response:
                    raw = response.read(12 * 1024 * 1024)
    except Exception:
        raw = None

    if not raw:
        key = character_key if re.fullmatch(r"mina|joon|yuna|haru|leo", character_key or "") else "mina"
        fallback = BASE_DIR / "assets" / "characters" / f"{key}.png"
        if fallback.is_file():
            raw = fallback.read_bytes()
    if not raw:
        return None
    try:
        with Image.open(io.BytesIO(raw)) as image:
            image = ImageOps.exif_transpose(image).convert("RGB")
            image.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
            out = io.BytesIO()
            image.save(out, "PNG", optimize=True)
            return out.getvalue()
    except Exception:
        return None


def _certificate_pdf_bytes(cert: dict, image_url: str = "", character_key: str = "mina") -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    certificate_no = cert["certificate_no"]
    pdf.setTitle(certificate_no)
    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawCentredString(width / 2, height - 82, "K-CULTURE PRODUCER")
    pdf.setFont("Helvetica", 13)
    pdf.drawCentredString(width / 2, height - 108, "Certificate of Participation")

    image = _resolve_certificate_image(image_url, character_key)
    if image:
        try:
            pdf.drawImage(ImageReader(io.BytesIO(image)), width / 2 - 62, height - 300, 124, 155,
                          preserveAspectRatio=True, anchor="c", mask="auto")
        except Exception:
            pass

    font_candidates = [Path("C:/Windows/Fonts/malgun.ttf"), Path("/usr/share/fonts/truetype/nanum/NanumGothic.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")]
    font_path = next((item for item in font_candidates if item.exists()), None)
    font_name = "Helvetica"
    if font_path:
        try:
            if "KCPCJK" not in pdfmetrics.getRegisteredFontNames():
                pdfmetrics.registerFont(TTFont("KCPCJK", str(font_path)))
            font_name = "KCPCJK"
        except Exception:
            font_name = "Helvetica"

    pdf.setFont(font_name, 18)
    pdf.drawCentredString(width / 2, height - 345, cert.get("nickname") or "PARTICIPANT")
    pdf.setFont(font_name, 12)
    pdf.drawCentredString(width / 2, height - 385, f"Producer Type: {cert.get('producer_type','')}")
    pdf.drawCentredString(width / 2, height - 410, f"Score: {cert.get('score',0)} / 100")
    pdf.drawCentredString(width / 2, height - 435, f"Certificate No: {certificate_no}")
    pdf.drawCentredString(width / 2, height - 475, "PROJECT CONTACT · Participation Certificate · 2026")
    pdf.save()
    return buffer.getvalue()


@app.post("/api/certificates/{certificate_no}/pdf-with-profile")
def certificate_pdf_with_profile(certificate_no: str, profile: CertificatePdfProfile):
    if supabase:
        result = supabase.table("certificates").select("*").eq("certificate_no", certificate_no).limit(1).execute()
        cert = result.data[0] if result.data else None
    else:
        cert = next((c for c in DEMO["certificates"] if c["certificate_no"] == certificate_no), None)
    if not cert:
        raise HTTPException(404, "certificate not found")
    data = _certificate_pdf_bytes(cert, profile.image_url, profile.character_key)
    return Response(data, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{certificate_no}.pdf"'})


@app.get("/api/certificates/{certificate_no}/pdf")
def certificate_pdf(certificate_no: str):
    if supabase:
        result = supabase.table("certificates").select("*").eq("certificate_no", certificate_no).limit(1).execute()
        if not result.data:
            raise HTTPException(404, "certificate not found")
        cert = result.data[0]
    else:
        cert = next((c for c in DEMO["certificates"] if c["certificate_no"] == certificate_no), None)
        if not cert:
            raise HTTPException(404, "certificate not found")

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    pdf.setTitle(certificate_no)
    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawCentredString(width / 2, height - 110, "K-CULTURE PRODUCER")
    pdf.setFont("Helvetica", 14)
    pdf.drawCentredString(width / 2, height - 160, "Certificate of Participation")
    pdf.setFont("Helvetica-Bold", 18)
    # PDF의 한국어/일본어가 네모로 표시되지 않도록 CJK 글꼴을 등록합니다.
    font_candidates = [Path("C:/Windows/Fonts/malgun.ttf"), Path("C:/Windows/Fonts/meiryo.ttc"), Path("/usr/share/fonts/truetype/nanum/NanumGothic.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")]
    font_path = next((item for item in font_candidates if item.exists() and item.suffix == ".ttf"), None)
    if font_path:
        try:
            pdfmetrics.registerFont(TTFont("KCPCJK", str(font_path)))
            pdf.setFont("KCPCJK", 18)
        except Exception:
            pdf.setFont("Helvetica-Bold", 18)
    pdf.drawCentredString(width / 2, height - 235, cert["nickname"] or "PARTICIPANT")
    pdf.setFont("KCPCJK" if font_path and "KCPCJK" in pdfmetrics.getRegisteredFontNames() else "Helvetica", 12)
    pdf.drawCentredString(width / 2, height - 275, f"Producer Type: {cert['producer_type']}")
    pdf.drawCentredString(width / 2, height - 300, f"Score: {cert['score']} / 100")
    pdf.drawCentredString(width / 2, height - 325, f"Certificate No: {certificate_no}")
    pdf.drawCentredString(width / 2, height - 350, "PROJECT CONTACT · Participation Certificate")
    # 사용자 생성 이미지가 서버 내부에 있을 때만 PDF에 안전하게 포함합니다.
    if cert.get("session_id"):
        if supabase:
            images = supabase.table("user_characters").select("image_url,character_key").eq("session_id", cert["session_id"]).order("created_at", desc=True).limit(1).execute().data
        else:
            images = [c for c in DEMO["characters"] if c.get("session_id") == cert["session_id"]][::-1][:1]
        if images:
            url = images[0].get("image_url", "")
            name = url.rsplit("/", 1)[-1]
            image_path = GENERATED_DIR / name
            if url.startswith(BACKEND_PUBLIC_URL + "/generated/") and image_path.is_file() and image_path.suffix.lower() in (".png", ".jpg", ".jpeg"):
                pdf.drawImage(ImageReader(str(image_path)), width / 2 - 48, height - 480, 96, 110, preserveAspectRatio=True, anchor="c", mask="auto")
            else:
                # 기본 캐릭터 5종은 기존 SVG에서 미리 만든 PNG를 사용합니다.
                key = images[0].get("character_key", "")
                if not re.fullmatch(r"mina|joon|yuna|haru|leo", key):
                    key = Path(name).stem
                basic_image = BASE_DIR / "assets" / "characters" / f"{key}.png"
                if basic_image.is_file():
                    pdf.drawImage(ImageReader(str(basic_image)), width / 2 - 48, height - 480, 96, 110, preserveAspectRatio=True, anchor="c", mask="auto")
    pdf.save()
    return Response(
        buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{certificate_no}.pdf"'},
    )


@app.get("/api/media/{scene}")
def get_scene_media(scene: str):
    if supabase:
        result = supabase.table("media_contents").select("*").eq("scene", scene).eq("active", True).order("created_at", desc=True).execute()
        return result.data
    return [m for m in DEMO["media"] if m.get("scene") == scene and m.get("active", True)]


def extract_bgm_audio(content: bytes) -> bytes:
    bundled = BASE_DIR.parent / "tmp/media-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe"
    executable = os.getenv("FFMPEG_PATH") or shutil.which("ffmpeg") or (str(bundled) if bundled.is_file() else None)
    if not executable:
        raise HTTPException(503, "MP4 변환 도구가 없습니다. MP3/M4A로 등록하거나 서버에 FFmpeg를 설정하세요.")
    with tempfile.TemporaryDirectory(prefix="kcp-audio-") as folder:
        source = Path(folder) / "source.mp4"
        output = Path(folder) / "audio.m4a"
        source.write_bytes(content)
        try:
            result = subprocess.run([executable, "-nostdin", "-y", "-v", "error", "-i", str(source), "-map", "0:a:0", "-vn", "-c:a", "aac", "-b:a", "160k", str(output)], capture_output=True, timeout=120, creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise HTTPException(422, "MP4 오디오 변환에 실패했습니다. 파일을 확인하거나 MP3/M4A로 등록하세요.") from exc
        if result.returncode or not output.is_file() or not output.stat().st_size:
            raise HTTPException(422, "MP4에서 오디오를 추출하지 못했습니다. 소리가 포함된 파일인지 확인하세요.")
        return output.read_bytes()


@app.post("/api/media/upload")
async def upload_media(scene: str = Form(...), kind: str = Form(...), title: str = Form(default=""), file: UploadFile = File(...), admin: bool = Depends(require_admin)):
    """Supabase Storage 연결용 업로드 API. Storage bucket 이름은 k-culture-media 입니다."""
    if not supabase:
        raise HTTPException(503, "Supabase 설정 후 사용할 수 있습니다.")
    # CMS 장면은 앞으로 추가될 수 있으므로 특정 장면명 목록으로 막지 않습니다.
    # 보안상 영문 대문자/숫자/언더스코어만 허용하고, 미디어 종류만 엄격히 검사합니다.
    # 이렇게 하면 INTRO, STEP 배경, 전광판 배경 등 관리자 업로드가 같은 API를 안정적으로 사용합니다.
    scene = (scene or "").strip().upper()
    kind = (kind or "").strip().lower()
    if not re.fullmatch(r"[A-Z0-9_]{2,64}", scene) or kind not in ("video", "image", "poster", "thumbnail", "audio"):
        raise HTTPException(400, f"올바른 장면 및 미디어 종류를 입력하세요. (scene={scene}, kind={kind})")
    # Windows may identify an audio-only M4A as video/mp4.
    audio_m4a = Path(file.filename or "").suffix.lower() in (".m4a", ".mp4") and file.content_type in ("video/mp4", "application/octet-stream", "")
    if kind == "audio" and not ((file.content_type or "").startswith("audio/") or audio_m4a):
        raise HTTPException(400, "오디오 파일(MP3/WAV/M4A/OGG)을 선택해 주세요.")
    if scene == "LOGO" and kind != "image":
        raise HTTPException(400, "로고는 이미지만 업로드할 수 있습니다.")
    if scene == "WALL" and kind not in ("image", "video"):
        raise HTTPException(400, "전광판 배경에는 이미지 또는 영상만 등록할 수 있습니다.")
    if scene in {"SOUVENIR_STAGE", "STAGE_IMAGE", "ARTIST_IMAGE"} and kind != "image":
        raise HTTPException(400, "해당 항목은 이미지만 등록할 수 있습니다.")
    if scene == "CHARACTERS" and (kind != "image" or title not in DEFAULT_CHARACTERS):
        raise HTTPException(400, "기본 캐릭터는 이미지 종류와 캐릭터 이름을 정확히 선택하세요.")
    extension = Path(file.filename or "media.bin").suffix.lower()
    allowed = {"video": (".mp4", ".webm"), "image": (".jpg", ".jpeg", ".png", ".webp"), "poster": (".jpg", ".jpeg", ".png", ".webp"), "thumbnail": (".jpg", ".jpeg", ".png", ".webp"), "audio": (".mp3", ".wav", ".m4a", ".ogg", ".aac", ".mp4")}
    if extension not in allowed[kind]:
        raise HTTPException(400, "지원하지 않는 파일 형식입니다.")
    content = await file.read()
    if len(content) > 80 * 1024 * 1024:
        raise HTTPException(413, "파일은 80MB 이하만 업로드할 수 있습니다.")
    if kind == "audio" and extension == ".mp4":
        content = extract_bgm_audio(content)
        extension = ".m4a"
    # Storage bucket 미생성 및 업로드 용량 초과 등 실제 실패 원인을 관리자로 전달합니다.
    bucket = supabase.storage.from_("k-culture-media")
    path = f"{scene}/{uuid.uuid4().hex}{extension}"
    try:
        bucket.upload(path, content, {"content-type": "audio/mp4" if kind == "audio" and extension == ".m4a" else file.content_type or "application/octet-stream"})
    except Exception as exc:
        detail = str(exc).lower()
        if "bucket" in detail and ("not found" in detail or "does not exist" in detail):
            raise HTTPException(400, "Supabase Storage에서 공개 버킷 k-culture-media를 먼저 생성하세요.") from exc
        if "exceeded" in detail or "too large" in detail or "413" in detail or "payload" in detail:
            raise HTTPException(413, "Storage 업로드 용량 제한에 걸렸습니다. 더 작은 파일로 시도하세요.") from exc
        logging.exception("Supabase media upload failed")
        raise HTTPException(502, "Supabase Storage 업로드 실패: 버킷·Storage 용량·키 권한을 확인하세요. FastAPI 터미널의 오류도 확인하세요.") from exc
    public_url = bucket.get_public_url(path)
    row = {"scene": scene, "kind": kind, "title": title, "file_url": public_url, "active": True, "sort_order": 0, "created_at": now_iso()}
    previous_ids = []
    try:
        # 새 기록 저장 전에는 기존 자료를 변경하지 않습니다.
        # 교체 대상 ID를 먼저 고정해 다른 업로드의 새 기록까지 비활성화하지 않게 합니다.
        if scene != "LIBRARY":
            query = supabase.table("media_contents").select("id").eq("scene", scene).eq("kind", kind).eq("active", True)
            if scene in {"CHARACTERS", "ARTIST_IMAGE", "ARTIST_VIDEO_1", "ARTIST_VIDEO_2", "ARTIST_ARRIVAL", "ARTIST_RESULT", "STAGE_IMAGE"}:
                query = query.eq("title", title)
            previous_ids = [item["id"] for item in query.execute().data]
        result = supabase.table("media_contents").insert(row).execute()
        if not result.data:
            raise RuntimeError("media_contents INSERT returned no record")
        saved_row = result.data[0]
    except Exception as exc:
        # 응답만 실패하고 DB에는 저장됐을 수 있으므로 참조 여부를 확인한 뒤 새 파일만 정리합니다.
        # 확인 자체가 실패하면 파일을 남겨 정상 저장된 기록의 링크가 끊기지 않게 합니다.
        try:
            stored = supabase.table("media_contents").select("*").eq("file_url", public_url).execute().data
            if stored:
                saved_row = stored[0]
            else:
                bucket.remove([path])
                saved_row = None
        except Exception:
            saved_row = None
            logging.exception("Failed to verify or roll back uploaded file")
        if not saved_row:
            logging.exception("media_contents registration failed")
            if "media_contents_kind_check" in str(exc):
                raise HTTPException(409, "DB가 오디오 등록을 허용하지 않습니다. Supabase SQL Editor에서 backend/sql/002_allow_audio.sql을 실행한 후 다시 등록하세요. 기존 자료는 유지됩니다.") from exc
            raise HTTPException(502, "미디어 DB 등록을 확인하지 못했습니다. 기존 자료는 유지됩니다. media_contents 테이블과 FastAPI 오류를 확인하세요.") from exc

    # 새 자료가 저장된 뒤에만 이전 기록을 비활성화합니다. LIBRARY는 여러 자료를 유지합니다.
    if previous_ids:
        try:
            supabase.table("media_contents").update({"active": False}).in_("id", previous_ids).execute()
        except Exception:
            # 정리 실패 때문에 사용 가능한 새 파일을 삭제하지 않습니다. 이전 자료도 남겨 둡니다.
            logging.exception("New media saved, but previous media deactivation failed")
            saved_row = {**saved_row, "replacement_warning": "새 자료는 저장됐지만 이전 자료 비활성화에 실패했습니다. 관리자 미디어 목록을 확인하세요."}
    return saved_row


@app.patch("/api/admin/media/{media_id}", dependencies=[Depends(require_admin)])
def admin_toggle_media(media_id: str, active: bool):
    if supabase:
        rows = supabase.table("media_contents").update({"active": active}).eq("id", media_id).execute().data
        if not rows: raise HTTPException(404, "미디어를 찾을 수 없습니다.")
        return rows[0]
    for row in DEMO["media"]:
        if row["id"] == media_id:
            row["active"] = active
            return row
    raise HTTPException(404, "미디어를 찾을 수 없습니다.")

class AdminMediaEdit(BaseModel):
    title: str = Field(default="", max_length=160)
    sort_order: int = Field(default=0, ge=0, le=100000)
    active: bool = True


@app.put("/api/admin/media/{media_id}", dependencies=[Depends(require_admin)])
def admin_edit_media(media_id: uuid.UUID, payload: AdminMediaEdit):
    if not supabase:
        raise HTTPException(503, "Supabase 연결이 필요합니다.")
    changes = {"title": payload.title.strip(), "sort_order": payload.sort_order, "active": payload.active}
    rows = supabase.table("media_contents").update(changes).eq("id", str(media_id)).execute().data
    if not rows:
        raise HTTPException(404, "미디어를 찾을 수 없습니다.")
    return rows[0]


@app.delete("/api/admin/media/{media_id}", dependencies=[Depends(require_admin)])
def admin_delete_media(media_id: uuid.UUID):
    if not supabase:
        raise HTTPException(503, "Supabase 연결이 필요합니다.")
    rows = supabase.table("media_contents").select("id,file_url").eq("id", str(media_id)).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "미디어를 찾을 수 없습니다.")
    file_url = rows[0]["file_url"]
    # Only delete an object inside OUR media bucket; never touch arbitrary external URLs.
    path_marker = "/storage/v1/object/public/k-culture-media/"
    parsed = urlparse(file_url)
    if parsed.netloc == urlparse(SUPABASE_URL).netloc and path_marker in parsed.path:
        object_path = unquote(parsed.path.split(path_marker, 1)[1])
        if object_path and not object_path.startswith("/") and ".." not in object_path.split("/"):
            try:
                supabase.storage.from_("k-culture-media").remove([object_path])
            except Exception as exc:
                # Preserve DB record when storage deletion fails, so admin can retry.
                raise HTTPException(502, "파일 삭제 실패. DB 기록은 남아 있습니다.") from exc
    supabase.table("media_contents").delete().eq("id", str(media_id)).execute()
    return {"ok": True, "id": str(media_id)}


# 관리자 백업/DB 관리: 설정 + 주요 테이블을 ZIP(JSON)으로 내보냅니다.
DATA_TABLES = {
    "sessions": "experience_sessions",
    "characters": "user_characters",
    "messages": "connect_messages",
    "certificates": "certificates",
    "media": "media_contents",
}

class CleanupRequest(BaseModel):
    session_days: int = Field(default=180, ge=7, le=3650)
    character_days: int = Field(default=90, ge=7, le=3650)
    message_days: int = Field(default=180, ge=7, le=3650)
    certificate_days: int = Field(default=365, ge=7, le=3650)
    confirm: bool = False

def _all_table_rows(table: str) -> list[dict]:
    if not supabase:
        mapping = {
            "experience_sessions": list(DEMO["sessions"].values()),
            "user_characters": DEMO["characters"],
            "connect_messages": DEMO["messages"],
            "certificates": DEMO["certificates"],
            "media_contents": DEMO["media"],
        }
        return list(mapping.get(table, []))
    try:
        return supabase.table(table).select("*").order("created_at", desc=True).limit(5000).execute().data or []
    except Exception:
        logging.exception("backup table read failed: %s", table)
        return []

@app.get("/api/admin/backup.zip", dependencies=[Depends(require_admin)])
def admin_backup_zip():
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("site_content.json", json.dumps(read_site_content(), ensure_ascii=False, indent=2))
        manifest = {}
        for label, table in DATA_TABLES.items():
            rows = _all_table_rows(table)
            archive.writestr(f"data/{label}.json", json.dumps(rows, ensure_ascii=False, indent=2, default=str))
            manifest[label] = len(rows)
        archive.writestr("backup_manifest.json", json.dumps({"created_at": datetime.now(timezone.utc).isoformat(), "counts": manifest, "note": "Storage binary files are not duplicated; media URLs are included in media.json."}, ensure_ascii=False, indent=2))
    return Response(buffer.getvalue(), media_type="application/zip", headers={"Content-Disposition": f'attachment; filename="k_culture_backup_{stamp}.zip"'})

def _count_older(table: str, cutoff: str) -> int:
    if not supabase:
        rows = _all_table_rows(table)
        return sum(1 for row in rows if str(row.get("created_at") or "") < cutoff)
    try:
        result = supabase.table(table).select("id", count="exact").lt("created_at", cutoff).execute()
        return int(result.count or 0)
    except Exception:
        logging.exception("cleanup count failed: %s", table)
        return 0

def _cutoff(days: int) -> str:
    from datetime import timedelta
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

@app.post("/api/admin/data/cleanup-preview", dependencies=[Depends(require_admin)])
def admin_cleanup_preview(payload: CleanupRequest):
    rules = {
        "sessions": ("experience_sessions", payload.session_days),
        "characters": ("user_characters", payload.character_days),
        "messages": ("connect_messages", payload.message_days),
        "certificates": ("certificates", payload.certificate_days),
    }
    return {key: {"days": days, "count": _count_older(table, _cutoff(days))} for key,(table,days) in rules.items()}

@app.post("/api/admin/data/cleanup", dependencies=[Depends(require_admin)])
def admin_cleanup(payload: CleanupRequest):
    if not payload.confirm:
        raise HTTPException(400, "정리 실행 전 confirm=true가 필요합니다.")
    if not supabase:
        raise HTTPException(503, "실제 DB 정리는 Supabase 연결 시에만 실행합니다.")
    # 자식/참조 데이터부터 지운 뒤 세션을 마지막에 정리해 FK 충돌 가능성을 줄입니다.
    rules = {
        "characters": ("user_characters", payload.character_days),
        "messages": ("connect_messages", payload.message_days),
        "certificates": ("certificates", payload.certificate_days),
        "sessions": ("experience_sessions", payload.session_days),
    }
    deleted = {}
    for key,(table,days) in rules.items():
        cutoff = _cutoff(days)
        try:
            rows = supabase.table(table).select("id").lt("created_at", cutoff).limit(5000).execute().data or []
            ids = [row.get("id") for row in rows if row.get("id")]
            if ids:
                supabase.table(table).delete().in_("id", ids).execute()
            deleted[key] = len(ids)
        except Exception as exc:
            logging.exception("cleanup failed: %s", table)
            raise HTTPException(502, f"{key} 데이터 정리 중 오류가 발생했습니다.") from exc
    return {"ok": True, "deleted": deleted}

# 통합본 콘텐츠 설정: 관리자만 쓰기 가능, 사용자에게는 공개 설정값만 전달합니다.
# 공개 콘텐츠 설정만 저장합니다. 배포 환경에서는 Supabase Storage에 보존합니다.
SITE_CONTENT_FILE = BASE_DIR / "site_content.json"
SITE_CONTENT_STORAGE_PATH = os.getenv("SITE_CONTENT_STORAGE_PATH", "").strip()
CONTENT_FIELDS = {"logoMark", "logoName", "logoSubtitle", "logoSideText", "logoGap", "artistName", "artistRoleKo", "artistRoleJa", "artistRoleEn", "defaultLanguage", "introKo", "introJa", "introEn", "logoImageUrl", "introVideoUrl", "setupBackgroundVideoUrl", "planBackgroundVideoUrl", "billboardBackgroundVideoUrl", "homeStepMedia", "introPosterUrl", "articleImageUrl", "articleUrl", "introFontSize", "introAlign", "fanDefault", "fanLimit", "planNotes", "incidentCopy", "delayMinutes", "yenPerManWon", "sceneNotes", "videos", "screenCopy", "characterCatalog", "pageCopy", "connectWallCopy", "articleCopy", "screenStyle", "defaultArtistKey", "artistCatalog", "stageCatalog", "defaultStageKey", "tickerDurationSeconds", "planVariants", "scheduleItems", "finalProgramOptions", "programOverrides", "incidentOverrides", "incidentOptionOverrides", "audioScenes", "commonBgmUrl", "masterSoundEnabled", "dataRetention"}

def read_site_content() -> dict:
    if SITE_CONTENT_STORAGE_PATH:
        if supabase is None:
            raise HTTPException(503, "콘텐츠 저장소 연결을 확인하세요.")
        try:
            raw = supabase.storage.from_("k-culture-media").download(SITE_CONTENT_STORAGE_PATH)
            data = json.loads(raw)
            return {key: value for key, value in data.items() if key in CONTENT_FIELDS}
        except Exception as exc:
            status = str(getattr(exc, "status", getattr(exc, "status_code", "")))
            if status != "404":
                logging.exception("Content storage read failed")
                raise HTTPException(502, "관리자 설정을 불러오지 못했습니다. 잠시 후 다시 시도하세요.") from exc
    try:
        source = SITE_CONTENT_FILE if SITE_CONTENT_FILE.is_file() else BASE_DIR / "site_content.initial.json"
        data = json.loads(source.read_text(encoding="utf-8"))
        return {key: value for key, value in data.items() if key in CONTENT_FIELDS} if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def persist_site_content(settings: dict):
    serialized = json.dumps(settings, ensure_ascii=False, indent=2)
    if SITE_CONTENT_STORAGE_PATH:
        if supabase is None:
            raise HTTPException(503, "콘텐츠 저장소 연결을 확인하세요.")
        try:
            supabase.storage.from_("k-culture-media").upload(
                SITE_CONTENT_STORAGE_PATH, serialized.encode("utf-8"),
                {"content-type": "application/json", "upsert": "true", "cache-control": "0"},
            )
        except Exception as exc:
            logging.exception("Content storage write failed")
            raise HTTPException(502, "관리자 설정 저장에 실패했습니다. 다시 시도하세요.") from exc
    temp = SITE_CONTENT_FILE.with_suffix(".tmp")
    temp.write_text(serialized, encoding="utf-8")
    temp.replace(SITE_CONTENT_FILE)

@app.get("/api/site-content")
def public_site_content():
    return read_site_content()


def _translate_admin_items(items: dict[str, str]) -> dict:
    """관리자 한국어 문구를 일본어/영어로 번역합니다.
    OpenAI 키가 없거나 번역에 실패하면 호출자가 기존 외국어 값을 유지할 수 있도록 빈 결과를 반환합니다.
    """
    clean = {str(k): str(v)[:1200] for k, v in (items or {}).items() if str(v).strip()}
    if not clean or not OPENAI_API_KEY:
        return {"ja": {}, "en": {}}
    try:
        client = get_openai_client()
        result = client.responses.create(
            model=OPENAI_TEXT_MODEL,
            instructions=(
                'Translate Korean UI copy JSON into Japanese and English. Return strict JSON only as '
                '{"ja":{same keys},"en":{same keys}}. Preserve K-CULTURE, KKUGI, AI and PROJECT CONTACT. '
                'Keep UI button labels concise.'
            ),
            input=__import__("json").dumps(clean, ensure_ascii=False),
            max_output_tokens=5000,
        )
        raw=(result.output_text or '').strip().removeprefix('```json').removesuffix('```').strip()
        data=__import__("json").loads(raw)
        return {"ja": data.get("ja", {}) or {}, "en": data.get("en", {}) or {}}
    except Exception:
        logging.exception("automatic CMS translation failed")
        return {"ja": {}, "en": {}}


@app.post("/api/admin/translate-copy", dependencies=[Depends(require_admin)])
def admin_translate_copy(payload: AdminTranslateRequest):
    translated = _translate_admin_items(payload.items)
    if not translated["ja"] and not translated["en"] and payload.items and OPENAI_API_KEY:
        raise HTTPException(502, "자동 번역에 실패했습니다. 기존 외국어 문구는 유지됩니다.")
    return translated


def _auto_translate_site_content(settings: dict) -> dict:
    """한국어 CMS 문구를 저장할 때 일본어/영어를 자동 갱신합니다."""
    items = {}
    for key, value in (settings.get("introKo") or {}).items():
        if str(value).strip(): items[f"intro:{key}"] = str(value)
    if str(settings.get("artistRoleKo") or "").strip(): items["artistRole"] = str(settings.get("artistRoleKo"))
    for key, value in ((settings.get("articleCopy") or {}).get("ko") or {}).items():
        if str(value).strip(): items[f"article:{key}"] = str(value)
    for page, fields in ((settings.get("pageCopy") or {}).get("ko") or {}).items():
        for key, value in (fields or {}).items():
            if str(value).strip(): items[f"page:{page}:{key}"] = str(value)
    for key, value in ((settings.get("connectWallCopy") or {}).get("ko") or {}).items():
        if str(value).strip(): items[f"connect:{key}"] = str(value)
    for group in ("planNotes", "incidentCopy"):
        value=(settings.get(group) or {}).get("ko")
        if str(value or "").strip(): items[group]=str(value)
    for key, row in (settings.get("sceneNotes") or {}).items():
        value=(row or {}).get("ko")
        if str(value or "").strip(): items[f"scene:{key}"]=str(value)
    for key, value in (settings.get("screenCopy") or {}).items():
        if key.endswith("Ko") and str(value).strip(): items[f"screen:{key[:-2]}"]=str(value)
    for artist in (settings.get("artistCatalog") or []):
        akey=str(artist.get("key") or "")
        for field in ("role","description","arrivalTitle","arrivalCopy"):
            value=(artist.get(field) or {}).get("ko")
            if akey and str(value or "").strip(): items[f"artist:{akey}:{field}"]=str(value)
    for group in ("programOverrides","incidentOverrides"):
        for item_key,row in (settings.get(group) or {}).items():
            for field,value in ((row or {}).get("ko") or {}).items():
                if str(value or "").strip(): items[f"{group}:{item_key}:{field}"]=str(value)
    for index,row in enumerate(((settings.get("scheduleItems") or {}).get("ko") or [])):
        for field in ("title","copy"):
            value=(row or {}).get(field)
            if str(value or "").strip(): items[f"schedule:{index}:{field}"]=str(value)
    for incident_key,langs in (settings.get("incidentOptionOverrides") or {}).items():
        for index,row in enumerate((langs or {}).get("ko") or []):
            for field_index,value in enumerate(row or []):
                if str(value or "").strip(): items[f"incidentOption:{incident_key}:{index}:{field_index}"]=str(value)
    # 관리자가 직접 제작할 안내 음성 원고도 기존 한국어 자동 번역에 포함합니다.
    for scene_key, scene in (settings.get("audioScenes") or {}).items():
        source = ((scene or {}).get("aiCopy") or {}).get("ko")
        if str(source or "").strip(): items[f"audioScript:{scene_key}"] = str(source)
    translated = _translate_admin_items(items)
    if not translated["ja"] and not translated["en"]:
        return settings
    out=__import__("copy").deepcopy(settings)
    for lang in ("ja","en"):
        values=translated.get(lang) or {}
        intro_key="introJa" if lang=="ja" else "introEn"
        out.setdefault(intro_key,{})
        for key in (settings.get("introKo") or {}):
            token=f"intro:{key}"
            if values.get(token): out[intro_key][key]=values[token]
        if values.get("artistRole"):
            out["artistRoleJa" if lang=="ja" else "artistRoleEn"] = values["artistRole"]
        out.setdefault("articleCopy",{}).setdefault(lang,{})
        for key in ((settings.get("articleCopy") or {}).get("ko") or {}):
            token=f"article:{key}"
            if values.get(token): out["articleCopy"][lang][key]=values[token]
        out.setdefault("pageCopy",{}).setdefault(lang,{})
        for page, fields in ((settings.get("pageCopy") or {}).get("ko") or {}).items():
            out["pageCopy"][lang].setdefault(page,{})
            for key in (fields or {}):
                token=f"page:{page}:{key}"
                if values.get(token): out["pageCopy"][lang][page][key]=values[token]
        out.setdefault("connectWallCopy",{}).setdefault(lang,{})
        for key in ((settings.get("connectWallCopy") or {}).get("ko") or {}):
            token=f"connect:{key}"
            if values.get(token): out["connectWallCopy"][lang][key]=values[token]
        for group in ("planNotes","incidentCopy"):
            if values.get(group): out.setdefault(group,{})[lang]=values[group]
        for key in (settings.get("sceneNotes") or {}):
            token=f"scene:{key}"
            if values.get(token): out.setdefault("sceneNotes",{}).setdefault(key,{})[lang]=values[token]
        for scene_key in (settings.get("audioScenes") or {}):
            token = f"audioScript:{scene_key}"
            if values.get(token) and not ((settings.get("audioScenes", {}).get(scene_key) or {}).get("aiCopy") or {}).get(lang):
                out.setdefault("audioScenes", {}).setdefault(scene_key, {}).setdefault("aiCopy", {})[lang] = values[token]
        suffix="Ja" if lang=="ja" else "En"
        for key in (settings.get("screenCopy") or {}):
            if key.endswith("Ko"):
                base=key[:-2]; token=f"screen:{base}"
                if values.get(token): out.setdefault("screenCopy",{})[f"{base}{suffix}"]=values[token]
        for index, artist in enumerate(out.get("artistCatalog") or []):
            akey=str(artist.get("key") or "")
            for field in ("role","description","arrivalTitle","arrivalCopy"):
                token=f"artist:{akey}:{field}"
                if values.get(token): out["artistCatalog"][index].setdefault(field,{})[lang]=values[token]
        for group in ("programOverrides","incidentOverrides"):
            for item_key,row in (settings.get(group) or {}).items():
                for field in ((row or {}).get("ko") or {}):
                    token=f"{group}:{item_key}:{field}"
                    if values.get(token): out.setdefault(group,{}).setdefault(item_key,{}).setdefault(lang,{})[field]=values[token]
        for index,row in enumerate(((settings.get("scheduleItems") or {}).get("ko") or [])):
            out.setdefault("scheduleItems",{}).setdefault(lang,[])
            while len(out["scheduleItems"][lang]) <= index:
                out["scheduleItems"][lang].append({"time": row.get("time", ""), "title":"", "copy":""})
            out["scheduleItems"][lang][index]["time"] = row.get("time", "")
            for field in ("title","copy"):
                token=f"schedule:{index}:{field}"
                if values.get(token): out["scheduleItems"][lang][index][field]=values[token]
        for incident_key,langs in (settings.get("incidentOptionOverrides") or {}).items():
            source_rows=(langs or {}).get("ko") or []
            out.setdefault("incidentOptionOverrides",{}).setdefault(incident_key,{}).setdefault(lang,[])
            while len(out["incidentOptionOverrides"][incident_key][lang]) < len(source_rows):
                out["incidentOptionOverrides"][incident_key][lang].append(["","",""])
            for index,row in enumerate(source_rows):
                for field_index,_ in enumerate(row or []):
                    token=f"incidentOption:{incident_key}:{index}:{field_index}"
                    if values.get(token): out["incidentOptionOverrides"][incident_key][lang][index][field_index]=values[token]
    return out

@app.patch("/api/admin/audio-settings", dependencies=[Depends(require_admin)])
def write_audio_settings(payload: dict):
    settings = read_site_content()
    for key in ("audioScenes", "commonBgmUrl", "masterSoundEnabled"):
        if key in payload:
            settings[key] = payload[key]
    serialized = json.dumps(settings, ensure_ascii=False, indent=2)
    if len(serialized.encode("utf-8")) > 262144:
        raise HTTPException(413, "콘텐츠 설정은 256KB 이하여야 합니다.")
    persist_site_content(settings)
    return settings


@app.put("/api/admin/site-content", dependencies=[Depends(require_admin)])
def write_site_content(payload: dict):
    # 허용된 콘텐츠 키만 저장하며 임시 파일을 거쳐 원자적으로 교체합니다.
    sanitized = {key: value for key, value in payload.items() if key in CONTENT_FIELDS}
    # 관리자는 한국어만 수정해도 일본어/영어가 자동 갱신됩니다.
    sanitized = _auto_translate_site_content(sanitized)
    if len(__import__("json").dumps(sanitized, ensure_ascii=False)) > 262144:
        raise HTTPException(413, "콘텐츠 설정은 256KB 이하여야 합니다.")
    persist_site_content(sanitized)
    return sanitized

# PATCH20: 새 기념사진 API만 별도 연결 (기존 API 변경 없음)
from .souvenir_router import router as souvenir_router
app.include_router(souvenir_router)

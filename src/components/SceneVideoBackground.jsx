export default function SceneVideoBackground({ video }) {
  if (!video) return null;
  return (
    <div className="reuse-scene-video-bg" aria-hidden="true">
      <video src={video} autoPlay muted loop playsInline preload="auto" />
      <span />
    </div>
  );
}

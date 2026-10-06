export default function ChoiceCard({ number, icon, title, meta, selected, featured, onClick }) {
  return (
    <button
      className={`response ${featured ? 'featured' : ''} ${selected ? 'selected' : ''}`}
      type="button"
      onClick={onClick}
    >
      <span className="num">{String(number).padStart(2, '0')}</span>
      {icon && <span className="icon">{icon}</span>}
      <b>{title}</b>
      <small>{meta}</small>
    </button>
  );
}

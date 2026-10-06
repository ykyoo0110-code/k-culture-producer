export default function Actions({ backLabel, nextLabel, onBack, onNext, disabled = false }) {
  return (
    <div className="actions">
      {onBack && <button className="secondary" type="button" onClick={onBack}>{backLabel}</button>}
      {onNext && <button className="primary" type="button" onClick={onNext} disabled={disabled}>{nextLabel} <span>→</span></button>}
    </div>
  );
}

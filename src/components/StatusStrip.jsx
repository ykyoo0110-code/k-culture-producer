import { clamp, formatMoney, formatTime } from '../utils/score';

export default function StatusStrip({ state, language, labels }) {
  const safetyText = state.safety >= 75 ? labels.normal : state.safety >= 50 ? labels.caution : labels.danger;
  return (
    <div className="status-strip">
      <div><span>{labels.time}</span><b>{formatTime(state.time)}</b></div>
      <div><span>{labels.budget}</span><b>{formatMoney(state.budget, language)}</b></div>
      <div><span>{labels.fan}</span><b>{clamp(state.fan)}</b></div>
      <div><span>{labels.safety}</span><b>{safetyText}</b></div>
    </div>
  );
}

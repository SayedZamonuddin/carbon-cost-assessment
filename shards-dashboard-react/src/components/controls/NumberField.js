import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

// Both actor cards carry identically-named fields, so ids must be per-instance rather
// than derived from the label.
let fieldSequence = 0;

/**
 * A slider paired with a number box. The slider is for exploring, the box for entering a
 * known value; both stay in sync and both clamp to the field's range.
 *
 * Typing is not clamped until blur, so a value can be typed digit by digit without the
 * field fighting the keystrokes.
 */
const NumberField = ({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  percent,
  disabled
}) => {
  const toDisplay = v => (percent ? v * 100 : v);
  const fromDisplay = v => (percent ? v / 100 : v);

  const [draft, setDraft] = useState(String(toDisplay(value)));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(String(round(toDisplay(value))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editing]);

  function round(v) {
    const decimals = Math.max(0, Math.ceil(-Math.log10(percent ? step * 100 : step)));
    return Number(v.toFixed(Math.min(decimals, 6)));
  }

  // Clamp in model units, after undoing the percent display scaling. Clamping the
  // display value against raw bounds is how the percent sliders once pinned themselves to
  // ~1% the moment they were dragged.
  const apply = display => {
    onChange(Math.min(Math.max(fromDisplay(display), min), max));
  };

  const commit = raw => {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) apply(parsed);
    setEditing(false);
  };

  // The two inputs are two views of one value. The visible label is bound to the number
  // box; the slider carries its own name so assistive tech announces which is which
  // instead of hearing the same label twice.
  const idRef = useRef(null);
  if (idRef.current === null) {
    fieldSequence += 1;
    idRef.current = `field-${fieldSequence}`;
  }
  const inputId = idRef.current;

  return (
    <div className={`field${disabled ? " field--disabled" : ""}`}>
      <label className="field__label" htmlFor={inputId}>
        {label}
        {hint && <span className="field__hint" title={hint}>{hint}</span>}
      </label>
      <span className="field__row">
        <input
          type="range"
          className="field__slider"
          min={toDisplay(min)}
          max={toDisplay(max)}
          step={percent ? step * 100 : step}
          value={toDisplay(value)}
          disabled={disabled}
          onChange={event => apply(Number(event.target.value))}
          aria-label={`${label} slider`}
        />
        <span className="field__entry">
          <input
            id={inputId}
            type="number"
            className="field__number"
            value={draft}
            min={toDisplay(min)}
            max={toDisplay(max)}
            step={percent ? step * 100 : step}
            disabled={disabled}
            onFocus={() => setEditing(true)}
            onChange={event => setDraft(event.target.value)}
            onBlur={event => commit(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter") event.target.blur();
            }}
          />
          {unit && <span className="field__unit">{unit}</span>}
        </span>
      </span>
    </div>
  );
};

NumberField.propTypes = {
  label: PropTypes.string.isRequired,
  hint: PropTypes.string,
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  step: PropTypes.number,
  unit: PropTypes.string,
  percent: PropTypes.bool,
  disabled: PropTypes.bool
};

NumberField.defaultProps = { step: 1, unit: "", percent: false, disabled: false };

export default NumberField;

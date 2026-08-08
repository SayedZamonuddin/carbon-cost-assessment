import React, { useState } from "react";
import PropTypes from "prop-types";

/** A collapsible group of controls, tagged when it differs from the loaded values. */
const ControlCard = ({ title, subtitle, modified, children, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={`control-card${open ? "" : " control-card--closed"}`}
      aria-label={title}
    >
      <button
        type="button"
        className="control-card__header"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="control-card__title">
          {title}
          {subtitle && <small>{subtitle}</small>}
        </span>
        {modified && <span className="control-card__edited">edited</span>}
        <i className="material-icons control-card__chevron">
          {open ? "expand_less" : "expand_more"}
        </i>
      </button>
      {open && <div className="control-card__body">{children}</div>}
    </section>
  );
};

ControlCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  modified: PropTypes.bool,
  defaultOpen: PropTypes.bool
};

ControlCard.defaultProps = { modified: false, defaultOpen: true };

export default ControlCard;

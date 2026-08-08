import React from "react";
import PropTypes from "prop-types";

const SidebarMainNavbar = ({ onToggle }) => (
  <div className="sidebar-masthead">
    <a className="wordmark" href="#/policy">
      <span className="wordmark__mark" aria-hidden="true" />
      <span className="wordmark__text">
        <span className="wordmark__name">Oxford Simple IAM</span>
        <small>Climate &amp; policy explorer</small>
      </span>
    </a>
    <button
      type="button"
      className="icon-button d-md-none"
      onClick={onToggle}
      aria-label="Close navigation"
    >
      <i className="material-icons">close</i>
    </button>
  </div>
);

SidebarMainNavbar.propTypes = {
  onToggle: PropTypes.func
};

SidebarMainNavbar.defaultProps = {
  onToggle: () => {}
};

export default SidebarMainNavbar;

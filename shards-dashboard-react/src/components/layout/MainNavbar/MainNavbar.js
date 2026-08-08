import React from "react";
import PropTypes from "prop-types";

import DataSourceControl from "./DataSourceControl";

const MainNavbar = ({ title, subtitle, onToggleMenu }) => (
  <div className="main-navbar sticky-top">
    <div className="page-header">
      <button
        type="button"
        className="icon-button d-md-none menu-button"
        onClick={onToggleMenu}
        aria-label="Open navigation"
      >
        <i className="material-icons">menu</i>
      </button>
      <div className="page-header__text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <DataSourceControl />
    </div>
  </div>
);

MainNavbar.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  onToggleMenu: PropTypes.func
};

MainNavbar.defaultProps = {
  title: "",
  onToggleMenu: () => {}
};

export default MainNavbar;

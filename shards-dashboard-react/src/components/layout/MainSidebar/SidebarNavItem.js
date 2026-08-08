import React from "react";
import PropTypes from "prop-types";
import { NavLink as RouteNavLink } from "react-router-dom";
import { NavItem, NavLink } from "shards-react";

const SidebarNavItem = ({ item, onNavigate }) => (
  <NavItem>
    <NavLink tag={RouteNavLink} to={item.to} onClick={onNavigate}>
      <span className="nav-label">
        {item.title}
        <small>{item.subtitle}</small>
      </span>
    </NavLink>
  </NavItem>
);

SidebarNavItem.propTypes = {
  item: PropTypes.object.isRequired,
  onNavigate: PropTypes.func
};

SidebarNavItem.defaultProps = {
  onNavigate: () => {}
};

export default SidebarNavItem;

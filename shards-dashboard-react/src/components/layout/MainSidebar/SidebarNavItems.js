import React from "react";
import PropTypes from "prop-types";
import { Nav } from "shards-react";

import SidebarNavItem from "./SidebarNavItem";
import getSidebarNavItems from "../../../data/sidebar-nav-items";

const items = getSidebarNavItems();

const SidebarNavItems = ({ onNavigate }) => (
  <div className="nav-wrapper">
    <Nav className="nav--no-borders flex-column">
      {items.map(item => (
        <SidebarNavItem key={item.to} item={item} onNavigate={onNavigate} />
      ))}
    </Nav>
  </div>
);

SidebarNavItems.propTypes = {
  onNavigate: PropTypes.func
};

SidebarNavItems.defaultProps = {
  onNavigate: () => {}
};

export default SidebarNavItems;

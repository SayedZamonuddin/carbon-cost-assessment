import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import { Col } from "shards-react";

import SidebarMainNavbar from "./SidebarMainNavbar";
import SidebarNavItems from "./SidebarNavItems";

const MainSidebar = ({ menuVisible, onToggle }) => (
  <Col
    tag="aside"
    className={classNames("main-sidebar", "px-0", "col-12", menuVisible && "open")}
    lg={{ size: 2 }}
    md={{ size: 3 }}
  >
    <SidebarMainNavbar onToggle={onToggle} />
    <SidebarNavItems onNavigate={onToggle} />
    <div className="sidebar-attribution">
      <p>
        Model v1.8 by Myles Allen &amp; Nicholas Leach, University of Oxford. Figures
        reproduce the source workbook; everything is computed in your browser.
      </p>
    </div>
  </Col>
);

MainSidebar.propTypes = {
  menuVisible: PropTypes.bool,
  onToggle: PropTypes.func
};

MainSidebar.defaultProps = {
  menuVisible: false,
  onToggle: () => {}
};

export default MainSidebar;

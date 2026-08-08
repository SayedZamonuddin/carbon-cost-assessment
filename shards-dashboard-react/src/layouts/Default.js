import React, { useState } from "react";
import PropTypes from "prop-types";
import { Container, Row, Col } from "shards-react";

import MainNavbar from "../components/layout/MainNavbar/MainNavbar";
import MainSidebar from "../components/layout/MainSidebar/MainSidebar";
import MainFooter from "../components/layout/MainFooter";
import DropTarget from "../components/layout/DropTarget";

const DefaultLayout = ({ children, title, subtitle }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const toggleMenu = () => setMenuVisible(visible => !visible);

  return (
    <DropTarget>
      <Container fluid>
        <Row>
          <MainSidebar menuVisible={menuVisible} onToggle={toggleMenu} />
          <Col
            className="main-content p-0"
            lg={{ size: 10, offset: 2 }}
            md={{ size: 9, offset: 3 }}
            sm="12"
            tag="main"
          >
            <MainNavbar title={title} subtitle={subtitle} onToggleMenu={toggleMenu} />
            {children}
            <MainFooter />
          </Col>
        </Row>
      </Container>
    </DropTarget>
  );
};

DefaultLayout.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string
};

export default DefaultLayout;

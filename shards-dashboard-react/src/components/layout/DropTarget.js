import React, { useCallback, useRef, useState } from "react";
import PropTypes from "prop-types";

import useFileImport from "../../io/useFileImport";

/**
 * Makes the whole page a drop target for workbooks and scenario files.
 *
 * Drag events fire for every element entered and left, so a depth counter tracks whether
 * the pointer is still inside the window — otherwise the overlay flickers as the cursor
 * crosses child elements.
 */
const DropTarget = ({ children }) => {
  const { importFile } = useFileImport();
  const [active, setActive] = useState(false);
  const depth = useRef(0);

  const hasFiles = event =>
    Array.from(event.dataTransfer.types || []).includes("Files");

  const onDragEnter = useCallback(event => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    depth.current += 1;
    setActive(true);
  }, []);

  const onDragLeave = useCallback(event => {
    if (!hasFiles(event)) return;
    depth.current -= 1;
    if (depth.current <= 0) {
      depth.current = 0;
      setActive(false);
    }
  }, []);

  const onDragOver = useCallback(event => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    event => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth.current = 0;
      setActive(false);
      importFile(event.dataTransfer.files[0]);
    },
    [importFile]
  );

  return (
    <div
      className="drop-target"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {children}
      {active && (
        <div className="drop-overlay" aria-hidden="true">
          <div className="drop-overlay__card">
            <i className="material-icons">file_download</i>
            <strong>Drop to load</strong>
            <span>an .xlsx workbook or a .csv scenario</span>
          </div>
        </div>
      )}
    </div>
  );
};

DropTarget.propTypes = { children: PropTypes.node };

export default DropTarget;

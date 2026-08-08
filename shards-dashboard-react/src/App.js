import React from "react";
import { HashRouter as Router, Route } from "react-router-dom";

import routes from "./routes";
import { ModelProvider } from "./store/ModelContext";

import "bootstrap/dist/css/bootstrap.min.css";
import "./shards-dashboard/styles/shards-dashboards.1.1.0.min.css";
import "./styles/dashboard.css";

const App = () => (
  <ModelProvider>
    <Router basename={process.env.REACT_APP_BASENAME || ""}>
      <div>
        {routes.map(route => (
          <Route
            key={route.path}
            path={route.path}
            exact={route.exact}
            render={props => (
              <route.layout {...props} title={route.title} subtitle={route.subtitle}>
                <route.component {...props} />
              </route.layout>
            )}
          />
        ))}
      </div>
    </Router>
  </ModelProvider>
);

export default App;

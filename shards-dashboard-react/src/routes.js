import React from "react";
import { Redirect } from "react-router-dom";

import { DefaultLayout } from "./layouts";
import PolicyDash from "./views/PolicyDash";
import ModelDash from "./views/ModelDash";

const routes = [
  {
    path: "/",
    exact: true,
    layout: DefaultLayout,
    component: () => <Redirect to="/policy" />
  },
  {
    path: "/policy",
    layout: DefaultLayout,
    title: "Clim Policy Dash",
    subtitle: "Carbon pricing, abatement costs and climate damages",
    component: PolicyDash
  },
  {
    path: "/model",
    layout: DefaultLayout,
    title: "Clim Model Dash",
    subtitle: "From emissions through forcing to global warming",
    component: ModelDash
  }
];

export default routes;

declare module "react-plotly.js" {
  import { Component } from "react";

  interface PlotParams {
    data: Plotly.Data[];
    layout?: Partial<Plotly.Layout>;
    config?: Partial<Plotly.Config>;
    frames?: Plotly.Frame[];
    useResizeHandler?: boolean;
    style?: React.CSSProperties;
    className?: string;
  }

  class Plot extends Component<PlotParams> {}
  export default Plot;
}

declare module "react-plotly.js/factory" {
  import { Component } from "react";

  interface PlotParams {
    data: Plotly.Data[];
    layout?: Partial<Plotly.Layout>;
    config?: Partial<Plotly.Config>;
    frames?: Plotly.Frame[];
    useResizeHandler?: boolean;
    style?: React.CSSProperties;
    className?: string;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function createPlotlyComponent(plotly: any): typeof Component<PlotParams>;
  export default createPlotlyComponent;
}

declare module "plotly.js-dist-min" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Plotly: any;
  export default Plotly;
}

declare namespace Plotly {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Data = Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Layout = Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Config = Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Frame = Record<string, any>;
}

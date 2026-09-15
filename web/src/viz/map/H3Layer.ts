/** Builds the deck.gl H3 hexagon layer from already-aggregated cells (WEB.md §20-22). */
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import type { PickingInfo } from "@deck.gl/core";
import type { H3Metric, H3OverviewMetric } from "../../data/types";
import { violenceColors } from "../../utils/colors";
import { colorForShare, elevationForIntensity, opacityForIntensity } from "./mapMath";
import type { ColorMetric, IntensityMetric } from "./mapMath";

export type H3Cell = H3Metric | H3OverviewMetric;

export interface H3LayerOptions {
  intensityMetric: IntensityMetric;
  colorMetric: ColorMetric;
  extruded: boolean;
  onHover: (info: { cell: H3Cell | null; x: number; y: number }) => void;
}

export function buildH3Layer(cells: readonly H3Cell[], options: H3LayerOptions): H3HexagonLayer<H3Cell> {
  const maxIntensity = cells.reduce((max, cell) => Math.max(max, cell[options.intensityMetric]), 0);

  return new H3HexagonLayer<H3Cell>({
    id: "conflict-h3",
    data: cells,
    getHexagon: (cell) => cell.h3_id,
    getFillColor: (cell) => {
      const [r, g, b] = colorForShare(cell[options.colorMetric], violenceColors.stateBased, violenceColors.oneSided);
      const alpha = Math.round(opacityForIntensity(cell[options.intensityMetric], maxIntensity) * 255);
      return [r, g, b, alpha];
    },
    getElevation: (cell) => elevationForIntensity(cell[options.intensityMetric], maxIntensity),
    extruded: options.extruded,
    elevationScale: 1,
    wireframe: false,
    stroked: true,
    getLineColor: [255, 255, 255, 90],
    lineWidthMinPixels: 1,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 80],
    onHover: (info: PickingInfo<H3Cell>) => options.onHover({ cell: info.object ?? null, x: info.x ?? 0, y: info.y ?? 0 }),
    updateTriggers: {
      getFillColor: [options.colorMetric, options.intensityMetric],
      getElevation: [options.intensityMetric, options.extruded],
    },
  });
}

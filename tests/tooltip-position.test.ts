import { describe, expect, it } from "vitest";
import { calculateTooltipPosition } from "../src/plugin/tooltip-position";

const bounds = { top: 16, right: 1_000, bottom: 700, left: 16 };
const tooltip = { width: 288, height: 180 };

describe("calculateTooltipPosition", () => {
	it("centers a tooltip above a cell when it fits", () => {
		expect(
			calculateTooltipPosition(
				{ top: 300, right: 540, bottom: 340, left: 500, width: 40, height: 40 },
				tooltip,
				bounds,
			),
		).toEqual({ left: 376, top: 112 });
	});

	it("keeps a tooltip inside the left edge", () => {
		expect(
			calculateTooltipPosition(
				{ top: 300, right: 56, bottom: 340, left: 16, width: 40, height: 40 },
				tooltip,
				bounds,
			),
		).toEqual({ left: 16, top: 112 });
	});

	it("keeps a tooltip inside the right edge", () => {
		expect(
			calculateTooltipPosition(
				{ top: 300, right: 984, bottom: 340, left: 944, width: 40, height: 40 },
				tooltip,
				bounds,
			),
		).toEqual({ left: 712, top: 112 });
	});

	it("places a tooltip below a cell when the upper edge is too close", () => {
		expect(
			calculateTooltipPosition(
				{ top: 50, right: 540, bottom: 90, left: 500, width: 40, height: 40 },
				tooltip,
				bounds,
			),
		).toEqual({ left: 376, top: 98 });
	});

	it("clamps a tooltip when neither vertical side fully fits", () => {
		expect(
			calculateTooltipPosition(
				{ top: 100, right: 540, bottom: 140, left: 500, width: 40, height: 40 },
				{ width: 288, height: 600 },
				bounds,
			),
		).toEqual({ left: 376, top: 100 });
	});
});

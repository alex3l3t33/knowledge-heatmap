export interface TooltipBounds {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

export interface TooltipAnchorRect extends TooltipBounds {
	width: number;
	height: number;
}

export interface TooltipSize {
	width: number;
	height: number;
}

export interface TooltipPosition {
	left: number;
	top: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function calculateTooltipPosition(
	anchor: TooltipAnchorRect,
	tooltip: TooltipSize,
	bounds: TooltipBounds,
	gap = 8,
): TooltipPosition {
	const centeredLeft = anchor.left + anchor.width / 2 - tooltip.width / 2;
	const left = clamp(centeredLeft, bounds.left, bounds.right - tooltip.width);
	const spaceAbove = anchor.top - bounds.top;
	const spaceBelow = bounds.bottom - anchor.bottom;
	const showAbove =
		spaceAbove >= tooltip.height + gap || spaceAbove >= spaceBelow;
	const preferredTop = showAbove
		? anchor.top - tooltip.height - gap
		: anchor.bottom + gap;
	const top = clamp(preferredTop, bounds.top, bounds.bottom - tooltip.height);

	return { left, top };
}

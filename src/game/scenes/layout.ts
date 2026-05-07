export interface ViewportSize {
    width: number;
    height: number;
}

export function viewportCenter(viewport: ViewportSize): { x: number; y: number } {
    return {
        x: viewport.width / 2,
        y: viewport.height / 2
    };
}

export function coverScale(viewport: ViewportSize, asset: ViewportSize): number {
    return Math.max(viewport.width / asset.width, viewport.height / asset.height);
}

export function verticalPosition(viewport: ViewportSize, ratio: number): number {
    return viewport.height * ratio;
}

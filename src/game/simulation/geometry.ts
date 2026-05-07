import type { Point, Rect } from './state';

export function distanceBetween(a: Point, b: Point): number {
    return Math.hypot(b.x - a.x, b.y - a.y);
}

export function angleBetween(from: Point, to: Point): number {
    return Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2;
}

export function moveToward(from: Point, to: Point, distance: number): Point {
    const total = distanceBetween(from, to);
    if (total === 0 || distance >= total) {
        return { ...to };
    }

    const ratio = distance / total;
    return {
        x: from.x + (to.x - from.x) * ratio,
        y: from.y + (to.y - from.y) * ratio
    };
}

export function rectFromCenter(center: Point, width: number, height: number): Rect {
    return {
        x: center.x - width / 2,
        y: center.y - height / 2,
        width,
        height
    };
}

export function pointInRect(point: Point, rect: Rect): boolean {
    return point.x >= rect.x &&
        point.x <= rect.x + rect.width &&
        point.y >= rect.y &&
        point.y <= rect.y + rect.height;
}

export function rectsOverlap(first: Rect, second: Rect, padding = 0): boolean {
    return first.x - padding < second.x + second.width &&
        first.x + first.width + padding > second.x &&
        first.y - padding < second.y + second.height &&
        first.y + first.height + padding > second.y;
}

export function circleIntersectsRect(center: Point, radius: number, rect: Rect): boolean {
    const closestX = Math.max(rect.x, Math.min(center.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(center.y, rect.y + rect.height));
    const deltaX = center.x - closestX;
    const deltaY = center.y - closestY;

    return (deltaX * deltaX) + (deltaY * deltaY) <= radius * radius;
}

export function lineIntersectsRect(start: Point, end: Point, rect: Rect): boolean {
    if (pointInRect(start, rect) || pointInRect(end, rect)) {
        return true;
    }

    const corners = [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height }
    ];

    for (let index = 0; index < corners.length; index += 1) {
        const nextIndex = (index + 1) % corners.length;
        if (segmentsIntersect(start, end, corners[index], corners[nextIndex])) {
            return true;
        }
    }

    return false;
}

export function hasLineOfSight(start: Point, end: Point, blockers: Rect[]): boolean {
    return blockers.every((blocker) => !lineIntersectsRect(start, end, blocker));
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
    const denominator = ((d.y - c.y) * (b.x - a.x)) - ((d.x - c.x) * (b.y - a.y));
    if (denominator === 0) {
        return false;
    }

    const ua = (((d.x - c.x) * (a.y - c.y)) - ((d.y - c.y) * (a.x - c.x))) / denominator;
    const ub = (((b.x - a.x) * (a.y - c.y)) - ((b.y - a.y) * (a.x - c.x))) / denominator;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

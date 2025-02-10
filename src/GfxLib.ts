import { WdsNode, WdsEdge } from './winged_ds'

export class Point {
    x:number
    y:number
    constructor(x:number, y:number) {
        this.x=x
        this.y=y
    }
}

export interface SplitLineObj {
    midpoint:Point
    firstLine:Array<Point>
    secondLine:Array<Point>
}

export interface PerpPointsObj {
    left:Point
    right:Point
}

export interface TriPointTuple {
    p1:Point
    p2:Point
    p3:Point
}

export interface SuccessorsObj {
    leftSucc:WdsEdge
    rightSucc:WdsEdge
}

export interface CrossObj {
    nodes:Array<WdsNode>
    edges:Array<WdsEdge>
}

// Useful Graphics Functions
export function getMidpointAndSplitLine(polyline:Array<Point>):SplitLineObj {
    const midpointIndex = Math.floor(polyline.length / 2)
    return {
        midpoint:polyline[midpointIndex], 
        firstLine:polyline.slice(0, midpointIndex), 
        secondLine:polyline.slice(midpointIndex + 1)
    }
}

export function graphicsToCartesian(p:Point):Point {
    return new Point(p.x, -p.y)
}

export function cartesianToGraphics(p:Point):Point {
    return new Point(p.x, -p.y)
}

export function isReversedPolyline(p1:Array<Point>, p2:Array<Point>):boolean {
    if (p1.length !== p2.length) {
        return false
    }
    const n = p1.length
    for (let i = 0; i < n; i++) {
        if (p1[i] !== p2[n - i - 1]) {
            return false
        }
    }
    return true
}

export function isPointOnPolygon(p:Point, pts:Array<Point>) {
    for (const pt of pts) {
        if (p.x === pt.x && p.y === pt.y) {
            return true
        }
    }
    return false
}

export function isCCW(points:Array<Point>):boolean|undefined {
    let area = 0;
    const n = points.length;
    
    for (let i = 0; i < n; i++) {
        const {x:x1, y:y1} = points[i];
        const {x:x2, y:y2} = points[(i + 1) % n]; // next point, with wraparound
        area += x1 * y2 - y1 * x2;
    }

    if (area > 0) {
        return false
    } else if (area < 0) {
        return true
    }
}

export function isPointInPolygon(point:Point, polygonPoints:Array<Point>):boolean {
    const {x, y} = point;
    let inside = false;
    const n = polygonPoints.length;
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const {x:xi, y:yi} = polygonPoints[i];
        const {x:xj, y:yj} = polygonPoints[j];
        
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    
    return inside;
}

// returns left and right points with respect to CCW direction
// O(1)
export function findPerpendicularPoints(p1:Point, p2:Point, d:number):PerpPointsObj {
    // CONVERT TO CARTESIAN 
    const p1Cartesian = graphicsToCartesian(p1)
    const p2Cartesian = graphicsToCartesian(p2)

    let dirX = p2Cartesian.x - p1Cartesian.x;
    let dirY = p2Cartesian.y - p1Cartesian.y;
    
    let scale = d / Math.sqrt(dirX * dirX + dirY * dirY);

    // Counterclockwise direction (rotate 90 degrees)
    const leftCartesian = new Point(p1Cartesian.x - dirY * scale, p1Cartesian.y + dirX * scale)
    
    // Clockwise direction (rotate -90 degrees)
    const rightCartesian = new Point(p1Cartesian.x + dirY * scale, p1Cartesian.y - dirX * scale)
    
    return {
        left: cartesianToGraphics(leftCartesian),
        right: cartesianToGraphics(rightCartesian)
    };
}

/*
winged_ds.ts
Modified Winged Edge Datastructure for identifying faces in planar graphs in O(1) time
*/

// Classes and Interfaces
export class Point {
    x:number
    y:number
    constructor(x:number, y:number) {
        this.x=x
        this.y=y
    }
}

export class WdsNode {
    pt:Point
    outEdges:Array<WdsEdge>
    constructor(pt:Point) {
        this.pt = pt
        this.outEdges = []
    }
}

class WdsEdge {
    src:WdsNode
    dst:WdsNode
    constructor(src:WdsNode, dst:WdsNode) {
        this.src = src
        this.dst = dst;
    }
}

class WdsWingedEdge extends WdsEdge {
    polyline:Array<Point>
    leftPred:WdsEdge
    leftSucc:WdsEdge
    rightPred:WdsEdge
    rightSucc:WdsEdge
    faceLeft:number
    faceRight:number
    constructor(src:WdsNode, dst:WdsNode, polyline:Array<Point>, leftPred:WdsEdge, leftSucc:WdsEdge, rightPred:WdsEdge, rightSucc:WdsEdge, face:number) {
        super(src, dst)
        this.polyline = polyline
        this.leftPred = leftPred
        this.leftSucc = leftSucc
        this.rightPred = rightPred
        this.rightSucc = rightSucc
        this.faceLeft = face
        this.faceRight = face
    }
}

interface SplitLineObj {
    midpoint:Point
    firstLine:Array<Point>
    secondLine:Array<Point>
}

interface PerpPointsObj {
    left:Point
    right:Point
}

interface TriPointTuple {
    p1:Point
    p2:Point
    p3:Point
}

interface SuccessorsObj {
    leftSucc:WdsEdge
    rightSucc:WdsEdge
}

export interface CrossObj {
    nodes:Array<WdsNode>
    edges:Array<WdsEdge>
}

// Useful Graphics Functions
function getMidpointAndSplitLine(polyline:Array<Point>):SplitLineObj {
    const midpointIndex = Math.floor(polyline.length / 2)
    return {
        midpoint:polyline[midpointIndex], 
        firstLine:polyline.slice(0, midpointIndex), 
        secondLine:polyline.slice(midpointIndex + 1)
    }
}

function graphicsToCartesian(p:Point):Point {
    return new Point(p.x, -p.y)
}

function cartesianToGraphics(p:Point):Point {
    return new Point(p.x, -p.y)
}

function isReversedPolyline(p1:Array<Point>, p2:Array<Point>):boolean {
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

export class WingedEdgeGraph {
    nodes:Array<WdsNode>
    numFaces:number
    // expects some already properly initialized graph as an edge list (bc no isolated vertices)
    constructor(nodes:Array<WdsNode>) {
        this.nodes=nodes
        this.numFaces=1
    }

    // returns degree of node (outDeg == inDeg so doesn't matter)
    // O(1)
    static getDeg(node:WdsNode) {
        return node.outEdges.length
    }

    // given a 1 degree node in the graph, return the id of its face
    // returns -1 if not 1 degree node, id of face otherwise
    // O(1)
    static getFace(node:WdsNode):number {
        if (WingedEdgeGraph.getDeg(node) !== 1) {
            console.log("Node not leaf")
            return -1
        }
        const outEdge = node.outEdges[0]
        const nodeIncidentToWinged = outEdge.dst
        for (const edge of nodeIncidentToWinged.outEdges) {
            if (edge instanceof WdsWingedEdge) {
                if (edge.leftPred === outEdge) {
                    return edge.faceLeft
                }
                if (edge.rightPred === outEdge) {
                    return edge.faceRight
                }
            }
        }
        console.log("getFace Unexpected Error")
        return -1
    }

    // returns left and right points with respect to CCW direction
    // O(1)
    static findPerpendicularPoints(p1:Point, p2:Point, d:number):PerpPointsObj {
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

    // get successors based on how node is connected to winged edge
    // O(edge length)
    static getSuccessors(node:WdsNode):SuccessorsObj|undefined {
        if (WingedEdgeGraph.getDeg(node) !== 1) {
            console.log("Node not a leaf")
        }
        const outEdge = node.outEdges[0]
        const nodeIncidentToWinged = outEdge.dst
        if (WingedEdgeGraph.getDeg(nodeIncidentToWinged) === 3) {
            for (const edge of nodeIncidentToWinged.outEdges) {
                if (edge instanceof WdsWingedEdge) { // if it's a winged edge
                    if (edge.rightPred === outEdge) {
                        return {leftSucc: WingedEdgeGraph.getReversedEdge(edge.leftPred), rightSucc: edge}
                    } else {
                        return {leftSucc: edge, rightSucc: WingedEdgeGraph.getReversedEdge(edge.rightPred)}
                    }
                }
            }
        } else if (WingedEdgeGraph.getDeg(nodeIncidentToWinged) === 4) {
            const wingedEdges:Array<WdsWingedEdge> = nodeIncidentToWinged.outEdges.filter(edge => edge instanceof WdsWingedEdge)
            const leftSucc:WdsWingedEdge = wingedEdges.filter(we => we.leftPred === outEdge)[0]
            const rightSucc:WdsWingedEdge = wingedEdges.filter(we => we.rightPred === outEdge)[0]
            if (leftSucc && rightSucc) {
                return {leftSucc: leftSucc, rightSucc: rightSucc}
            }
        }
    }

    // get reversed edge for winged edges
    // O(edge length)
    static getReversedEdge(edge:WdsEdge):WdsEdge {
        if (edge instanceof WdsWingedEdge) {
            return edge.dst.outEdges.filter(out => (out instanceof WdsWingedEdge && out.dst === edge.src 
                    && isReversedPolyline(out.polyline, edge.polyline)))[0]
        }
        return edge.dst.outEdges.filter(out => (out.dst === edge.src))[0]
    }

    // get the internal node of a leaf node
    // O(1)
    static getInternalNodeOfLeaf(leafNode:WdsNode):WdsNode {
        return leafNode.outEdges[0].dst
    }

    // DFS traversal for updating faces after adding a super edge
    // O(n) where n = # of nodes
    dfs(startEdge:WdsWingedEdge, currEdge:WdsWingedEdge, prevEdge:WdsWingedEdge):number|undefined {
        if (currEdge === startEdge) {
            startEdge.faceLeft = this.numFaces++
            const startEdgeReverse = WingedEdgeGraph.getReversedEdge(startEdge)
            if (startEdgeReverse instanceof WdsWingedEdge) {
                startEdgeReverse.faceRight = startEdge.faceLeft
            }
            return startEdge.faceLeft
        }
        if (currEdge.leftSucc instanceof WdsWingedEdge) {
            const res = this.dfs(startEdge, currEdge.leftSucc, currEdge)
            if (res) {
                currEdge.faceLeft = res
                const currEdgeReverse = WingedEdgeGraph.getReversedEdge(currEdge)
                if (currEdgeReverse instanceof WdsWingedEdge) {
                    currEdgeReverse.faceRight = res
                }
                return res
            }
        } else if (currEdge.rightSucc instanceof WdsWingedEdge) {
            const res = this.dfs(startEdge, currEdge.rightSucc, currEdge)
            if (res) {
                currEdge.faceLeft = res
                const currEdgeReverse = WingedEdgeGraph.getReversedEdge(currEdge)
                if (currEdgeReverse instanceof WdsWingedEdge) {
                    currEdgeReverse.faceRight = res
                }
                return res
            }
        } else {
            if (WingedEdgeGraph.getDeg(currEdge.dst) === 3) {
                const currEdgeReverse = WingedEdgeGraph.getReversedEdge(currEdge)
                if (currEdgeReverse instanceof WdsWingedEdge) {
                    if (prevEdge === currEdge.rightPred && 
                            currEdgeReverse.rightSucc instanceof WdsWingedEdge) {
                        const res = this.dfs(startEdge, currEdgeReverse.rightSucc, currEdge)
                        if (res) {
                            currEdge.faceLeft = res
                            currEdge.faceRight = res
                            currEdgeReverse.faceLeft = res
                            currEdgeReverse.faceRight = res
                            return res
                        }
                    } else if (prevEdge === currEdge.leftPred &&
                            currEdgeReverse.leftSucc instanceof WdsWingedEdge) {
                        const res = this.dfs(startEdge, currEdgeReverse.leftSucc, currEdge)
                        if (res) {
                            currEdge.faceLeft = res
                            currEdge.faceRight = res
                            currEdgeReverse.faceLeft = res
                            currEdgeReverse.faceRight = res
                            return res
                        }
                    }
                }
            } else if (WingedEdgeGraph.getDeg(currEdge.dst) === 4) {
                const next = currEdge.dst.outEdges.filter(edge => (edge !== currEdge && edge instanceof WdsWingedEdge))[0]
                if (next instanceof WdsWingedEdge) {
                    const res = this.dfs(startEdge, next, currEdge)
                    if (res) {
                        currEdge.faceLeft = res
                        const currEdgeReverse = WingedEdgeGraph.getReversedEdge(currEdge)
                        if (currEdgeReverse instanceof WdsWingedEdge) {
                            currEdgeReverse.faceRight = res
                        }
                        return res
                    }
                }
            }
        }
    }

    // add a super edge b/w nodes n1 and n2 along polyline, updating faces and adding new nodes
    // Assumes:
    // graph is valid, bar can be drawn anywhere on polyline without touching anything, polyline has at least 3 points
    // O(n) where n = # of nodes
    addSuperEdge(n1:WdsNode, n2:WdsNode, polyline:Array<Point>):TriPointTuple|undefined {
        const {midpoint, firstLine, secondLine} = getMidpointAndSplitLine(polyline)
        const face = WingedEdgeGraph.getFace(n1)
        if (face === -1) {
            return
        }

        // updating the graph
        // find x,y coords for new nodes
        const {left, right} = WingedEdgeGraph.findPerpendicularPoints(midpoint, secondLine[0], 10)

        // create 3 new nodes (midpoint, newn1, newn2)
        const mp = new WdsNode(midpoint)
        const npl = new WdsNode(left) // new point left 
        const npr = new WdsNode(right) // new point right
        // create edge to/from midpoint and new1, new2
        const mpToNpl = new WdsEdge(mp, npl)
        const mpToNpr = new WdsEdge(mp, npr)
        const nplToMp = new WdsEdge(npl, mp)
        const nprToMp = new WdsEdge(npr, mp)
        // update the edge to/from n1 to become a winged edge that points to midpoint, check orientation to assign 
        // edges accordingly, faces should be the face of n1 and n2
        const internalOfN1 = WingedEdgeGraph.getInternalNodeOfLeaf(n1)
        const internalOfN2 = WingedEdgeGraph.getInternalNodeOfLeaf(n2)
        let mpToN1:WdsWingedEdge
        let n1ToMp:WdsWingedEdge
        let mpToN2:WdsWingedEdge
        let n2ToMp:WdsWingedEdge

        let succObj = WingedEdgeGraph.getSuccessors(n1)
        if (!succObj) {
            return
        }
        const {leftSucc:leftSuccN1, rightSucc:rightSuccN1} = succObj
        mpToN1 = new WdsWingedEdge(mp, internalOfN1, [...firstLine].reverse(), nprToMp, leftSuccN1, 
                nplToMp, rightSuccN1, face)
        n1ToMp = new WdsWingedEdge(internalOfN1, mp, firstLine, WingedEdgeGraph.getReversedEdge(rightSuccN1), 
                mpToNpl, WingedEdgeGraph.getReversedEdge(leftSuccN1), mpToNpr, face)
        if (leftSuccN1 instanceof WdsWingedEdge) {
            leftSuccN1.leftPred = mpToN1
        }
        if (rightSuccN1 instanceof WdsWingedEdge) {
            rightSuccN1.rightPred = mpToN1
        }
        const leftSuccN1Reversed = WingedEdgeGraph.getReversedEdge(leftSuccN1)
        const rightSuccN1Reversed = WingedEdgeGraph.getReversedEdge(rightSuccN1)
        if (leftSuccN1Reversed instanceof WdsWingedEdge) {
            leftSuccN1Reversed.rightSucc = n1ToMp
        }
        if (rightSuccN1Reversed instanceof WdsWingedEdge) {
            rightSuccN1Reversed.leftSucc = n1ToMp
        }
        mp.outEdges.push(mpToNpl, mpToNpr, mpToN1)
        internalOfN1.outEdges.push(n1ToMp)
        npl.outEdges.push(nplToMp)
        npr.outEdges.push(nprToMp)

        // update the edge to/from n2 to become a winged edge that points to midpoint, check orientation to assign edges 
        // accordingly, faces should be the face of n1 and n2
        succObj = WingedEdgeGraph.getSuccessors(n2)
        if (!succObj) {
            return
        }
        const {leftSucc:leftSuccN2, rightSucc:rightSuccN2} = succObj
        mpToN2 = new WdsWingedEdge(mp, internalOfN2, secondLine, nplToMp, leftSuccN2, 
                nprToMp, rightSuccN2, face)
        n2ToMp = new WdsWingedEdge(internalOfN2, mp, [...secondLine].reverse(), 
                WingedEdgeGraph.getReversedEdge(rightSuccN2), mpToNpr, WingedEdgeGraph.getReversedEdge(leftSuccN2), mpToNpl, face)
        if (leftSuccN2 instanceof WdsWingedEdge) {
            leftSuccN2.leftPred = mpToN2
        }
        if (rightSuccN2 instanceof WdsWingedEdge) {
            rightSuccN2.rightPred = mpToN2
        }
        const leftSuccN2Reversed = WingedEdgeGraph.getReversedEdge(leftSuccN2)
        const rightSuccN2Reversed = WingedEdgeGraph.getReversedEdge(rightSuccN2)
        if (leftSuccN2Reversed instanceof WdsWingedEdge) {
            leftSuccN2Reversed.rightSucc = n2ToMp
        }
        if (rightSuccN2Reversed instanceof WdsWingedEdge) {
            rightSuccN2Reversed.leftSucc = n2ToMp
        }

        // edge case
        if (internalOfN1 === internalOfN2) {
            const isLeftPred:boolean = leftSuccN1 instanceof WdsWingedEdge
            if (isLeftPred) {
                mpToN1.rightSucc = n2ToMp
                n1ToMp.leftPred = mpToN2
            } else {
                mpToN1.leftSucc = n2ToMp
                n1ToMp.rightPred = mpToN2
            }
        }

        // add edges and nodes to graph
        mp.outEdges.push(mpToN2)
        internalOfN2.outEdges = internalOfN2.outEdges.filter(edge => edge.dst !== n2)
        internalOfN1.outEdges = internalOfN1.outEdges.filter(edge => edge.dst !== n1)
        internalOfN2.outEdges.push(n2ToMp)
        this.nodes = this.nodes.filter(node => (node !== n1) && (node !== n2))

        // for n <= 2 this will do
        // run dfs starting from one of the new winged edges (updating faces if there is a new one)
        this.dfs(n1ToMp, mpToN2, n1ToMp)
        this.nodes.push(npl, npr)

        // for n > 2 we might have an some structure enclosed in a face, which means...
            // two DFS:
            // DFS 1: check if cycle, use shoelace thm to find out if we actually went the right way
            // If DFS 1 found a cycle, update winged edges in cycle + get all points for the polygon
            // iterate through all edges. If any winged edge is in the closed polygon that has the old face, update
            // NOTE: runtime on this might be heinous

        // return points newn1 and newn2 for frontend
        return {p1:left, p2:right, p3:midpoint}
    }

    static createCross(center:Point):CrossObj {
        const n1 = new WdsNode(new Point(center.x, center.y-30))
        const n2 = new WdsNode(new Point(center.x+30, center.y))
        const n3 = new WdsNode(new Point(center.x, center.y+30))
        const n4 = new WdsNode(new Point(center.x-30, center.y))
        const n5 = new WdsNode(new Point(center.x-1, center.y-1))
        const n6 = new WdsNode(new Point(center.x+1, center.y+1))

        const n1ToN5 = new WdsEdge(n1, n5)
        const n5ToN1 = new WdsEdge(n5, n1)
        const n4ToN5 = new WdsEdge(n4, n5)
        const n5ToN4 = new WdsEdge(n5, n4)
        const n3ToN6 = new WdsEdge(n3, n6)
        const n6ToN3 = new WdsEdge(n6, n3)
        const n2ToN6 = new WdsEdge(n2, n6)
        const n6ToN2 = new WdsEdge(n6, n2)
        const n5ToN6 = new WdsWingedEdge(n5, n6, [center], n1ToN5, n6ToN2, n4ToN5, n6ToN3, 0)
        const n6ToN5 = new WdsWingedEdge(n6, n5, [center], n3ToN6, n5ToN4, n2ToN6, n5ToN1, 0)

        n1.outEdges.push(n1ToN5)
        n2.outEdges.push(n2ToN6)
        n3.outEdges.push(n3ToN6)
        n4.outEdges.push(n4ToN5)
        n5.outEdges.push(n5ToN1, n5ToN4, n5ToN6)
        n6.outEdges.push(n6ToN2, n6ToN3, n6ToN5)

        return {nodes: [n1, n2, n3, n4], edges: [n1ToN5, n4ToN5, n3ToN6, n2ToN6, n6ToN5]}
    }
}

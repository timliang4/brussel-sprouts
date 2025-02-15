/*
winged_ds.ts
Modified Winged Edge Datastructure for identifying faces in planar graphs in O(1) time
*/
import { UnionFindNode, UnionFind } from "./UnionFind.ts"
import {Point, TriPointTuple, SuccessorsObj, CrossObj, 
    getMidpointAndSplitLine, isReversedPolyline,
    isPointOnPolygon, isCCW, isPointInPolygon, findPerpendicularPoints
} from "./GfxLib.ts"

// Classes and Interfaces
export class WdsNode {
    pt:Point
    outEdges:Array<WdsEdge>
    constructor(pt:Point) {
        this.pt = pt
        this.outEdges = []
    }
}

export class WdsEdge {
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


export class WingedEdgeGraph {
    nodes:Map<WdsNode, UnionFindNode>
    wingedEdges:Array<WdsWingedEdge>
    numFaces:number
    // create empty winged edge graph
    constructor() {
        this.nodes = new Map()
        this.wingedEdges=[]
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
            const wingedEdges:Array<WdsWingedEdge> = nodeIncidentToWinged.outEdges.filter(edge => edge 
                    instanceof WdsWingedEdge) as Array<WdsWingedEdge>
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

    static getPolygon(startEdge:WdsWingedEdge, currEdge:WdsWingedEdge, prevEdge:WdsWingedEdge, polyline:Array<Point>):void {
        if (currEdge === startEdge) {
            polyline.push(...currEdge.polyline)
            return
        }
        if (WingedEdgeGraph.getDeg(currEdge.dst) === 4) {
            polyline.push(...currEdge.polyline)
            const wingedOutEdges = currEdge.dst.outEdges.filter(edge => (edge !== WingedEdgeGraph.getReversedEdge(currEdge) 
                    && edge instanceof WdsWingedEdge))
            if (currEdge.leftSucc instanceof WdsWingedEdge) {
                    WingedEdgeGraph.getPolygon(startEdge, currEdge.leftSucc, currEdge, polyline)
            } else {
                const next = wingedOutEdges.find(edge => edge !== currEdge.rightSucc)
                if (next !== undefined && next instanceof WdsWingedEdge) {
                    WingedEdgeGraph.getPolygon(startEdge, next, currEdge, polyline)
                }
            }
        } else if (currEdge.leftSucc instanceof WdsWingedEdge) {
            polyline.push(...currEdge.polyline)
            WingedEdgeGraph.getPolygon(startEdge, currEdge.leftSucc, currEdge, polyline)
        } else if (currEdge.rightSucc instanceof WdsWingedEdge) {
            polyline.push(...currEdge.polyline)
            WingedEdgeGraph.getPolygon(startEdge, currEdge.rightSucc, currEdge, polyline)
        } else if (WingedEdgeGraph.getDeg(currEdge.dst) === 3) {
            const currEdgeReverse = WingedEdgeGraph.getReversedEdge(currEdge)
            if (currEdgeReverse instanceof WdsWingedEdge) {
                if (prevEdge === currEdge.rightPred) { 
                    if (currEdgeReverse.rightSucc instanceof WdsWingedEdge) {
                        WingedEdgeGraph.getPolygon(startEdge, currEdgeReverse.rightSucc, currEdge, polyline)
                    } else if (currEdgeReverse.leftSucc instanceof WdsWingedEdge) {
                        WingedEdgeGraph.getPolygon(startEdge, currEdgeReverse.leftSucc, currEdge, polyline)
                    }
                } else if (prevEdge === currEdge.leftPred) { 
                    if (currEdgeReverse.leftSucc instanceof WdsWingedEdge) {
                        WingedEdgeGraph.getPolygon(startEdge, currEdgeReverse.leftSucc, currEdge, polyline)
                    } else if (currEdgeReverse.rightSucc instanceof WdsWingedEdge) {
                        WingedEdgeGraph.getPolygon(startEdge, currEdgeReverse.rightSucc, currEdge, polyline)
                    }
                }
            }
        }
    }

    // DFS traversal for updating faces after adding a super edge
    // O(n) where n = # of nodes
    dfs(startEdge:WdsWingedEdge, currEdge:WdsWingedEdge, prevEdge:WdsWingedEdge, isCcw:boolean):number|undefined {
        if (currEdge === startEdge) {
            if (isCcw) {
                startEdge.faceLeft = this.numFaces++
            } else {
                startEdge.faceRight = this.numFaces++
            }
            const startEdgeReverse = WingedEdgeGraph.getReversedEdge(startEdge)
            if (startEdgeReverse instanceof WdsWingedEdge) {
                if (isCcw) {
                    startEdgeReverse.faceRight = startEdge.faceLeft
                } else {
                    startEdgeReverse.faceLeft = startEdge.faceRight
                }
            }
            return (isCcw) ? startEdge.faceLeft : startEdge.faceRight
        }
        if (WingedEdgeGraph.getDeg(currEdge.dst) === 4) {
            let res:number|undefined
            const wingedOutEdges = currEdge.dst.outEdges.filter(edge => (edge !== WingedEdgeGraph.getReversedEdge(currEdge) 
                    && edge instanceof WdsWingedEdge))
            if (isCcw && currEdge.leftSucc instanceof WdsWingedEdge) {
                res = this.dfs(startEdge, currEdge.leftSucc, currEdge, isCcw)
            } else if (!isCcw && currEdge.rightSucc instanceof WdsWingedEdge) {
                res = this.dfs(startEdge, currEdge.rightSucc, currEdge, isCcw)
            } else {
                const next = wingedOutEdges.find(edge => edge !== (isCcw ? currEdge.rightSucc : currEdge.leftSucc))
                if (next !== undefined && next instanceof WdsWingedEdge) {
                    res = this.dfs(startEdge, next, currEdge, isCcw)
                }
            }
            if (res) {
                if (isCcw) {
                    currEdge.faceLeft = res
                } else {
                    currEdge.faceRight = res
                }
                const currEdgeReverse = WingedEdgeGraph.getReversedEdge(currEdge)
                if (currEdgeReverse instanceof WdsWingedEdge) {
                    if (isCcw) {
                        currEdgeReverse.faceRight = res
                    } else {
                        currEdgeReverse.faceLeft = res
                    }
                }
                return res
            }
        } else if ((isCcw && currEdge.leftSucc instanceof WdsWingedEdge) || (!isCcw && currEdge.rightSucc instanceof WdsWingedEdge)) {
            let res:number|undefined
            if (isCcw && currEdge.leftSucc instanceof WdsWingedEdge) {
                res = this.dfs(startEdge, currEdge.leftSucc, currEdge, isCcw)
            } else if (currEdge.rightSucc instanceof WdsWingedEdge) {
                res = this.dfs(startEdge, currEdge.rightSucc, currEdge, isCcw)
            }
            if (res) {
                if (isCcw) {
                    currEdge.faceLeft = res
                } else {
                    currEdge.faceRight = res
                }
                const currEdgeReverse = WingedEdgeGraph.getReversedEdge(currEdge)
                if (currEdgeReverse instanceof WdsWingedEdge) {
                    if (isCcw) {
                        currEdgeReverse.faceRight = res
                    } else {
                        currEdgeReverse.faceLeft = res
                    }
                }
                return res
            }
        } else if ((isCcw && currEdge.rightSucc instanceof WdsWingedEdge) || (!isCcw && currEdge.leftSucc instanceof WdsWingedEdge)) {
            let res:number|undefined
            if (isCcw && currEdge.rightSucc instanceof WdsWingedEdge) {
                res = this.dfs(startEdge, currEdge.rightSucc, currEdge, isCcw)
            } else if (currEdge.leftSucc instanceof WdsWingedEdge) {
                res = this.dfs(startEdge, currEdge.leftSucc, currEdge, isCcw)
            }
            if (res) {
                if (isCcw) {
                    currEdge.faceLeft = res
                } else {
                    currEdge.faceRight = res
                }
                const currEdgeReverse = WingedEdgeGraph.getReversedEdge(currEdge)
                if (currEdgeReverse instanceof WdsWingedEdge) {
                    if (isCcw) {
                        currEdgeReverse.faceRight = res
                    } else {
                        currEdgeReverse.faceLeft = res
                    }
                }
                return res
            }
        } else if (WingedEdgeGraph.getDeg(currEdge.dst) === 3) {
            let res:number|undefined
            const currEdgeReverse = WingedEdgeGraph.getReversedEdge(currEdge)
            if (currEdgeReverse instanceof WdsWingedEdge) {
                if (prevEdge === currEdge.rightPred) { 
                    if (currEdgeReverse.rightSucc instanceof WdsWingedEdge) {
                        res = this.dfs(startEdge, currEdgeReverse.rightSucc, currEdge, isCcw)
                    } else if (currEdgeReverse.leftSucc instanceof WdsWingedEdge) {
                        res = this.dfs(startEdge, currEdgeReverse.leftSucc, currEdge, isCcw)
                    }
                } else if (prevEdge === currEdge.leftPred) { 
                    if (currEdgeReverse.leftSucc instanceof WdsWingedEdge) {
                        res = this.dfs(startEdge, currEdgeReverse.leftSucc, currEdge, isCcw)
                    } else if (currEdgeReverse.rightSucc instanceof WdsWingedEdge) {
                        res = this.dfs(startEdge, currEdgeReverse.rightSucc, currEdge, isCcw)
                    }
                }
                if (res) {
                    currEdge.faceLeft = res
                    currEdge.faceRight = res
                    currEdgeReverse.faceLeft = res
                    currEdgeReverse.faceRight = res
                    return res
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
        const face1 = WingedEdgeGraph.getFace(n1)
        const face2 = WingedEdgeGraph.getFace(n2)
        if (face1 !== face2) {
            return {p1: new Point(-1, -1), p2: new Point(-1, -1), p3: new Point(-1, -1)}
        }
        const inSameCC:boolean = UnionFind.sameSet(this.nodes.get(n1) as UnionFindNode, 
                this.nodes.get(n2) as UnionFindNode)

        // updating the graph
        // find x,y coords for new nodes
        const {left, right} = findPerpendicularPoints(midpoint, secondLine[0], 10)

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
                nplToMp, rightSuccN1, face1)
        n1ToMp = new WdsWingedEdge(internalOfN1, mp, firstLine, WingedEdgeGraph.getReversedEdge(rightSuccN1), 
                mpToNpl, WingedEdgeGraph.getReversedEdge(leftSuccN1), mpToNpr, face1)
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
                nprToMp, rightSuccN2, face1)
        n2ToMp = new WdsWingedEdge(internalOfN2, mp, [...secondLine].reverse(), 
                WingedEdgeGraph.getReversedEdge(rightSuccN2), mpToNpr, WingedEdgeGraph.getReversedEdge(leftSuccN2), mpToNpl, face1)
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

        // update hashmap
        this.nodes.set(npl, UnionFind.makeSet(npl))
        UnionFind.union(this.nodes.get(npl) as UnionFindNode, this.nodes.get(n1) as UnionFindNode)
        this.nodes.set(npr, UnionFind.makeSet(npr))
        UnionFind.union(this.nodes.get(npr) as UnionFindNode, this.nodes.get(n2) as UnionFindNode)
        UnionFind.union(this.nodes.get(npl) as UnionFindNode, this.nodes.get(npr) as UnionFindNode)

        // don't need n1 and n2 anymore, although they will still be used in the union find data structure
        this.nodes.forEach((_, node) => {
            if (node === n1 || node === n2) {
                this.nodes.delete(node)
            }
        })

        // update edge list with new winged edges
        this.wingedEdges.push(mpToN2, n2ToMp, mpToN1, n1ToMp)

        // need to update faces
        if (inSameCC) {
            const polygonPoints:Array<Point> = []
            WingedEdgeGraph.getPolygon(n1ToMp, mpToN2, n1ToMp, polygonPoints)
            let isCcw = isCCW(polygonPoints)
            if (isCcw === undefined) {
                // shouldn't matter
                isCcw = true
            }
            const originalFace = isCcw ? mpToN2.faceLeft : mpToN2.faceRight
            const newFace = this.dfs(n1ToMp, mpToN2, n1ToMp, isCcw)
            if (newFace !== undefined) {
                for (const edge of this.wingedEdges) {
                    // not on edge, but is totally inside
                    if (edge.polyline.every(pt => !isPointOnPolygon(pt, polygonPoints)) 
                        && edge.polyline.every(pt => isPointInPolygon(pt, polygonPoints))) {
                        if (edge.faceLeft === originalFace) {
                            edge.faceLeft = newFace
                        }
                        if (edge.faceRight === originalFace) {
                            edge.faceRight = newFace
                        }
                    }
                }
            }
        }

        // return points newn1 and newn2 for frontend
        return {p1:left, p2:right, p3:midpoint}
    }

    createCross(center:Point):CrossObj {
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

        this.nodes.set(n1, UnionFind.makeSet(n1))
        this.nodes.set(n2, UnionFind.makeSet(n2)) 
        UnionFind.union(this.nodes.get(n1) as UnionFindNode, this.nodes.get(n2) as UnionFindNode)
        this.nodes.set(n3, UnionFind.makeSet(n3))
        UnionFind.union(this.nodes.get(n1) as UnionFindNode, this.nodes.get(n3) as UnionFindNode)
        this.nodes.set(n4, UnionFind.makeSet(n4))
        UnionFind.union(this.nodes.get(n1) as UnionFindNode, this.nodes.get(n4) as UnionFindNode)
        // this.nodes.set(n5, UnionFind.makeSet(n5))
        // UnionFind.union(this.nodes.get(n1) as UnionFindNode, this.nodes.get(n5) as UnionFindNode)
        // this.nodes.set(n6, UnionFind.makeSet(n6))
        // UnionFind.union(this.nodes.get(n1) as UnionFindNode, this.nodes.get(n6) as UnionFindNode)
        this.wingedEdges.push(n5ToN6, n6ToN5)
        return {nodes: [n1, n2, n3, n4], edges: [n1ToN5, n4ToN5, n3ToN6, n2ToN6, n6ToN5]}
    }
}

export class UnionFindNode {
    parent:UnionFindNode
    val:any
    rank:number
    constructor(val:any) {
        this.val = val
        this.rank = 0
        this.parent = this
    }
}

export class UnionFind {
    // create a singleton set 
    // O(1)
    static makeSet(val:any):UnionFindNode {
        const singleton =  new UnionFindNode(val)
        return singleton
    }

    // get root
    // O(log(n))
    static getRoot(node:UnionFindNode):UnionFindNode {
        while (node.parent !== node) {
            node = node.parent
        }
        return node
    }

    static sameSet(n1:UnionFindNode, n2:UnionFindNode):boolean {
        if (UnionFind.getRoot(n1) === UnionFind.getRoot(n2)) {
            return true
        }
        return false
    }

    // union
    // O(log(n))
    static union(n1:UnionFindNode, n2:UnionFindNode):void {
        const n1Root = UnionFind.getRoot(n1)
        const n2Root = UnionFind.getRoot(n2)
        if (n1Root === n2Root) {
            return
        }
        if (n1Root.rank < n2Root.rank) {
            n1Root.parent = n2Root
        } else {
            n2Root.parent = n1Root
            if (n1Root.rank === n2Root.rank) {
                n1Root.rank++
            }
        }
    }
}

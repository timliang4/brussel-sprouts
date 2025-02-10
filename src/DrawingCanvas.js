import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Line, Circle } from 'react-konva';
import { WingedEdgeGraph } from './winged_ds.ts'
import { Point } from './GfxLib.ts'

const colors = 
[
  "#FF5733",  // vibrant orange-red
  "#33FF57",  // bright green
  "#5733FF",  // electric purple
  "#FF33A1",  // hot pink
  "#33FFF5",  // cyan
  "#FF8C33",  // warm orange
  "#F533FF",  // magenta
  "#FF5733",  // deep red
  "#33D4FF",  // sky blue
  "#8CFF33",  // lime green
  "#FF3380",  // bright pink
  "#6A33FF",  // deep purple
  "#FFB533",  // amber
  "#33FF87",  // light green
  "#FF5733",  // coral
  "#2D33FF",  // blue
  "#FFD133",  // mustard yellow
  "#FF5733",  // rose
  "#FF3370",  // deep pink
  "#33FFE0"   // turquoise
]

const numCrosses = 1

const DrawComponent = () => {
  const [lines, setLines] = useState([]); // Holds all lines
  const [currentLine, setCurrentLine] = useState([]); // Current line being drawn
  const [isDrawing, setIsDrawing] = useState(false); // To track if the user is drawing
  const startNodeRef = useRef(null)
  const [nodes, setNodes] = useState([]); // free nodes
  const modelRef = useRef(null);
  const proximityThreshold = 10; // Minimum distance to stop drawing (proximity)
  const selfProximityThreshold = 10 

  useEffect(() => {
    let crosses = []
    modelRef.current = new WingedEdgeGraph();
    if (numCrosses === 1) {
      console.log(window.innerHeight / 2)
      console.log(window.innerWidth / 2)
      const c1 = modelRef.current.createCross(new Point(window.innerWidth / 2, window.innerHeight / 2))
      crosses.push(c1)
    } else if (numCrosses === 2) {
      const c1 = modelRef.current.createCross(new Point(window.innerWidth / 3, window.innerHeight / 2))
      const c2 = modelRef.current.createCross(new Point(2 * (window.innerWidth / 3), window.innerHeight / 2))
      crosses.push(c1, c2)
    } else if (numCrosses === 3) {
      const c1 = modelRef.current.createCross(new Point(window.innerWidth / 2, window.innerHeight / 3))
      const c2 = modelRef.current.createCross(new Point(window.innerWidth / 3, 2 * (window.innerHeight / 3)))
      const c3 = modelRef.current.createCross(new Point(2 * (window.innerWidth / 3), 2 * (window.innerHeight / 3)))
      crosses.push(c1, c2, c3)
    } else if (numCrosses === 4) {
      const c1 = modelRef.current.createCross(new Point(window.innerWidth / 3, window.innerHeight / 3))
      const c2 = modelRef.current.createCross(new Point(2 * (window.innerWidth / 3), window.innerHeight / 3))
      const c3 = modelRef.current.createCross(new Point(window.innerWidth / 3, 2 * (window.innerHeight / 3)))
      const c4 = modelRef.current.createCross(new Point(2 * (window.innerWidth / 3), 2 * (window.innerHeight / 3)))
      crosses.push(c1, c2, c3, c4)
    }
    console.log(crosses.reduce((acc, val) => [...acc, ...val.edges.map(edge => [edge.src.pt, edge.dst.pt])], []))
    setLines(crosses.reduce((acc, val) => [...acc, ...val.edges.map(edge => [edge.src.pt, edge.dst.pt])], []))
    setNodes(crosses.reduce((acc, val) => [...acc, ...val.nodes], []))
  }, []); // Empty dependency array ensures this runs once, when the component mounts
  
  // Function to calculate the distance between two points
  const distanceBetweenPoints = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  // Function to calculate the orientation of three points (p, q, r)
  const orientation = (p, q, r) => {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (val === 0) return 0; // Collinear
    return (val > 0) ? 1 : 2; // Clockwise or Counterclockwise
  };

  // Function to check if point q lies on segment pr
  const onSegment = (p, q, r) => {
    return (q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
            q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y));
  };

  // Function to check if two line segments (p1-p2) and (p3-p4) intersect
  const doLinesIntersect = (p1, p2, p3, p4) => {
    const o1 = orientation(p1, p2, p3);
    const o2 = orientation(p1, p2, p4);
    const o3 = orientation(p3, p4, p1);
    const o4 = orientation(p3, p4, p2);

    // General case: segments p1p2 and p3p4 intersect if their orientations differ
    if (o1 !== o2 && o3 !== o4) {
      return true;
    }

    // Special cases: check for collinearity and overlap
    if (o1 === 0 && onSegment(p1, p3, p2)) return true;
    if (o2 === 0 && onSegment(p1, p4, p2)) return true;
    if (o3 === 0 && onSegment(p3, p1, p4)) return true;
    if (o4 === 0 && onSegment(p3, p2, p4)) return true;

    return false; // No intersection
  };

  // Function to check if the new line segment is too close to any existing lines
  const isLineTooCloseToOtherLines = (newLine) => {
    const pos = newLine[newLine.length - 1]
    // Iterate through each line already drawn
    for (let line of lines) {
      for (let i = 0; i < line.length; i++) {
        if (distanceBetweenPoints(pos, line[i]) < proximityThreshold) {
          return true; // Too close to an existing line
        }
      }
    }
    return false; // No proximity issue
  };

  const isLineTooCloseToItself = (newLine) => {
    const pos = newLine[newLine.length - 1]
    for (let i = 0; i < newLine.length - 20; i++) {
      if(distanceBetweenPoints(pos, newLine[i]) < selfProximityThreshold) {
        return true
      }
    }
    return false
  }

  const doesLineIntersectWithOtherLines = (newLine) => {
    const newSegmentStart = newLine[newLine.length - 2];
    const newSegmentEnd = newLine[newLine.length - 1];
    for (let line of lines) {
      for (let i = 0; i < line.length - 1; i++) {
        const segmentStart = line[i];
        const segmentEnd = line[i + 1];
        if (doLinesIntersect(newSegmentStart, newSegmentEnd, segmentStart, segmentEnd)) {
          return true
        }
      }
    }
    return false
  }

  const doesLineIntersectWithItself = (newLine) => {
    const newSegmentStart = newLine[newLine.length - 2];
    const newSegmentEnd = newLine[newLine.length - 1];
    for (let i = 0; i < newLine.length - 3; i++) {
        const segmentStart = newLine[i];
        const segmentEnd = newLine[i + 1];
        if (doLinesIntersect(newSegmentStart, newSegmentEnd, segmentStart, segmentEnd)) {
          return true
        }
    }
    return false
  }

  const isCloseToFreeNode = (pos) => {
    for (const node of nodes) {
      if (distanceBetweenPoints(pos, node.pt) <= 10) {
        return node
      }
    }
  }

  const handleMouseDown = (e) => {
    const pos = e.target.getStage().getPointerPosition()
    const node = isCloseToFreeNode(pos)
    if (isCloseToFreeNode(pos)) {
      // only go into drawing mode when close enough to a free node
      setIsDrawing(true); // Start drawing when mouse is pressed down
      setCurrentLine([node.pt]); // Reset current line to start fresh
      startNodeRef.current = node
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return; // Only draw if mouse is pressed down

    const pos = e.target.getStage().getPointerPosition();

    if (pos) {
      const newLine = [...currentLine, pos]; // Add the new point to the current line

      if (newLine.length > 1) {
        // prevent duplicate points in the polyline
        if (pos.x === newLine[newLine.length - 2].x && pos.y === newLine[newLine.length - 2].y) {
          return
        }

        const node = isCloseToFreeNode(pos)
        if (node) {
          if (node !== startNodeRef.current) {
            const { p1:left, p2:right, p3:mid } = modelRef.current.addSuperEdge(startNodeRef.current, node, newLine.slice(1))
            setNodes(Array.from(modelRef.current.nodes.keys()))
            setLines([...lines, [...newLine, node.pt], [mid, left], [mid, right]])
            setIsDrawing(false)
            setCurrentLine([])
            return
          }
        } else {
          if (isLineTooCloseToItself(newLine) || doesLineIntersectWithItself(newLine)) {
            setIsDrawing(false)
            setCurrentLine([])
            return
          }
          if (isLineTooCloseToOtherLines(newLine) || doesLineIntersectWithOtherLines(newLine)) {
            setIsDrawing(false)
            setCurrentLine([])
            return
          }
        }
      }

      setCurrentLine(newLine); // Update the current line with the new point
    }
  };

  const handleMouseUp = () => {
    // only set currentline to lines if it finishes close enough to another free node
    // if (currentLine.length > 1) {
    //   setLines([...lines, currentLine]); // Add the completed line to the list of drawn lines
    // }
    setCurrentLine([])
    setIsDrawing(false); // Stop drawing when mouse is released
  };

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      onMouseDown={handleMouseDown} // Start drawing on mouse down
      onMouseMove={handleMouseMove} // Track mouse movement
      onMouseUp={handleMouseUp} // Complete drawing on mouse up
    >
      <Layer>
        {/* Render all the previously drawn lines */}
        {lines.map((line, idx) => (
          <Line
            key={idx}
            points={line.flatMap(p => [p.x, p.y])}
            stroke="black"
            strokeWidth={2}
            lineJoin="round"
            lineCap="round"
          />
        ))}
        {nodes.map((node, idx) => (
          <Circle
            key={idx}
            radius={3}
            fill={colors[WingedEdgeGraph.getFace(node)]}
            x={node.pt.x}
            y={node.pt.y}
          />
        ))}
        {/* Render the current line being drawn */}
        <Line
          points={currentLine.flatMap(p => [p.x, p.y])}
          stroke="blue"
          strokeWidth={2}
          lineJoin="round"
          lineCap="round"
        />
      </Layer>
    </Stage>
  );
};

export default DrawComponent;

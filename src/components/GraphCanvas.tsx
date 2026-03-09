import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force';
import { useNavigate } from 'react-router-dom';
import type { GraphNode, GraphEdge } from '@/types';

interface SimNode extends SimulationNodeDatum, GraphNode {
  x: number;
  y: number;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  relationshipType: string;
  description: string | null;
  strength: number;
}

const relationLabel: Record<string, string> = {
  extends: 'Extends',
  contrasts: 'Contrasts',
  shares_concept: 'Shared Concept',
  prerequisite: 'Prerequisite',
  related: 'Related',
};

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export default function GraphCanvas({ nodes, edges }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [simLinks, setSimLinks] = useState<SimLink[]>([]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const [dragNode, setDragNode] = useState<SimNode | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const simRef = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null);
  const navigate = useNavigate();

  // Count connections per node for sizing
  const connectionCount = useMemo(() => {
    const map = new Map<number, number>();
    edges.forEach((e) => {
      map.set(e.source, (map.get(e.source) || 0) + 1);
      map.set(e.target, (map.get(e.target) || 0) + 1);
    });
    return map;
  }, [edges]);

  useEffect(() => {
    const simNodesData: SimNode[] = nodes.map((n) => ({
      ...n,
      x: Math.random() * 600 - 300,
      y: Math.random() * 400 - 200,
    }));

    const nodeMap = new Map(simNodesData.map((n) => [n.id, n]));
    const simLinksData: SimLink[] = edges
      .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map((e) => ({
        source: nodeMap.get(e.source)!,
        target: nodeMap.get(e.target)!,
        relationshipType: e.relationshipType,
        description: e.description,
        strength: e.strength,
      }));

    const sim = forceSimulation(simNodesData)
      .force('link', forceLink<SimNode, SimLink>(simLinksData).id((d) => d.id).distance(120).strength((d) => d.strength * 0.5))
      .force('charge', forceManyBody().strength(-200))
      .force('center', forceCenter(0, 0))
      .force('collide', forceCollide<SimNode>().radius((d) => getRadius(d.id) + 8))
      .on('tick', () => {
        setSimNodes([...simNodesData]);
        setSimLinks([...simLinksData]);
      });

    simRef.current = sim;

    return () => { sim.stop(); };
  }, [nodes, edges]);

  function getRadius(nodeId: number) {
    const count = connectionCount.get(nodeId) || 0;
    return Math.max(16, Math.min(32, 16 + count * 4));
  }

  function getPrimaryColor(node: GraphNode) {
    if (node.topics.length > 0) {
      return node.topics.reduce((best, t) => t.relevance > best.relevance ? t : best).color;
    }
    return '#94A3B8';
  }

  const handleNodePointerDown = useCallback((e: React.PointerEvent, node: SimNode) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragNode(node);
    const sim = simRef.current;
    if (sim) {
      sim.alphaTarget(0.3).restart();
      node.fx = node.x;
      node.fy = node.y;
    }
  }, []);

  const handleNodePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragNode || !svgRef.current) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2 - transform.x) / transform.k;
    const y = (e.clientY - rect.top - rect.height / 2 - transform.y) / transform.k;
    dragNode.fx = x;
    dragNode.fy = y;
  }, [dragNode, transform]);

  const handleNodePointerUp = useCallback(() => {
    if (!dragNode) return;
    const sim = simRef.current;
    if (sim) sim.alphaTarget(0);
    dragNode.fx = null;
    dragNode.fy = null;
    setDragNode(null);
  }, [dragNode]);

  // Pan handlers
  const handleSvgPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.target === svgRef.current || (e.target as Element).tagName === 'rect') {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
      (e.target as Element).setPointerCapture(e.pointerId);
    }
  }, [transform]);

  const handleSvgPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setTransform((t) => ({ ...t, x: panStart.current.tx + dx, y: panStart.current.ty + dy }));
  }, [isPanning]);

  const handleSvgPointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((t) => ({
      ...t,
      k: Math.max(0.3, Math.min(3, t.k * scaleFactor)),
    }));
  }, []);

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        className="w-full h-full"
        onPointerDown={handleSvgPointerDown}
        onPointerMove={(e) => { handleSvgPointerMove(e); handleNodePointerMove(e); }}
        onPointerUp={() => { handleSvgPointerUp(); handleNodePointerUp(); }}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? 'grabbing' : 'grab', touchAction: 'none' }}
      >
        <rect width="100%" height="100%" fill="transparent" />
        <g style={{ transform: `translate(50%, 50%) translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`, transformOrigin: '0 0' }}>
          <g>
            {/* Edges */}
            {simLinks.map((link, i) => {
              const source = link.source as SimNode;
              const target = link.target as SimNode;
              return (
                <line
                  key={i}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="#CBD5E1"
                  strokeWidth={Math.max(1, link.strength * 3)}
                  strokeOpacity={0.6}
                  onPointerEnter={(e) => {
                    const rect = svgRef.current!.getBoundingClientRect();
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top - 10,
                      content: `${relationLabel[link.relationshipType] || link.relationshipType}${link.description ? ': ' + link.description : ''}`,
                    });
                  }}
                  onPointerLeave={() => setTooltip(null)}
                  style={{ cursor: 'pointer' }}
                />
              );
            })}
            {/* Nodes */}
            {simNodes.map((node) => {
              const r = getRadius(node.id);
              return (
                <g key={node.id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={r}
                    fill={getPrimaryColor(node)}
                    stroke="white"
                    strokeWidth={2}
                    style={{ cursor: 'pointer' }}
                    onPointerDown={(e) => handleNodePointerDown(e, node)}
                    onPointerEnter={(e) => {
                      const rect = svgRef.current!.getBoundingClientRect();
                      setTooltip({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top - 10,
                        content: `${node.title}\n${node.topics.map((t) => t.name).join(', ')}`,
                      });
                    }}
                    onPointerLeave={() => setTooltip(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/doc/${node.id}/edit`);
                    }}
                  />
                  <text
                    x={node.x}
                    y={node.y + r + 14}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#475569"
                    pointerEvents="none"
                    className="select-none"
                  >
                    {node.title.length > 20 ? node.title.slice(0, 18) + '...' : node.title}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-gray-900 text-white text-xs rounded-lg px-3 py-2 max-w-[200px] whitespace-pre-line shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { TopHeader } from "./TopHeader";
import { getTerrainGrid, planRoverPath, GridCell, RoverPathResult, PathNode } from "../services/lunaiceApi";
import { MapPin, Flag, Route, Clock, BatteryCharging, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

const GRID_SIZE = 40; // Must match backend

const ZONE_OPTIONS = [
  { id: "Z001", name: "Alpha Landing Zone" },
  { id: "Z002", name: "Beta Landing Zone" },
  { id: "Z003", name: "Gamma Landing Zone" },
  { id: "Z004", name: "Delta Landing Zone" },
];

const REGION_OPTIONS = [
  { id: "R001", name: "Ice Region 001" },
  { id: "R002", name: "Ice Region 002" },
  { id: "R003", name: "Ice Region 003" },
  { id: "R004", name: "Ice Region 004" },
  { id: "R005", name: "Ice Region 005" },
  { id: "R006", name: "Ice Region 006" },
];

export function RoverPathPlanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [terrain, setTerrain] = useState<GridCell[]>([]);
  const [pathResult, setPathResult] = useState<RoverPathResult | null>(null);
  const [loadingTerrain, setLoadingTerrain] = useState(true);
  const [loadingPath, setLoadingPath] = useState(false);
  const [selectedStartZone, setSelectedStartZone] = useState("Z001");
  const [selectedTargetRegion, setSelectedTargetRegion] = useState("R001");

  const fetchTerrain = useCallback(async () => {
    setLoadingTerrain(true);
    try {
      const grid = await getTerrainGrid();
      setTerrain(grid);
    } catch (err) {
      console.error("Failed to fetch terrain grid:", err);
    } finally {
      setLoadingTerrain(false);
    }
  }, []);

  const fetchPath = useCallback(async () => {
    setLoadingPath(true);
    setPathResult(null);
    try {
      const result = await planRoverPath(selectedStartZone, selectedTargetRegion);
      setPathResult(result);
    } catch (err) {
      console.error("Failed to plan rover path:", err);
    } finally {
      setLoadingPath(false);
    }
  }, [selectedStartZone, selectedTargetRegion]);

  useEffect(() => {
    fetchTerrain();
  }, [fetchTerrain]);

  useEffect(() => {
    if (terrain.length > 0) {
      fetchPath();
    }
  }, [terrain, fetchPath]);

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !terrain.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    terrain.forEach(cell => {
      const x = cell.col * cellSize;
      const y = cell.row * cellSize;

      // Color based on slope
      let color = `hsl(220, 50%, ${40 + (1 - cell.slope_deg / 30) * 20}%)`; 
      if (!cell.traversable) {
        color = "#4D0000"; // Impassable red
      } else if (cell.in_psr) {
        color = `rgb(10, 50, 80)`; // Unified PSR color
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, (GRID_SIZE - 1) * cellSize - y, cellSize - 0.5, cellSize - 0.5);

      // Draw grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cellSize, cellSize);
    });

    // Draw path
    if (pathResult && pathResult.path.length > 0) {
      ctx.strokeStyle = "#00E5FF";
      ctx.lineWidth = 2;
      ctx.beginPath();
      pathResult.path.forEach((node, i) => {
        const x = node.col * cellSize + cellSize / 2;
        const y = node.row * cellSize + cellSize / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw start and goal markers
      const startNode = pathResult.path[0];
      const goalNode = pathResult.path[pathResult.path.length - 1];

      // Start
      ctx.fillStyle = "#00FF88";
      ctx.beginPath();
      ctx.arc(startNode.col * cellSize + cellSize / 2, startNode.row * cellSize + cellSize / 2, cellSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Goal
      ctx.fillStyle = "#FF4D6A";
      ctx.beginPath();
      ctx.arc(goalNode.col * cellSize + cellSize / 2, goalNode.row * cellSize + cellSize / 2, cellSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [terrain, pathResult]);

  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopHeader title="Rover Path Planner" subtitle="A* Traversal on Simulated Lunar Terrain" />
      <div style={{ flex: 1, display: "flex", overflow: "hidden", padding: 16, gap: 16 }}>
        {/* Left Sidebar - Controls */}
        <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 16, flexShrink: 0 }}>
          <div style={{ background: "rgba(10,16,34,0.8)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 12, padding: 16 }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 600, color: "#E8EDF5", marginBottom: 12 }}>
              Path Parameters
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontFamily: "Inter", fontSize: 11, color: "#7A8BA8", display: "block", marginBottom: 4 }}>Start Zone</label>
              <select
                value={selectedStartZone}
                onChange={(e) => setSelectedStartZone(e.target.value)}
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: 8, background: "rgba(0,229,255,0.08)",
                  border: "1px solid rgba(0,229,255,0.2)", color: "#E8EDF5", fontFamily: "Inter", fontSize: 13,
                }}
              >
                {ZONE_OPTIONS.map(zone => (
                  <option key={zone.id} value={zone.id}>{zone.name} ({zone.id})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: "Inter", fontSize: 11, color: "#7A8BA8", display: "block", marginBottom: 4 }}>Target Ice Region</label>
              <select
                value={selectedTargetRegion}
                onChange={(e) => setSelectedTargetRegion(e.target.value)}
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: 8, background: "rgba(0,229,255,0.08)",
                  border: "1px solid rgba(0,229,255,0.2)", color: "#E8EDF5", fontFamily: "Inter", fontSize: 13,
                }}
              >
                {REGION_OPTIONS.map(region => (
                  <option key={region.id} value={region.id}>{region.name} ({region.id})</option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchPath}
              disabled={loadingPath}
              style={{
                width: "100%", marginTop: 16, padding: "10px 15px", borderRadius: 8,
                background: loadingPath ? "rgba(0,229,255,0.15)" : "linear-gradient(135deg, #00E5FF, #1DA1FF)",
                color: loadingPath ? "#7A8BA8" : "#050816", border: "none", cursor: "pointer",
                fontFamily: "Space Grotesk", fontWeight: 600, fontSize: 14,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {loadingPath ? <Clock size={16} className="animate-spin" /> : <Route size={16} />}
              {loadingPath ? "Planning Path..." : "Plan Rover Path"}
            </button>
          </div>

          {/* Path Summary */}
          {pathResult && (
            <div style={{ background: "rgba(10,16,34,0.8)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12, padding: 16 }}>
              <div style={{ fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 600, color: "#E8EDF5", marginBottom: 12 }}>
                Path Summary
              </div>
              {[
                { label: "Algorithm", value: pathResult.algorithm, icon: Cpu },
                { label: "Total Distance", value: `${pathResult.total_distance_km.toFixed(2)} km`, icon: Route },
                { label: "Est. Duration", value: `${pathResult.estimated_duration_hours.toFixed(1)} hrs`, icon: Clock },
                { label: "Energy Cost", value: `${pathResult.energy_cost_wh.toFixed(0)} Wh`, icon: BatteryCharging },
                { label: "Max Slope", value: `${pathResult.max_slope_deg.toFixed(1)}°`, icon: TrendingUp },
                { label: "PSR Segments", value: `${pathResult.psr_segments}`, icon: AlertTriangle },
                { label: "Feasible", value: pathResult.feasible ? "Yes" : "No", icon: CheckCircle, color: pathResult.feasible ? "#00FF88" : "#FF4D6A" },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#7A8BA8", fontSize: 11 }}>
                      <Icon size={12} style={{ color: item.color || "#7A8BA8" }} /> {item.label}
                    </div>
                    <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: item.color || "#E8EDF5" }}>{item.value}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div style={{ background: "rgba(10,16,34,0.8)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 12, padding: 16, marginTop: "auto" }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 600, color: "#E8EDF5", marginBottom: 12 }}>
              Map Legend
            </div>
            {[
              { label: "Start Point", color: "#00FF88" },
              { label: "Goal Point", color: "#FF4D6A" },
              { label: "Path", color: "#00E5FF" },
              { label: "Impassable Slope (>25°)", color: "#4D0000" },
              { label: "PSR (Shadowed)", color: "hsl(240, 30%, 20%)" },
              { label: "Traversable Terrain", color: "hsl(220, 50%, 15%)" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 16, height: 16, background: item.color, borderRadius: 4, border: item.label.includes("Point") ? "1px solid white" : "none" }} />
                <span style={{ fontFamily: "Inter", fontSize: 12, color: "#E8EDF5" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content - Terrain Grid */}
        <div style={{ flex: 1, background: "rgba(10,16,34,0.8)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 12, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {loadingTerrain ? (
            <div style={{ fontFamily: "JetBrains Mono", color: "#00E5FF", fontSize: 14 }}>Generating Terrain...</div>
          ) : (
            <canvas ref={canvasRef} width={800} height={800} style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }} />
          )}
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, SkipBack, AlertTriangle, CheckCircle, Map as MapIcon, Battery, Zap, Route } from "lucide-react";
import { TopHeader } from "./TopHeader";
import { getTerrainGrid, planRoverPath, GridCell, RoverPathResult } from "../services/lunaiceApi";

const phases = [
  { label: "Lunar Orbit Insertion", duration: 8, color: "#8B5CF6" },
  { label: "Descent to 10km", duration: 12, color: "#1DA1FF" },
  { label: "Powered Descent", duration: 15, color: "#FFB800" },
  { label: "Final Approach", duration: 10, color: "#FF6B35" },
  { label: "Touchdown", duration: 5, color: "#00FF88" },
  { label: "Rover Deployment", duration: 18, color: "#00E5FF" },
  { label: "Traverse to Ice Site", duration: 32, color: "#00E5FF" },
];

const SITE_MAPPING: Record<string, { start: string, target: string }> = {
  "Alpha (Shackleton)": { start: "Z001", target: "R001" },
  "Beta (Haworth)": { start: "Z002", target: "R002" },
  "Gamma (Nobile)": { start: "Z003", target: "R003" },
};

const totalDuration = phases.reduce((a, p) => a + p.duration, 0);
const GRID_SIZE = 40;
const CELL_SIZE = 14;

const BASE_EVENTS = [
  { t: 5, msg: "Orbital insertion confirmed", type: "success" },
  { t: 14, msg: "Altitude: 5km — terrain scan active", type: "info" },
  { t: 22, msg: "WARNING: Slope anomaly at approach vector", type: "warning" },
  { t: 30, msg: "Course correction executed +2.3°", type: "info" },
  { t: 40, msg: "Touchdown confirmed — all systems nominal", type: "success" },
  { t: 50, msg: "Rover deployed — solar panels active", type: "success" },
];

function SimCanvas({ 
  progress, 
  playing, 
  terrain, 
  pathResult 
}: { 
  progress: number; 
  playing: boolean;
  terrain: GridCell[];
  pathResult: RoverPathResult | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);

  const isNavMode = progress >= 68;
  const p = progress / 100;
  const landX = 0.2;
  const iceX = 0.75;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;

    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0A1022";
      ctx.fillRect(0, 0, W, H);

      tRef.current += playing ? 0.02 : 0;
      const t = tRef.current;

      if (isNavMode && pathResult && terrain.length > 0) {
        // TOP-DOWN NAVIGATION MODE
        const W_GRID = GRID_SIZE * CELL_SIZE;
        if (canvas.width !== W_GRID) {
          canvas.width = W_GRID;
          canvas.height = W_GRID;
        }
        ctx.fillStyle = "#050816";
        ctx.fillRect(0, 0, W_GRID, W_GRID);

        // Draw Terrain
        terrain.forEach(cell => {
          const x = cell.col * CELL_SIZE;
          const y = (GRID_SIZE - 1 - cell.row) * CELL_SIZE;
          if (!cell.traversable) ctx.fillStyle = "#1a0a0a";
          else if (cell.in_psr) ctx.fillStyle = "rgb(10, 40, 70)";
          else {
            const g = Math.floor(30 + (1 - cell.slope_deg / 30) * 40);
            ctx.fillStyle = `rgb(${g}, ${g}, ${g + 10})`;
          }
          ctx.fillRect(x, y, CELL_SIZE - 1, CELL_SIZE - 1);
        });

        // Draw Planned Path
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 229, 255, 0.4)";
        ctx.setLineDash([5, 5]);
        pathResult.path.forEach((node, i) => {
          const x = node.col * CELL_SIZE + CELL_SIZE / 2;
          const y = (GRID_SIZE - 1 - node.row) * CELL_SIZE + CELL_SIZE / 2;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        // Animate Rover on Path
        const navProgress = (p - 0.68) / 0.32;
        const nodeIdx = Math.min(Math.floor(navProgress * pathResult.path.length), pathResult.path.length - 1);
        const currentNode = pathResult.path[nodeIdx];
        
        if (currentNode) {
          const rx = currentNode.col * CELL_SIZE + CELL_SIZE / 2;
          const ry = (GRID_SIZE - 1 - currentNode.row) * CELL_SIZE + CELL_SIZE / 2;
          ctx.beginPath();
          ctx.arc(rx, ry, 6, 0, Math.PI * 2);
          ctx.fillStyle = "#00E5FF";
          ctx.fill();
          ctx.shadowBlur = 15;
          ctx.shadowColor = "#00E5FF";
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        return animId = requestAnimationFrame(draw);
      }

      // SIDE-VIEW DESCENT MODE
      // Stars
      for (let i = 0; i < 80; i++) {
        const sx = ((i * 137.5) % W);
        const sy = ((i * 93.7) % H);
        const op = 0.3 + 0.4 * Math.sin(t + i);
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232,237,245,${op})`;
        ctx.fill();
      }

      // Moon surface
      const moonY = H * 0.65;
      const moonGrad = ctx.createLinearGradient(0, moonY, 0, H);
      moonGrad.addColorStop(0, "#1A2A42");
      moonGrad.addColorStop(1, "#0D1830");
      ctx.fillStyle = moonGrad;
      ctx.fillRect(0, moonY, W, H - moonY);

      // Terrain bumps
      ctx.beginPath();
      ctx.moveTo(0, moonY);
      for (let x = 0; x <= W; x += 5) {
        ctx.lineTo(x, moonY + Math.sin(x * 0.03) * 15 + Math.cos(x * 0.07) * 8);
      }
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fillStyle = "#1A2A42";
      ctx.fill();

      // Ice deposit glow
      const iceX = W * 0.75;
      const iceG = ctx.createRadialGradient(iceX, moonY, 0, iceX, moonY, 50);
      iceG.addColorStop(0, "rgba(0,229,255,0.35)");
      iceG.addColorStop(1, "rgba(0,229,255,0)");
      ctx.beginPath();
      ctx.arc(iceX, moonY, 50, 0, Math.PI * 2);
      ctx.fillStyle = iceG;
      ctx.fill();
      ctx.fillStyle = "#00E5FF";
      ctx.font = "bold 9px JetBrains Mono";
      ctx.fillText("ICE DEPOSIT", iceX - 28, moonY - 8);

      // Landing site
      const landX = W * 0.2;
      ctx.beginPath();
      ctx.arc(landX, moonY, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#00FF88";
      ctx.fill();
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#00FF88";
      ctx.fill();
      ctx.shadowBlur = 0;

      // Mission object (lander/rover) position
      let objX: number, objY: number;

      if (p < 0.45) {
        // Still descending
        const descProgress = p / 0.45;
        objX = W * 0.4; 
        objY = H * 0.1 + (moonY - H * 0.1) * descProgress;
      } else {
        // Rover traversing
        const roverProgress = (p - 0.45) / 0.55;
        objX = landX + (iceX - landX) * roverProgress;
        objY = moonY;
      }

      // Draw object
      if (p < 0.45) {
        // Lander
        ctx.fillStyle = "#E8EDF5";
        ctx.fillRect(objX - 8, objY - 10, 16, 12);
        // Engine glow
        const engineG = ctx.createRadialGradient(objX, objY + 5, 0, objX, objY + 20, 20);
        engineG.addColorStop(0, "rgba(255,180,0,0.9)");
        engineG.addColorStop(1, "rgba(255,80,0,0)");
        ctx.beginPath();
        ctx.arc(objX, objY + 5, 20, 0, Math.PI * 2);
        ctx.fillStyle = engineG;
        ctx.fill();
        // Descent line
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(objX, H * 0.1);
        ctx.lineTo(objX, objY);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Rover
        ctx.fillStyle = "#E8EDF5";
        ctx.fillRect(objX - 7, objY - 8, 14, 8);
        ctx.fillStyle = "#00E5FF";
        ctx.fillRect(objX - 2, objY - 13, 4, 5);
        // Rover path trail
        const rp = (p - 0.45) / 0.55;
        ctx.setLineDash([]);
        ctx.beginPath(); 
        ctx.moveTo(landX, moonY);
        ctx.lineTo(landX + (iceX - landX) * rp, moonY);
        ctx.strokeStyle = "rgba(0,229,255,0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Rover pulse
        const pulse2 = (t * 0.08) % 1;
        ctx.beginPath();
        ctx.arc(objX, objY, 7 + pulse2 * 16, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,229,255,${(1 - pulse2) * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [progress, playing]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}

export function MissionSimulator() {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [site, setSite] = useState("Alpha (Shackleton)");
  const [roverType, setRoverType] = useState("Pragyan-II");
  const [terrain, setTerrain] = useState<GridCell[]>([]);
  const [pathResult, setPathResult] = useState<RoverPathResult | null>(null);

  const loadMissionData = useCallback(async () => {
    try {
      const mapping = SITE_MAPPING[site];
      const [grid, path] = await Promise.all([
        getTerrainGrid(),
        planRoverPath(mapping.start, mapping.target)
      ]);
      setTerrain(grid);
      setPathResult(path);
    } catch (err) {
      console.error("Failed to load navigation data for simulator", err);
    }
  }, [site]);

  useEffect(() => {
    loadMissionData();
  }, [loadMissionData]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { setPlaying(false); return 100; }
        return p + 0.4;
      });
    }, 80);
    return () => clearInterval(timer);
  }, [playing]);

  const currentPhaseIdx = phases.reduce((acc, phase, i) => {
    const phaseStart = phases.slice(0, i).reduce((s, p) => s + p.duration, 0);
    const phaseProgress = (progress / 100) * totalDuration;
    if (phaseProgress >= phaseStart) return i;
    return acc;
  }, 0);

  // Dynamic mission log events
  const currentEvents = [...BASE_EVENTS];
  if (pathResult && progress >= 68) {
    const navProgress = (progress / 100 - 0.68) / 0.32;
    const nodeIdx = Math.min(Math.floor(navProgress * pathResult.path.length), pathResult.path.length - 1);
    const currentNode = pathResult.path[nodeIdx];
    
    if (nodeIdx > 0) currentEvents.push({ t: 70, msg: `Navigation: A* Path Optimization active`, type: "info" });
    if (currentNode?.in_psr) currentEvents.push({ t: Math.floor(progress), msg: "CRITICAL: PSR Boundary Entered. Battery Only.", type: "warning" });
    if (progress >= 95) currentEvents.push({ t: 95, msg: `Target Reached: ${pathResult.total_distance_km}km traversed`, type: "success" });
  }

  const visibleEvents = currentEvents.filter(e => e.t <= progress);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopHeader title="Mission Simulator" subtitle="Interactive lunar mission simulation environment" />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Simulation viewport */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, gap: 12 }}>
          {/* Config row */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {[
              { label: "Landing Site", value: site, options: ["Alpha (Shackleton)", "Beta (Haworth)", "Gamma (Nobile)"], set: setSite },
              { label: "Rover Type", value: roverType, options: ["Pragyan-II", "Compact Scout", "Heavy Drill"], set: setRoverType },
            ].map((sel) => (
              <div key={sel.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "Inter", fontSize: 11, color: "#7A8BA8" }}>{sel.label}:</span>
                <select
                  value={sel.value}
                  onChange={(e) => { sel.set(e.target.value); setProgress(0); setPlaying(false); }}
                  style={{
                    background: "rgba(10,16,34,0.8)", border: "1px solid rgba(0,229,255,0.2)",
                    color: "#E8EDF5", fontFamily: "Inter", fontSize: 12, padding: "5px 10px",
                    borderRadius: 6, cursor: "pointer",
                  }}
                >
                  {sel.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button
                onClick={() => { setProgress(0); setPlaying(false); }}
                style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(0,229,255,0.2)", background: "rgba(10,16,34,0.8)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#7A8BA8" }}
              >
                <SkipBack size={14} />
              </button>
              <button
                onClick={() => setPlaying(!playing)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "7px 18px",
                  background: playing ? "rgba(255,77,106,0.15)" : "linear-gradient(135deg, #00E5FF, #1DA1FF)",
                  border: playing ? "1px solid rgba(255,77,106,0.3)" : "none",
                  color: playing ? "#FF4D6A" : "#050816", borderRadius: 8, cursor: "pointer",
                  fontFamily: "Space Grotesk", fontWeight: 600, fontSize: 13,
                }}
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
                {playing ? "Pause" : "Launch Mission"}
              </button>
            </div>
          </div>

          {/* Sim viewport */}
          <div style={{ flex: 1, background: "rgba(10,16,34,0.8)", borderRadius: 12, border: "1px solid rgba(0,229,255,0.1)", overflow: "hidden" }}>
            <SimCanvas 
              progress={progress} 
              playing={playing} 
              terrain={terrain}
              pathResult={pathResult}
            />
          </div>

          {/* Timeline */}
          <div style={{ background: "rgba(10,16,34,0.8)", borderRadius: 10, border: "1px solid rgba(0,229,255,0.1)", padding: "12px 16px" }}>
            <div style={{ display: "flex", gap: 0, height: 28, borderRadius: 6, overflow: "hidden", marginBottom: 6 }}>
              {phases.map((phase, i) => {
                const w = (phase.duration / totalDuration) * 100;
                const phaseStart = phases.slice(0, i).reduce((s, p) => s + p.duration, 0);
                const phaseProgress = (progress / 100) * totalDuration;
                const isActive = currentPhaseIdx === i;
                const isComplete = phaseProgress > phaseStart + phase.duration;
                return (
                  <div key={i} style={{ width: `${w}%`, height: "100%", background: isComplete ? `${phase.color}60` : isActive ? phase.color : `${phase.color}20`, transition: "background 0.3s", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {w > 8 && <span style={{ fontFamily: "JetBrains Mono", fontSize: 8, color: isActive || isComplete ? "#050816" : "#7A8BA8", whiteSpace: "nowrap" }}>{phase.label.split(" ")[0]}</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ position: "relative", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #00E5FF, #8B5CF6)", borderRadius: 3, transition: "width 0.1s", boxShadow: "0 0 10px rgba(0,229,255,0.5)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#7A8BA8" }}>T+0:00</span>
              <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#00E5FF" }}>{Math.floor(progress)}% complete</span>
              <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#7A8BA8" }}>T+{totalDuration}h</span>
            </div>
          </div>
        </div>

        {/* Event log */}
        <div style={{ width: 260, borderLeft: "1px solid rgba(0,229,255,0.1)", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 600, color: "#E8EDF5" }}>Mission Log</div>
          
          {/* Mini Path Analysis - NEW */}
          {pathResult && progress > 65 && (
            <div style={{ background: "rgba(0, 229, 255, 0.05)", border: "1px solid rgba(0, 229, 255, 0.2)", borderRadius: 8, padding: 10, marginBottom: 5 }}>
               <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <MapIcon size={12} color="#00E5FF" />
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#00E5FF" }}>NAV SYSTEM ACTIVE</span>
               </div>
               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 8, color: "#7A8BA8" }}>DISTANCE</div>
                    <div style={{ fontSize: 11, color: "#E8EDF5", fontFamily: "JetBrains Mono" }}>{pathResult.total_distance_km}km</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 8, color: "#7A8BA8" }}>EST. TIME</div>
                    <div style={{ fontSize: 11, color: "#E8EDF5", fontFamily: "JetBrains Mono" }}>{pathResult.estimated_duration_hours}h</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 8, color: "#7A8BA8" }}>ENERGY</div>
                    <div style={{ fontSize: 11, color: "#E8EDF5", fontFamily: "JetBrains Mono" }}>{pathResult.energy_cost_wh}Wh</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 8, color: "#7A8BA8" }}>SLOPE</div>
                    <div style={{ fontSize: 11, color: "#FFB800", fontFamily: "JetBrains Mono" }}>MAX {pathResult.max_slope_deg}°</div>
                  </div>
               </div>
               {progress >= 68 && (
                 <div style={{ marginTop: 8, fontSize: 8, color: "#00FF88", display: "flex", alignItems: "center", gap: 4 }}>
                   <Route size={10} />
                   FOLLOWING A* OPTIMIZED NODES
                 </div>
               )}
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, scrollbarWidth: 'none' }}>
            {visibleEvents.length === 0 ? (
              <div style={{ fontFamily: "Inter", fontSize: 12, color: "#7A8BA8", textAlign: "center", padding: 20 }}>
                Launch mission to begin simulation
              </div>
            ) : (
              [...visibleEvents].reverse().map((ev, i) => {
                const colors: Record<string, string> = { success: "#00FF88", info: "#00E5FF", warning: "#FFB800" };
                const Icons: Record<string, any> = { success: CheckCircle, info: null, warning: AlertTriangle };
                const c = colors[ev.type];
                const Icon = Icons[ev.type];
                return (
                  <div key={i} style={{
                    background: `${c}08`, border: `1px solid ${c}20`,
                    borderRadius: 8, padding: "8px 10px",
                    display: "flex", gap: 8, alignItems: "flex-start",
                  }}>
                    {Icon && <Icon size={12} style={{ color: c, marginTop: 1, flexShrink: 0 }} />}
                    <div>
                      <div style={{ fontFamily: "Inter", fontSize: 11, color: "#E8EDF5" }}>{ev.msg}</div>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#7A8BA8", marginTop: 2 }}>T+{ev.t}h</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

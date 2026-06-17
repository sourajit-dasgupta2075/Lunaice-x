import { useState, useRef, useEffect } from "react";
import { Navigation2, Zap, Shield, Battery } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TopHeader } from "./TopHeader";

const routes = [
  {
    id: "fastest", label: "Fastest Route", color: "#FFB800", icon: Zap,
    distance: "4.2 km", time: "6.5 h", risk: "Medium", battery: "78%",
    waypoints: [[0.15, 0.8], [0.25, 0.65], [0.4, 0.52], [0.5, 0.5]],
  },
  {
    id: "safest", label: "Safest Route", color: "#00FF88", icon: Shield,
    distance: "6.8 km", time: "10.2 h", risk: "Low", battery: "61%",
    waypoints: [[0.15, 0.8], [0.15, 0.6], [0.28, 0.55], [0.38, 0.52], [0.5, 0.5]],
  },
  {
    id: "energy", label: "Energy Efficient", color: "#00E5FF", icon: Battery,
    distance: "5.4 km", time: "8.1 h", risk: "Low-Med", battery: "72%",
    waypoints: [[0.15, 0.8], [0.22, 0.68], [0.35, 0.56], [0.5, 0.5]],
  },
];

const terrainProfile = Array.from({ length: 20 }, (_, i) => ({
  dist: `${(i * 0.3).toFixed(1)}`,
  elevation: -4200 + Math.sin(i * 0.4) * 120 + i * 10,
  slope: Math.abs(Math.sin(i * 0.5) * 4),
}));

function TerrainMap({ selectedRoute }: { selectedRoute: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;

    let t = 0;
    let animId: number;

    const route = routes.find(r => r.id === selectedRoute)!;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0A1022";
      ctx.fillRect(0, 0, W, H);

      // Terrain texture
      for (let x = 0; x < W; x += 20) {
        for (let y = 0; y < H; y += 20) {
          const v = Math.sin(x * 0.05) * Math.cos(y * 0.04) * 0.5 + 0.5;
          ctx.fillStyle = `rgba(30,50,80,${v * 0.3})`;
          ctx.fillRect(x, y, 20, 20);
        }
      }

      // Grid
      ctx.strokeStyle = "rgba(0,229,255,0.06)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 8]);
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.setLineDash([]);

      // Ice deposit (destination)
      const iceX = W * 0.5, iceY = H * 0.5;
      const iceG = ctx.createRadialGradient(iceX, iceY, 0, iceX, iceY, 60);
      iceG.addColorStop(0, "rgba(0,229,255,0.25)");
      iceG.addColorStop(0.5, "rgba(0,180,255,0.12)");
      iceG.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(iceX, iceY, 60, 0, Math.PI * 2);
      ctx.fillStyle = iceG;
      ctx.fill();

      // PSR zones
      [[0.3, 0.4], [0.6, 0.6], [0.7, 0.3]].forEach(([rx, ry]) => {
        const px = W * rx, py = H * ry;
        const g = ctx.createRadialGradient(px, py, 0, px, py, 35);
        g.addColorStop(0, "rgba(5,8,22,0.85)");
        g.addColorStop(1, "rgba(5,8,22,0)");
        ctx.beginPath();
        ctx.arc(px, py, 35, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      });

      // Draw all routes dimmed
      routes.forEach((r) => {
        const waypoints = r.waypoints.map(([wx, wy]) => [W * wx, H * wy]);
        const isActive = r.id === selectedRoute;
        ctx.beginPath();
        waypoints.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
        ctx.strokeStyle = isActive ? r.color : `${r.color}30`;
        ctx.lineWidth = isActive ? 2.5 : 1;
        ctx.setLineDash(isActive ? [] : [4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Animated rover on selected route
      const wp = route.waypoints;
      const totalWp = wp.length - 1;
      const progress = (t * 0.002) % 1;
      const seg = Math.floor(progress * totalWp);
      const segProgress = (progress * totalWp) % 1;
      const p0 = wp[Math.min(seg, totalWp - 1)];
      const p1 = wp[Math.min(seg + 1, totalWp)];
      const rx = W * (p0[0] + (p1[0] - p0[0]) * segProgress);
      const ry = H * (p0[1] + (p1[1] - p0[1]) * segProgress);

      // Rover body
      ctx.beginPath();
      ctx.arc(rx, ry, 7, 0, Math.PI * 2);
      ctx.fillStyle = route.color;
      ctx.fill();
      ctx.shadowBlur = 16;
      ctx.shadowColor = route.color;
      ctx.fill();
      ctx.shadowBlur = 0;
      // Rover ping
      const ping = (t * 0.05) % 1;
      ctx.beginPath();
      ctx.arc(rx, ry, 7 + ping * 20, 0, Math.PI * 2);
      ctx.strokeStyle = `${route.color}${Math.floor((1 - ping) * 80).toString(16).padStart(2, "0")}`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Landing site marker
      const lx = W * 0.15, ly = H * 0.8;
      ctx.beginPath();
      ctx.arc(lx, ly, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#00FF88";
      ctx.fill();
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#00FF88";
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#E8EDF5";
      ctx.font = "9px JetBrains Mono";
      ctx.fillText("LANDING", lx + 10, ly + 3);

      // Ice deposit label
      ctx.fillStyle = "#00E5FF";
      ctx.font = "bold 9px JetBrains Mono";
      ctx.fillText("ICE DEPOSIT", iceX - 28, iceY - 30);
      ctx.fillText("87.4% PROB", iceX - 24, iceY - 18);

      t++;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [selectedRoute]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}

export function RoverNavigation() {
  const [selectedRoute, setSelectedRoute] = useState("safest");
  const route = routes.find(r => r.id === selectedRoute)!;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopHeader title="Rover Navigation" subtitle="Optimal path planning from landing site to ice deposit" />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, gap: 12 }}>
          {/* Route selector */}
          <div style={{ display: "flex", gap: 10 }}>
            {routes.map((r) => {
              const Icon = r.icon;
              const active = r.id === selectedRoute;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoute(r.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "9px 16px",
                    border: `1px solid ${active ? r.color + "60" : "rgba(255,255,255,0.08)"}`,
                    background: active ? `${r.color}15` : "rgba(10,16,34,0.6)",
                    borderRadius: 8, cursor: "pointer", color: active ? r.color : "#7A8BA8",
                    fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 500,
                    transition: "all 0.2s",
                  }}
                >
                  <Icon size={14} />
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* Map */}
          <div style={{ flex: 1, background: "rgba(10,16,34,0.8)", borderRadius: 12, border: "1px solid rgba(0,229,255,0.1)", overflow: "hidden" }}>
            <TerrainMap selectedRoute={selectedRoute} />
          </div>

          {/* Terrain profile */}
          <div style={{ height: 130, background: "rgba(10,16,34,0.8)", borderRadius: 10, border: "1px solid rgba(0,229,255,0.1)", padding: "10px 14px" }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 12, fontWeight: 600, color: "#E8EDF5", marginBottom: 6 }}>Terrain Profile</div>
            <ResponsiveContainer width="100%" height={90}>
              <LineChart data={terrainProfile}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="dist" tick={{ fontFamily: "JetBrains Mono", fontSize: 8, fill: "#7A8BA8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 8, fill: "#7A8BA8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0D1530", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 6, fontFamily: "JetBrains Mono", fontSize: 10 }} />
                <Line type="monotone" dataKey="elevation" stroke="#00E5FF" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width: 250, borderLeft: "1px solid rgba(0,229,255,0.1)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "rgba(10,16,34,0.8)", borderRadius: 12, border: `1px solid ${route.color}25`, padding: 16 }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 600, color: "#E8EDF5", marginBottom: 12 }}>
              {route.label}
            </div>
            {[
              { label: "Distance", value: route.distance },
              { label: "Est. Travel Time", value: route.time },
              { label: "Risk Level", value: route.risk },
              { label: "Battery Remaining", value: route.battery },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontFamily: "Inter", fontSize: 12, color: "#7A8BA8" }}>{row.label}</span>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: route.color }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "rgba(10,16,34,0.8)", borderRadius: 12, border: "1px solid rgba(0,229,255,0.1)", padding: 16 }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 600, color: "#E8EDF5", marginBottom: 10 }}>Hazard Zones</div>
            {[
              { label: "Steep slopes (>5°)", count: 2, color: "#FF4D6A" },
              { label: "PSR shadowed", count: 3, color: "#FFB800" },
              { label: "Rough terrain", count: 1, color: "#FF6B35" },
            ].map((h) => (
              <div key={h.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: h.color }} />
                  <span style={{ fontFamily: "Inter", fontSize: 11, color: "#7A8BA8" }}>{h.label}</span>
                </div>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: h.color }}>{h.count}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "rgba(10,16,34,0.8)", borderRadius: 12, border: "1px solid rgba(0,229,255,0.1)", padding: 16 }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 600, color: "#E8EDF5", marginBottom: 10 }}>Rover Status</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Battery", value: 82, color: "#00FF88" },
                { label: "Signal", value: 94, color: "#00E5FF" },
                { label: "Thermal", value: 71, color: "#FFB800" },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontFamily: "Inter", fontSize: 11, color: "#7A8BA8" }}>{s.label}</span>
                    <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: s.color }}>{s.value}%</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                    <div style={{ width: `${s.value}%`, height: "100%", background: s.color, borderRadius: 2, boxShadow: `0 0 6px ${s.color}80` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

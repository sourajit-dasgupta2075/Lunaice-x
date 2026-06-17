import { useState, useRef, useEffect } from "react";
import { Brain, CheckCircle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from "recharts";
import { TopHeader } from "./TopHeader";

const models = [
  { id: "rf", name: "Random Forest", accuracy: 91.4, precision: 89.2, recall: 93.1, confidence: 88.7 },
  { id: "xgb", name: "XGBoost", accuracy: 93.8, precision: 92.4, recall: 94.6, confidence: 91.2 },
  { id: "cnn", name: "CNN", accuracy: 95.2, precision: 94.1, recall: 95.8, confidence: 93.5 },
  { id: "vit", name: "Vision Transformer", accuracy: 96.7, precision: 95.8, recall: 97.1, confidence: 95.4 },
];

const regions = [
  { id: 1, name: "Shackleton-A", lat: -89.67, lon: 0, prob: 87.4, conf: 94.2, score: 9.1 },
  { id: 2, name: "Haworth-B", lat: -87.5, lon: -5.2, prob: 78.1, conf: 89.4, score: 8.3 },
  { id: 3, name: "Nobile-C", lat: -85.2, lon: 53.5, prob: 72.3, conf: 85.7, score: 7.6 },
  { id: 4, name: "Amundsen-D", lat: -84.5, lon: -84.7, prob: 65.8, conf: 81.2, score: 7.1 },
  { id: 5, name: "Sverdrup-E", lat: -88.1, lon: -76.3, prob: 61.2, conf: 78.5, score: 6.8 },
  { id: 6, name: "Cabeus-F", lat: -84.9, lon: -35.5, prob: 55.4, conf: 74.1, score: 6.2 },
  { id: 7, name: "Faustini-G", lat: -87.3, lon: 77.0, prob: 48.7, conf: 69.3, score: 5.7 },
];

const probDist = Array.from({ length: 20 }, (_, i) => ({
  range: `${i * 5}-${(i + 1) * 5}%`,
  count: Math.floor(Math.random() * 60 + 5) * (i > 14 ? 2.5 : 1),
}));

function IceProbHeatmap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;

    // Draw background
    ctx.fillStyle = "#0A1022";
    ctx.fillRect(0, 0, W, H);

    // Moon outline
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 16;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#0D1830";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,229,255,0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Heatmap blobs
    const hotspots = [
      { x: 0.5, y: 0.5, r: 0.22, intensity: 0.95 },
      { x: 0.35, y: 0.42, r: 0.13, intensity: 0.82 },
      { x: 0.62, y: 0.38, r: 0.1, intensity: 0.74 },
      { x: 0.44, y: 0.62, r: 0.12, intensity: 0.68 },
      { x: 0.6, y: 0.6, r: 0.09, intensity: 0.62 },
      { x: 0.3, y: 0.58, r: 0.07, intensity: 0.55 },
      { x: 0.68, y: 0.52, r: 0.06, intensity: 0.5 },
    ];

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    hotspots.forEach((h) => {
      const px = cx + (h.x - 0.5) * r * 2;
      const py = cy + (h.y - 0.5) * r * 2;
      const pr = h.r * r * 2;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, pr);

      // Color: blue → cyan → green → yellow → red based on intensity
      const t = h.intensity;
      let c1: string, c2: string;
      if (t > 0.8) { c1 = "rgba(255,50,50,0.85)"; c2 = "rgba(255,160,0,0.4)"; }
      else if (t > 0.65) { c1 = "rgba(255,180,0,0.75)"; c2 = "rgba(0,229,255,0.3)"; }
      else if (t > 0.5) { c1 = "rgba(0,255,100,0.65)"; c2 = "rgba(0,180,255,0.25)"; }
      else { c1 = "rgba(0,180,255,0.55)"; c2 = "rgba(0,100,200,0.15)"; }

      grad.addColorStop(0, c1);
      grad.addColorStop(0.5, c2);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });

    // Grid
    ctx.strokeStyle = "rgba(0,229,255,0.05)";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 6]);
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (r * i) / 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let a = 0; a < 360; a += 30) {
      const rad = (a * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Region labels
    hotspots.slice(0, 5).forEach((h, i) => {
      const px = cx + (h.x - 0.5) * r * 2;
      const py = cy + (h.y - 0.5) * r * 2;
      ctx.fillStyle = "rgba(232,237,245,0.9)";
      ctx.font = "bold 9px JetBrains Mono";
      ctx.fillText(String.fromCharCode(65 + i), px - 3, py + 3);
    });

    ctx.restore();

    // Colorbar legend
    const barH = 12, barW = 180, bx = W - barW - 16, by = H - 32;
    const lGrad = ctx.createLinearGradient(bx, 0, bx + barW, 0);
    lGrad.addColorStop(0, "rgba(0,100,200,0.9)");
    lGrad.addColorStop(0.3, "rgba(0,229,255,0.9)");
    lGrad.addColorStop(0.5, "rgba(0,255,100,0.9)");
    lGrad.addColorStop(0.7, "rgba(255,180,0,0.9)");
    lGrad.addColorStop(1, "rgba(255,50,50,0.9)");
    ctx.fillStyle = lGrad;
    ctx.fillRect(bx, by, barW, barH);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.strokeRect(bx, by, barW, barH);
    ctx.fillStyle = "#7A8BA8";
    ctx.font = "9px JetBrains Mono";
    ctx.fillText("0%", bx, by + barH + 12);
    ctx.fillText("50%", bx + barW / 2 - 10, by + barH + 12);
    ctx.fillText("100%", bx + barW - 20, by + barH + 12);
    ctx.fillStyle = "#E8EDF5";
    ctx.font = "9px JetBrains Mono";
    ctx.fillText("Ice Probability", bx, by - 6);
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}

export function IceDetection() {
  const [selectedModel, setSelectedModel] = useState("vit");
  const active = models.find(m => m.id === selectedModel)!;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopHeader title="Ice Detection" subtitle="AI-powered subsurface ice mapping" />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Main heatmap */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, gap: 12 }}>
          <div style={{
            flex: 1, background: "rgba(10,16,34,0.8)", borderRadius: 12,
            border: "1px solid rgba(0,229,255,0.12)", overflow: "hidden",
          }}>
            <IceProbHeatmap />
          </div>
          {/* Bottom: prob distribution */}
          <div style={{
            height: 140, background: "rgba(10,16,34,0.8)", borderRadius: 12,
            border: "1px solid rgba(0,229,255,0.1)", padding: "12px 16px",
          }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 12, fontWeight: 600, color: "#E8EDF5", marginBottom: 8 }}>
              Probability Distribution
            </div>
            <ResponsiveContainer width="100%" height={88}>
              <BarChart data={probDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="range" tick={{ fontFamily: "JetBrains Mono", fontSize: 7, fill: "#7A8BA8" }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 8, fill: "#7A8BA8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0D1530", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 6, fontFamily: "JetBrains Mono", fontSize: 10 }} />
                <Bar dataKey="count" fill="#00E5FF" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 12, padding: 16, borderLeft: "1px solid rgba(0,229,255,0.1)", overflowY: "auto" }}>
          {/* Model selector */}
          <div style={{ background: "rgba(10,16,34,0.8)", borderRadius: 12, border: "1px solid rgba(0,229,255,0.1)", padding: 14 }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 600, color: "#E8EDF5", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <Brain size={14} style={{ color: "#00E5FF" }} />
              AI Model
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: selectedModel === m.id ? "rgba(0,229,255,0.12)" : "rgba(255,255,255,0.03)",
                    borderLeft: `2px solid ${selectedModel === m.id ? "#00E5FF" : "transparent"}`,
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{ fontFamily: "Inter", fontSize: 12, color: selectedModel === m.id ? "#00E5FF" : "#7A8BA8" }}>{m.name}</span>
                  <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: selectedModel === m.id ? "#00E5FF" : "#7A8BA8" }}>{m.accuracy}%</span>
                </button>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div style={{ background: "rgba(10,16,34,0.8)", borderRadius: 12, border: "1px solid rgba(0,229,255,0.1)", padding: 14 }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 600, color: "#E8EDF5", marginBottom: 12 }}>
              Model Metrics — {active.name}
            </div>
            {[
              { label: "Accuracy", value: active.accuracy, color: "#00E5FF" },
              { label: "Precision", value: active.precision, color: "#8B5CF6" },
              { label: "Recall", value: active.recall, color: "#1DA1FF" },
              { label: "Confidence", value: active.confidence, color: "#00FF88" },
            ].map((m) => (
              <div key={m.label} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: "Inter", fontSize: 11, color: "#7A8BA8" }}>{m.label}</span>
                  <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: m.color }}>{m.value}%</span>
                </div>
                <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                  <div style={{ width: `${m.value}%`, height: "100%", background: m.color, borderRadius: 3, boxShadow: `0 0 8px ${m.color}60` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Region ranking */}
          <div style={{ background: "rgba(10,16,34,0.8)", borderRadius: 12, border: "1px solid rgba(0,229,255,0.1)", padding: 14 }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 600, color: "#E8EDF5", marginBottom: 10 }}>Region Rankings</div>
            {regions.map((r, i) => (
              <div key={r.id} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.03)",
              }}>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: "#7A8BA8", width: 14 }}>#{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Inter", fontSize: 11, color: "#E8EDF5" }}>{r.name}</div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#7A8BA8" }}>{r.lat}° · {r.lon}°</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "#00E5FF" }}>{r.prob}%</div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#7A8BA8" }}>score {r.score}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Rocket, ChevronRight, Layers, Cpu, Droplets, MapPin, AlertTriangle, FlaskConical } from "lucide-react";

interface LandingPageProps {
  onEnter: () => void;
}

function MoonCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 520;
    canvas.height = 520;

    let angle = 0;
    let animId: number;

    const craters = [
      { cx: 0.38, cy: 0.35, r: 0.06 },
      { cx: 0.6, cy: 0.28, r: 0.04 },
      { cx: 0.52, cy: 0.55, r: 0.05 },
      { cx: 0.3, cy: 0.55, r: 0.035 },
      { cx: 0.65, cy: 0.5, r: 0.025 },
      { cx: 0.42, cy: 0.7, r: 0.04 },
      { cx: 0.7, cy: 0.65, r: 0.03 },
    ];

    const draw = () => {
      ctx.clearRect(0, 0, 520, 520);
      const cx = 260, cy = 260, r = 220;
      angle += 0.003;

      // outer glow
      const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.5);
      glowGrad.addColorStop(0, "rgba(0,229,255,0.12)");
      glowGrad.addColorStop(0.5, "rgba(29,161,255,0.05)");
      glowGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // Moon body
      const moonGrad = ctx.createRadialGradient(cx - 60, cy - 60, 20, cx, cy, r);
      moonGrad.addColorStop(0, "#D4DCE8");
      moonGrad.addColorStop(0.3, "#A8B8CC");
      moonGrad.addColorStop(0.65, "#6A7F96");
      moonGrad.addColorStop(0.85, "#3A4F68");
      moonGrad.addColorStop(1, "#1A2845");

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = moonGrad;
      ctx.fill();

      // South pole ice cap glow
      const poleGrad = ctx.createRadialGradient(cx, cy + r * 0.6, 5, cx, cy + r * 0.65, 70);
      poleGrad.addColorStop(0, "rgba(0,229,255,0.4)");
      poleGrad.addColorStop(0.5, "rgba(0,229,255,0.15)");
      poleGrad.addColorStop(1, "rgba(0,229,255,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = poleGrad;
      ctx.fill();

      // PSR shadows at south pole
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      for (let i = 0; i < 5; i++) {
        const a = angle + (i * Math.PI * 2) / 5;
        const px = cx + Math.cos(a) * 50;
        const py = cy + r * 0.55 + Math.sin(a) * 15;
        const shadowG = ctx.createRadialGradient(px, py, 2, px, py, 18 + i * 5);
        shadowG.addColorStop(0, "rgba(5,8,22,0.7)");
        shadowG.addColorStop(1, "rgba(5,8,22,0)");
        ctx.beginPath();
        ctx.arc(px, py, 18 + i * 5, 0, Math.PI * 2);
        ctx.fillStyle = shadowG;
        ctx.fill();
      }
      ctx.restore();

      // Craters
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      craters.forEach((c) => {
        const px = cx + (c.cx - 0.5) * r * 2;
        const py = cy + (c.cy - 0.5) * r * 2;
        const cr = c.r * r * 2;
        const cGrad = ctx.createRadialGradient(px - cr * 0.2, py - cr * 0.2, 0, px, py, cr);
        cGrad.addColorStop(0, "rgba(20,35,60,0.7)");
        cGrad.addColorStop(0.7, "rgba(20,35,60,0.4)");
        cGrad.addColorStop(1, "rgba(120,140,160,0.2)");
        ctx.beginPath();
        ctx.arc(px, py, cr, 0, Math.PI * 2);
        ctx.fillStyle = cGrad;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, cr, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(160,180,200,0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      ctx.restore();

      // Terminator (day/night boundary)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      const termAngle = angle * 0.5;
      const tx = cx + Math.cos(termAngle) * r;
      const ty = cy + Math.sin(termAngle) * r;
      const termGrad = ctx.createLinearGradient(
        cx + Math.cos(termAngle) * r * 0.3,
        cy + Math.sin(termAngle) * r * 0.3,
        tx, ty
      );
      termGrad.addColorStop(0, "rgba(5,8,22,0)");
      termGrad.addColorStop(1, "rgba(5,8,22,0.6)");
      ctx.fillStyle = termGrad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.restore();

      // Orbit ring
      ctx.beginPath();
      ctx.ellipse(cx, cy, r + 35, 20, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,229,255,0.15)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Orbiting satellite
      const satX = cx + Math.cos(angle * 3) * (r + 35);
      const satY = cy + Math.sin(angle * 3) * 20;
      ctx.beginPath();
      ctx.arc(satX, satY, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#00E5FF";
      ctx.fill();
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#00E5FF";
      ctx.fill();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} style={{ width: 520, height: 520 }} />;
}

function MetricCard({ label, value, unit, icon: Icon, color }: {
  label: string; value: string; unit: string; icon: any; color: string;
}) {
  return (
    <div style={{
      background: "rgba(10,16,34,0.85)",
      backdropFilter: "blur(16px)",
      border: `1px solid ${color}30`,
      borderRadius: 12,
      padding: "14px 18px",
      display: "flex",
      alignItems: "center",
      gap: 14,
      boxShadow: `0 0 20px ${color}15`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center",
        border: `1px solid ${color}40`,
      }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div style={{ fontFamily: "JetBrains Mono", fontSize: 18, fontWeight: 600, color, lineHeight: 1.2 }}>
          {value}<span style={{ fontSize: 11, marginLeft: 3, opacity: 0.7 }}>{unit}</span>
        </div>
        <div style={{ fontFamily: "Inter", fontSize: 11, color: "#7A8BA8", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

export function LandingPage({ onEnter }: LandingPageProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 50);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      minHeight: "100vh", width: "100%", background: "#050816", position: "relative",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Top nav bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 40px",
        background: "rgba(5,8,22,0.8)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,229,255,0.1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #D4DCE8, #6A7F96, #1A2845)",
            boxShadow: "0 0 14px rgba(0,229,255,0.5)",
          }} />
          <span style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 16, color: "#00E5FF", letterSpacing: "0.06em" }}>
            LUNAICE-X
          </span>
          <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#7A8BA8", letterSpacing: "0.1em" }}>
            | MISSION INTELLIGENCE PLATFORM
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["ISRO", "CHANDRAYAAN-2", "v2.4.1"].map((tag) => (
            <span key={tag} style={{
              fontFamily: "JetBrains Mono", fontSize: 9, color: "#7A8BA8",
              background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.15)",
              borderRadius: 4, padding: "3px 8px", letterSpacing: "0.1em",
            }}>{tag}</span>
          ))}
        </div>
      </div>

      {/* Hero content */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "80px 60px 40px", gap: 40, maxWidth: 1400, margin: "0 auto", width: "100%",
      }}>
        {/* Left text */}
        <div style={{ flex: 1, maxWidth: 580 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)",
            borderRadius: 20, padding: "5px 14px", marginBottom: 28,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00FF88", boxShadow: "0 0 8px #00FF88" }} />
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: "#00E5FF", letterSpacing: "0.1em" }}>
              SYSTEM OPERATIONAL · CHANDRAYAAN-2 ONLINE
            </span>
          </div>

          <h1 style={{
            fontFamily: "Space Grotesk", fontWeight: 700, fontSize: "clamp(36px, 4vw, 52px)",
            color: "#E8EDF5", lineHeight: 1.1, marginBottom: 24,
          }}>
            Unlocking Hidden{" "}
            <span style={{
              background: "linear-gradient(135deg, #00E5FF 0%, #1DA1FF 50%, #8B5CF6 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Water Resources
            </span>
            <br />on the Moon
          </h1>

          <p style={{
            fontFamily: "Inter", fontSize: 16, color: "#7A8BA8", lineHeight: 1.7, marginBottom: 36,
          }}>
            AI-driven detection and characterization of subsurface ice using Chandrayaan-2 DFSAR,
            DEM, Hydrogen Maps, PSR Maps, and Optical Imagery for the Lunar South Polar Region.
          </p>

          <div style={{ display: "flex", gap: 14, marginBottom: 48, flexWrap: "wrap" }}>
            <button
              onClick={onEnter}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "14px 28px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #00E5FF, #1DA1FF)",
                color: "#050816", fontFamily: "Space Grotesk", fontWeight: 600, fontSize: 14,
                letterSpacing: "0.04em", boxShadow: "0 0 30px rgba(0,229,255,0.35)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 50px rgba(0,229,255,0.6)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 30px rgba(0,229,255,0.35)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <Rocket size={18} />
              Launch Mission Control
            </button>
            <button
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "14px 28px", borderRadius: 8, cursor: "pointer",
                background: "transparent", color: "#E8EDF5",
                border: "1px solid rgba(232,237,245,0.2)",
                fontFamily: "Space Grotesk", fontWeight: 500, fontSize: 14,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.4)"; e.currentTarget.style.color = "#00E5FF"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(232,237,245,0.2)"; e.currentTarget.style.color = "#E8EDF5"; }}
            >
              View Methodology
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Metric cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <MetricCard label="Detected Ice Regions" value="247" unit="zones" icon={Droplets} color="#00E5FF" />
            <MetricCard label="Landing Safety Score" value="94.2" unit="%" icon={MapPin} color="#00FF88" />
            <MetricCard label="Mission Readiness" value="ALPHA" unit="" icon={Rocket} color="#8B5CF6" />
            <MetricCard label="Water Resource Est." value="3.2" unit="GT" icon={FlaskConical} color="#1DA1FF" />
          </div>
        </div>

        {/* Right: Moon + dashboard preview */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <MoonCanvas />
          {/* Floating data labels on moon */}
          <div style={{
            position: "absolute", top: "15%", right: -60,
            background: "rgba(10,16,34,0.9)", backdropFilter: "blur(12px)",
            border: "1px solid rgba(0,229,255,0.25)", borderRadius: 8, padding: "8px 12px",
            boxShadow: "0 0 20px rgba(0,229,255,0.1)",
          }}>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#7A8BA8", letterSpacing: "0.08em" }}>ICE PROB.</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 16, fontWeight: 600, color: "#00E5FF" }}>87.4%</div>
            <div style={{ fontFamily: "Inter", fontSize: 9, color: "#7A8BA8" }}>Shackleton Crater</div>
          </div>
          <div style={{
            position: "absolute", bottom: "20%", left: -70,
            background: "rgba(10,16,34,0.9)", backdropFilter: "blur(12px)",
            border: "1px solid rgba(139,92,246,0.3)", borderRadius: 8, padding: "8px 12px",
          }}>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#7A8BA8" }}>PSR DEPTH</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 16, fontWeight: 600, color: "#8B5CF6" }}>1.2 m</div>
            <div style={{ fontFamily: "Inter", fontSize: 9, color: "#7A8BA8" }}>avg subsurface</div>
          </div>
          <div style={{
            position: "absolute", bottom: "35%", right: -50,
            background: "rgba(10,16,34,0.9)", backdropFilter: "blur(12px)",
            border: "1px solid rgba(0,255,136,0.25)", borderRadius: 8, padding: "8px 12px",
          }}>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#7A8BA8" }}>SAFE ZONES</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 16, fontWeight: 600, color: "#00FF88" }}>12</div>
            <div style={{ fontFamily: "Inter", fontSize: 9, color: "#7A8BA8" }}>landing sites</div>
          </div>
        </div>
      </div>

      {/* Bottom tech specs bar */}
      <div style={{
        borderTop: "1px solid rgba(0,229,255,0.1)",
        padding: "16px 60px", display: "flex", gap: 40, alignItems: "center",
        background: "rgba(5,8,22,0.6)", backdropFilter: "blur(8px)",
      }}>
        {[
          { label: "DATA SOURCES", value: "DFSAR · DEM · H-MAP · PSR · OPTICAL" },
          { label: "AI MODELS", value: "RF · XGBoost · CNN · ViT" },
          { label: "COVERAGE", value: "85°S – 90°S" },
          { label: "RESOLUTION", value: "75m / pixel" },
          { label: "LAST UPDATE", value: "2024-06-14 04:37 UTC" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#7A8BA8", letterSpacing: "0.1em" }}>{item.label}</span>
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#E8EDF5" }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

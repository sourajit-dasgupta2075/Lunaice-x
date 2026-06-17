import { useState } from "react";
import {
  LayoutDashboard, Database, Globe, Layers, FlaskConical,
  MapPin, Navigation2, Cpu, FileText, Settings, ChevronLeft,
  ChevronRight, Droplets, Rocket, Bot
} from "lucide-react";

type Page =
  | "landing" | "dashboard" | "datasets" | "explorer" | "ice-volume"
  | "ice-detection" | "characterization" | "landing-analysis"
  | "rover" | "simulator" | "ai-copilot" | "reports" | "settings" | "rover-planner";

interface NavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onCollapse?: (collapsed: boolean) => void;
}

const navItems = [
  { id: "dashboard" as Page, label: "Dashboard", icon: LayoutDashboard },
  { id: "datasets" as Page, label: "Dataset Manager", icon: Database },
  { id: "explorer" as Page, label: "Lunar Explorer", icon: Globe },
  { id: "ice-detection" as Page, label: "Ice Detection", icon: Droplets },
  { id: "ice-volume" as Page, label: "Ice Volume", icon: FlaskConical },
  { id: "characterization" as Page, label: "Characterization", icon: FlaskConical },
  { id: "landing-analysis" as Page, label: "Landing Analysis", icon: MapPin },
  { id: "rover" as Page, label: "Rover Navigation", icon: Navigation2 },
  { id: "simulator" as Page, label: "Mission Simulator", icon: Cpu },
  { id: "ai-copilot" as Page, label: "AI Copilot", icon: Bot },
  { id: "reports" as Page, label: "Reports", icon: FileText },
  { id: "settings" as Page, label: "Settings", icon: Settings },
];

export function Navigation({ currentPage, onNavigate, onCollapse }: NavProps) {
  const [collapsed, setCollapsed] = useState(false);
  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    onCollapse?.(next);
  };

  return (
    <nav
      style={{
        width: collapsed ? "64px" : "220px",
        transition: "width 0.3s ease",
        background: "linear-gradient(180deg, #070D20 0%, #050816 100%)",
        borderRight: "1px solid rgba(0,229,255,0.1)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 50,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{
        padding: collapsed ? "20px 12px" : "20px 16px",
        borderBottom: "1px solid rgba(0,229,255,0.1)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        overflow: "hidden",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #E8EDF5 0%, #7A9CC0 40%, #1A3566 70%, #050816 100%)",
          boxShadow: "0 0 20px rgba(0,229,255,0.5)",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", width: 8, height: 8, borderRadius: "50%",
            background: "rgba(0,0,0,0.3)", top: 10, left: 14,
          }} />
          <div style={{
            position: "absolute", width: 5, height: 5, borderRadius: "50%",
            background: "rgba(0,0,0,0.25)", top: 18, left: 8,
          }} />
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 14, color: "#00E5FF", letterSpacing: "0.05em" }}>
              LUNAICE-X
            </div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#7A8BA8", letterSpacing: "0.08em" }}>
              MISSION CONTROL v2.4
            </div>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0", scrollbarWidth: "none" }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: collapsed ? "12px 20px" : "11px 16px",
                cursor: "pointer",
                border: "none",
                background: active
                  ? "linear-gradient(90deg, rgba(0,229,255,0.15) 0%, rgba(0,229,255,0.05) 100%)"
                  : "transparent",
                borderLeft: active ? "2px solid #00E5FF" : "2px solid transparent",
                color: active ? "#00E5FF" : "#7A8BA8",
                transition: "all 0.2s ease",
                overflow: "hidden",
                whiteSpace: "nowrap",
                justifyContent: collapsed ? "center" : "flex-start",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "#E8EDF5";
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "#7A8BA8";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span style={{ fontFamily: "Inter", fontSize: 13, fontWeight: active ? 500 : 400 }}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse toggle */}
      <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(0,229,255,0.1)" }}>
        <button
          onClick={toggleCollapse}
          style={{
            width: "100%", padding: "8px", border: "none",
            background: "rgba(0,229,255,0.08)", borderRadius: 6, cursor: "pointer",
            color: "#00E5FF", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </nav>
  );
}

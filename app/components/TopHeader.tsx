import { useState, useEffect } from "react";
import { Bell, User, Activity, Calendar, ChevronDown, Wifi, WifiOff } from "lucide-react";
import { checkHealth } from "../services/lunaiceApi";

interface TopHeaderProps {
  title: string;
  subtitle?: string;
}

export function TopHeader({ title, subtitle }: TopHeaderProps) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const ping = async () => {
      try {
        await checkHealth();
        setIsLive(true);
      } catch {
        setIsLive(false);
      }
    };
    ping();
    const interval = setInterval(ping, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      height: 60, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", borderBottom: "1px solid rgba(0,229,255,0.1)",
      background: "rgba(10,16,34,0.9)", backdropFilter: "blur(12px)",
      position: "sticky", top: 0, zIndex: 20, flexShrink: 0,
    }}>
      <div>
        <div style={{ fontFamily: "Space Grotesk", fontWeight: 600, fontSize: 16, color: "#E8EDF5" }}>{title}</div>
        {subtitle && <div style={{ fontFamily: "Inter", fontSize: 11, color: "#7A8BA8", marginTop: 1 }}>{subtitle}</div>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* Mission status */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: isLive ? "rgba(0,255,136,0.08)" : "rgba(255,77,106,0.08)", 
          border: isLive ? "1px solid rgba(0,255,136,0.2)" : "1px solid rgba(255,77,106,0.2)",
          borderRadius: 6, padding: "5px 12px",
        }}>
          <div style={{ 
            width: 7, height: 7, borderRadius: "50%", 
            background: isLive ? "#00FF88" : "#FF4D6A", 
            boxShadow: isLive ? "0 0 8px #00FF88" : "0 0 8px #FF4D6A" 
          }} />
          {isLive ? <Activity size={12} style={{ color: "#00FF88" }} /> : <WifiOff size={12} style={{ color: "#FF4D6A" }} />}
          <span style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: isLive ? "#00FF88" : "#FF4D6A", letterSpacing: "0.05em" }}>
            {isLive ? "MISSION ALPHA · LIVE" : "MISSION ALPHA · OFFLINE"}
          </span>
        </div>

        {/* Date/time */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#E8EDF5" }}>{timeStr}</span>
          <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#7A8BA8" }}>{dateStr} UTC</span>
        </div>

        {/* Notifications */}
        <button style={{
          width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(0,229,255,0.15)",
          background: "rgba(0,229,255,0.06)", cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center", position: "relative", color: "#7A8BA8",
        }}>
          <Bell size={16} />
          <div style={{
            position: "absolute", top: 6, right: 6, width: 7, height: 7,
            borderRadius: "50%", background: "#FF4D6A", border: "1px solid #050816",
          }} />
        </button>

        {/* User */}
        <button style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.15)",
          borderRadius: 8, padding: "5px 10px", cursor: "pointer",
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "linear-gradient(135deg, #00E5FF, #8B5CF6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <User size={12} style={{ color: "#050816" }} />
          </div>
          <span style={{ fontFamily: "Inter", fontSize: 12, color: "#E8EDF5" }}>Dr. A. Kumar</span>
          <ChevronDown size={12} style={{ color: "#7A8BA8" }} />
        </button>
      </div>
    </div>
  );
}

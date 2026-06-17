import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, User, Cpu } from "lucide-react";
import { TopHeader } from "./TopHeader";

type Message = { role: "user" | "ai"; text: string; typing?: boolean };

const suggestions = [
  "Find safest landing site near highest ice concentration",
  "What crater contains the highest ice probability?",
  "Generate mission report for Alpha Site",
  "Compare DFSAR CPR values across all craters",
  "Plan rover path from Z001 to R001",
  "Estimate total water resources in south polar region",
];

const responses: Record<string, string> = {
  default: "Based on Chandrayaan-2 DFSAR and hydrogen map analysis, I've identified 247 potential ice deposit regions. The highest confidence zone remains Shackleton Crater at 87.4% probability with an estimated depth of 1.2m and extent of 42 km².",
  safest: "**Optimal Landing Site Recommendation:**\n\n**Alpha Site** (Shackleton Crater) — Score: 94.2/100\n\n• Slope: 1.8° (below 5° threshold ✓)\n• Surface roughness: 0.09 (minimal ✓)\n• Distance to highest ice deposit: 0.4 km\n• Solar coverage: 68% of lunar day\n• Temperature: -163°C (thermal stable)\n\nThis site provides the optimal balance between proximity to ice-rich PSR zones and safe landing conditions. Recommend landing at coordinates 89.67°S, 0.00°E.",
  crater: "**Highest Ice Probability Analysis:**\n\n1. **Shackleton Crater** — 87.4% (DFSAR CPR: 2.8)\n   Lat: -89.67° · Lon: 0.00°\n   Hydrogen WEH: 4.2 wt% · Depth est.: 1.2m\n\n2. **Haworth Crater** — 78.1% (DFSAR CPR: 2.4)\n3. **Nobile Crater** — 72.3% (DFSAR CPR: 2.1)\n\nShackleton's permanently shadowed regions (PSR) show the strongest combination of high CPR, elevated hydrogen signatures, and consistent thermal suppression — all key indicators of water ice.",
  report: "**Mission Report Generated — Alpha Site**\n\n**Executive Summary:** Mission LUNAICE-X identifies Shackleton Crater as the primary target for lunar water ice extraction. AI confidence: 94.7%\n\n**Key Findings:**\n• 247 ice deposit zones mapped\n• Estimated water resources: 3.2 GT\n• Primary ice depth: 0.8–2.2m\n• Recommended rover path: 6.8 km (safest route)\n\n**Mission Readiness:** ✓ ALPHA STATUS\n\n[Full PDF report ready for export]",
  volume: "**Ice Volume Estimate:**\n\n• **Total Volume:** 1.25 km³\n• **Total Mass:** 1.14 trillion kg\n• **Equivalent Olympic Pools:** 456,000\n\nThis estimate is based on the Colaprete et al. (2010) and Hayne et al. (2015) methodologies, factoring in detected area, estimated depth, and ice concentration. The primary ice depth is estimated at 1.2m subsurface.",
  path: "**Rover Path Plan (Z001 to R001):**\n\n• **Algorithm:** A* with slope + PSR cost weighting\n• **Total Distance:** 6.8 km\n• **Estimated Duration:** 45.3 hours\n• **Energy Cost:** 1240 Wh\n• **Max Slope:** 18.2°\n• **PSR Segments:** 3\n\nThis path avoids high-slope regions and minimizes traversal through permanently shadowed regions, optimizing for safety and energy efficiency. Visualizing on Rover Navigation page.",
};

function getResponse(query: string): string {
  const q = query.toLowerCase();
  const matches = (words: string[]) => words.some(word => new RegExp(`\\b${word}\\b`, 'i').test(q));
  if (matches(["safest", "landing", "site"])) return responses.safest;
  if (matches(["crater", "highest", "probability", "ice"])) return responses.crater;
  if (matches(["report", "generate", "summary"])) return responses.report;
  if (matches(["volume", "mass", "how much ice"])) return responses.volume;
  if (matches(["plan", "rover", "path"])) return responses.path;
  return responses.default;
}

function formatMessage(text: string) {
  return text.split("\n").map((line, i) => {
    const cleanLine = line.replace(/\*\*/g, "");
    if (line.trim().startsWith("**") && line.trim().endsWith("**")) {
      return <div key={i} style={{ fontFamily: "Space Grotesk", fontWeight: 600, color: "#00E5FF", marginTop: 12, marginBottom: 4, fontSize: 14 }}>{cleanLine}</div>;
    }
    if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
      return <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginLeft: 8 }}>
        <span style={{ color: "#00E5FF", marginTop: 2 }}>·</span>
        <span style={{ flex: 1 }}>{cleanLine.trim().slice(1).trim()}</span>
      </div>;
    }
    if (/^\d+\./.test(line.trim())) {
      return <div key={i} style={{ marginLeft: 8, marginTop: 6, color: "#E8EDF5", borderLeft: "2px solid rgba(0,229,255,0.2)", paddingLeft: 10 }}>{cleanLine}</div>;
    }
    return line ? <div key={i} style={{ marginTop: 4 }}>{cleanLine}</div> : <br key={i} />;
  });
}

export function AICopilot() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Hello, Dr. Kumar. I'm LUNA-AI, your mission intelligence copilot. I have full access to Chandrayaan-2 DFSAR, DEM, hydrogen maps, PSR boundaries, and ice detection models. How can I assist your mission planning today?" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (query: string) => {
    if (!query.trim() || typing) return;
    setMessages(prev => [...prev, { role: "user", text: query }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const response = getResponse(query);
      setMessages(prev => [...prev, { role: "ai", text: response }]);
      setTyping(false);
    }, 1200 + Math.random() * 800);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopHeader title="AI Copilot" subtitle="LUNA-AI · Mission Intelligence Assistant" />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Main chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.role === "ai" && (
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: "linear-gradient(135deg, #00E5FF20, #8B5CF620)",
                    border: "1px solid rgba(0,229,255,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Bot size={18} style={{ color: "#00E5FF" }} />
                  </div>
                )}
                <div style={{
                  maxWidth: "75%",
                  background: msg.role === "ai" ? "rgba(13,21,48,0.9)" : "rgba(0,229,255,0.12)",
                  border: msg.role === "ai" ? "1px solid rgba(0,229,255,0.15)" : "1px solid rgba(0,229,255,0.3)",
                  borderRadius: msg.role === "ai" ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
                  padding: "12px 16px",
                  backdropFilter: "blur(12px)",
                }}>
                  {msg.role === "ai" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                      <Cpu size={10} style={{ color: "#00E5FF" }} />
                      <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#00E5FF", letterSpacing: "0.1em" }}>LUNA-AI · MISSION INTELLIGENCE</span>
                    </div>
                  )}
                  <div style={{ fontFamily: "Inter", fontSize: 13, color: "#E8EDF5", lineHeight: 1.65 }}>
                    {msg.role === "ai" ? formatMessage(msg.text) : msg.text}
                  </div>
                </div>
                {msg.role === "user" && (
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: "linear-gradient(135deg, #00E5FF, #8B5CF6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <User size={16} style={{ color: "#050816" }} />
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: "linear-gradient(135deg, #00E5FF20, #8B5CF620)",
                  border: "1px solid rgba(0,229,255,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Bot size={18} style={{ color: "#00E5FF" }} />
                </div>
                <div style={{ background: "rgba(13,21,48,0.9)", border: "1px solid rgba(0,229,255,0.15)", borderRadius: "4px 12px 12px 12px", padding: "14px 18px" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: 6, height: 6, borderRadius: "50%", background: "#00E5FF",
                        animation: `pulse 1.2s ${i * 0.2}s infinite`,
                        opacity: 0.7,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 20px 16px", borderTop: "1px solid rgba(0,229,255,0.1)" }}>
            <div style={{ display: "flex", gap: 10, background: "rgba(13,21,48,0.9)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 12, padding: "8px 8px 8px 16px" }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Ask about ice deposits, landing sites, mission planning..."
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontFamily: "Inter", fontSize: 14, color: "#E8EDF5",
                }}
              />
              <button
                onClick={() => send(input)}
                style={{
                  width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer",
                  background: input.trim() ? "linear-gradient(135deg, #00E5FF, #1DA1FF)" : "rgba(0,229,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: input.trim() ? "#050816" : "#7A8BA8", transition: "all 0.2s",
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Suggestions sidebar */}
        <div style={{ width: 240, borderLeft: "1px solid rgba(0,229,255,0.1)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={14} style={{ color: "#8B5CF6" }} />
            <span style={{ fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 600, color: "#E8EDF5" }}>Quick Queries</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                style={{
                  textAlign: "left", padding: "9px 12px", borderRadius: 8, cursor: "pointer",
                  background: "rgba(10,16,34,0.6)", border: "1px solid rgba(255,255,255,0.06)",
                  color: "#7A8BA8", fontFamily: "Inter", fontSize: 11, lineHeight: 1.4,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,229,255,0.25)"; e.currentTarget.style.color = "#E8EDF5"; e.currentTarget.style.background = "rgba(0,229,255,0.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#7A8BA8"; e.currentTarget.style.background = "rgba(10,16,34,0.6)"; }}
              >
                {s}
              </button>
            ))}
          </div>

          <div style={{ marginTop: "auto", background: "rgba(10,16,34,0.8)", borderRadius: 10, border: "1px solid rgba(139,92,246,0.2)", padding: 12 }}>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: "#8B5CF6", letterSpacing: "0.1em", marginBottom: 6 }}>SYSTEM STATUS</div>
            {[
              { label: "DFSAR Model", status: "online" },
              { label: "Ice Classifier", status: "online" },
              { label: "Path Planner", status: "online" },
              { label: "Report Engine", status: "standby" },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ fontFamily: "Inter", fontSize: 10, color: "#7A8BA8" }}>{s.label}</span>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: 9, color: s.status === "online" ? "#00FF88" : "#FFB800" }}>
                  {s.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

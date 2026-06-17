import { useState } from "react";
import { ParticleBackground } from "./components/ParticleBackground";
import { Navigation } from "./components/Navigation";
import { LandingPage } from "./components/LandingPage";
import { Dashboard } from "./components/Dashboard";
import { LunarExplorer } from "./components/LunarExplorer";
import { DatasetManager } from "./components/DatasetManager";
import { IceDetection } from "./components/IceDetection";
import { IceCharacterization } from "./components/IceCharacterization";
import { LandingAnalysis } from "./components/LandingAnalysis";
import { RoverNavigation } from "./components/RoverNavigation";
import { MissionSimulator } from "./components/MissionSimulator";
import { AICopilot } from "./components/AICopilot";
import { ReportsPage } from "./components/ReportsPage";
import { RoverPathPlanner } from "./components/RoverPathPlanner";
import { AnalysisPage } from "./components/AnalysisPage";
import { IceVolume } from "./components/IceVolume";

/* MARKER-MAKE-KIT-INVOKED */

type Page =
  | "landing" | "dashboard" | "datasets" | "explorer" | "analysis" | "ice-volume"
  | "ice-detection" | "characterization" | "landing-analysis"
  | "rover" | "simulator" | "ai-copilot" | "reports" | "settings" | "rover-planner";

function SettingsPage() {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <div style={{ fontFamily: "Space Grotesk", color: "#7A8BA8", fontSize: 16 }}>Settings</div>
      <div style={{ fontFamily: "Inter", color: "#7A8BA8", fontSize: 13 }}>Configuration panel — coming soon</div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("landing");
  const [lastAnalyzedId, setLastAnalyzedId] = useState<number | null>(null);

  const [navCollapsed, setNavCollapsed] = useState(false);
  const isLanding = page === "landing";

  const handleAnalysisComplete = (id: number) => {
    setLastAnalyzedId(id);
    setPage("analysis");
  };

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard />;
      case "explorer": return <LunarExplorer selectedDatasetId={lastAnalyzedId} />;
      case "datasets": return <DatasetManager onAnalyzeComplete={handleAnalysisComplete} />;
      case "analysis": return <AnalysisPage datasetId={lastAnalyzedId} />;
      case "ice-volume": return <IceVolume />;
      case "ice-detection": return <IceDetection />;
      case "characterization": return <IceCharacterization />;
      case "landing-analysis": return <LandingAnalysis selectedDatasetId={lastAnalyzedId} />;
      case "rover-planner": return <RoverPathPlanner />;
      case "rover": return <RoverNavigation />;
      case "simulator": return <MissionSimulator />;
      case "ai-copilot": return <AICopilot />;
      case "reports": return <ReportsPage datasetId={lastAnalyzedId} />;
      case "settings": return <SettingsPage />;
      default: return <Dashboard />;
    }
  };

  if (isLanding) {
    return (
      <div style={{
        fontFamily: "Inter, sans-serif",
        background: "#050816",
        minHeight: "100vh",
        color: "#E8EDF5",
        position: "relative",
      }}>
        <ParticleBackground />
        <div style={{ position: "relative", zIndex: 1 }}>
          <LandingPage onEnter={() => setPage("dashboard")} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "Inter, sans-serif",
      background: "#050816",
      height: "100vh",
      color: "#E8EDF5",
      display: "flex",
      overflow: "hidden",
      position: "relative",
    }}>
      <ParticleBackground />

      {/* Left navigation */}
      <Navigation currentPage={page} onNavigate={(p) => setPage(p)} onCollapse={setNavCollapsed} />

      {/* Main content — offset by nav width */}
      <div style={{
        marginLeft: navCollapsed ? 64 : 220,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        zIndex: 1,
        transition: "margin-left 0.3s ease",
      }}>
        {renderPage()}
      </div>
    </div>
  );
}

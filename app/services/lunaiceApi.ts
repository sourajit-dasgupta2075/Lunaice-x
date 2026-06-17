/**
 * LUNAICE-X API Client
 * All communication with the FastAPI backend goes through this module.
 */

const BASE_URL = "/api"; // proxied by Vite → http://localhost:8000

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail?.detail ?? `HTTP ${res.status}: ${res.statusText} at ${path}`);
  }

  return res.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Dataset {
  id: number;
  filename: string;
  filetype: string;
  path: string;
  uploaded_at: string;
  is_analyzed: boolean;
}

export interface IceRegion {
  region_id: string;
  latitude: number;
  longitude: number;
  depth_m: number;
  probability: number;
  concentration_pct: number;
  area_km2: number;
  cpr: number;
  ice_type: string;
  purity_pct: number;
}

export interface IceVolumeBreakdown {
  region_id: string;
  area_km2: number;
  depth_m: number;
  concentration_pct: number;
  volume_km3: number;
  volume_liters: number;
  mass_kg: number;
  equivalent_olympic_pools: number;
}

export interface IceVolumeResult {
  total_volume_km3: number;
  total_mass_kg: number;
  total_mass_metric_tons: number;
  equivalent_olympic_pools: number;
  methodology: string;
  regions: IceVolumeBreakdown[];
}

export interface AnalysisResult {
  dataset_id: number | null;
  status: string;
  algorithm: string;
  processing_time_s: number;
  regions_detected: number;
  mean_probability: number;
  ice_volume_estimate?: IceVolumeResult;
  regions: IceRegion[];
}

export interface IceDetectionResult {
  total_regions: number;
  high_confidence_regions: number;
  mean_probability: number;
  coverage_km2: number;
  regions: IceRegion[];
}

export interface MissionZone {
  zone_id: string;
  name: string;
  latitude: number;
  longitude: number;
  ice_probability: number;
  accessibility_score: number;
  recommended: boolean;
  notes: string;
}

export interface IceTypeBreakdown {
  ice_type: string;
  count: number;
  mean_purity_pct: number;
}

export interface DashboardStats {
  total_datasets: number;
  total_regions_detected: number;
  high_confidence_regions: number;
  mean_ice_probability: number;
  total_coverage_km2: number;
  recommended_mission_zones: number;
  last_updated: string;
  ice_type_breakdown: IceTypeBreakdown[];
}

// ── Health ────────────────────────────────────────────────────────────────────

export const checkHealth = () =>
  request<{ status: string; service: string; timestamp: string }>("/health");

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const getDashboardStats = () =>
  request<DashboardStats>("/dashboard/stats");

// ── Datasets ──────────────────────────────────────────────────────────────────

export const listDatasets = () => request<Dataset[]>("/datasets");

export const getDataset = (id: number) => request<Dataset>(`/datasets/${id}`);

export const getDatasetPreview = (id: number) => request<any>(`/datasets/${id}/preview`);

export const deleteDataset = (id: number) =>
  request<{ message: string }>(`/datasets/${id}`, { method: "DELETE" });

export const uploadDataset = async (file: File): Promise<Dataset> => {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/datasets/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail?.detail ?? `Upload failed: HTTP ${res.status}`);
  }
  return res.json();
};

// ── Analysis ──────────────────────────────────────────────────────────────────

export const analyzeDataset = (id: number) =>
  request<AnalysisResult>(`/analyze/${id}`, { method: "POST" });

export const getAnalysisResult = (id: number) =>
  request<AnalysisResult>(`/analysis/${id}`);

export const getLatestIceVolume = () => request<IceVolumeResult>("/analysis/latest/volume");

export const getIceDetectionOverview = () =>
  request<IceDetectionResult>("/ice-detection");

// ── Mission Zones ─────────────────────────────────────────────────────────────

export const getMissionZones = () => request<MissionZone[]>("/mission-zones");

// ── Rover Path Planning ───────────────────────────────────────────────────────

export interface GridCell {
  row: number;
  col: number;
  lat: number;
  lon: number;
  slope_deg: number;
  in_psr: boolean;
  traversable: boolean;
}

export interface PathNode {
  row: number;
  col: number;
  lat: number;
  lon: number;
  cumulative_dist_km: number;
  slope_deg: number;
  in_psr: boolean;
}

export interface RoverPathResult {
  start_zone: string;
  target_region: string;
  algorithm: string;
  total_distance_km: number;
  estimated_duration_hours: number;
  energy_cost_wh: number;
  max_slope_deg: number;
  psr_segments: number;
  path: PathNode[];
  waypoints: PathNode[];
  grid_size: number;
  feasible: boolean;
}

export const getTerrainGrid = () => request<GridCell[]>("/rover/terrain");

export const planRoverPath = (startZone: string, targetRegion: string) =>
  request<RoverPathResult>(`/rover/plan?zone_id=${startZone}&region_id=${targetRegion}`);
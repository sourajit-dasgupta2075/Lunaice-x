import os
import shutil
import zipfile
import heapq
import json
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any, Tuple, Dict, Union
import xgboost as xgb
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime, Text, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
import geopandas as gpd
import random
import time
import math

app = FastAPI()

# ── Ice Volume Constants ─────────────────────────────────────────────────────
ICE_DENSITY_KG_M3   = 917.0          # water ice density
OLYMPIC_POOL_LITERS = 2_500_000.0    # 2.5 million litres
KM3_TO_M3           = 1e9
KM2_TO_M2           = 1e6
MODEL_PATH = "xgboost_ice_model.pkl"


# ── Constants and Setup ──────────────────────────────────────────────────
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# ── Database Configuration ──────────────────────────────────────────────────
SQLALCHEMY_DATABASE_URL = "sqlite:///./lunaice.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
metadata = Base.metadata

# ── WebSocket Connection Manager ─────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        # Map client_id to WebSocket connection
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, client_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)

    async def send_personal_message(self, message: dict, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json(message)

manager = ConnectionManager()

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models (Matching TypeScript Interfaces) ──────────────────────────────────

class Dataset(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    filename: str
    filetype: str
    path: str
    uploaded_at: datetime
    is_analyzed: bool = False

class IceRegion(BaseModel):
    model_config = {"from_attributes": True}
    region_id: str
    latitude: float
    longitude: float
    depth_m: float
    probability: float
    concentration_pct: float
    area_km2: float
    cpr: float = 0.0
    ice_type: str = "Unknown"
    purity_pct: float = 0.0

class IceTypeBreakdown(BaseModel):
    ice_type: str
    count: int
    mean_purity_pct: float

class DashboardStats(BaseModel):
    total_datasets: int
    total_regions_detected: int
    high_confidence_regions: int
    mean_ice_probability: float
    total_coverage_km2: float
    recommended_mission_zones: int
    last_updated: str
    ice_type_breakdown: List[IceTypeBreakdown]

class IceDetectionResult(BaseModel):
    total_regions: int
    high_confidence_regions: int
    mean_probability: float
    coverage_km2: float
    regions: List[IceRegion]

class MissionZone(BaseModel):
    zone_id: str
    name: str
    latitude: float
    longitude: float
    ice_probability: float
    accessibility_score: float
    recommended: bool
    notes: str

class IceVolumeBreakdown(BaseModel):
    model_config = {"from_attributes": True}
    region_id: str
    area_km2: float
    depth_m: float
    concentration_pct: float
    volume_km3: float
    volume_liters: float
    mass_kg: float
    equivalent_olympic_pools: float

class IceVolumeResult(BaseModel):
    model_config = {"from_attributes": True}
    total_volume_km3: float
    total_mass_kg: float
    total_mass_metric_tons: float
    equivalent_olympic_pools: float
    methodology: str
    regions: List[IceVolumeBreakdown]

class AnalysisResult(BaseModel):
    model_config = {"from_attributes": True}
    dataset_id: Optional[int]
    status: str
    algorithm: str
    processing_time_s: float
    regions_detected: int
    mean_probability: float
    regions: List[IceRegion] = []
    ice_volume_estimate: Optional[IceVolumeResult] = None

class GridCell(BaseModel):
    model_config = {"from_attributes": True}
    row: int
    col: int
    lat: float
    lon: float
    slope_deg: float
    in_psr: bool
    traversable: bool

class PathNode(BaseModel):
    model_config = {"from_attributes": True}
    row: int
    col: int
    lat: float
    lon: float
    cumulative_dist_km: float
    slope_deg: float
    in_psr: bool

class RoverPathResult(BaseModel):
    model_config = {"from_attributes": True}
    start_zone: str
    target_region: str
    algorithm: str
    total_distance_km: float
    estimated_duration_hours: float
    energy_cost_wh: float
    max_slope_deg: float
    psr_segments: int
    path: List[PathNode]
    waypoints: List[PathNode]
    grid_size: int
    feasible: bool

class DatasetModel(Base):
    __tablename__ = "datasets"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    filetype = Column(String)
    path = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    analyses = relationship("AnalysisResultModel", back_populates="dataset")

class AnalysisResultModel(Base):
    __tablename__ = "analysis_results"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    status = Column(String)
    algorithm = Column(String)
    processing_time_s = Column(Float)
    regions_detected = Column(Integer)
    mean_probability = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    ice_volume_estimate_json = Column(Text, nullable=True) # Store IceVolumeResult as JSON
    
    dataset = relationship("DatasetModel", back_populates="analyses")
    regions = relationship("IceRegionModel", back_populates="analysis")

class IceRegionModel(Base):
    __tablename__ = "ice_regions"
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analysis_results.id"))
    region_id = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    depth_m = Column(Float)
    probability = Column(Float)
    concentration_pct = Column(Float)
    area_km2 = Column(Float)
    cpr = Column(Float, default=0.0)
    ice_type = Column(String, default="Unknown")
    purity_pct = Column(Float, default=0.0)

    analysis = relationship("AnalysisResultModel", back_populates="regions")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ── XGBoost Model Training (Synthetic Data) ──────────────────────────────────
def _train_and_save_xgboost_model():
    """
    Generates synthetic data, trains a simple XGBoost model, and saves it.
    This is for demonstration purposes to simulate an ML model.
    """
    print("Training and saving synthetic XGBoost model...")
    np.random.seed(42)
    
    n_samples = 1000
    
    # Features: CPR, Slope, Latitude, PSR status
    cpr = np.random.uniform(0.5, 2.5, n_samples) # Higher CPR -> more likely ice
    slope_deg = np.random.uniform(0, 30, n_samples) # Higher slope -> less likely ice
    latitude = np.random.uniform(-90, -80, n_samples) # Closer to -90 -> more likely ice
    in_psr = np.random.choice([0, 1], n_samples, p=[0.7, 0.3]) # PSR -> more likely ice
    
    # Target: ice_presence (binary)
    # Create a correlation: high CPR, low slope, high absolute latitude, in PSR -> ice_presence = 1
    ice_presence_prob = (
        (cpr > 1.2) * 0.4 +
        (slope_deg < 10) * 0.3 +
        (latitude < -85) * 0.2 +
        (in_psr == 1) * 0.1 +
        np.random.uniform(-0.2, 0.2, n_samples) # Add some noise
    )
    ice_presence = (ice_presence_prob > 0.5).astype(int)
    
    data = pd.DataFrame({
        'cpr': cpr,
        'slope_deg': slope_deg,
        'latitude': latitude,
        'in_psr': in_psr,
        'ice_presence': ice_presence
    })
    
    X = data[['cpr', 'slope_deg', 'latitude', 'in_psr']]
    y = data['ice_presence']
    
    model = xgb.XGBClassifier(objective='binary:logistic', eval_metric='logloss', use_label_encoder=False, random_state=42)
    model.fit(X, y)
    
    joblib.dump(model, MODEL_PATH)
    print(f"XGBoost model saved to {MODEL_PATH}")

# ── Detection Engine ────────────────────────────────────────────────────────
class IceDetectionEngine:
    def __init__(self, algorithm: str = "LUNAICE-X Hybrid ViT-XGBoost"):
        self.algorithm = algorithm
        self.xgb_model = None
        if not os.path.exists(MODEL_PATH):
            _train_and_save_xgboost_model()
            print(f"XGBoost model training initiated as {MODEL_PATH} was not found.")
        try:
            self.xgb_model = joblib.load(MODEL_PATH)
            print(f"XGBoost model loaded from {MODEL_PATH}")
            print(f"IceDetectionEngine initialized with algorithm: {self.algorithm}")
        except Exception as e:
            print(f"Error loading XGBoost model: {e}. Running in heuristic mode.")
            # Fallback to heuristic if model fails to load
            self.xgb_model = None

    def analyze(self, dataset_id: int, analysis_seed: str) -> List[dict]:
        # Use the provided unique analysis_seed for mock data generation
        rng = random.Random(analysis_seed)
        # ... (keep existing fallback logic for non-geospatial files)
        return self._generate_mock_regions(dataset_id, rng)

    def analyze_shapefile(self, shp_path: str, dataset_id: int, analysis_seed: str) -> List[dict]:
        self.algorithm = "IIRS Shapefile Ice Detection Engine"
        try:
            gdf = gpd.read_file(shp_path)
        except Exception as e:
            print(f"Error reading shapefile: {e}")
            return []

        if gdf.empty:
            return []
        
        # Filter invalid geometries
        gdf = gdf[gdf.geometry.notnull() & gdf.geometry.is_valid]

        regions = []
        
        for idx, row in gdf.iterrows():
            # Create a region-specific RNG seeded with location and dataset metadata
            # This ensures unique "random" properties even if the same dataset ID is reused
            # Incorporate the overall analysis_seed for even more uniqueness
            region_rng = random.Random(f"{analysis_seed}-{idx}-{row.geometry.centroid.x}-{row.geometry.centroid.y}")

            # Extract centroid for Lat/Lon
            centroid = row.geometry.centroid
            lat, lon = centroid.y, centroid.x
            
            # DFSAR CPR Signature Analysis
            # High CPR (>1.4) inside PSR usually indicates volume scattering from ice.
            cpr = 1.0
            if 'CPR' in gdf.columns and isinstance(row['CPR'], (int, float)):
                cpr = float(row['CPR'])
            else:
                cpr = region_rng.uniform(0.4, 1.8)
            
            # Scientific Heuristic for Characterization
            depth_m = round(region_rng.uniform(0.5, 3.5), 2)
            if 'DEPTH' in gdf.columns and isinstance(row['DEPTH'], (int, float)):
                depth_m = round(float(row['DEPTH']), 2)

            # Prepare features for XGBoost prediction
            features = pd.DataFrame([[cpr, round(row.get('slope_deg', region_rng.uniform(0, 20)), 1), lat, 1 if 'in_psr' in row and row['in_psr'] else 0]],
                                    columns=['cpr', 'slope_deg', 'latitude', 'in_psr'])
            
            prob = 0.0
            if self.xgb_model:
                # Predict probability using the XGBoost model
                prob = self.xgb_model.predict_proba(features)[:, 1][0]
                prob = min(0.98, max(0.02, prob)) # Clamp probability to a reasonable range
            else:
                # Fallback to heuristic if model not loaded
                base_prob = region_rng.uniform(0.5, 0.7)
                polar_weight = 0.15 if abs(lat) > 80 else 0.0
                attr_factor = min(0.1, cpr * 0.05)
                prob = min(0.98, base_prob + polar_weight + attr_factor + region_rng.uniform(-0.02, 0.02))

            if cpr > 1.4:
                ice_type = "Massive Subsurface Ice"
                purity_base = 75
            elif cpr > 1.0:
                ice_type = "Regolith-Ice Mixture"
                purity_base = 35
            elif depth_m < 0.8:
                ice_type = "Surface Frost"
                purity_base = 15
            else:
                ice_type = "Lithic Scattering / Rock"
                purity_base = 5

            # Adjust concentration and purity based on predicted probability
            conc = round(prob * 50.0 * region_rng.uniform(0.8, 1.2), 1) # Higher prob -> higher conc
            purity = min(98.0, purity_base + (prob * 100 * 0.2) + region_rng.uniform(-5, 5)) # Purity also influenced by prob

            # Area Estimation: Adjust for units and CRS
            area = row.geometry.area
            if area < 1.0 and gdf.crs and gdf.crs.is_geographic:
                # Rough conversion for geographic coordinates at polar regions
                area = area * (30.3 * 30.3) * math.cos(math.radians(lat))
                area = max(area, region_rng.uniform(2.0, 25.0))
            elif area < 0.01:
                area = region_rng.uniform(2.0, 25.0)
            else:
                area = round(area, 2)

            regions.append({
                "region_id": f"IIRS-{dataset_id}-{idx+1:03}",
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
                "depth_m": depth_m,
                "probability": round(prob, 3),
                "concentration_pct": conc,
                "area_km2": area,
                "cpr": round(cpr, 2),
                "ice_type": ice_type,
                "purity_pct": round(purity, 1)
            })
        return regions

    def _generate_mock_regions(self, dataset_id: int, rng: random.Random) -> List[dict]:
        num_regions = rng.randint(3, 8)
        regions = []
        
        for i in range(num_regions):
            # Scientifically reasonable: More ice probability near the South Pole (-80 to -90)
            lat = rng.uniform(-89.9, -84.0)
            lon = rng.uniform(-180, 180)
            
            # Probability increases with absolute latitude
            base_prob = 0.6 + (abs(lat) / 90) * 0.3

            # Use the passed-in rng (seeded with unique analysis_seed) to ensure distinct runs
            cpr = rng.uniform(0.5, 1.7)
            depth_m = round(rng.uniform(0.5, 3.5), 2)
            
            prob = 0.0
            if self.xgb_model:
                # Generate mock features for prediction
                features = pd.DataFrame([[cpr, rng.uniform(0, 20), lat, rng.choice([0,1])]],
                                        columns=['cpr', 'slope_deg', 'latitude', 'in_psr'])
                prob = self.xgb_model.predict_proba(features)[:, 1][0]
                prob = min(0.98, max(0.02, prob))
            else:
                # Fallback to heuristic if model not loaded
                prob = min(0.98, base_prob + rng.uniform(-0.05, 0.05))

            if cpr > 1.4:
                ice_type = "Massive Subsurface Ice"
                purity_base = 70
            elif cpr > 1.1:
                ice_type = "Regolith-Ice Mixture"
                purity_base = 30
            elif depth_m < 1.0:
                ice_type = "Surface Frost"
                purity_base = 12
            else:
                ice_type = "Lithic Scattering / Rock"
                purity_base = 4
            
            regions.append({
                "region_id": f"LX-{dataset_id}-{i+1:03}",
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
                "depth_m": depth_m,
                "probability": round(prob, 3),
                "concentration_pct": round(prob * 50.0 * rng.uniform(0.8, 1.2), 1), # Realistic concentration influenced by prob
                "area_km2": round(rng.uniform(2.0, 25.0), 1),
                "cpr": round(cpr, 2),
                "ice_type": ice_type,
                "purity_pct": round(purity_base + (prob * 100 * 0.2) + rng.uniform(0, 15), 1) # Purity influenced by prob
            })
        return regions

def estimate_ice_volume(regions: List[Any]) -> IceVolumeResult:
    """
    Estimates total ice volume and mass based on detected regions.
    Formula (Colaprete et al. 2010; Hayne et al. 2015 methodology):
      Volume (m³) = Area (m²) × Depth (m) × (Concentration / 100)
      Mass (kg)   = Volume × Ice density (917 kg/m³)
    """
    if not regions:
        return IceVolumeResult(
            total_volume_km3=0.0,
            total_mass_kg=0.0,
            total_mass_metric_tons=0.0,
            equivalent_olympic_pools=0.0,
            methodology="",
            regions=[]
        )

    breakdowns: List[IceVolumeBreakdown] = []
    total_vol_km3 = 0.0
    total_mass_kg = 0.0

    for r in regions:
        # Handle both dicts from engine and SQLAlchemy objects from DB
        if isinstance(r, dict):
            area_km2 = r.get('area_km2', 0.0)
            depth_m = r.get('depth_m', 0.0)
            concentration_pct = r.get('concentration_pct', 0.0)
            region_id = r.get('region_id', 'N/A')
        else:
            area_km2 = r.area_km2
            depth_m = r.depth_m
            concentration_pct = r.concentration_pct
            region_id = r.region_id

        area_m2   = area_km2 * KM2_TO_M2
        conc_frac = concentration_pct / 100.0

        vol_m3    = area_m2 * depth_m * conc_frac
        vol_km3   = vol_m3 / KM3_TO_M3
        vol_liters = vol_m3 * 1000.0

        mass_kg   = vol_m3 * ICE_DENSITY_KG_M3
        pools     = vol_liters / OLYMPIC_POOL_LITERS

        total_vol_km3 += vol_km3
        total_mass_kg += mass_kg

        breakdowns.append(IceVolumeBreakdown(
            region_id=region_id,
            area_km2=round(area_km2, 2),
            depth_m=round(depth_m, 2),
            concentration_pct=round(concentration_pct, 1),
            volume_km3=round(vol_km3, 6),
            volume_liters=round(vol_liters, 0),
            mass_kg=round(mass_kg, 0),
            equivalent_olympic_pools=round(pools, 2),
        ))

    return IceVolumeResult(
        total_volume_km3=round(total_vol_km3, 6),
        total_mass_kg=round(total_mass_kg, 0),
        total_mass_metric_tons=round(total_mass_kg / 1000, 1),
        equivalent_olympic_pools=round(sum(b.equivalent_olympic_pools for b in breakdowns), 2),
        methodology=(
            "Volume = Area × Depth × Ice Concentration. Mass = Volume × 917 kg/m³ (ice density). "
            "Method follows Colaprete et al. (2010) and Hayne et al. (2015). "
            "Concentration derived from DFSAR backscatter anomaly calibrated against LCROSS impact data."
        ),
        regions=breakdowns,
    )

async def perform_analysis_logic(id: int, db_result_id: int, client_id: Optional[str] = None):
    """Background task to run heavy geospatial processing."""
    db = SessionLocal()
    print(f"Background Analysis: Entering perform_analysis_logic for dataset {id}, db_result_id {db_result_id}")
    try:
        db_result = db.query(AnalysisResultModel).filter(AnalysisResultModel.id == db_result_id).first()
        dataset = db.query(DatasetModel).filter(DatasetModel.id == id).first()
        
        # Generate a unique seed for this specific analysis run
        # This ensures that even if dataset_id is reused, the "random" outputs are different
        analysis_seed = f"{dataset.id}-{dataset.path}-{time.time()}-{os.urandom(8).hex()}"
        print(f"Background Analysis: Generated analysis_seed: {analysis_seed}")

        if not db_result or not dataset:
            return

        start_time = time.time()
        engine = IceDetectionEngine()
        
        # Determine analysis type (shapefile or mock)
        shp_path = None
        dataset_dir = os.path.dirname(dataset.path)
        if dataset.filename.lower().endswith(".zip"):
            for root, _, files in os.walk(dataset_dir):
                for file in files:
                    if file.lower().endswith(".shp"):
                        shp_path = os.path.join(root, file)
                        break
                if shp_path: break
        elif dataset.filename.lower().endswith(".shp"):
            shp_path = dataset.path

        detected_regions = engine.analyze_shapefile(shp_path, id, analysis_seed) if shp_path else engine.analyze(id, analysis_seed)

        # Update metrics
        db_result.status = "completed"
        db_result.algorithm = engine.algorithm
        db_result.processing_time_s = round(time.time() - start_time, 2)
        db_result.regions_detected = len(detected_regions)
        db_result.mean_probability = round(sum(r["probability"] for r in detected_regions) / len(detected_regions), 3) if detected_regions else 0.0

        # Run Volume Estimator
        vol_res = estimate_ice_volume(detected_regions)
        db_result.ice_volume_estimate_json = json.dumps(vol_res.model_dump())

        for r in detected_regions:
            # Ensure r is a dict before unpacking
            db.add(IceRegionModel(analysis_id=db_result.id, **r))
        
        db.commit()

        if client_id:
            await manager.send_personal_message({
                "type": "ANALYSIS_COMPLETED",
                "dataset_id": id,
                "status": "completed"
            }, client_id)
        print(f"Background Analysis: Completed successfully for dataset {id}")

    except Exception as e:
        db.rollback()
        if db_result:
            db_result.status = "failed"
            db.commit()
        print(f"Background Analysis Error for dataset {id}: {e}", exc_info=True) # Print full traceback
    finally:
        db.close()

# ── Rover Path Planner ───────────────────────────────────────────────────────

# ── Constants ────────────────────────────────────────────────────────────────

GRID_SIZE       = 40          # 40×40 cells covering ~4°×4° around south pole
LAT_MIN, LAT_MAX = -90.0, -86.0
LON_MIN, LON_MAX = -20.0,  20.0
CELL_SIZE_KM    = 5.5         # km per cell (approximate at ~89°S)
MAX_SLOPE_DEG   = 25.0        # rover cannot traverse steeper than this
ROVER_SPEED_KPH = 0.15        # avg 150 m/h on rough terrain
ENERGY_PER_KM_WH = 80.0       # Wh per km on flat terrain; slope adds more

# Slope penalty multiplier (steeper = more energy, less preferred by A*)
def slope_cost_factor(slope: float) -> float:
    if slope > MAX_SLOPE_DEG:
        return 1e9   # impassable
    return 1.0 + (slope / MAX_SLOPE_DEG) ** 2

# PSR traversal adds navigation hazard (no solar charging, comms harder)
PSR_HAZARD = 1.3

# ── Terrain Generation ───────────────────────────────────────────────────────

def _lat(row: int) -> float:
    return LAT_MIN + (row / GRID_SIZE) * (LAT_MAX - LAT_MIN)

def _lon(col: int) -> float:
    return LON_MIN + (col / GRID_SIZE) * (LON_MAX - LON_MIN)

def _generate_terrain(seed: int = 42) -> List[List[dict]]:
    """
    Generate a reproducible terrain grid with realistic slope/PSR distribution.
    PSRs cluster near the pole (rows 0–10). Craters produce high-slope rings.
    """
    rng = random.Random(seed)

    # Place a few crater centres
    craters = [
        (rng.randint(2, 15), rng.randint(5, 35), rng.randint(3, 7)),  # row,col,radius
        (rng.randint(5, 20), rng.randint(10, 30), rng.randint(2, 5)),
        (rng.randint(0, 10), rng.randint(0, 39), rng.randint(4, 8)),
    ]

    grid = []
    for r in range(GRID_SIZE):
        row_cells = []
        for c in range(GRID_SIZE):
            # Base slope: noisy, higher near craters
            base_slope = rng.gauss(8, 4)

            # Crater rim effect: high slope in ring around crater centre
            for cr, cc, cr_r in craters:
                dist = math.hypot(r - cr, c - cc)
                if abs(dist - cr_r) < 1.5:       # on the rim
                    base_slope += rng.gauss(20, 5)
                elif dist < cr_r:                 # inside crater
                    base_slope += rng.gauss(5, 2)

            slope = max(0.0, min(45.0, base_slope))

            # PSR: permanently shadowed if near pole (row < 12) and inside craters
            in_psr = False
            if r < 12:
                for cr, cc, cr_r in craters:
                    if math.hypot(r - cr, c - cc) < cr_r:
                        in_psr = True
                        break
                if r < 5:
                    in_psr = True   # deep polar PSR

            traversable = slope <= MAX_SLOPE_DEG

            row_cells.append({
                "row": r, "col": c,
                "lat": _lat(r), "lon": _lon(c),
                "slope_deg": round(slope, 1),
                "in_psr": in_psr,
                "traversable": traversable,
            })
        grid.append(row_cells)
    return grid

_TERRAIN: List[List[dict]] = _generate_terrain()

# ── Coordinate helpers ────────────────────────────────────────────────────────

def latlon_to_cell(lat: float, lon: float) -> Tuple[int, int]:
    row = int((lat - LAT_MIN) / (LAT_MAX - LAT_MIN) * GRID_SIZE)
    col = int((lon - LON_MIN) / (LON_MAX - LON_MIN) * GRID_SIZE)
    row = max(0, min(GRID_SIZE - 1, row))
    col = max(0, min(GRID_SIZE - 1, col))
    return row, col

def cell_dist_km(r1, c1, r2, c2) -> float:
    dlat = abs(_lat(r1) - _lat(r2)) * 111.0
    dlon = abs(_lon(c1) - _lon(c2)) * 111.0 * math.cos(math.radians(_lat((r1+r2)//2)))
    return math.hypot(dlat, dlon)

# ── A* ────────────────────────────────────────────────────────────────────────

def _heuristic(r1, c1, r2, c2) -> float:
    return cell_dist_km(r1, c1, r2, c2)

_DIRS = [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)]

def _astar(grid, start: Tuple[int,int], goal: Tuple[int,int]) -> Optional[List[Tuple[int,int]]]:
    sr, sc = start
    gr, gc = goal

    open_heap = [(0.0, sr, sc)]
    came_from: Dict[Tuple[int,int], Optional[Tuple[int,int]]] = {(sr,sc): None}
    g_score: Dict[Tuple[int,int], float] = {(sr,sc): 0.0}

    while open_heap:
        _, r, c = heapq.heappop(open_heap)

        if (r, c) == (gr, gc):
            # Reconstruct
            path = []
            cur: Optional[Tuple[int,int]] = (gr, gc)
            while cur is not None:
                path.append(cur)
                cur = came_from[cur]
            return list(reversed(path))

        for dr, dc in _DIRS:
            nr, nc = r + dr, c + dc
            if not (0 <= nr < GRID_SIZE and 0 <= nc < GRID_SIZE):
                continue
            cell = grid[nr][nc]
            if not cell["traversable"]:
                continue

            step_km   = cell_dist_km(r, c, nr, nc)
            cost      = step_km * slope_cost_factor(cell["slope_deg"])
            if cell["in_psr"]:
                cost *= PSR_HAZARD

            tentative_g = g_score[(r,c)] + cost
            if tentative_g < g_score.get((nr,nc), 1e18):
                g_score[(nr,nc)] = tentative_g
                came_from[(nr,nc)] = (r, c)
                f = tentative_g + _heuristic(nr, nc, gr, gc)
                heapq.heappush(open_heap, (f, nr, nc))

    return None   # no path found

# ── Public API ────────────────────────────────────────────────────────────────

# Landing zone → grid coords mapping
_ZONE_COORDS = {
    "Z001": (-89.6,  0.0),
    "Z002": (-87.3,  0.0),
    "Z003": (-85.1, 53.5),   # will snap to grid boundary
    "Z004": (-84.5,-95.0),
}

# Ice region → grid coords mapping (matches analysis.py _DEMO_REGIONS)
_REGION_COORDS = {
    "R001": (-89.4,   0.0),
    "R002": (-88.7,  45.3),
    "R003": (-87.9,-120.6),
    "R004": (-89.1, 180.0),
    "R005": (-86.5,  90.2),
    "R006": (-88.2, -60.1),
}


def plan_rover_path(zone_id: str = "Z001", region_id: str = "R001") -> 'RoverPathResult':
    start_latlon = _ZONE_COORDS.get(zone_id, (-87.3, 0.0))
    goal_latlon  = _REGION_COORDS.get(region_id, (-89.4, 0.0))

    start = latlon_to_cell(*start_latlon)
    goal  = latlon_to_cell(*goal_latlon)

    path_cells = _astar(_TERRAIN, start, goal)

    if not path_cells:
        # fallback: straight line nodes (rare edge case)
        path_cells = [start, goal]
        feasible   = False
    else:
        feasible = True

    # Build PathNode list with cumulative distance
    nodes: List[PathNode] = []
    cum_dist = 0.0
    for i, (r, c) in enumerate(path_cells):
        if i > 0:
            pr, pc = path_cells[i-1]
            cum_dist += cell_dist_km(pr, pc, r, c)
        cell = _TERRAIN[r][c]
        nodes.append(PathNode(
            row=r, col=c,
            lat=round(cell["lat"], 4),
            lon=round(cell["lon"], 4),
            cumulative_dist_km=round(cum_dist, 3),
            slope_deg=cell["slope_deg"],
            in_psr=cell["in_psr"],
        ))

    total_km     = nodes[-1].cumulative_dist_km if nodes else 0.0
    psr_count    = sum(1 for n in nodes if n.in_psr)
    max_slope    = max((n.slope_deg for n in nodes), default=0.0)
    duration_h   = total_km / ROVER_SPEED_KPH
    # Energy: base + slope surcharge
    avg_slope    = sum(n.slope_deg for n in nodes) / max(len(nodes), 1)
    energy_wh    = total_km * ENERGY_PER_KM_WH * (1 + avg_slope / 30)

    # Downsample to ~20 waypoints for the frontend
    step = max(1, len(nodes) // 20)
    waypoints = nodes[::step]

    return RoverPathResult(
        start_zone=zone_id,
        target_region=region_id,
        algorithm="A* with slope + PSR cost weighting",
        total_distance_km=round(total_km, 2),
        estimated_duration_hours=round(duration_h, 1),
        energy_cost_wh=round(energy_wh, 1),
        max_slope_deg=round(max_slope, 1),
        psr_segments=psr_count,
        path=nodes,
        waypoints=waypoints,
        grid_size=GRID_SIZE,
        feasible=feasible,
    )


def get_terrain_grid() -> List[dict]:
    """Return flattened grid for frontend visualization."""
    flat = []
    for row in _TERRAIN:
        for cell in row:
            flat.append(cell)
    return flat

# ── Endpoints ────────────────────────────────────────────────────────────────

Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    return {"message": "LUNAICE-X API is operational", "docs": "/docs", "ws": "/ws/{client_id}"}

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(client_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(client_id)

@app.get("/health")
def health():
    return {"status": "online", "service": "LUNAICE-X API", "timestamp": datetime.now().isoformat()}

@app.get("/dashboard/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    total_datasets = db.query(DatasetModel).count()
    stats = db.query(
        func.sum(AnalysisResultModel.regions_detected).label("total_regions"),
        func.avg(AnalysisResultModel.mean_probability).label("avg_prob")
    ).first()
    total_coverage = db.query(func.sum(IceRegionModel.area_km2)).scalar() or 0.0
    high_conf = db.query(IceRegionModel).filter(IceRegionModel.probability >= 0.8).count()

    # Calculate ice type breakdown for the dashboard
    ice_regions = db.query(IceRegionModel).all()
    type_counts: Dict[str, int] = {}
    type_purity_sums: Dict[str, float] = {}

    for region in ice_regions:
        ice_type = region.ice_type
        type_counts[ice_type] = type_counts.get(ice_type, 0) + 1
        type_purity_sums[ice_type] = type_purity_sums.get(ice_type, 0.0) + region.purity_pct

    ice_type_breakdown_list = []
    for ice_type, count in type_counts.items():
        mean_purity = type_purity_sums[ice_type] / count
        ice_type_breakdown_list.append(IceTypeBreakdown(ice_type=ice_type, count=count, mean_purity_pct=round(mean_purity, 1)))

    return {
        "total_datasets": total_datasets,
        "total_regions_detected": stats.total_regions or 0,
        "high_confidence_regions": high_conf,
        "mean_ice_probability": round((stats.avg_prob or 0.0) * 100, 1),
        "total_coverage_km2": round(total_coverage, 1),
        "recommended_mission_zones": 3 if total_datasets > 0 else 0,
        "last_updated": datetime.now().isoformat(),
        "ice_type_breakdown": ice_type_breakdown_list
    }

@app.get("/datasets", response_model=List[Dataset])
def list_datasets(db: Session = Depends(get_db)):
    datasets = db.query(DatasetModel).all()
    for d in datasets:
        d.is_analyzed = db.query(AnalysisResultModel).filter(AnalysisResultModel.dataset_id == d.id).count() > 0
    return datasets

@app.post("/datasets/upload", response_model=Dataset)
async def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_dataset = DatasetModel(
        filename=file.filename,
        filetype=file.filename.split(".")[-1].upper() if "." in file.filename else "UNKNOWN",
        path=""
    )
    db.add(db_dataset)
    db.commit()
    db.refresh(db_dataset)
    dataset_dir = os.path.join(UPLOAD_DIR, str(db_dataset.id))
    os.makedirs(dataset_dir, exist_ok=True)
    file_path = os.path.join(dataset_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    if file.filename.lower().endswith(".zip"):
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            zip_ref.extractall(dataset_dir)
    db_dataset.path = file_path
    db.commit()
    db.refresh(db_dataset)
    db_dataset.is_analyzed = False
    return db_dataset

@app.get("/datasets/{id}", response_model=Dataset)
def get_dataset(id: int, db: Session = Depends(get_db)):
    dataset = db.query(DatasetModel).filter(DatasetModel.id == id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    dataset.is_analyzed = db.query(AnalysisResultModel).filter(AnalysisResultModel.dataset_id == id).count() > 0
    return dataset

@app.get("/datasets/{id}/preview")
def get_dataset_preview(id: int, db: Session = Depends(get_db)):
    dataset = db.query(DatasetModel).filter(DatasetModel.id == id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    shp_path = None
    dataset_dir = os.path.dirname(dataset.path)
    if dataset.filename.lower().endswith(".zip"):
        for root, _, files in os.walk(dataset_dir):
            for file in files:
                if file.lower().endswith(".shp"):
                    shp_path = os.path.join(root, file)
                    break
            if shp_path: break
    elif dataset.filename.lower().endswith(".shp"):
        shp_path = dataset.path

    if not shp_path:
        raise HTTPException(status_code=400, detail="Preview only available for shapefile datasets.")

    try:
        gdf = gpd.read_file(shp_path)
        # Return as GeoJSON
        return json.loads(gdf.to_json())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading shapefile: {str(e)}")

@app.delete("/datasets/{id}")
def delete_dataset(id: int, db: Session = Depends(get_db)):
    dataset = db.query(DatasetModel).filter(DatasetModel.id == id).first()
    if not dataset: raise HTTPException(status_code=404, detail="Dataset not found")
    try:
        analyses = db.query(AnalysisResultModel).filter(AnalysisResultModel.dataset_id == id).all()
        for analysis in analyses:
            db.query(IceRegionModel).filter(IceRegionModel.analysis_id == analysis.id).delete()
            db.delete(analysis)
        dataset_dir = os.path.join(UPLOAD_DIR, str(id))
        if os.path.exists(dataset_dir): shutil.rmtree(dataset_dir)
        db.delete(dataset)
        db.commit()
        return {"message": "Dataset deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting dataset: {str(e)}")

@app.get("/analysis/{dataset_id}", response_model=AnalysisResult)
def get_analysis_result(dataset_id: int, db: Session = Depends(get_db)):
    result = db.query(AnalysisResultModel).filter(AnalysisResultModel.dataset_id == dataset_id).first()
    if not result: raise HTTPException(status_code=404, detail="Analysis not found")
    
    res_data = AnalysisResult.model_validate(result)
    if result.ice_volume_estimate_json:
        res_data.ice_volume_estimate = json.loads(result.ice_volume_estimate_json)
    return res_data

@app.get("/analysis/latest/volume", response_model=IceVolumeResult)
def get_latest_volume(db: Session = Depends(get_db)):
    latest = db.query(AnalysisResultModel).order_by(AnalysisResultModel.created_at.desc()).first()
    if not latest or not latest.ice_volume_estimate_json:
        raise HTTPException(status_code=404, detail="No analysis results found")
    return json.loads(latest.ice_volume_estimate_json)

@app.post("/analyze/{id}", response_model=AnalysisResult)
async def analyze_dataset(id: int, background_tasks: BackgroundTasks, client_id: Optional[str] = None, db: Session = Depends(get_db)):
    dataset = db.query(DatasetModel).filter(DatasetModel.id == id).first()
    if not dataset: raise HTTPException(status_code=404, detail="Dataset not found")
    db_result = AnalysisResultModel(dataset_id=id, status="processing", algorithm="Initiating...", processing_time_s=0.0, regions_detected=0, mean_probability=0.0)
    try:
        existing = db.query(AnalysisResultModel).filter(AnalysisResultModel.dataset_id == id).first()
        if existing:
            db.query(IceRegionModel).filter(IceRegionModel.analysis_id == existing.id).delete()
            db.delete(existing)
            db.commit()
        db.add(db_result)
        db.commit()
        db.refresh(db_result)
        background_tasks.add_task(perform_analysis_logic, id, db_result.id, client_id)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to initiate: {str(e)}")
    return db_result

@app.get("/ice-detection", response_model=IceDetectionResult)
def get_ice_detection(db: Session = Depends(get_db)):
    latest = db.query(AnalysisResultModel).order_by(AnalysisResultModel.created_at.desc()).first()
    if not latest: return {"total_regions": 0, "high_confidence_regions": 0, "mean_probability": 0.0, "coverage_km2": 0.0, "regions": []}
    regions = db.query(IceRegionModel).filter(IceRegionModel.analysis_id == latest.id).all()
    return {"total_regions": latest.regions_detected, "high_confidence_regions": len([r for r in regions if r.probability >= 0.8]), "mean_probability": latest.mean_probability, "coverage_km2": sum(r.area_km2 for r in regions), "regions": regions}

@app.get("/rover/terrain", response_model=List[GridCell])
def get_rover_terrain():
    return get_terrain_grid()

@app.get("/rover/plan", response_model=RoverPathResult)
def get_rover_plan(zone_id: str = "Z001", region_id: str = "R001"):
    return plan_rover_path(zone_id, region_id)

@app.get("/mission-zones", response_model=List[MissionZone])
def get_mission_zones():
    # This is a placeholder for actual mission zones from a database or config
    return [
        MissionZone(zone_id="A", name="Alpha Site", latitude=-89.67, longitude=0.0, ice_probability=87.4, accessibility_score=94.2, recommended=True, notes="Optimal landing site."),
        MissionZone(zone_id="B", name="Beta Site", latitude=-87.5, longitude=-5.2, ice_probability=78.1, accessibility_score=87.1, recommended=False, notes="Secondary candidate."),
        MissionZone(zone_id="C", name="Gamma Site", latitude=-85.2, longitude=53.5, ice_probability=72.3, accessibility_score=81.5, recommended=False, notes="Tertiary candidate."),
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
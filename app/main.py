
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routes import upload, datasets, detect

Base.metadata.create_all(bind=engine)

app = FastAPI(title="LUNAICE-X Scientific Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api")
app.include_router(datasets.router, prefix="/api")
app.include_router(detect.router, prefix="/api")

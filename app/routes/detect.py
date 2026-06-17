
from fastapi import APIRouter
router=APIRouter()
@router.post('/detect')
def detect():
    return {'status':'wire this endpoint to uploaded rasters and model inference'}

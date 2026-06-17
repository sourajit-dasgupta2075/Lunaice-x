
from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Dataset
router=APIRouter()
@router.get('/datasets')
def datasets(db:Session=Depends(get_db)):
    return db.query(Dataset).all()

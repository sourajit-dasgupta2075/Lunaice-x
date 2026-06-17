
from fastapi import APIRouter,UploadFile,File,Depends
from sqlalchemy.orm import Session
from pathlib import Path
from app.database import get_db
from app.models import Dataset
router=APIRouter()
u=Path('data/uploads');u.mkdir(parents=True,exist_ok=True)
@router.post('/upload')
async def upload(file:UploadFile=File(...),db:Session=Depends(get_db)):
    p=u/file.filename
    p.write_bytes(await file.read())
    d=Dataset(filename=file.filename,filetype=file.filename.split('.')[-1],path=str(p))
    db.add(d);db.commit();db.refresh(d)
    return {'id':d.id,'filename':d.filename}


from sqlalchemy import Column,Integer,String,DateTime
from datetime import datetime
from app.database import Base
class Dataset(Base):
    __tablename__='datasets'
    id=Column(Integer,primary_key=True,index=True)
    filename=Column(String)
    filetype=Column(String)
    path=Column(String)
    uploaded_at=Column(DateTime,default=datetime.utcnow)

from pydantic import BaseModel

class DatasetOut(BaseModel):
    id:int
    filename:str
    filetype:str

    class Config:
        from_attributes=True

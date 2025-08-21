from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, date, time

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Helper functions for MongoDB date handling
def prepare_for_mongo(data):
    if isinstance(data.get('date'), date):
        data['date'] = data['date'].isoformat()
    if isinstance(data.get('time'), time):
        data['time'] = data['time'].strftime('%H:%M:%S')
    return data

def parse_from_mongo(item):
    # Keep dates as strings since Pydantic models expect string dates
    # Only convert if we need time objects (which we don't currently use)
    return item

# Define Models
class Show(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    date: Optional[str] = None
    venue: Optional[str] = None
    description: Optional[str] = None
    total_duration: Optional[int] = 0  # in minutes
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShowCreate(BaseModel):
    title: str
    date: Optional[str] = None
    venue: Optional[str] = None
    description: Optional[str] = None

class CircusAct(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    show_id: str
    name: str
    performers: Optional[str] = None
    duration: int  # in minutes
    sequence_order: int
    description: Optional[str] = None
    staging_notes: Optional[str] = None
    sound_requirements: Optional[str] = None
    lighting_requirements: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CircusActCreate(BaseModel):
    show_id: str
    name: str
    performers: Optional[str] = None
    duration: int
    sequence_order: int
    description: Optional[str] = None
    staging_notes: Optional[str] = None
    sound_requirements: Optional[str] = None
    lighting_requirements: Optional[str] = None

class CircusActUpdate(BaseModel):
    name: Optional[str] = None
    performers: Optional[str] = None
    duration: Optional[int] = None
    sequence_order: Optional[int] = None
    description: Optional[str] = None
    staging_notes: Optional[str] = None
    sound_requirements: Optional[str] = None
    lighting_requirements: Optional[str] = None

class Expense(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    show_id: str
    act_id: Optional[str] = None
    category: str  # e.g., "performer_fee", "equipment", "venue", "travel"
    amount: float
    description: str
    date: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenseCreate(BaseModel):
    show_id: str
    act_id: Optional[str] = None
    category: str
    amount: float
    description: str
    date: Optional[str] = None

class ActReorderRequest(BaseModel):
    act_updates: List[dict]  # [{"id": "act_id", "sequence_order": 1}, ...]

# Show endpoints
@api_router.get("/")
async def root():
    return {"message": "Circus Show Management API"}

@api_router.post("/shows", response_model=Show)
async def create_show(show_data: ShowCreate):
    show_dict = show_data.dict()
    show_obj = Show(**show_dict)
    show_mongo = prepare_for_mongo(show_obj.dict())
    await db.shows.insert_one(show_mongo)
    return show_obj

@api_router.get("/shows", response_model=List[Show])
async def get_shows():
    shows = await db.shows.find().sort("created_at", -1).to_list(1000)
    return [Show(**parse_from_mongo(show)) for show in shows]

@api_router.get("/shows/{show_id}", response_model=Show)
async def get_show(show_id: str):
    show = await db.shows.find_one({"id": show_id})
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    return Show(**parse_from_mongo(show))

@api_router.put("/shows/{show_id}", response_model=Show)
async def update_show(show_id: str, show_data: ShowCreate):
    show = await db.shows.find_one({"id": show_id})
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    
    update_data = {k: v for k, v in show_data.dict().items() if v is not None}
    update_data = prepare_for_mongo(update_data)
    
    await db.shows.update_one({"id": show_id}, {"$set": update_data})
    updated_show = await db.shows.find_one({"id": show_id})
    return Show(**parse_from_mongo(updated_show))

@api_router.delete("/shows/{show_id}")
async def delete_show(show_id: str):
    result = await db.shows.delete_one({"id": show_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Show not found")
    
    # Also delete related acts and expenses
    await db.circus_acts.delete_many({"show_id": show_id})
    await db.expenses.delete_many({"show_id": show_id})
    
    return {"message": "Show deleted successfully"}

# Circus Act endpoints
@api_router.post("/acts", response_model=CircusAct)
async def create_act(act_data: CircusActCreate):
    # Check if show exists
    show = await db.shows.find_one({"id": act_data.show_id})
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    
    act_dict = act_data.dict()
    act_obj = CircusAct(**act_dict)
    act_mongo = prepare_for_mongo(act_obj.dict())
    await db.circus_acts.insert_one(act_mongo)
    return act_obj

@api_router.get("/acts/show/{show_id}", response_model=List[CircusAct])
async def get_acts_by_show(show_id: str):
    acts = await db.circus_acts.find({"show_id": show_id}).sort("sequence_order", 1).to_list(1000)
    return [CircusAct(**parse_from_mongo(act)) for act in acts]

@api_router.get("/acts/{act_id}", response_model=CircusAct)
async def get_act(act_id: str):
    act = await db.circus_acts.find_one({"id": act_id})
    if not act:
        raise HTTPException(status_code=404, detail="Act not found")
    return CircusAct(**parse_from_mongo(act))

@api_router.put("/acts/{act_id}", response_model=CircusAct)
async def update_act(act_id: str, act_data: CircusActUpdate):
    act = await db.circus_acts.find_one({"id": act_id})
    if not act:
        raise HTTPException(status_code=404, detail="Act not found")
    
    update_data = {k: v for k, v in act_data.dict().items() if v is not None}
    update_data = prepare_for_mongo(update_data)
    
    await db.circus_acts.update_one({"id": act_id}, {"$set": update_data})
    updated_act = await db.circus_acts.find_one({"id": act_id})
    return CircusAct(**parse_from_mongo(updated_act))

@api_router.delete("/acts/{act_id}")
async def delete_act(act_id: str):
    result = await db.circus_acts.delete_one({"id": act_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Act not found")
    
    # Also delete related expenses
    await db.expenses.delete_many({"act_id": act_id})
    
    return {"message": "Act deleted successfully"}

@api_router.put("/acts/reorder")
async def reorder_acts(reorder_data: ActReorderRequest):
    for act_update in reorder_data.act_updates:
        await db.circus_acts.update_one(
            {"id": act_update["id"]}, 
            {"$set": {"sequence_order": act_update["sequence_order"]}}
        )
    return {"message": "Acts reordered successfully"}

# Expense endpoints
@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense_data: ExpenseCreate):
    # Check if show exists
    show = await db.shows.find_one({"id": expense_data.show_id})
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    
    expense_dict = expense_data.dict()
    expense_obj = Expense(**expense_dict)
    expense_mongo = prepare_for_mongo(expense_obj.dict())
    await db.expenses.insert_one(expense_mongo)
    return expense_obj

@api_router.get("/expenses/show/{show_id}", response_model=List[Expense])
async def get_expenses_by_show(show_id: str):
    expenses = await db.expenses.find({"show_id": show_id}).sort("created_at", -1).to_list(1000)
    return [Expense(**parse_from_mongo(expense)) for expense in expenses]

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted successfully"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
import os
import sys
import urllib.request
import urllib.parse
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException, Request, APIRouter, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import httpx
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
import jwt
from database import DatabaseManager
import os
import random
from datetime import datetime, timedelta

DB_PATH = os.getenv("DATABASE_URL", "/data/performance_hq.db")
db = DatabaseManager(db_name=DB_PATH)

app = FastAPI(title="Performance HQ API")

@app.get("/api/testdata")
def run_test_data():
    exercises = db.get_all_exercises()
    workouts = db.get_all_workouts()
    if not exercises or not workouts:
        return {"status": "error", "message": "Add exercises and workouts first"}
    today = datetime.now().date()
    
    current = today - timedelta(days=60)
    logs_added = 0
    while current <= today:
        if random.random() < 0.6: 
            workout = random.choice(workouts)
            db.conn.execute(
                "INSERT INTO calendar_events (event_type, title, event_date, start_time, duration_mins, is_completed, ref_workout_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ('Training', workout['name'], current.isoformat(), '17:00', 60, 1, workout['id'], datetime.now().isoformat())
            )
            we_list = db.conn.execute("SELECT * FROM workout_exercises WHERE workout_id = ?", (workout["id"],)).fetchall()
            for we in we_list:
                db.log_lift(we["exercise_id"], f"{random.randint(40, 220)},{random.randint(40, 220)},{random.randint(40, 220)}", 3, we["reps"] or 10, current.isoformat())
                logs_added += 1
        current += timedelta(days=1)
    db.conn.commit()
        
    current = today - timedelta(days=60)
    nut_added = 0
    while current <= today:
        if random.random() < 0.9:
            db.log_daily_nutrition(current.isoformat(), random.randint(2200, 3200), random.randint(130, 210), random.randint(200, 350), random.randint(60, 110))
            nut_added += 1
        current += timedelta(days=1)
        
    return {"status": "success", "lifts": logs_added, "nutrition": nut_added}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

APP_PASSWORD = os.getenv("APP_PASSWORD")
JWT_SECRET = os.getenv("JWT_SECRET", "default_secret_key_change_me")

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # Allow OPTIONS for CORS
    if request.method == "OPTIONS":
        return await call_next(request)
        
    # Skip auth if no password configured
    if not APP_PASSWORD:
        return await call_next(request)
        
    # We only enforce auth on /api/ endpoints (excluding login)
    path = request.url.path
    if not path.startswith("/api/") or path == "/api/auth/login":
        return await call_next(request)
        
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return JSONResponse(status_code=401, content={"detail": "Missing token"})
        
    token = auth_header.split(" ")[1]
    if token == "no_auth_required":
        return await call_next(request)
        
    try:
        jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return JSONResponse(status_code=401, content={"detail": "Invalid token"})
        
    return await call_next(request)

api_router = APIRouter()

class LoginRequest(BaseModel):
    password: str

@api_router.post("/auth/login")
def login(data: LoginRequest):
    if not APP_PASSWORD:
        return {"token": "no_auth_required"}
    if data.password == APP_PASSWORD:
        token = jwt.encode({"auth": True}, JWT_SECRET, algorithm="HS256")
        return {"token": token}
    raise HTTPException(status_code=401, detail="Invalid password")


class IngredientBase(BaseModel):
    name: str
    kcal_per_100g: float
    cost_per_100g: float
    category: Optional[str] = None
    in_inventory: Optional[int] = 0

class IngredientInventoryToggle(BaseModel):
    in_inventory: int

class ExerciseBase(BaseModel):
    name: str
    category: Optional[str] = None
    one_rm: Optional[float] = None

class RecipeIngredientItem(BaseModel):
    ingredient_id: int
    quantity_g: float

class RecipeCreate(BaseModel):
    name: str
    ingredient_list: List[RecipeIngredientItem]
    time_to_cook_mins: Optional[int] = 0
    servings: Optional[int] = 1
    instructions: Optional[str] = None
    tags: Optional[str] = None
    meal_type: Optional[str] = 'supper'

class WeeklyTemplateBlockCreate(BaseModel):
    day_of_week: str
    title: str
    event_type: str
    start_time: Optional[str] = "08:00"
    duration_mins: Optional[int] = 60
    meal_slot_type: Optional[str] = None
    notes: Optional[str] = None
    ref_workout_id: Optional[int] = None
    location: Optional[str] = None
    location_type: Optional[str] = None
    commute_to_mins: Optional[int] = None
    commute_from_mins: Optional[int] = None

class ApplyTemplateRequest(BaseModel):
    week_start_date: str

class WorkoutExerciseItem(BaseModel):
    exercise_id: int
    sets: Optional[int] = None
    reps: Optional[int] = None
    weight: Optional[str] = None

class WorkoutCreate(BaseModel):
    name: str
    exercise_list: List[WorkoutExerciseItem]
    duration_mins: Optional[int] = None
    location_type: Optional[str] = 'gym'

class SettingsUpdate(BaseModel):
    settings: dict

class GroceryListCreate(BaseModel):
    week_label: str
    items_json: str

class GroceryListUpdate(BaseModel):
    items_json: Optional[str] = None
    status: Optional[str] = None

class CommuteEstimateRequest(BaseModel):
    origin: str
    destination: str
    mode: Optional[str] = "walk"

class CalendarEventCreate(BaseModel):
    title: str
    event_type: str
    event_date: str
    start_time: Optional[str] = None
    duration_mins: Optional[int] = None
    ref_workout_id: Optional[int] = None
    ref_recipe_id: Optional[int] = None
    notes: Optional[str] = None
    location_type: Optional[str] = None
    is_completed: Optional[bool] = False
    add_commute: Optional[bool] = False
    commute_mode: Optional[str] = "drive"


class LiftLogCreate(BaseModel):
    exercise_id: int
    weight: str
    sets: Optional[int] = None
    reps: Optional[int] = None
    log_date: Optional[str] = None

class LiftLogUpdate(BaseModel):
    weight: str
    sets: Optional[int] = None
    reps: Optional[int] = None

class NutritionLogCreate(BaseModel):
    kcal: float
    cost: Optional[float] = None
    log_date: Optional[str] = None

@app.on_event("shutdown")
def shutdown_event():
    db.close()

@api_router.get("/health")
def health():
    return {"status": "ok"}

# ------------------------------------------------------------------
# Ingredients
# ------------------------------------------------------------------
@api_router.get("/ingredients")
def list_ingredients():
    return db.get_all_ingredients()

@api_router.get("/ingredients/search")
def search_ingredients(q: str):
    return db.search_ingredients(q)

@api_router.get("/ingredients/{ingredient_id}")
def get_ingredient(ingredient_id: int):
    ingredient = db.get_ingredient(ingredient_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return ingredient

@api_router.post("/ingredients")
def create_ingredient(data: IngredientBase):
    ingredient_id = db.add_ingredient(data.name, data.kcal_per_100g, data.cost_per_100g, data.category, data.in_inventory)
    return {"id": ingredient_id}

@api_router.put("/ingredients/{ingredient_id}")
def update_ingredient(ingredient_id: int, data: IngredientBase):
    if not db.get_ingredient(ingredient_id):
        raise HTTPException(status_code=404, detail="Ingredient not found")
    db.update_ingredient(ingredient_id, data.name, data.kcal_per_100g, data.cost_per_100g, data.category, data.in_inventory)
    return {"id": ingredient_id}

@api_router.patch("/ingredients/{ingredient_id}/inventory")
def toggle_ingredient_inventory(ingredient_id: int, data: IngredientInventoryToggle):
    if not db.get_ingredient(ingredient_id):
        raise HTTPException(status_code=404, detail="Ingredient not found")
    db.toggle_ingredient_inventory(ingredient_id, data.in_inventory)
    return {"id": ingredient_id, "in_inventory": data.in_inventory}

@api_router.delete("/ingredients/{ingredient_id}")
def delete_ingredient(ingredient_id: int):
    db.delete_ingredient(ingredient_id)
    return {"status": "deleted"}

# ------------------------------------------------------------------
# Exercises
# ------------------------------------------------------------------
@api_router.get("/exercises")
def list_exercises():
    return db.get_all_exercises()

@api_router.get("/exercises/search")
def search_exercises(q: str):
    return db.search_exercises(q)

@api_router.get("/exercises/{exercise_id}")
def get_exercise(exercise_id: int):
    exercise = db.get_exercise(exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise

@api_router.post("/exercises")
def create_exercise(data: ExerciseBase):
    exercise_id = db.add_exercise(data.name, data.category, data.one_rm)
    return {"id": exercise_id}

@api_router.put("/exercises/{exercise_id}")
def update_exercise(exercise_id: int, data: ExerciseBase):
    if not db.get_exercise(exercise_id):
        raise HTTPException(status_code=404, detail="Exercise not found")
    db.update_exercise(exercise_id, data.name, data.category, data.one_rm)
    return {"id": exercise_id}

@api_router.delete("/exercises/{exercise_id}")
def delete_exercise(exercise_id: int):
    if not db.get_exercise(exercise_id):
        raise HTTPException(status_code=404, detail="Exercise not found")
    db.delete_exercise(exercise_id)
    return {"status": "deleted"}

# ------------------------------------------------------------------
# Recipes
# ------------------------------------------------------------------
@api_router.get("/recipes")
def list_recipes():
    return db.get_all_recipes()

@api_router.get("/recipes/search")
def search_recipes(q: str):
    return db.search_recipes(q)

@api_router.get("/recipes/{recipe_id}")
def get_recipe(recipe_id: int):
    recipe = db.get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe

@api_router.get("/recipes/{recipe_id}/ingredients")
def get_recipe_ingredients(recipe_id: int):
    if not db.get_recipe(recipe_id):
        raise HTTPException(status_code=404, detail="Recipe not found")
    return db.get_recipe_ingredients(recipe_id)

@api_router.post("/recipes")
def create_recipe(data: RecipeCreate):
    recipe_id = db.add_recipe(
        data.name,
        [item.model_dump() for item in data.ingredient_list],
        time_to_cook_mins=data.time_to_cook_mins,
        servings=data.servings,
        instructions=data.instructions,
        tags=data.tags,
        meal_type=data.meal_type,
    )
    return {"id": recipe_id}

@api_router.put("/recipes/{recipe_id}")
def update_recipe(recipe_id: int, data: RecipeCreate):
    if not db.get_recipe(recipe_id):
        raise HTTPException(status_code=404, detail="Recipe not found")
    db.update_recipe(
        recipe_id,
        data.name,
        [item.model_dump() for item in data.ingredient_list],
        time_to_cook_mins=data.time_to_cook_mins,
        servings=data.servings,
        instructions=data.instructions,
        tags=data.tags,
        meal_type=data.meal_type,
    )
    return {"id": recipe_id}

@api_router.delete("/recipes/{recipe_id}")
def delete_recipe(recipe_id: int):
    if not db.get_recipe(recipe_id):
        raise HTTPException(status_code=404, detail="Recipe not found")
    db.delete_recipe(recipe_id)
    return {"status": "deleted"}

@api_router.get("/grocery-list")
def get_grocery_list(start_date: str, end_date: str):
    return db.get_grocery_list(start_date, end_date)

# ------------------------------------------------------------------
# Workouts
# ------------------------------------------------------------------
@api_router.get("/workouts")
def list_workouts():
    return db.get_all_workouts()

@api_router.get("/workouts/search")
def search_workouts(q: str):
    return db.search_workouts(q)

@api_router.get("/workouts/{workout_id}")
def get_workout(workout_id: int):
    workout = db.get_workout(workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    return workout

@api_router.get("/workouts/{workout_id}/exercises")
def get_workout_exercises(workout_id: int):
    if not db.get_workout(workout_id):
        raise HTTPException(status_code=404, detail="Workout not found")
    return db.get_workout_exercises(workout_id)

@api_router.post("/workouts")
def create_workout(data: WorkoutCreate):
    workout_id = db.add_workout(
        data.name,
        [item.model_dump() for item in data.exercise_list],
        duration_mins=data.duration_mins,
        location_type=data.location_type,
    )
    return {"id": workout_id}

@api_router.put("/workouts/{workout_id}")
def update_workout(workout_id: int, data: WorkoutCreate):
    if not db.get_workout(workout_id):
        raise HTTPException(status_code=404, detail="Workout not found")
    db.update_workout(
        workout_id,
        data.name,
        [item.model_dump() for item in data.exercise_list],
        duration_mins=data.duration_mins,
        location_type=data.location_type,
    )
    return {"id": workout_id}

@api_router.delete("/workouts/{workout_id}")
def delete_workout(workout_id: int):
    if not db.get_workout(workout_id):
        raise HTTPException(status_code=404, detail="Workout not found")
    db.delete_workout(workout_id)
    return {"status": "deleted"}

# ------------------------------------------------------------------
# Settings & Grocery Lists
# ------------------------------------------------------------------
@api_router.get("/settings")
def get_user_settings():
    return db.get_user_settings()

async def recalculate_distance_matrix(settings_dict: dict):
    api_key = os.getenv("GEOAPIFY_API_KEY")
    if not api_key:
        return
    
    # 1. Collect all non-empty coordinates
    coords = set()
    for key in ['home_coords', 'work_coords', 'gym_coords', 'field_coords']:
        if settings_dict.get(key):
            coords.add(settings_dict[key])
    
    # Custom locations
    try:
        custom = json.loads(settings_dict.get('custom_locations', '[]'))
        for c in custom:
            if c.get('lat') and c.get('lon'):
                coords.add(f"{c['lat']},{c['lon']}")
    except:
        pass
        
    coords = list(coords)
    if len(coords) < 2:
        return
        
    # Prepare points for Geoapify: it expects [lon, lat]
    locations = []
    for c in coords:
        parts = c.split(',')
        if len(parts) == 2:
            lat, lon = parts
            locations.append({"location": [float(lon), float(lat)]})
        
    if not locations:
        return
        
    modes = ['drive', 'transit', 'walk', 'bicycle']
    matrix_result = {}
    
    async with httpx.AsyncClient() as client:
        for mode in modes:
            body = {
                "mode": mode,
                "sources": locations,
                "targets": locations
            }
            try:
                resp = await client.post(
                    f"https://api.geoapify.com/v1/routematrix?apiKey={api_key}",
                    json=body
                )
                if resp.status_code == 200:
                    data = resp.json()
                    mode_matrix = {}
                    stt = data.get("sources_to_targets", [])
                    for i, source in enumerate(coords):
                        mode_matrix[source] = {}
                        if i < len(stt):
                            for j, target in enumerate(coords):
                                if j < len(stt[i]):
                                    info = stt[i][j]
                                    if info is not None:
                                        mode_matrix[source][target] = info.get("time")
                    matrix_result[mode] = mode_matrix
            except Exception as e:
                print("Geoapify Error:", e)
                
    if matrix_result:
        db.update_user_settings({"distance_matrix": json.dumps(matrix_result)})

@api_router.post("/settings")
def update_user_settings(data: SettingsUpdate, background_tasks: BackgroundTasks):
    db.update_user_settings(data.settings)
    background_tasks.add_task(recalculate_distance_matrix, data.settings)
    return {"status": "updated"}



@api_router.post("/grocery-lists")
def create_grocery_list(data: GroceryListCreate):
    list_id = db.add_grocery_list(data.week_label, data.items_json)
    return {"id": list_id}

@api_router.get("/grocery-lists")
def get_all_grocery_lists():
    lists = db.get_all_grocery_lists()
    return {"lists": lists}

@api_router.get("/grocery-lists/active")
def get_active_grocery_list():
    active_list = db.get_active_grocery_list()
    if not active_list:
        return {"active_list": None}
    return {"active_list": active_list}

@api_router.put("/grocery-lists/{list_id}")
def update_grocery_list(list_id: int, data: GroceryListUpdate):
    db.update_grocery_list(list_id, items_json=data.items_json, status=data.status)
    return {"id": list_id}

@api_router.delete("/grocery-lists/{list_id}")
def delete_grocery_list(list_id: int):
    db.delete_grocery_list(list_id)
    return {"status": "deleted"}

# ------------------------------------------------------------------
# Calendar
# ------------------------------------------------------------------
@api_router.get("/calendar")
def list_calendar(start_date: str, end_date: str):
    return db.get_events_for_range(start_date, end_date)

@api_router.get("/calendar/day")
def list_calendar_day(day: str):
    return db.get_events_for_day(day)

@api_router.get("/calendar/{event_id}")
def get_calendar_event(event_id: int):
    event = db.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

def parse_time(time_str):
    if not time_str:
        return None
    return datetime.strptime(time_str, "%H:%M")

def get_commute_time(from_coords, to_coords, mode, matrix_json):
    if not matrix_json or not from_coords or not to_coords: return 20
    try:
        matrix = json.loads(matrix_json)
        # Geoapify route matrix times are in seconds
        return int(matrix.get(mode, {}).get(from_coords, {}).get(to_coords, 1200) / 60)
    except:
        return 20

def generate_commutes(data, settings, events_today):
    mapping = {}
    for prefix in ['home', 'work', 'gym', 'field']:
        addr = settings.get(f"{prefix}_address")
        coords = settings.get(f"{prefix}_coords")
        if addr and coords:
            mapping[addr] = coords
    try:
        custom = json.loads(settings.get('custom_locations', '[]'))
        for c in custom:
            if c.get('lat') and c.get('lon'):
                mapping[c.get('address') or c.get('name')] = f"{c['lat']},{c['lon']}"
    except:
        pass

    home_addr = settings.get('home_address', 'Home')
    this_addr = data.location_type or home_addr
    this_coords = mapping.get(this_addr, mapping.get(home_addr))

    if not data.start_time or not data.duration_mins or not this_coords:
        return []

    new_start = parse_time(data.start_time)
    new_end = new_start + timedelta(minutes=data.duration_mins)

    preceding = None
    succeeding = None

    for ev in events_today:
        if not ev.get('start_time') or not ev.get('duration_mins') or ev.get('id') == -1:
            continue
        ev_start = parse_time(ev['start_time'])
        ev_end = ev_start + timedelta(minutes=ev['duration_mins'])

        if ev_end <= new_start:
            if not preceding or ev_end > (parse_time(preceding['start_time']) + timedelta(minutes=preceding['duration_mins'])):
                preceding = ev
        if ev_start >= new_end:
            if not succeeding or ev_start < parse_time(succeeding['start_time']):
                succeeding = ev

    # Check gap before
    from_addr = home_addr
    if preceding:
        p_end = parse_time(preceding['start_time']) + timedelta(minutes=preceding['duration_mins'])
        if (new_start - p_end).total_seconds() <= 1800:
            from_addr = preceding.get('location_type') or home_addr

    # Check gap after
    to_addr = home_addr
    if succeeding:
        s_start = parse_time(succeeding['start_time'])
        if (s_start - new_end).total_seconds() <= 1800:
            to_addr = succeeding.get('location_type') or home_addr

    from_coords = mapping.get(from_addr, mapping.get(home_addr))
    to_coords = mapping.get(to_addr, mapping.get(home_addr))

    commute_to_mins = get_commute_time(from_coords, this_coords, data.commute_mode, settings.get('distance_matrix'))
    commute_from_mins = get_commute_time(this_coords, to_coords, data.commute_mode, settings.get('distance_matrix'))

    commutes = []
    if commute_to_mins > 0 and from_coords != this_coords:
        commutes.append({
            "title": f"Commute to {this_addr.split(',')[0]}",
            "start_time": (new_start - timedelta(minutes=commute_to_mins)).strftime("%H:%M"),
            "duration_mins": commute_to_mins,
            "location_type": this_addr
        })
    if commute_from_mins > 0 and this_coords != to_coords:
        commutes.append({
            "title": f"Commute from {this_addr.split(',')[0]}",
            "start_time": new_end.strftime("%H:%M"),
            "duration_mins": commute_from_mins,
            "location_type": to_addr
        })
    return commutes

@api_router.post("/calendar")
def create_calendar_event(data: CalendarEventCreate):
    event_id = db.add_calendar_event(
        data.title,
        data.event_type,
        data.event_date,
        data.start_time,
        data.duration_mins,
        data.ref_workout_id,
        data.ref_recipe_id,
        data.notes,
        data.location_type,
        data.is_completed,
    )
    
    if data.add_commute:
        settings = db.get_user_settings()
        events_today = db.get_events_for_day(data.event_date)
        commutes = generate_commutes(data, settings, events_today)
        for c in commutes:
            db.add_calendar_event(
                title=c['title'],
                event_type='Commute',
                event_date=data.event_date,
                start_time=c['start_time'],
                duration_mins=c['duration_mins'],
                ref_workout_id=None,
                ref_recipe_id=None,
                notes=None,
                location_type=c['location_type'],
                is_completed=False
            )
            
    return {"id": event_id}

@api_router.put("/calendar/{event_id}")
def update_calendar_event(event_id: int, data: CalendarEventCreate):
    db.update_calendar_event(
        event_id,
        title=data.title,
        event_type=data.event_type,
        event_date=data.event_date,
        start_time=data.start_time,
        duration_mins=data.duration_mins,
        ref_workout_id=data.ref_workout_id,
        ref_recipe_id=data.ref_recipe_id,
        notes=data.notes,
        location_type=data.location_type,
        is_completed=data.is_completed,
    )
    
    if data.add_commute:
        settings = db.get_user_settings()
        events_today = db.get_events_for_day(data.event_date)
        commutes = generate_commutes(data, settings, events_today)
        for c in commutes:
            db.add_calendar_event(
                title=c['title'],
                event_type='Commute',
                event_date=data.event_date,
                start_time=c['start_time'],
                duration_mins=c['duration_mins'],
                ref_workout_id=None,
                ref_recipe_id=None,
                notes=None,
                location_type=c['location_type'],
                is_completed=False
            )
            
    return {"id": event_id}

@api_router.delete("/calendar/{event_id}")
def delete_calendar_event(event_id: int):
    db.delete_calendar_event(event_id)
    return {"status": "deleted"}

# ------------------------------------------------------------------
# Weekly Schedule Template
# ------------------------------------------------------------------
@api_router.get("/schedule/template")
def get_schedule_template():
    return db.get_weekly_schedule_template()

@api_router.post("/schedule/template")
def create_schedule_template_block(data: WeeklyTemplateBlockCreate):
    block_id = db.add_weekly_template_block(
        day_of_week=data.day_of_week,
        title=data.title,
        event_type=data.event_type,
        start_time=data.start_time,
        duration_mins=data.duration_mins,
        meal_slot_type=data.meal_slot_type,
        notes=data.notes,
        ref_workout_id=data.ref_workout_id,
        location=data.location,
        location_type=data.location_type,
        commute_to_mins=data.commute_to_mins,
        commute_from_mins=data.commute_from_mins
    )
    return {"id": block_id}

@api_router.delete("/schedule/template/{block_id}")
def delete_schedule_template_block(block_id: int):
    db.delete_weekly_template_block(block_id)
    return {"status": "deleted"}

@api_router.post("/schedule/template/apply")
def apply_schedule_template(data: ApplyTemplateRequest):
    count = db.apply_template_to_week(data.week_start_date)
    return {"applied_count": count}

# ------------------------------------------------------------------
# Logs
# ------------------------------------------------------------------
@api_router.get("/logs/lifts")
def list_lift_logs(exercise_id: Optional[int] = None, log_date: Optional[str] = None):
    return db.get_lift_history(exercise_id=exercise_id, log_date=log_date)

@api_router.post("/logs/lifts")
def create_lift_log(data: LiftLogCreate):
    log_id = db.log_lift(
        data.exercise_id,
        data.weight,
        data.sets,
        data.reps,
        data.log_date,
    )
    return {"id": log_id}

@api_router.put("/logs/lifts/{log_id}")
def update_lift_log(log_id: int, data: LiftLogUpdate):
    db.update_lift_log(
        log_id,
        data.weight,
        data.sets,
        data.reps,
    )
    return {"status": "updated"}

@api_router.delete("/logs/lifts/{log_id}")
def delete_lift_log(log_id: int):
    db.delete_lift_log(log_id)
    return {"status": "deleted"}

@api_router.get("/logs/nutrition")
def list_nutrition_logs(date: Optional[str] = None):
    return db.get_nutrition_history()

@api_router.post("/logs/nutrition")
def create_nutrition_log(data: NutritionLogCreate):
    log_id = db.log_nutrition(
        data.kcal,
        data.cost,
        data.log_date,
    )
    return {"id": log_id}

@api_router.delete("/logs/nutrition/{log_id}")
def delete_nutrition_log(log_id: int):
    db.delete_nutrition_log(log_id)
    return {"status": "deleted"}

# Include the API router
app.include_router(api_router, prefix="/api")

# Serve the static React build at root. This must be at the very bottom!
build_dir = "/app/frontend/build"
if os.path.isdir(build_dir):
    app.mount("/", StaticFiles(directory=build_dir, html=True), name="static")
else:
    @app.get("/")
    def no_frontend():
        return {"message": "Frontend build not found. Running in API-only mode."}

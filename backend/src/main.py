import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

from database import DatabaseManager

app = FastAPI(title="Performance HQ API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.getenv("DATABASE_URL", "/data/performance_hq.db")
db = DatabaseManager(db_name=DB_PATH)

class IngredientBase(BaseModel):
    name: str
    kcal_per_100g: float
    cost_per_100g: float
    category: Optional[str] = None

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

class WorkoutExerciseItem(BaseModel):
    exercise_id: int
    sets: Optional[int] = None
    reps: Optional[int] = None
    weight: Optional[str] = None

class WorkoutCreate(BaseModel):
    name: str
    exercise_list: List[WorkoutExerciseItem]
    duration_mins: Optional[int] = None

class CalendarEventCreate(BaseModel):
    title: str
    event_type: str
    event_date: str
    start_time: Optional[str] = None
    duration_mins: Optional[int] = None
    ref_workout_id: Optional[int] = None
    ref_recipe_id: Optional[int] = None
    notes: Optional[str] = None

class BodyweightLogCreate(BaseModel):
    weight_lbs: float
    log_date: Optional[str] = None
    bodyfat_pct: Optional[float] = None

class LiftLogCreate(BaseModel):
    exercise_id: int
    weight: str
    sets: Optional[int] = None
    reps: Optional[int] = None
    log_date: Optional[str] = None

class NutritionLogCreate(BaseModel):
    kcal: float
    cost: Optional[float] = None
    log_date: Optional[str] = None

@app.on_event("shutdown")
def shutdown_event():
    db.close()

@app.get("/health")
def health():
    return {"status": "ok"}

# ------------------------------------------------------------------
# Ingredients
# ------------------------------------------------------------------
@app.get("/ingredients")
def list_ingredients():
    return db.get_all_ingredients()

@app.get("/ingredients/search")
def search_ingredients(q: str):
    return db.search_ingredients(q)

@app.get("/ingredients/{ingredient_id}")
def get_ingredient(ingredient_id: int):
    ingredient = db.get_ingredient(ingredient_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return ingredient

@app.post("/ingredients")
def create_ingredient(data: IngredientBase):
    ingredient_id = db.add_ingredient(data.name, data.kcal_per_100g, data.cost_per_100g, data.category)
    return {"id": ingredient_id}

@app.put("/ingredients/{ingredient_id}")
def update_ingredient(ingredient_id: int, data: IngredientBase):
    if not db.get_ingredient(ingredient_id):
        raise HTTPException(status_code=404, detail="Ingredient not found")
    db.update_ingredient(ingredient_id, data.name, data.kcal_per_100g, data.cost_per_100g, data.category)
    return {"id": ingredient_id}

@app.delete("/ingredients/{ingredient_id}")
def delete_ingredient(ingredient_id: int):
    db.delete_ingredient(ingredient_id)
    return {"status": "deleted"}

# ------------------------------------------------------------------
# Exercises
# ------------------------------------------------------------------
@app.get("/exercises")
def list_exercises():
    return db.get_all_exercises()

@app.get("/exercises/search")
def search_exercises(q: str):
    return db.search_exercises(q)

@app.get("/exercises/{exercise_id}")
def get_exercise(exercise_id: int):
    exercise = db.get_exercise(exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise

@app.post("/exercises")
def create_exercise(data: ExerciseBase):
    exercise_id = db.add_exercise(data.name, data.category, data.one_rm)
    return {"id": exercise_id}

@app.put("/exercises/{exercise_id}")
def update_exercise(exercise_id: int, data: ExerciseBase):
    if not db.get_exercise(exercise_id):
        raise HTTPException(status_code=404, detail="Exercise not found")
    db.update_exercise(exercise_id, data.name, data.category, data.one_rm)
    return {"id": exercise_id}

@app.delete("/exercises/{exercise_id}")
def delete_exercise(exercise_id: int):
    if not db.get_exercise(exercise_id):
        raise HTTPException(status_code=404, detail="Exercise not found")
    db.delete_exercise(exercise_id)
    return {"status": "deleted"}

# ------------------------------------------------------------------
# Recipes
# ------------------------------------------------------------------
@app.get("/recipes")
def list_recipes():
    return db.get_all_recipes()

@app.get("/recipes/search")
def search_recipes(q: str):
    return db.search_recipes(q)

@app.get("/recipes/{recipe_id}")
def get_recipe(recipe_id: int):
    recipe = db.get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe

@app.get("/recipes/{recipe_id}/ingredients")
def get_recipe_ingredients(recipe_id: int):
    if not db.get_recipe(recipe_id):
        raise HTTPException(status_code=404, detail="Recipe not found")
    return db.get_recipe_ingredients(recipe_id)

@app.post("/recipes")
def create_recipe(data: RecipeCreate):
    recipe_id = db.add_recipe(
        data.name,
        [item.model_dump() for item in data.ingredient_list],
        time_to_cook_mins=data.time_to_cook_mins,
        servings=data.servings,
        instructions=data.instructions,
        tags=data.tags,
    )
    return {"id": recipe_id}

@app.put("/recipes/{recipe_id}")
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
    )
    return {"id": recipe_id}

@app.delete("/recipes/{recipe_id}")
def delete_recipe(recipe_id: int):
    if not db.get_recipe(recipe_id):
        raise HTTPException(status_code=404, detail="Recipe not found")
    db.delete_recipe(recipe_id)
    return {"status": "deleted"}

@app.get("/grocery-list")
def get_grocery_list(start_date: str, end_date: str):
    return db.get_grocery_list(start_date, end_date)

# ------------------------------------------------------------------
# Workouts
# ------------------------------------------------------------------
@app.get("/workouts")
def list_workouts():
    return db.get_all_workouts()

@app.get("/workouts/search")
def search_workouts(q: str):
    return db.search_workouts(q)

@app.get("/workouts/{workout_id}")
def get_workout(workout_id: int):
    workout = db.get_workout(workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    return workout

@app.get("/workouts/{workout_id}/exercises")
def get_workout_exercises(workout_id: int):
    if not db.get_workout(workout_id):
        raise HTTPException(status_code=404, detail="Workout not found")
    return db.get_workout_exercises(workout_id)

@app.post("/workouts")
def create_workout(data: WorkoutCreate):
    workout_id = db.add_workout(
        data.name,
        [item.model_dump() for item in data.exercise_list],
        duration_mins=data.duration_mins,
    )
    return {"id": workout_id}

@app.put("/workouts/{workout_id}")
def update_workout(workout_id: int, data: WorkoutCreate):
    if not db.get_workout(workout_id):
        raise HTTPException(status_code=404, detail="Workout not found")
    db.update_workout(
        workout_id,
        data.name,
        [item.model_dump() for item in data.exercise_list],
        duration_mins=data.duration_mins,
    )
    return {"id": workout_id}

@app.delete("/workouts/{workout_id}")
def delete_workout(workout_id: int):
    if not db.get_workout(workout_id):
        raise HTTPException(status_code=404, detail="Workout not found")
    db.delete_workout(workout_id)
    return {"status": "deleted"}

# ------------------------------------------------------------------
# Calendar
# ------------------------------------------------------------------
@app.get("/calendar")
def list_calendar(start_date: str, end_date: str):
    return db.get_events_for_range(start_date, end_date)

@app.get("/calendar/day")
def list_calendar_day(day: str):
    return db.get_events_for_day(day)

@app.get("/calendar/{event_id}")
def get_calendar_event(event_id: int):
    event = db.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@app.post("/calendar")
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
    )
    return {"id": event_id}

@app.put("/calendar/{event_id}")
def update_calendar_event(event_id: int, data: CalendarEventCreate):
    if not db.get_event(event_id):
        raise HTTPException(status_code=404, detail="Event not found")
    db.update_calendar_event(
        event_id,
        data.title,
        data.event_type,
        data.event_date,
        data.start_time,
        data.duration_mins,
        data.ref_workout_id,
        data.ref_recipe_id,
        data.notes,
    )
    return {"id": event_id}

@app.delete("/calendar/{event_id}")
def delete_calendar_event(event_id: int):
    if not db.get_event(event_id):
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete_calendar_event(event_id)
    return {"status": "deleted"}

# ------------------------------------------------------------------
# Logs
# ------------------------------------------------------------------
@app.post("/logs/bodyweight")
def log_bodyweight(data: BodyweightLogCreate):
    log_id = db.log_bodyweight(data.weight_lbs, log_date=data.log_date, bodyfat_pct=data.bodyfat_pct)
    return {"id": log_id}

@app.get("/logs/bodyweight")
def list_bodyweight_log(limit: int = 90):
    return db.get_bodyweight_history(limit)

@app.delete("/logs/bodyweight/{log_id}")
def delete_bodyweight_log(log_id: int):
    db.delete_bodyweight_log(log_id)
    return {"status": "deleted"}

@app.post("/logs/lift")
def log_lift(data: LiftLogCreate):
    log_id = db.log_lift(data.exercise_id, data.weight, sets=data.sets, reps=data.reps, log_date=data.log_date)
    return {"id": log_id}

@app.get("/logs/lift")
def list_lift_log(exercise_id: int, limit: int = 90):
    return db.get_lift_history(exercise_id, limit)

@app.get("/logs/lift/{exercise_id}/1rm")
def get_current_1rm(exercise_id: int):
    estimate = db.get_current_1rm_estimate(exercise_id)
    if estimate is None:
        raise HTTPException(status_code=404, detail="No lift logs found for this exercise")
    return {"estimate": estimate}

@app.delete("/logs/lift/{log_id}")
def delete_lift_log(log_id: int):
    db.delete_lift_log(log_id)
    return {"status": "deleted"}

@app.post("/logs/nutrition")
def log_nutrition(data: NutritionLogCreate):
    log_id = db.log_nutrition(data.kcal, cost=data.cost, log_date=data.log_date)
    return {"id": log_id}

@app.get("/logs/nutrition")
def list_nutrition_log(limit: int = 90):
    return db.get_nutrition_history(limit)

@app.delete("/logs/nutrition/{log_id}")
def delete_nutrition_log(log_id: int):
    db.delete_nutrition_log(log_id)
    return {"status": "deleted"}

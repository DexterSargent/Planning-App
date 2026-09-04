import sys
import os
import random
from datetime import datetime, timedelta

# Add parent dir to path so we can import database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import DatabaseManager

db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "performance_hq.db")
db = DatabaseManager(db_path)

def generate_test_data():
    exercises = db.get_all_exercises()
    workouts = db.get_all_workouts()
    
    if not exercises:
        print("No exercises found. Add exercises first.")
        return
        
    if not workouts:
        print("No workouts found. Add workouts first.")
        return

    print(f"Generating test data. Found {len(exercises)} exercises and {len(workouts)} workouts.")
    
    # 1. Lift Logs
    # Generate 45 days of workout logs (backwards from today)
    # We want roughly 3-4 workouts per week.
    
    today = datetime.now().date()
    current_date = today - timedelta(days=60)
    
    logs_added = 0
    while current_date <= today:
        if random.random() < 0.6:  # ~60% chance of working out on any given day
            workout = random.choice(workouts)
            
            # Fetch exercises for this workout
            workout_exercises = db.conn.execute("SELECT * FROM workout_exercises WHERE workout_id = ?", (workout["id"],)).fetchall()
            
            for we in workout_exercises:
                ex_id = we["exercise_id"]
                sets = we["sets"] or 3
                reps = we["reps"] or 10
                
                # Base weight loosely based on random
                base_weight = random.randint(40, 220)
                
                # Simulate progressive overload or variation
                for s in range(sets):
                    weight = base_weight + (s * 5) + random.choice([-5, 0, 5])
                    
                    db.log_lift(
                        exercise_id=ex_id,
                        weight=weight,
                        sets=1, # One set logged per call
                        reps=reps,
                        log_date=current_date.isoformat()
                    )
                    logs_added += 1
            
        current_date += timedelta(days=1)
        
    print(f"Added {logs_added} lift log entries.")
    
    # 2. Nutrition Logs (Macronutrients)
    # Generate 60 days of daily nutrition logs
    current_date = today - timedelta(days=60)
    nut_logs_added = 0
    while current_date <= today:
        if random.random() < 0.9: # 90% chance of logging food
            db.log_daily_nutrition(
                log_date=current_date.isoformat(),
                kcal=random.randint(2200, 3200),
                protein_g=random.randint(130, 210),
                carbs_g=random.randint(200, 350),
                fat_g=random.randint(60, 110)
            )
            nut_logs_added += 1
            
        current_date += timedelta(days=1)
        
    print(f"Added {nut_logs_added} nutrition log entries.")

if __name__ == "__main__":
    generate_test_data()

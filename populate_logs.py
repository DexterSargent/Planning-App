import sqlite3
import random
import datetime
import os

DB_PATH = 'data/performance_hq.db'

def populate_logs():
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("SELECT id, name FROM exercises")
    exercises = cur.fetchall()

    if not exercises:
        print("No exercises found in DB!")
        return

    # Choose a few core lifts
    core_lifts = [ex for ex in exercises if "bench" in ex[1].lower() or "squat" in ex[1].lower() or "deadlift" in ex[1].lower() or "press" in ex[1].lower()]
    if not core_lifts:
        core_lifts = exercises[:5]

    today = datetime.date.today()
    logs = []

    # Simulate 20 workouts over 60 days
    # We'll do a simple progression curve
    progressions = {ex_id: {"weight": random.randint(135, 225), "reps": 8} for ex_id, name in core_lifts}

    for day_offset in range(60, 0, -3):
        log_date = (today - datetime.timedelta(days=day_offset)).isoformat()
        
        # Pick 3-4 exercises for this 'workout'
        workout_exercises = random.sample(core_lifts, k=min(4, len(core_lifts)))
        
        for ex_id, name in workout_exercises:
            prog = progressions[ex_id]
            # Occasional progressive overload
            if random.random() > 0.6:
                prog["weight"] += 5
            
            weight = f"{prog['weight']},{prog['weight']},{prog['weight']}"
            sets = 3
            reps = prog["reps"]

            logs.append((ex_id, log_date, weight, sets, reps, datetime.datetime.now().isoformat()))

    cur.executemany(
        "INSERT INTO lift_logs (exercise_id, log_date, weight, sets, reps, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        logs
    )
    conn.commit()
    print(f"Inserted {len(logs)} historic lift logs.")

    # Generate some fake calendar events for these logs
    # Note: the analytics pie chart looks at event_type='Training' and duration_mins
    # The analytics muscle diagram looks at filteredTrainingEvents which need ref_workout_id.
    
    cur.execute("SELECT id FROM workouts LIMIT 1")
    w = cur.fetchone()
    wid = w[0] if w else None

    events = []
    for day_offset in range(60, 0, -3):
        log_date = (today - datetime.timedelta(days=day_offset)).isoformat()
        events.append(('Training', 'Generated Workout', log_date, '17:00', 60, 1, wid, datetime.datetime.now().isoformat()))

    cur.executemany(
        "INSERT INTO calendar_events (event_type, title, event_date, start_time, duration_mins, is_completed, ref_workout_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        events
    )
    conn.commit()
    print(f"Inserted {len(events)} historic training events.")

    conn.close()

if __name__ == '__main__':
    populate_logs()

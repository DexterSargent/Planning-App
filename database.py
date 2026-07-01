"""
database.py — Single source of truth for Performance HQ's persistence layer.

This replaces the old database.py and db_manager.py, which defined two
different, incompatible `workouts` tables. Only this file should be
imported going forward; db_manager.py can be deleted.

Schema overview
----------------
Master libraries (things you build once, reuse forever):
    ingredients        - reusable food items (kcal / cost per 100g)
    exercises          - reusable exercise names + category

Composed items (built from the libraries above):
    recipes            + recipe_ingredients (junction, qty in grams)
    workouts           + workout_exercises  (junction, sets/reps/weight)

Planning:
    calendar_events     - anything placed on the weekly calendar. Can
                           optionally reference a recipe_id or workout_id
                           so the calendar always reflects the master data.

Analytics (what actually happened, not just what was planned):
    body_logs           - bodyweight over time
    lift_logs           - weight actually lifted for a given exercise/date,
                           used to track 1RM / strength trends
    nutrition_logs      - kcal/cost actually eaten on a given day

All methods commit immediately and return plain Python types (lists of
dicts, or the new row's id) so the UI layer never has to touch SQL.
"""

import sqlite3
from datetime import datetime, date


class DatabaseManager:
    def __init__(self, db_name="performance_hq.db"):
        self.conn = sqlite3.connect(db_name)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON;")
        self.create_tables()

    # ------------------------------------------------------------------
    # Schema
    # ------------------------------------------------------------------
    def create_tables(self):
        c = self.conn.cursor()

        # ---------- Master libraries ----------
        c.execute("""CREATE TABLE IF NOT EXISTS ingredients (
                        id INTEGER PRIMARY KEY,
                        name TEXT NOT NULL UNIQUE,
                        kcal_per_100g REAL NOT NULL,
                        cost_per_100g REAL NOT NULL,
                        created_at TIMESTAMP
                    )""")

        c.execute("""CREATE TABLE IF NOT EXISTS exercises (
                        id INTEGER PRIMARY KEY,
                        name TEXT NOT NULL UNIQUE,
                        category TEXT,
                        created_at TIMESTAMP
                    )""")

        # ---------- Composed: recipes ----------
        c.execute("""CREATE TABLE IF NOT EXISTS recipes (
                        id INTEGER PRIMARY KEY,
                        name TEXT NOT NULL,
                        total_kcal INTEGER DEFAULT 0,
                        cost REAL DEFAULT 0,
                        time_to_cook_mins INTEGER DEFAULT 0,
                        created_at TIMESTAMP
                    )""")

        c.execute("""CREATE TABLE IF NOT EXISTS recipe_ingredients (
                        id INTEGER PRIMARY KEY,
                        recipe_id INTEGER NOT NULL,
                        ingredient_id INTEGER NOT NULL,
                        quantity_g REAL NOT NULL,
                        FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
                        FOREIGN KEY(ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT
                    )""")

        # ---------- Composed: workouts ----------
        c.execute("""CREATE TABLE IF NOT EXISTS workouts (
                        id INTEGER PRIMARY KEY,
                        name TEXT NOT NULL,
                        duration_mins INTEGER DEFAULT 0,
                        created_at TIMESTAMP
                    )""")

        c.execute("""CREATE TABLE IF NOT EXISTS workout_exercises (
                        id INTEGER PRIMARY KEY,
                        workout_id INTEGER NOT NULL,
                        exercise_id INTEGER NOT NULL,
                        sets INTEGER,
                        reps INTEGER,
                        weight REAL,
                        FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
                        FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
                    )""")

        # ---------- Calendar ----------
        c.execute("""CREATE TABLE IF NOT EXISTS calendar_events (
                        id INTEGER PRIMARY KEY,
                        title TEXT NOT NULL,
                        event_type TEXT NOT NULL,
                        event_date TEXT NOT NULL,
                        start_time TEXT,
                        duration_mins INTEGER,
                        ref_workout_id INTEGER,
                        ref_recipe_id INTEGER,
                        notes TEXT,
                        created_at TIMESTAMP,
                        FOREIGN KEY(ref_workout_id) REFERENCES workouts(id) ON DELETE SET NULL,
                        FOREIGN KEY(ref_recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
                    )""")

        # ---------- Analytics logs ----------
        c.execute("""CREATE TABLE IF NOT EXISTS body_logs (
                        id INTEGER PRIMARY KEY,
                        log_date TEXT NOT NULL,
                        weight_lbs REAL NOT NULL,
                        bodyfat_pct REAL,
                        created_at TIMESTAMP
                    )""")

        c.execute("""CREATE TABLE IF NOT EXISTS lift_logs (
                        id INTEGER PRIMARY KEY,
                        exercise_id INTEGER NOT NULL,
                        log_date TEXT NOT NULL,
                        weight REAL NOT NULL,
                        sets INTEGER,
                        reps INTEGER,
                        created_at TIMESTAMP,
                        FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
                    )""")

        c.execute("""CREATE TABLE IF NOT EXISTS nutrition_logs (
                        id INTEGER PRIMARY KEY,
                        log_date TEXT NOT NULL,
                        kcal REAL NOT NULL,
                        cost REAL,
                        created_at TIMESTAMP
                    )""")

        self.conn.commit()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _rows_to_dicts(rows):
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------
    # Ingredients (master library)
    # ------------------------------------------------------------------
    def add_ingredient(self, name, kcal_per_100g, cost_per_100g):
        cur = self.conn.execute(
            "INSERT INTO ingredients (name, kcal_per_100g, cost_per_100g, created_at) VALUES (?, ?, ?, ?)",
            (name, kcal_per_100g, cost_per_100g, datetime.now().isoformat()),
        )
        self.conn.commit()
        return cur.lastrowid

    def get_all_ingredients(self):
        rows = self.conn.execute("SELECT * FROM ingredients ORDER BY name").fetchall()
        return self._rows_to_dicts(rows)

    def search_ingredients(self, query):
        rows = self.conn.execute(
            "SELECT * FROM ingredients WHERE name LIKE ? ORDER BY name", (f"%{query}%",)
        ).fetchall()
        return self._rows_to_dicts(rows)

    def get_ingredient(self, ingredient_id):
        row = self.conn.execute(
            "SELECT * FROM ingredients WHERE id = ?", (ingredient_id,)
        ).fetchone()
        return dict(row) if row else None

    def delete_ingredient(self, ingredient_id):
        self.conn.execute("DELETE FROM ingredients WHERE id = ?", (ingredient_id,))
        self.conn.commit()

    # ------------------------------------------------------------------
    # Exercises (master library)
    # ------------------------------------------------------------------
    def add_exercise(self, name, category=None):
        cur = self.conn.execute(
            "INSERT INTO exercises (name, category, created_at) VALUES (?, ?, ?)",
            (name, category, datetime.now().isoformat()),
        )
        self.conn.commit()
        return cur.lastrowid

    def get_all_exercises(self):
        rows = self.conn.execute("SELECT * FROM exercises ORDER BY name").fetchall()
        return self._rows_to_dicts(rows)

    def get_exercise_by_name(self, name):
        row = self.conn.execute("SELECT * FROM exercises WHERE name = ?", (name,)).fetchone()
        return dict(row) if row else None

    def get_or_create_exercise(self, name, category=None):
        existing = self.get_exercise_by_name(name)
        if existing:
            return existing["id"]
        return self.add_exercise(name, category)

    # ------------------------------------------------------------------
    # Recipes
    # ------------------------------------------------------------------
    def add_recipe(self, name, ingredient_list, time_to_cook_mins=0):
        """
        ingredient_list: list of dicts {ingredient_id, quantity_g}
        Computes total_kcal / cost from the ingredients table automatically.
        """
        total_kcal = 0.0
        total_cost = 0.0
        for item in ingredient_list:
            ing = self.get_ingredient(item["ingredient_id"])
            if not ing:
                continue
            factor = item["quantity_g"] / 100.0
            total_kcal += ing["kcal_per_100g"] * factor
            total_cost += ing["cost_per_100g"] * factor

        cur = self.conn.execute(
            "INSERT INTO recipes (name, total_kcal, cost, time_to_cook_mins, created_at) VALUES (?, ?, ?, ?, ?)",
            (name, round(total_kcal), round(total_cost, 2), time_to_cook_mins, datetime.now().isoformat()),
        )
        recipe_id = cur.lastrowid
        for item in ingredient_list:
            self.conn.execute(
                "INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_g) VALUES (?, ?, ?)",
                (recipe_id, item["ingredient_id"], item["quantity_g"]),
            )
        self.conn.commit()
        return recipe_id

    def get_all_recipes(self):
        rows = self.conn.execute("SELECT * FROM recipes ORDER BY created_at DESC").fetchall()
        return self._rows_to_dicts(rows)

    def search_recipes(self, query):
        rows = self.conn.execute(
            "SELECT * FROM recipes WHERE name LIKE ? ORDER BY name", (f"%{query}%",)
        ).fetchall()
        return self._rows_to_dicts(rows)

    def get_recipe_ingredients(self, recipe_id):
        rows = self.conn.execute(
            """SELECT ri.quantity_g, i.* FROM recipe_ingredients ri
               JOIN ingredients i ON i.id = ri.ingredient_id
               WHERE ri.recipe_id = ?""",
            (recipe_id,),
        ).fetchall()
        return self._rows_to_dicts(rows)

    def delete_recipe(self, recipe_id):
        self.conn.execute("DELETE FROM recipes WHERE id = ?", (recipe_id,))
        self.conn.commit()

    # ------------------------------------------------------------------
    # Workouts
    # ------------------------------------------------------------------
    def add_workout(self, name, exercise_list, duration_mins=None):
        """
        exercise_list: list of dicts {exercise_id, sets, reps, weight}
        If duration_mins isn't given, estimate ~3 mins/set as a placeholder.
        """
        if duration_mins is None:
            duration_mins = sum((e.get("sets") or 0) for e in exercise_list) * 3

        cur = self.conn.execute(
            "INSERT INTO workouts (name, duration_mins, created_at) VALUES (?, ?, ?)",
            (name, duration_mins, datetime.now().isoformat()),
        )
        workout_id = cur.lastrowid
        for e in exercise_list:
            self.conn.execute(
                "INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps, weight) VALUES (?, ?, ?, ?, ?)",
                (workout_id, e["exercise_id"], e.get("sets"), e.get("reps"), e.get("weight")),
            )
        self.conn.commit()
        return workout_id

    def get_all_workouts(self):
        rows = self.conn.execute("SELECT * FROM workouts ORDER BY created_at DESC").fetchall()
        return self._rows_to_dicts(rows)

    def search_workouts(self, query):
        rows = self.conn.execute(
            "SELECT * FROM workouts WHERE name LIKE ? ORDER BY name", (f"%{query}%",)
        ).fetchall()
        return self._rows_to_dicts(rows)

    def get_workout_exercises(self, workout_id):
        rows = self.conn.execute(
            """SELECT we.sets, we.reps, we.weight, e.name, e.id as exercise_id FROM workout_exercises we
               JOIN exercises e ON e.id = we.exercise_id
               WHERE we.workout_id = ?""",
            (workout_id,),
        ).fetchall()
        return self._rows_to_dicts(rows)

    def delete_workout(self, workout_id):
        self.conn.execute("DELETE FROM workouts WHERE id = ?", (workout_id,))
        self.conn.commit()

    # ------------------------------------------------------------------
    # Calendar events
    # ------------------------------------------------------------------
    def add_calendar_event(self, title, event_type, event_date, start_time=None,
                            duration_mins=None, ref_workout_id=None, ref_recipe_id=None, notes=None):
        cur = self.conn.execute(
            """INSERT INTO calendar_events
               (title, event_type, event_date, start_time, duration_mins, ref_workout_id, ref_recipe_id, notes, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (title, event_type, event_date, start_time, duration_mins,
             ref_workout_id, ref_recipe_id, notes, datetime.now().isoformat()),
        )
        self.conn.commit()
        return cur.lastrowid

    def get_events_for_range(self, start_date, end_date):
        """start_date / end_date are 'YYYY-MM-DD' strings, inclusive."""
        rows = self.conn.execute(
            "SELECT * FROM calendar_events WHERE event_date BETWEEN ? AND ? ORDER BY event_date, start_time",
            (start_date, end_date),
        ).fetchall()
        return self._rows_to_dicts(rows)

    def get_events_for_day(self, day):
        rows = self.conn.execute(
            "SELECT * FROM calendar_events WHERE event_date = ? ORDER BY start_time", (day,)
        ).fetchall()
        return self._rows_to_dicts(rows)

    def delete_calendar_event(self, event_id):
        self.conn.execute("DELETE FROM calendar_events WHERE id = ?", (event_id,))
        self.conn.commit()

    # ------------------------------------------------------------------
    # Analytics logs
    # ------------------------------------------------------------------
    def log_bodyweight(self, weight_lbs, log_date=None, bodyfat_pct=None):
        log_date = log_date or date.today().isoformat()
        cur = self.conn.execute(
            "INSERT INTO body_logs (log_date, weight_lbs, bodyfat_pct, created_at) VALUES (?, ?, ?, ?)",
            (log_date, weight_lbs, bodyfat_pct, datetime.now().isoformat()),
        )
        self.conn.commit()
        return cur.lastrowid

    def get_bodyweight_history(self, limit=90):
        rows = self.conn.execute(
            "SELECT * FROM body_logs ORDER BY log_date DESC LIMIT ?", (limit,)
        ).fetchall()
        return list(reversed(self._rows_to_dicts(rows)))

    def log_lift(self, exercise_id, weight, sets=None, reps=None, log_date=None):
        log_date = log_date or date.today().isoformat()
        cur = self.conn.execute(
            "INSERT INTO lift_logs (exercise_id, log_date, weight, sets, reps, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (exercise_id, log_date, weight, sets, reps, datetime.now().isoformat()),
        )
        self.conn.commit()
        return cur.lastrowid

    def get_lift_history(self, exercise_id, limit=90):
        rows = self.conn.execute(
            "SELECT * FROM lift_logs WHERE exercise_id = ? ORDER BY log_date DESC LIMIT ?",
            (exercise_id, limit),
        ).fetchall()
        return list(reversed(self._rows_to_dicts(rows)))

    def get_current_1rm_estimate(self, exercise_id):
        """Rough Epley estimate from the most recent lift log, or None."""
        row = self.conn.execute(
            "SELECT * FROM lift_logs WHERE exercise_id = ? ORDER BY log_date DESC, id DESC LIMIT 1",
            (exercise_id,),
        ).fetchone()
        if not row:
            return None
        w, reps = row["weight"], row["reps"] or 1
        return round(w * (1 + reps / 30.0), 1)

    def log_nutrition(self, kcal, cost=None, log_date=None):
        log_date = log_date or date.today().isoformat()
        cur = self.conn.execute(
            "INSERT INTO nutrition_logs (log_date, kcal, cost, created_at) VALUES (?, ?, ?, ?)",
            (log_date, kcal, cost, datetime.now().isoformat()),
        )
        self.conn.commit()
        return cur.lastrowid

    def get_nutrition_history(self, limit=90):
        rows = self.conn.execute(
            "SELECT * FROM nutrition_logs ORDER BY log_date DESC LIMIT ?", (limit,)
        ).fetchall()
        return list(reversed(self._rows_to_dicts(rows)))

    def close(self):
        self.conn.close()


if __name__ == "__main__":
    # Quick smoke test when run directly: python database.py
    db = DatabaseManager(":memory:")
    ing_id = db.add_ingredient("Extra Lean Ground Beef", kcal_per_100g=212, cost_per_100g=1.30)
    ex_id = db.add_exercise("Barbell Back Squat", category="Legs")
    recipe_id = db.add_recipe("Post-Workout Beef Bowl", [{"ingredient_id": ing_id, "quantity_g": 250}], time_to_cook_mins=20)
    workout_id = db.add_workout("Lower Body Power", [{"exercise_id": ex_id, "sets": 4, "reps": 5, "weight": 315}])
    db.add_calendar_event("Lower Body Power", "Training Session", date.today().isoformat(), "14:00", 75, ref_workout_id=workout_id)
    db.log_bodyweight(212.4)
    db.log_lift(ex_id, weight=315, sets=4, reps=5)
    print("Recipes:", db.get_all_recipes())
    print("Recipe ingredients:", db.get_recipe_ingredients(recipe_id))
    print("Workouts:", db.get_all_workouts())
    print("Workout exercises:", db.get_workout_exercises(workout_id))
    print("Events today:", db.get_events_for_day(date.today().isoformat()))
    print("1RM estimate:", db.get_current_1rm_estimate(ex_id))
    print("Smoke test passed.")
"""
database.py — Single source of truth for Performance HQ's persistence layer.

This is an extended version of the original tkinter-app database module.
It keeps the same table names/shape where possible (so existing data isn't
lost) but adds:
  - recipe metadata (servings, instructions, tags)
  - ingredient categories (for grocery-list grouping)
  - ranked/fuzzy search for ingredients & exercises
  - per-set weight logging (weights stored as JSON arrays)
  - deletion for every kind of log entry (bodyweight, lifts, nutrition)
  - a grocery-list aggregator across a date range
  - a much larger seed data set (Toronto grocery staples + exercise library)
"""

import json
import sqlite3
import threading
from datetime import datetime, date, timedelta


class ThreadSafeSQLiteConnection:
    def __init__(self, conn, lock):
        super().__setattr__("_conn", conn)
        super().__setattr__("_lock", lock)

    def execute(self, *args, **kwargs):
        with self._lock:
            return self._conn.execute(*args, **kwargs)

    def executemany(self, *args, **kwargs):
        with self._lock:
            return self._conn.executemany(*args, **kwargs)

    def cursor(self, *args, **kwargs):
        with self._lock:
            return self._conn.cursor(*args, **kwargs)

    def commit(self):
        with self._lock:
            return self._conn.commit()

    def close(self):
        with self._lock:
            return self._conn.close()

    def __getattr__(self, name):
        return getattr(self._conn, name)

    def __setattr__(self, name, value):
        if name in {"_conn", "_lock"}:
            super().__setattr__(name, value)
        else:
            setattr(self._conn, name, value)


class DatabaseManager:
    def __init__(self, db_name="performance_hq.db"):
        raw_conn = sqlite3.connect(db_name, check_same_thread=False, timeout=30)
        raw_conn.row_factory = sqlite3.Row
        self.lock = threading.RLock()
        self.conn = ThreadSafeSQLiteConnection(raw_conn, self.lock)
        with self.lock:
            self.conn.execute("PRAGMA foreign_keys = ON;")
            self.create_tables()
            self._migrate()
            self._seed_initial_data()

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
                        category TEXT,
                        created_at TIMESTAMP
                    )""")

        c.execute("""CREATE TABLE IF NOT EXISTS exercises (
                        id INTEGER PRIMARY KEY,
                        name TEXT NOT NULL UNIQUE,
                        category TEXT,
                        one_rm REAL,
                        created_at TIMESTAMP
                    )""")

        # ---------- Composed: recipes ----------
        c.execute("""CREATE TABLE IF NOT EXISTS recipes (
                        id INTEGER PRIMARY KEY,
                        name TEXT NOT NULL,
                        total_kcal INTEGER DEFAULT 0,
                        cost REAL DEFAULT 0,
                        time_to_cook_mins INTEGER DEFAULT 0,
                        servings INTEGER DEFAULT 1,
                        instructions TEXT,
                        tags TEXT,
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
                        weight TEXT,
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
                        FOREIGN KEY(ref_workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
                        FOREIGN KEY(ref_recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
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
                        weight TEXT NOT NULL,
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

    def _migrate(self):
        """Add columns to older databases created by the original app."""
        c = self.conn.cursor()
        existing_recipe_cols = {r["name"] for r in c.execute("PRAGMA table_info(recipes)")}
        if "servings" not in existing_recipe_cols:
            c.execute("ALTER TABLE recipes ADD COLUMN servings INTEGER DEFAULT 1")
        if "instructions" not in existing_recipe_cols:
            c.execute("ALTER TABLE recipes ADD COLUMN instructions TEXT")
        if "tags" not in existing_recipe_cols:
            c.execute("ALTER TABLE recipes ADD COLUMN tags TEXT")

        existing_ing_cols = {r["name"] for r in c.execute("PRAGMA table_info(ingredients)")}
        if "category" not in existing_ing_cols:
            c.execute("ALTER TABLE ingredients ADD COLUMN category TEXT")

        existing_ex_cols = {r["name"] for r in c.execute("PRAGMA table_info(exercises)")}
        if "one_rm" not in existing_ex_cols:
            c.execute("ALTER TABLE exercises ADD COLUMN one_rm REAL")
        self.conn.commit()

    def _seed_initial_data(self):
        # Seed a large Toronto-grocery-style ingredient set if none exist
        if not self.get_all_ingredients():
            for g in TORONTO_GROCERY_INGREDIENTS:
                self.add_ingredient(*g)

        # Seed a large, categorized exercise library if none exist
        if not self.get_all_exercises():
            for e, cat in EXERCISE_LIBRARY:
                self.add_exercise(e, cat)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _rows_to_dicts(rows):
        return [dict(r) for r in rows]

    @staticmethod
    def _search_rank(query, name):
        """Lower score = better match. None = no match at all.

        Ranks: exact match > starts-with > word-starts-with > substring >
        fuzzy subsequence (all query chars appear in order, possibly with
        gaps) — this lets 'chkn brst' still find 'Chicken Breast'.
        """
        q = query.strip().lower()
        n = name.lower()
        if not q:
            return 0
        if q == n:
            return 0
        if n.startswith(q):
            return 1
        if any(word.startswith(q) for word in n.split()):
            return 2
        if q in n:
            return 3
        # fuzzy subsequence match
        it = iter(n)
        if all(ch in it for ch in q):
            return 4
        return None

    def _ranked_search(self, table, query, extra_cols=""):
        rows = self.conn.execute(f"SELECT * FROM {table}").fetchall()
        scored = []
        for r in rows:
            rank = self._search_rank(query, r["name"])
            if rank is not None:
                scored.append((rank, r["name"].lower(), dict(r)))
        scored.sort(key=lambda t: (t[0], t[1]))
        return [s[2] for s in scored]

    # ------------------------------------------------------------------
    # Ingredients (master library)
    # ------------------------------------------------------------------
    def add_ingredient(self, name, kcal_per_100g, cost_per_100g, category=None):
        cur = self.conn.execute(
            "INSERT INTO ingredients (name, kcal_per_100g, cost_per_100g, category, created_at) VALUES (?, ?, ?, ?, ?)",
            (name, kcal_per_100g, cost_per_100g, category, datetime.now().isoformat()),
        )
        self.conn.commit()
        return cur.lastrowid

    def get_all_ingredients(self):
        rows = self.conn.execute("SELECT * FROM ingredients ORDER BY name").fetchall()
        return self._rows_to_dicts(rows)

    def search_ingredients(self, query):
        if not query:
            return self.get_all_ingredients()
        return self._ranked_search("ingredients", query)

    def get_ingredient(self, ingredient_id):
        row = self.conn.execute(
            "SELECT * FROM ingredients WHERE id = ?", (ingredient_id,)
        ).fetchone()
        return dict(row) if row else None

    def update_ingredient(self, ingredient_id, name, kcal_per_100g, cost_per_100g, category=None):
        self.conn.execute(
            "UPDATE ingredients SET name = ?, kcal_per_100g = ?, cost_per_100g = ?, category = ? WHERE id = ?",
            (name, kcal_per_100g, cost_per_100g, category, ingredient_id),
        )
        self.conn.commit()

    def delete_ingredient(self, ingredient_id):
        self.conn.execute("DELETE FROM ingredients WHERE id = ?", (ingredient_id,))
        self.conn.commit()

    # ------------------------------------------------------------------
    # Exercises (master library)
    # ------------------------------------------------------------------
    def add_exercise(self, name, category=None, one_rm=None):
        cur = self.conn.execute(
            "INSERT INTO exercises (name, category, one_rm, created_at) VALUES (?, ?, ?, ?)",
            (name, category, one_rm, datetime.now().isoformat()),
        )
        self.conn.commit()
        return cur.lastrowid

    def update_exercise(self, exercise_id, name, category=None, one_rm=None):
        self.conn.execute(
            "UPDATE exercises SET name = ?, category = ?, one_rm = ? WHERE id = ?",
            (name, category, one_rm, exercise_id),
        )
        self.conn.commit()

    def refresh_exercise_1rm(self, exercise_id, new_one_rm):
        if new_one_rm is None:
            return
        current = self.get_exercise(exercise_id)
        if current is None:
            return
        if current.get("one_rm") is None or new_one_rm > current.get("one_rm"):
            self.conn.execute(
                "UPDATE exercises SET one_rm = ? WHERE id = ?",
                (round(new_one_rm, 1), exercise_id),
            )
            self.conn.commit()

    def get_all_exercises(self):
        rows = self.conn.execute("SELECT * FROM exercises ORDER BY name").fetchall()
        return self._rows_to_dicts(rows)

    def get_exercise_by_name(self, name):
        row = self.conn.execute("SELECT * FROM exercises WHERE name = ?", (name,)).fetchone()
        return dict(row) if row else None

    def get_exercise(self, exercise_id):
        row = self.conn.execute("SELECT * FROM exercises WHERE id = ?", (exercise_id,)).fetchone()
        return dict(row) if row else None

    def search_exercises(self, query):
        if not query:
            return self.get_all_exercises()
        return self._ranked_search("exercises", query)

    def get_or_create_exercise(self, name, category=None):
        existing = self.get_exercise_by_name(name)
        if existing:
            return existing["id"]
        return self.add_exercise(name, category)

    def delete_exercise(self, exercise_id):
        self.conn.execute("DELETE FROM exercises WHERE id = ?", (exercise_id,))
        self.conn.commit()

    # ------------------------------------------------------------------
    # Recipes
    # ------------------------------------------------------------------
    def _compute_recipe_totals(self, ingredient_list):
        total_kcal = 0.0
        total_cost = 0.0
        for item in ingredient_list:
            ing = self.get_ingredient(item["ingredient_id"])
            if not ing:
                continue
            factor = item["quantity_g"] / 100.0
            total_kcal += ing["kcal_per_100g"] * factor
            total_cost += ing["cost_per_100g"] * factor
        return round(total_kcal), round(total_cost, 2)

    def add_recipe(self, name, ingredient_list, time_to_cook_mins=0, servings=1,
                    instructions=None, tags=None):
        total_kcal, total_cost = self._compute_recipe_totals(ingredient_list)
        cur = self.conn.execute(
            """INSERT INTO recipes (name, total_kcal, cost, time_to_cook_mins, servings,
               instructions, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (name, total_kcal, total_cost, time_to_cook_mins, servings or 1,
             instructions, tags, datetime.now().isoformat()),
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
        if not query:
            return self.get_all_recipes()
        return self._ranked_search("recipes", query)

    def get_recipe(self, recipe_id):
        row = self.conn.execute("SELECT * FROM recipes WHERE id = ?", (recipe_id,)).fetchone()
        return dict(row) if row else None

    def get_recipe_ingredients(self, recipe_id):
        rows = self.conn.execute(
            """SELECT ri.quantity_g, i.* FROM recipe_ingredients ri
               JOIN ingredients i ON i.id = ri.ingredient_id
               WHERE ri.recipe_id = ?""",
            (recipe_id,),
        ).fetchall()
        return self._rows_to_dicts(rows)

    def update_recipe(self, recipe_id, name, ingredient_list, time_to_cook_mins=0,
                       servings=1, instructions=None, tags=None):
        total_kcal, total_cost = self._compute_recipe_totals(ingredient_list)
        self.conn.execute(
            """UPDATE recipes SET name = ?, total_kcal = ?, cost = ?, time_to_cook_mins = ?,
               servings = ?, instructions = ?, tags = ? WHERE id = ?""",
            (name, total_kcal, total_cost, time_to_cook_mins, servings or 1,
             instructions, tags, recipe_id),
        )
        self.conn.execute("DELETE FROM recipe_ingredients WHERE recipe_id = ?", (recipe_id,))
        for item in ingredient_list:
            self.conn.execute(
                "INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_g) VALUES (?, ?, ?)",
                (recipe_id, item["ingredient_id"], item["quantity_g"]),
            )
        self.conn.commit()
        return recipe_id

    def delete_recipe(self, recipe_id):
        self.conn.execute("DELETE FROM calendar_events WHERE ref_recipe_id = ?", (recipe_id,))
        self.conn.execute("DELETE FROM recipes WHERE id = ?", (recipe_id,))
        self.conn.commit()

    def get_grocery_list(self, start_date, end_date):
        """Aggregate ingredients needed for every Meal/Nutrition event with a
        linked recipe in [start_date, end_date], grouped by ingredient
        category (aisle) for a shop-friendly list."""
        rows = self.conn.execute(
            """SELECT ce.event_date, r.id as recipe_id, r.name as recipe_name
               FROM calendar_events ce
               JOIN recipes r ON r.id = ce.ref_recipe_id
               WHERE ce.event_date BETWEEN ? AND ? AND ce.ref_recipe_id IS NOT NULL""",
            (start_date, end_date),
        ).fetchall()

        totals = {}  # ingredient_id -> {name, category, grams, recipes:set}
        for row in rows:
            for ing in self.get_recipe_ingredients(row["recipe_id"]):
                key = ing["id"]
                if key not in totals:
                    totals[key] = {
                        "ingredient_id": key,
                        "name": ing["name"],
                        "category": ing["category"] or "Other",
                        "grams": 0.0,
                        "recipes": set(),
                    }
                totals[key]["grams"] += ing["quantity_g"]
                totals[key]["recipes"].add(row["recipe_name"])

        grouped = {}
        for item in totals.values():
            item["recipes"] = sorted(item["recipes"])
            grouped.setdefault(item["category"], []).append(item)
        for cat in grouped:
            grouped[cat].sort(key=lambda i: i["name"])
        return grouped

    # ------------------------------------------------------------------
    # Workouts
    # ------------------------------------------------------------------
    def add_workout(self, name, exercise_list, duration_mins=None):
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
        if not query:
            return self.get_all_workouts()
        return self._ranked_search("workouts", query)

    def get_workout(self, workout_id):
        row = self.conn.execute("SELECT * FROM workouts WHERE id = ?", (workout_id,)).fetchone()
        return dict(row) if row else None

    def get_workout_exercises(self, workout_id):
        rows = self.conn.execute(
            """SELECT we.sets, we.reps, we.weight, e.name, e.id as exercise_id FROM workout_exercises we
               JOIN exercises e ON e.id = we.exercise_id
               WHERE we.workout_id = ?""",
            (workout_id,),
        ).fetchall()
        return self._rows_to_dicts(rows)

    def update_workout(self, workout_id, name, exercise_list, duration_mins=None):
        if duration_mins is None:
            duration_mins = sum((e.get("sets") or 0) for e in exercise_list) * 3

        self.conn.execute(
            "UPDATE workouts SET name = ?, duration_mins = ? WHERE id = ?",
            (name, duration_mins, workout_id),
        )
        self.conn.execute("DELETE FROM workout_exercises WHERE workout_id = ?", (workout_id,))
        for e in exercise_list:
            self.conn.execute(
                "INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps, weight) VALUES (?, ?, ?, ?, ?)",
                (workout_id, e["exercise_id"], e.get("sets"), e.get("reps"), e.get("weight")),
            )
        self.conn.commit()
        return workout_id

    def delete_workout(self, workout_id):
        self.conn.execute("DELETE FROM calendar_events WHERE ref_workout_id = ?", (workout_id,))
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

    def get_event(self, event_id):
        row = self.conn.execute("SELECT * FROM calendar_events WHERE id = ?", (event_id,)).fetchone()
        return dict(row) if row else None

    def get_next_training_event(self, from_date=None):
        from_date = from_date or date.today().isoformat()
        row = self.conn.execute(
            """SELECT * FROM calendar_events
               WHERE event_type = 'Training Session' AND ref_workout_id IS NOT NULL
                 AND event_date >= ?
               ORDER BY event_date ASC, start_time ASC LIMIT 1""",
            (from_date,),
        ).fetchone()
        return dict(row) if row else None

    def update_calendar_event(self, event_id, title, event_type, event_date, start_time=None,
                               duration_mins=None, ref_workout_id=None, ref_recipe_id=None, notes=None):
        self.conn.execute(
            """UPDATE calendar_events SET title = ?, event_type = ?, event_date = ?, start_time = ?,
               duration_mins = ?, ref_workout_id = ?, ref_recipe_id = ?, notes = ? WHERE id = ?""",
            (title, event_type, event_date, start_time, duration_mins,
             ref_workout_id, ref_recipe_id, notes, event_id),
        )
        self.conn.commit()

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

    def delete_bodyweight_log(self, log_id):
        self.conn.execute("DELETE FROM body_logs WHERE id = ?", (log_id,))
        self.conn.commit()

    def log_lift(self, exercise_id, weight, sets=None, reps=None, log_date=None):
        """`weight` may be a single number, a comma-separated string of
        per-set weights ("225,225,235"), or a Python list — always stored
        as a comma-joined string so per-set weights round-trip cleanly."""
        log_date = log_date or date.today().isoformat()
        if isinstance(weight, (list, tuple)):
            weight = ",".join(str(w) for w in weight)
        cur = self.conn.execute(
            "INSERT INTO lift_logs (exercise_id, log_date, weight, sets, reps, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (exercise_id, log_date, str(weight), sets, reps, datetime.now().isoformat()),
        )
        self.conn.commit()
        if reps is not None and reps > 0:
            try:
                weights = [float(x.strip()) for x in str(weight).replace('/', ',').split(',') if x.strip()]
                max_weight = max(weights) if weights else None
                if max_weight is not None:
                    new_one_rm = max_weight * (1 + reps / 30.0)
                    self.refresh_exercise_1rm(exercise_id, new_one_rm)
            except ValueError:
                pass
        return cur.lastrowid

    def get_lift_history(self, exercise_id, limit=90):
        rows = self.conn.execute(
            "SELECT * FROM lift_logs WHERE exercise_id = ? ORDER BY log_date DESC LIMIT ?",
            (exercise_id, limit),
        ).fetchall()
        return list(reversed(self._rows_to_dicts(rows)))

    def get_current_1rm_estimate(self, exercise_id):
        row = self.conn.execute(
            "SELECT weight, reps FROM lift_logs WHERE exercise_id = ? ORDER BY log_date DESC, id DESC LIMIT 1",
            (exercise_id,),
        ).fetchone()
        if not row:
            return None
        try:
            w_str = str(row["weight"]).replace('/', ',')
            weights = [float(x.strip()) for x in w_str.split(',') if x.strip()]
            w = max(weights) if weights else 0.0
        except ValueError:
            return None
        reps = row["reps"] or 1
        return round(w * (1 + reps / 30.0), 1)

    def delete_lift_log(self, log_id):
        self.conn.execute("DELETE FROM lift_logs WHERE id = ?", (log_id,))
        self.conn.commit()

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

    def delete_nutrition_log(self, log_id):
        self.conn.execute("DELETE FROM nutrition_logs WHERE id = ?", (log_id,))
        self.conn.commit()

    def close(self):
        self.conn.close()


# ==========================================================================
# Seed data
# ==========================================================================

# name, kcal_per_100g, cost_per_100g (CAD, approx per-100g price at a
# typical Toronto grocery store: No Frills / Metro / Farm Boy staples),
# category (used to group the grocery list by aisle)
TORONTO_GROCERY_INGREDIENTS = [
    # Proteins
    ("Chicken Breast (Boneless Skinless)", 165, 1.80, "Meat & Poultry"),
    ("Chicken Thigh (Boneless Skinless)", 209, 1.55, "Meat & Poultry"),
    ("Extra Lean Ground Beef", 212, 1.95, "Meat & Poultry"),
    ("Regular Ground Beef", 254, 1.60, "Meat & Poultry"),
    ("Ground Turkey", 189, 1.85, "Meat & Poultry"),
    ("Pork Tenderloin", 143, 1.70, "Meat & Poultry"),
    ("Bacon", 541, 3.10, "Meat & Poultry"),
    ("Salmon Filet", 208, 3.20, "Fish & Seafood"),
    ("Tilapia Filet", 129, 2.60, "Fish & Seafood"),
    ("Canned Tuna (in water)", 116, 1.90, "Fish & Seafood"),
    ("Shrimp (raw, peeled)", 99, 3.80, "Fish & Seafood"),
    ("Eggs (Whole)", 143, 0.55, "Dairy & Eggs"),
    ("Egg Whites (liquid)", 52, 0.90, "Dairy & Eggs"),
    ("Firm Tofu", 144, 0.90, "Meat Alternatives"),
    ("Tempeh", 190, 1.60, "Meat Alternatives"),
    ("Black Beans (Canned)", 132, 0.35, "Pantry"),
    ("Chickpeas (Canned)", 164, 0.35, "Pantry"),
    ("Lentils (Dry)", 353, 0.55, "Pantry"),
    ("Whey Protein Powder", 379, 3.50, "Supplements"),
    ("Plant Protein Powder", 370, 4.20, "Supplements"),

    # Dairy
    ("Whole Milk", 61, 0.25, "Dairy & Eggs"),
    ("Skim Milk", 34, 0.22, "Dairy & Eggs"),
    ("Greek Yogurt (Plain)", 59, 0.70, "Dairy & Eggs"),
    ("Cottage Cheese (Low Fat)", 98, 0.85, "Dairy & Eggs"),
    ("Cheddar Cheese", 403, 2.30, "Dairy & Eggs"),
    ("Mozzarella Cheese (Shredded)", 280, 2.00, "Dairy & Eggs"),
    ("Butter", 717, 1.60, "Dairy & Eggs"),
    ("Cream Cheese", 342, 1.80, "Dairy & Eggs"),

    # Grains & starches
    ("White Rice (Dry)", 360, 0.40, "Grains & Pasta"),
    ("Brown Rice (Dry)", 370, 0.45, "Grains & Pasta"),
    ("Basmati Rice (Dry)", 349, 0.55, "Grains & Pasta"),
    ("Oats", 389, 0.50, "Grains & Pasta"),
    ("Quinoa (Dry)", 368, 1.30, "Grains & Pasta"),
    ("Whole Wheat Pasta (Dry)", 348, 0.65, "Grains & Pasta"),
    ("White Pasta (Dry)", 371, 0.45, "Grains & Pasta"),
    ("Whole Wheat Bread", 247, 0.55, "Bakery"),
    ("White Bread", 265, 0.45, "Bakery"),
    ("Bagel (Plain)", 257, 0.80, "Bakery"),
    ("Tortilla Wraps (Whole Wheat)", 285, 0.70, "Bakery"),
    ("Couscous (Dry)", 376, 0.75, "Grains & Pasta"),

    # Vegetables
    ("Broccoli", 34, 0.60, "Produce"),
    ("Sweet Potato", 86, 0.45, "Produce"),
    ("Russet Potato", 77, 0.30, "Produce"),
    ("Spinach", 23, 0.90, "Produce"),
    ("Kale", 49, 1.00, "Produce"),
    ("Onion", 40, 0.30, "Produce"),
    ("Garlic", 149, 1.40, "Produce"),
    ("Bell Pepper", 31, 1.10, "Produce"),
    ("Carrot", 41, 0.35, "Produce"),
    ("Cucumber", 15, 0.55, "Produce"),
    ("Tomato", 18, 0.65, "Produce"),
    ("Cherry Tomatoes", 18, 1.20, "Produce"),
    ("Zucchini", 17, 0.65, "Produce"),
    ("Mushroom (White)", 22, 1.00, "Produce"),
    ("Green Beans", 31, 0.90, "Produce"),
    ("Cauliflower", 25, 0.65, "Produce"),
    ("Asparagus", 20, 1.80, "Produce"),
    ("Romaine Lettuce", 17, 0.60, "Produce"),
    ("Celery", 16, 0.45, "Produce"),
    ("Corn (Frozen)", 86, 0.50, "Frozen"),
    ("Mixed Frozen Vegetables", 65, 0.45, "Frozen"),

    # Fruit
    ("Banana", 89, 0.20, "Produce"),
    ("Apple", 52, 0.35, "Produce"),
    ("Avocado", 160, 1.20, "Produce"),
    ("Blueberries", 57, 1.90, "Produce"),
    ("Strawberries", 32, 1.30, "Produce"),
    ("Orange", 47, 0.35, "Produce"),
    ("Grapes", 69, 1.10, "Produce"),
    ("Pineapple", 50, 0.45, "Produce"),
    ("Mango", 60, 0.85, "Produce"),
    ("Frozen Mixed Berries", 55, 1.10, "Frozen"),

    # Nuts, seeds, fats
    ("Almonds", 579, 2.50, "Pantry"),
    ("Peanut Butter", 588, 1.10, "Pantry"),
    ("Almond Butter", 614, 2.60, "Pantry"),
    ("Walnuts", 654, 3.10, "Pantry"),
    ("Chia Seeds", 486, 2.40, "Pantry"),
    ("Flaxseed (Ground)", 534, 1.60, "Pantry"),
    ("Olive Oil", 884, 1.50, "Pantry"),
    ("Coconut Oil", 862, 1.90, "Pantry"),
    ("Avocado Oil", 884, 2.40, "Pantry"),

    # Condiments / pantry / misc
    ("Honey", 304, 1.20, "Pantry"),
    ("Maple Syrup", 260, 1.80, "Pantry"),
    ("Salsa", 36, 0.70, "Pantry"),
    ("Hummus", 166, 1.20, "Pantry"),
    ("Soy Sauce", 53, 0.60, "Pantry"),
    ("Hot Sauce", 12, 0.90, "Pantry"),
    ("Ketchup", 112, 0.55, "Pantry"),
    ("Mustard", 66, 0.55, "Pantry"),
    ("Protein Bar", 380, 4.50, "Supplements"),
    ("Dark Chocolate (70%+)", 598, 3.20, "Pantry"),
    ("Coffee (Ground)", 2, 2.00, "Beverages"),
    ("Almond Milk (Unsweetened)", 15, 0.35, "Beverages"),
]

# name, category — a broad, gym-realistic exercise library
EXERCISE_LIBRARY = [
    # Legs
    ("Barbell Back Squat", "Legs"),
    ("Barbell Front Squat", "Legs"),
    ("Goblet Squat", "Legs"),
    ("Bulgarian Split Squat", "Legs"),
    ("Walking Lunge", "Legs"),
    ("Leg Press", "Legs"),
    ("Leg Curl", "Legs"),
    ("Leg Extension", "Legs"),
    ("Calf Raise", "Legs"),
    ("Seated Calf Raise", "Legs"),
    ("Nordic Curl", "Legs"),
    ("Hip Thrust", "Legs"),
    ("Box Jump", "Legs"),
    ("Step Up", "Legs"),
    # Back / posterior chain
    ("Conventional Deadlift", "Back/Legs"),
    ("Romanian Deadlift", "Back/Legs"),
    ("Sumo Deadlift", "Back/Legs"),
    ("Pull Up", "Back"),
    ("Chin Up", "Back"),
    ("Barbell Row", "Back"),
    ("Pendlay Row", "Back"),
    ("Dumbbell Row", "Back"),
    ("Lat Pulldown", "Back"),
    ("Seated Cable Row", "Back"),
    ("Face Pull", "Back"),
    ("Back Extension", "Back"),
    # Chest
    ("Barbell Bench Press", "Chest"),
    ("Incline Barbell Bench Press", "Chest"),
    ("Incline Dumbbell Press", "Chest"),
    ("Flat Dumbbell Press", "Chest"),
    ("Push Up", "Chest"),
    ("Cable Fly", "Chest"),
    ("Dip", "Chest"),
    # Shoulders
    ("Overhead Press", "Shoulders"),
    ("Seated Dumbbell Shoulder Press", "Shoulders"),
    ("Lateral Raise", "Shoulders"),
    ("Front Raise", "Shoulders"),
    ("Rear Delt Fly", "Shoulders"),
    ("Arnold Press", "Shoulders"),
    # Arms
    ("Dumbbell Bicep Curl", "Arms"),
    ("Barbell Bicep Curl", "Arms"),
    ("Hammer Curl", "Arms"),
    ("Tricep Rope Pushdown", "Arms"),
    ("Skull Crusher", "Arms"),
    ("Close Grip Bench Press", "Arms"),
    # Olympic / power
    ("Power Clean", "Olympic"),
    ("Hang Clean", "Olympic"),
    ("Snatch", "Olympic"),
    ("Clean and Jerk", "Olympic"),
    ("Push Press", "Olympic"),
    # Core
    ("Plank", "Core"),
    ("Hanging Leg Raise", "Core"),
    ("Cable Woodchopper", "Core"),
    ("Ab Wheel Rollout", "Core"),
    ("Russian Twist", "Core"),
    ("Weighted Sit Up", "Core"),
    # Conditioning / speed (for return-to-sport athletes)
    ("Sled Push", "Conditioning"),
    ("Sled Drag", "Conditioning"),
    ("Farmers Carry", "Conditioning"),
    ("Battle Ropes", "Conditioning"),
    ("Assault Bike Sprint", "Conditioning"),
    ("Rowing Machine", "Conditioning"),
    ("40-Yard Sprint", "Speed"),
    ("Shuttle Run", "Speed"),
    ("Broad Jump", "Speed"),
    ("Agility Ladder Drill", "Speed"),
]


if __name__ == "__main__":
    db = DatabaseManager(":memory:")
    ing_id = db.add_ingredient("Extra Lean Ground Beef Test", kcal_per_100g=212, cost_per_100g=1.30, category="Meat & Poultry")
    ex_id = db.add_exercise("Barbell Back Squat Test", category="Legs")
    recipe_id = db.add_recipe("Post-Workout Beef Bowl", [{"ingredient_id": ing_id, "quantity_g": 250}], time_to_cook_mins=20)
    workout_id = db.add_workout("Lower Body Power", [{"exercise_id": ex_id, "sets": 4, "reps": 5, "weight": "315,315,325,325"}], 60)
    db.add_calendar_event("Lower Body Power", "Training Session", date.today().isoformat(), "14:00", 75, ref_workout_id=workout_id)
    db.log_bodyweight(212.4)
    db.log_lift(ex_id, weight="315,325", sets=4, reps=5)
    print("Recipes:", db.get_all_recipes())
    print("Workouts:", db.get_all_workouts())
    print("Events today:", db.get_events_for_day(date.today().isoformat()))
    print("1RM estimate:", db.get_current_1rm_estimate(ex_id))
    print("Fuzzy search 'chkn':", [i["name"] for i in db.search_ingredients("chkn")][:3])
    print("Smoke test passed.")
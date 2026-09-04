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
import pyodbc
import time
import threading
from datetime import datetime, date, timedelta



class PyODBCDictCursor:
    def __init__(self, cursor):
        self.cursor = cursor
        
    def execute(self, *args, **kwargs):
        self.cursor.execute(*args, **kwargs)
        return self
        
    def fetchall(self):
        rows = self.cursor.fetchall()
        if not rows: return []
        cols = [column[0] for column in self.cursor.description]
        return [dict(zip(cols, row)) for row in rows]
        
    def fetchone(self):
        row = self.cursor.fetchone()
        if not row: return None
        cols = [column[0] for column in self.cursor.description]
        return dict(zip(cols, row))
        
    def __getattr__(self, name):
        return getattr(self.cursor, name)

class ThreadSafeSQLiteConnection:
    def __init__(self, conn, lock):
        super().__setattr__("_conn", conn)
        super().__setattr__("_lock", lock)

    def execute(self, *args, **kwargs):
        with self._lock:
            cur = self._conn.cursor()
            cur.execute(*args, **kwargs)
            return PyODBCDictCursor(cur)
            
    def cursor(self):
        return PyODBCDictCursor(self._conn.cursor())

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
    def __init__(self, db_name="Driver={ODBC Driver 18 for SQL Server};Server=tcp:yourserver.database.windows.net,1433;Database=yourdb;Uid=youruser;Pwd=yourpassword;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"):
        max_retries = 5
        retry_delay = 5
        raw_conn = None
        for attempt in range(max_retries):
            try:
                raw_conn = pyodbc.connect(db_name, autocommit=True, timeout=30)
                break
            except pyodbc.Error as e:
                # 40613 is Database not currently available (Azure SQL waking up)
                if '40613' in str(e) and attempt < max_retries - 1:
                    print(f"Database waking up, retrying in {retry_delay}s... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(retry_delay)
                else:
                    raise e
                    
        self.lock = threading.RLock()
        self.conn = ThreadSafeSQLiteConnection(raw_conn, self.lock)
        with self.lock:
            self.create_tables()
            self._migrate()
            self._seed_initial_data()

    # ------------------------------------------------------------------
    # Schema
    # ------------------------------------------------------------------
    def create_tables(self):
        c = self.conn.cursor()

        # ---------- Master libraries ----------
        c.execute("""IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ingredients' and xtype='U')
CREATE TABLE ingredients (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        name NVARCHAR(MAX) NOT NULL UNIQUE,
                        kcal_per_100g FLOAT NOT NULL,
                        cost_per_100g FLOAT NOT NULL,
                        category NVARCHAR(MAX),
                        in_inventory INTEGER DEFAULT 0,
                        created_at DATETIME2
                    )""")

        c.execute("""IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='exercises' and xtype='U')
CREATE TABLE exercises (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        name NVARCHAR(MAX) NOT NULL UNIQUE,
                        category NVARCHAR(MAX),
                        one_rm FLOAT,
                        created_at DATETIME2
                    )""")

        # ---------- Composed: recipes ----------
        c.execute("""IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='recipes' and xtype='U')
CREATE TABLE recipes (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        name NVARCHAR(MAX) NOT NULL,
                        total_kcal INTEGER DEFAULT 0,
                        cost FLOAT DEFAULT 0,
                        time_to_cook_mins INTEGER DEFAULT 0,
                        servings INTEGER DEFAULT 1,
                        instructions NVARCHAR(MAX),
                        tags NVARCHAR(MAX),
                        meal_type NVARCHAR(MAX) DEFAULT 'supper',
                        created_at DATETIME2
                    )""")

        c.execute("""IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='recipe_ingredients' and xtype='U')
CREATE TABLE recipe_ingredients (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        recipe_id INTEGER NOT NULL,
                        ingredient_id INTEGER NOT NULL,
                        quantity_g FLOAT NOT NULL,
                        FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
                        FOREIGN KEY(ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT
                    )""")

        # ---------- Composed: workouts ----------
        c.execute("""IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='workouts' and xtype='U')
CREATE TABLE workouts (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        name NVARCHAR(MAX) NOT NULL,
                        duration_mins INTEGER DEFAULT 0,
                        location_type NVARCHAR(MAX) DEFAULT 'gym',
                        created_at DATETIME2
                    )""")

        c.execute("""IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='workout_exercises' and xtype='U')
CREATE TABLE workout_exercises (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        workout_id INTEGER NOT NULL,
                        exercise_id INTEGER NOT NULL,
                        sets INTEGER,
                        reps INTEGER,
                        weight NVARCHAR(MAX),
                        FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
                        FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
                    )""")

        # ---------- Calendar ----------
        c.execute("""IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='calendar_events' and xtype='U')
CREATE TABLE calendar_events (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        title NVARCHAR(MAX) NOT NULL,
                        event_type NVARCHAR(MAX) NOT NULL,
                        event_date NVARCHAR(MAX) NOT NULL,
                        start_time NVARCHAR(MAX),
                        duration_mins INTEGER,
                        ref_workout_id INTEGER,
                        ref_recipe_id INTEGER,
                        notes NVARCHAR(MAX),
                        location_type NVARCHAR(MAX),
                        is_completed BIT DEFAULT 0,
                        created_at DATETIME2,
                        FOREIGN KEY(ref_workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
                        FOREIGN KEY(ref_recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
                    )""")
        try:
            c.execute("ALTER TABLE calendar_events ADD is_completed BIT DEFAULT 0")
        except pyodbc.Error:
            pass

        # ---------- Analytics logs ----------
        c.execute("""IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lift_logs' and xtype='U')
CREATE TABLE lift_logs (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        exercise_id INTEGER NOT NULL,
                        log_date NVARCHAR(MAX) NOT NULL,
                        weight NVARCHAR(MAX) NOT NULL,
                        sets INTEGER,
                        reps INTEGER,
                        created_at DATETIME2,
                        FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
                    )""")

        c.execute("""IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='nutrition_logs' and xtype='U')
CREATE TABLE nutrition_logs (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        log_date NVARCHAR(MAX) NOT NULL,
                        kcal FLOAT NOT NULL,
                        cost FLOAT,
                        created_at DATETIME2
                    )""")

        c.execute("""IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_settings' and xtype='U')
CREATE TABLE user_settings (
                        key NVARCHAR(MAX) PRIMARY KEY,
                        value NVARCHAR(MAX)
                    )""")

        c.execute("""IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='grocery_lists' and xtype='U')
CREATE TABLE grocery_lists (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        week_label NVARCHAR(MAX) NOT NULL,
                        items_json NVARCHAR(MAX) NOT NULL,
                        status NVARCHAR(MAX) DEFAULT 'active',
                        created_at DATETIME2
                    )""")

        c.execute("""IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='weekly_schedule_template' and xtype='U')
CREATE TABLE weekly_schedule_template (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        day_of_week NVARCHAR(MAX) NOT NULL,
                        title NVARCHAR(MAX) NOT NULL,
                        event_type NVARCHAR(MAX) NOT NULL,
                        start_time NVARCHAR(MAX),
                        duration_mins INTEGER DEFAULT 60,
                        meal_slot_type NVARCHAR(MAX),
                        notes NVARCHAR(MAX),
                        ref_workout_id INTEGER,
                        location NVARCHAR(MAX),
                        location_type NVARCHAR(MAX),
                        commute_to_mins INTEGER,
                        commute_from_mins INTEGER,
                        created_at DATETIME2,
                        FOREIGN KEY(ref_workout_id) REFERENCES workouts(id) ON DELETE CASCADE
                    )""")

        c.execute("IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_calendar_event_date') CREATE INDEX idx_calendar_event_date ON calendar_events(event_date)")
        c.execute("IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_lift_logs_exercise_date') CREATE INDEX idx_lift_logs_exercise_date ON lift_logs(exercise_id, log_date)")
        c.execute("IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_body_logs_date') CREATE INDEX idx_body_logs_date ON body_logs(log_date)")
        c.execute("IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_nutrition_logs_date') CREATE INDEX idx_nutrition_logs_date ON nutrition_logs(log_date)")

        self.conn.commit()

    def _migrate(self):
        """Add columns to older databases created by the original app."""
        c = self.conn.cursor()
        existing_recipe_cols = {r["COLUMN_NAME"] for r in c.execute(f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='recipes'")}
        if "servings" not in existing_recipe_cols:
            c.execute("ALTER TABLE recipes ADD servings INTEGER DEFAULT 1")
        if "instructions" not in existing_recipe_cols:
            c.execute("ALTER TABLE recipes ADD instructions NVARCHAR(MAX)")
        if "tags" not in existing_recipe_cols:
            c.execute("ALTER TABLE recipes ADD tags NVARCHAR(MAX)")
        if "meal_type" not in existing_recipe_cols:
            c.execute("ALTER TABLE recipes ADD meal_type NVARCHAR(MAX) DEFAULT 'supper'")

        existing_ing_cols = {r["COLUMN_NAME"] for r in c.execute(f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='ingredients'")}
        if "category" not in existing_ing_cols:
            c.execute("ALTER TABLE ingredients ADD category NVARCHAR(MAX)")
        if "in_inventory" not in existing_ing_cols:
            c.execute("ALTER TABLE ingredients ADD in_inventory INTEGER DEFAULT 0")

        existing_ex_cols = {r["COLUMN_NAME"] for r in c.execute(f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='exercises'")}
        if "one_rm" not in existing_ex_cols:
            c.execute("ALTER TABLE exercises ADD one_rm REAL")

        existing_wo_cols = {r["COLUMN_NAME"] for r in c.execute(f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='workouts'")}
        if "location_type" not in existing_wo_cols:
            c.execute("ALTER TABLE workouts ADD location_type NVARCHAR(MAX) DEFAULT 'gym'")

        existing_cal_cols = {r["COLUMN_NAME"] for r in c.execute(f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='calendar_events'")}
        if "location_type" not in existing_cal_cols:
            c.execute("ALTER TABLE calendar_events ADD location_type NVARCHAR(MAX)")

        existing_template_cols = {r["COLUMN_NAME"] for r in c.execute(f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='weekly_schedule_template'")}
        if "ref_workout_id" not in existing_template_cols:
            c.execute("ALTER TABLE weekly_schedule_template ADD ref_workout_id INTEGER")
        if "location" not in existing_template_cols:
            c.execute("ALTER TABLE weekly_schedule_template ADD location TEXT")
        if "location_type" not in existing_template_cols:
            c.execute("ALTER TABLE weekly_schedule_template ADD location_type NVARCHAR(MAX)")
        if "commute_to_mins" not in existing_template_cols:
            c.execute("ALTER TABLE weekly_schedule_template ADD commute_to_mins INTEGER")
        if "commute_from_mins" not in existing_template_cols:
            c.execute("ALTER TABLE weekly_schedule_template ADD commute_from_mins INTEGER")

        c.execute("IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_calendar_event_date') CREATE INDEX idx_calendar_event_date ON calendar_events(event_date)")
        c.execute("IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_lift_logs_exercise_date') CREATE INDEX idx_lift_logs_exercise_date ON lift_logs(exercise_id, log_date)")
        c.execute("IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_body_logs_date') CREATE INDEX idx_body_logs_date ON body_logs(log_date)")
        c.execute("IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_nutrition_logs_date') CREATE INDEX idx_nutrition_logs_date ON nutrition_logs(log_date)")

        c.execute("""IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_settings' and xtype='U')
CREATE TABLE user_settings (
                        key NVARCHAR(MAX) PRIMARY KEY,
                        value NVARCHAR(MAX)
                    )""")
        c.execute("""IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='grocery_lists' and xtype='U')
CREATE TABLE grocery_lists (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        week_label NVARCHAR(MAX) NOT NULL,
                        items_json NVARCHAR(MAX) NOT NULL,
                        status NVARCHAR(MAX) DEFAULT 'active',
                        created_at DATETIME2
                    )""")

        self.conn.commit()

    def _seed_initial_data(self):
        # Always sync/upsert our rich Toronto grocery set so existing databases get updated categories and accurate CAD pricing
        for name, kcal, cost, cat in TORONTO_GROCERY_INGREDIENTS:
            self.conn.execute(
                """
                MERGE INTO ingredients AS target
                USING (SELECT ? AS name, ? AS kcal, ? AS cost, ? AS cat, ? AS created) AS source
                ON target.name = source.name
                WHEN MATCHED THEN
                    UPDATE SET kcal_per_100g = source.kcal, cost_per_100g = source.cost, category = source.cat
                WHEN NOT MATCHED THEN
                    INSERT (name, kcal_per_100g, cost_per_100g, category, in_inventory, created_at)
                    VALUES (source.name, source.kcal, source.cost, source.cat, 0, source.created);
                """,
                (name, kcal, cost, cat, datetime.now().isoformat()),
            )

        # Always sync/upsert our comprehensive exercise library so existing databases get multi-muscle categories
        for e, cat in EXERCISE_LIBRARY:
            self.conn.execute(
                """
                MERGE INTO exercises AS target
                USING (SELECT ? AS name, ? AS cat, ? AS created) AS source
                ON target.name = source.name
                WHEN MATCHED THEN
                    UPDATE SET category = source.cat
                WHEN NOT MATCHED THEN
                    INSERT (name, category, created_at)
                    VALUES (source.name, source.cat, source.created);
                """,
                (e, cat, datetime.now().isoformat()),
            )
        self.conn.commit()

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
        if table not in {"ingredients", "exercises", "recipes", "workouts"}:
            raise ValueError(f"Invalid table name: {table}")
        q = query.strip().lower()
        if not q:
            rows = self.conn.execute(f"SELECT * FROM {table}").fetchall()
            return [dict(r) for r in rows]
        first_char = q[0] if q else ""
        rows = self.conn.execute(f"SELECT * FROM {table} WHERE LOWER(name) LIKE ? OR LOWER(name) LIKE ?", (f"%{q}%", f"{first_char}%")).fetchall()
        if not rows:
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
    def add_ingredient(self, name, kcal_per_100g, cost_per_100g, category=None, in_inventory=0):
        cur = self.conn.execute(
            "INSERT INTO ingredients (name, kcal_per_100g, cost_per_100g, category, in_inventory, created_at) OUTPUT INSERTED.id VALUES (?, ?, ?, ?, ?, ?)",
            (name, kcal_per_100g, cost_per_100g, category, int(in_inventory), datetime.now().isoformat()),
        )
        self.conn.commit()
        return cur.fetchone()[0]

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

    def update_ingredient(self, ingredient_id, name, kcal_per_100g, cost_per_100g, category=None, in_inventory=0):
        self.conn.execute(
            "UPDATE ingredients SET name = ?, kcal_per_100g = ?, cost_per_100g = ?, category = ?, in_inventory = ? WHERE id = ?",
            (name, kcal_per_100g, cost_per_100g, category, int(in_inventory), ingredient_id),
        )
        self.conn.commit()

    def toggle_ingredient_inventory(self, ingredient_id, in_inventory):
        self.conn.execute(
            "UPDATE ingredients SET in_inventory = ? WHERE id = ?",
            (int(in_inventory), ingredient_id),
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
            "INSERT INTO exercises (name, category, one_rm, created_at) OUTPUT INSERTED.id VALUES (?, ?, ?, ?)",
            (name, category, one_rm, datetime.now().isoformat()),
        )
        self.conn.commit()
        return cur.fetchone()[0]

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
                    instructions=None, tags=None, meal_type='supper'):
        total_kcal, total_cost = self._compute_recipe_totals(ingredient_list)
        cur = self.conn.execute(
            """INSERT INTO recipes (name, total_kcal, cost, time_to_cook_mins, servings,
               instructions, tags, meal_type, created_at) OUTPUT INSERTED.id VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (name, total_kcal, total_cost, time_to_cook_mins, servings or 1,
             instructions, tags, meal_type or 'supper', datetime.now().isoformat()),
        )
        recipe_id = cur.fetchone()[0]
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
                       servings=1, instructions=None, tags=None, meal_type='supper'):
        total_kcal, total_cost = self._compute_recipe_totals(ingredient_list)
        self.conn.execute(
            """UPDATE recipes SET name = ?, total_kcal = ?, cost = ?, time_to_cook_mins = ?,
               servings = ?, instructions = ?, tags = ?, meal_type = ? WHERE id = ?""",
            (name, total_kcal, total_cost, time_to_cook_mins, servings or 1,
             instructions, tags, meal_type or 'supper', recipe_id),
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

    # ------------------------------------------------------------------
    # Weekly Schedule Template
    # ------------------------------------------------------------------
    def get_weekly_schedule_template(self):
        rows = self.conn.execute("SELECT * FROM weekly_schedule_template ORDER BY id ASC").fetchall()
        return self._rows_to_dicts(rows)

    def add_weekly_template_block(self, day_of_week, title, event_type, start_time="08:00", duration_mins=60, meal_slot_type=None, notes=None, ref_workout_id=None, location=None, location_type=None, commute_to_mins=None, commute_from_mins=None):
        cur = self.conn.execute(
            """INSERT INTO weekly_schedule_template 
               (day_of_week, title, event_type, start_time, duration_mins, meal_slot_type, notes, ref_workout_id, location, location_type, commute_to_mins, commute_from_mins, created_at)
               OUTPUT INSERTED.id VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (day_of_week, title, event_type, start_time, duration_mins, meal_slot_type, notes, ref_workout_id, location, location_type, commute_to_mins, commute_from_mins, datetime.now().isoformat())
        )
        self.conn.commit()
        return cur.fetchone()[0]

    def delete_weekly_template_block(self, block_id):
        self.conn.execute("DELETE FROM weekly_schedule_template WHERE id = ?", (block_id,))
        self.conn.commit()

    def apply_template_to_week(self, week_start_date_str):
        try:
            mon = datetime.strptime(week_start_date_str, "%Y-%m-%d")
        except Exception:
            return 0
        day_map = {
            "Monday": 0,
            "Tuesday": 1,
            "Wednesday": 2,
            "Thursday": 3,
            "Friday": 4,
            "Saturday": 5,
            "Sunday": 6
        }
        blocks = self.get_weekly_schedule_template()
        count = 0
        for block in blocks:
            offset = day_map.get(block["day_of_week"], 0)
            target_date = (mon + timedelta(days=offset)).strftime("%Y-%m-%d")
            
            # 1. Main event
            self.add_calendar_event(
                title=block["title"],
                event_type=block["event_type"],
                event_date=target_date,
                start_time=block["start_time"] or "08:00",
                duration_mins=block["duration_mins"] or 60,
                notes=block["notes"],
                ref_workout_id=block["ref_workout_id"],
                location_type=block["location_type"]
            )
            count += 1

            loc_label = (block.get("location") or block.get("location_type") or "LOCATION").upper()
            start_time_str = block["start_time"] or "08:00"

            # 2. Commute To
            commute_to = block.get("commute_to_mins")
            if commute_to:
                try:
                    c_to = int(commute_to)
                    if c_to > 0:
                        start_dt = datetime.strptime(start_time_str, "%H:%M")
                        commute_start_dt = start_dt - timedelta(minutes=c_to)
                        self.add_calendar_event(
                            title=f"🚕 Commute to {loc_label} (~{c_to}m)",
                            event_type="Commute",
                            event_date=target_date,
                            start_time=commute_start_dt.strftime("%H:%M"),
                            duration_mins=c_to
                        )
                        count += 1
                except (ValueError, TypeError):
                    pass

            # 3. Commute From
            commute_from = block.get("commute_from_mins")
            if commute_from:
                try:
                    c_from = int(commute_from)
                    if c_from > 0:
                        start_dt = datetime.strptime(start_time_str, "%H:%M")
                        duration = int(block["duration_mins"] or 60)
                        commute_start_dt = start_dt + timedelta(minutes=duration)
                        self.add_calendar_event(
                            title=f"🚕 Return from {loc_label} (~{c_from}m)",
                            event_type="Commute",
                            event_date=target_date,
                            start_time=commute_start_dt.strftime("%H:%M"),
                            duration_mins=c_from
                        )
                        count += 1
                except (ValueError, TypeError):
                    pass

        return count

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
                        "in_inventory": ing.get("in_inventory", 0),
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
    def add_workout(self, name, exercise_list, duration_mins=None, location_type='gym'):
        if duration_mins is None:
            duration_mins = sum((e.get("sets") or 0) for e in exercise_list) * 3

        cur = self.conn.execute(
            "INSERT INTO workouts (name, duration_mins, location_type, created_at) OUTPUT INSERTED.id VALUES (?, ?, ?, ?)",
            (name, duration_mins, location_type, datetime.now().isoformat()),
        )
        workout_id = cur.fetchone()[0]
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
            """SELECT we.sets, we.reps, we.weight, e.name, e.category, e.id as exercise_id FROM workout_exercises we
               JOIN exercises e ON e.id = we.exercise_id
               WHERE we.workout_id = ?""",
            (workout_id,),
        ).fetchall()
        return self._rows_to_dicts(rows)

    def update_workout(self, workout_id, name, exercise_list, duration_mins=None, location_type='gym'):
        if duration_mins is None:
            duration_mins = sum((e.get("sets") or 0) for e in exercise_list) * 3

        self.conn.execute(
            "UPDATE workouts SET name = ?, duration_mins = ?, location_type = ? WHERE id = ?",
            (name, duration_mins, location_type, workout_id),
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
                            duration_mins=None, ref_workout_id=None, ref_recipe_id=None, notes=None, location_type=None, is_completed=False):
        cur = self.conn.execute(
            """INSERT INTO calendar_events
               (title, event_type, event_date, start_time, duration_mins, ref_workout_id, ref_recipe_id, notes, location_type, is_completed, created_at)
               OUTPUT INSERTED.id VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (title, event_type, event_date, start_time, duration_mins,
             ref_workout_id, ref_recipe_id, notes, location_type, is_completed, datetime.now().isoformat()),
        )
        self.conn.commit()
        return cur.fetchone()[0]

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
                               duration_mins=None, ref_workout_id=None, ref_recipe_id=None, notes=None, location_type=None, is_completed=False):
        self.conn.execute(
            """UPDATE calendar_events SET title = ?, event_type = ?, event_date = ?, start_time = ?,
               duration_mins = ?, ref_workout_id = ?, ref_recipe_id = ?, notes = ?, location_type = ?, is_completed = ? WHERE id = ?""",
            (title, event_type, event_date, start_time, duration_mins,
             ref_workout_id, ref_recipe_id, notes, location_type, is_completed, event_id),
        )
        self.conn.commit()

    def delete_calendar_event(self, event_id):
        self.conn.execute("DELETE FROM calendar_events WHERE id = ?", (event_id,))
        self.conn.commit()

    # ------------------------------------------------------------------
    # Analytics logs
    # ------------------------------------------------------------------

    def log_lift(self, exercise_id, weight, sets=None, reps=None, log_date=None):
        """`weight` may be a single number, a comma-separated string of
        per-set weights ("225,225,235"), or a Python list — always stored
        as a comma-joined string so per-set weights round-trip cleanly."""
        log_date = log_date or date.today().isoformat()
        if isinstance(weight, (list, tuple)):
            weight = ",".join(str(w) for w in weight)
        cur = self.conn.execute(
            "INSERT INTO lift_logs (exercise_id, log_date, weight, sets, reps, created_at) OUTPUT INSERTED.id VALUES (?, ?, ?, ?, ?, ?)",
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
        return cur.fetchone()[0]
    def update_lift_log(self, log_id, weight, sets, reps):
        if isinstance(weight, (list, tuple)):
            weight = ",".join(str(w) for w in weight)
        self.conn.execute(
            "UPDATE lift_logs SET weight = ?, sets = ?, reps = ? WHERE id = ?",
            (str(weight), sets, reps, log_id)
        )
        self.conn.commit()

        # Re-calc 1RM if applicable (fetch the exercise_id from log first)
        row = self.conn.execute("SELECT exercise_id FROM lift_logs WHERE id = ?", (log_id,)).fetchone()
        if row and reps is not None and reps > 0:
            try:
                weights = [float(x.strip()) for x in str(weight).replace('/', ',').split(',') if x.strip()]
                max_weight = max(weights) if weights else None
                if max_weight is not None:
                    new_one_rm = max_weight * (1 + reps / 30.0)
                    self.refresh_exercise_1rm(row["exercise_id"], new_one_rm)
            except ValueError:
                pass

    def get_lift_history(self, exercise_id=None, limit=200, log_date=None):
        query = "SELECT * FROM lift_logs WHERE 1=1"
        params = []
        if exercise_id is not None:
            query += " AND exercise_id = ?"
            params.append(exercise_id)
        if log_date is not None:
            query += " AND log_date = ?"
            params.append(log_date)
        
        query += " ORDER BY log_date DESC LIMIT ?"
        params.append(limit)
        
        rows = self.conn.execute(query, tuple(params)).fetchall()
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
            "INSERT INTO nutrition_logs (log_date, kcal, cost, created_at) OUTPUT INSERTED.id VALUES (?, ?, ?, ?)",
            (log_date, kcal, cost, datetime.now().isoformat()),
        )
        self.conn.commit()
        return cur.fetchone()[0]

    def get_nutrition_history(self, limit=90):
        rows = self.conn.execute(
            "SELECT * FROM nutrition_logs ORDER BY log_date DESC LIMIT ?", (limit,)
        ).fetchall()
        return list(reversed(self._rows_to_dicts(rows)))

    def delete_nutrition_log(self, log_id):
        self.conn.execute("DELETE FROM nutrition_logs WHERE id = ?", (log_id,))
        self.conn.commit()

    # ------------------------------------------------------------------
    # Settings
    # ------------------------------------------------------------------
    def get_user_settings(self):
        rows = self.conn.execute("SELECT key, value FROM user_settings").fetchall()
        return {r["key"]: r["value"] for r in rows}

    def update_user_settings(self, settings_dict):
        for key, value in settings_dict.items():
            self.conn.execute(
                """
                MERGE INTO user_settings AS target
                USING (SELECT ? AS [key], ? AS value) AS source
                ON target.[key] = source.[key]
                WHEN MATCHED THEN
                    UPDATE SET value = source.value
                WHEN NOT MATCHED THEN
                    INSERT ([key], value)
                    VALUES (source.[key], source.value);
                """,
                (key, str(value)),
            )
        self.conn.commit()
        return self.get_user_settings()

    # ------------------------------------------------------------------
    # Grocery Lists
    # ------------------------------------------------------------------
    def add_grocery_list(self, week_label, items_json):
        cur = self.conn.execute(
            "INSERT INTO grocery_lists (week_label, items_json, status, created_at) OUTPUT INSERTED.id VALUES (?, ?, 'active', ?)",
            (week_label, items_json, datetime.now().isoformat()),
        )
        self.conn.commit()
        return cur.fetchone()[0]

    def get_active_grocery_list(self):
        row = self.conn.execute(
            "SELECT * FROM grocery_lists WHERE status = 'active' ORDER BY created_at DESC LIMIT 1"
        ).fetchone()
        return dict(row) if row else None

    def get_all_grocery_lists(self):
        rows = self.conn.execute(
            "SELECT * FROM grocery_lists ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]

    def update_grocery_list(self, list_id, items_json=None, status=None):
        if items_json is not None:
            self.conn.execute("UPDATE grocery_lists SET items_json = ? WHERE id = ?", (items_json, list_id))
        if status is not None:
            self.conn.execute("UPDATE grocery_lists SET status = ? WHERE id = ?", (status, list_id))
        self.conn.commit()

    def delete_grocery_list(self, list_id):
        self.conn.execute("DELETE FROM grocery_lists WHERE id = ?", (list_id,))
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
    # Meat & Poultry (CAD / 100g based on Toronto staples: No Frills, Metro, Loblaws)
    ("Chicken Breast (Boneless Skinless)", 165, 1.80, "Meat & Poultry"),
    ("Chicken Thigh (Boneless Skinless)", 209, 1.55, "Meat & Poultry"),
    ("Chicken Drumsticks", 161, 0.90, "Meat & Poultry"),
    ("Extra Lean Ground Beef (90/10)", 212, 1.95, "Meat & Poultry"),
    ("Lean Ground Beef (80/20)", 254, 1.60, "Meat & Poultry"),
    ("Beef Top Sirloin Steak", 250, 3.50, "Meat & Poultry"),
    ("Beef Ribeye Steak", 291, 4.80, "Meat & Poultry"),
    ("Ground Turkey (Lean)", 189, 1.85, "Meat & Poultry"),
    ("Pork Tenderloin", 143, 1.70, "Meat & Poultry"),
    ("Pork Loin Chops", 196, 1.45, "Meat & Poultry"),
    ("Bacon (Stripped)", 541, 3.10, "Meat & Poultry"),
    ("Turkey Bacon", 368, 2.80, "Meat & Poultry"),

    # Fish & Seafood
    ("Atlantic Salmon Filet", 208, 3.20, "Fish & Seafood"),
    ("Wild Sockeye Salmon", 168, 4.50, "Fish & Seafood"),
    ("Tilapia Filet", 129, 2.60, "Fish & Seafood"),
    ("Cod Filet", 82, 2.90, "Fish & Seafood"),
    ("Halibut Filet", 111, 5.20, "Fish & Seafood"),
    ("Canned Tuna (in water)", 116, 1.90, "Fish & Seafood"),
    ("Canned Salmon", 136, 2.10, "Fish & Seafood"),
    ("Shrimp (Raw, Peeled, Large)", 99, 3.80, "Fish & Seafood"),
    ("Sea Scallops", 111, 4.90, "Fish & Seafood"),

    # Dairy & Eggs
    ("Eggs (Large Whole)", 143, 0.55, "Dairy & Eggs"),
    ("Egg Whites (Liquid Cartons)", 52, 0.90, "Dairy & Eggs"),
    ("Whole Milk (3.25%)", 61, 0.25, "Dairy & Eggs"),
    ("2% Reduced Fat Milk", 50, 0.24, "Dairy & Eggs"),
    ("Skim Milk", 34, 0.22, "Dairy & Eggs"),
    ("Greek Yogurt (Plain 0%)", 59, 0.70, "Dairy & Eggs"),
    ("Greek Yogurt (Plain 2%)", 73, 0.75, "Dairy & Eggs"),
    ("Cottage Cheese (2% Low Fat)", 98, 0.85, "Dairy & Eggs"),
    ("Cheddar Cheese (Old/Medium)", 403, 2.30, "Dairy & Eggs"),
    ("Mozzarella Cheese (Part Skim)", 280, 2.00, "Dairy & Eggs"),
    ("Parmesan Cheese (Grated)", 431, 3.60, "Dairy & Eggs"),
    ("Feta Cheese", 264, 2.50, "Dairy & Eggs"),
    ("Butter (Salted/Unsalted)", 717, 1.60, "Dairy & Eggs"),
    ("Cream Cheese", 342, 1.80, "Dairy & Eggs"),
    ("Heavy Whipping Cream (35%)", 340, 0.95, "Dairy & Eggs"),

    # Plant-Based / Meat Alternatives
    ("Extra Firm Tofu", 144, 0.90, "Meat Alternatives"),
    ("Tempeh (Organic)", 190, 1.60, "Meat Alternatives"),
    ("Edamame (Shelled Frozen)", 121, 1.10, "Meat Alternatives"),
    ("Seitan / Wheat Gluten", 370, 1.80, "Meat Alternatives"),

    # Grains & Pasta
    ("Jasmine White Rice (Dry)", 360, 0.40, "Grains & Pasta"),
    ("Brown Rice (Dry)", 370, 0.45, "Grains & Pasta"),
    ("Basmati Rice (Dry)", 349, 0.55, "Grains & Pasta"),
    ("Rolled Oats (Large Flake)", 389, 0.50, "Grains & Pasta"),
    ("Steel Cut Oats (Dry)", 375, 0.60, "Grains & Pasta"),
    ("Quinoa (Organic Dry)", 368, 1.30, "Grains & Pasta"),
    ("Whole Wheat Pasta (Dry)", 348, 0.65, "Grains & Pasta"),
    ("White Penne/Spaghetti (Dry)", 371, 0.45, "Grains & Pasta"),
    ("Couscous (Dry)", 376, 0.75, "Grains & Pasta"),
    ("Farro (Dry)", 335, 1.10, "Grains & Pasta"),

    # Bakery
    ("100% Whole Wheat Bread", 247, 0.55, "Bakery"),
    ("Sourdough Loaf", 274, 0.90, "Bakery"),
    ("White Sandwich Bread", 265, 0.45, "Bakery"),
    ("Everything Bagels", 257, 0.80, "Bakery"),
    ("Whole Wheat Tortilla Wraps", 285, 0.70, "Bakery"),
    ("English Muffins", 235, 0.75, "Bakery"),

    # Vegetables (Produce)
    ("Broccoli Crowns", 34, 0.60, "Produce"),
    ("Sweet Potatoes", 86, 0.45, "Produce"),
    ("Russet Baking Potatoes", 77, 0.30, "Produce"),
    ("Baby Spinach (Bagged)", 23, 0.90, "Produce"),
    ("Kale (Organic Green)", 49, 1.00, "Produce"),
    ("Yellow/Red Onions", 40, 0.30, "Produce"),
    ("Garlic Bulbs", 149, 1.40, "Produce"),
    ("Red/Yellow Bell Peppers", 31, 1.10, "Produce"),
    ("Carrots (Bagged)", 41, 0.35, "Produce"),
    ("English Cucumber", 15, 0.55, "Produce"),
    ("Beefsteak Tomatoes", 18, 0.65, "Produce"),
    ("Cherry/Grape Tomatoes", 18, 1.20, "Produce"),
    ("Zucchini Squash", 17, 0.65, "Produce"),
    ("White Button Mushrooms", 22, 1.00, "Produce"),
    ("Cremini Mushrooms", 26, 1.20, "Produce"),
    ("Green Beans (Trimmed)", 31, 0.90, "Produce"),
    ("Cauliflower Head", 25, 0.65, "Produce"),
    ("Asparagus Spears", 20, 1.80, "Produce"),
    ("Romaine Lettuce Hearts", 17, 0.60, "Produce"),
    ("Celery Stalks", 16, 0.45, "Produce"),
    ("Brussels Sprouts", 43, 0.85, "Produce"),

    # Fruit (Produce)
    ("Bananas (Yellow)", 89, 0.20, "Produce"),
    ("Gala/Honeycrisp Apples", 52, 0.35, "Produce"),
    ("Hass Avocados", 160, 1.20, "Produce"),
    ("Fresh Blueberries (Pint)", 57, 1.90, "Produce"),
    ("Fresh Strawberries", 32, 1.30, "Produce"),
    ("Navel Oranges", 47, 0.35, "Produce"),
    ("Seedless Green/Red Grapes", 69, 1.10, "Produce"),
    ("Whole Pineapple", 50, 0.45, "Produce"),
    ("Ataulfo/Red Mango", 60, 0.85, "Produce"),
    ("Lemons/Limes", 29, 0.60, "Produce"),

    # Frozen
    ("Frozen Mixed Berries", 55, 1.10, "Frozen"),
    ("Frozen Blueberries (Wild)", 57, 1.20, "Frozen"),
    ("Frozen Sweet Corn", 86, 0.50, "Frozen"),
    ("Frozen Green Peas", 81, 0.45, "Frozen"),
    ("Frozen Mixed Vegetables", 65, 0.45, "Frozen"),
    ("Frozen Broccoli Florets", 34, 0.50, "Frozen"),

    # Nuts, Seeds, Oils & Fats
    ("Raw Almonds", 579, 2.50, "Pantry"),
    ("Natural Peanut Butter", 588, 1.10, "Pantry"),
    ("Almond Butter (Pure)", 614, 2.60, "Pantry"),
    ("Raw Walnuts (Halves)", 654, 3.10, "Pantry"),
    ("Chia Seeds (Black)", 486, 2.40, "Pantry"),
    ("Flaxseed (Ground/Milled)", 534, 1.60, "Pantry"),
    ("Pumpkin Seeds / Pepitas", 559, 2.20, "Pantry"),
    ("Extra Virgin Olive Oil", 884, 1.50, "Pantry"),
    ("Organic Coconut Oil", 862, 1.90, "Pantry"),
    ("Pure Avocado Oil", 884, 2.40, "Pantry"),

    # Pantry Staples & Canned Goods
    ("Canned Black Beans", 132, 0.35, "Pantry"),
    ("Canned Chickpeas / Garbanzo", 164, 0.35, "Pantry"),
    ("Canned Kidney Beans", 127, 0.35, "Pantry"),
    ("Dry Green/Brown Lentils", 353, 0.55, "Pantry"),
    ("Crushed Tomatoes (Canned)", 32, 0.35, "Pantry"),
    ("Tomato Paste", 82, 0.60, "Pantry"),
    ("Chicken Broth (Low Sodium)", 15, 0.30, "Pantry"),
    ("Beef Broth", 17, 0.30, "Pantry"),
    ("Pure Raw Honey", 304, 1.20, "Pantry"),
    ("Pure Canadian Maple Syrup", 260, 1.80, "Pantry"),
    ("Chunky Salsa", 36, 0.70, "Pantry"),
    ("Traditional Hummus", 166, 1.20, "Pantry"),
    ("Soy Sauce (Low Sodium)", 53, 0.60, "Pantry"),
    ("Hot Sauce / Sriracha", 12, 0.90, "Pantry"),
    ("Tomato Ketchup", 112, 0.55, "Pantry"),
    ("Yellow/Dijon Mustard", 66, 0.55, "Pantry"),
    ("Dark Chocolate Bars (70%+)", 598, 3.20, "Pantry"),

    # Supplements & Beverages
    ("Whey Protein Isolate/Concentrate", 379, 3.50, "Supplements"),
    ("Plant-Based Vegan Protein Powder", 370, 4.20, "Supplements"),
    ("Casein Protein Powder", 360, 3.80, "Supplements"),
    ("Creatine Monohydrate Powder", 0, 5.00, "Supplements"),
    ("High-Protein Bar", 380, 4.50, "Supplements"),
    ("Ground Coffee Beans", 2, 2.00, "Beverages"),
    ("Unsweetened Almond Milk", 15, 0.35, "Beverages"),
    ("Oat Milk (Barista/Original)", 45, 0.45, "Beverages"),
    ("Green Tea Bags", 1, 1.20, "Beverages"),
]

# Comprehensive Exercise Library with Multi-Muscle target groups
EXERCISE_LIBRARY = [
    # Quads & Lower Body Anterior
    ("Barbell Back Squat", "Quads, Glutes, Core"),
    ("Barbell Front Squat", "Quads, Core"),
    ("Goblet Squat", "Quads, Glutes, Core"),
    ("Bulgarian Split Squat", "Quads, Glutes"),
    ("Walking Lunge", "Quads, Glutes"),
    ("Reverse Lunge", "Quads, Glutes"),
    ("Leg Press 45-Degree", "Quads, Glutes"),
    ("Hack Squat Machine", "Quads, Glutes"),
    ("Leg Extension Machine", "Quads"),
    ("Step Up (Weighted)", "Quads, Glutes"),
    ("Box Jump", "Quads, Glutes, Conditioning"),

    # Hamstrings, Glutes & Posterior Chain
    ("Conventional Deadlift", "Hamstrings, Glutes, Back"),
    ("Romanian Deadlift (RDL)", "Hamstrings, Glutes, Back"),
    ("Stiff-Leg Deadlift", "Hamstrings, Glutes"),
    ("Sumo Deadlift", "Glutes, Quads, Back"),
    ("Seated Leg Curl", "Hamstrings"),
    ("Lying Hamstring Curl", "Hamstrings"),
    ("Nordic Hamstring Curl", "Hamstrings"),
    ("Barbell Hip Thrust", "Glutes, Hamstrings"),
    ("Glute Bridge", "Glutes"),
    ("Cable Pull-Through", "Glutes, Hamstrings"),
    ("Back Extension / Hyperextension", "Hamstrings, Glutes, Back"),
    ("Good Morning", "Hamstrings, Back"),

    # Calves
    ("Standing Calf Raise (Machine/Smith)", "Calves"),
    ("Seated Calf Raise", "Calves"),
    ("Donkey Calf Raise", "Calves"),
    ("Leg Press Calf Raise", "Calves"),

    # Back (Lats, Traps, Rhomboids, Erector Spinae)
    ("Pull Up (Overhead Grip)", "Back, Biceps"),
    ("Chin Up (Underhand Grip)", "Back, Biceps"),
    ("Wide Grip Lat Pulldown", "Back, Biceps"),
    ("Close Grip Neutral Pulldown", "Back, Biceps"),
    ("Barbell Bent-Over Row", "Back, Biceps"),
    ("Pendlay Row", "Back, Core"),
    ("Single-Arm Dumbbell Row", "Back, Biceps"),
    ("Seated Cable Row", "Back, Biceps"),
    ("Chest-Supported Machine Row", "Back"),
    ("T-Bar Row", "Back, Biceps"),
    ("Straight-Arm Lat Pulldown", "Back"),
    ("Face Pull (Rope)", "Back, Shoulders"),
    ("Barbell Shrug", "Back, Shoulders"),

    # Chest (Pectorals)
    ("Barbell Flat Bench Press", "Chest, Triceps, Shoulders"),
    ("Incline Barbell Bench Press", "Chest, Shoulders, Triceps"),
    ("Decline Barbell Bench Press", "Chest, Triceps"),
    ("Flat Dumbbell Bench Press", "Chest, Triceps"),
    ("Incline Dumbbell Press", "Chest, Shoulders"),
    ("Dumbbell Fly (Flat/Incline)", "Chest"),
    ("Cable Fly / Crossover", "Chest"),
    ("Pec Deck Machine Fly", "Chest"),
    ("Weighted Dip (Chest Focus)", "Chest, Triceps"),
    ("Push Up (Standard/Deficit)", "Chest, Triceps, Core"),

    # Shoulders (Deltoids)
    ("Seated Dumbbell Shoulder Press", "Shoulders, Triceps"),
    ("Standing Barbell Overhead Press", "Shoulders, Triceps, Core"),
    ("Arnold Dumbbell Press", "Shoulders, Triceps"),
    ("Dumbbell Lateral Raise", "Shoulders"),
    ("Cable Lateral Raise", "Shoulders"),
    ("Machine Shoulder Press", "Shoulders, Triceps"),
    ("Front Dumbbell/Plate Raise", "Shoulders"),
    ("Rear Delt Cable Fly", "Shoulders, Back"),
    ("Rear Delt Machine Fly", "Shoulders, Back"),
    ("Upright Row", "Shoulders, Back"),

    # Biceps & Forearms
    ("Standing Barbell Bicep Curl", "Biceps"),
    ("EZ-Bar Curl", "Biceps"),
    ("Alternating Dumbbell Curl", "Biceps"),
    ("Incline Dumbbell Bicep Curl", "Biceps"),
    ("Hammer Curl (Dumbbell/Rope)", "Biceps"),
    ("Preacher Curl (Machine/Bar)", "Biceps"),
    ("Cable Curl (Straight/Rope)", "Biceps"),
    ("Concentration Curl", "Biceps"),
    ("Wrist Curl / Reverse Wrist Curl", "Biceps"),

    # Triceps
    ("Tricep Rope Pushdown", "Triceps"),
    ("V-Bar / Straight-Bar Pushdown", "Triceps"),
    ("Overhead Tricep Extension (Dumbbell/Cable)", "Triceps"),
    ("Skull Crusher (EZ-Bar Lying Extension)", "Triceps"),
    ("Close Grip Bench Press", "Triceps, Chest"),
    ("Bench Dip / Parallel Bar Dip", "Triceps, Chest"),
    ("Single-Arm Cable Kickback", "Triceps"),

    # Core & Abdominals
    ("Plank / Forearm Plank", "Core"),
    ("Hanging Leg/Knee Raise", "Core"),
    ("Cable Woodchopper (High-to-Low / Low-to-High)", "Core"),
    ("Ab Wheel Rollout", "Core"),
    ("Russian Twist (Weighted/Bodyweight)", "Core"),
    ("Decline Weighted Sit Up", "Core"),
    ("Cable Crunch", "Core"),
    ("Dead Bug", "Core"),
    ("Side Plank", "Core"),

    # Olympic & Explosive Power
    ("Power Clean", "Olympic, Back, Quads, Shoulders"),
    ("Hang Clean", "Olympic, Back, Quads"),
    ("Barbell Snatch", "Olympic, Back, Shoulders, Quads"),
    ("Clean and Jerk", "Olympic, Quads, Shoulders, Back"),
    ("Push Press", "Olympic, Shoulders, Quads, Triceps"),
    ("Kettlebell Swing", "Olympic, Glutes, Hamstrings, Back"),

    # Conditioning, Speed & Athletic Work
    ("Sled Push (Heavy)", "Conditioning, Quads, Glutes"),
    ("Sled Drag (Backward/Forward)", "Conditioning, Quads"),
    ("Farmers Carry (Heavy Dumbbell/Trap Bar)", "Conditioning, Core, Back"),
    ("Battle Ropes (Intervals)", "Conditioning, Shoulders, Core"),
    ("Assault Bike Sprint Intervals", "Conditioning, Quads"),
    ("Rowing Machine (Erg Sprints)", "Conditioning, Back, Quads"),
    ("40-Yard Sprint / Acceleration Drill", "Conditioning, Quads, Hamstrings"),
    ("Shuttle Run / Pro Agility", "Conditioning"),
    ("Standing Broad Jump", "Conditioning, Quads, Glutes"),
    ("Agility Ladder Quick Feet Drills", "Conditioning"),
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
import sqlite3

class DBManager:
    def __init__(self, db_name="performance_hq.db"):
        self.conn = sqlite3.connect(db_name)
        self.create_tables()

    def create_tables(self):
        cursor = self.conn.cursor()
        # Example Table
        cursor.execute('''CREATE TABLE IF NOT EXISTS workouts 
                          (id INTEGER PRIMARY KEY, name TEXT, duration INTEGER)''')
        self.conn.commit()

    def add_workout(self, name, duration):
        cursor = self.conn.cursor()
        cursor.execute("INSERT INTO workouts (name, duration) VALUES (?, ?)", (name, duration))
        self.conn.commit()

    def get_all_workouts(self):
        return self.conn.execute("SELECT * FROM workouts").fetchall()
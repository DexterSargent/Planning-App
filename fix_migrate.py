import re

with open("backend/src/database.py", "r") as f:
    content = f.read()

# Fix literal {m.group(1)}
tables = ["recipes", "ingredients", "exercises", "workouts", "calendar_events", "weekly_schedule_template"]
for table in tables:
    content = content.replace(f"{{m.group(1)}}", table, 1)

# Fix ALTER TABLE ADD COLUMN
content = content.replace("ADD COLUMN", "ADD")

# Fix TEXT -> NVARCHAR(MAX) in ALTER TABLE
content = content.replace("ADD tags TEXT", "ADD tags NVARCHAR(MAX)")
content = content.replace("ADD instructions TEXT", "ADD instructions NVARCHAR(MAX)")
content = content.replace("ADD category TEXT", "ADD category NVARCHAR(MAX)")
content = content.replace("ADD meal_type TEXT", "ADD meal_type NVARCHAR(MAX)")
content = content.replace("ADD location_type TEXT", "ADD location_type NVARCHAR(MAX)")

# Fix try-except around adding is_completed (SQL Server uses BIT)
content = content.replace("ALTER TABLE calendar_events ADD is_completed BOOLEAN DEFAULT 0", "ALTER TABLE calendar_events ADD is_completed BIT DEFAULT 0")

with open("backend/src/database.py", "w") as f:
    f.write(content)

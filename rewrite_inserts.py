import re

with open("backend/src/database.py", "r") as f:
    content = f.read()

# Fix INSERT INTO ... VALUES (...) for OUTPUT INSERTED.id where needed
def replace_insert_output(m):
    return m.group(0).replace("VALUES", "OUTPUT INSERTED.id VALUES")

content = re.sub(r'\"INSERT INTO ingredients \(name, kcal_per_100g, cost_per_100g, category, in_inventory, created_at\) VALUES \(\?, \?, \?, \?, \?, \?\)\"', replace_insert_output, content)
content = re.sub(r'\"INSERT INTO exercises \(name, category, one_rm, created_at\) VALUES \(\?, \?, \?, \?\)\"', replace_insert_output, content)
content = re.sub(r'\"\"\"INSERT INTO recipes \(name, total_kcal, cost, time_to_cook_mins, servings,.*?VALUES \(\?, \?, \?, \?, \?.*?\"\"\"', replace_insert_output, content, flags=re.DOTALL)
content = re.sub(r'\"\"\"INSERT INTO weekly_schedule_template.*?VALUES \(\?, \?, \?, \?, \?.*?\"\"\"', replace_insert_output, content, flags=re.DOTALL)
content = re.sub(r'\"INSERT INTO workouts \(name, duration_mins, location_type, created_at\) VALUES \(\?, \?, \?, \?\)\"', replace_insert_output, content)
content = re.sub(r'\"\"\"INSERT INTO calendar_events.*?VALUES \(\?, \?, \?, \?, \?.*?\"\"\"', replace_insert_output, content, flags=re.DOTALL)
content = re.sub(r'\"INSERT INTO lift_logs \(exercise_id, log_date, weight, sets, reps, created_at\) VALUES \(\?, \?, \?, \?, \?, \?\)\"', replace_insert_output, content)
content = re.sub(r'\"INSERT INTO nutrition_logs \(log_date, kcal, cost, created_at\) VALUES \(\?, \?, \?, \?\)\"', replace_insert_output, content)
content = re.sub(r'\"INSERT INTO grocery_lists \(week_label, items_json, status, created_at\) VALUES \(\?, \?, \'active\', \?\)\"', replace_insert_output, content)

# Handle ON CONFLICT
def replace_upsert_ingredients(m):
    return """\"\"\"
                MERGE INTO ingredients AS target
                USING (SELECT ? AS name, ? AS kcal, ? AS cost, ? AS cat, ? AS created) AS source
                ON target.name = source.name
                WHEN MATCHED THEN
                    UPDATE SET kcal_per_100g = source.kcal, cost_per_100g = source.cost, category = source.cat
                WHEN NOT MATCHED THEN
                    INSERT (name, kcal_per_100g, cost_per_100g, category, in_inventory, created_at)
                    VALUES (source.name, source.kcal, source.cost, source.cat, 0, source.created);
                \"\"\""""
content = re.sub(r'\"INSERT INTO ingredients \(name, kcal_per_100g, cost_per_100g, category, in_inventory, created_at\) VALUES \(\?, \?, \?, \?, 0, \?\) ON CONFLICT\(name\) DO UPDATE SET kcal_per_100g = excluded\.kcal_per_100g, cost_per_100g = excluded\.cost_per_100g, category = excluded\.category\"', replace_upsert_ingredients, content)

def replace_upsert_exercises(m):
    return """\"\"\"
                MERGE INTO exercises AS target
                USING (SELECT ? AS name, ? AS cat, ? AS created) AS source
                ON target.name = source.name
                WHEN MATCHED THEN
                    UPDATE SET category = source.cat
                WHEN NOT MATCHED THEN
                    INSERT (name, category, created_at)
                    VALUES (source.name, source.cat, source.created);
                \"\"\""""
content = re.sub(r'\"INSERT INTO exercises \(name, category, created_at\) VALUES \(\?, \?, \?\) ON CONFLICT\(name\) DO UPDATE SET category = excluded\.category\"', replace_upsert_exercises, content)

def replace_upsert_user_settings(m):
    return """\"\"\"
                MERGE INTO user_settings AS target
                USING (SELECT ? AS [key], ? AS value) AS source
                ON target.[key] = source.[key]
                WHEN MATCHED THEN
                    UPDATE SET value = source.value
                WHEN NOT MATCHED THEN
                    INSERT ([key], value)
                    VALUES (source.[key], source.value);
                \"\"\""""
content = re.sub(r'\"INSERT INTO user_settings \(key, value\) VALUES \(\?, \?\) ON CONFLICT\(key\) DO UPDATE SET value = \?\"', replace_upsert_user_settings, content)

# One extra parameter was being passed for user_settings `c.execute(..., (k, v, v))`
content = content.replace("cur.execute(upsert_sql, (key, value_json, value_json))", "cur.execute(upsert_sql, (key, value_json))")

with open("backend/src/database.py", "w") as f:
    f.write(content)

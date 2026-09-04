import re

with open("backend/src/database.py", "r") as f:
    content = f.read()

# 1. Replace imports
content = content.replace("import sqlite3", "import pyodbc")
content = content.replace("except sqlite3.OperationalError:", "except pyodbc.Error:")
content = content.replace("sqlite3.Row", "dict") # We won't use it but just in case

# 2. Connection parsing
conn_block = """
        if "Driver=" in db_name:
            raw_conn = pyodbc.connect(db_name, autocommit=True, timeout=30)
        else:
            raw_conn = pyodbc.connect(db_name, autocommit=True, timeout=30)
"""
content = re.sub(
    r'raw_conn = sqlite3\.connect\(db_name, check_same_thread=False, timeout=30\)\s*raw_conn\.row_factory = sqlite3\.Row',
    conn_block,
    content
)

# 3. Create table syntax
def replace_create_table(m):
    table_name = m.group(1)
    body = m.group(2)
    body = body.replace("INTEGER PRIMARY KEY", "INT IDENTITY(1,1) PRIMARY KEY")
    body = body.replace("TEXT", "NVARCHAR(MAX)")
    body = body.replace("REAL", "FLOAT")
    body = body.replace("BOOLEAN", "BIT")
    body = body.replace("TIMESTAMP", "DATETIME2")
    return f"""IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='{table_name}' and xtype='U')
CREATE TABLE {table_name} ({body})"""

content = re.sub(r'CREATE TABLE IF NOT EXISTS (\w+) \((.*?)\)', replace_create_table, content, flags=re.DOTALL)

# 4. Indexes
def replace_create_index(m):
    index_name = m.group(1)
    table_col = m.group(2)
    return f"IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = '{index_name}') CREATE INDEX {index_name} ON {table_col}"

content = re.sub(r'CREATE INDEX IF NOT EXISTS (\w+) ON (.*?);', replace_create_index, content)

# 5. _migrate table info
def replace_migrate(m):
    return 'r["COLUMN_NAME"] for r in c.execute(f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME=\'{m.group(1)}\'")'

content = re.sub(r'r\["name"\] for r in c\.execute\("PRAGMA table_info\((\w+)\)"\)', replace_migrate, content)

# 6. lastrowid replacements
def replace_insert_output(m):
    pre = m.group(1)
    into = m.group(2)
    values = m.group(3)
    return f"{pre}{into} OUTPUT INSERTED.id VALUES {values}"

content = re.sub(r'(c(?:ur)?\.execute\(\s*[\'"]INSERT INTO .*?) VALUES (\(.*?\))', replace_insert_output, content, flags=re.DOTALL)

content = content.replace("cur.lastrowid", "cur.fetchone()[0]")
content = content.replace("c.lastrowid", "c.fetchone()[0]")

# 7. Add pyodbc row conversion wrapper
cursor_wrapper = """
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
"""
content = re.sub(r'class ThreadSafeSQLiteConnection:.*?def __setattr__.*?setattr\(self\._conn, name, value\)', cursor_wrapper, content, flags=re.DOTALL)

with open("backend/src/database.py", "w") as f:
    f.write(content)

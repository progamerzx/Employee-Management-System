import os
import sys
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# Try importing pyodbc. If it fails (e.g. missing build tools locally), fall back to Mock mode.
try:
    import pyodbc
    HAS_PYODBC = True
except ImportError:
    HAS_PYODBC = False
    print("WARNING: pyodbc is not installed. Running in Mock Database mode.", file=sys.stderr)

# Load local environment variables from .env file if present
load_dotenv()

app = Flask(__name__, static_folder='frontend/dist', static_url_path='/')
CORS(app)  # Enable CORS for local development when frontend and backend run on different ports

# In-memory mock database fallback
mock_employees = [
    {
        "id": 1,
        "first_name": "Sarah",
        "last_name": "Connor",
        "email": "sarah.connor@cyberdyne.com",
        "department": "Technology",
        "hire_date": "2024-03-15",
        "salary": 125000.00
    },
    {
        "id": 2,
        "first_name": "John",
        "last_name": "Connor",
        "email": "john.connor@resistance.net",
        "department": "Marketing",
        "hire_date": "2025-01-10",
        "salary": 95000.00
    },
    {
        "id": 3,
        "first_name": "Marcus",
        "last_name": "Wright",
        "email": "marcus.wright@cyberdyne.com",
        "department": "Human Resources",
        "hire_date": "2024-07-22",
        "salary": 82000.00
    }
]
mock_id_counter = 4

def get_db_connection():
    """
    Attempts to establish connection to Azure SQL Database using ODBC.
    First checks for AZURE_SQL_CONNECTIONSTRING or DB_CONNECTION_STRING.
    Then falls back to individual credentials.
    Returns pyodbc connection object or raises an exception.
    """
    if not HAS_PYODBC:
        raise ImportError("pyodbc is not available on this environment.")

    # 1. Look for full connection string
    conn_str = os.environ.get("AZURE_SQL_CONNECTIONSTRING") or os.environ.get("DB_CONNECTION_STRING")
    if conn_str:
        return pyodbc.connect(conn_str)

    # 2. Reconstruct from components
    server = os.environ.get("DB_SERVER")
    database = os.environ.get("DB_DATABASE")
    username = os.environ.get("DB_USERNAME")
    password = os.environ.get("DB_PASSWORD")
    driver = os.environ.get("DB_DRIVER", "{ODBC Driver 18 for SQL Server}")
    
    if not (server and database and username and password):
        raise ValueError("Database credentials missing in environment variables.")

    encrypt = os.environ.get("DB_ENCRYPT", "yes")
    trust_cert = os.environ.get("DB_TRUST_CERTIFICATE", "no")
    timeout = os.environ.get("DB_TIMEOUT", "15")

    conn_str = (
        f"DRIVER={driver};SERVER={server};DATABASE={database};"
        f"UID={username};PWD={password};Encrypt={encrypt};"
        f"TrustServerCertificate={trust_cert};Connection Timeout={timeout};"
    )
    return pyodbc.connect(conn_str)

def check_db_health():
    """
    Checks connection to the database and verifies if the Employees table exists.
    Returns: (connected: bool, error_message: str|None, details: dict)
    """
    if not HAS_PYODBC:
        return False, "pyodbc module is not installed on this system. Operating in Mock mode.", {"table_exists": False, "mode": "mock", "driver": "None (Mock Mode)"}

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Employees'")
        table_exists = cursor.fetchone() is not None
        
        # Get driver name
        driver_name = conn.getinfo(pyodbc.SQL_DRIVER_NAME)
        
        cursor.close()
        conn.close()
        return True, None, {"table_exists": table_exists, "driver": driver_name, "mode": "azure_sql"}
    except Exception as e:
        return False, str(e), {"table_exists": False, "mode": "mock", "driver": os.environ.get("DB_DRIVER", "{ODBC Driver 18 for SQL Server}")}

# --- API ROUTES ---

@app.route('/api/status', methods=['GET'])
def get_status():
    """Checks and returns the database connection status."""
    connected, error, details = check_db_health()
    return jsonify({
        "connected": connected,
        "error": error,
        "details": details
    })

@app.route('/api/setup-db', methods=['POST'])
def setup_db():
    """Initializes the database schema if connected."""
    connected, error, details = check_db_health()
    if not connected:
        return jsonify({
            "status": "error",
            "message": "Database not connected. Please check configuration variables or install pyodbc.",
            "error": error
        }), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Employees]') AND type in (N'U'))
            BEGIN
                CREATE TABLE Employees (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    first_name NVARCHAR(50) NOT NULL,
                    last_name NVARCHAR(50) NOT NULL,
                    email NVARCHAR(100) UNIQUE NOT NULL,
                    department NVARCHAR(50) NOT NULL,
                    hire_date DATE NOT NULL,
                    salary DECIMAL(10, 2) NOT NULL,
                    created_at DATETIME DEFAULT GETDATE()
                )
            END
        """)
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({
            "status": "success",
            "message": "Database schema 'Employees' successfully verified/initialized."
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "Failed to create database schema.",
            "error": str(e)
        }), 500

@app.route('/api/employees', methods=['GET'])
def list_employees():
    """Retrieves all employees, from Azure SQL if connected, or mock database."""
    connected, error, _ = check_db_health()
    
    if not connected:
        # Fall back to mock DB
        return jsonify(mock_employees)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, first_name, last_name, email, department, hire_date, salary FROM Employees ORDER BY id DESC")
        rows = cursor.fetchall()
        
        employees = []
        for r in rows:
            employees.append({
                "id": r[0],
                "first_name": r[1],
                "last_name": r[2],
                "email": r[3],
                "department": r[4],
                "hire_date": r[5].isoformat() if r[5] else None,
                "salary": float(r[6])
            })
            
        cursor.close()
        conn.close()
        return jsonify(employees)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "Failed to retrieve records from Azure SQL.",
            "error": str(e)
        }), 500

@app.route('/api/employees/<int:emp_id>', methods=['GET'])
def get_employee(emp_id):
    """Retrieves details for a single employee."""
    connected, error, _ = check_db_health()

    if not connected:
        emp = next((e for e in mock_employees if e["id"] == emp_id), None)
        if emp:
            return jsonify(emp)
        return jsonify({"status": "error", "message": "Employee not found."}), 404

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, first_name, last_name, email, department, hire_date, salary FROM Employees WHERE id = ?", (emp_id,))
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if row:
            return jsonify({
                "id": row[0],
                "first_name": row[1],
                "last_name": row[2],
                "email": row[3],
                "department": row[4],
                "hire_date": row[5].isoformat() if row[5] else None,
                "salary": float(row[6])
            })
        return jsonify({"status": "error", "message": "Employee not found."}), 404
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/employees', methods=['POST'])
def create_employee():
    """Adds a new employee record."""
    global mock_id_counter
    data = request.json
    
    # Validation
    if not data or not all(k in data for k in ('first_name', 'last_name', 'email', 'department', 'hire_date', 'salary')):
        return jsonify({"status": "error", "message": "Missing required fields."}), 400

    connected, error, _ = check_db_health()

    if not connected:
        # Check unique email in mock database
        if any(e["email"].lower() == data["email"].lower() for e in mock_employees):
            return jsonify({"status": "error", "message": "Email address already registered."}), 400
            
        new_emp = {
            "id": mock_id_counter,
            "first_name": data["first_name"],
            "last_name": data["last_name"],
            "email": data["email"],
            "department": data["department"],
            "hire_date": data["hire_date"],
            "salary": float(data["salary"])
        }
        mock_employees.insert(0, new_emp) # Add to front of list
        mock_id_counter += 1
        return jsonify({"status": "success", "employee": new_emp}), 201

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify email uniqueness
        cursor.execute("SELECT COUNT(*) FROM Employees WHERE email = ?", (data["email"],))
        if cursor.fetchone()[0] > 0:
            cursor.close()
            conn.close()
            return jsonify({"status": "error", "message": "Email address already registered."}), 400

        cursor.execute("""
            INSERT INTO Employees (first_name, last_name, email, department, hire_date, salary)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (data["first_name"], data["last_name"], data["email"], data["department"], data["hire_date"], data["salary"]))
        
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": "success", "message": "Employee record created."}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": "Failed to create database record.", "error": str(e)}), 500

@app.route('/api/employees/<int:emp_id>', methods=['PUT'])
def update_employee(emp_id):
    """Updates an existing employee record."""
    data = request.json
    if not data:
        return jsonify({"status": "error", "message": "No data provided."}), 400

    connected, error, _ = check_db_health()

    if not connected:
        emp = next((e for e in mock_employees if e["id"] == emp_id), None)
        if not emp:
            return jsonify({"status": "error", "message": "Employee not found."}), 404
            
        # Verify email uniqueness if email is changed
        if "email" in data and data["email"].lower() != emp["email"].lower():
            if any(e["email"].lower() == data["email"].lower() for e in mock_employees):
                return jsonify({"status": "error", "message": "Email address already registered."}), 400

        # Update fields
        for field in ('first_name', 'last_name', 'email', 'department', 'hire_date', 'salary'):
            if field in data:
                val = float(data[field]) if field == 'salary' else data[field]
                emp[field] = val
                
        return jsonify({"status": "success", "employee": emp})

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if record exists
        cursor.execute("SELECT email FROM Employees WHERE id = ?", (emp_id,))
        row = cursor.fetchone()
        if not row:
            cursor.close()
            conn.close()
            return jsonify({"status": "error", "message": "Employee not found."}), 404

        # Verify email uniqueness if email is changing
        if "email" in data and data["email"].lower() != row[0].lower():
            cursor.execute("SELECT COUNT(*) FROM Employees WHERE email = ?", (data["email"],))
            if cursor.fetchone()[0] > 0:
                cursor.close()
                conn.close()
                return jsonify({"status": "error", "message": "Email address already registered."}), 400

        cursor.execute("""
            UPDATE Employees
            SET first_name = ?, last_name = ?, email = ?, department = ?, hire_date = ?, salary = ?
            WHERE id = ?
        """, (data["first_name"], data["last_name"], data["email"], data["department"], data["hire_date"], data["salary"], emp_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": "success", "message": "Employee record updated."})
    except Exception as e:
        return jsonify({"status": "error", "message": "Failed to update database record.", "error": str(e)}), 500

@app.route('/api/employees/<int:emp_id>', methods=['DELETE'])
def delete_employee(emp_id):
    """Deletes an employee record."""
    connected, error, _ = check_db_health()

    if not connected:
        global mock_employees
        emp = next((e for e in mock_employees if e["id"] == emp_id), None)
        if not emp:
            return jsonify({"status": "error", "message": "Employee not found."}), 404
        mock_employees = [e for e in mock_employees if e["id"] != emp_id]
        return jsonify({"status": "success", "message": "Employee record deleted."})

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM Employees WHERE id = ?", (emp_id,))
        if cursor.fetchone()[0] == 0:
            cursor.close()
            conn.close()
            return jsonify({"status": "error", "message": "Employee not found."}), 404

        cursor.execute("DELETE FROM Employees WHERE id = ?", (emp_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": "success", "message": "Employee record deleted."})
    except Exception as e:
        return jsonify({"status": "error", "message": "Failed to delete database record.", "error": str(e)}), 500

# --- FRONTEND static hosting (SPA catch-all) ---

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """Serves the compiled React frontend static files."""
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    # Determine port (Azure App Service sets PORT env)
    port = int(os.environ.get('PORT', 8000))
    # Run server
    app.run(host='0.0.0.0', port=port, debug=True)

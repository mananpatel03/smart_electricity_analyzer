import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'energy_analyzer.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Tariffs table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS tariffs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 1,
        name TEXT NOT NULL,
        rate_type TEXT DEFAULT 'flat',
        flat_rate REAL DEFAULT 7.0,
        fixed_charge REAL DEFAULT 50.0,
        tax_percent REAL DEFAULT 5.0,
        slab_json TEXT,
        is_default INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Appliances table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS appliances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 1,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        power_watts REAL NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        hours_per_day REAL NOT NULL,
        days_per_month INTEGER NOT NULL DEFAULT 30,
        standby_watts REAL DEFAULT 0,
        standby_hours REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Bill records table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS bill_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 1,
        billing_period TEXT NOT NULL,
        prev_reading REAL DEFAULT 0,
        curr_reading REAL DEFAULT 0,
        units_consumed REAL NOT NULL,
        tariff_rate REAL NOT NULL,
        fixed_charge REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        estimated_amount REAL NOT NULL,
        actual_amount REAL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Saving scenarios table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS saving_scenarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 1,
        scenario_name TEXT NOT NULL,
        details_json TEXT,
        monthly_saved_kwh REAL NOT NULL,
        monthly_saved_cost REAL NOT NULL,
        yearly_saved_cost REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    conn.commit()

    # Seed default user if not exists
    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] == 0:
        cursor.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            ('demo_user', 'demo@energyanalyzer.local', 'demo_hash')
        )
        conn.commit()

    # Seed default tariff if not exists
    cursor.execute('SELECT COUNT(*) FROM tariffs')
    if cursor.fetchone()[0] == 0:
        default_slabs = [
            {"from": 0, "to": 100, "rate": 3.75},
            {"from": 101, "to": 300, "rate": 6.50},
            {"from": 301, "to": 500, "rate": 8.75},
            {"from": 501, "to": 999999, "rate": 11.20}
        ]
        cursor.execute('''
        INSERT INTO tariffs (user_id, name, rate_type, flat_rate, fixed_charge, tax_percent, slab_json, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (1, 'Standard Domestic (Tiered Slabs)', 'slab', 7.0, 60.0, 6.0, json.dumps(default_slabs), 1))
        conn.commit()

    # Seed sample realistic appliances if empty
    cursor.execute('SELECT COUNT(*) FROM appliances')
    if cursor.fetchone()[0] == 0:
        sample_appliances = [
            ('Inverter Air Conditioner 1.5T', 'Cooling', 1200.0, 1, 6.0, 30, 2.0, 18.0),
            ('Ceiling Fan', 'Cooling', 75.0, 3, 10.0, 30, 0.0, 0.0),
            ('Double-Door Refrigerator', 'Kitchen', 180.0, 1, 24.0, 30, 0.0, 0.0),
            ('LED Room Bulbs', 'Lighting', 9.0, 6, 6.0, 30, 0.0, 0.0),
            ('Desktop PC / Monitor', 'Computing', 220.0, 1, 5.0, 30, 5.0, 19.0),
            ('Smart LED TV 43"', 'Entertainment', 80.0, 1, 4.0, 30, 3.0, 20.0),
            ('Water Geyser / Heater', 'Heating', 2000.0, 1, 0.75, 30, 0.0, 0.0),
            ('Washing Machine', 'Laundry', 500.0, 1, 0.8, 20, 1.0, 23.0)
        ]
        for app in sample_appliances:
            cursor.execute('''
            INSERT INTO appliances (user_id, name, category, power_watts, quantity, hours_per_day, days_per_month, standby_watts, standby_hours)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (1, app[0], app[1], app[2], app[3], app[4], app[5], app[6], app[7]))
        conn.commit()

    # Seed some sample bill records for historical trends
    cursor.execute('SELECT COUNT(*) FROM bill_records')
    if cursor.fetchone()[0] == 0:
        sample_bills = [
            ('May 2026', 1420.0, 1780.0, 360.0, 7.0, 60.0, 151.2, 2731.2, 2810.0, 'Hot summer month, high AC use'),
            ('Jun 2026', 1780.0, 2195.0, 415.0, 7.0, 60.0, 174.3, 3139.3, 3190.0, 'Peak summer billing'),
            ('Jul 2026', 2195.0, 2520.0, 325.0, 7.0, 60.0, 136.5, 2471.5, 2450.0, 'Monsoon cooling'),
            ('Aug 2026', 2520.0, 2815.0, 295.0, 7.0, 60.0, 123.9, 2248.9, 2290.0, 'Moderate usage'),
            ('Sep 2026', 2815.0, 3090.0, 275.0, 7.0, 60.0, 115.5, 2100.5, 2080.0, 'Optimized fan and AC hours'),
            ('Oct 2026', 3090.0, 3350.0, 260.0, 7.0, 60.0, 109.2, 1989.2, 1970.0, 'Mild weather, consistent savings')
        ]
        for b in sample_bills:
            cursor.execute('''
            INSERT INTO bill_records (user_id, billing_period, prev_reading, curr_reading, units_consumed, tariff_rate, fixed_charge, tax_amount, estimated_amount, actual_amount, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (1, b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], b[8], b[9]))
        conn.commit()

    conn.close()

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully at:", DB_PATH)

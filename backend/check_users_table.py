#!/usr/bin/env python3
"""
Script to check the users table structure and test the Google login fix
"""

import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_db_connection():
    """Get database connection"""
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
            port=os.getenv("DB_PORT")
        )
        return conn
    except Exception as e:
        print(f"Database connection failed: {e}")
        return None

def check_users_table():
    """Check the users table structure"""
    conn = get_db_connection()
    if not conn:
        print("❌ Could not connect to database")
        return
    
    try:
        cursor = conn.cursor()
        
        # Check if users table exists and get its structure
        cursor.execute("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        """)
        
        columns = cursor.fetchall()
        if columns:
            print("✅ Users table structure:")
            for col_name, data_type, is_nullable in columns:
                print(f"  - {col_name}: {data_type} ({'NULL' if is_nullable == 'YES' else 'NOT NULL'})")
        else:
            print("❌ Users table not found")
            
        # Check if there's an id column
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'id'
        """)
        
        id_column = cursor.fetchone()
        if id_column:
            print("✅ Users table has 'id' column")
        else:
            print("❌ Users table does NOT have 'id' column")
            
        # Check existing users
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        print(f"📊 Total users in database: {user_count}")
        
        # Show sample users
        cursor.execute("SELECT id, email, name FROM users LIMIT 5")
        sample_users = cursor.fetchall()
        if sample_users:
            print("👥 Sample users:")
            for user_id, email, name in sample_users:
                print(f"  - ID: {user_id}, Email: {email}, Name: {name}")
        
    except Exception as e:
        print(f"❌ Error checking users table: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_users_table()



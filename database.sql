-- Database Schema for Employee Management System (TalentFlow)
-- Target Platform: Azure SQL Database / Microsoft SQL Server
--
-- This script contains the database structure and sample records.
-- The application will also automatically attempt to initialize this table if it is connected
-- and the table is missing.

-- Create Employees Table
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
    );

    -- Insert Initial Mock Data
    INSERT INTO Employees (first_name, last_name, email, department, hire_date, salary)
    VALUES 
    (N'Sarah', N'Connor', N'sarah.connor@cyberdyne.com', N'Technology', '2024-03-15', 125000.00),
    (N'John', N'Connor', N'john.connor@resistance.net', N'Marketing', '2025-01-10', 95000.00),
    (N'Marcus', N'Wright', N'marcus.wright@cyberdyne.com', N'Human Resources', '2024-07-22', 82000.00);
    
    PRINT 'Employees table created and mock data seeded successfully.';
END
ELSE
BEGIN
    PRINT 'Employees table already exists. No action taken.';
END
GO

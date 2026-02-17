🚿 Bathroom IoT Monitoring System

Smart Bathroom Monitoring System using ESP32 + Node.js + MySQL

⚙️ Tech Stack

Backend: Node.js + Express

Database: MySQL

Frontend: HTML + Chart.js

Device: ESP32

Communication: REST API (HTTP)

ER Diagram
+----------------+
|  sensor_data  |
+----------------+
| id (PK)       |
| temperature   |
| humidity      |
| distance      |
| created_at    |
+----------------+

🏗 System Architecture
ESP32  --->  Node.js API  --->  MySQL
   |              |
   |              --->  Web Dashboard (Control + Graph)
   |
HTTP POST

Setup Database
▸ Install MySQL Community Server

https://dev.mysql.com/downloads/mysql/

▸ (Optional) Install DBeaver

https://dbeaver.io/download/

▸ Create Database
CREATE DATABASE bathroom_iot;
USE bathroom_iot;

▸ Create Table
CREATE TABLE sensor_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  temperature FLOAT,
  humidity FLOAT,
  distance FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

dotenv

สร้างไฟล์ .env ใน root project

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=bathroom_iot
PORT=3000


แล้วใน server.js

require('dotenv').config()

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
})

Install Dependencies
npm install


หรือถ้าไม่มี package.json:

npm install express mysql2 cors dotenv

To Start
▸ Start Backend
node server.js


หรือ

npx nodemon server.js

▸ Open Browser
http://localhost:3000/control.html

API Documentation
POST /api/data

Insert sensor data from ESP32

Body
{
  "temperature": 29.5,
  "humidity": 63.2,
  "distance": 15.0
}

GET /api/stats

Get statistics for graph

Response
{
  "labels": [],
  "temperature": [],
  "humidity": [],
  "usage": []
}

Project Structure
bathroom-iot/
│
├── server.js
├── .env
├── package.json
├── public/
│   ├── control.html
│   └── stats.html
└── README.md

Usage Counting Logic

จำนวนการเข้าใช้ = จำนวน row ในฐานข้อมูล

SELECT COUNT(*) 
FROM sensor_data d2 
WHERE d2.created_at <= d1.created_at

Future Improvements

Add Authentication

Real-time update using WebSocket

Deploy to Cloud (Render / Railway)

Add threshold alert system

Improve UI to full dashboard style
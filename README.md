# 🚿 Bathroom IoT Monitoring System

Smart Bathroom Monitoring System using ESP32 + Node.js + MySQL  
Monitor temperature, humidity, and usage statistics in real-time.

---

## 📌 Overview

This project is an IoT-based Bathroom Monitoring System that:

- Collects environmental data from ESP32  
- Stores data in MySQL database  
- Displays real-time dashboard via web  
- Controls fan through web interface  
- Shows statistical graph with Chart.js  
- Tracks bathroom usage count  

---

## 🏗️ System Architecture

```text
          +-------------+
          |   ESP32     |
          | Temp/Humid  |
          | Distance    |
          +------+------+ 
                 |
                 | HTTP POST (REST API)
                 v
        +------------------+
        |  Node.js Server  |
        |  Express API     |
        +--------+---------+
                 |
                 | SQL
                 v
          +-------------+
          |   MySQL     |
          | sensor_data |
          +-------------+
                 |
                 | HTTP GET
                 v
        +------------------+
        |  Web Dashboard   |
        |  Chart.js Graph  |
        +------------------+
```

---

## ✨ Features

- 🌡 Real-time Temperature Monitoring  
- 💧 Humidity Monitoring  
- 👣 Automatic Usage Counting  
- 🌀 Fan Control via Web  
- 📊 Interactive Graph Dashboard  
- 🔌 REST API Communication  
- 🗄 MySQL Data Storage  

---

## 📸 Screenshots

### 🟢 Control Page
```html
<img src="screenshots/control.png" width="800">
```

### 📊 Statistics Graph
```html
<img src="screenshots/stats.png" width="800">
```

> Create a folder named `screenshots/` and add your images.

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|----------|
| Node.js | Backend runtime |
| Express.js | REST API |
| MySQL | Database |
| mysql2 | Database driver |
| Chart.js | Graph visualization |
| ESP32 | Sensor device |

---

## 📦 Installation Guide

### 1️⃣ Clone Repository

```bash
git clone https://github.com/yourusername/bathroom-iot.git
cd bathroom-iot
```

---

### 2️⃣ Install Dependencies

```bash
npm install
```

If needed manually:

```bash
npm install express mysql2 cors
```

---

### 3️⃣ Database Setup

#### Create Database

```sql
CREATE DATABASE bathroom_iot;
USE bathroom_iot;
```

#### Create Table

```sql
CREATE TABLE sensor_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  temperature FLOAT,
  humidity FLOAT,
  distance FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 4️⃣ Configure Database Connection

Edit `server.js`:

```js
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'bathroom_iot'
});
```

---

## ▶️ Running the Server

```bash
node server.js
```

or

```bash
npx nodemon server.js
```

Server runs at:

```
http://localhost:3000
```

---

## 🌐 Web Usage

### 🟢 Control Page
```
http://localhost:3000/control.html
```

Features:

- Turn Fan ON/OFF  
- Navigate to Statistics Page  

---

### 📊 Statistics Page
```
http://localhost:3000/stats.html
```

Displays:

- Temperature graph  
- Humidity graph  
- Usage count graph  

---

## 🔌 REST API Documentation

### 📥 1. Insert Sensor Data

**Endpoint**

```
POST /api/data
```

**Request Body (JSON)**

| Field | Type | Description |
|-------|------|-------------|
| temperature | float | Temperature value |
| humidity | float | Humidity value |
| distance | float | Distance sensor value |

**Example**

```json
{
  "temperature": 28.5,
  "humidity": 65.2,
  "distance": 15.0
}
```

---

### 📊 2. Get Statistics Data

**Endpoint**

```
GET /api/stats
```

**Response Format**

```json
{
  "labels": [],
  "temperature": [],
  "humidity": [],
  "usage": []
}
```

---

## 👣 Usage Counting Logic

The system calculates cumulative usage count based on the number of rows recorded in the database over time.

```sql
SELECT COUNT(*) 
FROM sensor_data d2 
WHERE d2.created_at <= d1.created_at
```

---

## 🧪 Testing API with cURL

```bash
curl -X POST http://localhost:3000/api/data \
-H "Content-Type: application/json" \
-d "{\"temperature\":30,\"humidity\":60,\"distance\":10}"
```

---

## 📁 Project Structure

```text
bathroom-iot/
│
├── server.js
├── package.json
├── public/
│   ├── control.html
│   └── stats.html
├── screenshots/
└── README.md
```

---

## 🔒 Security Notes

- Ensure MySQL is running  
- Open port 3000 if using external ESP32  
- Configure correct local IP address for ESP32 HTTP request  

---

## 📈 Future Improvements

- Add Authentication (Login System)  
- Real-time update with WebSocket  
- Deploy to Cloud (Render / Railway / AWS)  
- Add Threshold Alerts  
- Mobile-friendly dashboard  

---

## 👨‍💻 Author

Mini Project – IoT Smart Bathroom System  
Developed for academic project submission 🚀

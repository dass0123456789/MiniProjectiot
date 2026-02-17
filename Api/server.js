const express = require("express")
const TelegramBot = require("node-telegram-bot-api")
const mysql = require("mysql2")
const rateLimit = require("express-rate-limit")

const app = express()
app.use(express.json())
app.use(express.static("public"))

// ================= RATE LIMIT =================

// ทั่วไป (ทุก API)
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 นาที
  max: 100, // ได้สูงสุด 100 request / นาที
  message: { error: "Too many requests, please try again later." }
})

// สำหรับ ESP32 ยิงข้อมูล
const sensorLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100, // ส่งได้ 30 ครั้งต่อนาที
  message: { error: "Sensor rate limit exceeded" }
})

// สำหรับ web control
const controlLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50,
  message: { error: "Control rate limit exceeded" }
})

app.use(globalLimiter)

// ================= DATABASE =================

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1234",
  database: "smart_bathroom"
})

db.connect(err => {
  if (err) console.log(err)
  else console.log("MySQL Connected")
})

// ================= TELEGRAM =================

const bot = new TelegramBot("YOUR_BOT_TOKEN")
const chatId = "YOUR_CHAT_ID"

// ================= SENSOR =================

app.post("/api/sensor", sensorLimiter, (req, res) => {

  const { temp, humidity, distance } = req.body

  const insertSql = `
    INSERT INTO sensor_data 
    (temperature, humidity, distance)
    VALUES (?, ?, ?)
  `
  db.query(insertSql, [temp, humidity, distance])

  db.query("SELECT * FROM device_state WHERE id = 1", (err, result) => {
    if (err) return console.log(err)

    let { fan, light, light2, mode } = result[0]

    if (mode === "AUTO") {

      if (distance > 0 && distance < 100) {
        light = 1
      } else {
        light = 0
      }

      if (temp > 35 || humidity > 80) {
        fan = 1
        light2 = 1
        bot.sendMessage(chatId, "⚠ High Temp/Humidity → Fan + LED2 ON")
      } else {
        fan = 0
        light2 = 0
      }

      const updateSql = `
        UPDATE device_state
        SET fan=?, light=?, light2=?
        WHERE id=1
      `
      db.query(updateSql, [fan, light, light2])
    }

  })

  res.sendStatus(200)
})

// ================= GET DEVICE =================

app.get("/api/device", (req, res) => {

  db.query("SELECT fan, light, light2, mode FROM device_state WHERE id=1",
    (err, result) => {
      if (err) return res.status(500).json(err)
      res.json(result[0])
    })
})

// ================= WEB CONTROL =================

app.post("/api/control", controlLimiter, (req, res) => {

  const { fan, light, light2, mode } = req.body

  const sql = `
    UPDATE device_state 
    SET fan=?, light=?, light2=?, mode=?
    WHERE id=1
  `

  db.query(sql, [fan, light, light2, mode], (err) => {
    if (err) return res.status(500).json(err)
    res.json({ message: "Device updated" })
  })
})

// ================= STATS =================

app.get("/api/stats", (req, res) => {

  const sql = `
    SELECT 
      DATE_FORMAT(created_at,'%H:%i') as time,
      temperature,
      humidity,
      (SELECT COUNT(*) 
       FROM sensor_data d2 
       WHERE d2.created_at <= d1.created_at) as usage_count
    FROM sensor_data d1
    ORDER BY created_at ASC
  `

  db.query(sql, (err, rows) => {

    if (err) {
      console.log(err)
      return res.status(500).json(err)
    }

    res.json({
      labels: rows.map(r => r.time),
      temperature: rows.map(r => r.temperature),
      humidity: rows.map(r => r.humidity),
      usage: rows.map(r => r.usage_count)
    })

  })
})

// ================= START =================

app.listen(3000, () => {
  console.log("Server running on port 3000")
})

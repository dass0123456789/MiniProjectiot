const express = require("express")
const TelegramBot = require("node-telegram-bot-api")
const mysql = require("mysql2")

const app = express()
app.use(express.json())
app.use(express.static("public"))

// ===== MySQL Connection =====
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1234",
  database: "smart_bathroom"
})

db.connect((err)=>{
  if(err){
    console.log("DB Error:",err)
  }else{
    console.log("MySQL Connected")
  }
})

// ===== Telegram =====
const bot = new TelegramBot("YOUR_TOKEN")
const chatId = "YOUR_CHAT_ID"

// ===== API รับข้อมูล Sensor =====
app.post("/api/sensor",(req,res)=>{

  const {temp,humidity,distance} = req.body

  console.log(req.body)

  // บันทึกข้อมูล sensor
  const insertSql = `
    INSERT INTO sensor_data 
    (temperature, humidity, distance)
    VALUES (?, ?, ?)
  `

  db.query(insertSql,[temp,humidity,distance],(err)=>{
    if(err) console.log("Insert Error:",err)
  })

  // ===== ดึงสถานะปัจจุบัน =====
  db.query("SELECT * FROM device_state WHERE id = 1",(err,result)=>{
    if(err) return console.log(err)

    let {fan, light, light2} = result[0]

    // 🚻 ถ้ามีคนเข้า (distance < 100)
    if(distance > 0 && distance < 100){
      light = 1
    }

    // 🌡 ถ้าอุณหภูมิหรือความชื้นสูง
    if(temp > 35 || humidity > 80){
      fan = 1
      light2 = 1
      bot.sendMessage(chatId,"⚠ High Temp/Humidity → Fan + LED2 ON")
    }

    // ===== Update สถานะลง DB =====
    const updateSql = `
      UPDATE device_state
      SET fan = ?, light = ?, light2 = ?
      WHERE id = 1
    `

    db.query(updateSql,[fan,light,light2],(err)=>{
      if(err) console.log("Update Error:",err)
    })
  })

  res.sendStatus(200)
})

// ===== ESP32 ดึงสถานะ =====
app.get("/api/device",(req,res)=>{

  const sql = `SELECT fan, light, light2 FROM device_state WHERE id = 1`

  db.query(sql,(err,result)=>{
    if(err) return res.status(500).json(err)

    res.json(result[0])
  })
})

// ===== Web ควบคุม =====
app.post("/api/control",(req,res)=>{

  const {fan, light, light2} = req.body

  const sql = `
    UPDATE device_state 
    SET fan = ?, light = ?, light2 = ?
    WHERE id = 1
  `

  db.query(sql,[fan,light,light2],(err)=>{
    if(err) return res.status(500).json(err)

    res.json({message:"Device updated"})
  })
})

// ===== Start Server =====
app.listen(3000,()=>{
  console.log("Server running on port 3000")
})

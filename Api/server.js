const express = require("express")
const TelegramBot = require("node-telegram-bot-api")
const mysql = require("mysql2")

const app = express()
app.use(express.json())

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

// ===== Device State =====
let deviceState = {
  fan:false,
  light:false
}

// ===== Telegram =====
const bot = new TelegramBot("YOUR_TOKEN")
const chatId = "YOUR_CHAT_ID"

// ===== API รับข้อมูล Sensor =====
app.post("/api/sensor",(req,res)=>{

  const {temp,humidity,distance} = req.body

  console.log(req.body)

  // บันทึกลง Database
  const sql = `
    INSERT INTO sensor_data 
    (temperature, humidity, distance)
    VALUES (?, ?, ?)
  `

  db.query(sql,[temp,humidity,distance],(err,result)=>{
    if(err){
      console.log("Insert Error:",err)
    }
  })

  // ตรวจ Threshold
  if(temp > 35 || humidity > 80){

    deviceState.fan = true

    bot.sendMessage(chatId,"⚠ Bathroom humidity or temp high")
  }

  res.sendStatus(200)
})

// ===== ESP32 ดึงสถานะ =====
app.get("/api/device",(req,res)=>{
  res.json(deviceState)
})

// ===== Web ควบคุม =====
app.post("/api/control",(req,res)=>{
  deviceState = req.body
  res.sendStatus(200)
})

// ===== ดึงข้อมูล History สำหรับ Graph =====
app.get("/api/history",(req,res)=>{

  const sql = `
    SELECT * FROM sensor_data
    ORDER BY created_at DESC
    LIMIT 50
  `

  db.query(sql,(err,results)=>{
    if(err){
      return res.status(500).json({error:err})
    }

    res.json(results)
  })
})

// ===== Start Server =====
app.listen(3000,()=>{
  console.log("Server running on port 3000")
})

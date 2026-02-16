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

// ===== Device State =====


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

  if(temp > 35 || humidity > 80){
    bot.sendMessage(chatId,"⚠ Bathroom humidity or temp high")
  }

  res.sendStatus(200)
})

// ===== ESP32 ดึงสถานะ =====
app.get("/api/device",(req,res)=>{

  const sql = `SELECT fan, light FROM device_state WHERE id = 1`

  db.query(sql,(err,result)=>{
    if(err) return res.status(500).json(err)

    res.json(result[0])
  })
})

// ===== Web ควบคุม =====
app.post("/api/control",(req,res)=>{

  const {fan, light} = req.body

  const sql = `
    UPDATE device_state 
    SET fan = ?, light = ?
    WHERE id = 1
  `

  db.query(sql,[fan,light],(err)=>{
    if(err) return res.status(500).json(err)

    res.json({message:"Device updated"})
  })
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
app.get("/api/summary",(req,res)=>{

  const historySql = `
    SELECT 
      temperature,
      humidity,
      distance,
      created_at
    FROM sensor_data
    ORDER BY created_at ASC
    LIMIT 100
  `

  const usageSql = `
    SELECT COUNT(*) AS usage_count 
    FROM sensor_data
    WHERE distance > 0 AND distance < 100
  `

  db.query(historySql,(err,historyResults)=>{
    if(err) return res.status(500).json(err)

    db.query(usageSql,(err,usageResult)=>{
      if(err) return res.status(500).json(err)

      res.json({
        history: historyResults,
        usage: usageResult[0].usage_count
      })
    })
  })
})


// ===== Start Server =====
app.listen(3000,()=>{
  console.log("Server running on port 3000")
})

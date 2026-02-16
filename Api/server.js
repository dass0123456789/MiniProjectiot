const express = require("express")
const TelegramBot = require("node-telegram-bot-api")
const mysql = require("mysql2")

const app = express()
app.use(express.json())
app.use(express.static("public"))

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1234",
  database: "smart_bathroom"
})

db.connect(err=>{
  if(err) console.log(err)
  else console.log("MySQL Connected")
})

const bot = new TelegramBot("YOUR_TOKEN")
const chatId = "YOUR_CHAT_ID"


// ================= SENSOR =================
app.post("/api/sensor",(req,res)=>{

  const {temp,humidity,distance} = req.body

  const insertSql = `
    INSERT INTO sensor_data 
    (temperature, humidity, distance)
    VALUES (?, ?, ?)
  `
  db.query(insertSql,[temp,humidity,distance])

  // ===== อ่านสถานะปัจจุบัน =====
  db.query("SELECT * FROM device_state WHERE id = 1",(err,result)=>{
    if(err) return console.log(err)

    let {fan, light, light2, mode} = result[0]

    // 🔥 ทำงาน AUTO เท่านั้น
    if(mode === "AUTO"){

      // เปิดไฟเมื่อมีคน
      if(distance > 0 && distance < 100){
        light = 1
      } else {
        light = 0
      }

      // เปิดพัดลม + LED2 เมื่อ temp/humidity สูง
      if(temp > 35 || humidity > 80){
        fan = 1
        light2 = 1
        bot.sendMessage(chatId,"⚠ High Temp/Humidity → Fan + LED2 ON")
      } else {
        fan = 0
        light2 = 0
      }

      const updateSql = `
        UPDATE device_state
        SET fan=?, light=?, light2=?
        WHERE id=1
      `
      db.query(updateSql,[fan,light,light2])
    }

  })

  res.sendStatus(200)
})


// ================= GET DEVICE =================
app.get("/api/device",(req,res)=>{

  db.query("SELECT fan, light, light2, mode FROM device_state WHERE id=1",
  (err,result)=>{
    if(err) return res.status(500).json(err)
    res.json(result[0])
  })
})


// ================= WEB CONTROL =================
app.post("/api/control",(req,res)=>{

  const {fan, light, light2, mode} = req.body

  const sql = `
    UPDATE device_state 
    SET fan=?, light=?, light2=?, mode=?
    WHERE id=1
  `

  db.query(sql,[fan,light,light2,mode],(err)=>{
    if(err) return res.status(500).json(err)
    res.json({message:"Device updated"})
  })
})


// ================= START =================
app.listen(3000,()=>{
  console.log("Server running on port 3000")
})

const fs = require('fs')
const path = require('path')

// 简单 SQLite 读取脚本(使用 Node.js 内置)
const { execSync } = require('child_process')

const dbPath = path.join(__dirname, 'dev.db')

if (!fs.existsSync(dbPath)) {
  console.log('❌ SQLite 数据库文件不存在')
  process.exit(1)
}

try {
  // 导出为 JSON
  const hotels = execSync(`sqlite3 ${dbPath} "SELECT * FROM Hotel;"`, { encoding: 'utf8' })
  const floors = execSync(`sqlite3 ${dbPath} "SELECT * FROM Floor;"`, { encoding: 'utf8' })
  const rooms = execSync(`sqlite3 ${dbPath} "SELECT * FROM Room;"`, { encoding: 'utf8' })
  const positions = execSync(`sqlite3 ${dbPath} "SELECT * FROM Position;"`, { encoding: 'utf8' })
  const artworks = execSync(`sqlite3 ${dbPath} "SELECT * FROM Artwork;"`, { encoding: 'utf8' })

  console.log('📊 SQLite 数据:')
  console.log('Hotels:', hotels)
  console.log('Floors:', floors)
  console.log('Rooms:', rooms)
  console.log('Positions:', positions)
  console.log('Artworks:', artworks)
} catch (e) {
  console.error('❌ 读取失败:', e.message)
}

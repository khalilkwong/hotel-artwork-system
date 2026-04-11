const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const dbPath = path.join(__dirname, 'dev.db')

// 从 SQLite 导出为 JSON
function query(sql) {
  const result = execSync(`sqlite3 ${dbPath} -json "${sql}"`, { encoding: 'utf8' })
  return JSON.parse(result || '[]')
}

function toDate(timestamp) {
  return new Date(parseInt(timestamp)).toISOString()
}

async function main() {
  console.log('📤 从 SQLite 读取数据...')
  
  const hotels = query('SELECT * FROM Hotel')
  const floors = query('SELECT * FROM Floor')
  const rooms = query('SELECT * FROM Room')
  const positions = query('SELECT * FROM Position')
  const artworks = query('SELECT * FROM Artwork')

  console.log(`✅ 读取到: ${hotels.length} 酒店, ${floors.length} 楼层, ${rooms.length} 房间, ${positions.length} 位置, ${artworks.length} 画作`)

  // 生成 SQL 文件(按依赖关系顺序)
  let sql = `TRUNCATE "Artwork", "Position", "Room", "Floor", "Hotel" CASCADE;\n\n`

  // 1. Hotels
  for (const h of hotels) {
    sql += `INSERT INTO "Hotel" (id, name, address, "createdAt") VALUES ('${h.id}', '${h.name}', ${h.address ? `'${h.address}'` : 'NULL'}, '${toDate(h.createdAt)}');\n`
  }
  // 2. Floors
  for (const f of floors) {
    sql += `INSERT INTO "Floor" (id, "hotelId", number, "createdAt") VALUES ('${f.id}', '${f.hotelId}', '${f.number}', '${toDate(f.createdAt)}');\n`
  }
  // 3. Rooms
  for (const r of rooms) {
    sql += `INSERT INTO "Room" (id, "floorId", number, "createdAt") VALUES ('${r.id}', '${r.floorId}', '${r.number}', '${toDate(r.createdAt)}');\n`
  }
  // 4. Artworks (先于 Position 插入)
  for (const a of artworks) {
    const image = a.image ? a.image.replace(/'/g, "''") : null
    sql += `INSERT INTO "Artwork" (id, title, author, "authorAge", description, image, status, "createdAt", "updatedAt") VALUES ('${a.id}', '${a.title}', '${a.author}', ${a.authorAge}, ${a.description ? `'${a.description.replace(/'/g, "''")}'` : 'NULL'}, ${image ? `'${image}'` : 'NULL'}, '${a.status}', '${toDate(a.createdAt)}', '${toDate(a.updatedAt)}');\n`
  }
  // 5. Positions (最后插入,因为引用 Artwork)
  for (const p of positions) {
    sql += `INSERT INTO "Position" (id, "roomId", name, "artworkId", "createdAt") VALUES ('${p.id}', '${p.roomId}', '${p.name}', ${p.artworkId ? `'${p.artworkId}'` : 'NULL'}, '${toDate(p.createdAt)}');\n`
  }

  const sqlFile = path.join(__dirname, 'migrate.sql')
  fs.writeFileSync(sqlFile, sql)
  console.log(`\n💾 SQL 文件已生成: migrate.sql`)
}

main()

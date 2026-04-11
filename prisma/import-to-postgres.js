const { execSync } = require('child_process')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const dbPath = path.join(__dirname, 'dev.db')
const prisma = new PrismaClient()

function query(sql) {
  const result = execSync(`sqlite3 ${dbPath} -json "${sql}"`, { encoding: 'utf8' })
  return JSON.parse(result || '[]')
}

function toDate(timestamp) {
  return new Date(parseInt(timestamp))
}

async function main() {
  console.log('📤 从 SQLite 读取数据...')
  
  const hotels = query('SELECT * FROM Hotel')
  const floors = query('SELECT * FROM Floor')
  const rooms = query('SELECT * FROM Room')
  const positions = query('SELECT * FROM Position')
  const artworks = query('SELECT * FROM Artwork')

  console.log(`✅ 读取到: ${hotels.length} 酒店, ${floors.length} 楼层, ${rooms.length} 房间, ${positions.length} 位置, ${artworks.length} 画作`)

  console.log('\n📥 导入到 PostgreSQL...')

  // 清空数据
  await prisma.artwork.deleteMany()
  await prisma.position.deleteMany()
  await prisma.room.deleteMany()
  await prisma.floor.deleteMany()
  await prisma.hotel.deleteMany()
  console.log('🗑  已清空 PostgreSQL 数据')

  // 插入 Hotels
  for (const h of hotels) {
    await prisma.hotel.create({
      data: {
        id: h.id,
        name: h.name,
        address: h.address || null,
        createdAt: toDate(h.createdAt)
      }
    })
    console.log(`✅ 酒店: ${h.name}`)
  }

  // 插入 Floors
  for (const f of floors) {
    await prisma.floor.create({
      data: {
        id: f.id,
        hotelId: f.hotelId,
        number: f.number,
        createdAt: toDate(f.createdAt)
      }
    })
  }
  console.log(`✅ ${floors.length} 个楼层`)

  // 插入 Rooms
  for (const r of rooms) {
    await prisma.room.create({
      data: {
        id: r.id,
        floorId: r.floorId,
        number: r.number,
        createdAt: toDate(r.createdAt)
      }
    })
  }
  console.log(`✅ ${rooms.length} 个房间`)

  // 插入 Artworks
  for (const a of artworks) {
    await prisma.artwork.create({
      data: {
        id: a.id,
        title: a.title,
        author: a.author,
        authorAge: a.authorAge,
        description: a.description || null,
        image: a.image || null,
        status: a.status,
        createdAt: toDate(a.createdAt),
        updatedAt: toDate(a.updatedAt)
      }
    })
    console.log(`✅ 画作: ${a.title}`)
  }

  // 插入 Positions
  for (const p of positions) {
    await prisma.position.create({
      data: {
        id: p.id,
        roomId: p.roomId,
        name: p.name,
        artworkId: p.artworkId || null,
        createdAt: toDate(p.createdAt)
      }
    })
  }
  console.log(`✅ ${positions.length} 个位置`)

  // 验证
  console.log('\n📊 PostgreSQL 数据验证:')
  console.log(`   - 酒店: ${await prisma.hotel.count()}`)
  console.log(`   - 楼层: ${await prisma.floor.count()}`)
  console.log(`   - 房间: ${await prisma.room.count()}`)
  console.log(`   - 位置: ${await prisma.position.count()}`)
  console.log(`   - 画作: ${await prisma.artwork.count()}`)

  console.log('\n🎉 迁移完成!')
  await prisma.$disconnect()
}

main().catch(e => {
  console.error('❌ 迁移失败:', e)
  process.exit(1)
})

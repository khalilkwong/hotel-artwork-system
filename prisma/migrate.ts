// 从 SQLite 导出数据并导入到 PostgreSQL
import { PrismaClient } from '@prisma/client'

// SQLite 数据库连接
const sqlitePrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db',
    },
  },
})

// PostgreSQL 数据库连接(使用环境变量)
const pgPrisma = new PrismaClient()

async function migrate() {
  console.log('📤 从 SQLite 导出数据...')

  // 1. 导出所有数据(按依赖关系顺序)
  const hotels = await sqlitePrisma.hotel.findMany({
    include: {
      floors: {
        include: {
          rooms: {
            include: {
              positions: {
                include: {
                  artwork: true,
                },
              },
            },
          },
        },
      },
    },
  })

  console.log(`✅ 导出 ${hotels.length} 个酒店`)

  // 统计数据
  let floorCount = 0
  let roomCount = 0
  let positionCount = 0
  let artworkCount = 0

  hotels.forEach((h) => {
    h.floors.forEach((f) => {
      floorCount++
      f.rooms.forEach((r) => {
        roomCount++
        r.positions.forEach((p) => {
          positionCount++
          if (p.artwork) artworkCount++
        })
      })
    })
  })

  console.log(`📊 数据统计:`)
  console.log(`   - 酒店: ${hotels.length}`)
  console.log(`   - 楼层: ${floorCount}`)
  console.log(`   - 房间: ${roomCount}`)
  console.log(`   - 位置: ${positionCount}`)
  console.log(`   - 画作: ${artworkCount}`)

  // 2. 导入到 PostgreSQL(需要清空现有数据)
  console.log('\n📥 导入到 PostgreSQL...')

  // 清空现有数据(按依赖关系逆序)
  await pgPrisma.artwork.deleteMany()
  await pgPrisma.position.deleteMany()
  await pgPrisma.room.deleteMany()
  await pgPrisma.floor.deleteMany()
  await pgPrisma.hotel.deleteMany()

  console.log('🗑  已清空 PostgreSQL 数据')

  // 3. 导入数据
  for (const hotel of hotels) {
    const { floors, ...hotelData } = hotel

    await pgPrisma.hotel.create({
      data: {
        ...hotelData,
        floors: {
          create: floors.map((floor) => ({
            number: floor.number,
            createdAt: floor.createdAt,
            rooms: {
              create: floor.rooms.map((room) => ({
                number: room.number,
                createdAt: room.createdAt,
                positions: {
                  create: room.positions.map((position) => ({
                    name: position.name,
                    createdAt: position.createdAt,
                    artworkId: position.artworkId,
                    ...(position.artwork
                      ? {
                          artwork: {
                            create: {
                              id: position.artwork.id,
                              title: position.artwork.title,
                              author: position.artwork.author,
                              authorAge: position.artwork.authorAge,
                              description: position.artwork.description,
                              image: position.artwork.image,
                              status: position.artwork.status,
                              createdAt: position.artwork.createdAt,
                              updatedAt: position.artwork.updatedAt,
                            },
                          },
                        }
                      : {}),
                  })),
                },
              })),
            },
          })),
        },
      },
    })

    console.log(`✅ 导入酒店: ${hotel.name}`)
  }

  console.log('\n🎉 迁移完成!')

  // 4. 验证
  const pgHotels = await pgPrisma.hotel.count()
  const pgFloors = await pgPrisma.floor.count()
  const pgRooms = await pgPrisma.room.count()
  const pgPositions = await pgPrisma.position.count()
  const pgArtworks = await pgPrisma.artwork.count()

  console.log('\n📋 PostgreSQL 数据验证:')
  console.log(`   - 酒店: ${pgHotels}`)
  console.log(`   - 楼层: ${pgFloors}`)
  console.log(`   - 房间: ${pgRooms}`)
  console.log(`   - 位置: ${pgPositions}`)
  console.log(`   - 画作: ${pgArtworks}`)

  await sqlitePrisma.$disconnect()
  await pgPrisma.$disconnect()
}

migrate().catch((e) => {
  console.error('❌ 迁移失败:', e)
  process.exit(1)
})

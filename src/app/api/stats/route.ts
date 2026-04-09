import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const [hotelCount, artworkCount, positionCount, emptyPositionCount, statusCounts] = await Promise.all([
    prisma.hotel.count(),
    prisma.artwork.count(),
    prisma.position.count(),
    prisma.position.count({ where: { artwork: null } }),
    prisma.artwork.groupBy({
      by: ['status'],
      _count: { status: true }
    })
  ])

  return NextResponse.json({
    hotelCount,
    artworkCount,
    positionCount,
    emptyPositionCount,
    statusCounts: Object.fromEntries(statusCounts.map(s => [s.status, s._count.status]))
  })
}

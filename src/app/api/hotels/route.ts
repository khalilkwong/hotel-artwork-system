import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const hotels = await prisma.hotel.findMany({
    include: {
      floors: {
        include: {
          rooms: {
            include: {
              positions: {
                include: { artwork: true }
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json(hotels)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const hotel = await prisma.hotel.create({
    data: { name: body.name, address: body.address }
  })
  return NextResponse.json(hotel, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await prisma.hotel.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

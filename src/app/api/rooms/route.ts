import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const room = await prisma.room.create({
    data: { floorId: body.floorId, number: body.number }
  })
  return NextResponse.json(room, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await prisma.room.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

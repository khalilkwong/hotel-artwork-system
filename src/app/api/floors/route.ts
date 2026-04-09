import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const floor = await prisma.floor.create({
    data: { hotelId: body.hotelId, number: body.number }
  })
  return NextResponse.json(floor, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await prisma.floor.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const position = await prisma.position.create({
    data: { roomId: body.roomId, name: body.name }
  })
  return NextResponse.json(position, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await prisma.position.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

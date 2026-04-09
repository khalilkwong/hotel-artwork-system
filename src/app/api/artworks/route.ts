import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const artworks = await prisma.artwork.findMany({
    include: {
      position: {
        include: {
          room: {
            include: {
              floor: {
                include: { hotel: true }
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json(artworks)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const artwork = await prisma.artwork.create({
    data: {
      title: body.title,
      author: body.author,
      authorAge: body.authorAge,
      description: body.description,
      image: body.image,
      status: body.status || 'pending'
    }
  })
  return NextResponse.json(artwork, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  
  // 如果要分配/更换位置
  if (body.positionId !== undefined) {
    // 如果新位置不为空，先解除原位置绑定
    if (body.positionId) {
      await prisma.position.updateMany({
        where: { artworkId: body.id },
        data: { artworkId: null }
      })
      // 清除新位置的占用（如果有）
      const existingArtwork = await prisma.position.findUnique({
        where: { id: body.positionId },
        select: { artworkId: true }
      })
      if (existingArtwork?.artworkId) {
        await prisma.artwork.updateMany({
          where: { id: existingArtwork.artworkId },
          data: { status: 'pending' }
        })
      }
      // 绑定新位置
      await prisma.position.update({
        where: { id: body.positionId },
        data: { artworkId: body.id }
      })
    } else {
      // 解除位置绑定
      await prisma.position.updateMany({
        where: { artworkId: body.id },
        data: { artworkId: null }
      })
    }
  }

  const artwork = await prisma.artwork.update({
    where: { id: body.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.author !== undefined && { author: body.author }),
      ...(body.authorAge !== undefined && { authorAge: body.authorAge }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.image !== undefined && { image: body.image }),
      ...(body.status !== undefined && { status: body.status })
    },
    include: {
      position: {
        include: {
          room: {
            include: {
              floor: {
                include: { hotel: true }
              }
            }
          }
        }
      }
    }
  })
  return NextResponse.json(artwork)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  
  // 先解除位置绑定
  await prisma.position.updateMany({
    where: { artworkId: id },
    data: { artworkId: null }
  })
  await prisma.artwork.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

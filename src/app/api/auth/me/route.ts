import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ user: null });
    }

    // Fetch fresh user & store details
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        store: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role,
        store: user.store,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ user: null, error: error.message });
  }
}

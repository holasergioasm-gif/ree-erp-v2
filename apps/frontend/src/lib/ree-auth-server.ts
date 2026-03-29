import { cookies } from 'next/headers';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { reePrisma } from '@gitroom/frontend/lib/ree-prisma';
import { NextResponse } from 'next/server';

export async function getReeAuthUser() {
  const cookieStore = await cookies();
  const auth = cookieStore.get('auth')?.value;
  if (!auth) {
    return null;
  }
  try {
    const payload = AuthService.verifyJWT(auth) as { id: string };
    const user = await reePrisma.user.findUnique({
      where: { id: payload.id },
    });
    if (!user?.activated) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export async function getReeAuthContext() {
  const user = await getReeAuthUser();
  if (!user) {
    return null;
  }
  const cookieStore = await cookies();
  const orgId = cookieStore.get('showorg')?.value;
  return { user, orgId };
}

export async function assertReeAuth() {
  const user = await getReeAuthUser();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { ok: true as const, user };
}

export async function assertReeAdmin() {
  const ctx = await getReeAuthContext();
  if (!ctx) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  const { user, orgId } = ctx;
  if (user.isSuperAdmin) {
    return { ok: true as const, user, orgId };
  }
  if (orgId) {
    const uo = await reePrisma.userOrganization.findFirst({
      where: {
        userId: user.id,
        organizationId: orgId,
        disabled: false,
        role: { in: ['ADMIN', 'SUPERADMIN'] },
      },
    });
    if (uo) {
      return { ok: true as const, user, orgId };
    }
  }
  return {
    ok: false as const,
    response: NextResponse.json({ error: 'Admin only' }, { status: 403 }),
  };
}

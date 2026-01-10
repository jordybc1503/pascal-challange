import { prisma } from '../../db/client.js';

export class UsersService {
  async listUsers(tenantId: string) {
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      createdAt: user.createdAt.toISOString(),
    }));
  }
}

export const usersService = new UsersService();

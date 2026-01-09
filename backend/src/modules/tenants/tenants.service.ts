import bcrypt from 'bcrypt';
import { prisma } from '../../db/client.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import { UserRole } from '@prisma/client';

export class TenantsService {
  /**
   * Create a new tenant with an admin user
   * Used for bootstrapping or by super-admin
   */
  async createTenant(name: string, slug: string, adminEmail: string, adminPassword: string, ruc?: string) {
    // Check if tenant slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      throw new ConflictError('Tenant slug already exists');
    }

    // Check if RUC already exists (if provided)
    if (ruc) {
      const existingRuc = await prisma.tenant.findUnique({
        where: { ruc },
      });
      if (existingRuc) {
        throw new ConflictError('RUC already exists');
      }
    }

    // Hash admin password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create tenant and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name,
          slug,
          ruc: ruc || null,
        },
      });

      // Create admin user for this tenant
      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: adminEmail,
          passwordHash,
          role: UserRole.TENANT_ADMIN,
        },
      });

      return {
        tenant,
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
        },
      };
    });

    return {
      id: result.tenant.id,
      name: result.tenant.name,
      slug: result.tenant.slug,
      ruc: result.tenant.ruc,
      createdAt: result.tenant.createdAt.toISOString(),
      admin: result.adminUser,
    };
  }

  /**
   * Get tenant by ID (only accessible by tenant members)
   */
  async getTenantById(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            users: true,
            leads: true,
            conversations: true,
            whatsappChannels: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      createdAt: tenant.createdAt.toISOString(),
      stats: {
        users: tenant._count.users,
        leads: tenant._count.leads,
        conversations: tenant._count.conversations,
        whatsappChannels: tenant._count.whatsappChannels,
      },
    };
  }
}

export const tenantsService = new TenantsService();

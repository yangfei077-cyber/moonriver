import { CredentialsMethod, OpenFgaClient } from '@openfga/sdk';

let fgaClient: OpenFgaClient | null = null;

export function getFgaClient(): OpenFgaClient | null {
  if (!process.env.FGA_STORE_ID || !process.env.FGA_API_URL) return null;

  if (!fgaClient) {
    fgaClient = new OpenFgaClient({
      apiUrl: process.env.FGA_API_URL,
      storeId: process.env.FGA_STORE_ID,
      authorizationModelId: process.env.FGA_MODEL_ID,
      credentials: process.env.FGA_CLIENT_ID
        ? {
            method: CredentialsMethod.ClientCredentials,
            config: {
              apiTokenIssuer: process.env.FGA_API_TOKEN_ISSUER!,
              apiAudience: process.env.FGA_API_AUDIENCE!,
              clientId: process.env.FGA_CLIENT_ID!,
              clientSecret: process.env.FGA_CLIENT_SECRET!,
            },
          }
        : undefined,
    });
  }
  return fgaClient;
}

const parseObjectIds = (objects: string[] = []): string[] =>
  objects
    .map((entry) => {
      const parts = entry.split(':');
      return parts.length > 1 ? parts.slice(1).join(':') : entry;
    })
    .filter(Boolean);

/**
 * Check if a user can perform an action on a resource.
 * Falls back to role-based check if FGA is not configured.
 */
export async function checkPermission(
  userId: string,
  relation: string,
  objectType: string,
  objectId: string,
  roles: string[] = []
): Promise<boolean> {
  const client = getFgaClient();

  if (client) {
    try {
      const { allowed } = await client.check({
        user: `user:${userId}`,
        relation,
        object: `${objectType}:${objectId}`,
      });
      return !!allowed;
    } catch (err) {
      console.error('[FGA] Check failed, falling back to role-based:', err);
    }
  }

  // Fallback: role-based permissions
  return checkRolePermission(roles, relation, objectType);
}

/**
 * List objects a user can access for a given relation and type.
 * Falls back to role-based filtering if FGA is not configured.
 */
export async function listAccessibleObjects(
  userId: string,
  relation: string,
  objectType: string,
  roles: string[] = []
): Promise<string[]> {
  const client = getFgaClient();

  if (client) {
    try {
      const response = await client.listObjects({
        user: `user:${userId}`,
        relation,
        type: objectType,
      });
      return response.objects || [];
    } catch (err) {
      console.error('[FGA] ListObjects failed, falling back to role-based:', err);
    }
  }

  return [];
}

/**
 * Write authorization tuples (e.g., when a student enrolls in a course).
 */
export async function writeTuples(
  tuples: { user: string; relation: string; object: string }[]
): Promise<boolean> {
  const client = getFgaClient();
  if (!client) return false;

  try {
    await client.write({ writes: tuples });
    return true;
  } catch (err) {
    console.error('[FGA] Write tuples failed:', err);
    return false;
  }
}

/**
 * Delete authorization tuples (e.g., when a student unenrolls).
 */
export async function deleteTuples(
  tuples: { user: string; relation: string; object: string }[]
): Promise<boolean> {
  const client = getFgaClient();
  if (!client) return false;

  try {
    await client.write({ deletes: tuples });
    return true;
  } catch (err) {
    console.error('[FGA] Delete tuples failed:', err);
    return false;
  }
}

// --- Role-based fallback permissions ---

const ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
  Admin: {
    course: ['view', 'edit', 'delete', 'view_enrollments', 'view_revenue'],
    student: ['view', 'view_progress', 'view_profile'],
    creator: ['view', 'view_earnings', 'view_profile'],
    appointment: ['view', 'cancel', 'view_all'],
    platform: ['view_stats', 'view_all_data', 'manage_users'],
  },
  Creator: {
    course: ['view', 'edit', 'view_enrollments'],
    student: ['view', 'view_progress'],
    creator: ['view'],
    appointment: ['view', 'cancel', 'create'],
    platform: [],
  },
  Student: {
    course: ['view', 'enroll'],
    student: [],
    creator: ['view'],
    appointment: ['view', 'create'],
    platform: [],
  },
};

function checkRolePermission(
  roles: string[],
  relation: string,
  objectType: string
): boolean {
  return roles.some((role) => {
    const perms = ROLE_PERMISSIONS[role]?.[objectType];
    return perms?.includes(relation) ?? false;
  });
}

/**
 * Get the data access scope for RAG based on user role and FGA.
 * Returns which data categories the user can query.
 */
export async function getDataAccessScope(
  userId: string,
  roles: string[]
): Promise<DataAccessScope> {
  const normalizedUserId = userId?.toLowerCase();
  const client = getFgaClient();

  const scope: DataAccessScope = {
    level: 'student',
    canViewAllStudents: false,
    canViewAllCreators: true,
    canViewAllCourses: true,
    canViewAllAppointments: false,
    canViewAllEnrollments: false,
    canViewPlatformStats: false,
    canViewRevenue: false,
    canViewOwnAppointments: true,
    canViewOwnEnrollments: true,
    canViewOwnCourses: true,
    restrictToEmail: normalizedUserId || null,
    managedCourseIds: [],
    hasFga: !!client,
  };

  if (!normalizedUserId) {
    return scope;
  }

  const isAdmin = await checkPermission(normalizedUserId, 'view_all_data', 'platform', 'moonriver', roles);

  if (isAdmin) {
    scope.level = 'admin';
    scope.canViewAllStudents = true;
    scope.canViewAllAppointments = true;
    scope.canViewAllEnrollments = true;
    scope.canViewPlatformStats = true;
    scope.canViewRevenue = true;
    scope.restrictToEmail = null;
    return scope;
  }

  if (client) {
    const creatorObjects = await listAccessibleObjects(normalizedUserId, 'creator', 'course', roles);
    const creatorCourseIds = parseObjectIds(creatorObjects);

    if (creatorCourseIds.length) {
      scope.level = 'creator';
      scope.managedCourseIds = creatorCourseIds;
      scope.canViewAllStudents = true;
      return scope;
    }
  }

  // Fallback to role metadata if needed
  if (roles.includes('Creator')) {
    scope.level = 'creator';
    scope.canViewAllStudents = true;
    return scope;
  }

  // Student-level: already restricted to their own data
  return scope;
}

export interface DataAccessScope {
  level: 'admin' | 'creator' | 'student';
  canViewAllStudents: boolean;
  canViewAllCreators: boolean;
  canViewAllCourses: boolean;
  canViewAllAppointments: boolean;
  canViewAllEnrollments: boolean;
  canViewPlatformStats: boolean;
  canViewRevenue: boolean;
  canViewOwnAppointments: boolean;
  canViewOwnEnrollments: boolean;
  canViewOwnCourses: boolean;
  restrictToEmail: string | null;
  managedCourseIds: string[];
  hasFga: boolean;
}

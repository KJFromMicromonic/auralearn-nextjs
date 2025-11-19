import 'dotenv/config';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { z } from 'zod';

/**
 * Default configuration constants for the Clerk export flow.
 */
const DEFAULT_CONFIG = {
  baseUrl: 'https://api.clerk.dev',
  outputPath: 'exports/clerk-dev-users.migration.json',
  rawOutputPath: 'exports/clerk-dev-users.raw.json',
  pageSize: 100,
} as const;

/**
 * zod schema for validating environment-driven configuration.
 */
const envSchema = z.object({
  CLERK_DEV_SECRET_KEY: z.string().min(1, 'CLERK_DEV_SECRET_KEY is required'),
  CLERK_DEV_API_BASE_URL: z.string().url().default(DEFAULT_CONFIG.baseUrl),
  CLERK_DEV_EXPORT_OUTPUT_PATH: z.string().default(DEFAULT_CONFIG.outputPath),
  CLERK_DEV_EXPORT_RAW_OUTPUT_PATH: z.string().default(DEFAULT_CONFIG.rawOutputPath),
  CLERK_DEV_EXPORT_PAGE_SIZE: z.coerce
    .number()
    .int()
    .min(1)
    .max(500)
    .default(DEFAULT_CONFIG.pageSize),
});

const env = envSchema.parse({
  CLERK_DEV_SECRET_KEY: process.env.CLERK_DEV_SECRET_KEY,
  CLERK_DEV_API_BASE_URL: process.env.CLERK_DEV_API_BASE_URL ?? DEFAULT_CONFIG.baseUrl,
  CLERK_DEV_EXPORT_OUTPUT_PATH:
    process.env.CLERK_DEV_EXPORT_OUTPUT_PATH ?? DEFAULT_CONFIG.outputPath,
  CLERK_DEV_EXPORT_RAW_OUTPUT_PATH:
    process.env.CLERK_DEV_EXPORT_RAW_OUTPUT_PATH ?? DEFAULT_CONFIG.rawOutputPath,
  CLERK_DEV_EXPORT_PAGE_SIZE:
    process.env.CLERK_DEV_EXPORT_PAGE_SIZE ?? DEFAULT_CONFIG.pageSize,
});

type ClerkListResponse<T> = {
  data: T[];
  total_count: number;
  limit: number;
  offset: number;
};

type ClerkEmailAddress = {
  id: string;
  email_address: string;
  verification?: {
    status?: string;
  };
};

export type TClerkUser = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email_addresses?: ClerkEmailAddress[];
  primary_email_address_id?: string | null;
  password_enabled?: boolean;
  created_at?: number;
  updated_at?: number;
  external_id?: string | null;
};

export type TMigrationUser = {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  passwordHasher?: string;
};

/**
 * Fetches a single page of Clerk users.
 *
 * @param offset Page offset for pagination
 * @returns Array of Clerk users for the requested page
 * @throws Error if the Clerk API call fails
 */
const hasArrayData = (value: unknown): value is { data?: unknown; items?: unknown } =>
  typeof value === 'object' && value !== null;

/**
 * Normalizes any Clerk list response shape to the shared structure.
 *
 * Clerk's API returns either `{ data: [...] }` or a bare array depending on the endpoint.
 *
 * @param payload Raw JSON payload returned by Clerk
 * @param offset Offset that was requested for the current page
 * @returns Normalized list response
 */
export function normalizeClerkListResponse<T>(
  payload: unknown,
  offset: number,
): ClerkListResponse<T> {
  if (Array.isArray(payload)) {
    return {
      data: payload as T[],
      limit: payload.length,
      total_count: payload.length,
      offset,
    };
  }

  if (hasArrayData(payload)) {
    const candidateData =
      Array.isArray((payload as { data?: unknown }).data)
        ? ((payload as { data?: unknown }).data as T[])
        : Array.isArray((payload as { items?: unknown }).items)
          ? ((payload as { items?: unknown }).items as T[])
          : [];

    const limit =
      typeof (payload as { limit?: unknown }).limit === 'number'
        ? ((payload as { limit?: number }).limit as number)
        : candidateData.length || env.CLERK_DEV_EXPORT_PAGE_SIZE;

    const totalCount =
      typeof (payload as { total_count?: unknown }).total_count === 'number'
        ? ((payload as { total_count?: number }).total_count as number)
        : candidateData.length;

    const effectiveOffset =
      typeof (payload as { offset?: unknown }).offset === 'number'
        ? ((payload as { offset?: number }).offset as number)
        : offset;

    if (!candidateData.length) {
      return {
        data: [],
        limit,
        total_count: totalCount,
        offset: effectiveOffset,
      };
    }

    return {
      data: candidateData,
      limit,
      total_count: totalCount,
      offset: effectiveOffset,
    };
  }

  throw new Error('Unexpected Clerk API response shape: missing user list data.');
}

export async function fetchClerkUsersPage(offset: number): Promise<ClerkListResponse<TClerkUser>> {
  const url = new URL('/v1/users', env.CLERK_DEV_API_BASE_URL);
  url.searchParams.set('limit', env.CLERK_DEV_EXPORT_PAGE_SIZE.toString());
  url.searchParams.set('offset', offset.toString());

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.CLERK_DEV_SECRET_KEY}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to fetch Clerk users (status ${response.status}): ${text || response.statusText}`,
    );
  }

  const payload = await response.json();
  return normalizeClerkListResponse<TClerkUser>(payload, offset);
}

/**
 * Retrieves all Clerk users by walking the paginated API.
 *
 * @returns Complete list of Clerk users
 */
export async function fetchAllClerkUsers(): Promise<TClerkUser[]> {
  const users: TClerkUser[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const page = await fetchClerkUsersPage(offset);
    users.push(...page.data);
    offset += page.limit;
    total = page.total_count;
    if (page.data.length === 0) {
      break;
    }
  }

  return users;
}

/**
 * Maps a Clerk user into the migration script format.
 *
 * @param user Raw Clerk user response
 * @returns Migration user payload or undefined if no email is available
 */
export function mapClerkUserToMigrationUser(user: TClerkUser): TMigrationUser | undefined {
  const email =
    user.email_addresses?.find((address) => address.id === user.primary_email_address_id)
      ?.email_address ?? user.email_addresses?.[0]?.email_address;

  if (!email) {
    return undefined;
  }

  const migrationUser: TMigrationUser = {
    userId: user.id,
    email,
  };

  if (user.first_name) {
    migrationUser.firstName = user.first_name;
  }

  if (user.last_name) {
    migrationUser.lastName = user.last_name;
  }

  return migrationUser;
}

/**
 * Persists both the migration-ready payload and the raw snapshot to disk.
 *
 * @param migrationUsers Sanitized users compatible with Clerk's migration script
 * @param rawUsers Full Clerk user objects for auditing
 */
export async function writeUserExports(
  migrationUsers: TMigrationUser[],
  rawUsers: TClerkUser[],
): Promise<void> {
  const normalizedOutputs = [
    { filePath: env.CLERK_DEV_EXPORT_OUTPUT_PATH, payload: migrationUsers },
    { filePath: env.CLERK_DEV_EXPORT_RAW_OUTPUT_PATH, payload: rawUsers },
  ];

  for (const { filePath, payload } of normalizedOutputs) {
    const resolvedPath = path.resolve(filePath);
    await mkdir(path.dirname(resolvedPath), { recursive: true });
    await writeFile(resolvedPath, JSON.stringify(payload, null, 2), 'utf-8');
  }
}

/**
 * Orchestrates the full export workflow end-to-end.
 */
export async function exportClerkDevUsers(): Promise<void> {
  console.info('Starting Clerk development export...');
  const users = await fetchAllClerkUsers();
  console.info(`Fetched ${users.length} users from Clerk dev instance.`);

  const migrationUsers: TMigrationUser[] = [];
  let skipped = 0;

  for (const user of users) {
    const mapped = mapClerkUserToMigrationUser(user);
    if (mapped) {
      migrationUsers.push(mapped);
    } else {
      skipped += 1;
      console.warn(`Skipping user ${user.id} because no email address is available.`);
    }
  }

  await writeUserExports(migrationUsers, users);
  console.info(`Export complete. ${migrationUsers.length} users ready for migration.`);
  if (skipped > 0) {
    console.warn(`${skipped} users were skipped due to missing email addresses.`);
  }
  console.info(`Migration file: ${path.resolve(env.CLERK_DEV_EXPORT_OUTPUT_PATH)}`);
  console.info(`Raw snapshot: ${path.resolve(env.CLERK_DEV_EXPORT_RAW_OUTPUT_PATH)}`);
}

if (process.argv[1]?.includes('export-dev-users')) {
  exportClerkDevUsers().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}


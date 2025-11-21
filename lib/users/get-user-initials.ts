/**
 * Calculates the initials to display for a user avatar.
 *
 * Prefers the provided full name, falling back to the email address
 * when the name is missing. The function always returns an uppercase,
 * single- or double-letter string so it can be rendered inside an avatar.
 *
 * @param fullName The optional full name of the user.
 * @param email The optional email address that can be used as a fallback.
 * @returns The initials string to render inside an avatar.
 * @example
 * ```typescript
 * const initials = getUserInitials('Jane Doe', 'jane@example.com');
 * console.log(initials); // "JD"
 * ```
 */
export function getUserInitials(fullName?: string | null, email?: string | null): string {
  const normalizedName = fullName?.trim();

  if (normalizedName) {
    const parts = normalizedName.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  if (email?.length) {
    return email[0].toUpperCase();
  }

  return 'U';
}



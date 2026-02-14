import bcrypt from "bcryptjs";
import { getEnv } from "@/lib/env";

/**
 * Verify a password against the master password hash from environment variables
 * @param password - Plain text password to verify
 * @returns True if password matches, false otherwise
 * 
 * To generate a password hash for MASTER_PASSWORD_HASH:
 * node -e "require('bcryptjs').hash('your_password', 10).then(console.log)"
 */
export async function verifyPassword(password: string): Promise<boolean> {
  const env = getEnv();
  const isValid = await bcrypt.compare(password, env.MASTER_PASSWORD_HASH);
  return isValid;
}

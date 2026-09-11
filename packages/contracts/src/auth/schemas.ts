import { z } from 'zod';
import { ROLES, type RoleCode } from '../rbac/rbac.js';
import { VERIFICATION_LEVELS, type VerificationLevel } from './types.js';

/**
 * Auth request/response schemas (Arch §5).
 *
 * These are the single definition of the wire contract: the API validates inbound
 * bodies with them, and the web app uses the inferred types, so the two cannot
 * drift. Validation failures surface as `ETN-VAL-001` with a per-field map.
 */

/**
 * Email rules.
 *
 * The database column is `citext`, so case is normalised by PostgreSQL and two
 * registrations differing only in case collide at commit (PRD CV-01). We still
 * lowercase here so audit rows and emails show one canonical form.
 */
export const EmailSchema = z
  .string()
  .trim()
  .min(3)
  .max(254, 'An email address can be at most 254 characters.')
  .email('Enter a valid email address.')
  .transform((value) => value.toLowerCase());

/**
 * Password policy (Arch §5.3): minimum 10 characters, light complexity.
 *
 * Deliberately not enforced with a regex soup — length is the dominant factor and
 * over-strict composition rules push people toward predictable substitutions. The
 * breach-list check runs server-side at hash time (decision E-3), not here.
 */
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;

export const PasswordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${String(MIN_PASSWORD_LENGTH)} characters.`)
  // Cap it: Argon2id over a very large input is a cheap way to burn server CPU.
  .max(MAX_PASSWORD_LENGTH, 'That password is too long.')
  .refine((value) => /[a-z]/.test(value) && /[A-Z0-9]/.test(value), {
    message: 'Mix lower-case letters with at least one upper-case letter or number.',
  });

/** E.164 with the leading `+` (GC-1). Nepal numbers are 10 digits after +977. */
export const PhoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/, 'Enter a phone number in international format, e.g. +9779812345678.');

export const PersonNameSchema = z
  .string()
  .trim()
  .min(1, 'This field is required.')
  .max(80, 'Use at most 80 characters.');

export const LocaleSchema = z
  .string()
  .trim()
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Use a locale like "en" or "ne-NP".');
export const TimezoneSchema = z.string().trim().min(1).max(64);
export const CurrencySchema = z
  .string()
  .trim()
  .length(3)
  .transform((v) => v.toUpperCase());

// ---------------------------------------------------------------- registration

export const RegisterRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  firstName: PersonNameSchema,
  lastName: PersonNameSchema,
  phone: PhoneSchema.optional(),
  countryId: z.string().trim().min(1).optional(),
  preferredCurrency: CurrencySchema.optional(),
  preferredLocale: LocaleSchema.optional(),
  timezone: TimezoneSchema.optional(),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

// ---------------------------------------------------------------------- login

export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Enter your password.'),
  /** Present when the client is answering a TOTP challenge (Arch §5.4). */
  mfaCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code.')
    .optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/**
 * The login response.
 *
 * The **refresh token is never in the body** — it is set as an `httpOnly` cookie
 * (Arch §5.2) so script running in the page cannot read it. Only the short-lived
 * access token is returned, for the client to hold in memory.
 */
export interface LoginResponse {
  accessToken: string;
  /** Seconds until the access token expires; the client refreshes before this. */
  expiresIn: number;
  tokenType: 'Bearer';
  user: PublicUser;
  /**
   * Set when the account must complete a step before it is usable. The client
   * routes on this instead of guessing from the user's fields.
   */
  pending?: 'MFA_ENROLLMENT' | 'EMAIL_VERIFICATION';
  /** Returned with `pending: 'MFA_ENROLLMENT'` so the client can render the QR. */
  mfaChallenge?: MfaChallenge;
}

// --------------------------------------------------------------- email verify

export const VerifyEmailRequestSchema = z.object({
  token: z.string().trim().min(16, 'That link is not valid.'),
});
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;

export const ResendVerificationRequestSchema = z.object({ email: EmailSchema });
export type ResendVerificationRequest = z.infer<typeof ResendVerificationRequestSchema>;

// -------------------------------------------------------------- password reset

export const ForgotPasswordRequestSchema = z.object({ email: EmailSchema });
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

export const ResetPasswordRequestSchema = z.object({
  token: z.string().trim().min(16, 'That link is not valid.'),
  password: PasswordSchema,
});
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

// ------------------------------------------------------------ change password

export const ChangePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: PasswordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: 'The new password must be different from the current one.',
    path: ['newPassword'],
  });
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;

// -------------------------------------------------------------------- profile

export const UpdateProfileRequestSchema = z
  .object({
    firstName: PersonNameSchema.optional(),
    lastName: PersonNameSchema.optional(),
    phone: PhoneSchema.nullable().optional(),
    countryId: z.string().trim().min(1).nullable().optional(),
    preferredCurrency: CurrencySchema.optional(),
    preferredLocale: LocaleSchema.optional(),
    timezone: TimezoneSchema.nullable().optional(),
  })
  // An empty patch is a client bug; reject rather than silently no-op.
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update.' });
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

// ------------------------------------------------------------------------ MFA

export const ConfirmMfaRequestSchema = z.object({
  /** Id of the pending enrollment returned by `POST /v1/auth/mfa/enroll`. */
  enrollmentId: z.string().trim().min(1),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code.'),
});
export type ConfirmMfaRequest = z.infer<typeof ConfirmMfaRequestSchema>;

export const VerifyMfaRequestSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code.'),
});
export type VerifyMfaRequest = z.infer<typeof VerifyMfaRequestSchema>;

/** What the client needs to render an authenticator QR (RFC 6238 + keyuri). */
export interface MfaChallenge {
  enrollmentId: string;
  /** `otpauth://totp/...` — render as a QR code; never logged. */
  keyUri: string;
  /** Base32 secret, shown once for manual entry. Never returned again. */
  secret: string;
  issuer: string;
  period: number;
  digits: number;
  algorithm: 'SHA1';
}

// --------------------------------------------------------------- vendor signup

export const VendorRegisterRequestSchema = z.object({
  // The owner's personal credentials — a vendor account is a user plus an org.
  email: EmailSchema,
  password: PasswordSchema,
  firstName: PersonNameSchema,
  lastName: PersonNameSchema,
  phone: PhoneSchema.optional(),
  // Business information (DB §6.1).
  businessName: z.string().trim().min(2, 'Enter the registered business name.').max(160),
  businessEmail: EmailSchema,
  businessPhone: PhoneSchema.optional(),
  website: z.url('Enter a valid website address.').optional(),
  countryId: z.string().trim().min(1).optional(),
  addressText: z.string().trim().max(500).optional(),
  /** Lines the vendor wants to sell; each needs separate approval (PRD VA-05). */
  serviceLines: z
    .array(
      z.enum([
        'TOUR',
        'TREK',
        'HOTEL',
        'VEHICLE',
        'TRANSFER',
        'TRANSPORTATION',
        'PACKAGE',
        'FLIGHT',
      ]),
    )
    .min(1, 'Select at least one service line.')
    .max(9),
});
export type VendorRegisterRequest = z.infer<typeof VendorRegisterRequestSchema>;

export const UpdateVendorProfileRequestSchema = z
  .object({
    businessName: z.string().trim().min(2).max(160).optional(),
    businessEmail: EmailSchema.optional(),
    businessPhone: PhoneSchema.nullable().optional(),
    website: z.url().nullable().optional(),
    addressText: z.string().trim().max(500).nullable().optional(),
    countryId: z.string().trim().min(1).nullable().optional(),
    stateId: z.string().trim().min(1).nullable().optional(),
    districtId: z.string().trim().min(1).nullable().optional(),
    about: z.string().trim().max(4000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update.' });
export type UpdateVendorProfileRequest = z.infer<typeof UpdateVendorProfileRequestSchema>;

/** Admin approval / rejection / suspension of a vendor organisation. */
export const VendorDecisionRequestSchema = z
  .object({
    decision: z.enum(['APPROVE', 'REJECT', 'SUSPEND', 'REINSTATE']),
    reason: z
      .string()
      .trim()
      .max(1000)
      // Required for the decisions that take something away from the vendor, so the
      // action is always explainable in the audit trail (AZ-05).
      .optional(),
  })
  .refine((value) => value.decision === 'APPROVE' || (value.reason?.length ?? 0) > 0, {
    message: 'A reason is required when rejecting or suspending.',
    path: ['reason'],
  });
export type VendorDecisionRequest = z.infer<typeof VendorDecisionRequestSchema>;

// ------------------------------------------------------------- public payloads

/**
 * The user shape sent to clients.
 *
 * Deliberately excludes `passwordHash`, `bannedReason` and any MFA secret. Arch
 * §5.2 also forbids PII in JWT claims, so this is the only place identity is
 * serialised.
 */
export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  verificationLevel: VerificationLevel;
  roles: RoleCode[];
  preferredCurrency: string;
  preferredLocale: string;
  timezone: string | null;
  /** True when the account must have a verified TOTP enrollment (Arch §5.1). */
  mfaRequired: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ActiveSession {
  id: string;
  familyId: string;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  /** The session the caller is currently using — cannot revoke itself by accident. */
  current: boolean;
}

export interface VendorProfile {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  status: string;
  website: string | null;
  addressText: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  suspensionReason: string | null;
  serviceLines: { line: string; status: string; expiryDate: string | null }[];
  createdAt: string;
}

export const RoleCodeSchema = z.enum(ROLES);
export const VerificationLevelSchema = z.enum(VERIFICATION_LEVELS);

// 从统一类型导出，保持向后兼容
export {
  User,
  UserRole,
  UserStatus,
  SubscriptionTier,
  UserStats,
  ApiKey,
  LoginRequest,
  RegisterRequest,
  AuthTokens,
} from "./unifiedTypes";

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileRequest {
  username?: string;
  bio?: string;
  company?: string;
  position?: string;
  website?: string;
  location?: string;
}

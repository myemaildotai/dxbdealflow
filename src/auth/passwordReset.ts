export const PASSWORD_UPDATED_LOGIN_MESSAGE = "Password updated successfully. Please login again.";
export const PASSWORD_RESET_SENT_MESSAGE = "Password reset link sent successfully. Please check your email.";
export const PASSWORD_RESET_FAILED_MESSAGE = "Unable to send password reset link. Please try again.";
export const NO_BROKER_ACCOUNT_MESSAGE = "No broker account found with this email address.";

export type PasswordResetRequestStatus = "sent" | "not_found" | "send_failed";

export type PasswordResetRequestResult = {
  status: PasswordResetRequestStatus;
  message: string;
};

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateNewPassword(password: string, confirmPassword: string) {
  if (!password) {
    return "Please enter a new password.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must include at least one letter and one number.";
  }

  if (!confirmPassword) {
    return "Please confirm your new password.";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return "";
}

export function getFriendlyPasswordResetError() {
  return PASSWORD_RESET_FAILED_MESSAGE;
}

export function getFriendlyPasswordUpdateError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("session") || message.includes("token") || message.includes("expired")) {
    return "This reset link is invalid or has expired. Please request a new one.";
  }

  if (message.includes("password") || message.includes("weak")) {
    return "Please choose a stronger password and try again.";
  }

  if (message.includes("network") || message.includes("fetch")) {
    return "We could not reach the server. Please check your connection and try again.";
  }

  return "We could not update your password right now. Please try again.";
}

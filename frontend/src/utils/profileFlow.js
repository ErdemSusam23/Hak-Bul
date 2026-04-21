export function normalizeProfileState({ profile, authUser }) {
  return {
    id: profile?.id || authUser?.id || null,
    email: profile?.email || authUser?.email || '',
    role: profile?.role || authUser?.rol || authUser?.role || 'user',
  };
}

export function buildAccountUpdatePayload({ email, currentPassword }) {
  const trimmedEmail = email.trim();
  const trimmedPassword = currentPassword.trim();

  if (!trimmedPassword) {
    throw new Error('Mevcut şifre gerekli.');
  }

  return {
    email: trimmedEmail,
    mevcut_sifre: trimmedPassword,
  };
}

export function buildPasswordUpdatePayload({ currentPassword, nextPassword, confirmPassword }) {
  const trimmedCurrentPassword = currentPassword.trim();
  const trimmedNextPassword = nextPassword.trim();
  const trimmedConfirmPassword = confirmPassword.trim();

  if (!trimmedCurrentPassword) {
    throw new Error('Mevcut şifre gerekli.');
  }

  if (trimmedNextPassword.length < 8) {
    throw new Error('Yeni şifre en az 8 karakter olmalı.');
  }

  if (trimmedNextPassword !== trimmedConfirmPassword) {
    throw new Error('Şifreler eşleşmiyor.');
  }

  return {
    yeni_sifre: trimmedNextPassword,
    mevcut_sifre: trimmedCurrentPassword,
  };
}

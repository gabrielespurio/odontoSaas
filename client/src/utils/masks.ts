// Utility functions for input masks

export const applyCnpjMask = (value: string): string => {
  const numericValue = value.replace(/\D/g, '');
  if (numericValue.length <= 14) {
    return numericValue
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return numericValue.substring(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

export const applyPhoneMask = (value: string): string => {
  const numericValue = value.replace(/\D/g, '');
  if (numericValue.length <= 11) {
    return numericValue
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4,5})(\d{4})$/, '$1-$2');
  }
  return numericValue.substring(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{4})$/, '$1-$2');
};

export const applyCepMask = (value: string): string => {
  const numericValue = value.replace(/\D/g, '');
  if (numericValue.length <= 8) {
    return numericValue.replace(/(\d{5})(\d)/, '$1-$2');
  }
  return numericValue.substring(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
};

export const removeMask = (value: string): string => {
  return value.replace(/\D/g, '');
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateCnpj = (cnpj: string): boolean => {
  const numericCnpj = removeMask(cnpj);
  return numericCnpj.length === 14;
};

export const validateCep = (cep: string): boolean => {
  const numericCep = removeMask(cep);
  return numericCep.length === 8;
};
import { describe, expect, it } from 'vitest';
import { isThemeValue } from '@/modules/theme/theme.constants';
import { toThemePreference, toThemeValue } from '@/modules/theme/theme.service';

describe('Dark mode (Estágio 19) — conversão de tema', () => {
  it('isThemeValue só aceita "light" ou "dark"', () => {
    expect(isThemeValue('light')).toBe(true);
    expect(isThemeValue('dark')).toBe(true);
    expect(isThemeValue('DARK')).toBe(false);
    expect(isThemeValue(undefined)).toBe(false);
    expect(isThemeValue('')).toBe(false);
    expect(isThemeValue('sistema')).toBe(false);
  });

  it('toThemeValue converte o enum de banco pro valor de cookie/DOM', () => {
    expect(toThemeValue('DARK')).toBe('dark');
    expect(toThemeValue('LIGHT')).toBe('light');
  });

  it('toThemePreference converte o valor de cookie/DOM pro enum de banco', () => {
    expect(toThemePreference('dark')).toBe('DARK');
    expect(toThemePreference('light')).toBe('LIGHT');
  });

  it('as duas conversões são inversas uma da outra', () => {
    expect(toThemeValue(toThemePreference('dark'))).toBe('dark');
    expect(toThemeValue(toThemePreference('light'))).toBe('light');
  });
});

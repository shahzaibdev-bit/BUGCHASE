import { Country } from 'country-state-city';
import type { ICountry } from 'country-state-city';

export type ProfileCountry = Pick<ICountry, 'name' | 'isoCode' | 'flag'>;

function buildProfileCountries(): ProfileCountry[] {
  const all = Country.getAllCountries() as ICountry[];
  const pakistan = all.find((c) => c.isoCode === 'PK');
  const rest = all
    .filter((c) => c.isoCode !== 'PK')
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  const ordered = pakistan ? [pakistan, ...rest] : rest;
  return ordered.map((c) => ({ name: c.name, isoCode: c.isoCode, flag: c.flag }));
}

/** All countries: Pakistan first, then A–Z by name. Flags from `country-state-city`. */
export const PROFILE_COUNTRIES: ProfileCountry[] = buildProfileCountries();

export function getProfileCountryByName(name: string | undefined | null): ProfileCountry | undefined {
  if (!name?.trim()) return undefined;
  return PROFILE_COUNTRIES.find((c) => c.name === name);
}

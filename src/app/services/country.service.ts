// src/app/services/country.service.ts - Version that definitely works
import { Injectable } from '@angular/core';
// @ts-ignore
import countries from 'world-countries';

export interface Country {
  name: string;
  code: string;
  flag: string;
}

@Injectable({
  providedIn: 'root',
})
export class CountryService {
  private countriesList: Country[] = [];

  constructor() {
    this.initializeCountries();
  }

  private initializeCountries() {
    this.countriesList = countries
      .map((country: any) => ({
        name: country.name.common,
        code: country.cca2,
        flag: `https://flagcdn.com/16x12/${country.cca2.toLowerCase()}.png`,
      }))
      .sort((a: Country, b: Country) => a.name.localeCompare(b.name));
  }

  getAllCountries(): Country[] {
    return this.countriesList;
  }

  getPopularCountries(): Country[] {
    const popularCodes = [
      'US',
      'GB',
      'CA',
      'AU',
      'DE',
      'FR',
      'JP',
      'PH',
      'IN',
      'BR',
    ];
    return this.countriesList.filter((country) =>
      popularCodes.includes(country.code)
    );
  }

  searchCountries(term: string): Country[] {
    if (!term) return this.getAllCountries();

    return this.countriesList.filter((country) =>
      country.name.toLowerCase().includes(term.toLowerCase())
    );
  }
}

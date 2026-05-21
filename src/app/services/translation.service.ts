import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  // State management
  private currentLangSubject = new BehaviorSubject<string>('en');
  public currentLang$ = this.currentLangSubject.asObservable();

  private directionSubject = new BehaviorSubject<string>('ltr');
  public direction$ = this.directionSubject.asObservable();

  // Dictionary
  private translations: { [key: string]: { [key: string]: string } } = {
    en: {
      dashboard: 'Dashboard',
      myCars: 'My Cars',
      list: 'Car List',
      addCar: 'Add Car',
      finance: 'Finance',
      users: 'Users',
      statistics: 'Statistics',
      logout: 'Logout',
      logo: 'AGOCAR'
    },
    fr: {
      dashboard: 'Tableau de bord',
      myCars: 'Mes Voitures',
      list: 'Liste des Voitures',
      addCar: 'Ajouter Voiture',
      finance: 'Finance',
      users: 'Utilisateurs',
      statistics: 'Statistiques',
      logout: 'Déconnexion',
      logo: 'AGOCAR'
    },
    ar: {
      dashboard: 'لوحة التحكم',
      myCars: 'سياراتي',
      list: 'قائمة السيارات',
      addCar: 'إضافة سيارة',
      finance: 'الجداول المالية',
      users: 'المستخدمين',
      statistics: 'الإحصائيات',
      logout: 'تسجيل خروج',
      logo: 'AGOCAR'
    }
  };

  constructor() {
    // 1. Auto-detect browser language
    const browserLang = navigator.language.split('-')[0]; // e.g., 'en' from 'en-US'
    
    if (this.translations[browserLang]) {
      this.setLanguage(browserLang);
    } else {
      this.setLanguage('en');
    }
  }

  setLanguage(lang: string) {
    if (!this.translations[lang]) return; // Ignore invalid langs

    this.currentLangSubject.next(lang);

    // Set Direction (Arabic is RTL, others LTR)
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    this.directionSubject.next(dir);
  }

  translate(key: string): string {
    const lang = this.currentLangSubject.value;
    return this.translations[lang][key] || key; // Fallback to key if missing
  }

  getDirection(): string {
    return this.directionSubject.value;
  }
}
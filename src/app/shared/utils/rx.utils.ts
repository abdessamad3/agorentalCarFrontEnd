import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export function safe<T = any>(obs: Observable<T>): Observable<T | any[]> {
  return obs.pipe(catchError(() => of([])));
}

export function toArr<T = any>(r: any): T[] {
  return Array.isArray(r) ? r : (r?.data ?? r?.['hydra:member'] ?? []);
}

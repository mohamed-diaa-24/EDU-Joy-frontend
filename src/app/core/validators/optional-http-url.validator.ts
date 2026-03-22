import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Allows empty; otherwise requires a valid `http:` or `https:` URL. */
export function optionalHttpUrlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '').toString().trim();
    if (!value) {
      return null;
    }
    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { optionalHttpUrl: true };
      }
      return null;
    } catch {
      return { optionalHttpUrl: true };
    }
  };
}

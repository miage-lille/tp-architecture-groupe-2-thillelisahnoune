//Définition d'un générateur de dates.
export const I_DATE_GENERATOR = 'I_DATE_GENERATOR';
export interface IDateGenerator {
  now(): Date;
}

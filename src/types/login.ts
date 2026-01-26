export type CalendarSystem = 'ad' | 'roc'

export interface LoginFormState {
  name: string
  birthYear: string | number
  birthMonth: string | number
  educationYears: string | number
  gender: 'male' | 'female' | 'other' | 'unknown'
}

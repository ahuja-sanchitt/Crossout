import type { TimeOfDay } from './types';

export const TIME_OF_DAY_ORDER: TimeOfDay[] = ['morning', 'evening', 'night'];

export const TIME_OF_DAY_LABEL: Record<TimeOfDay, string> = {
  morning: 'Morning',
  evening: 'Evening',
  night: 'Night',
};

export function currentTimeOfDay(hour: number): TimeOfDay {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'evening';
  return 'night';
}

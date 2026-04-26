export type MeasurementSystem = 'metric' | 'imperial';

export const DEFAULT_MEASUREMENT_SYSTEM: MeasurementSystem = 'metric';
export const MEASUREMENT_SYSTEM_SETTING_KEY = 'measurement_system';

export const POUNDS_PER_KILOGRAM = 2.2046226218;
export const INCHES_PER_CENTIMETER = 0.3937007874;
export const GRAMS_PER_OUNCE = 28.349523125;
export const OUNCES_PER_100_GRAMS = 100 / GRAMS_PER_OUNCE;
export const MILLILITERS_PER_FLUID_OUNCE = 29.5735295625;

export const isMeasurementSystem = (value: string | null): value is MeasurementSystem =>
  value === 'metric' || value === 'imperial';

const toRoundedString = (value: number, fractionDigits: number): string => {
  const rounded = Number(value.toFixed(fractionDigits));
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(fractionDigits);
};

const parseDisplayNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getWeightUnitLabel = (system: MeasurementSystem): string =>
  system === 'metric' ? 'kg' : 'lb';

export const getHeightUnitLabel = (system: MeasurementSystem): string =>
  system === 'metric' ? 'cm' : 'in';

export const getFoodWeightUnitLabel = (system: MeasurementSystem): string =>
  system === 'metric' ? 'g' : 'oz';

export const getWaterUnitLabel = (system: MeasurementSystem): string =>
  system === 'metric' ? 'ML' : 'FL OZ';

export const getMacroDensityLabel = (system: MeasurementSystem): string =>
  system === 'metric' ? '100g' : 'OZ';

export const formatWeightFromKilograms = (
  kilograms: number,
  system: MeasurementSystem,
  fractionDigits: number = 1
): string =>
  toRoundedString(
    system === 'metric' ? kilograms : kilograms * POUNDS_PER_KILOGRAM,
    fractionDigits
  );

export const formatHeightFromCentimeters = (
  centimeters: number,
  system: MeasurementSystem,
  fractionDigits: number = 1
): string =>
  toRoundedString(
    system === 'metric' ? centimeters : centimeters * INCHES_PER_CENTIMETER,
    fractionDigits
  );

export const formatFoodWeightFromGrams = (
  grams: number,
  system: MeasurementSystem,
  fractionDigits: number = 1
): string =>
  toRoundedString(system === 'metric' ? grams : grams / GRAMS_PER_OUNCE, fractionDigits);

export const formatWaterAmountFromMilliliters = (
  milliliters: number,
  system: MeasurementSystem,
  fractionDigits: number = 1
): string =>
  toRoundedString(
    system === 'metric' ? milliliters : milliliters / MILLILITERS_PER_FLUID_OUNCE,
    system === 'metric' ? 0 : fractionDigits
  );

export const formatNutritionFromPer100g = (
  per100gValue: number,
  system: MeasurementSystem,
  fractionDigits: number = 1
): string =>
  toRoundedString(
    system === 'metric' ? per100gValue : per100gValue / OUNCES_PER_100_GRAMS,
    fractionDigits
  );

export const formatWeightInputFromMetricString = (
  metricValue: string,
  system: MeasurementSystem
): string => {
  const parsed = parseDisplayNumber(metricValue);
  return parsed === null ? metricValue : formatWeightFromKilograms(parsed, system);
};

export const formatHeightInputFromMetricString = (
  metricValue: string,
  system: MeasurementSystem
): string => {
  const parsed = parseDisplayNumber(metricValue);
  return parsed === null ? metricValue : formatHeightFromCentimeters(parsed, system);
};

export const formatFoodWeightInputFromMetricString = (
  metricValue: string,
  system: MeasurementSystem
): string => {
  const parsed = parseDisplayNumber(metricValue);
  return parsed === null ? metricValue : formatFoodWeightFromGrams(parsed, system);
};

export const formatNutritionInputFromMetricString = (
  metricValue: string,
  system: MeasurementSystem
): string => {
  const parsed = parseDisplayNumber(metricValue);
  return parsed === null ? metricValue : formatNutritionFromPer100g(parsed, system);
};

export const convertDisplayWeightToKilograms = (
  displayValue: number,
  system: MeasurementSystem
): number => (system === 'metric' ? displayValue : displayValue / POUNDS_PER_KILOGRAM);

export const convertDisplayHeightToCentimeters = (
  displayValue: number,
  system: MeasurementSystem
): number => (system === 'metric' ? displayValue : displayValue / INCHES_PER_CENTIMETER);

export const convertDisplayFoodWeightToGrams = (
  displayValue: number,
  system: MeasurementSystem
): number => (system === 'metric' ? displayValue : displayValue * GRAMS_PER_OUNCE);

export const convertDisplayWaterToMilliliters = (
  displayValue: number,
  system: MeasurementSystem
): number =>
  system === 'metric' ? displayValue : displayValue * MILLILITERS_PER_FLUID_OUNCE;

export const convertDisplayNutritionToPer100g = (
  displayValue: number,
  system: MeasurementSystem
): number => (system === 'metric' ? displayValue : displayValue * OUNCES_PER_100_GRAMS);

export const normalizeWeightInputToMetricString = (
  displayValue: string,
  system: MeasurementSystem
): string => {
  const parsed = parseDisplayNumber(displayValue);
  if (parsed === null) {
    return displayValue.trim();
  }

  return toRoundedString(convertDisplayWeightToKilograms(parsed, system), 2);
};

export const normalizeHeightInputToMetricString = (
  displayValue: string,
  system: MeasurementSystem
): string => {
  const parsed = parseDisplayNumber(displayValue);
  if (parsed === null) {
    return displayValue.trim();
  }

  return toRoundedString(convertDisplayHeightToCentimeters(parsed, system), 2);
};

export const normalizeFoodWeightInputToMetricString = (
  displayValue: string,
  system: MeasurementSystem
): string => {
  const parsed = parseDisplayNumber(displayValue);
  if (parsed === null) {
    return displayValue.trim();
  }

  return toRoundedString(convertDisplayFoodWeightToGrams(parsed, system), 2);
};

export const normalizeNutritionInputToMetricString = (
  displayValue: string,
  system: MeasurementSystem
): string => {
  const parsed = parseDisplayNumber(displayValue);
  if (parsed === null) {
    return displayValue.trim();
  }

  return toRoundedString(convertDisplayNutritionToPer100g(parsed, system), 2);
};

export const getBaseFoodUnitGrams = (system: MeasurementSystem): number =>
  system === 'metric' ? 1 : GRAMS_PER_OUNCE;

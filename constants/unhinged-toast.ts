const UNHINGED_TOAST_MESSAGES = [
  'LOGGED. MOVING ON.',
  'MEAL SAVED. CARRY ON.',
  'THAT COUNTS.',
  'LOCKED IN.',
  'ONE MORE FOR THE LEDGER.',
  'NUMBERS NOTED.',
  'MEAL SAVED. NICE.',
  'YOU ATE. WE WROTE IT DOWN.',
  'RECORDED. NO DRAMA.',
  'DONE. NEXT THING.',
] as const;

export const getRandomToastMessage = () => {
  const randomIndex = Math.floor(Math.random() * UNHINGED_TOAST_MESSAGES.length);
  return UNHINGED_TOAST_MESSAGES[randomIndex];
};

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

const LIBRARY_TOAST_MESSAGES = [
  'LIBRARY UPDATED. LOOK AT YOU.',
  'FILED AWAY. CLEAN.',
  'LOCKED IN. NO NOTES.',
  'THE FOOD FILE JUST GOT BIGGER.',
  'BANKED. NICE.',
  'STORED. CHAOS, BUT ORGANIZED.',
  'CATALOGED. YOU DID THE THING.',
  'SAVED. ZERO DRAMA.',
  'VAULT UPDATED. CARRY ON.',
  'ONE MORE FOR THE LIBRARY.',
] as const;

export const getRandomToastMessage = () => {
  const randomIndex = Math.floor(Math.random() * UNHINGED_TOAST_MESSAGES.length);
  return UNHINGED_TOAST_MESSAGES[randomIndex];
};

export const getRandomLibraryToastMessage = () => {
  const randomIndex = Math.floor(Math.random() * LIBRARY_TOAST_MESSAGES.length);
  return LIBRARY_TOAST_MESSAGES[randomIndex];
};

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

const LEDGER_EMPTY_MESSAGES = [
  'LEDGER EMPTY. PEACEFUL. SUSPICIOUS.',
  'NOTHING LOGGED. THE DAY IS STILL CLEAN.',
  'NO ENTRIES YET. GO MAKE THE NUMBERS HAPPEN.',
  'THE LEDGER IS QUIET. FOR NOW.',
  'BLANK PAGE ENERGY.',
  'ZERO LOGS. ZERO CHAOS. TEMPORARY.',
  'NO FOOD CRIMES DOCUMENTED YET.',
  'THE RECEIPTS ARE MISSING. EAT SOMETHING.',
  'DAY STARTER PACK: ABSOLUTELY NOTHING.',
  'THE VOID STARES BACK. LOG WHAT YOU ATE.',
] as const;

const LOG_MEAL_CTA_MESSAGES = [
  'LOCK THIS MEAL IN.',
  'PUT IT IN THE LEDGER.',
  'WRITE THAT DOWN.',
  'FEED THE DATABASE.',
  'YES, THAT COUNTS.',
  'BANK THE BITE.',
  'LOG THE DAMAGE.',
  'MAKE IT OFFICIAL.',
  'FILE THE SNACK CRIME.',
  'TELL THE NUMBERS.',
] as const;

export const getRandomToastMessage = () => {
  const randomIndex = Math.floor(Math.random() * UNHINGED_TOAST_MESSAGES.length);
  return UNHINGED_TOAST_MESSAGES[randomIndex];
};

export const getRandomLibraryToastMessage = () => {
  const randomIndex = Math.floor(Math.random() * LIBRARY_TOAST_MESSAGES.length);
  return LIBRARY_TOAST_MESSAGES[randomIndex];
};

export const getRandomLedgerEmptyMessage = () => {
  const randomIndex = Math.floor(Math.random() * LEDGER_EMPTY_MESSAGES.length);
  return LEDGER_EMPTY_MESSAGES[randomIndex];
};

export const getRandomLogMealCtaMessage = () => {
  const randomIndex = Math.floor(Math.random() * LOG_MEAL_CTA_MESSAGES.length);
  return LOG_MEAL_CTA_MESSAGES[randomIndex];
};

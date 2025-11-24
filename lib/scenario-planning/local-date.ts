type LocalDate = { y: number; m: number; d: number };

const ld = (y: number, m: number, d: number): LocalDate => ({ y, m, d });

const fromJSDate = (d: Date): LocalDate =>
  ld(d.getFullYear(), d.getMonth() + 1, d.getDate());

const toKeyMonth = (d: LocalDate): string =>
  `${d.y.toString().padStart(4, "0")}-${d.m.toString().padStart(2, "0")}`;

const startOfMonthLD = (d: LocalDate): LocalDate => ld(d.y, d.m, 1);

const addMonthsLD = (d: LocalDate, delta: number): LocalDate => {
  const total = d.m - 1 + delta;
  const newY = d.y + Math.floor(total / 12);
  const newM = (((total % 12) + 12) % 12) + 1;
  return ld(newY, newM, d.d);
};

const compareLD = (a: LocalDate, b: LocalDate): number => {
  if (a.y !== b.y) return a.y - b.y;
  if (a.m !== b.m) return a.m - b.m;
  return a.d - b.d;
};

const isAfterLD = (a: LocalDate, b: LocalDate): boolean => compareLD(a, b) > 0;

const isBeforeLD = (a: LocalDate, b: LocalDate): boolean => compareLD(a, b) < 0;

const isSameDayLD = (a: LocalDate, b: LocalDate): boolean =>
  compareLD(a, b) === 0;

export {
  type LocalDate,
  ld,
  fromJSDate,
  toKeyMonth,
  startOfMonthLD,
  addMonthsLD,
  compareLD,
  isAfterLD,
  isBeforeLD,
  isSameDayLD,
};

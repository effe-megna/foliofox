import { describe, test, expect } from "vitest";
import {
  runScenario,
  makeScenario,
  isEventActiveInMonth,
  makeOneOff,
  makeRecurring,
  makeEvent,
} from "./index";
import { ld } from "./local-date";

const prettyLog = (data: unknown) => {
  console.log(JSON.stringify(data, null, 2));
};

describe("isEventActiveThisMonth", () => {
  test("one-off", () => {
    // Same month
    expect(
      isEventActiveInMonth(
        ld(2023, 1, 2),
        makeOneOff({
          name: "Salary",
          amount: 1000,
          date: ld(2023, 1, 2),
          type: "income",
        }),
      ),
    ).toBe(true);

    // Different month
    expect(
      isEventActiveInMonth(
        ld(2023, 2, 2),
        makeOneOff({
          name: "Salary",
          amount: 1000,
          date: ld(2023, 1, 2),
          type: "income",
        }),
      ),
    ).toBe(false);

    // Different year same month
    expect(
      isEventActiveInMonth(
        ld(2024, 1, 2),
        makeOneOff({
          name: "Salary",
          amount: 1000,
          date: ld(2023, 1, 2),
          type: "income",
        }),
      ),
    ).toBe(false);
  });

  describe("recurring", () => {
    test("monthly", () => {
      expect(
        isEventActiveInMonth(
          ld(2023, 1, 2),
          makeRecurring({
            name: "Rent",
            amount: 1000,
            startDate: ld(2024, 1, 2),
            endDate: ld(2025, 12, 31),
            type: "expense",
            frequency: "monthly",
          }),
        ),
      ).toBe(false);

      expect(
        isEventActiveInMonth(
          ld(2024, 1, 2),
          makeRecurring({
            name: "Rent",
            amount: 1000,
            startDate: ld(2024, 2, 2),
            endDate: ld(2025, 12, 31),
            type: "expense",
            frequency: "monthly",
          }),
        ),
      ).toBe(false);

      expect(
        isEventActiveInMonth(
          ld(2024, 5, 2),
          makeRecurring({
            name: "Rent",
            amount: 1000,
            startDate: ld(2024, 2, 2),
            endDate: ld(2025, 12, 31),
            type: "expense",
            frequency: "monthly",
          }),
        ),
      ).toBe(true);

      expect(
        isEventActiveInMonth(
          ld(2025, 9, 2),
          makeRecurring({
            name: "Rent",
            amount: 1000,
            startDate: ld(2024, 2, 2),
            endDate: ld(2025, 12, 31),
            type: "expense",
            frequency: "monthly",
          }),
        ),
      ).toBe(true);
    });

    test("yearly", () => {
      expect(
        isEventActiveInMonth(
          ld(2024, 1, 2),
          makeRecurring({
            name: "Rent",
            amount: 1000,
            startDate: ld(2021, 1, 2),
            endDate: ld(2025, 12, 31),
            type: "expense",
            frequency: "yearly",
          }),
        ),
      ).toBe(true);

      expect(
        isEventActiveInMonth(
          ld(2021, 1, 2),
          makeRecurring({
            name: "Rent",
            amount: 1000,
            startDate: ld(2023, 1, 2),
            endDate: ld(2023, 12, 31),
            type: "expense",
            frequency: "yearly",
          }),
        ),
      ).toBe(false);
    });
  });
});

describe("scenario planning", () => {
  test("should handle basic income and expenses", () => {
    const scenario = makeScenario({
      name: "Basic Income and Expenses",
      events: [
        makeOneOff({
          type: "income",
          amount: 1000,
          name: "Salary",
          date: ld(2023, 1, 2),
        }),
        makeOneOff({
          type: "expense",
          amount: 500,
          name: "Rent",
          date: ld(2023, 1, 5),
        }),
        makeOneOff({
          type: "expense",
          amount: 250,
          name: "Groceries",
          date: ld(2023, 1, 15),
        }),
        makeOneOff({
          type: "expense",
          amount: 800,
          name: "Utilities",
          date: ld(2023, 2, 20),
        }),
      ],
    });
    const result = runScenario({
      scenario,
      startDate: ld(2023, 1, 1),
      endDate: ld(2023, 2, 28),
      initialBalance: 0,
    });

    expect(result.balance).toStrictEqual({
      "2023-01": 1000 - 500 - 250,
      "2023-02": 250 - 800,
    });
  });

  test("should handle recurring income and expenses", () => {
    const scenario = makeScenario({
      name: "Basic Income and Expenses",
      events: [
        makeRecurring({
          type: "income",
          amount: 1000,
          name: "Salary",
          startDate: ld(2023, 1, 1),
          endDate: ld(2023, 4, 1),
          frequency: "monthly",
        }),
        makeRecurring({
          type: "expense",
          amount: 500,
          name: "Rent",
          startDate: ld(2023, 1, 5),
          endDate: ld(2023, 4, 5),
          frequency: "monthly",
        }),
        makeRecurring({
          type: "expense",
          amount: 500,
          name: "Taxes outside range - last year - not counting",
          startDate: ld(2022, 1, 1),
          endDate: ld(2022, 8, 1),
          frequency: "monthly",
        }),
      ],
    });
    const result = runScenario({
      scenario,
      startDate: ld(2023, 1, 1),
      endDate: ld(2023, 4, 30),
      initialBalance: 0,
    });

    expect(result.cashflow).toStrictEqual({
      "2023-01": expect.objectContaining({ amount: 1000 - 500 }),
      "2023-02": expect.objectContaining({ amount: 1000 - 500 }),
      "2023-03": expect.objectContaining({ amount: 1000 - 500 }),
      "2023-04": expect.objectContaining({ amount: 1000 - 500 }),
    });

    expect(result.balance).toStrictEqual({
      "2023-01": 500,
      "2023-02": 1000,
      "2023-03": 1500,
      "2023-04": 2000,
    });
  });

  test("should handle complex scenario over 2 years", () => {
    const scenario = makeScenario({
      name: "Realistic complex scenario",
      events: [
        makeRecurring({
          name: "Salary",
          amount: 2000,
          frequency: "monthly",
          type: "income",
          startDate: ld(2025, 1, 1),
          endDate: null,
        }),
        makeRecurring({
          name: "Cost of Life",
          amount: 1400,
          frequency: "monthly",
          type: "expense",
          startDate: ld(2025, 1, 1),
          endDate: null,
        }),
        makeOneOff({
          name: "New Car",
          amount: 10000,
          type: "expense",
          date: ld(2025, 6, 1),
        }),
        makeOneOff({
          name: "Tredicesima",
          amount: 2200,
          type: "income",
          date: ld(2026, 1, 1),
        }),
      ],
    });

    const result = runScenario({
      scenario,
      startDate: ld(2025, 1, 1),
      endDate: ld(2027, 1, 1),
      initialBalance: 10000,
    });

    expect(result.balance).toMatchInlineSnapshot(`
      {
        "2025-01": 10600,
        "2025-02": 11200,
        "2025-03": 11800,
        "2025-04": 12400,
        "2025-05": 13000,
        "2025-06": 3600,
        "2025-07": 4200,
        "2025-08": 4800,
        "2025-09": 5400,
        "2025-10": 6000,
        "2025-11": 6600,
        "2025-12": 7200,
        "2026-01": 10000,
        "2026-02": 10600,
        "2026-03": 11200,
        "2026-04": 11800,
        "2026-05": 12400,
        "2026-06": 13000,
        "2026-07": 13600,
        "2026-08": 14200,
        "2026-09": 14800,
        "2026-10": 15400,
        "2026-11": 16000,
        "2026-12": 16600,
        "2027-01": 17200,
      }
    `);
  });

  describe("conditions", () => {
    describe("networth-is-above", () => {
      test("should unlock event when salary is above", () => {
        const scenario = makeScenario({
          name: "",
          events: [
            makeRecurring({
              name: "Salary",
              frequency: "monthly",
              startDate: ld(2025, 1, 1),
              amount: 2000,
              endDate: null,
              type: "income",
            }),
            makeEvent({
              name: "Holidays in South Korea 🇰🇷",
              amount: 4000,
              type: "expense",
              unlockedBy: [
                {
                  type: "networth-is-above",
                  tag: "balance",
                  value: { eventRef: "Salary", amount: 6000 },
                },
              ],
            }),
          ],
        });

        const result = runScenario({
          startDate: ld(2025, 1, 1),
          endDate: ld(2025, 5, 1),
          initialBalance: 0,
          scenario,
        });

        expect(result.balance).toMatchInlineSnapshot(`
          {
            "2025-01": 2000,
            "2025-02": 4000,
            "2025-03": 6000,
            "2025-04": 4000,
            "2025-05": 6000,
          }
        `);
      });
    });

    describe("event");
  });
});

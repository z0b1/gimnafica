import { describe, expect, it } from "vitest";
import { orderItemsSchema, signUpSchema } from "./validation";

describe("orderItemsSchema", () => {
  it("drops zero quantities", () => {
    const result = orderItemsSchema.parse([
      { coffeeTypeId: "a", quantity: 2 },
      { coffeeTypeId: "b", quantity: 0 },
    ]);
    expect(result).toEqual([{ coffeeTypeId: "a", quantity: 2 }]);
  });

  it("requires at least one coffee", () => {
    const result = orderItemsSchema.safeParse([{ coffeeTypeId: "a", quantity: 0 }]);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Izaberite bar jednu kafu.");
  });

  it("rejects quantities above the limit, negatives and fractions", () => {
    for (const quantity of [11, -1, 1.5, Number.NaN]) {
      expect(orderItemsSchema.safeParse([{ coffeeTypeId: "a", quantity }]).success).toBe(false);
    }
  });

  it("rejects duplicate coffee types", () => {
    const result = orderItemsSchema.safeParse([
      { coffeeTypeId: "a", quantity: 1 },
      { coffeeTypeId: "a", quantity: 2 },
    ]);
    expect(result.success).toBe(false);
  });
});

describe("signUpSchema", () => {
  const valid = {
    name: "  Marija Petrović ",
    email: " Marija@Skola.RS ",
    password: "dugalozinka",
    requestedRole: "PROFESOR",
  };

  it("normalizes name and email", () => {
    expect(signUpSchema.parse(valid)).toMatchObject({
      name: "Marija Petrović",
      email: "marija@skola.rs",
    });
  });

  it("does not allow requesting the admin role", () => {
    expect(signUpSchema.safeParse({ ...valid, requestedRole: "ADMIN" }).success).toBe(false);
  });

  it("requires 8+ character passwords", () => {
    expect(signUpSchema.safeParse({ ...valid, password: "kratka" }).success).toBe(false);
  });
});

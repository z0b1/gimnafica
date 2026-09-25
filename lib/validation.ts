import { z } from "zod";

export const MAX_QUANTITY = 10;

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Unesite ime i prezime.").max(80),
  email: z.string().trim().toLowerCase().pipe(z.email("Neispravna e-mail adresa.")),
  password: z.string().min(8, "Lozinka mora imati bar 8 karaktera.").max(128),
  requestedRole: z.enum(["PROFESOR", "KUHINJA"], "Izaberite ulogu."),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Neispravna e-mail adresa.")),
  password: z.string().min(1, "Unesite lozinku."),
});

// Order items as submitted from the professor form: { coffeeTypeId: quantity }.
// Zero-quantity entries are dropped; at least one coffee is required.
export const orderItemsSchema = z
  .array(
    z.object({
      coffeeTypeId: z.string().min(1),
      quantity: z.number().int().min(0).max(MAX_QUANTITY),
    }),
  )
  .transform((items) => items.filter((i) => i.quantity > 0))
  .refine((items) => items.length > 0, "Izaberite bar jednu kafu.")
  .refine(
    (items) => new Set(items.map((i) => i.coffeeTypeId)).size === items.length,
    "Duplirana stavka.",
  );

export const coffeeTypeNameSchema = z
  .string()
  .trim()
  .min(2, "Naziv je prekratak.")
  .max(40, "Naziv je predugačak.");

export const approveSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["PROFESOR", "KUHINJA", "ADMIN"]),
});

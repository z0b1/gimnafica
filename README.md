# Gimnafica ☕

Aplikacija za poručivanje kafe pred veliki odmor.

- **Profesor** – bira vrstu kafe i količinu, može da izmeni ili otkaže porudžbinu.
- **Kuhinja** – ekran koji se sam osvežava (na 3 s): tačan broj kafa po vrsti, lista ko je šta poručio, zvučni signal za novu porudžbinu i dugme **„Završi rundu”** kada je kafa podeljena.
- **Admin** – odobrava nove naloge i dodeljuje uloge, uređuje listu kafa, vidi istoriju rundi.

Nema roka za poručivanje: sve porudžbine idu u trenutnu „rundu” dok je kuhinja ne završi. Tada se brojač vraća na nulu i profesori mogu da poruče za sledeću pauzu.

## Tehnologije

Next.js 16 (App Router) · PostgreSQL · Prisma 7 · Tailwind CSS 4 · zod · jose (sesije) · bcryptjs

## Pokretanje

1. Instalirajte zavisnosti:
   ```bash
   npm install
   ```
2. Napravite `.env` na osnovu `.env.example` i popunite:
   - `DATABASE_URL` – Postgres baza (Neon, Supabase ili lokalni `docker compose up -d`).
     Za Neon/Supabase ostavite `?sslmode=require` na kraju adrese. Kod Supabase-a koristite *direct* ili *session pooler* adresu (ne *transaction pooler*).
   - `SESSION_SECRET` – nasumičan string od bar 32 karaktera:
     `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` – prvi administrator.
3. Napravite tabele i prvog admina:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
4. Pokrenite:
   ```bash
   npm run dev
   ```
   i otvorite http://localhost:3000.

## Kako se koristi

1. Profesori i kuhinja se registruju na `/registracija` i biraju ulogu.
2. Admin se prijavi i odobri ih na `/admin`.
3. Profesor na `/profesor` poruči npr. 2× Espreso + 1× Čaj.
4. Kuhinja na `/kuhinja` odmah vidi ukupno po vrsti. Kliknite **„Uključi zvuk”** jednom (pregledač inače ne dozvoljava zvuk).
5. Posle pauze kuhinja klikne **„Završi rundu”**.

## Skripte

| Komanda | Opis |
|---|---|
| `npm run dev` | razvojni server |
| `npm run build` / `npm start` | produkcija |
| `npm test` | testovi (Vitest) |
| `npm run lint` | ESLint |
| `npm run db:migrate` | primeni migracije |
| `npm run db:seed` | admin + podrazumevane vrste kafe |

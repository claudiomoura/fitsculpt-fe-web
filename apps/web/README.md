This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Variáveis de ambiente (frontend)

Configure `BACKEND_URL` apontando para a API (Render ou local), por exemplo:

```bash
BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.



## Password e como acceder
intern
postgresql://fitsculpt_db_user:msSBNoxfDrfB1FpoSiZUaUa53X6bEXJj@dpg-d5l5q04mrvns739nfrf0-a/fitsculpt_db


Exter
postgresql://fitsculpt_db_user:msSBNoxfDrfB1FpoSiZUaUa53X6bEXJj@dpg-d5l5q04mrvns739nfrf0-a.virginia-postgres.render.com/fitsculpt_db


FitSculpt-100%


claudio.moura@sapo.pt
Password1234

test@gmail.com	
Password123


##  acceder a BD  

NOTE: Tem de serr onde esta o eschema  em C:\Users\Moura\Documents\Work\FitSculpt\fitsculpt-fe-web\apps\api>

$env:DATABASE_URL="postgresql://fitsculpt_db_user:msSBNoxfDrfB1FpoSiZUaUa53X6bEXJj@dpg-d5l5q04mrvns739nfrf0-a.virginia-postgres.render.com/fitsculpt_db" 
npx prisma studio

##  crear usuario na BD
node scripts/create-user.mjs tu@email.com TuPassword123 "Tu Nombre" ADMIN

##  mudar pass de  usuario na BD
cd apps\api
node -e "const b=require('cmkh4tvhr0000kxq8os6qhids'); b.hash('Password1234',12).then(h=>console.log(h))"

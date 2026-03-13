# Tech Stack

## Frontend
- **Language**
  - TypeScript (ESM)
- **Framework / UI**
  - React 18
  - React Router (`react-router`)
  - Tailwind CSS (via `@tailwindcss/vite`)
  - Radix UI primitives (`@radix-ui/*`)
  - shadcn/ui-style component wrappers (in `src/app/components/ui/*`)
  - Icons: `lucide-react`
  - Toasts/notifications: `sonner`
  - Forms: `react-hook-form`
  - Date utilities: `date-fns`
  - Command menu / combobox: `cmdk`
- **Charts / UI utilities**
  - `recharts`
  - `class-variance-authority`, `clsx`, `tailwind-merge`
  - Animations: `motion`, `tw-animate-css`
- **PDF / Export**
  - HTML to canvas: `html2canvas`
  - PDF generation: `jspdf`
  - QR codes: `qrcode`

## Backend
- **Runtime**
  - Node.js (ESM)
- **Web framework**
  - Express
  - CORS (`cors`)
- **Auth / Security**
  - JWT (`jsonwebtoken`)
  - Password hashing (`bcryptjs`)
- **Database**
  - MongoDB via Mongoose (`mongoose`)
- **Uploads / Media**
  - Cloudinary (`cloudinary`)
- **Messaging / Email / OTP**
  - Email: `nodemailer`, `resend`
  - SMS/OTP: `twilio`

## Build Tooling
- **Bundler**
  - Vite
- **Vite plugins**
  - `@vitejs/plugin-react`
  - `@tailwindcss/vite`
- **Path aliases**
  - `@` maps to `./src` (see `vite.config.ts`)

## Mobile / Hybrid (present in deps)
- Capacitor (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`)

## Data / Integrations (present in deps)
- PostgreSQL client library present (`pg`) — verify actual usage in code before relying on it.

## Key Code Locations
- **Create/Edit Document (Invoice, Order, Quotation, etc.)**
  - `src/app/pages/CreateDocumentPage.tsx`
- **PDF rendering/templates**
  - `src/app/pdf/PdfRenderer.tsx`
  - `src/app/pdf/templates/*` (e.g. `ModernTemplate.tsx`, `ClassicTemplate.tsx`, `MinimalTemplate.tsx`)
  - Types: `src/app/pdf/types.ts`
  - Exporter: `src/app/pdf/exporter.ts`
- **Backend entrypoint**
  - `backend/src/index.js`
- **Documents routes**
  - `backend/src/routes/documents.js`

## Common Commands
### Frontend
- **Dev**: `npm run dev`
- **Build**: `npm run build`

### Backend
- **Dev**: `npm run dev` (run inside `backend/`)
- **Start**: `npm start` (run inside `backend/`)

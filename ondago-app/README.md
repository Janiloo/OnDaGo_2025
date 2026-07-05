# OnDaGO — React Native (Expo) app

React Native replacement for the .NET MAUI frontend. It is a **pure client**: all auth,
business logic, database access, and third-party API keys stay in the existing ASP.NET Core
backend (`OnDaGo.API`). The app only consumes the API over HTTP(S) with a JWT.

## Roles

Role comes from the backend's login response (`user.role`) and drives navigation:

| Role   | Experience |
|--------|-----------|
| User (commuter) | Map-first: live PUV markers on the Montalban–Cubao route, seat availability, fare matrix, reports |
| Driver | Operational dashboard: GPS broadcast, big-target passenger counter, capacity bar |
| Admin  | Dashboard: report stats + triage, fare management, driver/admin account creation |

## Design system

- Tokens in `src/theme.ts` (light + dark palettes, spacing, radius, type scale, `motion`
  timing/spring presets, `elevation()` helper, `BRAND_BG`).
- **Dark mode**: system-aware with a manual System/Light/Dark toggle in Profile → Appearance
  (persisted). The map gets a matching dark style.
- **Icons**: Ionicons only (via `@expo/vector-icons`) — no mixed icon styles.
- Components in `src/components/UI.tsx`: `Screen, Card, Field (with inline `error`),
  Button (spring press + haptic), Badge, StatCard, ListRow, SectionHeader,
  EmptyState (with optional action)`.
- Navigation uses themed headers/tab bar, `slide_from_right` stack transitions, tab `shift`
  animation, and a selection haptic on every tab switch.

### Motion & feedback layer

- **Branded splash** (`src/components/BrandedSplash.tsx`): animated logo/wordmark over the
  native splash color (`BRAND_BG`) while the session is restored — no white flash. Handoff:
  native splash → branded splash → app.
- **Toasts** (`src/components/Toast.tsx`, `useToast()`): non-blocking success/error/info
  snackbars — the modern replacement for `Alert.alert` on *feedback*. Confirmations that need
  a decision (delete account, etc.) stay as dialogs.
- **Skeletons** (`src/components/Skeleton.tsx`): shimmer placeholders driven by one shared
  animation loop; used on first load instead of spinners.
- **Haptics** (`src/services/haptics.ts`): crash-proof wrapper over expo-haptics. Wired into
  buttons, tab switches, the passenger counter, duty toggle, and toast outcomes.

> **Native modules:** `expo-haptics` and `expo-splash-screen` are native. After pulling these
> changes, rebuild the dev client once (`npx expo run:android`) to get haptics + the native
> splash. Everything else (toasts, skeletons, animations, inline errors, splash overlay) is
> pure JS and works on a plain Metro reload; haptics silently no-op until the rebuild.

## Local development (default)

By default the app targets a **local backend** (`http://localhost:5147`, or `http://10.0.2.2:5147`
from the Android emulator — see `src/config.ts`). Override without code changes via `.env`:

```bash
cp .env.example .env
# EXPO_PUBLIC_API_URL=http://10.0.2.2:5147   (explicit override)
# EXPO_PUBLIC_USE_PROD=true                  (target the Azure backend instead)
```

### 1. Start the backend

```powershell
cd OnDaGo.API
dotnet run --launch-profile http
```

Runs at `http://localhost:5147` (Swagger at `/swagger`). In Development the API uses a
permissive CORS policy (`AllowLocalDev` in `Startup.cs`); production keeps the strict origin list.

### 2. Start the Expo dev server

```bash
cd ondago-app
npm install        # first time only
npx expo start
```

Hot reload (Fast Refresh) is on by default — save a file and the app updates in place.
Press `r` in the terminal to reload manually, `j` to open the debugger.

### 3. Launch on the Android emulator

First time (native build — maps + secure store aren't in Expo Go):

```bash
npx expo run:android
```

After that, plain `npx expo start` + pressing `a` attaches to the installed dev build.
If no emulator is running, start one first: `emulator -avd <name>` (list with `emulator -list-avds`),
or open Android Studio → Device Manager → ▶.

> Cleartext HTTP for the emulator (`http://10.0.2.2:5147`) is enabled via the
> `expo-build-properties` plugin (`usesCleartextTraffic: true`) — dev convenience;
> revisit before any production build.

### Android Google Maps key

`app.json → android.config.googleMaps.apiKey` needs a Google Maps **Android SDK** key.
This is a client-side key (that's how Google Maps works on mobile) — restrict it in Google
Cloud Console to the `com.ondago.app` package + your signing certificate's SHA-1. It is
*not* one of the backend secrets; those never leave the server.

## Project structure

```
src/
  config.ts            API base URL resolution, route stops, polling intervals
  types.ts             API contract types
  theme.ts             design tokens (light/dark palettes, spacing, radius, type)
  components/UI.tsx    shared component kit (Ionicons-based)
  services/
    client.ts          axios instance, JWT interceptor, 401 handling, error mapper
    authApi.ts         login/register/profile/password endpoints
    vehicleApi.ts      GET vehicles, PATCH vehicle status
    fareApi.ts         fare matrix CRUD
    reportApi.ts       reports CRUD + status patches
  store/
    AuthContext.tsx    session state; token+user persisted in expo-secure-store
    ThemeContext.tsx   light/dark/system theme with persisted preference
  navigation/index.tsx auth stack + role-switched tab navigators
  screens/
    auth/       Login, Register, ForgotPassword, ResetPassword
    commuter/   CommuterHome (map), FareMatrix
    driver/     DriverHome (GPS broadcast + passenger counter)
    admin/      AdminReports (dashboard), EditFares, ManageUsers
    shared/     Report, Profile (incl. appearance toggle), EditProfile
```

## Real-time updates (SignalR)

Vehicle positions arrive as **pushes** over `ws(s)://<api>/hubs/vehicles` (event
`VehicleUpdated`), not polls. The flow:

- Drivers write via `PATCH /api/Vehicle/{puvNo}/status` (single write path — works
  from the background task); the server broadcasts the updated vehicle to all clients.
- `useVehicles()` (src/hooks/useVehicles.ts) seeds with one GET, then applies pushes,
  reconciles with a full GET every 30s, and **falls back to 3s polling automatically**
  whenever the socket is down. Reconnection is automatic with backoff.
- Mongo has a unique index on plate number and a 2dsphere index on vehicle location
  (created idempotently at API startup). `GET /api/Vehicle/near?lat=&lng=&radiusM=`
  serves geo-scoped queries from that index for when coverage outgrows one route.
- Azure note: enable **Web Sockets** in the App Service configuration; SignalR
  otherwise degrades to long polling (works, but noisier).

## API contract (backend endpoints used)

- `POST /api/Users/login` `{ email, passwordHash }` → `{ token, user }`
  (the `passwordHash` field carries the **plain** password; the backend BCrypt-hashes it —
  this matches the existing DTO, do not "fix" only one side)
- `POST /api/Users/register`, `POST /api/Users/driver/register`, `POST /api/Users/admin/register`
- `POST /api/Users/forgot-password`, `POST /api/Users/change-password`
- `GET /api/Users/profile`, `PUT /api/Users/edit-profile`, `DELETE /api/Users/delete-account` (JWT)
- `GET /api/Vehicle`, `PATCH /api/Vehicle/{puvNo}/status`
- `GET/POST/PATCH/DELETE /api/FareMatrix[/{id}]`
- `GET/POST /api/Reports`, `PATCH /api/Reports/{id}/status|important|completed`, `DELETE /api/Reports/{id}`

## Assumptions / known backend gaps (worth fixing server-side later)

- ~~Vehicle, fare, and report endpoints have no `[Authorize]` attributes~~ **Fixed (2026-07-05):**
  those controllers now require a JWT; fare/report admin actions need the `Admin` role and the
  vehicle status PATCH needs the `Driver` role. The app already sends the JWT on every request.
- ~~The JWT signing key is hardcoded in `UsersController.GenerateJwtToken`~~ **Fixed (2026-07-05):**
  the key now comes from `Jwt:Key` configuration (appsettings.json / `Jwt__Key` env var).
- ~~Password reset was brute-forceable (predictable 6-digit code, no attempt limit)~~
  **Fixed (2026-07-05):** codes are now generated with a CSPRNG, stored as SHA-256 hashes,
  compared in constant time, expire after 15 minutes, and are invalidated after 5 wrong
  attempts. `login`, `forgot-password`, and `change-password` are rate-limited per IP, and
  `forgot-password` no longer reveals whether an email is registered.
- Report/fare IDs are normalized client-side (`normalizeId`) in case the serializer returns
  ObjectIds as objects rather than hex strings.
- Driver passenger capacity defaults to 18 (set when the backend auto-creates a vehicle).

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

- Tokens in `src/theme.ts` (light + dark palettes, spacing, radius, type scale)
- **Dark mode**: system-aware with a manual System/Light/Dark toggle in Profile → Appearance
  (persisted). The map gets a matching dark style.
- **Icons**: Ionicons only (via `@expo/vector-icons`) — no mixed icon styles.
- Components in `src/components/UI.tsx`: `Screen, Card, Field, Button, Badge, StatCard, ListRow, SectionHeader, EmptyState`.
- Navigation uses themed headers/tab bar, `slide_from_right` stack transitions, and tab `shift` animation.

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

- Vehicle, fare, and report endpoints have **no `[Authorize]` attributes** — anyone with the
  URL can PATCH a vehicle or fare. The app sends the JWT anyway; add role checks server-side.
- The JWT signing key is hardcoded in `UsersController.GenerateJwtToken` — move it to
  configuration/secret storage.
- Report/fare IDs are normalized client-side (`normalizeId`) in case the serializer returns
  ObjectIds as objects rather than hex strings.
- Driver passenger capacity defaults to 18 (set when the backend auto-creates a vehicle).

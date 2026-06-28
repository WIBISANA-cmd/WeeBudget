# Security Audit Report — WeeB (WeeBudget)

**Date:** 2026-06-28
**Auditor:** Claude Code (Sonnet 4.6)
**Scope:** Full codebase audit — `weeb-api` (Laravel 13, PHP 8.3) + `weeb-ui` (React/Vite)
**Test Result:** 43/43 tests pass after all fixes

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Fixed Findings](#2-fixed-findings)
3. [Remaining Risks](#3-remaining-risks)
4. [Files Changed](#4-files-changed)
5. [Deployment Checklist](#5-deployment-checklist)

---

## 1. Executive Summary

Seven security vulnerabilities were identified and fixed across authentication, API design, data exposure, and infrastructure hardening categories. No findings required database schema changes or broke existing API contracts.

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 1 | ✅ Fixed |
| High | 3 | ✅ Fixed |
| Medium | 3 | ✅ Fixed |
| Low (Remaining) | 4 | ⚠️ Documented |

---

## 2. Fixed Findings

---

### F-01 · No Rate Limiting on Authentication Endpoints

**Severity:** Critical
**Location:** `routes/api.php`

**Vulnerability**

`POST /api/auth/login` and `POST /api/auth/register` had no throttle middleware. An attacker could make unlimited requests to brute-force passwords or mass-register accounts with no restriction.

**Fix Applied**

```php
// routes/api.php
Route::post('/auth/login',    [...'login'])    ->middleware('throttle:10,1');
Route::post('/auth/register', [...'register']) ->middleware('throttle:5,1');
Route::post('/auth/google/exchange', [...])    ->middleware('throttle:20,1');
```

- Login: 10 attempts per minute per IP
- Register: 5 attempts per minute per IP
- OAuth exchange: 20 attempts per minute per IP

**Validation**

Tests `test_login_endpoint_is_rate_limited` and `test_register_endpoint_is_rate_limited` in `tests/Feature/SecurityTest.php` confirm 429 is returned after the limit is exceeded.

---

### F-02 · OAuth Token Exposed in Redirect URL

**Severity:** High
**Location:** `app/Http/Controllers/Api/Auth/GoogleAuthController.php` · `weeb-ui/src/pages/GoogleCallbackPage.jsx`

**Vulnerability**

After Google OAuth, the backend redirected to:

```
{frontend}/auth/google/callback?token=<real_sanctum_token>
```

The real long-lived API token was exposed in:
- Browser address bar and history
- Server access logs (`nginx`/`apache` log the full URL)
- `Referer` header of any subsequent request made from that page

**Fix Applied**

Implemented a short-lived, single-use **code exchange** flow:

1. Backend generates a 64-character random code and stores the real token in cache under that code (60-second TTL)
2. Redirects to `{frontend}/auth/google/callback?code=<code>`
3. Frontend POSTs the code to `POST /api/auth/google/exchange`
4. Backend returns the real token and immediately invalidates the code (`Cache::pull`)

```php
// GoogleAuthController::callback()
$code = Str::random(64);
Cache::put("google_auth_code:{$code}", $token, now()->addSeconds(60));
return redirect()->away("{$frontendUrl}/auth/google/callback?code=".urlencode($code));

// GoogleAuthController::exchange()
$token = Cache::pull("google_auth_code:{$request->input('code')}");
if (! $token) {
    return response()->json(['success' => false, 'message' => 'Invalid or expired code.'], 422);
}
return $this->success(['token' => $token], 'Token exchanged.');
```

```jsx
// GoogleCallbackPage.jsx
const code = params.get('code');
const exchangeResponse = await apiPost('/auth/google/exchange', { code });
const token = exchangeResponse.data?.token;
localStorage.setItem('weeb_auth_token', token);
```

**Validation**

Three tests in `SecurityTest.php`:
- `test_google_exchange_returns_token_for_valid_code` — valid code returns token
- `test_google_exchange_code_is_single_use` — second use of same code returns 422
- `test_google_exchange_rejects_wrong_length_code` — malformed code rejected

---

### F-03 · Unbounded Pagination (`per_page`)

**Severity:** High
**Location:** 12 API listing controllers

**Vulnerability**

All paginated endpoints accepted `per_page` without a maximum cap:

```
GET /api/transactions?per_page=999999
```

This triggers a full table scan with no limit, producing a denial-of-service condition by exhausting database, PHP memory, and response time budgets.

**Affected endpoints:** `/api/transactions`, `/api/expenses`, `/api/incomes`, `/api/accounts`, `/api/bills`, `/api/budgets`, `/api/categories`, `/api/periods`, `/api/recurring-transactions`, `/api/saving-goals`, `/api/users`, `/api/wishlists`

**Fix Applied**

Added a `perPage()` helper to the `RespondsWithApi` trait:

```php
// app/Http/Concerns/RespondsWithApi.php
protected function perPage(Request $request, int $default = 20, int $max = 100): int
{
    return max(1, min($request->integer('per_page', $default), $max));
}
```

All 12 controllers updated from:
```php
$query->paginate($request->integer('per_page', 20))
```
to:
```php
$query->paginate($this->perPage($request, 20))
```

Maximum is 100 rows per page.

**Validation**

`test_per_page_is_capped_at_100` confirms `meta.per_page` never exceeds 100 regardless of input.

---

### F-04 · Internal Exception Message Leaked in API Response

**Severity:** High
**Location:** `app/Http/Controllers/Api/GoldSavingsMarketController.php:30`

**Vulnerability**

On any failure fetching gold market data, the raw exception message was returned to the client:

```json
{
  "success": false,
  "message": "Gold savings market unavailable.",
  "error": "cURL error 28: Operation timed out after 20001ms ... (url: https://internal-api/secret-path)"
}
```

Exception messages can expose internal URLs, file paths, credentials, or provider implementation details.

**Fix Applied**

```php
} catch (Throwable $exception) {
    report($exception);   // sends to Laravel log/error tracker

    return response()->json([
        'success' => false,
        'message' => 'Gold savings market unavailable.',
        'data'    => null,
    ], 502);
}
```

**Validation**

`test_gold_market_502_response_does_not_expose_exception_message` directly invokes the controller with a mock that throws an exception containing sensitive text and asserts neither the `error` key nor the sensitive string appears in the response.

---

### F-05 · `env()` Called Directly in Production App Code

**Severity:** Medium
**Location:** `app/Http/Middleware/UseDefaultUser.php` · `app/Services/Notifications/TransactionReminderPushService.php`

**Vulnerability**

The production `entrypoint.sh` runs `php artisan config:cache`. After config is cached, `env()` calls in application code return `null` — they bypass the cache entirely. This silently disabled:

- Guest user mode (`WEEB_ALLOW_GUEST_USER` always read as `false`)
- VAPID keys for push notifications (`WEEB_VAPID_PUBLIC_KEY` / `WEEB_VAPID_PRIVATE_KEY` both `null`)

**Fix Applied**

Created `config/weeb.php`:

```php
return [
    'allow_guest_user'  => filter_var(env('WEEB_ALLOW_GUEST_USER', false), FILTER_VALIDATE_BOOL),
    'default_user_email'=> env('WEEB_DEFAULT_USER_EMAIL', 'local@weeb.id'),
    'default_user_name' => env('WEEB_DEFAULT_USER_NAME', 'Teman WeeB'),
    'vapid_public_key'  => env('WEEB_VAPID_PUBLIC_KEY'),
    'vapid_private_key' => env('WEEB_VAPID_PRIVATE_KEY'),
];
```

Also added to `config/app.php`:

```php
'frontend_url'       => env('FRONTEND_URL', 'http://127.0.0.1:5173'),
'default_user_email' => env('WEEB_DEFAULT_USER_EMAIL', 'local@weeb.id'),
```

All `env()` calls in app code replaced with `config()`.

**Validation**

All 43 tests pass after `php artisan config:clear` (simulating a fresh boot before caching).

---

### F-06 · No Security Response Headers

**Severity:** Medium
**Location:** `bootstrap/app.php` (new middleware)

**Vulnerability**

No HTTP security headers were set. Missing headers enable:

| Missing Header | Risk |
|---|---|
| `X-Content-Type-Options` | MIME-type sniffing attacks |
| `X-Frame-Options` | Clickjacking |
| `Referrer-Policy` | Token/URL leakage via Referer to third parties |
| `Permissions-Policy` | Unnecessary browser feature access |
| `Strict-Transport-Security` | SSL stripping on HTTPS deployments |

**Fix Applied**

New `app/Http/Middleware/SecurityHeaders.php`, registered globally:

```php
$response->headers->set('X-Content-Type-Options', 'nosniff');
$response->headers->set('X-Frame-Options', 'DENY');
$response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
$response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

if ($request->secure()) {
    $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}
```

**Validation**

`test_api_responses_include_security_headers` asserts all three primary headers are present on every API response.

---

### F-07 · `google_id` Exposed in User API Response

**Severity:** Medium
**Location:** `app/Http/Resources/UserResource.php`

**Vulnerability**

Every authenticated API call returned the user's Google account ID (`google_id`). This is a globally unique, stable, third-party identifier that:

- Can be used to correlate this account with the same user on other platforms
- Should never leave the server; only the application needs to know it

**Fix Applied**

```php
// Before
'google_id' => $this->google_id,

// After
'has_google' => ! empty($this->google_id),
```

Clients now receive a boolean indicating whether the account has Google linked, without the actual identifier.

**Validation**

`test_user_resource_does_not_expose_google_id` asserts `google_id` is absent and `has_google` is present and correct.

---

## 3. Remaining Risks

These items were identified but not changed because they are either deployment configuration or intentional design decisions.

| # | Severity | Location | Issue | Recommendation |
|---|----------|----------|-------|----------------|
| R-01 | Medium | `.env.example` | `SESSION_LIFETIME=525600` (365 days) — sessions never expire | Set to `10080` (7 days) or less in production |
| R-02 | Medium | `.env.example` | `SESSION_ENCRYPT=false` — session data stored in plaintext | Set `SESSION_ENCRYPT=true` in production `.env` |
| R-03 | Low | `PasswordAuthController::register` | `email_verified_at` is set to `now()` without email verification | Acceptable if no email flow is planned; add verification when email is configured |
| R-04 | Low | `GoogleAuthController::callback` | Google OAuth with an existing email account overwrites the password | Pre-existing design decision; revisit if password + Google linking is supported |

---

## 4. Files Changed

### Backend — `weeb-api/`

| File | Change |
|------|--------|
| `routes/api.php` | Rate limiting middleware on login/register; new `/auth/google/exchange` route |
| `config/app.php` | Added `frontend_url` and `default_user_email` keys |
| `config/weeb.php` | **New file** — all WEEB_* env vars under config |
| `bootstrap/app.php` | Registered `SecurityHeaders` middleware globally |
| `app/Http/Middleware/SecurityHeaders.php` | **New file** — security response headers |
| `app/Http/Middleware/UseDefaultUser.php` | Replaced `env()` calls with `config()` |
| `app/Http/Controllers/Api/Auth/GoogleAuthController.php` | Code exchange flow; `exchange()` method; `config()` for frontend URL |
| `app/Http/Controllers/Api/GoldSavingsMarketController.php` | Removed `error` key from 502 response; added `report()` |
| `app/Http/Concerns/RespondsWithApi.php` | Added `perPage()` helper method |
| `app/Http/Resources/UserResource.php` | `google_id` replaced with `has_google` boolean |
| `app/Services/Notifications/TransactionReminderPushService.php` | Replaced `env()` with `config('weeb.*')` |
| `app/Http/Controllers/Api/AllTransactionController.php` | `perPage()` helper |
| `app/Http/Controllers/Api/TransactionController.php` | `perPage()` helper |
| `app/Http/Controllers/Api/BillController.php` | `perPage()` helper |
| `app/Http/Controllers/Api/BudgetController.php` | `perPage()` helper |
| `app/Http/Controllers/Api/CategoryController.php` | `perPage()` helper |
| `app/Http/Controllers/Api/FinancialAccountController.php` | `perPage()` helper |
| `app/Http/Controllers/Api/FinancialPeriodController.php` | `perPage()` helper |
| `app/Http/Controllers/Api/MonthlyReportController.php` | `perPage()` helper |
| `app/Http/Controllers/Api/RecurringTransactionController.php` | `perPage()` helper |
| `app/Http/Controllers/Api/SavingGoalController.php` | `perPage()` helper |
| `app/Http/Controllers/Api/UserManagementController.php` | `perPage()` helper |
| `app/Http/Controllers/Api/WishlistController.php` | `perPage()` helper |
| `tests/Feature/SecurityTest.php` | **New file** — 11 dedicated security tests |

### Frontend — `weeb-ui/`

| File | Change |
|------|--------|
| `src/pages/GoogleCallbackPage.jsx` | Reads `?code=` from URL; calls `/auth/google/exchange` to obtain real token |

---

## 5. Deployment Checklist

Complete these steps when deploying this release.

- [ ] **Rebuild and redeploy both `weeb-api` and `weeb-ui`** — the Google callback change requires both to be in sync
- [ ] Run `php artisan config:cache` — the new `config/weeb.php` must be cached
- [ ] Run `php artisan config:clear && php artisan test` before caching to confirm all tests pass
- [ ] Set `SESSION_ENCRYPT=true` in production `.env`
- [ ] Review `SESSION_LIFETIME` — consider reducing from 525600 (1 year)
- [ ] Confirm the cache driver in production is **not** `array` — OAuth code exchange requires a persistent cache (database or Redis); Docker Compose already uses `CACHE_STORE=database` ✅
- [ ] Verify `WEEB_VAPID_PUBLIC_KEY` and `WEEB_VAPID_PRIVATE_KEY` are set in production `.env` — they now read from `config('weeb.*')` and will be `null` if missing
- [ ] No database migrations are required

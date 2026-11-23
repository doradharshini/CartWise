# Cartwise — User Flows

Three personas use the app: **Buyer**, **Seller** and **Admin**. Roles come from the JWT; the
API gateway injects `X-User-Id` / `X-User-Role` into every authenticated request.

## 1. Overall navigation (all personas)

```mermaid
flowchart TD
    Start([Visit app]) --> Home[Home / Catalog / Search]
    Home --> PD[Product details]
    PD -->|read| Reviews[View reviews - public]
    Home --> Auth{Logged in?}
    Auth -- No --> Login[Login] --> Home
    Auth -- No --> Register[Register] --> Verify[Verify email via OTP] --> Login
    Login --> Forgot[Forgot password] --> OTP[Reset via emailed OTP] --> Login
    Auth -- Yes --> Role{Role}
    Role -- BUYER --> Buyer[[Buyer flow]]
    Role -- SELLER --> Seller[[Seller flow]]
    Role -- ADMIN --> Admin[[Admin flow]]
```

Public (no login): home, catalog, product details, search, category view, reading reviews.

## 2. Buyer flow — browse to delivery

```mermaid
flowchart TD
    A[Browse catalog / search] --> B[Product details]
    B --> W[Toggle wishlist]
    B --> C[Add to cart]
    B --> BN[Buy now - direct order]
    C --> D[Cart page: update / remove items]
    D --> E[Checkout]
    BN --> E
    E --> F[Select or add address]
    F --> G[Apply coupon - optional]
    G --> H{Payment method}
    H -- COD --> I[Order created: PROCESSING]
    H -- UPI / Card --> J[Order created: PLACED]
    J --> K[Razorpay payment]
    K -- success --> L[Order: PROCESSING]
    K -- failed --> M[Order: CANCELLED, stock released]
    I --> N[Order history]
    L --> N
    N --> O[Order lifecycle tracker]
    O --> P{Status}
    P -- PLACED / PROCESSING --> Q[Can cancel]
    P -- SHIPPED --> R[Wait for delivery]
    R --> S[DELIVERED]
    S --> T[Write verified-purchase review]
    Q --> U[CANCELLED, stock released]
```

Emails sent at: registration (verify), password reset, order placed, shipped, delivered, cancelled.

## 3. Seller flow

```mermaid
flowchart TD
    A[Logged-in buyer] --> B[Become a seller]
    B --> C[Seller profile created, role = SELLER]
    C --> D[Seller dashboard]
    D --> E[Create / edit / delete products]
    E --> F[Upload multiple images]
    D --> G[Add / adjust stock - inventory]
    D --> H[Earnings view: totals + category revenue breakdown]
```

## 4. Admin flow

```mermaid
flowchart TD
    A[Admin login] --> B[/admin/orders/]
    A --> C[/admin/coupons/]
    B --> D[View all orders]
    D --> E{Current status}
    E -- PROCESSING --> F[Mark SHIPPED]
    E -- SHIPPED --> G[Mark DELIVERED]
    E -. PROCESSING to DELIVERED .-> X[Rejected: cannot skip a step]
    C --> H[Create coupon: percentage or flat]
    C --> I[View coupons]
```

## 5. Frontend routes

| Route | Access | Purpose |
|---|---|---|
| `/login`, `/register` | public | Auth (no navbar/footer) |
| `/`, `/catalog`, `/search`, `/category/:id`, `/product/:id` | public | Browse |
| `/cart`, `/checkout`, `/addresses` | user | Buy |
| `/orders`, `/order-lifecycle/:id` | user | Order history and tracking |
| `/wishlist`, `/profile` | user | Account |
| `/become-seller`, `/dashboard` | user / seller | Seller onboarding and dashboard |
| `/admin/orders`, `/admin/coupons` | ADMIN (route guard) | Fulfilment and coupons |

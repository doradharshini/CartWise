# Cartwise — Low-Level Design (LLD)

Detailed design of the data model, API surface, checkout saga, payment flow and state machines.
Derived from the code in `backend/*-service`.

## 1. Data model (per-service databases)

Services never join across databases; cross-service references (`userId`, `skuCode`,
`orderId`) are plain string / UUID values resolved through Feign calls.

```mermaid
erDiagram
    %% user-service
    USER ||--o| SELLER_PROFILE : has
    USER ||--o{ EMAIL_VERIFICATION_TOKEN : has
    USER ||--o{ PASSWORD_RESET_TOKEN : has
    USER ||--o{ ADDRESS : owns
    USER ||--o{ WISHLIST_ITEM : saves
    USER {
        UUID id PK
        string username
        string email
        string password
        string firstName
        string lastName
        string phoneNumber
        boolean isActive
        boolean emailVerified
        Role role
    }
    SELLER_PROFILE {
        UUID id PK
        string shopName
        string shopDescription
    }
    ADDRESS {
        UUID id PK
        string userId
        string street
        string city
        string state
        string zipCode
        string country
    }
    WISHLIST_ITEM {
        UUID id PK
        string userId
        string skuCode
    }

    %% product-service
    CATEGORY ||--o{ PRODUCT : contains
    CATEGORY {
        string id PK
        string name
        string description
    }
    PRODUCT {
        UUID id PK
        string name
        decimal price
        string skuCode
        string sellerId
        string shopName
        list imageUrls
    }

    %% order-service
    ORDER ||--|{ ORDER_LINE_ITEM : contains
    ORDER {
        UUID id PK
        string orderNumber
        string userId
        OrderStatus orderStatus
        PaymentStatus paymentStatus
        PaymentMethod paymentMethod
        decimal totalAmount
        embedded shippingAddress
    }
    ORDER_LINE_ITEM {
        UUID id PK
        string skuCode
        decimal price
        int quantity
    }

    %% other services
    INVENTORY {
        UUID id PK
        string skuCode
        int availableQuantity
        int reservedQuantity
    }
    PAYMENT {
        string id PK
        string orderId
        decimal amount
        PaymentStatus status
        string paymentGatewayTransactionId
    }
    COUPON {
        UUID id PK
        string code
        DiscountType discountType
        decimal discountValue
        date expirationDate
        int usageLimit
        int usageCount
    }
    REVIEW {
        UUID id PK
        string productId
        string userId
        int rating
        string comment
    }
```

Logical (non-FK) links: `ORDER_LINE_ITEM.skuCode` = `PRODUCT.skuCode` = `INVENTORY.skuCode`;
`PAYMENT.orderId` = `ORDER.id`; `REVIEW.productId` = `PRODUCT.id`.

## 2. REST API surface (through gateway `:8080`)

| Service | Method and path | Auth |
|---|---|---|
| user | `POST /api/v1/users/register`, `/login`, `/refresh`, `/forgot-password`, `/reset-password` | public |
| user | `GET/PUT /api/v1/users/profile`, `GET /me`, `POST /verify-email/request`, `/verify-email/confirm`, `/become-seller` | JWT |
| user | `POST /api/v1/users/admin/create`, `GET /admin/lookup` | ADMIN |
| user | `GET/POST /api/v1/users/addresses`, `GET /addresses/{id}` | JWT |
| user | `GET /api/v1/wishlist`, `POST /wishlist/toggle` | JWT |
| product | `GET /api/v1/products`, `/{id}`, `/search`, `/category/{id}`, `/sku/{sku}`, `/sku/{sku}/price`, `/categories`, `/exists/{sku}`, `/images/**` | public |
| product | `POST /api/v1/products`, `PUT/DELETE /{id}`, `POST /images` (multipart), `GET /seller/{id}` | JWT (seller) |
| product | `POST /api/v1/products/categories` | ADMIN |
| inventory | `GET /api/v1/inventory/{sku}` | public |
| inventory | `POST /api/v1/inventory/add` | SELLER or ADMIN |
| inventory | `POST /reserve`, `/release`, `/deduct` | JWT / internal (called by order-service) |
| cart | `GET /api/v1/carts`, `POST /add`, `POST /decrease`, `DELETE /items/{sku}`, `DELETE /` | JWT |
| coupon | `POST /api/v1/coupons`, `GET /api/v1/coupons`, `GET /validate/{code}`, `POST /consume/{code}` | JWT (create / list: ADMIN) |
| order | `POST /api/v1/orders` (cart checkout), `POST /direct` (buy now), `GET /`, `GET /{id}` | JWT |
| order | `PUT /{id}/cancel`, `PUT /{id}/pay`, `GET /seller-summary`, `GET /internal/verify-purchase` | JWT / internal |
| order | `GET /all`, `PUT /{id}/status` | ADMIN |
| payment | `POST /api/v1/payments/create-intent/{orderId}` | JWT |
| payment | `POST /api/v1/payments/webhook/razorpay` | Razorpay signature |
| review | `GET /api/v1/reviews/product/{productId}` | public |
| review | `POST /api/v1/reviews` | JWT, verified purchase |

## 3. Checkout saga — cart checkout (`OrderService.placeOrder`)

Wrapped in `@Transactional` and a Resilience4j `@CircuitBreaker("inventoryService")`.

```mermaid
sequenceDiagram
    autonumber
    actor U as Buyer
    participant GW as API Gateway
    participant O as order-service
    participant C as cart-service
    participant CP as coupon-service
    participant US as user-service
    participant I as inventory-service
    participant K as Kafka
    participant P as payment-service

    U->>GW: POST /api/v1/orders (JWT)
    GW->>GW: validate JWT, add X-User-Id / X-User-Role
    GW->>O: forward
    O->>C: getCart(userId)
    C-->>O: cart snapshot
    alt cart empty
        O-->>U: 400 Cart is empty
    end
    opt coupon code supplied
        O->>CP: consumeCoupon(code)
        CP-->>O: discount, or invalid / expired / maxed out
    end
    O->>US: getAddressById(userId, addressId)
    US-->>O: address, copied into the order as a snapshot
    loop each cart item
        O->>I: reserveStock(sku, qty)
        I-->>O: true / false
    end
    alt any reserve returned false
        O->>I: releaseStock for reserved items
        O-->>U: 400 Insufficient stock
    end
    Note over O: Compute fees. Status = PROCESSING for COD, else PLACED.<br/>paymentStatus = PENDING. Save order and line items.
    O->>K: notificationTopic (order placed)
    O->>K: order-events-topic
    O->>C: clearCart(userId)
    O-->>U: 201 orderId
    K->>P: order-events-topic
    P->>P: create Payment(PENDING)
    Note over O,I: On any exception after reservation: release stock and throw "Checkout failed, inventory released."
```

`POST /direct` (`placeDirectOrder`) is the same saga for a single SKU, with the price looked up
from product-service and no cart read or clear.

**Fees:** a flat delivery fee applies below a configurable order threshold, and a separate
platform fee applies to COD. The same rule is implemented on the frontend and the backend.

## 4. Online payment flow (Razorpay)

```mermaid
sequenceDiagram
    autonumber
    actor U as Buyer (browser)
    participant GW as API Gateway
    participant P as payment-service
    participant R as Razorpay
    participant K as Kafka
    participant O as order-service
    participant I as inventory-service
    participant N as notification-service

    U->>GW: POST /payments/create-intent/{orderId}
    GW->>P: forward
    P->>R: create Razorpay order
    R-->>P: razorpayOrderId
    P-->>U: razorpayOrderId (opens checkout widget)
    U->>R: pay (UPI / card)
    R->>GW: POST /payments/webhook/razorpay
    GW->>P: forward
    P->>P: verify signature
    alt success (order.paid)
        P->>P: Payment = COMPLETED
        P->>K: payment-events-topic (SUCCESS)
        K->>O: consume
        O->>O: confirmOrderPayment: paymentStatus COMPLETED, order PROCESSING
        O->>K: order-paid-topic
        K->>I: consume
        I->>I: deductReservedStock
    else failed
        P->>P: Payment = FAILED
        P->>K: payment-events-topic (FAILED)
        K->>O: consume
        O->>O: handleFailedPayment: order CANCELLED, paymentStatus FAILED
        O->>K: order-cancelled-topic
        K->>I: consume
        I->>I: releaseReservedStock
    end
    O->>K: order-notification-topic
    K->>N: consume
    N->>U: email (order status)
```

Idempotency: `confirmOrderPayment` returns early if payment is already `COMPLETED`, and the
payment webhook ignores a repeat `COMPLETED`. A non-2xx webhook response makes Razorpay retry.

## 5. State machines

### Order status

```mermaid
stateDiagram-v2
    [*] --> PLACED: online payment, awaiting payment
    [*] --> PROCESSING: COD (fast-tracked)
    PLACED --> PROCESSING: payment COMPLETED
    PLACED --> CANCELLED: payment FAILED / user cancel
    PROCESSING --> SHIPPED: admin
    PROCESSING --> CANCELLED: user cancel
    SHIPPED --> DELIVERED: admin
    DELIVERED --> [*]
    CANCELLED --> [*]
```

Guards in `OrderService`: SHIPPED and DELIVERED orders cannot be cancelled; admin may only set
`SHIPPED` (from `PROCESSING`) or `DELIVERED` (from `SHIPPED`); a cancelled order cannot be cancelled twice.

### Payment status

```mermaid
stateDiagram-v2
    [*] --> PENDING: order-events-topic received
    PENDING --> COMPLETED: webhook success
    PENDING --> FAILED: webhook failed
```

`REFUNDED` exists in the `PaymentStatus` enum but no code path sets it yet.

### Inventory (stock per SKU)

```mermaid
stateDiagram-v2
    direction LR
    Available --> Reserved: reserve (checkout)
    Reserved --> Available: release (failure / cancel)
    Reserved --> Deducted: deduct (order paid)
```

## 6. Authentication and request pipeline

```mermaid
sequenceDiagram
    participant FE as Angular
    participant GW as Gateway (AuthenticationFilter)
    participant S as Downstream service

    FE->>GW: request with Authorization: Bearer JWT
    alt route is public
        GW->>S: forward as is
    else protected route
        GW->>GW: JwtUtil validates signature and expiry
        alt invalid or missing
            GW-->>FE: 401
        else valid
            GW->>S: forward with X-User-Id and X-User-Role
            S-->>FE: response
        end
    end
```

Services read `X-User-Id` / `X-User-Role` and never parse the JWT themselves. Tokens are refreshed
via `POST /api/v1/users/refresh`.

## 7. Email flows (user-service to notification-service)

```mermaid
sequenceDiagram
    actor U as User
    participant US as user-service
    participant K as Kafka
    participant N as notification-service
    participant M as SMTP (Gmail / MailHog)

    U->>US: POST /forgot-password (or /verify-email/request)
    US->>US: create token with expiry
    US->>K: password-reset-topic / email-verification-topic
    K->>N: consume
    N->>M: send branded HTML email
    M-->>U: OTP email
    U->>US: POST /reset-password (or /verify-email/confirm)
    US->>US: validate token and expiry
```

## 8. Internal class layout (typical service)

Each Spring Boot service follows the same layering, shown here for order-service.

```mermaid
classDiagram
    class OrderController {
        +placeOrder()
        +placeDirectOrder()
        +getOrders()
        +cancelOrder()
        +updateStatus()
    }
    class OrderService {
        +placeOrder()
        +placeDirectOrder()
        +confirmOrderPayment()
        +handleFailedPayment()
        +cancelOrder()
        +updateOrderStatus()
        +checkPurchaseHistory()
    }
    class OrderEventPublisher {
        +publishOrderPaidEvent()
        +publishOrderCancelledEvent()
    }
    class PaymentEventListener {
        +onPaymentEvent()
    }
    class OrderRepository
    class CartClient
    class InventoryClient
    class CouponClient
    class UserClient
    class ProductClient
    class Order
    class OrderLineItem

    OrderController --> OrderService
    OrderService --> OrderRepository
    OrderService --> OrderEventPublisher
    OrderService --> CartClient
    OrderService --> InventoryClient
    OrderService --> CouponClient
    OrderService --> UserClient
    OrderService --> ProductClient
    PaymentEventListener --> OrderService
    OrderRepository --> Order
    Order "1" *-- "many" OrderLineItem
```

Layering convention: `controller` (REST) to `service` (business logic, transactions) to `repository`
(Spring Data JPA); `client` (Feign interfaces), `listener` (Kafka consumers), `dto`, `entity`,
`exception` (global handler).

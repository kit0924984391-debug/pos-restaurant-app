/**
 * GraphQL Implementation - Schema Definition Language (SDL)
 * 
 * Defines all Types, Queries, Mutations, and Inputs for the POS system.
 */

export const typeDefs = /* GraphQL */ `
  enum OrderStatus {
    PENDING
    COOKING
    READY
    SERVED
    COMPLETED
    CANCELLED
  }

  enum PaymentStatus {
    UNPAID
    PENDING_CONFIRMATION
    PAID
    REFUNDED
  }

  enum OrderType {
    DINE_IN
    TAKEAWAY
    DELIVERY
  }

  type Store {
    id: ID!
    name: String!
    slug: String!
    address: String
    phone: String
    promptPayId: String
    promptPayName: String
    pointsRate: Float
    tables: [Table!]!
    menuItems(category: String): [MenuItem!]!
    activeOrders: [Order!]!
  }

  type MenuItem {
    id: ID!
    storeId: ID!
    name: String!
    nameEn: String
    category: String!
    price: Float!
    cost: Float
    description: String
    imageUrl: String
    isAvailable: Boolean!
  }

  type Table {
    id: ID!
    storeId: ID!
    tableNo: Int!
    name: String!
    status: String!
    activeOrdersCount: Int!
    totalAmount: Float!
    orders: [Order!]!
  }

  type OrderItem {
    id: ID!
    orderId: ID!
    menuItemId: ID!
    name: String!
    price: Float!
    quantity: Int!
    notes: String
    menuItem: MenuItem
  }

  type Order {
    id: ID!
    storeId: ID!
    orderNumber: Int!
    status: OrderStatus!
    paymentStatus: PaymentStatus!
    orderType: OrderType!
    orderChannel: String!
    tableId: ID
    tableNo: Int
    customerName: String
    totalAmount: Float!
    discountAmount: Float!
    netAmount: Float!
    items: [OrderItem!]!
    createdAt: String!
    updatedAt: String
  }

  type Promotion {
    id: ID!
    name: String!
    code: String!
    discountType: String!
    discountValue: Float!
    isActive: Boolean!
  }

  type Member {
    id: ID!
    name: String!
    phone: String!
    points: Int!
    totalSpent: Float!
    totalOrders: Int!
  }

  type PaginationInfo {
    total: Int!
    page: Int!
    limit: Int!
    totalPages: Int!
    hasNext: Boolean!
    hasPrev: Boolean!
  }

  type PaginatedOrders {
    items: [Order!]!
    pagination: PaginationInfo!
  }

  input OrderItemInput {
    menuItemId: ID!
    name: String
    price: Float
    quantity: Int!
    notes: String
  }

  input CreateOrderInput {
    tableNo: Int
    tableId: ID
    orderType: OrderType
    orderChannel: String
    items: [OrderItemInput!]!
    customerName: String
    memberPhone: String
    promoCode: String
    discountAmount: Float
    note: String
  }

  type OrderMutationResponse {
    success: Boolean!
    message: String
    order: Order
  }

  type TableMutationResponse {
    success: Boolean!
    message: String
    table: Table
  }

  type Query {
    # Store queries
    store(slug: String!): Store

    # Menu queries
    menu(slug: String!, category: String): [MenuItem!]!

    # Table queries
    tables(slug: String!): [Table!]!
    table(slug: String!, tableNo: Int!): Table

    # Order queries
    orders(slug: String!, status: String, page: Int = 1, limit: Int = 20): PaginatedOrders!
    order(id: ID!): Order

    # Promotion & Member queries
    promotions(slug: String!): [Promotion!]!
    members(slug: String!, search: String): [Member!]!
  }

  type Mutation {
    createOrder(slug: String!, input: CreateOrderInput!): OrderMutationResponse!
    updateOrderStatus(orderId: ID!, status: OrderStatus!): OrderMutationResponse!
    clearTable(slug: String!, tableNo: Int!): TableMutationResponse!
  }
`;

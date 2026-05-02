# Stage 1

## Core Actions for Notification Platform
1. **Fetch Notifications**: Retrieve a list of notifications for the logged-in user.
2. **Mark Notification as Read**: Update the status of a specific notification to 'read'.
3. **Mark All Notifications as Read**: Update the status of all unread notifications for the user to 'read'.
4. **Delete Notification**: Remove a specific notification.
5. **Get Unread Notification Count**: Retrieve the total number of unread notifications for the logged-in user.

## REST API Endpoints

### 1. Fetch Notifications
**Endpoint:** `GET /api/v1/notifications`
**Description:** Retrieves a paginated list of notifications for the authenticated user.

**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Accept": "application/json"
}
```

**Query Parameters (Optional):**
- `page` (integer): Page number for pagination (default: 1).
- `limit` (integer): Number of items per page (default: 20).
- `status` (string): Filter by status (`read`, `unread`).

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_12345",
        "type": "PLACEMENT_UPDATE",
        "title": "New Placement Drive",
        "message": "Google is visiting the campus on 15th May.",
        "status": "unread",
        "actionUrl": "/placements/google",
        "createdAt": "2024-05-01T10:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 42
    }
  }
}
```

### 2. Mark Notification as Read
**Endpoint:** `PATCH /api/v1/notifications/:id/read`
**Description:** Marks a specific notification as read.

**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Request Body:** (Empty)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification marked as read."
}
```

### 3. Mark All Notifications as Read
**Endpoint:** `POST /api/v1/notifications/mark-all-read`
**Description:** Marks all unread notifications for the user as read.

**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Request Body:** (Empty)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "All notifications marked as read."
}
```

### 4. Delete Notification
**Endpoint:** `DELETE /api/v1/notifications/:id`
**Description:** Deletes a specific notification.

**Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification deleted successfully."
}
```

### 5. Get Unread Notification Count
**Endpoint:** `GET /api/v1/notifications/unread-count`
**Description:** Retrieves the count of unread notifications.

**Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

## Real-time Notifications Mechanism

To support real-time notifications when users are logged in, I propose using **WebSockets** (e.g., using Socket.io or native WebSockets) or **Server-Sent Events (SSE)**.
Given that notifications are primarily one-way communication from the server to the client after initial connection, **Server-Sent Events (SSE)** is an excellent, lightweight choice. However, if bidirectional real-time communication is needed in the future, **WebSockets** would be preferred.

**Implementation with WebSockets:**
1. **Connection:** When a user logs in, the client establishes a WebSocket connection to the server (`ws://api.campus.edu/notifications`).
2. **Authentication:** The connection request includes the JWT token for authentication.
3. **Event Emission:** When a new event occurs (e.g., a new placement result), the backend service publishes the event to a message broker (like Redis Pub/Sub or RabbitMQ).
4. **Delivery:** The WebSocket server listens to the message broker, identifies the connected client(s) associated with the user ID, and pushes the notification payload to them in real-time.

**Real-time Event Payload:**
```json
{
  "event": "new_notification",
  "data": {
    "id": "notif_12346",
    "type": "EVENT_REMINDER",
    "title": "Tech Fest Tomorrow",
    "message": "Don't forget the annual Tech Fest starts tomorrow at 9 AM.",
    "status": "unread",
    "actionUrl": "/events/tech-fest",
    "createdAt": "2024-05-02T08:00:00Z"
  }
}
```

# Stage 2

## Persistent Storage Choice

For a notification system, the choice of database depends on the access patterns and data volume. I suggest using a **NoSQL database like MongoDB** for the following reasons:

1. **Flexible Schema:** Notification payloads can vary significantly depending on the type (Placement, Event, Result). Some might need extra metadata. Document databases handle this variation naturally without complex schema migrations.
2. **High Write Throughput:** Notification systems are often write-heavy, especially when broadcasting announcements to all students. MongoDB handles high write volumes efficiently.
3. **Read Performance:** Fetching the latest notifications for a user is a frequent operation. Document databases can store the notification record completely denormalized, allowing for fast retrieval.
4. **Time-To-Live (TTL) Indexes:** Notifications are ephemeral. MongoDB supports TTL indexes, automatically deleting old, read notifications after a certain period (e.g., 30 days) to save storage space.

*Alternative: PostgreSQL with JSONB columns is also a solid choice if strict ACID compliance across multiple tables is required, but MongoDB's schema-less nature is often preferred for simple event streams like notifications.*

## Database Schema (MongoDB Document Structure)

**Collection:** `notifications`

```json
{
  "_id": ObjectId("60b8d295f1d2..."),
  "userId": "user_78910",        // Indexed for fast retrieval per user
  "type": "PLACEMENT_UPDATE",    // Enum: PLACEMENT_UPDATE, EVENT_UPDATE, RESULT_PUBLISHED
  "title": "New Placement Drive",
  "message": "Google is visiting the campus on 15th May.",
  "status": "unread",            // Enum: unread, read
  "actionUrl": "/placements/google",
  "metadata": {                  // Flexible schema for extra data
    "companyId": "comp_112",
    "deadline": "2024-05-10T23:59:59Z"
  },
  "createdAt": ISODate("2024-05-01T10:00:00Z"), // Indexed for sorting, and possibly TTL
  "readAt": null
}
```

**Indexes:**
- `{ userId: 1, createdAt: -1 }` (Compound index for fetching user's latest notifications)
- `{ userId: 1, status: 1 }` (Compound index for fetching unread count quickly)

## Scalability and Data Volume Problems & Solutions

**Problems as data volume increases:**
1. **Storage Cost:** Storing every notification forever for every student will consume massive amounts of disk space.
2. **Slow Queries:** Even with indexes, if a user's notification list grows to tens of thousands, pagination and unread counts can become slower.
3. **Broadcast Storms:** Sending a single notification to all 10,000 students requires inserting 10,000 records, potentially overloading the database.

**Solutions:**
1. **Data Retention Policy (TTL):** Implement a TTL index on `createdAt` to automatically delete notifications older than a specific timeframe (e.g., 3 months).
2. **Archiving:** Move old, read notifications to a cheaper, slower storage layer (like Amazon S3 or a data lake) if compliance requires keeping them.
3. **Fan-out on Read for Broadcasts:** Instead of inserting 10,000 documents for a global announcement, insert one document in a `global_notifications` collection. When a user requests their notifications, the backend merges their individual `notifications` with the active `global_notifications`. A separate record tracks which global notifications the user has read.
4. **Caching:** Cache the "unread count" in Redis to avoid hitting the database on every page load or API request. Invalidate the cache when a new notification is inserted or marked as read.

## Queries (NoSQL - MongoDB)

Based on the REST APIs designed in Stage 1:

**1. Fetch Notifications (Paginated)**
```javascript
// GET /api/v1/notifications?page=1&limit=20
const page = 1;
const limit = 20;
const skip = (page - 1) * limit;

db.notifications.find({ userId: "user_78910" })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
```

**2. Mark Notification as Read**
```javascript
// PATCH /api/v1/notifications/:id/read
db.notifications.updateOne(
  { _id: ObjectId("notif_id_here"), userId: "user_78910" },
  { 
    $set: { 
      status: "read",
      readAt: new Date()
    } 
  }
);
```

**3. Mark All Notifications as Read**
```javascript
// POST /api/v1/notifications/mark-all-read
db.notifications.updateMany(
  { userId: "user_78910", status: "unread" },
  { 
    $set: { 
      status: "read",
      readAt: new Date()
    } 
  }
);
```

**4. Delete Notification**
```javascript
// DELETE /api/v1/notifications/:id
db.notifications.deleteOne(
  { _id: ObjectId("notif_id_here"), userId: "user_78910" }
);
```

**5. Get Unread Notification Count**
```javascript
// GET /api/v1/notifications/unread-count
db.notifications.countDocuments({ 
  userId: "user_78910", 
  status: "unread" 
});
```

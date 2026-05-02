# Stage 1

## Core Actions
Based on the need to display notifications to logged-in users, the core actions the platform should support are:
1. **Fetch Notifications**: Retrieve a list of notifications for the user.
2. **Mark Notification as Read**: Update the status of a single notification to read.
3. **Mark All Notifications as Read**: Update all unread notifications to read.
4. **Get Unread Count**: Fetch the total count of unread notifications.

## REST API Endpoints

### 1. Fetch Notifications
**Endpoint:** `GET /notifications`
**Description:** Retrieves notifications for the logged-in user.

**Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Response (200 OK):**
```json
{
  "notifications": [
    {
      "id": "notif-1",
      "type": "PLACEMENT",
      "title": "Google Placement Drive",
      "message": "Registrations open for Google placement drive.",
      "status": "unread",
      "createdAt": "2024-05-01T10:00:00Z"
    },
    {
      "id": "notif-2",
      "type": "EVENT",
      "title": "Tech Fest 2024",
      "message": "Annual tech fest begins tomorrow.",
      "status": "read",
      "createdAt": "2024-04-28T09:00:00Z"
    }
  ],
  "total": 2
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized access"
}
```

### 2. Mark Notification as Read
**Endpoint:** `PATCH /notifications/:id/read`
**Description:** Marks a specific notification as read.

**Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "message": "Notification marked as read"
}
```

**Response (404 Not Found):**
```json
{
  "error": "Notification not found"
}
```

### 3. Mark All Notifications as Read
**Endpoint:** `POST /notifications/mark-all-read`
**Description:** Marks all unread notifications as read.

**Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "message": "All notifications marked as read"
}
```

### 4. Get Unread Count
**Endpoint:** `GET /notifications/unread-count`
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
  "unreadCount": 1
}
```

## Real-Time Notifications Mechanism

For real-time notifications to users who are currently logged in, **Server-Sent Events (SSE)** is the most appropriate and lightweight mechanism. 

**Implementation Details:**
1. **Connection:** When the user logs into the frontend application, the client establishes an SSE connection by sending a `GET` request to `GET /notifications/stream` with their `Authorization: Bearer <token>` header.
2. **Push Mechanism:** The backend holds the connection open. Whenever a new event is generated (e.g., a new Placement Result is published), the backend service formats the notification payload and pushes it down the open SSE connection to the specific user.
3. **Payload Structure:** 
   The data sent over the SSE connection would look like this:
   ```json
   data: {"event": "new_notification", "notification": {"id": "notif-3", "type": "RESULT", "title": "End Semester Results", "message": "Your results are out.", "status": "unread", "createdAt": "2024-05-02T12:00:00Z"}}
   ```
4. **Alternative:** If full bidirectional communication is required later, **WebSockets** (using libraries like `Socket.io`) could be used, but for pushing notifications, SSE is simpler and natively supported over standard HTTP.

"use strict";

const { log } = require("./logger");
const { readJson, sendJson } = require("./utils");
const { baseUrl } = require("./config");

// Mock database to hold notifications locally for demonstration
let notificationsDb = [
  {
    id: "notif-1",
    userId: "user_78910",
    type: "PLACEMENT",
    title: "Google Placement Drive",
    message: "Registrations open for Google placement drive.",
    status: "unread",
    createdAt: "2024-05-01T10:00:00Z"
  },
  {
    id: "notif-2",
    userId: "user_78910",
    type: "EVENT",
    title: "Tech Fest 2024",
    message: "Annual tech fest begins tomorrow.",
    status: "read",
    createdAt: "2024-04-28T09:00:00Z"
  }
];

// Helper to extract a user from the Authorization token
function getUserIdFromRequest(req) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return null;
  // In a real application, you would verify the JWT here.
  // For now, we return a hardcoded user ID
  return "user_78910"; 
}

// 1. Fetch Notifications
async function fetchNotifications(req, res) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return sendJson(res, 401, { error: "Unauthorized access" });
  }

  const userNotifications = notificationsDb.filter(n => n.userId === userId);
  
  log("info", "controller", `Fetched ${userNotifications.length} notifications for user ${userId}`);
  sendJson(res, 200, {
    notifications: userNotifications,
    total: userNotifications.length
  });
}

// 2. Mark Notification as Read
async function markNotificationAsRead(req, res, id) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return sendJson(res, 401, { error: "Unauthorized access" });
  }

  const notification = notificationsDb.find(n => n.id === id && n.userId === userId);
  if (!notification) {
    log("warn", "controller", `Notification ${id} not found for user ${userId}`);
    return sendJson(res, 404, { error: "Notification not found" });
  }

  notification.status = "read";
  log("info", "controller", `Marked notification ${id} as read for user ${userId}`);
  sendJson(res, 200, { status: "ok", message: "Notification marked as read" });
}

// 3. Mark All Notifications as Read
async function markAllNotificationsAsRead(req, res) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return sendJson(res, 401, { error: "Unauthorized access" });
  }

  let count = 0;
  notificationsDb = notificationsDb.map(n => {
    if (n.userId === userId && n.status === "unread") {
      count++;
      return { ...n, status: "read" };
    }
    return n;
  });

  log("info", "controller", `Marked ${count} notifications as read for user ${userId}`);
  sendJson(res, 200, { status: "ok", message: "All notifications marked as read" });
}

// 4. Get Unread Count
async function getUnreadCount(req, res) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return sendJson(res, 401, { error: "Unauthorized access" });
  }

  const count = notificationsDb.filter(n => n.userId === userId && n.status === "unread").length;
  sendJson(res, 200, { unreadCount: count });
}

// 5. Server-Sent Events (SSE) Stream for Real-Time Updates
async function streamNotifications(req, res) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return sendJson(res, 401, { error: "Unauthorized access" });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  log("info", "controller", `User ${userId} subscribed to SSE notifications`);

  // Send an initial connected message
  res.write(`data: ${JSON.stringify({ event: "connected", message: "Listening for notifications" })}\n\n`);

  // Optional: Emit a mock real-time notification every 30 seconds
  const intervalId = setInterval(() => {
    const newNotif = {
      id: `notif-${Date.now()}`,
      type: "ALERT",
      title: "Real-time Alert",
      message: "This is a live notification update.",
      status: "unread",
      createdAt: new Date().toISOString()
    };
    notificationsDb.push({ ...newNotif, userId });
    res.write(`data: ${JSON.stringify({ event: "new_notification", notification: newNotif })}\n\n`);
  }, 30000);

  req.on("close", () => {
    clearInterval(intervalId);
    log("info", "controller", `User ${userId} SSE connection closed`);
  });
}

// Main router function to handle /notifications/* endpoints
async function notificationRouter(req, res, pathname) {
  if (req.method === "GET" && pathname === "/notifications") {
    return fetchNotifications(req, res);
  }
  
  if (req.method === "GET" && pathname === "/notifications/unread-count") {
    return getUnreadCount(req, res);
  }

  if (req.method === "GET" && pathname === "/notifications/stream") {
    return streamNotifications(req, res);
  }

  if (req.method === "POST" && pathname === "/notifications/mark-all-read") {
    return markAllNotificationsAsRead(req, res);
  }

  const patchMatch = pathname.match(/^\/notifications\/([^/]+)\/read$/);
  if (req.method === "PATCH" && patchMatch) {
    return markNotificationAsRead(req, res, patchMatch[1]);
  }

  log("warn", "route", `No notification route matched ${req.method} ${pathname}`);
  sendJson(res, 404, { error: "route not found" });
}

module.exports = {
  notificationRouter
};

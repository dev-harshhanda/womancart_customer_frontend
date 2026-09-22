"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useSelector } from "react-redux";
import { getToken } from "@/lib/slices/authSlice";
import { getFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { SOCKET_URL } from "@/constants/url";
import toast from "react-hot-toast";

interface UseDriverSocketOptions {
  bookingId: string | null;
  enabled?: boolean;
  onMessage?: (data: any) => void;
  /** Called when server emits live_tracking (e.g. driver lat/long) */
  onLiveTracking?: (data: any) => void;
  /** Called when server emits order_status_change (order_status, delivery_status, etc.) */
  onOrderStatusChange?: (data: any) => void;
}

interface UseDriverSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (message: string) => void;
  error: string | null;
  reconnect: () => void;
}

export function useDriverSocket({
  bookingId,
  enabled = true,
  onMessage,
  onLiveTracking,
  onOrderStatusChange,
}: UseDriverSocketOptions): UseDriverSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onLiveTrackingRef = useRef(onLiveTracking);
  onLiveTrackingRef.current = onLiveTracking;
  const onOrderStatusChangeRef = useRef(onOrderStatusChange);
  onOrderStatusChangeRef.current = onOrderStatusChange;

  // Get token from Redux or storage
  const reduxToken = useSelector(getToken);
  // API auth token (used for REST calls)
  const webToken = getFromStorage(STORAGE_KEYS.token);
  // Node/JWT token used by Node APIs (and sockets)
  const nodeToken = getFromStorage(STORAGE_KEYS.tokenNode);
  // For sockets, prefer the Node JWT token (this is what backend expects),
  // then fall back to Redux/API token if ever needed.
  const authToken =
    (nodeToken && nodeToken.toString().trim()) ||
    ((reduxToken as string | null | undefined) &&
      reduxToken!.toString().trim()) ||
    (webToken && webToken.toString().trim()) ||
    "";


  // Reconnect function
  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.close();
      socketRef.current = null;
    }
    setSocket(null);
    setIsConnected(false);
    setError(null);
    // Force reconnection by clearing socket state
    setTimeout(() => {
      setSocket(null);
    }, 100);
  }, []);

  // Send message function
  const sendMessage = useCallback(
    (message: string) => {
      if (!socketRef.current || !isConnected || !message.trim() || !bookingId) {
        if (!isConnected) {
          toast.error("Not connected to chat. Please wait...");
        }
        return;
      }

      // Emitter: send_message_to_driver
      // Payload format: { bookingId: string, message: string }
      const payload = {
        bookingId: bookingId,
        message: message.trim(),
      };

      try {
        socketRef.current.emit("send_message_to_driver", payload);
      } catch (err) {
        console.error("❌ Error sending message:", err);
        toast.error("Failed to send message");
      }
    },
    [isConnected, bookingId]
  );

  useEffect(() => {
    // Don't connect if disabled, no bookingId, or no auth token
    if (!enabled || !bookingId || !authToken) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Don't reconnect if socket already exists
    if (socketRef.current) {
      return;
    }


    // Validate token before connecting
    if (!authToken || !authToken.toString().trim()) {
      console.error("❌ No valid token found");
      setError("No authentication token found. Please login first.");
      toast.error("Please login to use chat");
      return;
    }

    try {
      const newSocket = io(SOCKET_URL, {
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 20000,
        forceNew: true,
        autoConnect: true,
        upgrade: true,
        rememberUpgrade: false,
        // Auth object - only token (as per requirements)
        auth: {
          token: authToken,
        },
      });

      // Log auth object being sent

      socketRef.current = newSocket;
      setSocket(newSocket);

      // Connection successful
      newSocket.on("connect", () => {
        setIsConnected(true);
        setError(null);
        // Subscribe to live_tracking for this booking (server may require this to send tracking events)
        if (bookingId) {
          newSocket.emit("subscribe_live_tracking", { bookingId });
        }
      });

      // Connection error
      newSocket.on("connect_error", (err: any) => {
        console.error("❌ Socket connection error:", err);
        console.error("Error details:", {
          message: err?.message,
          description: err?.description,
          data: err?.data,
          type: err?.type,
          context: err?.context,
        });
        setIsConnected(false);

        // Extract error message from various possible locations
        let errorMessage = "Authentication error";
        
        // Check error.data first (most common location for server errors)
        if (err?.data) {
          if (typeof err.data === "string") {
            try {
              const parsed = JSON.parse(err.data);
              errorMessage = parsed.message || parsed.error || errorMessage;
            } catch {
              errorMessage = err.data;
            }
          } else if (err.data.message) {
            errorMessage = err.data.message;
          } else if (err.data.error) {
            errorMessage = err.data.error;
          }
        } 
        // Check error.message
        else if (err?.message) {
          errorMessage = err.message;
        } 
        // Check error.description
        else if (err?.description) {
          errorMessage = err.description;
        }

        console.error("Extracted error message:", errorMessage);
        setError(errorMessage);

        // Show alert for specific errors
        if (errorMessage.includes("Session ID unknown") || errorMessage.includes("Session ID")) {
          toast.error("Session expired. Please refresh the page and login again.", {
            duration: 5000,
          });
        } else if (errorMessage.includes("Authentication error") || errorMessage.includes("Authentication")) {
          toast.error("Authentication failed. Please check your login and try again.", {
            duration: 5000,
          });
        } else {
          toast.error(`Connection failed: ${errorMessage}`, {
            duration: 4000,
          });
        }
      });

      // Disconnected
      newSocket.on("disconnect", (reason: string) => {
        setIsConnected(false);

        if (reason === "io server disconnect") {
          // Server disconnected, don't reconnect automatically
          setError("Disconnected from server");
          toast.error("Disconnected from server", {
            icon: "⚠️",
            duration: 4000,
          });
        } else {
          // Client disconnected or network issue
          toast("Disconnected from chat", {
            icon: "⚠️",
            duration: 3000,
          });
        }
      });

      // Reconnection events
      newSocket.on("reconnect_attempt", () => {
        setError("Reconnecting...");
      });

      newSocket.on("reconnect", () => {
        setIsConnected(true);
        setError(null);
        // toast.success("Reconnected to chat", {
        //   icon: "✅",
        //   duration: 3000,
        // });
      });

      newSocket.on("reconnect_error", (err) => {
        console.error("❌ Reconnection error:", err);
        setError("Reconnection failed");
      });

      newSocket.on("reconnect_failed", () => {
        console.error("❌ Reconnection failed after all attempts");
        setError("Unable to reconnect. Please refresh the page.");
        toast.error("Connection lost. Please refresh the page.", {
          duration: 5000,
        });
      });

      // Listener: message_received
      newSocket.on("message_received", (data: any) => {
        if (onMessage) {
          onMessage(data);
        } else {
          console.warn("⚠️ No onMessage callback provided");
        }
      });

      // Listener: live_tracking - driver position / tracking data from server
      newSocket.on("live_tracking", (data: any) => {
        const cb = onLiveTrackingRef.current;
        if (cb) {
          cb(data);
        } else {
          console.warn("📍 [useDriverSocket] live_tracking: no onLiveTracking callback provided");
        }
      });

      // Listener: order_status_change - real-time order/delivery status updates
      newSocket.on("order_status_change", (data: any) => {
        const cb = onOrderStatusChangeRef.current;
        if (cb) {
          cb(data);
        } else {
          console.warn("⚠️ [useDriverSocket] order_status_change: no onOrderStatusChange callback provided");
        }
      });

      // Cleanup on unmount
      return () => {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
        if (newSocket) {
          newSocket.removeAllListeners();
          newSocket.close();
        }
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        setError(null);
      };
    } catch (err: any) {
      console.error("❌ Failed to initialize socket:", err);
      setIsConnected(false);
      setError(`Failed to initialize: ${err.message || "Unknown error"}`);
      toast.error("Failed to initialize socket connection");
    }
  }, [enabled, bookingId, authToken, onMessage, onLiveTracking, onOrderStatusChange]);

  return {
    socket,
    isConnected,
    sendMessage,
    error,
    reconnect,
  };
}

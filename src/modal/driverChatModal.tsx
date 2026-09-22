/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
"use client";
import { Dispatch, SetStateAction, useEffect, useRef, useState, useCallback } from "react";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import PhoneIcon from "@mui/icons-material/Phone";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { Button, Modal, TextField, Box, CircularProgress } from "@mui/material";
import toast from "react-hot-toast";
import { useDriverSocket } from "@/hooks/useDriverSocket";
import { useLazyGetChatHistoryQuery } from "@/service/order";

interface DriverChatModalProps {
  open: boolean;
  onClose: () => void;
  setOpen: Dispatch<SetStateAction<boolean>>;
  bookingId: string | null;
  driverData?: any | null;
}

interface Message {
  id?: number;
  message: string;
  timestamp: Date;
  isFromDriver?: boolean;
  isSender?: boolean; // true if senderType == 1 (user), false otherwise (driver)
}

export default function DriverChatModal({
  open,
  onClose,
  setOpen,
  bookingId,
  driverData,
}: DriverChatModalProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistoryNextCursor, setChatHistoryNextCursor] = useState<number | null>(null);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [fetchChatHistory, { data: chatHistoryData, isSuccess: chatHistorySuccess, isLoading: chatHistoryLoading }] =
    useLazyGetChatHistoryQuery();

  // Handle incoming messages - check senderType to determine alignment
  const handleIncomingMessage = useCallback((data: any) => {
    const receivedMessage = data.message || data.text || data.content || "";
    const senderType = data.senderType;
    
    if (receivedMessage) {
      // senderType == 1 means it's from user (right side), otherwise from driver (left side)
      const isSender = senderType === 1;
      
      setMessages((prev) => {
        // Check if this message is a duplicate (same content and senderType within last 2 seconds)
        const now = new Date();
        const isDuplicate = prev.some((msg) => {
          const timeDiff = Math.abs(now.getTime() - msg.timestamp.getTime());
          return (
            msg.message === receivedMessage &&
            msg.isSender === isSender &&
            timeDiff < 2000 // 2 seconds window
          );
        });
        
        // Don't add if it's a duplicate
        if (isDuplicate) {
          return prev;
        }
        
        // Add new message
        return [
          ...prev,
          {
            message: receivedMessage,
            timestamp: now,
            isFromDriver: !isSender, // Driver message if not sender
            isSender: isSender, // User message if senderType == 1
          },
        ];
      });
      
      if (!isSender) {
        toast.success("New message from driver");
      }
    }
  }, []);

  // Use the socket hook
  const { socket, isConnected, sendMessage, error, reconnect } = useDriverSocket({
    bookingId,
    enabled: open && !!bookingId,
    onMessage: handleIncomingMessage,
  });


  // Convert API chat message to Message type (sender_type "1" = user)
  const apiMessageToMessage = useCallback(
    (m: { id: number; sender_type: string; message: string; createdAt: string }): Message => ({
      id: m.id,
      message: m.message,
      timestamp: new Date(m.createdAt),
      isSender: m.sender_type === "1",
      isFromDriver: m.sender_type !== "1",
    }),
    []
  );

  // Sort messages by timestamp ascending so latest message shows at bottom
  const sortByTime = useCallback((a: Message, b: Message) => a.timestamp.getTime() - b.timestamp.getTime(), []);

  // Apply chat history API result to state (used from promise callback so it runs when API returns, including after logout/remount)
  const applyChatHistoryResult = useCallback(
    (result: { data?: { data?: { messages?: unknown[]; nextCursor?: number | null } } }, isLoadMore: boolean) => {
      if (!result?.data?.data) return;
      const list = (result.data.data.messages || []) as Array<{
        id: number;
        sender_type: string;
        message: string;
        createdAt: string;
      }>;
      const nextCursor = result.data.data.nextCursor ?? null;
      const newMessages = list.map(apiMessageToMessage).sort(sortByTime);

      if (isLoadMore) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id).filter(Boolean));
          const toPrepend = newMessages.filter((m) => m.id != null && !existingIds.has(m.id));
          return [...toPrepend, ...prev].sort(sortByTime);
        });
        setLoadingMoreHistory(false);
      } else {
        setMessages((prev) => {
          const fromSocket = prev.filter((m) => m.id == null);
          return [...newMessages, ...fromSocket].sort(sortByTime);
        });
      }
      setChatHistoryNextCursor(nextCursor);
    },
    [apiMessageToMessage, sortByTime]
  );

  const isLoadMoreRef = useRef(false);

  // When modal opens, load chat history. Handle result in promise so UI updates as soon as API returns (fixes post-logout / coming back).
  useEffect(() => {
    if (!open || !bookingId) return;
    setChatHistoryNextCursor(null);
    setMessages([]);
    isLoadMoreRef.current = false;
    fetchChatHistory({ orderId: bookingId, limit: 30 })
      .then((result: { data?: { data?: { messages?: unknown[]; nextCursor?: number | null } } }) => {
        if (result?.data?.data && !isLoadMoreRef.current) {
          applyChatHistoryResult(result, false);
        }
      })
      .catch(() => {
        // Ignore fetch errors (e.g. auth); keep empty messages
      });
  }, [open, bookingId, fetchChatHistory, applyChatHistoryResult]);

  // Scroll to top: load more history when user scrolls to top and we have nextCursor
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el || !bookingId || chatHistoryNextCursor == null || loadingMoreHistory) return;
    if (el.scrollTop <= 80) {
      setLoadingMoreHistory(true);
      isLoadMoreRef.current = true;
      fetchChatHistory({ orderId: bookingId, limit: 30, cursor: chatHistoryNextCursor })
        .then((result: { data?: { data?: { messages?: unknown[]; nextCursor?: number | null } } }) => {
          if (result?.data?.data) {
            applyChatHistoryResult(result, true);
          } else {
            setLoadingMoreHistory(false);
          }
        })
        .catch(() => setLoadingMoreHistory(false));
    }
  }, [bookingId, chatHistoryNextCursor, loadingMoreHistory, fetchChatHistory, applyChatHistoryResult]);

  // Scroll to bottom when new messages arrive (only for new messages, not when prepending history)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0 && !loadingMoreHistory) {
      scrollToBottom();
    }
  }, [messages.length, loadingMoreHistory]);

  // Handle sending message
  const handleSendMessage = useCallback(() => {
    if (!isConnected || !message.trim() || !bookingId) {
      if (!isConnected) {
        toast.error("Not connected to chat. Please wait...");
      }
      return;
    }

    const messageText = message.trim();
    
    // Send message via socket - don't add to local state here
    // The socket will receive it back and add it via handleIncomingMessage
    sendMessage(messageText);

    // Clear input immediately for better UX
    setMessage("");
  }, [isConnected, message, bookingId, sendMessage]);

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Extract driver information from API response structure
  const driver = driverData?.driver || {};
  const vehicle = driverData?.vehicle || {};
  
  // Driver name: firstName + lastName
  const driverName = driver.firstName 
    ? `${driver.firstName}${driver.lastName ? ` ${driver.lastName}` : ''}`.trim()
    : driver.name || driver.driver_name || "Driver";
  
  // Driver image
  const driverImage = driver.image || driver.avatar || driver.profile_image || "/images/dummy_user.png";
  
  // Driver rating - use avgRating from driver object
  const driverRating = driver.avgRating !== undefined && driver.avgRating !== null 
    ? driver.avgRating 
    : driver.rating || 4.5;
  
  // Vehicle type from vehicle.vehicleId.type or vehicle.vehicleId.type_lng[0].value
  const vehicleType = vehicle.vehicleId?.type_lng?.[0]?.value 
    || vehicle.vehicleId?.type 
    || vehicle.type 
    || driver.vehicle 
    || "Vehicle";
  
  // Vehicle registration number - from driver.vehicleRegistrationNo or vehicle.vehicleRegistrationNo
  const vehicleNumber = driver.vehicleRegistrationNo 
    || vehicle.vehicleRegistrationNo 
    || vehicle.license_plate 
    || vehicle.registration_number 
    || "N/A";
  
  // Driver phone
  const driverPhone = driver.phone || driver.phone_number || driver.mobile || null;

  return (
    <Modal className="modal driver_chat_modal" open={open} onClose={handleClose}>
      <div className="modal-dialog">
        <div className="modal-body" style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
          {/* Driver Info Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '1px solid #e0e0e0',
            position: 'relative',
          }}>
            <figure style={{
              margin: 0,
              position: 'relative',
              width: '50px',
              height: '50px',
            }}>
              <img 
                src={driverImage} 
                alt={driverName} 
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: '-5px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'var(--commerce-primary)',
                color: 'white',
                borderRadius: '8px',
                padding: '2px 6px',
                fontSize: '10px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                whiteSpace: 'nowrap',
              }}>
                <StarRoundedIcon sx={{ fontSize: '12px' }} />
                {driverRating}
              </div>
            </figure>
            <div style={{ flex: 1 }}>
              <h3 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--commerce-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0',
                marginBottom: '4px',
              }}>
                <img 
                  src="/images/verified_driver_icon.svg" 
                  alt="Verified" 
                  style={{ width: '16px', height: '16px', marginRight: '4px' }}
                />
                {driverName}
              </h3>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#666',
                marginBottom: '2px',
              }}>
                {vehicleType} • {vehicleNumber}
              </p>
              {!isConnected && (
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  color: error ? '#f44336' : '#999',
                  fontStyle: 'italic',
                }}>
                  {error || "Connecting..."}
                </p>
              )}
              {isConnected && (
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#4caf50',
                  fontStyle: 'italic',
                }}>
                  Connected
                </p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Button
                className="icon_btn"
                onClick={() => {
                  if (driverPhone) {
                    window.location.href = `tel:${driverPhone}`;
                  } else {
                    toast("Driver phone number not available");
                  }
                }}
                sx={{
                  minWidth: '40px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--commerce-primary)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: "var(--commerce-primary-hover)",
                  },
                  '& svg': {
                    color: 'white',
                  },
                }}
              >
                <PhoneIcon sx={{ color: 'white' }} />
              </Button>
              <Button
                className="icon_btn"
                onClick={handleClose}
                sx={{
                  minWidth: '40px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'transparent',
                  color: '#666',
                  padding: 0,
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                  },
                }}
              >
                <CloseIcon />
              </Button>
            </div>
          </div>

          {/* Messages Container */}
          <Box
            ref={messagesContainerRef}
            onScroll={handleScroll}
            sx={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              backgroundColor: '#f9f9f9',
              borderRadius: '12px',
              marginBottom: '16px',
              minHeight: '300px',
              maxHeight: '400px',
            }}
          >
            {loadingMoreHistory && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <CircularProgress size={24} sx={{ color: 'var(--commerce-primary)' }} />
              </Box>
            )}
            {messages.length === 0 && !chatHistoryLoading ? (
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#999',
                fontSize: '14px',
                gap: '16px',
              }}>
                {error ? (
                  <>
                    <p style={{ margin: 0, color: '#f44336' }}>{error}</p>
                    <Button
                      onClick={reconnect}
                      variant="outlined"
                      sx={{
                        color: 'var(--commerce-primary)',
                        borderColor: 'var(--commerce-primary)',
                        '&:hover': {
                          borderColor: 'var(--commerce-primary)',
                          backgroundColor: 'var(--commerce-primary-light)',
                        },
                      }}
                    >
                      Retry Connection
                    </Button>
                  </>
                ) : isConnected ? (
                  "Start a conversation with your driver"
                ) : (
                  "Connecting to chat..."
                )}
              </Box>
            ) : messages.length === 0 && chatHistoryLoading ? (
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#999',
                fontSize: '14px',
                gap: '16px',
              }}>
                <CircularProgress size={32} sx={{ color: 'var(--commerce-primary)' }} />
                <span>Loading chat history...</span>
              </Box>
            ) : (
              messages.map((msg, index) => {
                // Use isSender (senderType == 1) to determine alignment
                // isSender === true means right side (user), false means left side (driver)
                const isSender = msg.isSender !== undefined ? msg.isSender : !msg.isFromDriver;
                const key = msg.id != null ? String(msg.id) : `live-${index}-${msg.timestamp.getTime()}`;
                return (
                  <Box
                    key={key}
                    sx={{
                      display: 'flex',
                      justifyContent: isSender ? 'flex-end' : 'flex-start',
                      marginBottom: '12px',
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: '70%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        backgroundColor: isSender ? 'var(--commerce-primary)' : '#fff',
                        color: isSender ? '#fff' : '#333',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      }}
                    >
                      <p style={{
                        margin: 0,
                        fontSize: '14px',
                        wordBreak: 'break-word',
                      }}>
                        {msg.message}
                      </p>
                      <p style={{
                        margin: '4px 0 0 0',
                        fontSize: '10px',
                        opacity: 0.7,
                      }}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </Box>
                  </Box>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Message Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <TextField
              fullWidth
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!isConnected}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: '#fff',
                  '& fieldset': {
                    borderColor: '#e0e0e0',
                  },
                  '&:hover fieldset': {
                    borderColor: 'var(--commerce-primary)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'var(--commerce-primary)',
                  },
                },
              }}
            />
            <Button
              className="icon_btn"
              onClick={handleSendMessage}
              disabled={!isConnected || !message.trim()}
              sx={{
                minWidth: '48px',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                  backgroundColor: 'var(--commerce-primary)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'var(--commerce-primary-hover)',
                },
                '&:disabled': {
                  backgroundColor: '#ccc',
                  color: '#999',
                },
              }}
            >
              <SendIcon />
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

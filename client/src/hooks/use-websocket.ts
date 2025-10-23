import { useEffect, useRef, useState } from "react";
import { queryClient } from "@/lib/queryClient";

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log("Connecting to WebSocket:", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const { event: eventType, data } = JSON.parse(event.data);
        
        switch (eventType) {
          case "new_message":
            queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
            queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
            break;
          case "command_response":
            console.log("Command response:", data);
            break;
          case "twitch_connected":
            console.log("Twitch connected:", data);
            break;
          case "twitch_disconnected":
            console.log("Twitch disconnected:", data);
            break;
          case "auto_shoutout":
            console.log("Auto shoutout:", data);
            // Emit custom browser event for shoutout
            window.dispatchEvent(new CustomEvent("vip_shoutout", { detail: data }));
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  return { isConnected, ws: wsRef.current };
}

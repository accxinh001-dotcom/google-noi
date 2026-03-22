import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { WebcastPushConnection } from "tiktok-live-connector";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

const port = process.env.PORT || 3000;
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    
    // Di chuyển biến vào trong scope của socket để mỗi client có 1 kết nối riêng
    let tiktokConnection: WebcastPushConnection | null = null;

    socket.on("connect-tiktok", (uniqueId) => {
      if (tiktokConnection) {
        tiktokConnection.disconnect();
      }

      tiktokConnection = new WebcastPushConnection(uniqueId);

      tiktokConnection.connect().then(state => {
        console.log(`Connected to roomId ${state.roomId}`);
        socket.emit("tiktok-status", { status: "connected", roomId: state.roomId });
      }).catch(err => {
        console.error("Failed to connect", err);
        socket.emit("tiktok-status", { status: "error", message: err.message });
      });

      // Lắng nghe sự kiện và gửi CHỈ cho socket đang kết nối để tránh quá tải toàn hệ thống
      tiktokConnection.on("chat", data => {
        socket.emit("tiktok-chat", data); 
      });

      tiktokConnection.on("gift", data => {
        socket.emit("tiktok-gift", data);
      });

      tiktokConnection.on("like", data => {
        socket.emit("tiktok-like", data);
      });

      tiktokConnection.on("member", data => {
        socket.emit("tiktok-member", data);
      });

      tiktokConnection.on("disconnected", () => {
        socket.emit("tiktok-status", { status: "disconnected" });
      });

      tiktokConnection.on("error", (err) => {
        socket.emit("tiktok-status", { status: "error", message: err.message });
      });
    });

    socket.on("disconnect-tiktok", () => {
      if (tiktokConnection) {
        tiktokConnection.disconnect();
        tiktokConnection = null;
        socket.emit("tiktok-status", { status: "disconnected" });
      }
    });

    socket.on("disconnect", () => {
      if (tiktokConnection) {
        tiktokConnection.disconnect();
      }
      console.log("Client disconnected");
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer();
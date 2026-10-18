import cors from "cors";
import express from "express";

import { env } from "./config/env";
import { errorHandler } from "./middleware/error.middleware";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import workRoutes from "./routes/work.routes";
import workItemRoutes from "./routes/work-item.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Newtonite Ops API Running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/work", workRoutes);
app.use("/api/work-items", workItemRoutes);

app.use(errorHandler);

export default app;
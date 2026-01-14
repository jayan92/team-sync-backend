import "dotenv/config";
import passport from "passport";
import "./config/passport.config";
import cors from "cors";
// import session from "cookie-session";
import authRoutes from "./routes/auth.route";
import userRoutes from "./routes/user.route";
import { config } from "./config/app.config";
import taskRoutes from "./routes/task.route";
import memberRoutes from "./routes/member.route";
import projectRoutes from "./routes/project.route";
import workspaceRoutes from "./routes/workspace.route";
import connectDatabase from "./config/database.config";
import express, { NextFunction, Request, Response } from "express";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import isAuthenticated from "./middlewares/isAuthenticated.middleware";
import { passportAuthenticateJwt } from "./config/passport.config";

// Create an Express application instance
const app = express();

// Get the base path from config
const BASE_PATH = config.BASE_PATH;

// Enable JSON body parsing for incoming requests
app.use(express.json());

// Enable URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));

// Configure and use cookie-based session middleware
// app.use(
//   session({
//     name: "session",
//     keys: [config.SESSION_SECRET],
//     maxAge: 24 * 60 * 60 * 1000,
//     secure: config.NODE_ENV === "production",
//     httpOnly: true,
//     sameSite: "lax", // Helps prevent CSRF attacks while allowing some cross-site usage
//   })
// );

app.use(passport.initialize());
// app.use(passport.session());

app.use(
  cors({
    origin: config.FRONTEND_ORIGIN,
    credentials: true,
  })
);

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to TeamSync backend!");
});

app.use(`${BASE_PATH}/auth`, authRoutes);
app.use(`${BASE_PATH}/user`, passportAuthenticateJwt, userRoutes);
app.use(`${BASE_PATH}/task`, passportAuthenticateJwt, taskRoutes);
app.use(`${BASE_PATH}/member`, passportAuthenticateJwt, memberRoutes);
app.use(`${BASE_PATH}/project`, passportAuthenticateJwt, projectRoutes);
app.use(`${BASE_PATH}/workspace`, passportAuthenticateJwt, workspaceRoutes);

app.use(errorHandler);

// Start the server and listen on the specified port
app.listen(config.PORT, async () => {
  console.log(`Server is running on port ${config.PORT} in ${config.NODE_ENV}`);
  await connectDatabase();
});

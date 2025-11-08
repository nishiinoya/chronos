import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { connectDB } from "./db.js";
import authRoutes from "./routes/auth.js";
import calendarRoutes from "./routes/calendars.js";
import eventRoutes from "./routes/events.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use((req, res, next) => 
{
    console.log('--- Incoming Request ---');
    console.log(req.method, req.originalUrl);
    if (Object.keys(req.query).length) console.log('Query:', req.query);
    if (req.body && Object.keys(req.body).length) console.log('Body:', req.body);

    const oldSend = res.send;
    res.send = function (data) 
    {
        try 
        {
            console.log('Response:', JSON.parse(data));
        }
        catch 
        {
            console.log('Response (raw):', data);
        }
        console.log('-------------------------');
        return oldSend.apply(this, arguments);
    };
    next();
});

app.get("/health", (_req, res) => res.json({ ok: true, service: "backend", time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/calendars", calendarRoutes);
app.use("/api/events", eventRoutes);

// error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
connectDB(process.env.MONGODB_URI).then(() => 
{
    app.listen(PORT, () => console.log(`✅ Backend on http://localhost:${PORT}`));
});

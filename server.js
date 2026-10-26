import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    app.listen(PORT, () => {
      // console.log(`SR PG backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed. Check your database settings:", error.message || error);
    process.exit(1);
  }
};

startServer();

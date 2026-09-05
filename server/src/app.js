const express = require("express");
const cors = require("cors");

const routes = require("./routes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "PeoplePay360 API is running",
  });
});

// API routes
app.use("/api", routes);

module.exports = app;
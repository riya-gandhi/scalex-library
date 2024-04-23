require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const csvParser = require("csv-parser");

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || "your_default_secret_key_here";

app.use(express.json()); // Parse JSON bodies

// Sample user data
const USERS = {
  admin: { password: "admin_password", user_type: "admin" },
  user: { password: "user_password", user_type: "regular" },
  "riya@gmail.com": { password: "test1234", user_type: "regular" },
};

// JWT Token Validation Middleware
function tokenRequired(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "Token is missing!" });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Token is invalid!" });
    }
    req.user = decoded;
    next();
  });
}

// Login Endpoint
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = USERS[username];

  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  const token = jwt.sign(
    { username: username, userType: user.user_type },
    SECRET_KEY
  );
  res.json({ token: token });
});

// Home Endpoint
app.get("/home", tokenRequired, (req, res) => {
  const userType = req.user.userType;
  let books = [];

  fs.createReadStream(
    userType === "admin" ? "adminUser.csv" : "regularUser.csv"
  )
    .pipe(csvParser())
    .on("data", (row) => {
      books.push(row["Book Name"]);
    })
    .on("end", () => {
      res.json({ books: books });
    });
});

// Add Book Endpoint
app.post("/addBook", tokenRequired, (req, res) => {
  const userType = req.user.userType;

  if (userType !== "admin") {
    return res
      .status(403)
      .json({ message: "Only admin users can access this endpoint" });
  }

  const { bookName, author, publicationYear } = req.body;

  if (
    typeof bookName !== "string" ||
    typeof author !== "string" ||
    isNaN(publicationYear)
  ) {
    return res.status(400).json({ message: "Invalid parameters" });
  }

  fs.appendFileSync(
    "regularUser.csv",
    `${bookName},${author},${publicationYear}\n`
  );
  res.json({ message: "Book added successfully" });
});

// Delete Book Endpoint
app.delete("/deleteBook", tokenRequired, (req, res) => {
  const userType = req.user.userType;

  if (userType !== "admin") {
    return res
      .status(403)
      .json({ message: "Only admin users can access this endpoint" });
  }

  const { bookName } = req.body;

  if (typeof bookName !== "string") {
    return res.status(400).json({ message: "Invalid parameter" });
  }

  let lines = fs.readFileSync("regularUser.csv", "utf-8").split("\n");
  lines = lines.filter((line) => {
    const book = line.split(",")[0];
    return book.toLowerCase() !== bookName.toLowerCase();
  });
  fs.writeFileSync("regularUser.csv", lines.join("\n"));
  res.json({ message: "Book deleted successfully" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

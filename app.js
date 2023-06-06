const express = require("express");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const markdown = require("marked");
const session = require("express-session");
const sanitizeHTML = require("sanitize-html");
const csrf = require("csurf");
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use("/api", require("./router-api"));

let sessionOptions = session({
  secret: "JavaScript is so cool",
  store: MongoStore.create({ client: require("./db") }),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true },
});
app.use(sessionOptions);
app.use(flash());
app.use((req, res, next) => {
  //make our makedown avaible for all page
  res.locals.filterUserHTML = function (content) {
    return markdown.parse(content);
  };
  //make all error and success flash message avaible from all page
  res.locals.errors = req.flash("errors");
  res.locals.success = req.flash("success");
  //make current user id avaible on req object
  if (req.session.user) {
    req.visitorId = req.session.user._id;
  } else {
    req.visitorId = 0;
  }
  //make user session data avaible from within view page
  res.locals.user = req.session.user;
  next();
});
const router = require("./router");

app.use(express.static("public"));
app.set("views", "views");
app.set("view engine", "ejs");
app.use(csrf());
app.use(function (req, res, next) {
  res.locals.csrfToken = req.csrfToken();
  next();
});
app.use("/", router);
app.use(function (err, req, res, next) {
  if (err) {
    if (err.code == "EBADCSRFTOKEN") {
      req.flash("errors", "Cross site request forgery detected");
      req.session.save(() => res.redirect("/"));
    } else {
      res.render("404");
    }
  }
});
const server = require("http").createServer(app);
const io = require("socket.io")(server);
io.use((socket, next) => {
  sessionOptions(socket.request, socket.request.res, next);
});
io.on("connection", function (socket) {
  if (socket.request.session.user) {
    let user = socket.request.session.user;
    socket.emit("welcome", {
      username: user.username,
      avatar: user.avatar,
    });
    socket.on("messageFromBrowser", (data) => {
      socket.broadcast.emit("messageFromBrowser", {
        message: sanitizeHTML(data.message, {
          allowedTags: [],
          allowedAttributes: {},
        }),
        username: user.username,
        avatar: user.avatar,
      });
    });
  }
});
module.exports = server;

const express = require("express");
const router = express.Router();
const userController = require("./controllers/userController");
const postController = require("./controllers/postController");
const followController = require("./controllers/followController");

//user routes
router.get("/", userController.home);
router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/logout", userController.logout);
router.post("/doesUsernameExist", userController.doesUsernameExist);
router.post("/doesEmailExist", userController.doesEmailExist);
//profile routes
router.get(
  "/profile/:username",
  userController.userExists,
  userController.shareProfileData,
  userController.profilePostsScreen
);
router.get(
  "/profile/:username/followers",
  userController.userExists,
  userController.shareProfileData,
  userController.profileFollowerScreen
);
router.get(
  "/profile/:username/following",
  userController.userExists,
  userController.shareProfileData,
  userController.profileFollowingScreen
);

//post routes
router.get(
  "/create-post",
  userController.mustBeLogIn,
  postController.viewCreateScreen
);
router.post("/create-post", userController.mustBeLogIn, postController.create);
router.get("/post/:id", postController.viewSingle);
router.get(
  "/post/:id/edit",
  userController.mustBeLogIn,
  postController.viewEdit
);
router.post("/post/:id/edit", userController.mustBeLogIn, postController.edit);
router.post(
  "/post/:id/delete",
  userController.mustBeLogIn,
  postController.delete
);
router.post("/search", postController.search);

//Follow routes
router.post(
  "/addFollow/:username",
  userController.mustBeLogIn,
  followController.addFollow
);
router.post(
  "/removeFollow/:username",
  userController.mustBeLogIn,
  followController.removeFollow
);
module.exports = router;

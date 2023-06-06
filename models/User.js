const validator = require("validator");
const usersCollection = require("../db").db().collection("users");
const bcrypt = require("bcryptjs");
const md5 = require("md5");
//const { get } = require("../router");
const e = require("connect-flash");
let User = function (data, getAvatar) {
  this.data = data;
  this.errors = [];
  if (getAvatar == undefined) {
    getAvatar = false;
  }
  if (getAvatar) {
    this.getAvatar();
  }
};
User.prototype.validate = function () {
  return new Promise(async (resolve, reject) => {
    if (this.data.username == "") {
      this.errors.push("you must provide a username.");
    }
    if (
      this.data.username != "" &&
      !validator.isAlphanumeric(this.data.username)
    ) {
      this.errors.push("User name can only contain numbers amd letters.");
    }
    if (!validator.isEmail(this.data.email)) {
      this.errors.push("you must provide a valid email address.");
    }
    if (this.data.password == "") {
      this.errors.push("you must provide a password.");
    }
    if (this.data.password.length > 0 && this.data.password.length < 6) {
      this.errors.push("Password must at least 6 characters.");
    }
    if (this.data.password.length > 50) {
      this.errors.push("Password cant grater than 50 characters.");
    }
    if (this.data.username.length > 0 && this.data.username.length < 3) {
      this.errors.push("User name must at least 3 characters.");
    }
    if (this.data.username.length > 30) {
      this.errors.push("User name  can not exceed than 30 characters.");
    }
    if (
      this.data.username.length > 2 &&
      this.data.username.length < 31 &&
      validator.isAlphanumeric(this.data.username)
    ) {
      let usernameExists = await usersCollection.findOne({
        username: this.data.username,
      });
      if (usernameExists) {
        this.errors.push("That username is already taken.");
      }
    }
    if (validator.isEmail(this.data.email)) {
      let usermailExists = await usersCollection.findOne({
        email: this.data.email,
      });
      if (usermailExists) {
        this.errors.push("That mail is already taken.");
      }
    }
    resolve();
  });
};
User.prototype.cleanUp = function () {
  if (typeof this.data.username != "string") {
    this.data.username = "";
  }
  if (typeof this.data.email != "string") {
    this.data.email = "";
  }
  if (typeof this.data.password != "string") {
    this.data.password = "";
  }
  //get rid of any bigus properties
  this.data = {
    username: this.data.username.trim().toLowerCase(),
    email: this.data.email.trim().toLowerCase(),
    password: this.data.password,
  };
};
User.prototype.register = function () {
  return new Promise(async (resolve, reject) => {
    //Validate user data
    this.cleanUp();
    await this.validate();
    if (!this.errors.length) {
      let salt = bcrypt.genSaltSync(10);
      this.data.password = bcrypt.hashSync(this.data.password, salt);
      await usersCollection.insertOne(this.data);
      this.getAvatar();
      resolve();
    } else {
      reject(this.errors);
    }
  });
};
User.prototype.login = function () {
  return new Promise(async (resolve, reject) => {
    this.cleanUp();
    const logUser = await usersCollection.findOne({
      username: this.data.username,
    });
    if (logUser && bcrypt.compareSync(this.data.password, logUser.password)) {
      this.data = logUser;
      this.getAvatar();
      resolve("Welcome");
    } else {
      reject("Invalid username or password");
    }
  });
};
User.prototype.getAvatar = function () {
  this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`;
};
User.findByUsername = function (username) {
  return new Promise((resolve, reject) => {
    if (typeof username != "string") {
      reject();
      return;
    }
    usersCollection
      .findOne({ username: username })
      .then((userDoc) => {
        if (userDoc) {
          userDoc = new User(userDoc, true);
          userDoc = {
            _id: userDoc.data._id,
            username: userDoc.data.username,
            avatar: userDoc.avatar,
          };
          resolve(userDoc);
        } else {
          reject();
        }
      })
      .catch((err) => {
        reject();
      });
  });
};

User.doesEmailExist = function (email) {
  return new Promise(async (resolve, reject) => {
    if (typeof email != "string") {
      resolve(false);
      return;
    }
    let user = await usersCollection.findOne({ email: email });
    if (user) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
};
module.exports = User;

const userCollection = require("../db").db().collection("users");
const followsCollection = require("../db").db().collection("follows");
const ObjectId = require("mongodb").ObjectId;
const User = require("./User");
let Follow = function (followedUsername, authorId) {
  this.followedUsername = followedUsername;
  this.authorId = authorId;
  this.errors = [];
};
Follow.prototype.cleanUp = function () {
  if (typeof this.followedUsername != "string") {
    this.followedUsername = "";
  }
};
Follow.prototype.validate = async function (action) {
  //followedUsername must be exist
  let followedAccount = await userCollection.findOne({
    username: this.followedUsername,
  });
  if (followedAccount) {
    this.followedId = followedAccount._id;
  } else {
    this.errors.push("the user is not exist");
  }
  let doesFollowexist = await followsCollection.findOne({
    followedId: this.followedId,
    authorId: new ObjectId(this.authorId),
  });
  if (action == "create") {
    if (doesFollowexist) {
      this.errors.push(`You are already followed ${this.followedUsername}`);
    }
  }
  if (action == "delete") {
    if (!doesFollowexist) {
      this.errors.push(
        "You can not stop following some one that you are not folled"
      );
    }
  }
  //should not be able to follow yourself
  if (this.followedId.equals(this.authorId)) {
    this.errors.push("You can not follow yourself");
  }
};
Follow.prototype.create = function () {
  return new Promise(async (resolve, reject) => {
    this.cleanUp();
    await this.validate("create");
    if (!this.errors.length) {
      await followsCollection.insertOne({
        followedId: this.followedId,
        authorId: new ObjectId(this.authorId),
      });
      resolve();
    } else {
      reject(this.errors);
    }
  });
};
Follow.isVisitorFollowing = async function (followId, visitorId) {
  let followDoc = await followsCollection.findOne({
    followedId: followId,
    authorId: new ObjectId(visitorId),
  });
  if (followDoc) {
    return true;
  } else {
    return false;
  }
};
Follow.prototype.delete = function () {
  return new Promise(async (resolve, reject) => {
    this.cleanUp();
    await this.validate("delete");
    if (!this.errors.length) {
      await followsCollection.deleteOne({
        followedId: this.followedId,
        authorId: new ObjectId(this.authorId),
      });
      resolve();
    } else {
      reject(this.errors);
    }
  });
};
Follow.getFollowersById = function (id) {
  return new Promise(async (resolve, reject) => {
    try {
      let followers = await followsCollection
        .aggregate([
          {
            $match: {
              followedId: id,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "authorId",
              foreignField: "_id",
              as: "userDoc",
            },
          },
          {
            $project: {
              username: { $arrayElemAt: ["$userDoc.username", 0] },
              email: { $arrayElemAt: ["$userDoc.email", 0] },
            },
          },
        ])
        .toArray();
      followers = followers.map((follower) => {
        let user = new User(follower, true);
        return { username: follower.username, avatar: user.avatar };
      });
      resolve(followers);
    } catch {
      reject();
    }
  });
};

Follow.getFollowingById = function (id) {
  return new Promise(async (resolve, reject) => {
    try {
      let following = await followsCollection
        .aggregate([
          {
            $match: {
              authorId: id,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "followedId",
              foreignField: "_id",
              as: "userDoc",
            },
          },
          {
            $project: {
              username: { $arrayElemAt: ["$userDoc.username", 0] },
              email: { $arrayElemAt: ["$userDoc.email", 0] },
            },
          },
        ])
        .toArray();
      following = following.map((follow) => {
        let user = new User(follow, true);
        return { username: follow.username, avatar: user.avatar };
      });
      resolve(following);
    } catch {
      reject();
    }
  });
};
Follow.countFollowersById = function (id) {
  return new Promise(async (resolve, reject) => {
    let followersCount = await followsCollection.countDocuments({
      followedId: id,
    });
    resolve(followersCount);
  });
};
Follow.countFollowingById = function (id) {
  return new Promise(async (resolve, reject) => {
    let followingCount = await followsCollection.countDocuments({
      authorId: id,
    });
    resolve(followingCount);
  });
};

module.exports = Follow;

const postCollection = require("../db").db().collection("posts");
const followsCollection = require("../db").db().collection("follows");
const ObjectId = require("mongodb").ObjectId;
const sanitizeHTML = require("sanitize-html");
const User = require("./User");
let Post = function (data, userid, editPostid) {
  this.data = data;
  this.errors = [];
  this.userid = userid;
  this.editPostid = editPostid;
};
Post.prototype.cleanUp = function () {
  if (typeof this.data.title != "string") {
    this.data.title = "";
  }
  if (typeof this.data.body != "string") {
    this.data.body = "";
  }
  this.data = {
    title: sanitizeHTML(this.data.title.trim(), {
      allowedTags: [],
      allowedAttributes: [],
    }),
    body: sanitizeHTML(this.data.body.trim(), {
      allowedTags: [],
      allowedAttributes: [],
    }),
    createDate: new Date(),
    author: new ObjectId(this.userid),
  };
};
Post.prototype.validate = function () {
  if (this.data.title == "") {
    this.errors.push("You must provide a title");
  }
  if (this.data.body == "") {
    this.errors.push("You must provide a post content");
  }
};
Post.prototype.create = function () {
  return new Promise((resolve, reject) => {
    this.cleanUp();
    this.validate();
    if (!this.errors.length) {
      postCollection
        .insertOne(this.data)
        .then((info) => {
          resolve(info.insertedId);
        })
        .catch((err) => {
          this.errors.push("Please try again later");
          reject(this.errors);
        });
    } else {
      reject(this.errors);
    }
  });
};

Post.postQuery = function (operation, visitorId, finalOperations = []) {
  return new Promise(async (resolve, reject) => {
    let aggOperations = operation
      .concat([
        {
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "authorDocument",
          },
        },
        {
          $project: {
            title: 1,
            body: 1,
            createDate: 1,
            authorId: "$author",
            author: { $arrayElemAt: ["$authorDocument", 0] },
          },
        },
      ])
      .concat(finalOperations);
    let posts = await postCollection.aggregate(aggOperations).toArray();
    //clean up author property in each post object
    posts = posts.map(function (post) {
      post.isVisitorOwner = post.authorId.equals(visitorId);
      post.authorId = undefined;
      post.author = {
        username: post.author.username,
        avatar: new User(post.author, true).avatar,
      };
      return post;
    });
    resolve(posts);
  });
};

Post.findSingleById = function (id, visitorId) {
  return new Promise(async (resolve, reject) => {
    if (typeof id != "string" || !ObjectId.isValid(id)) {
      reject();
      return;
    }
    let posts = await Post.postQuery(
      [{ $match: { _id: new ObjectId(id) } }],
      visitorId
    );
    if (posts.length) {
      resolve(posts[0]);
    } else {
      reject();
    }
  });
};
Post.findByAuthorId = function (authorId) {
  return Post.postQuery([
    { $match: { author: authorId } },
    { $sort: { createDate: -1 } },
  ]);
};

Post.prototype.update = function () {
  return new Promise(async (resolve, reject) => {
    try {
      let post = await Post.findSingleById(this.editPostid, this.userid);

      if (post.isVisitorOwner) {
        let status = await this.actuallyUpdate();
        resolve(status);
      } else {
        reject();
      }
    } catch {
      reject();
    }
  });
};

Post.prototype.actuallyUpdate = function () {
  return new Promise(async (resolve, reject) => {
    this.cleanUp();
    this.validate();
    if (!this.errors.length) {
      postCollection.findOneAndUpdate(
        { _id: new ObjectId(this.editPostid) },
        { $set: { title: this.data.title, body: this.data.body } }
      );
      resolve("success");
    } else {
      resolve("fail");
    }
  });
};
Post.delete = function (postId, currentUserId) {
  return new Promise(async (resolve, reject) => {
    try {
      let post = await Post.findSingleById(postId, currentUserId);
      if (post.isVisitorOwner) {
        await postCollection.deleteOne({ _id: new ObjectId(postId) });
        resolve();
      } else {
        reject();
      }
    } catch {
      reject();
    }
  });
};
Post.search = function (searchTerm) {
  return new Promise(async (resolve, reject) => {
    if (typeof searchTerm == "string") {
      let posts = await Post.postQuery(
        [{ $match: { $text: { $search: searchTerm } } }],
        undefined,
        [{ $sort: { score: { $meta: "textScore" } } }]
      );
      resolve(posts);
    } else {
      reject();
    }
  });
};
Post.countPostsByAuthor = function (id) {
  return new Promise(async (resolve, reject) => {
    let postCount = await postCollection.countDocuments({ author: id });
    resolve(postCount);
  });
};
Post.getFeed = async function (id) {
  //create an array of userid that current user following
  let followedUsers = await followsCollection
    .find({ authorId: new ObjectId(id) })
    .toArray();
  followedUsers = followedUsers.map((user) => {
    return user.followedId;
  });
  //look for posts of following user post
  return Post.postQuery([
    { $match: { author: { $in: followedUsers } } },
    { $sort: { createDate: -1 } },
  ]);
};
module.exports = Post;

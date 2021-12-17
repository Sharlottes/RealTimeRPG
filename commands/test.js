const Discord = require("discord.js");
const firebase = require("firebase");
const firebaseConfig = {
  apiKey: "AIzaSyBgONI7uOjjfKgld0_9mcflSNcFEguv_nM",
  authDomain: "botdb-129d7.firebaseapp.com",
  projectId: "botdb-129d7",
  storageBucket: "botdb-129d7.appspot.com",
  messagingSenderId: "168773024110",
  appId: "1:168773024110:web:37886cdb0287730e19697f",
  measurementId: "G-0Y59RCBLQV",
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();

exports.run = (client, message, args) => {
  try {
    firebase.database().goOnline();
    await database.ref("/Archive/" + message.author.id).set({
      Message: message.content,
      User: message.author.username,
      User_ID: message.author.id,
    });
    firebase.database().goOffline();

    message.channel.send(`hi!`);
  } catch (err) {
    console.log(err);
  }
};

exports.name = "test";
exports.description = "test smth";

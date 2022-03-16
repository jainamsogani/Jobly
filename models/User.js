const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const usersSchema = {
  name: String,
  email: String,
  number: Number,
  location: String,
  password: String,
//   jobs: {

//   }
};

usersSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model('User', usersSchema);
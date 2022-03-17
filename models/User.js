const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate = require('mongoose-findorcreate');

const usersSchema = new mongoose.Schema({
  username: String,
  googleId: String,
  name: String,
  number: Number,
  location: String,
  password: String,
  jobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
});

usersSchema.plugin(passportLocalMongoose);
usersSchema.plugin(findOrCreate);

module.exports = mongoose.model('User', usersSchema);
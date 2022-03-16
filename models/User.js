const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const usersSchema = new mongoose.Schema({
  email: { type: String, require: true },
  name: String,
  number: Number,
  location: String,
  password: { type: String, require: true },
  jobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
});

usersSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', usersSchema);
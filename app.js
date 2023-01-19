require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const bodyParser = require('body-parser');
const Job = require('./models/Job');
const User = require('./models/User');
const Date = require('./Date');

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.DBURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error: '));
db.once('open', () => {
  console.log('Connected to db');
});

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: 'https://jittery-pig-cape.cyclic.app/auth/google/jobly',
      userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate(
        {
          googleId: profile.id,
          username: profile.id,
          name: profile.displayName,
        },
        function (err, user) {
          return cb(err, user);
        }
      );
    }
  )
);

function getDate(s) {
  let monthNames =["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  let year = s.substr(0, 4);

  let monthIndex = Number(s.substr(5, 2))-1;
  let monthName = monthNames[monthIndex];

  let day = s.substr(8, 2);
  return `${day}-${monthName}-${year}`;
}

app.get('/', (req, res) => {

  if(req.isAuthenticated()){
    res.redirect('/stats');
  }else{
    res.render('landing');
  }
});

app.get('/register', (req, res) => {
  req.logout();
  res.render('register');
});

app.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get(
  '/auth/google/jobly',
  passport.authenticate('google', { failureRedirect: '/' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/stats');
  }
);

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

app.get('/stats', (req, res) => {

  if(req.isAuthenticated()){

    var pending = 0;
    var onlineAssessment = 0;
    var interview = 0;
    var offered = 0;
    var declined = 0;

    req.user.jobs.forEach(job => {
      if(job.status == 'Pending'){
        pending += 1;
      } else if(job.status == 'Online-Assessment'){
        onlineAssessment += 1;
      } else if(job.status == 'Interview'){
        interview += 1;
      }else if(job.status == 'Offered'){
        offered += 1;
      }else{
        declined += 1;
      }
    });

    res.render('stats', {
      pending: pending,
      interview: interview,
      offered: offered,
      onlineAssessment: onlineAssessment,
      declined: declined,
    });

    // Job.count({ status: 'Pending' }, (err, pending) => {
    //   if (err) {
    //     console.log(err);
    //   } else {
    //     Job.count({ status: 'Online-Assessment' }, (err, onlineAssessment) => {
    //       if (err) {
    //         console.log(err);
    //       } else {
    //         Job.count({ status: 'Interview' }, (err, interview) => {
    //           if (err) {
    //             console.log(err);
    //           } else {
    //             Job.count({ status: 'Offered' }, (err, offered) => {
    //               if (err) {
    //                 console.log(err);
    //               } else {
    //                 Job.count({ status: 'Declined' }, (err, declined) => {
    //                   if (err) {
    //                     console.log(err);
    //                   } else {
    //                     res.render('stats', {
    //                       pending: pending,
    //                       interview: interview,
    //                       offered: offered,
    //                       onlineAssessment: onlineAssessment,
    //                       declined: declined,
    //                     });
    //                   }
    //                 });
    //               }
    //             });
    //           }
    //         });
    //       }
    //     });
    //   }
    // });
  } else {
    res.redirect('/');
  }
});

app.get('/all-jobs', (req, res) => {

    if(req.isAuthenticated()){
      const filled = {
        status: 'All',
        jobType: 'All',
      };

      res.render('all-jobs', {
        totalJobs: req.user.jobs.length,
        filled: filled,
        allJobs: req.user.jobs,
      });
    } else {
      res.redirect('/');
    }
});

app.get('/add-job', (req, res) => {

  if(req.isAuthenticated()){
    res.render('add-job');
  }else{
    res.redirect('/');
  }
});

app.get('/profile', (req, res) => {

  if (req.isAuthenticated()) {
    res.render('profile', {user: req.user});
  } else {
    res.redirect('/');
  }
});

app.get('/edit/:_id', (req, res) => {

  if(req.isAuthenticated()){
    const idToEdit = req.params._id;
    // console.log(idToEdit);
    Job.findOne({ _id: idToEdit }, (err, job) => {
      if (err) {
        console.log(err);
      } else {
        res.render('edit', { job: job });
      }
    });
  }else{
    res.render('/');
  }
});

app.get('/delete/:_id', (req, res) => {

  if(req.isAuthenticated()){
    const idToDelete = req.params._id;
    Job.deleteOne({ _id: idToDelete }, (err) => {
      if (err) {
        console.log(err);
      } else {
        User.findByIdAndUpdate(
          req.user._id,
          { $pull: { jobs: { _id: idToDelete } } },
           (err, model) => {
            if (err) {
              console.log(err);
            }else{
              res.redirect('/all-jobs');
            }
          }
        );
      }
    });
  }else{
    res.redirect('/');
  }
});

app.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/stats',
    failureRedirect: '/',
    session: true,
  })
);

app.post('/register', (req, res) => {
  const filled = req.body;
  // console.log(filled);

  var newUser = new User({
    username: filled.username,
    name: filled.name,
    number: filled.number,
    location: filled.location,
  });

  User.register(newUser, filled.password, (err, user) => {
    if (err) {
      console.log(err);
      res.redirect('/register');
    }
    passport.authenticate('local')(req, res, () => {
      res.redirect('/stats');
    });
  });
});

app.post('/add-job', (req, res) => {
  const filled = req.body;
  // getDate(filled.date);

  const newJob = new Job({
    position: filled.position,
    company: filled.company,
    jobLocation: filled.jobLocation,
    status: filled.status,
    jobType: filled.jobType,
    date: getDate(filled.date),
  });

  // console.log(newJob);

  User.findById(req.user._id, (err, foundUser) => {

    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
          foundUser.jobs.push(newJob);
          foundUser.save(() => {
            newJob.username = foundUser.username;
            newJob.save();
            res.redirect('/all-jobs');
        });
      } else {
        res.redirect('/');
      }
    }
  });
});

app.post('/all-jobs', (req, res) => {

  const filled = req.body;
  var jobs = [];

  req.user.jobs.forEach(job => {
    var flag = 1;

    if((filled.status == 'All') || (filled.status == job.status)){
      flag &= 1;
    } else {
      flag = 0;
    }

    if ((filled.jobType == 'All') || (filled.jobType == job.jobType)) {
      flag &= 1;
    } else {
      flag = 0;
    }

    if(flag == 1){
      jobs.push(job);
    }
  });

  res.render('all-jobs', { totalJobs: jobs.length, filled: filled, allJobs: jobs });

  // Job.count(filled, (err, count) => {
  //   if(err){
  //     console.log(err);
  //   }else{
  //       Job.find(filled, (err, jobs) => {
  //         if(typeof filled.status === 'undefined'){
  //           filled.status = 'All';
  //         }

  //         if (typeof filled.jobType === 'undefined') {
  //           filled.jobType = 'All';
  //         }

  //         res.render('all-jobs', { totalJobs: count, filled: filled, allJobs: jobs });
  //       });
  //     }
  // })
});

app.post('/edit/:_id', (req, res) => {

  const idToEdit = req.params._id;
  const updatedData = req.body;

  if(updatedData.date==''){
    updatedData.date=Date;
  }else{
    updatedData.date = getDate(updatedData.date);
  }

  Job.updateOne({ _id: idToEdit }, updatedData, (err) => {
    if (err) {
      console.log(err);
    } else {
      User.updateOne(
        { username: req.user.username, 'jobs._id': idToEdit },
        {
          $set: {
            'jobs.$.position': updatedData.position,
            'jobs.$.company': updatedData.company,
            'jobs.$.jobLocation': updatedData.jobLocation,
            'jobs.$.status': updatedData.status,
            'jobs.$.jobType': updatedData.jobType,
            'jobs.$.date': updatedData.date,
          },
        }, (err) => {
          if(err){
            console.log(err);
          }else{
            res.redirect('/all-jobs');
          }
        }
      );
      // req.user.jobs.forEach(job => {
      //   if(job._id == idToEdit){
      //     console.log('I am in!');
      //     job.position = updatedData.position;
      //     job.company = updatedData.company;
      //     job.jobLocation = updatedData.jobLocation;
      //     job.status = updatedData.status;
      //     job.jobType = updatedData.jobType;
      //     job.date = updatedData.date;
      //   }
      // });

      // res.redirect('/all-jobs');
    }
  });
});

app.post('/profile', (req, res) => {
  
  const updatedData = req.body;

  delete updatedData.username;

  if(updatedData.name == ''){
    delete updatedData.name;
  }

  if(updatedData.number == ''){
    delete updatedData.number;
  }

  if(updatedData.location == ''){
    delete updatedData.location;
  }

  // console.log(updatedData);

  User.updateOne({username: req.user.username}, updatedData, (err) => {
    if(err){
      console.log(err);
    }else{
      res.redirect('/stats');
    }
  })
});

const port = process.env.PORT || '3000'

app.listen(port, () => {
    console.log("Server has started successfully!");
})

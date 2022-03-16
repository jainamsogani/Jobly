require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const session = require('express-session');
const passport = require('passport');
var LocalStrategy = require('passport-local');
const passportLocalMongoose = require('passport-local-mongoose');
const bodyParser = require('body-parser');
const Job = require('./models/Job');
const User = require('./models/User');
const Date = require('./Date')

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

mongoose.connect('mongodb://localhost:27017/jobDB', {
  useNewUrlParser: true,
});

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
    },
    User.authenticate()
  )
);

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

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

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
})

app.get('/stats', (req, res) => {

  if(req.isAuthenticated()){
    Job.count({ status: 'Pending' }, (err, pending) => {
      if (err) {
        console.log(err);
      } else {
        Job.count({ status: 'Online-Assessment' }, (err, onlineAssessment) => {
          if (err) {
            console.log(err);
          } else {
            Job.count({ status: 'Interview' }, (err, interview) => {
              if (err) {
                console.log(err);
              } else {
                Job.count({ status: 'Offered' }, (err, offered) => {
                  if (err) {
                    console.log(err);
                  } else {
                    Job.count({ status: 'Declined' }, (err, declined) => {
                      if (err) {
                        console.log(err);
                      } else {
                        res.render('stats', {
                          pending: pending,
                          interview: interview,
                          offered: offered,
                          onlineAssessment: onlineAssessment,
                          declined: declined,
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
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

      Job.count((err, count) => {
        if (err) {
          console.log(err);
        } else {
          Job.find((err, jobs) => {
            if (err) {
              console.log(err);
            } else {
              res.render('all-jobs', {
                totalJobs: count,
                filled: filled,
                allJobs: jobs,
              });
            }
          });
        }
      });
    }else{
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
    Job.deleteOne({_id: idToDelete}, (err) => {
      if(err){
        console.log(err);
      }else{
        res.redirect('/all-jobs');
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
  console.log(filled);

  var newUser = new User({
    username: filled.email,
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

  console.log(newJob);
  newJob.save();
  res.redirect('/add-job');
});

app.post('/all-jobs', (req, res) => {
  const filled = req.body;
  
  if(filled.status == 'All'){
    delete filled.status;
  }

  if(filled.jobType == 'All'){
    delete filled.jobType;
  }

  Job.count(filled, (err, count) => {
    if(err){
      console.log(err);
    }else{
        Job.find(filled, (err, jobs) => {
          if(typeof filled.status === 'undefined'){
            filled.status = 'All';
          }

          if (typeof filled.jobType === 'undefined') {
            filled.jobType = 'All';
          }

          res.render('all-jobs', { totalJobs: count, filled: filled, allJobs: jobs });
        });
      }
  })
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
      res.redirect('/all-jobs');
    }
  });
});

app.post('/profile', (req, res) => {
  
  const updatedData = req.body;

  delete updatedData.email;

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

app.listen(3000, (req, res) => {
  console.log('Server is running on port 3000....');
});
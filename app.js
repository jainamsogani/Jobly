const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect('mongodb://localhost:27017/jobDB', {
  useNewUrlParser: true,
});

const jobsSchema = {
  position: String,
  company: String,
  jobLocation: String,
  status: String,
  jobType: String,
  date: String
};

const Job = mongoose.model('Job', jobsSchema);

function getDate(s) {
  let monthNames =["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  let year = s.substr(0, 4);

  let monthIndex = Number(s.substr(5, 2))-1;
  let monthName = monthNames[monthIndex];

  let day = s.substr(8, 2);
  return `${day}-${monthName}-${year}`;
}

app.get('/', (req, res) => {

  Job.count({status: 'Pending'}, (err, pending) => {
    if(err){
      console.log(err);
    }else{
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
  })
});

app.get('/all-jobs', (req, res) => {

    const filled = {
      status: 'All', 
      jobType: 'All'
    };

    Job.count((err, count) => {
      if(err){
        console.log(err);
      }else{
        Job.find((err, jobs) => {
          if (err) {
            console.log(err);
          } else {
            res.render('all-jobs', { totalJobs: count, filled: filled, allJobs: jobs });
          }
        });
      }
    });
});

app.get('/add-job', (req, res) => {
  res.render('add-job');
});

app.get('/profile', (req, res) => {
  res.render('profile');
});

app.get('/edit/:_id', (req, res) => {
  const idToEdit = req.params._id;
  Job.findOne({_id: idToEdit}, (err, job) => {
    if(err){
      console.log(err);
    }else{
      res.render('edit', {job: job});
    }
  })
});

app.get('/delete/:_id', (req, res) => {
  const idToDelete = req.params._id;
  Job.deleteOne({_id: idToDelete}, (err) => {
    if(err){
      console.log(err);
    }else{
      res.redirect('/all-jobs');
    }
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
  updatedData.date = getDate(updatedData.date);

  Job.updateOne({ _id: idToEdit }, updatedData, (err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect('/all-jobs');
    }
  });
});

app.post('/profile', (req, res) => {
  const filled = req.body;
  console.log(filled);
});

app.listen(3000, (req, res) => {
  console.log('Server is running on port 3000....');
});
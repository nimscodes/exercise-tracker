const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose');
require('dotenv').config()

const app = express()

app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}))
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// connect to the database
mongoose.connect(process.env.DB_URI, {useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const exerciseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

const userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  exercises: [exerciseSchema]
},{
  timestamps: true,
}
)

const User = mongoose.model('User', userSchema);


app.post('/api/users', (req, res) => {
  const {username} = req.body

  const newUser = new User({ username })

  newUser.save()
  .then(() => res.json(newUser))
  .catch(err => res.status(400).json({message: err}));
})

app.get("/api/users", async (req, res) => {

  User.find()
  .then(users => res.json(users))
  .catch(err => res.status(400).json({message: err}))
})

app.post('/api/users/:_id/exercises', (req,res) => {
  User.findById(req.params._id)
  .then(user => {
    const exercise = new Exercise({
      description: req.body.description,
      duration: Number(req.body.duration),
      date: req.body.date ? Date.parse(req.body.date) : Date.now(),
    });

    user.exercises.push(exercise);
    user.save()
    .then(() => res.json({
      _id: user._id,
      username: user.username,
      date: new Date(exercise.date).toDateString(),
      duration: exercise.duration,
      description: exercise.description
    }))
    .catch(err => res.status(400).json({message: err}))
  })
  .catch(err => res.status(500).json({ message: err }))
})

app.get('/api/users/:_id/logs', (req, res) => {
  User.findById(req.params._id)
    .then(user => {
      let exercises = user.exercises;
      
      if (req.query.from || req.query.to) {
        let fromDate = new Date(0);
        let toDate = new Date();

        if (req.query.from) {
          fromDate = new Date(req.query.from);
        }

        if (req.query.to) {
          toDate = new Date(req.query.to);
        }

        fromDate = fromDate.getTime();
        toDate = toDate.getTime();

        exercises = exercises.filter((session) => {
          let sessionDate = new Date(session.date).getTime();

          return sessionDate >= fromDate && sessionDate <= toDate;
        });
      }

      if (req.query.limit) {
        exercises = exercises.slice(0, req.query.limit);
      }

      res.json({
        _id: user._id,
        username: user.username,
        count: exercises.length,
        log: exercises.map(exercise => {
          return {
            description: exercise.description,
            duration: exercise.duration,
            date: new Date(exercise.date).toDateString()
          };
        })
      });
    })
    .catch(err => res.status(400).json('Error: ' + err));
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

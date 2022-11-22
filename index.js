const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const { query } = require('express');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

//! Middleware......
app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
	res.send('Doctor portal server is running');
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.y0hhy5e.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	serverApi: ServerApiVersion.v1,
});


//! < Middleware >...... for JWT verification......
function verifyJWT(req, res, next){
	const authHeader = req.headers.authorization;
	if (!authHeader) {
		return res.status(401).send('Unauthorized access');
	}
	const token = authHeader;


	jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
		if (err) {
			return res.status(403).send({ message: 'Forbidden access' });
		}
		req.decoded = decoded;
		next();
	});
}



 


async function run() {
	try {
		const appointmentOptionCollection = client
			.db('DoctorsPortal')
			.collection('AppointServicesOptions');
		const bookingsCollection = client
			.db('DoctorsPortal')
			.collection('bookings');
		const usersCollection = client.db('DoctorsPortal').collection('users');
		const doctorsCollection = client.db('DoctorsPortal').collection('doctors');



		// TODO: Make Sure 
		const verifyAdmin = (req, res, next) => {
			console.log('inside', req.decoded.email)
			next()
		}

		//!======START <- Getting whole appointment data from the server side for client side -> ======>
		app.get('/appointOptions', async (req, res) => {
			//Getting all data from data base
			const query = {};
			const options = await appointmentOptionCollection.find(query).toArray();

			// Filtering data from option
			const date = req.query.date;
			const dateQuery = { appointmentDate: date };
			const bookedOption = await bookingsCollection.find(dateQuery).toArray();

			// Give me the value which are already booked
			options.forEach((option) => {
				optionBooked = bookedOption.filter(
					(book) => book.treatment === option.name
				);

				bookedSlots = optionBooked.map((book) => book.appointmentTime);

				const remainingSlots = option.slots.filter(
					(slot) => !bookedSlots.includes(slot)
				);

				option.slots = remainingSlots;
			});

			res.send(options);
		});
		//!======END======>

		//!======START <- Get Deshboard Data From mongodb -> ======>
		app.get('/bookings', async (req, res) => {
			const email = req.query.email;
			// console.log('tokku', req.headers.authorization);

			const query = { email: email };
			const bookings = await bookingsCollection.find(query).toArray();
			res.send(bookings);
		});
		//!======END======>

		//!======START <-  -> ======
		app.post('/bookings', async (req, res) => {
			const booking = req.body;

			// Check koro j ai email er user ti ai date a ai treatment ti book korse ki na?
			const query = {
				email: booking.email,
				appointmentDate: booking.appointmentDate,
				treatment: booking.treatment,
			};

			const alreadyBooked = await bookingsCollection.find(query).toArray();

			if (alreadyBooked.length) {
				const message = `You already have a booking on ${booking.appointmentDate}`;
				return res.send({ acknowledged: false, message });
			}
			const result = await bookingsCollection.insertOne(booking);
			res.send(result);
		});
		//!======END======>

		//!======START <-  -> ======
		app.get('/jwt', async (req, res) => {
			const email = req.query.email;

			const query = { email: email };
			const user = await usersCollection.findOne(query);
			const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
				expiresIn: '1h',
			});
			if (!user) {
				return res.status(403).send({ accessToken: '' });
			}
			res.send({ accessToken: token });
		});
		//!======END======>

		//!======START <- Collect User Info from Sign up and set it database -> ======>
		app.post('/users', async (req, res) => {
			const user = req.body;
			const result = await usersCollection.insertOne(user);
			res.send(result);
		});
		//!======END======>

		//!======START <- get All Users  -> ======>
		app.get('/users', async (req, res) => {
			const query = {};
			const users = await usersCollection.find(query).toArray();
			res.send(users);
		});

		//!======END======>

		//!======START <- to check an user is he an admin?  <Vdo->75.9> -> ======>

		app.get('/users/admin/:email', async (req, res) => {
			const email = req.params.email;
			const query = { email };
			const user = await usersCollection.findOne(query);
			res.send({ isAdmin: user?.role === 'admin' });
		});
		//!======END======>
		0;

		//!======START <- Update an user to an admin  <Vdo->75.8> -> ======>
		app.put('/users/admin/:id', verifyJWT, async (req, res) => {
			// check by email that who r valid user
			const decodedEmail = req.decoded?.email;

			const query = { email: decodedEmail };
			const user = await usersCollection.findOne(query);
			// if the user is not admin, he can not change the admin rolezz
			if (user?.role !== 'admin') {
				return res.status(403).send({ message: 'Forbidden Access' });
			}

			const id = req.params.id;
			const filter = { _id: ObjectId(id) };
			const options = { upsert: true };
			const updateDoc = {
				$set: {
					role: 'admin',
				},
			};
			const result = await usersCollection.updateOne(
				filter,
				updateDoc,
				options
			);
			res.send(result);
		});

		//!======END======>

		//!======START <- Update an user to a Moderator -> ======>
		app.put('/users/moderator/:id', async (req, res) => {});
		//!======END======>

		//! Delete User
		app.delete('/users/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const result = await usersCollection.deleteOne(query);
			res.send(result);
		});
		//!======END======>

		//! update admin to User
		app.put('/users/:id', async (req, res) => {
			// // check by email that who r valid user
			// const decodedEmail = req.decoded?.email;
			// const query = { email: decodedEmail };
			// const user = await usersCollection.findOne(query);
			// // if the user is not admin, he can not change the admin rolezz
			// if (user?.role !== 'admin') {
			// 	return res.status(403).send({ message: 'Forbidden Access' });
			// }

			const id = req.params.id;
			const filter = { _id: ObjectId(id) };
			const query = {};
			console.log(query);
			const replacement = {
				role: 'user',
			};
			const result = await usersCollection.replaceOne(
				filter,
				query,
				replacement
			);
			res.send(result);
		});
		//!======END======>

		//! no admin!
		app.get('/admin', async (req, res) => {
			const query = {};
			const result = usersCollection.find(query);
			res.send(result);
		});
		//!======END======>

		//! Make me admin post
		//kjrgkjkgkgkgb
		//!======END======>

		//!======START <- Getting special data from appointment options vdo 76.2-> ======>
		app.get('/appointSpecialOption', async (req, res) => {
			const query = {};
			const result = await appointmentOptionCollection
				.find(query)
				.project({ name: 1 })
				.toArray();
			res.send(result);
		});

		//!======END======>

		// TODO: Doctor create manage section ==========>

		//!======START <- Create a doctor vdo 76.5-> ======>
		app.post('/doctors', async (req, res) => {
			const doctors = req.body;
			const result = await doctorsCollection.insertOne(doctors)
			res.send(result);
		});

		//!======END======>
		//!======START <- get doctors data from mongodb vdo 76.5-> ======>
		app.get('/doctors',verifyJWT, verifyAdmin,  async (req, res) => {
			const query = {};
			const result = await doctorsCollection.find(query).toArray();
			res.send(result);
		});

		//!======END======>
		//!======START <- Delete doctor info 76.8-> ======>
		app.delete('/doctors/:id', async (req, res) => {
			const id = req.params.id;
			const query = {_id: ObjectId(id)};
			const result = await doctorsCollection.deleteOne(query);
			res.send(result);
		});

		//!======END======>
	}
	finally { }
}

run().catch(console.log);

app.listen(port, () => console.log(`Doctor portal running on port ${port}`));

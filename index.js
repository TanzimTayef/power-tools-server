const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const PORT = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xeeis.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({message : 'UnAuthorization access'})
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}



async function run() {
  try {
    await client.connect();
    const toolsCollection = client.db("power-tools").collection("tools");
    const orderCollection = client.db("power-tools").collection("order");
    const reviewCollection = client.db("power-tools").collection("review");
    const infoCollection = client.db("power-tools").collection("userInfo");
    const usersCollection = client.db("power-tools").collection("users");

    app.get("/tools", async (req, res) => {
      const query = {};
      const cursor = toolsCollection.find(query);
      const tools = await cursor.toArray();
      res.send(tools);
    });
    app.post("/tools", async (req, res) => {
      const tools = req.body;
      const result = await toolsCollection.insertOne(tools);
      res.send(result);
    });

    app.get("/tools/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const tool = await toolsCollection.findOne(query);
      res.send(tool);
    });

    app.post("/order", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    app.get("/orders", async (req, res) => {
      const query = {};
      const cursor = orderCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });

    app.get("/order", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const cursor = orderCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });

    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/review", async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const review = await cursor.toArray();
      res.send(review);
    });

    app.post("/review", async (req, res) => {
      const newTools = req.body;
      const result = await reviewCollection.insertOne(newTools);
      res.send(result);
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const info = req.body;
      const filter = { email: email };

      console.log(info);

      console.log(filter);
      const options = { upsert: true };
      const updateDoc = {
        $set: info,
      };
      const result = await infoCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // users API
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });

    app.get("/users", async (req, res) => {
      const query = {};
      const cursor = usersCollection.find(query);
      const users = await cursor.toArray();
      res.send(users);
    });

    app.put("/users/admin/:email", verifyJwt, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const reqAccount = await usersCollection.findOne({ email: requester })
      if (reqAccount.role === 'admin') {
        const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
      } else {
        res.status(403).send({message: 'forbidden'})
      }
      
    });


    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin });
    });


    // payment api
    app.get("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) }
      const order = await orderCollection.findOne(query);
      res.send(order);
    })


    app.post('/create-payment-intent', async(req, res) =>{
      const service = req.body;
      const price = service.price;
      const amount = price*100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount : amount,
        currency: 'usd',
        payment_method_types:['card']
      });
      res.send({clientSecret: paymentIntent.client_secret})
    });


  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Power Tools server is running!");
});

app.listen(PORT, () => {
  console.log("Server is running:", PORT);
});

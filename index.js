const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware***
app.use(cors());
app.use(express.json());

// database connection***

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gkjkr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // coding part***

    // collection part**
    const petCollection = client.db("pet-house").collection("pets");
    const categoryCollection = client.db("pet-house").collection("categories");
    const userCollection = client.db("pet-house").collection("users");
    const adoptionCollection = client.db("pet-house").collection("adoptions");
    const reviewCollection = client.db("pet-house").collection("reviews");

    // jwt related api**
    // jwt related api*
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "100h",
      });
      res.send({ token });
    });

    // middleware**
    // middleware verify token*
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      console.log("Access Token:", token);

      // verify a token symmetric
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "no access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // pet related api**
    // get all the pets*
    app.get("/pets", async (req, res) => {
      const result = await petCollection.find().toArray();
      res.send(result);
    });

    // category related api**
    // get all the categories pets*
    app.get("/categories", async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(result);
    });

    // users related api**

    // get every the users*
    app.get("/users", verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // user post*
    app.post("/users", async (req, res) => {
      const user = req.body;
      // insert user, if user doesn't exist
      // many ways of this, 1. email unique, 2. upsert, 3. simple checking
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exist", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    //   adoption related api**
    // post every adoption*
    app.post("/adoptions", async (req, res) => {
      const item = req.body;
      const result = await adoptionCollection.insertOne(item);
      res.send(result);
    });

    //   get all the adoption req*
    app.get("/adoptions", async (req, res) => {
      const result = await adoptionCollection.find().toArray();
      res.send(result);
    });

    // review related api**
    // read all the reviews data*
    app.get("/reviews", async (req, res) => {
        const result = await reviewCollection.find().toArray();
        res.send(result);
      });

    // don't touch part***
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// to run simple api***
app.get("/", (req, res) => {
  res.send("assignment is mine");
});

app.listen(port, () => {
  console.log(`it's running ${port}`);
});

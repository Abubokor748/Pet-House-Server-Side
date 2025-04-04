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

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const campaignCollection = client.db("pet-house").collection("campaigns");

    // jwt related api**
    // jwt related api*
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "100h",
      });
      res.send({ token });
    });

    // middleware******************************************
    // middleware verify token**************************
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

    // use verify admin after verifyToken***************************
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // get a single pet*
    app.get("/pets/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petCollection.findOne(query);
      res.send(result);
    });

    // add a pet, post pets*
    app.post("/pets", async (req, res) => {
      const item = req.body;
      const result = await petCollection.insertOne(item);
      res.send(result);
    });

    // update a pet
    app.put("/pets/:id", async (req, res) => {
      const id = req.params.id;
      const updatedPet = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: updatedPet,
      };
      const result = await petCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // by email get pets
    app.get("/pets", async (req, res) => {
      const email = req.query.email;

      let query = {};

      if (email) {
        query = { email: email };
      }
      const result = await petCollection.find(query).toArray();
      res.send(result);
    });

    // delete for both admin and user in different cases
    // Update the delete endpoint
    app.delete("/pets/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const userEmail = req.decoded.email;

        // Check if user is admin
        const user = await userCollection.findOne({ email: userEmail });
        const isAdmin = user?.role === "admin";

        // Build query based on user role
        const query = isAdmin
          ? { _id: new ObjectId(id) }
          : { _id: new ObjectId(id), email: userEmail };

        const result = await petCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res
            .status(404)
            .send({ message: "Pet not found or unauthorized" });
        }

        res.send({ message: "Pet deleted successfully", result });
      } catch (error) {
        console.error("Delete error:", error);
        res.status(500).send({ message: "Server error", error: error.message });
      }
    });

    // category related api**
    // get all the categories pets*
    app.get("/categories", async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(result);
    });

    // users related api**
    // get every the users*
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // user post*
    app.post("/users", async (req, res) => {
      const user = req.body;
      // insert user, if user doesn't exist
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exist", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    // delete user
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Unauthorized Access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    //   campaign related api**
    // post every campaign*
    app.post("/campaigns", verifyToken, async (req, res) => {
      const item = req.body;
      const result = await campaignCollection.insertOne(item);
      res.send(result);
    });

    // update campaign
    app.put("/campaigns/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updatedCampaign = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: updatedCampaign,
      };
      const result = await campaignCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    //   get all the adoption req*
    app.get("/campaigns", async (req, res) => {
      const email = req.query.email;

      let query = {};

      if (email) {
        query = { createdBy: email };
      }
      const result = await campaignCollection.find(query).toArray();
      res.send(result);
    });

    // delete campaign
    app.delete("/campaigns/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await campaignCollection.deleteOne(query);
      res.send(result);
    });

    // GET Single Campaign
    app.get("/campaigns/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await campaignCollection.findOne(query);
      res.send(result);
    });

    //   adoption related api**
    // post every adoption*
    app.post("/adoptions", async (req, res) => {
      const item = req.body;
      const result = await adoptionCollection.insertOne(item);
      res.send(result);
    });
    // adoption delete
    app.delete("/adoptions/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await adoptionCollection.deleteOne(query);
      res.send(result);
    });

    //   get adoption req all and email*
    app.get("/adoptions", async (req, res) => {
      const email = req.query.email;

      let query = {};

      if (email) {
        query = { userEmail: email };
      }
      const result = await adoptionCollection.find(query).toArray();
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

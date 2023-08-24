const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) =>{
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'unauthorized access'});
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({error: true, message: 'unauthorized access'});
    }
    req.decoded = decoded;
    next();
  })
}







// Data-Base start
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.MONGODB_USER_NAME}:${process.env.MONGODB_PASSWORD}@book-verse.uifvr5z.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version--------
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

    const database = client.db("bookVerse");
    const allBooksCollections = database.collection("allBooks");
    const usersCollection = database.collection("users");
    const paymentCollection = database.collection("payments");
    const bestSellingAndRecentSelling = database.collection("bestSellingAndRecentSelling");
    
 


    // jwt by nahid start 

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn:'1h'})

      res.send({token})
    })




    // const verifyJWT = (req, res, next) =>{
    //   const authorization = req.headers.authorization;
    //   if(!authorization){
    //     return res.status(401).send({error: true, message: 'unauthorized access'});
    //   }
    //   const token = authorization.split(' ')[1];
    //   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    //     if(err){
    //       return res.status(401).send({error: true, message: 'unauthorized access'});
    //     }
    //     req.decoded = decoded;
    //     next();
    //   })
    // }




 // jwt by nahid end

    // get all books  start by Tonmoy

    app.get("/allBooks", async (req, res) => {
      const result = await allBooksCollections.find().toArray();

      res.send(result);
    });
    // get all books  end by Tonmoy

    // get single book by id  start by Tonmoy

    app.get("/singleBook/:id", async (req, res) => {
      const id = req.params.id;

      const find = { _id: new ObjectId(id) };

      const result = await allBooksCollections.findOne(find);

      res.send(result);
    });
    // get single book id  end by Tonmoy

    //user related api
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.delete('/users/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })


    // make admin start by nahid 
    app.get('/users/admin/:email',verifyJWT, async(req, res) => {
      const email = req.params.email;
      if(req.decoded.email !== email){
       return  res.send({admin: false})
      }
      console.log(req.decoded.email)
      console.log(email)
      const query = {email: email}
      const user = await usersCollection.findOne(query);
      const result = {admin: user?.role === 'admin'}
      res.send(result)
    })

    



    app.patch('/users/admin/:id', async(req, res)=> {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id)};
      const updateDoc = {
        $set:{
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    


 // make admin end by nahid 





    //------------------ Post method start------------------
    app.post("/allBooks", async (req, res) => {
      const newBook = req.body;
      // console.log(newBook);
      const result = await allBooksCollections.insertOne(newBook);
      res.send(result);
    });
    //------------------ Post method end------------------

    //------------------ Update method end------------------

    app.put("/allBooks/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updateBook = req.body;
        console.log(id, updateBook);

        const book = {
          $set: {
            title: updateBook.title,
            author: updateBook.author,
            category: updateBook.category,
            language: updateBook.language,
            real_price: updateBook.real_price,
            offer_price: updateBook.offer_price,
            page_numbers: updateBook.page_numbers,
            rating: updateBook.rating,
            published: updateBook.published,
            about_author: updateBook.about_author,
            description: updateBook.description,
            cover_image_url: updateBook.cover_image_url,
            author_image_url: updateBook.author_image_url,
          },
        };

        const result = await allBooksCollections.updateOne(
          filter,
          book,
          options
        );

        if (result.modifiedCount > 0) {
          res.send({ success: true, message: "Book updated successfully" });
        } else {
          res.status(404).send({ success: false, message: "Book not found" });
        }
      } catch (error) {
        console.error("Error updating book:", error);
        res.status(500).send({ success: false, message: "An error occurred" });
      }
    });

    //------------------ Update method end------------------

    //------------------ Delete method start------------------
    app.delete("/allBooks/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allBooksCollections.deleteOne(query);
      res.send(result);
    });
    //------------------ Delete method end------------------

    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
      try {
        const { price } = req.body;
        if (!price) {
          return res
            .status(400)
            .json({ error: "Missing price in request body" });
        }

        // Convert the price to a whole number in cents
        const amount = Math.round(parseFloat(price) * 100);

        if (isNaN(amount) || amount <= 0) {
          return res.status(400).json({ error: "Invalid price" });
        }

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).json({
          error: "An error occurred while creating the payment intent",
        });
      }
    });

    // payment related api
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      console.log("pay", payment);
      const result = await paymentCollection.insertOne(payment);
      console.log("res", result);
      res.send(result);
    });

    app.get("/paymentHistory", async (req, res) => {
      const result = await paymentCollection
        .find()
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    // post  best selling & recent selling start by tonmoy

    app.post("/bestSellingAndRecentSelling", async (req, res) => {
      try {
        const booksData = req.body;

        const { previous_id, count = count || 1, purchase_date } = booksData;

        let result;

        const existingBook = await bestSellingAndRecentSelling.findOne({
          previous_id,
        });

        if (existingBook) {
          const totalCount = existingBook.count + count;

          result = await bestSellingAndRecentSelling.updateOne(
            { previous_id },
            {
              $set: {
                count: totalCount,
                purchase_date,
              },
            }
          );
        } else {
          const newData = {
            ...booksData,
            count: count,
            purchase_date: purchase_date,
          };
          result = await bestSellingAndRecentSelling.insertOne(newData);
        }

        console.log("Database update result:", result);

        res.status(200).json({ message: "Data updated successfully" });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "An error occurred" });
      }
    });

    // post  best selling & recent selling end by Tonmoy

    //  get best selling data  start by Tonmoy

    app.get("/bestSelling", async (req, res) => {
      const result = await bestSellingAndRecentSelling
        .find()
        .sort({ count: -1 })
        .toArray();

      res.send(result);
    });

    //  get best selling data  end by  Tonmoy

    //  get recent selling data  start by Tonmoy

    app.get("/recentSelling", async (req, res) => {
      const result = await bestSellingAndRecentSelling
        .find()
        .sort({ purchase_date: -1 })
        .toArray();

      res.send(result);
    });

    //  get recent selling data  end by  Tonmoy



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
// Data-Base end

app.get("/", (req, res) => {
  res.send("Book Verse server is running");
});

app.listen(port, () => {
  console.log(`Book Verse Server is running on port: ${port}`);
});

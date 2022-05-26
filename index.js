const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
var bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_PASSWORD}@cluster0.7syzr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

/**
 * verify JWT for rest api
 */
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "unauthorized access" });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.PRIVATE_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        await client.connect();
        console.log('Manufacturer Website DB connected');

        const userCollection = client.db("manufacturerWebsite").collection("users");
        const productCollection = client.db("manufacturerWebsite").collection("products");
        const carouselCollection = client.db("manufacturerWebsite").collection("carousels");
        const hammerPhotosCollection = client.db("manufacturerWebsite").collection("hammerPhotos");
        const reviewCollection = client.db("manufacturerWebsite").collection("reviews");
        const userOrdersCollection = client.db("manufacturerWebsite").collection("userOrders");
        const paymentCollection = client.db('manufacturerWebsite').collection('payments');
        const blogsCollection = client.db('manufacturerWebsite').collection('blogs');

        // display carousel as slider
        app.get('/carousels', async (req, res) => {
            const carousels = await carouselCollection.find({}).toArray();
            res.send(carousels);
        })

        // add user review
        app.put('/review/:email', async (req, res) => {
            const reviewerEmail = req.params.email;
            const userReview = req.body;
            const filter = { reviewerEmail: reviewerEmail };
            const options = { upsert: true };
            const updateDoc = {
                $set: userReview
            };
            const usersReview = await reviewCollection.updateOne(filter, updateDoc, options);
            res.send(usersReview);
        })

        // display reviews as section
        app.get('/reviews', async (req, res) => {
            const reviews = await reviewCollection.find({}).toArray();
            res.send(reviews);
        })

        // display all hammer photos while necessary
        app.get('/hammerPhotos', async (req, res) => {
            const hammerPhotos = await hammerPhotosCollection.find({}).toArray();
            res.send(hammerPhotos);
        })

        // display all users to convey admin and user
        app.get('/users', async (req, res) => {
            const users = await userCollection.find({}).toArray();
            res.send(users);
        })

        // add a new user
        /* app.post('/user', async (req, res) => {
            const user = req?.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        }); */

        // add a new user
        app.put('/userAdd/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.PRIVATE_KEY, { expiresIn: '1h' })
            res.send({ result, token });
        });

        // find user admin
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const admin = await userCollection.findOne(query);
            res.send(admin);
        })

        // add an user to an admin
        app.put('/user/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: "admin"
                }
            };
            const options = { upsert: true };
            const admin = await userCollection.updateOne(filter, updateDoc, options);
            res.send(admin);
        })

        // display each 3 products
        app.get('/products', async (req, res) => {
            // const products = await productCollection.find({}).toArray();
            // res.send(products);

            const pageNumber = parseInt(req.query.pageNumber);

            const query = {};
            const cursor = productCollection.find(query);
            let products;

            if (pageNumber || 3) {
                products = await cursor.skip(pageNumber * 3).limit(3).toArray();
            } else {
                products = await cursor.toArray();
            }

            res.send(products);
        })

        // add a new product to db
        app.post('/product', async (req, res) => {
            const productInfo = req?.body;
            const product = await productCollection.insertOne(productInfo);
            res.send(product);
        })

        // display all products
        app.get('/allProducts', async (req, res) => {
            const products = await productCollection.find({}).toArray();
            res.send(products);
        })

        // display amount/count of all products
        app.get('/productCount', async (req, res) => {
            // const productCount = await productCollection.find({}).count();
            // res.send({ count: productCount });

            const count = await productCollection.estimatedDocumentCount();
            res.send({ count });
        })

        // display single product
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.find(query).toArray();
            res.send(product);
        })

        // delete a product by admin
        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(filter);
            res.send(result);
        })

        // add user order
        app.post('/userOrder', async (req, res) => {
            const orderInfo = req?.body;
            const userOrder = await userOrdersCollection.insertOne(orderInfo);
            res.send(userOrder);
        })

        // delete a user order
        /* may be unused (not sure!) */
        // app.delete('/userOrder/:email', async (req, res) => {
        //     const email = req.params.email;
        //     const filter = { userEmail: email };
        //     const result = await userOrdersCollection.deleteOne(filter);
        //     console.log(result);
        //     res.send(result);
        // })

        // delete a user order
        app.delete('/userOrder/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await userOrdersCollection.deleteOne(filter);
            res.send(result);
        })

        // display ordered product
        app.get('/userOrders', async (req, res) => {
            const email = req.query.email;
            let userOrders;
            if (email) {
                const query = { userEmail: email };
                userOrders = await userOrdersCollection.find(query).toArray();
            } else {
                userOrders = await userOrdersCollection.find({}).toArray();
            }
            res.send(userOrders);
        })

        // update availability through admin
        app.put('/userOrder/:id', async (req, res) => {
            const id = req.params.id;
            const qty = req.body;
            console.log(qty);
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    approval: true,
                    toolAvailableQuantity: parseInt(qty?.toolAvailableQuantity)
                }
            };
            const options = { upsert: true };
            
            const result = await userOrdersCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        // update availability in total product collection
        app.put('/product/:id', async (req, res) => {
            const id = req.params.id;
            const qty = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    toolAvailableQuantity: parseInt(qty?.toolAvailableQuantity)
                }
            };
            const option = { upsert: true };
            const result = await productCollection.updateOne(filter, updatedDoc, option);
            res.send(result);
        })

        // display specific ordered product through id
        app.get('/userOrder/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const userOrder = await userOrdersCollection.findOne(query);
            res.send(userOrder);
        })

        // add user order with payment method
        app.patch('/userOrder/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment?.transactionId
                }
            };

            const result = await paymentCollection.insertOne(payment);
            const updateUserOrder = await userOrdersCollection.updateOne(filter, updateDoc);
            res.send(updateDoc);
        })

        // make a payment through create payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const userOrder = req.body;
            const totalPrize = userOrder?.totalPrize;
            const amount = totalPrize * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: [
                    "card"
                ],
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        // access all blogs
        app.get('/blogs', async (req, res) => {
            const blogs = await blogsCollection.find({}).toArray();
            res.send(blogs);
        })
    } finally {
        // await client.close();
    }
} run().catch(console.dir);


app.get('/', (req, res) => {
    console.log('body', req.body);
    res.send('Manufacturer Website server started!');
})

app.listen(port, () => {
    console.log('Manufacturer Website connected on port:', port);
})

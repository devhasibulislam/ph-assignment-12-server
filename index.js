const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
var bodyParser = require('body-parser');
require('dotenv').config();

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
        const paymentCollection = client.db('doctorsPortal').collection('payments');

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

        // add a new user
        app.post('/user', async (req, res) => {
            const user = req?.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        // display all products
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

        // add user order
        app.post('/userOrder', async (req, res) => {
            const orderInfo = req?.body;
            const userOrder = await userOrdersCollection.insertOne(orderInfo);
            res.send(userOrder);
        })

        // delete a user order
        app.delete('/userOrder/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { userEmail: email };
            const result = await userOrdersCollection.deleteOne(filter);
            console.log(result);
            res.send(result);
        })

        // display ordered product
        app.get('/userOrders', async (req, res) => {
            const userOrders = await userOrdersCollection.find({}).toArray();
            res.send(userOrders);
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

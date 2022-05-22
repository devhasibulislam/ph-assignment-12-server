const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
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

        // display carousel as slider
        app.get('/carousels', async (req, res) => {
            const carousels = await carouselCollection.find({}).toArray();
            res.send(carousels);
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
            const products = await productCollection.find({}).toArray();
            res.send(products);
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

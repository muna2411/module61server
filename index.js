const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pjcsd3j.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


//midlewares
const logger = async(req,res,next) =>{
  console.log('called:' , req.host,req.originalUrl)
  next();
}

const varifyToken = async(req,res,next) =>{
 const token = req.cookies?.token;
 console.log('value of token midelware' , token)
 if(!token){
  //console.log(err)
  return res.status(401).send({message: 'not authorized'})
 }
 jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, (err,decoded) =>{
  if(err){
    return res.status(401).send({message:'unauthorized'})
  }
 // console.log('value in the token', decoded)
  req.user = decoded;
  next();
 })
 
}

async function run() {
  try {
    await client.connect();

    const bCollection = client.db('carDoc').collection('B');
    const cCollection = client.db('carDoc').collection('bookings');

    //auth related api
     app.post ('/jwt' ,logger, async(req,res) =>{
      const user= req.body ;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET , {expiresIn : '1h'})
      res
       .cookie('token' , token,{
        httpOnly : true,
        secure : true,
        sameSite: 'none'
       
      })
      .send({success :true})
     })

     app.post('/logout' , async (req,res) =>{
      const user = req.body;
      console.log('logged out' , user);
      res.clearCookie('token' , {maxAge: 0}).send({success: true})
     })


    //sevice  (B) related
    app.get('/B' ,logger, async(req,res) => {
        const cursor = bCollection.find();
        const result = await cursor.toArray();
        res.send(result)
    })

    app.get('/B/:id',async(req,res) => {
      const id =req.params.id;
      const query = {_id: new ObjectId(id)}
    const options = {
      projection:{brand: 1, id:1 ,price:1 , image_url: 1}
    }
      const result = await bCollection.findOne(query , options);
      res.send(result)
    })

    //booking
    app.get('/bookings' ,logger ,varifyToken, async(req,res) => {
      console.log(req.query.email);
      console.log('cook ', req.cookies)
      console.log('user valid token' , req.user)
      if(req.query.email !== req.user.email){
        return res.status(403).send({message : 'forbidden access'})
      }

      let query = {};
      if(req.query?.email){
        query = {email: req.query.email}
      }
      const cursor = cCollection.find(query);
      const result = await cursor.toArray();
      res.send(result)
  })

    app.post('/bookings' ,async(req,res) => {
      const booking = req.body;
      console.log(booking);
      const result = await cCollection.insertOne(booking);
      res.send(result);
    })

    app.patch('/bookings/:id',async(req,res) =>{
      const id = req.params.id;
      const filter = {_id:new ObjectId(id)};
      const updateBooking = req.body;
      console.log(updateBooking);
      const updateDoc={
        $set: {
          status:updateBooking.status
        },
      };
      const result = await cCollection.updateOne(filter,updateDoc);
      res.send(result);
    })

    app.delete('/bookings/:id',async (req,res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await cCollection.deleteOne(query);
      res.send(result);
    })


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('simple car')
})

app.listen(port, () => {
  console.log(`Example app simple crud on port ${port}`)
})
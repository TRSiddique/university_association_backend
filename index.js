const express= require("express");
const cors= require("cors");
const app= express();
const port=process.env.PORT||4000;
require("dotenv").config();
const { MongoClient, ServerApiVersion,ObjectId } = require('mongodb');
const uri = "mongodb+srv://tasfiquecse21701008_db_user:fLF6jiRUf27mFB41@cusap.crapgyu.mongodb.net/?appName=cusap";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
//middleware
app.use(express.json());
app.use(cors());

//fLF6jiRUf27mFB41
//tasfiquecse21701008_db_user

async function run() {
  try {
     await client.connect();
    console.log("Pinged your deployment. You successfully connected to MongoDB!");


const memberCollection = client.db("cusapDB").collection("members");
app.post("/member", async (req, res) => {
      const newMember = req.body;
      console.log(newMember);
      const result = await memberCollection.insertOne(newMember);
      res.send(result);
    });

app.get('/member',async(req,res)=>{
    const cursor=memberCollection.find();
    const result= await cursor.toArray();
    res.send(result);
})

app.get('/member/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const member = await memberCollection.findOne({ _id: new ObjectId(id) });
    if (!member) {
      return res.status(404).send({ message: 'Member not found' });
    }
    res.send(member);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Server error' });
  }
});

app.delete('/member/:id', async(req,res)=>{
  const id=req.params.id;
  const query ={_id: new ObjectId(id)}
  const result=await memberCollection.deleteOne(query);
  res.send(result);
}) 

//update korar jonno

app.get('/member/:id',async(req,res)=>{
  const id=req.params.id;
  const query={_id: new ObjectId(id)}
  const result =await memberCollection.findOne(query)
  res.send(result)
})

app.put('/member/:id',async(req,res)=>{
  const id=req.params.id;
  const filter={_id : new ObjectId(id)}
  const options={upsert: true};
  const updatedMember= req.body;

  const member={
    $set:{
      name: updatedMember.name , 
      photo: updatedMember.photo, 
      blood:updatedMember.blood, 
      union:updatedMember.union,
      studentId:updatedMember.studentId,
      department:updatedMember.department,
      session:updatedMember.session,
      mobile:updatedMember.mobile,
    }
  }
  const result=await memberCollection.updateOne(filter,member,options);
  res.send(result);
})







  } finally {
    // Ensures that the client will close when you finish/error
  
  }
}
run().catch(console.dir);




app.get('/',(req, res)=>{
     res.send("hello!! cusap server is running");
});
app.listen(port,()=>{
    console.log(`server is running on port: ${port}`);
});

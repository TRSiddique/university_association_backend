const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();
const port = process.env.PORT || 4000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = "mongodb+srv://tasfiquecse21701008_db_user:fLF6jiRUf27mFB41@cusap.crapgyu.mongodb.net/?appName=cusap";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use("/uploads", express.static("uploads"));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

async function run() {
  try {
    await client.connect();
    console.log("✓ Pinged your deployment. You successfully connected to MongoDB!");

    const memberCollection = client.db("cusapDB").collection("members");
    const commentCollection = client.db("cusapDB").collection("comments");
    const newsCollection = client.db("cusapDB").collection("news");
    const photoCollection = client.db("cusapDB").collection("photos");
    const videoCollection = client.db("cusapDB").collection("videos");
    const formCollection = client.db("cusapDB").collection("forms");
    const responseCollection = client.db("cusapDB").collection("responses");

    // ========== CREATE DATABASE INDEXES FOR PERFORMANCE ==========
    async function createIndexes() {
      try {
        await memberCollection.createIndex({ name: 1 });
        await memberCollection.createIndex({ studentId: 1 });
        await memberCollection.createIndex({ department: 1 });
        await memberCollection.createIndex({ blood: 1 });
        await memberCollection.createIndex({ session: 1 });
        await memberCollection.createIndex({ union: 1 });
        await newsCollection.createIndex({ date: -1 });
        await photoCollection.createIndex({ date: -1 });
        await videoCollection.createIndex({ date: -1 });
        console.log('✓ Database indexes created successfully');
      } catch (error) {
        console.error('Error creating indexes:', error);
      }
    }
    
    await createIndexes();

    // ========== IMAGE UPLOAD ENDPOINT ==========
    app.post("/upload", upload.single("photo"), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).send({ 
            success: false,
            message: "No file uploaded." 
          });
        }

        const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

        res.send({
          success: true,
          imageUrl: imageUrl,
          filename: req.file.filename,
        });
      } catch (error) {
        console.error("Upload error:", error);
        res.status(500).send({ 
          success: false,
          message: "Error uploading file" 
        });
      }
    });

    // ========== MEMBER ENDPOINTS ==========
    
    // POST - Create new member
    app.post("/member", async (req, res) => {
      try {
        const newMember = req.body;
        console.log("New member:", newMember);
        const result = await memberCollection.insertOne(newMember);
        res.send(result);
      } catch (error) {
        console.error("Error creating member:", error);
        res.status(500).send({ message: "Error creating member" });
      }
    });

    // GET - All members (OPTIMIZED)
    app.get("/member", async (req, res) => {
      try {
        // Project only necessary fields to reduce payload size
        const cursor = memberCollection.find({}, {
          projection: {
            name: 1,
            photo: 1,
            blood: 1,
            union: 1,
            studentId: 1,
            department: 1,
            session: 1,
            mobile: 1
          }
        });
        
        const result = await cursor.toArray();
        
        // Add cache headers for better performance
        res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
        res.send(result);
      } catch (error) {
        console.error("Error fetching members:", error);
        res.status(500).send({ message: "Error fetching members" });
      }
    });

    // GET - Single member by ID
    app.get("/member/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const member = await memberCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!member) {
          return res.status(404).send({ message: "Member not found" });
        }
        res.send(member);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // DELETE - Member by ID
    app.delete("/member/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };

        // Get member data to delete associated image
        const member = await memberCollection.findOne(query);
        if (member && member.photo && member.photo.includes("/uploads/")) {
          const filename = member.photo.split("/").pop();
          const filePath = path.join(__dirname, "uploads", filename);

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }

        const result = await memberCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Error deleting member:", error);
        res.status(500).send({ message: "Error deleting member" });
      }
    });

    // PUT - Update member by ID
    app.put("/member/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updatedMember = req.body;

        const member = {
          $set: {
            name: updatedMember.name,
            photo: updatedMember.photo,
            blood: updatedMember.blood,
            union: updatedMember.union,
            studentId: updatedMember.studentId,
            department: updatedMember.department,
            session: updatedMember.session,
            mobile: updatedMember.mobile,
          },
        };
        const result = await memberCollection.updateOne(filter, member, options);
        res.send(result);
      } catch (error) {
        console.error("Error updating member:", error);
        res.status(500).send({ message: "Error updating member" });
      }
    });

    // ========== COMMENT ENDPOINTS ==========
    
    app.post("/comment", async (req, res) => {
      try {
        const newComment = req.body;
        console.log("Received Comment:", newComment);
        const result = await commentCollection.insertOne(newComment);
        res.send(result);
      } catch (error) {
        console.error("Error creating comment:", error);
        res.status(500).send({ message: "Error creating comment" });
      }
    });

    app.get("/comment", async (req, res) => {
      try {
        const comments = await commentCollection.find().toArray();
        res.send(comments);
      } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).send({ message: "Error fetching comments" });
      }
    });

    // ========== NEWS ENDPOINTS ==========
    
    // POST - Create new news article
    app.post("/news", async (req, res) => {
      try {
        const newNews = req.body;
        console.log("New news:", newNews);
        
        newNews.date = new Date();
        newNews.views = 0;
        newNews.status = 'published';
        
        const result = await newsCollection.insertOne(newNews);
        res.send({
          success: true,
          message: 'News article created successfully',
          data: result
        });
      } catch (error) {
        console.error("Error creating news:", error);
        res.status(500).send({ 
          success: false,
          message: 'Error creating news article' 
        });
      }
    });

    // GET - All news articles
    app.get('/news', async (req, res) => {
      try {
        const cursor = newsCollection.find().sort({ date: -1 });
        const result = await cursor.toArray();
        
        res.send({
          success: true,
          data: result
        });
      } catch (error) {
        console.error("Error fetching news:", error);
        res.status(500).send({ 
          success: false,
          message: 'Error fetching news articles' 
        });
      }
    });

    // GET - Single news article by ID
    app.get('/news/:id', async (req, res) => {
      try {
        const id = req.params.id;
        
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ 
            success: false,
            message: 'Invalid news ID' 
          });
        }

        const news = await newsCollection.findOne({ _id: new ObjectId(id) });
        
        if (!news) {
          return res.status(404).send({ 
            success: false,
            message: 'News article not found' 
          });
        }

        res.send({
          success: true,
          data: news
        });
      } catch (error) {
        console.error("Error fetching news:", error);
        res.status(500).send({ 
          success: false,
          message: 'Error fetching news article' 
        });
      }
    });

    // PUT - Update news by ID
    app.put("/news/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedNews = req.body;
        
        const result = await newsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedNews }
        );
        
        if (result.matchedCount === 0) {
          return res.status(404).send({ 
            success: false,
            message: "News not found" 
          });
        }
        
        res.send({
          success: true,
          message: "News updated successfully"
        });
      } catch (error) {
        console.error("Error updating news:", error);
        res.status(500).send({ 
          success: false,
          message: "Error updating news" 
        });
      }
    });

    // DELETE - News by ID
    app.delete("/news/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        
        const result = await newsCollection.deleteOne(query);
        
        if (result.deletedCount === 0) {
          return res.status(404).send({ 
            success: false,
            message: "News not found" 
          });
        }
        
        res.send({
          success: true,
          message: "News deleted successfully"
        });
      } catch (error) {
        console.error("Error deleting news:", error);
        res.status(500).send({ 
          success: false,
          message: "Error deleting news" 
        });
      }
    });

    // ========== PHOTO GALLERY ENDPOINTS ==========
    
    const uploadToImageBB = async (imageBuffer, fileName) => {
      const IMGBB_API_KEY = '32006f2a50e2265ea475805d6b074bf3';
      
      const formData = new FormData();
      const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
      formData.append('image', blob, fileName);

      try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        
        if (data.success) {
          return data.data.url;
        } else {
          throw new Error(data.error?.message || 'ImageBB upload failed');
        }
      } catch (error) {
        console.error('ImageBB upload error:', error);
        throw error;
      }
    };

    // POST - Upload photo
    app.post("/photos", upload.single("image"), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).send({ 
            success: false,
            message: "No image uploaded" 
          });
        }

        const { title, description, date } = req.body;

        const imageBuffer = fs.readFileSync(req.file.path);
        const imageUrl = await uploadToImageBB(imageBuffer, req.file.originalname);

        fs.unlinkSync(req.file.path);

        const newPhoto = {
          title,
          description,
          url: imageUrl,
          date: date ? new Date(date) : new Date(),
          createdAt: new Date()
        };

        const result = await photoCollection.insertOne(newPhoto);
        res.send({
          success: true,
          message: "Photo uploaded successfully to ImageBB",
          data: { ...newPhoto, _id: result.insertedId }
        });
      } catch (error) {
        console.error("Error uploading photo:", error);
        
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        res.status(500).send({ 
          success: false,
          message: "Error uploading photo to ImageBB" 
        });
      }
    });

    // GET - All photos
    app.get("/photos", async (req, res) => {
      try {
        const cursor = photoCollection.find().sort({ date: -1 });
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching photos:", error);
        res.status(500).send({ message: "Error fetching photos" });
      }
    });

    // DELETE - Photo by ID
    app.delete("/photos/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };

        const photo = await photoCollection.findOne(query);
        if (photo && photo.url && photo.url.includes("/uploads/")) {
          const filename = photo.url.split("/").pop();
          const filePath = path.join(__dirname, "uploads", filename);

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }

        const result = await photoCollection.deleteOne(query);
        res.send({
          success: true,
          message: "Photo deleted successfully"
        });
      } catch (error) {
        console.error("Error deleting photo:", error);
        res.status(500).send({ message: "Error deleting photo" });
      }
    });

    // ========== VIDEO GALLERY ENDPOINTS ==========
    
    // POST - Add video link
    app.post("/videos", async (req, res) => {
      try {
        const { title, description, youtubeUrl, date } = req.body;

        if (!title || !youtubeUrl) {
          return res.status(400).send({ 
            success: false,
            message: "Title and YouTube URL are required" 
          });
        }

        const newVideo = {
          title,
          description,
          youtubeUrl,
          date: date ? new Date(date) : new Date(),
          createdAt: new Date()
        };

        const result = await videoCollection.insertOne(newVideo);
        res.send({
          success: true,
          message: "Video added successfully",
          data: { ...newVideo, _id: result.insertedId }
        });
      } catch (error) {
        console.error("Error adding video:", error);
        res.status(500).send({ 
          success: false,
          message: "Error adding video" 
        });
      }
    });

    // GET - All videos
    app.get("/videos", async (req, res) => {
      try {
        const cursor = videoCollection.find().sort({ date: -1 });
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching videos:", error);
        res.status(500).send({ message: "Error fetching videos" });
      }
    });

    // DELETE - Video by ID
    app.delete("/videos/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await videoCollection.deleteOne(query);
        res.send({
          success: true,
          message: "Video deleted successfully"
        });
      } catch (error) {
        console.error("Error deleting video:", error);
        res.status(500).send({ message: "Error deleting video" });
      }
    });

    // ========== FORM ADMIN ROUTES ==========

    // Create a new form
    app.post('/api/admin/forms', async (req, res) => {
      try {
        const form = {
          ...req.body,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        const result = await formCollection.insertOne(form);
        res.status(201).json({ ...form, _id: result.insertedId });
      } catch (error) {
        console.error("Error creating form:", error);
        res.status(400).json({ error: error.message });
      }
    });

    // Get all forms (admin)
    app.get('/api/admin/forms', async (req, res) => {
      try {
        const forms = await formCollection.find().sort({ createdAt: -1 }).toArray();
        res.json(forms);
      } catch (error) {
        console.error("Error fetching forms:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get single form (admin)
    app.get('/api/admin/forms/:id', async (req, res) => {
      try {
        if (!ObjectId.isValid(req.params.id)) {
          return res.status(400).json({ error: 'Invalid form ID' });
        }
        
        const form = await formCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!form) return res.status(404).json({ error: 'Form not found' });
        res.json(form);
      } catch (error) {
        console.error("Error fetching form:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Update form
    app.put('/api/admin/forms/:id', async (req, res) => {
      try {
        if (!ObjectId.isValid(req.params.id)) {
          return res.status(400).json({ error: 'Invalid form ID' });
        }
        
        const result = await formCollection.findOneAndUpdate(
          { _id: new ObjectId(req.params.id) },
          { $set: { ...req.body, updatedAt: new Date() } },
          { returnDocument: 'after' }
        );
        
        if (!result.value) return res.status(404).json({ error: 'Form not found' });
        res.json(result.value);
      } catch (error) {
        console.error("Error updating form:", error);
        res.status(400).json({ error: error.message });
      }
    });

    // Delete form
    app.delete('/api/admin/forms/:id', async (req, res) => {
      try {
        if (!ObjectId.isValid(req.params.id)) {
          return res.status(400).json({ error: 'Invalid form ID' });
        }
        
        const result = await formCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Form not found' });
        }
        res.json({ message: 'Form deleted successfully' });
      } catch (error) {
        console.error("Error deleting form:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get responses for a form
    app.get('/api/admin/forms/:id/responses', async (req, res) => {
      try {
        if (!ObjectId.isValid(req.params.id)) {
          return res.status(400).json({ error: 'Invalid form ID' });
        }
        
        const responses = await responseCollection
          .find({ formId: req.params.id })
          .sort({ submittedAt: -1 })
          .toArray();
        res.json(responses);
      } catch (error) {
        console.error("Error fetching responses:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // ========== FORM PUBLIC ROUTES ==========

    // Get active form by ID (public)
    app.get('/api/public/forms/:id', async (req, res) => {
      try {
        if (!ObjectId.isValid(req.params.id)) {
          return res.status(400).json({ error: 'Invalid form ID' });
        }
        
        const form = await formCollection.findOne({ 
          _id: new ObjectId(req.params.id), 
          isActive: true 
        });
        
        if (!form) return res.status(404).json({ error: 'Form not found' });
        res.json(form);
      } catch (error) {
        console.error("Error fetching form:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Submit form response
    app.post('/api/public/forms/:id/submit', async (req, res) => {
      try {
        if (!ObjectId.isValid(req.params.id)) {
          return res.status(400).json({ error: 'Invalid form ID' });
        }
        
        const form = await formCollection.findOne({ 
          _id: new ObjectId(req.params.id), 
          isActive: true 
        });
        
        if (!form) return res.status(404).json({ error: 'Form not found' });

        console.log('Form questions:', form.questions.map(q => q._id));
        console.log('Received answers:', req.body.answers);

        const response = {
          formId: req.params.id,
          answers: req.body.answers,
          submittedAt: new Date(),
          ipAddress: req.ip
        };
        
        const result = await responseCollection.insertOne(response);
        console.log('Response saved:', result.insertedId);
        
        res.status(201).json({ 
          message: 'Response submitted successfully',
          responseId: result.insertedId 
        });
      } catch (error) {
        console.error("Error submitting response:", error);
        res.status(400).json({ error: error.message });
      }
    });

    // ========== ERROR HANDLING ==========
    app.use((error, req, res, next) => {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(400).send({ 
            message: "File too large. Maximum size is 5MB." 
          });
        }
      }
      res.status(500).send({ message: error.message });
    });

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

// Basic routes
app.get("/", (req, res) => {
  res.send("Hello!! CUSAP server is running");
});

app.listen(port, () => {
  console.log(`✓ Server is running on port: ${port}`);
});
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();
const port = process.env.PORT || 4000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri =
  "mongodb+srv://tasfiquecse21701008_db_user:fLF6jiRUf27mFB41@cusap.crapgyu.mongodb.net/?appName=cusap";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ========== CHANGED: Fixed duplicate middleware ==========
// Middleware
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(cors());
app.use("/uploads", express.static("uploads")); // Serve static files from uploads directory
// ========== REMOVED: Duplicate middleware lines ==========

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create uploads directory if it doesn't exist
    const uploadDir = "uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Check if file is an image
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
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    const memberCollection = client.db("cusapDB").collection("members");
    const commentCollection = client.db("cusapDB").collection("comments");
    // ========== ADDED: News collection ==========
    const newsCollection = client.db("cusapDB").collection("news");

    // ========== CHANGED: Single upload endpoint for both 'photo' and 'image' ==========
    // Image upload endpoint - handles both 'photo' and 'image'
  // Image upload endpoint - handles file uploads
app.post("/upload", upload.single("file"), async (req, res) => { // ========== CHANGE: Use "file" as field name ==========
    try {
        if (!req.file) {
            return res.status(400).send({ 
                success: false,
                message: "No file uploaded." 
            });
        }

        // Construct the image URL
        const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

        res.send({
            success: true,
            imageUrl: imageUrl, // ========== This returns the URL string ==========
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
// ========== KEEP YOUR NEWS ENDPOINT AS IS (it already stores URL) ==========
app.post("/news", async (req, res) => {
    try {
        const newNews = req.body;
        console.log("New news:", newNews);
        
        // Add timestamp and default values
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

    // GET - All members
    app.get("/member", async (req, res) => {
      try {
        const cursor = memberCollection.find();
        const result = await cursor.toArray();
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

          // Delete the image file
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
        const result = await memberCollection.updateOne(
          filter,
          member,
          options
        );
        res.send(result);
      } catch (error) {
        console.error("Error updating member:", error);
        res.status(500).send({ message: "Error updating member" });
      }
    });

    // Comments endpoints
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

    // ========== ADDED: News endpoints ==========
    // POST - Create new news article
    app.post("/news", async (req, res) => {
      try {
        const newNews = req.body;
        console.log("New news:", newNews);
        
        // Add timestamp and default values
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

    // ========== ADDED: Get single news article by ID ==========
    app.get('/news/:id', async (req, res) => {
      try {
        const id = req.params.id;
        
        // Validate ObjectId
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

    // Error handling for file uploads
    app.use((error, req, res, next) => {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .send({ message: "File too large. Maximum size is 5MB." });
        }
      }
      res.status(500).send({ message: error.message });
    });

    const photoCollection = client.db("cusapDB").collection("photos");
const videoCollection = client.db("cusapDB").collection("videos");

// ========== PHOTO GALLERY ENDPOINTS ==========
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
    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

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
      message: "Photo uploaded successfully",
      data: { ...newPhoto, _id: result.insertedId }
    });
  } catch (error) {
    console.error("Error uploading photo:", error);
    res.status(500).send({ 
      success: false,
      message: "Error uploading photo" 
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

    // Get photo data to delete associated image
    const photo = await photoCollection.findOne(query);
    if (photo && photo.url && photo.url.includes("/uploads/")) {
      const filename = photo.url.split("/").pop();
      const filePath = path.join(__dirname, "uploads", filename);

      // Delete the image file
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
  console.log(`Server is running on port: ${port}`);
});
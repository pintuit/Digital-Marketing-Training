const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());


// ===============================
// MongoDB Connection
// ===============================

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");
  })
  .catch((error) => {
    console.error(
      "MongoDB connection error:",
      error.message
    );
  });


// ===============================
// REGISTER
// ===============================

app.post("/api/register", async (req, res) => {
  try {

    const {
      name,
      email,
      password
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const existingUser =
      await User.findOne({
        email
      });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered"
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    res.status(201).json({

      message:
        "Registration successful",

      user: {

        id: user._id,

        name: user.name,

        email: user.email,

        role: user.role,

        learningProgress:
          user.learningProgress,

        courseProgress:
          user.courseProgress,

        certificates:
          user.certificates || []

      }

    });

  } catch (error) {

    console.error(
      "Registration error:",
      error
    );

    res.status(500).json({
      message: "Server error"
    });

  }
});


// ===============================
// LOGIN
// ===============================

app.post("/api/login", async (req, res) => {
  try {

    const {
      email,
      password
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Email and password are required"
      });
    }

    const user =
      await User.findOne({
        email
      });

    if (!user) {
      return res.status(401).json({
        message:
          "Invalid email or password"
      });
    }

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        message:
          "Invalid email or password"
      });
    }

    const token =
      jwt.sign(
        {
          userId: user._id,
          role: user.role
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d"
        }
      );

    res.json({

      message:
        "Login successful",

      token,

      user: {

        id: user._id,

        name: user.name,

        email: user.email,

        role: user.role,

        learningProgress:
          user.learningProgress,

        courseProgress:
          user.courseProgress,

        certificates:
          user.certificates || []

      }

    });

  } catch (error) {

    console.error(
      "Login error:",
      error
    );

    res.status(500).json({
      message: "Server error"
    });

  }
});


// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {

  res.send(
    "Digital Marketing Training Website Backend is Working!"
  );

});


// ===============================
// UPDATE COURSE PROGRESS
// ===============================

app.put(
  "/api/progress",
  async (req, res) => {

    try {

      const {
        email,
        course,
        progress,
        completedLessons,
        lastLesson
      } = req.body;


      // Validate required fields

      if (
        !email ||
        !course ||
        progress === undefined
      ) {

        return res.status(400).json({

          message:
            "Email, course and progress are required"

        });

      }


      // Find user

      const user =
        await User.findOne({
          email: email
        });


      if (!user) {

        return res.status(404).json({

          message:
            "User not found"

        });

      }


      // Create course progress object

      const courseData = {

        progress:
          Number(progress),

        completedLessons:
          Array.isArray(completedLessons)
            ? completedLessons
            : [],

        lastLesson:
          lastLesson !== undefined
            ? Number(lastLesson)
            : 0

      };


      // Save progress for this course

      user.courseProgress.set(
        course,
        courseData
      );


      // ===============================
      // Calculate overall progress
      // ===============================

      const allCourses =
        user.courseProgress;

      let totalProgress = 0;

      let courseCount = 0;


      allCourses.forEach((data) => {

        totalProgress +=
          Number(
            data.progress || 0
          );

        courseCount++;

      });


      if (courseCount > 0) {

        user.learningProgress =
          Math.round(
            totalProgress /
              courseCount
          );

      }


      await user.save();


      res.json({

        message:
          "Course progress updated successfully",

        course,

        progress:
          courseData.progress,

        completedLessons:
          courseData.completedLessons,

        lastLesson:
          courseData.lastLesson,

        overallProgress:
          user.learningProgress,

        courseProgress:
          user.courseProgress

      });

    } catch (error) {

      console.error(
        "Course progress update error:",
        error
      );

      res.status(500).json({
        message: "Server error"
      });

    }

  }
);


// ==========================================
// CREATE / GET CERTIFICATE
// ==========================================

app.post(
  "/api/certificate",
  async (req, res) => {

    try {

      const {
        email,
        course
      } = req.body;


      // Check required fields

      if (!email || !course) {

        return res.status(400).json({

          message:
            "Email and course are required"

        });

      }


      // Find user

      const user =
        await User.findOne({
          email: email
        });


      if (!user) {

        return res.status(404).json({

          message:
            "User not found"

        });

      }


      // Get course progress

      const courseData =
        user.courseProgress.get(
          course
        );


      if (!courseData) {

        return res.status(400).json({

          message:
            "Course progress not found"

        });

      }


      // Get progress

      const progress =
        Number(
          courseData.progress || 0
        );


      // Certificate only after 100%

      if (progress < 100) {

        return res.status(403).json({

          message:
            `Course must be completed first. Current progress: ${progress}%`

        });

      }


      // ===============================
      // Check existing certificate
      // ===============================

      const existingCertificate =
        user.certificates.find(
          (certificate) =>
            certificate.course ===
              course &&
            certificate.status ===
              "valid"
        );


      if (existingCertificate) {

        return res.json({

          message:
            "Certificate already exists",

          certificate:
            existingCertificate,

          user: {

            name:
              user.name,

            email:
              user.email

          }

        });

      }


      // ===============================
      // Generate certificate ID
      // ===============================

      const randomNumber =
        Math.floor(
          100000 +
            Math.random() *
              900000
        );


      const namePart =
        user.name
          .replace(
            /[^a-zA-Z0-9]/g,
            ""
          )
          .substring(0, 4)
          .toUpperCase();


      const certificateId =
        `DL-${namePart}-${randomNumber}`;


      // ===============================
      // Create certificate
      // ===============================

      const certificate = {

        course:
          course,

        certificateId:
          certificateId,

        issuedAt:
          new Date(),

        status:
          "valid"

      };


      // Save certificate

      user.certificates.push(
        certificate
      );


      await user.save();


      // ===============================
      // Send response
      // ===============================

      res.status(201).json({

        message:
          "Certificate generated successfully",

        certificate:
          certificate,

        user: {

          name:
            user.name,

          email:
            user.email

        }

      });

    } catch (error) {

      console.error(
        "Certificate generation error:",
        error
      );

      res.status(500).json({

        message:
          "Server error"

      });

    }

  }
);


// ==========================================
// VERIFY CERTIFICATE
// ==========================================

app.get(
  "/api/certificate/:certificateId",
  async (req, res) => {

    try {

      const {
        certificateId
      } = req.params;


      // Find user by certificate ID

      const user =
        await User.findOne({

          "certificates.certificateId":
            certificateId

        });


      if (!user) {

        return res.status(404).json({

          valid:
            false,

          message:
            "Certificate not found"

        });

      }


      // Find certificate

      const certificate =
        user.certificates.find(
          (certificate) =>
            certificate.certificateId ===
            certificateId
        );


      if (
        !certificate ||
        certificate.status !==
          "valid"
      ) {

        return res.status(404).json({

          valid:
            false,

          message:
            "Certificate is invalid"

        });

      }


      // Return certificate information

      res.json({

        valid:
          true,

        certificate: {

          certificateId:
            certificate.certificateId,

          studentName:
            user.name,

          studentEmail:
            user.email,

          course:
            certificate.course,

          issuedAt:
            certificate.issuedAt,

          status:
            certificate.status

        }

      });

    } catch (error) {

      console.error(
        "Certificate verification error:",
        error
      );

      res.status(500).json({

        valid:
          false,

        message:
          "Server error"

      });

    }

  }
);


// ===============================
// GET USER PROFILE
// ===============================

app.get(
  "/api/user/:email",
  async (req, res) => {

    try {

      const {
        email
      } = req.params;


      const user =
        await User.findOne({
          email: email
        });


      if (!user) {

        return res.status(404).json({

          message:
            "User not found"

        });

      }


      res.json({

        user: {

          id:
            user._id,

          name:
            user.name,

          email:
            user.email,

          role:
            user.role,

          learningProgress:
            user.learningProgress,

          courseProgress:
            user.courseProgress,

          certificates:
            user.certificates || []

        }

      });

    } catch (error) {

      console.error(
        "User profile error:",
        error
      );

      res.status(500).json({

        message:
          "Server error"

      });

    }

  }
);


// ===============================
// SERVER
// ===============================

const PORT =
  process.env.PORT || 5000;


app.listen(
  PORT,
  () => {

    console.log(
      `Server running on http://localhost:${PORT}`
    );

  }
);
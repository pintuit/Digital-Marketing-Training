// ===============================
// UPDATE COURSE PROGRESS
// ===============================

const updateCourseProgress = async (req, res) => {
  try {
    const {
      email,
      course,
      progress,
      completedLessons,
      lastLesson
    } = req.body;

    // Validate required fields
    if (!email || !course || progress === undefined) {
      return res.status(400).json({
        message: "Email, course and progress are required"
      });
    }

    // Validate progress
    const numericProgress = Number(progress);

    if (
      !Number.isFinite(numericProgress) ||
      numericProgress < 0 ||
      numericProgress > 100
    ) {
      return res.status(400).json({
        message: "Progress must be between 0 and 100"
      });
    }

    // Find user using normalized email
    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // Prepare course progress data
    const courseName = String(course).trim();

    const courseData = {
      progress: numericProgress,
      completedLessons: Array.isArray(completedLessons)
        ? completedLessons
        : [],
      lastLesson:
        lastLesson !== undefined
          ? Number(lastLesson)
          : 0
    };

    // Ensure courseProgress is a Map
    if (
      !user.courseProgress ||
      typeof user.courseProgress.set !== "function"
    ) {
      user.courseProgress = new Map();
    }

    // Save progress
    user.courseProgress.set(courseName, courseData);

    user.markModified("courseProgress");

    // Calculate overall progress
    let totalProgress = 0;
    let courseCount = 0;

    user.courseProgress.forEach((data) => {
      totalProgress += Number(data.progress || 0);
      courseCount++;
    });

    if (courseCount > 0) {
      user.learningProgress = Math.round(
        totalProgress / courseCount
      );
    }

    // Save to MongoDB
    await user.save();

    return res.json({
      message: "Course progress updated successfully",
      course: courseName,
      progress: courseData.progress,
      completedLessons: courseData.completedLessons,
      lastLesson: courseData.lastLesson,
      overallProgress: user.learningProgress,
      courseProgress: user.courseProgress
    });

  } catch (error) {
    console.error("Course progress update error:", error);

    return res.status(500).json({
      message: "Server error"
    });
  }
};

// Support both POST and PUT requests
app.put("/api/progress", updateCourseProgress);
app.post("/api/progress", updateCourseProgress);
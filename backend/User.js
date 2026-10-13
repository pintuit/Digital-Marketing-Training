const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      default: "user"
    },

    // Overall learning progress
    learningProgress: {
      type: Number,
      default: 0
    },

    // Course-wise learning progress
    courseProgress: {
      type: Map,
      of: {
        progress: {
          type: Number,
          default: 0
        },

        completedLessons: {
          type: [Number],
          default: []
        },

        lastLesson: {
          type: Number,
          default: 0
        }
      },
      default: {}
    },

    // ==========================================
    // CERTIFICATES
    // ==========================================

    certificates: {
      type: [
        {
          course: {
            type: String,
            required: true
          },

          certificateId: {
            type: String,
            required: true
          },

          issuedAt: {
            type: Date,
            default: Date.now
          },

          status: {
            type: String,
            default: "valid"
          }
        }
      ],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
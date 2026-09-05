const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    uniqueId: {
      type: String,
      required: [true, "Unique ID is required"],
      trim: true,
      uppercase: true,
    },

    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },

    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },

    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      select: false,
    },

    role: {
      type: String,
      enum: [
        "EMPLOYEE",
        "HR_MANAGER",
        "HR_PAYROLL_USER",
        "HR_PAYROLL_MANAGER",
        "ADMIN",
      ],
      default: "EMPLOYEE",
      required: true,
    },

    accountStatus: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    mustChangePassword: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

userSchema.index({ uniqueId: 1 }, { unique: true });

userSchema.index({ email: 1 }, { unique: true });

userSchema.index(
  { employee: 1 },
  {
    unique: true,
    sparse: true,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    bedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bed",
      required: true,
      index: true,
    },
    joiningDate: {
      type: String,
      required: true,
      trim: true,
    },
    checkoutDate: {
      type: String,
      default: null,
    },
    monthlyRent: {
      type: Number,
      required: true,
      min: 0,
    },
    securityDeposit: {
      type: Number,
      default: 0,
      min: 0,
    },
    emergencyContact: {
      type: String,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    tenantStatus: {
      type: String,
      enum: ["Active", "CheckedOut"],
      default: "Active",
      index: true,
    },
    rentDueDay: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

tenantSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { tenantStatus: "Active" } }
);

const Tenant = mongoose.model("Tenant", tenantSchema);

export default Tenant;

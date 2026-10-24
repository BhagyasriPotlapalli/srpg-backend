import mongoose from "mongoose";

const bedSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    bedNumber: {
      type: String,
      required: true,
      trim: true,
    },
    bedType: {
      type: String,
      default: "Single",
      trim: true,
    },
    monthlyRent: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Available", "Occupied"],
      default: "Available",
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

bedSchema.index({ roomId: 1, bedNumber: 1 }, { unique: true });

const Bed = mongoose.model("Bed", bedSchema);

export default Bed;

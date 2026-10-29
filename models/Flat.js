import mongoose from "mongoose";

const flatSchema = new mongoose.Schema(
  {
    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Floor",
      required: true,
      index: true,
    },
    flatNumber: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

flatSchema.index({ floorId: 1, flatNumber: 1 }, { unique: true });

const Flat = mongoose.model("Flat", flatSchema);

export default Flat;

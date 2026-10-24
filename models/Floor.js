import mongoose from "mongoose";

const floorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    floorNumber: {
      type: Number,
      required: true,
      unique: true,
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

const Floor = mongoose.model("Floor", floorSchema);

export default Floor;

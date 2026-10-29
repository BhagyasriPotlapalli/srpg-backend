import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Floor",
      required: true,
      index: true,
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      default: null,
      index: true,
    },
    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
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

roomSchema.index({ floorId: 1, roomNumber: 1 }, { unique: true });

const Room = mongoose.model("Room", roomSchema);

export default Room;

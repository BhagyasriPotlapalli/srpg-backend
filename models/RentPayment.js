import mongoose from "mongoose";

const rentPaymentSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    month: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}$/,
      index: true,
    },
    rentAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentDate: {
      type: String,
      required: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "BankTransfer", "Card", "Other"],
      required: true,
    },
    transactionReference: {
      type: String,
      default: "",
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Partial", "Unpaid"],
      default: "Paid",
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const RentPayment = mongoose.model("RentPayment", rentPaymentSchema);

export default RentPayment;

import mongoose from "mongoose";
import RentPayment from "../models/RentPayment.js";
import Tenant from "../models/Tenant.js";
import Room from "../models/Room.js";
import Bed from "../models/Bed.js";
import {
  getCurrentMonthString,
  calculateRentDueDate,
  computeRentStatus,
} from "../utils/dateUtils.js";
import { successResponse, errorResponse } from "../utils/responseUtils.js";

const VALID_PAYMENT_METHODS = ["Cash", "UPI", "BankTransfer", "Card", "Other"];

/**
 * POST /api/rent-payments
 * Record rent payment
 */
export const recordPayment = async (req, res, next) => {
  try {
    const {
      tenantId,
      month,
      amountPaid,
      paymentDate,
      paymentMethod,
      transactionReference,
      notes,
      idempotencyKey,
    } = req.body;

    const parsedAmount = Number(amountPaid);

    if (
      !tenantId ||
      !month ||
      !/^\d{4}-\d{2}$/.test(month) ||
      isNaN(parsedAmount) ||
      parsedAmount <= 0 ||
      !paymentDate ||
      !paymentMethod ||
      !VALID_PAYMENT_METHODS.includes(paymentMethod)
    ) {
      return errorResponse(
        res,
        400,
        "Tenant ID, month, valid amount, payment date, and payment method are required"
      );
    }

    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return errorResponse(res, 404, "Tenant not found");
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return errorResponse(res, 404, "Tenant not found");
    }

    // Check duplicate request via idempotencyKey
    if (idempotencyKey && idempotencyKey.trim()) {
      const existingPayment = await RentPayment.findOne({
        idempotencyKey: idempotencyKey.trim(),
      });
      if (existingPayment) {
        return errorResponse(
          res,
          409,
          "This payment request has already been processed"
        );
      }
    }

    // Check duplicate payment via unique transactionReference if provided
    if (transactionReference && transactionReference.trim()) {
      const existingTx = await RentPayment.findOne({
        transactionReference: transactionReference.trim(),
      });
      if (existingTx) {
        return errorResponse(
          res,
          409,
          "This payment request has already been processed"
        );
      }
    }

    // Rent calculations
    const rentAmount = tenant.monthlyRent || 0;
    const existingPayments = await RentPayment.find({
      tenantId: tenant._id,
      month,
    });
    const totalPaidSoFar = existingPayments.reduce(
      (sum, p) => sum + p.amountPaid,
      0
    );

    if (totalPaidSoFar + parsedAmount > rentAmount) {
      return errorResponse(
        res,
        400,
        "Payment amount exceeds outstanding balance"
      );
    }

    const totalPaidForMonth = totalPaidSoFar + parsedAmount;
    const outstandingAmount = Math.max(0, rentAmount - totalPaidForMonth);
    const paymentStatus = outstandingAmount === 0 ? "Paid" : "Partial";

    const payment = await RentPayment.create({
      tenantId: tenant._id,
      month,
      rentAmount,
      amountPaid: parsedAmount,
      paymentDate,
      paymentMethod,
      transactionReference: transactionReference ? transactionReference.trim() : "",
      paymentStatus,
      notes: notes ? notes.trim() : "",
      recordedBy: req.user._id,
      idempotencyKey: idempotencyKey ? idempotencyKey.trim() : undefined,
    });

    const room = await Room.findById(tenant.roomId);
    const bed = await Bed.findById(tenant.bedId);

    return res.status(201).json({
      status: "success",
      message: "Rent payment recorded successfully",
      data: {
        payment: {
          id: payment._id.toString(),
          tenantId: tenant._id.toString(),
          tenantName: tenant.fullName,
          roomNumber: room ? room.roomNumber : "",
          bedNumber: bed ? bed.bedNumber : "",
          month: payment.month,
          rentAmount: payment.rentAmount,
          amountPaid: payment.amountPaid,
          totalPaidForMonth,
          outstandingAmount,
          paymentDate: payment.paymentDate,
          paymentMethod: payment.paymentMethod,
          transactionReference: payment.transactionReference,
          paymentStatus: payment.paymentStatus,
          notes: payment.notes,
          recordedBy: req.user._id.toString(),
          createdAt: payment.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/rent-payments
 * Retrieve rent payment history with filters and pagination
 */
export const getPayments = async (req, res, next) => {
  try {
    const {
      tenantId,
      month,
      paymentMethod,
      paymentDateFrom,
      paymentDateTo,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
      query.tenantId = tenantId;
    }

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      query.month = month;
    }

    if (paymentMethod && VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      query.paymentMethod = paymentMethod;
    }

    if (paymentDateFrom || paymentDateTo) {
      query.paymentDate = {};
      if (paymentDateFrom) query.paymentDate.$gte = paymentDateFrom;
      if (paymentDateTo) query.paymentDate.$lte = paymentDateTo;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    const totalRecords = await RentPayment.countDocuments(query);
    const payments = await RentPayment.find(query)
      .populate({
        path: "tenantId",
        select: "fullName roomId bedId",
        populate: [
          { path: "roomId", select: "roomNumber" },
          { path: "bedId", select: "bedNumber" },
        ],
      })
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const paymentItems = payments.map((p) => {
      const tenant = p.tenantId;
      const room = tenant?.roomId;
      const bed = tenant?.bedId;

      return {
        id: p._id.toString(),
        tenantId: tenant ? tenant._id.toString() : p.tenantId.toString(),
        tenantName: tenant ? tenant.fullName : "",
        roomNumber: room ? room.roomNumber : "",
        bedNumber: bed ? bed.bedNumber : "",
        month: p.month,
        rentAmount: p.rentAmount,
        amountPaid: p.amountPaid,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        paymentStatus: p.paymentStatus,
        recordedBy: p.recordedBy.toString(),
      };
    });

    return successResponse(
      res,
      200,
      "Rent payment history retrieved successfully",
      {
        payments: paymentItems,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limitNum) || 1,
        },
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/rent-payments/summary/:tenantId
 * Rent summary for tenant for a month
 */
export const getRentSummary = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const month = req.query.month || getCurrentMonthString();

    if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId)) {
      return errorResponse(res, 404, "Tenant not found");
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return errorResponse(res, 404, "Tenant not found");
    }

    const payments = await RentPayment.find({
      tenantId: tenant._id,
      month,
    }).sort({ paymentDate: 1, createdAt: 1 });

    const rentAmount = tenant.monthlyRent || 0;
    const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
    const outstandingAmount = Math.max(0, rentAmount - totalPaid);
    const rentDueDate = calculateRentDueDate(month, tenant);
    const statusObj = computeRentStatus({
      rentAmount,
      totalPaid,
      rentDueDate,
    });

    const paymentItems = payments.map((p) => ({
      paymentId: p._id.toString(),
      amountPaid: p.amountPaid,
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
    }));

    return successResponse(
      res,
      200,
      "Tenant rent summary retrieved successfully",
      {
        tenantId: tenant._id.toString(),
        tenantName: tenant.fullName,
        month,
        rentAmount,
        totalPaid,
        outstandingAmount,
        rentDueDate,
        paymentStatus: statusObj.paymentStatus,
        dueStatus: statusObj.dueStatus,
        payments: paymentItems,
      }
    );
  } catch (error) {
    next(error);
  }
};

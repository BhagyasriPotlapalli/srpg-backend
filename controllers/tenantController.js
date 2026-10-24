import mongoose from "mongoose";
import Tenant from "../models/Tenant.js";
import Room from "../models/Room.js";
import Bed from "../models/Bed.js";
import Floor from "../models/Floor.js";
import RentPayment from "../models/RentPayment.js";
import {
  getCurrentMonthString,
  getTodayDateString,
  calculateRentDueDate,
  computeRentStatus,
} from "../utils/dateUtils.js";
import { successResponse, errorResponse } from "../utils/responseUtils.js";

/**
 * GET /api/tenants
 * Retrieve tenants, rent calculations, history & filtering
 */
export const getTenants = async (req, res, next) => {
  try {
    const {
      roomId,
      floorId,
      bedId,
      tenantStatus,
      rentStatus,
      joiningDateFrom,
      joiningDateTo,
      checkoutDateFrom,
      checkoutDateTo,
      dueDateFrom,
      dueDateTo,
      paymentDateFrom,
      paymentDateTo,
      month = getCurrentMonthString(),
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    if (tenantStatus && ["Active", "CheckedOut"].includes(tenantStatus)) {
      query.tenantStatus = tenantStatus;
    }

    if (bedId && mongoose.Types.ObjectId.isValid(bedId)) {
      query.bedId = bedId;
    }

    if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
      query.roomId = roomId;
    } else if (floorId && mongoose.Types.ObjectId.isValid(floorId)) {
      const roomsOnFloor = await Room.find({ floorId }).select("_id");
      query.roomId = { $in: roomsOnFloor.map((r) => r._id) };
    }

    if (joiningDateFrom || joiningDateTo) {
      query.joiningDate = {};
      if (joiningDateFrom) query.joiningDate.$gte = joiningDateFrom;
      if (joiningDateTo) query.joiningDate.$lte = joiningDateTo;
    }

    if (checkoutDateFrom || checkoutDateTo) {
      query.checkoutDate = {};
      if (checkoutDateFrom) query.checkoutDate.$gte = checkoutDateFrom;
      if (checkoutDateTo) query.checkoutDate.$lte = checkoutDateTo;
    }

    // Populate all tenants that match base database query
    let tenants = await Tenant.find(query)
      .populate({
        path: "roomId",
        select: "roomNumber floorId",
        populate: {
          path: "floorId",
          select: "name",
        },
      })
      .populate("bedId", "bedNumber")
      .lean();

    // Attach rent details & evaluate rent-level and search-level filters
    const enriched = [];

    for (const t of tenants) {
      const room = t.roomId;
      const floor = room?.floorId;
      const bed = t.bedId;

      // Filter by search string if present (name, phone, email, roomNumber, bedNumber)
      if (search) {
        const term = search.toLowerCase().trim();
        const matchesName = t.fullName?.toLowerCase().includes(term);
        const matchesPhone = t.phone?.toLowerCase().includes(term);
        const matchesEmail = t.email?.toLowerCase().includes(term);
        const matchesRoom = room?.roomNumber?.toLowerCase().includes(term);
        const matchesBed = bed?.bedNumber?.toLowerCase().includes(term);

        if (!matchesName && !matchesPhone && !matchesEmail && !matchesRoom && !matchesBed) {
          continue;
        }
      }

      // Rent payments for this tenant and this month
      const payments = await RentPayment.find({
        tenantId: t._id,
        month,
      }).sort({ paymentDate: 1, createdAt: 1 });

      const rentAmount = t.monthlyRent || 0;
      const amountPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
      const outstandingAmount = Math.max(0, rentAmount - amountPaid);
      const lastPaymentDate =
        payments.length > 0 ? payments[payments.length - 1].paymentDate : null;

      const rentDueDate = calculateRentDueDate(month, t);
      const statusCalculations = computeRentStatus({
        rentAmount,
        totalPaid: amountPaid,
        rentDueDate,
      });

      // Filter by rentStatus if provided
      if (rentStatus) {
        if (rentStatus === "Paid" && amountPaid < rentAmount) continue;
        if (rentStatus === "Partial" && (amountPaid === 0 || amountPaid >= rentAmount)) continue;
        if (rentStatus === "Unpaid" && amountPaid > 0) continue;
        if (rentStatus === "DueToday" && (amountPaid >= rentAmount || rentDueDate !== getTodayDateString())) continue;
        if (rentStatus === "Overdue" && (amountPaid >= rentAmount || rentDueDate >= getTodayDateString())) continue;
        if (rentStatus === "Upcoming" && (amountPaid >= rentAmount || rentDueDate <= getTodayDateString())) continue;
      }

      // Filter by rent due date range
      if (dueDateFrom && rentDueDate < dueDateFrom) continue;
      if (dueDateTo && rentDueDate > dueDateTo) continue;

      // Filter by payment date range
      if (paymentDateFrom || paymentDateTo) {
        const hasPaymentInRange = payments.some((p) => {
          if (paymentDateFrom && p.paymentDate < paymentDateFrom) return false;
          if (paymentDateTo && p.paymentDate > paymentDateTo) return false;
          return true;
        });
        if (!hasPaymentInRange) continue;
      }

      enriched.push({
        id: t._id.toString(),
        fullName: t.fullName,
        phone: t.phone,
        email: t.email || "",
        address: t.address || "",
        room: room
          ? {
              id: room._id.toString(),
              roomNumber: room.roomNumber,
            }
          : null,
        floor: floor
          ? {
              id: floor._id.toString(),
              name: floor.name,
            }
          : null,
        bed: bed
          ? {
              id: bed._id.toString(),
              bedNumber: bed.bedNumber,
            }
          : null,
        joiningDate: t.joiningDate,
        checkoutDate: t.checkoutDate || null,
        monthlyRent: t.monthlyRent,
        securityDeposit: t.securityDeposit || 0,
        tenantStatus: t.tenantStatus,
        rent: {
          currentMonth: month,
          rentAmount,
          rentDueDate,
          rentStatus: statusCalculations.rentStatus,
          paymentStatus: statusCalculations.paymentStatus,
          dueStatus: statusCalculations.dueStatus,
          amountPaid,
          outstandingAmount,
          lastPaymentDate,
        },
        createdAt: t.createdAt,
      });
    }

    // Sort enriched records
    const order = sortOrder === "asc" ? 1 : -1;
    enriched.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (valA === undefined) valA = "";
      if (valB === undefined) valB = "";

      if (valA < valB) return -1 * order;
      if (valA > valB) return 1 * order;
      return 0;
    });

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const totalRecords = enriched.length;
    const totalPages = Math.ceil(totalRecords / limitNum) || 1;
    const paginatedItems = enriched.slice(
      (pageNum - 1) * limitNum,
      pageNum * limitNum
    );

    return successResponse(res, 200, "Tenant records retrieved successfully", {
      count: paginatedItems.length,
      tenants: paginatedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalRecords,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tenants/filter-options
 * Dropdown options for filtering
 */
export const getFilterOptions = async (req, res, next) => {
  try {
    const floors = await Floor.find().sort({ floorNumber: 1 });
    const rooms = await Room.find().sort({ roomNumber: 1 });
    const beds = await Bed.find().sort({ bedNumber: 1 });

    return successResponse(res, 200, "Filter options retrieved successfully", {
      floors: floors.map((f) => ({
        id: f._id.toString(),
        name: f.name,
      })),
      rooms: rooms.map((r) => ({
        id: r._id.toString(),
        roomNumber: r.roomNumber,
        floorId: r.floorId.toString(),
      })),
      beds: beds.map((b) => ({
        id: b._id.toString(),
        bedNumber: b.bedNumber,
        roomId: b.roomId.toString(),
      })),
      tenantStatuses: ["Active", "CheckedOut"],
      rentStatuses: [
        "Paid",
        "DueToday",
        "Upcoming",
        "Overdue",
        "Partial",
        "Unpaid",
      ],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/tenants/:id
 * Update tenant details, room/bed assignment, status, or rent
 */
export const updateTenant = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 404, "Tenant not found");
    }

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return errorResponse(res, 404, "Tenant not found");
    }

    const {
      fullName,
      phone,
      email,
      address,
      roomId,
      bedId,
      joiningDate,
      checkoutDate,
      monthlyRent,
      securityDeposit,
      emergencyContact,
      notes,
      tenantStatus,
    } = req.body;

    // Validate phone uniqueness for active tenants
    if (phone && phone.trim() !== tenant.phone) {
      const existing = await Tenant.findOne({
        phone: phone.trim(),
        tenantStatus: "Active",
        _id: { $ne: tenant._id },
      });
      if (existing) {
        return errorResponse(
          res,
          409,
          "Phone number is already associated with another active tenant"
        );
      }
      tenant.phone = phone.trim();
    }

    // Change room or bed
    if (bedId && bedId.toString() !== tenant.bedId.toString()) {
      if (!mongoose.Types.ObjectId.isValid(bedId)) {
        return errorResponse(res, 404, "Selected room or bed not found");
      }

      const targetRoomId = roomId || tenant.roomId;
      if (!mongoose.Types.ObjectId.isValid(targetRoomId)) {
        return errorResponse(res, 404, "Selected room or bed not found");
      }

      const newRoom = await Room.findById(targetRoomId);
      const newBed = await Bed.findById(bedId);

      if (!newRoom || !newBed || newBed.roomId.toString() !== newRoom._id.toString()) {
        return errorResponse(res, 404, "Selected room or bed not found");
      }

      if (newBed.status === "Occupied" && newBed.tenantId?.toString() !== tenant._id.toString()) {
        return errorResponse(res, 409, "Selected bed is already occupied");
      }

      // Free previous bed
      await Bed.findByIdAndUpdate(tenant.bedId, {
        status: "Available",
        tenantId: null,
      });

      // Occupy new bed
      newBed.status = "Occupied";
      newBed.tenantId = tenant._id;
      await newBed.save();

      tenant.roomId = newRoom._id;
      tenant.bedId = newBed._id;
    } else if (roomId && roomId.toString() !== tenant.roomId.toString()) {
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return errorResponse(res, 404, "Selected room or bed not found");
      }
      const room = await Room.findById(roomId);
      if (!room) {
        return errorResponse(res, 404, "Selected room or bed not found");
      }
      tenant.roomId = room._id;
    }

    // Update status
    if (tenantStatus && ["Active", "CheckedOut"].includes(tenantStatus)) {
      if (tenantStatus === "CheckedOut" && tenant.tenantStatus !== "CheckedOut") {
        // Release bed
        await Bed.findByIdAndUpdate(tenant.bedId, {
          status: "Available",
          tenantId: null,
        });
        tenant.tenantStatus = "CheckedOut";
        tenant.checkoutDate = checkoutDate || getTodayDateString();
      } else if (tenantStatus === "Active" && tenant.tenantStatus === "CheckedOut") {
        // Check if bed is available
        const currentBed = await Bed.findById(tenant.bedId);
        if (currentBed && currentBed.status === "Occupied" && currentBed.tenantId?.toString() !== tenant._id.toString()) {
          return errorResponse(res, 409, "Selected bed is already occupied");
        }
        if (currentBed) {
          currentBed.status = "Occupied";
          currentBed.tenantId = tenant._id;
          await currentBed.save();
        }
        tenant.tenantStatus = "Active";
        tenant.checkoutDate = null;
      }
    }

    if (checkoutDate !== undefined) tenant.checkoutDate = checkoutDate;
    if (fullName !== undefined) tenant.fullName = fullName.trim();
    if (email !== undefined) tenant.email = email.trim();
    if (address !== undefined) tenant.address = address.trim();
    if (joiningDate !== undefined) tenant.joiningDate = joiningDate.trim();
    if (monthlyRent !== undefined) tenant.monthlyRent = Number(monthlyRent);
    if (securityDeposit !== undefined) tenant.securityDeposit = Number(securityDeposit);
    if (emergencyContact !== undefined) tenant.emergencyContact = emergencyContact.trim();
    if (notes !== undefined) tenant.notes = notes.trim();

    await tenant.save();

    return successResponse(res, 200, "Tenant updated successfully", {
      id: tenant._id.toString(),
      fullName: tenant.fullName,
      phone: tenant.phone,
      email: tenant.email,
      address: tenant.address,
      roomId: tenant.roomId.toString(),
      bedId: tenant.bedId.toString(),
      joiningDate: tenant.joiningDate,
      checkoutDate: tenant.checkoutDate,
      monthlyRent: tenant.monthlyRent,
      securityDeposit: tenant.securityDeposit,
      emergencyContact: tenant.emergencyContact,
      notes: tenant.notes,
      tenantStatus: tenant.tenantStatus,
      updatedAt: tenant.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

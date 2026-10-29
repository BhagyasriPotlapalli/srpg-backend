import mongoose from "mongoose";
import Floor from "../models/Floor.js";
import Flat from "../models/Flat.js";
import Room from "../models/Room.js";
import Bed from "../models/Bed.js";
import Tenant from "../models/Tenant.js";
import { successResponse, errorResponse } from "../utils/responseUtils.js";

/**
 * POST /api/management/create
 * Creates floor, flat, room, bed, or tenant
 */
export const createResource = async (req, res, next) => {
  try {
    const { type } = req.body;

    if (!type || !["floor", "flat", "room", "bed", "tenant"].includes(type)) {
      return errorResponse(
        res,
        400,
        "Invalid type. Allowed values: floor, flat, room, bed, tenant"
      );
    }

    // 1. FLOOR
    if (type === "floor") {
      const { name, floorNumber, description } = req.body;

      if (!name || floorNumber === undefined || floorNumber === null || isNaN(Number(floorNumber))) {
        return errorResponse(res, 400, "Required fields are missing");
      }

      const existing = await Floor.findOne({ floorNumber: Number(floorNumber) });
      if (existing) {
        return errorResponse(res, 409, "A resource with these details already exists");
      }

      const floor = await Floor.create({
        name: name.trim(),
        floorNumber: Number(floorNumber),
        description: description ? description.trim() : "",
      });

      return res.status(201).json({
        status: "success",
        message: "Floor created successfully",
        data: {
          id: floor._id.toString(),
          type: "floor",
          name: floor.name,
          floorNumber: floor.floorNumber,
          description: floor.description,
          createdAt: floor.createdAt,
        },
      });
    }

    // 2. FLAT
    if (type === "flat") {
      const { floorId, flatNumber, name, description } = req.body;

      if (!floorId || !flatNumber) {
        return errorResponse(res, 400, "Floor ID and Flat Number are required");
      }

      if (!mongoose.Types.ObjectId.isValid(floorId)) {
        return errorResponse(res, 404, "Referenced floor not found");
      }

      const floor = await Floor.findById(floorId);
      if (!floor) {
        return errorResponse(res, 404, "Referenced floor not found");
      }

      const existingFlat = await Flat.findOne({
        floorId,
        flatNumber: String(flatNumber).trim(),
      });
      if (existingFlat) {
        return errorResponse(res, 409, "A flat with this number already exists on this floor");
      }

      const flat = await Flat.create({
        floorId,
        flatNumber: String(flatNumber).trim(),
        name: name ? String(name).trim() : String(flatNumber).trim(),
        description: description ? description.trim() : "",
      });

      return res.status(201).json({
        status: "success",
        message: "Flat created successfully",
        data: {
          id: flat._id.toString(),
          type: "flat",
          floorId: flat.floorId.toString(),
          flatNumber: flat.flatNumber,
          name: flat.name,
          description: flat.description,
          createdAt: flat.createdAt,
        },
      });
    }

    // 3. ROOM
    if (type === "room") {
      const { floorId, flatId, roomNumber, capacity, description } = req.body;

      let effectiveFloorId = floorId;

      if (flatId) {
        if (!mongoose.Types.ObjectId.isValid(flatId)) {
          return errorResponse(res, 404, "Referenced flat not found");
        }
        const flat = await Flat.findById(flatId);
        if (!flat) {
          return errorResponse(res, 404, "Referenced flat not found");
        }
        if (!effectiveFloorId) {
          effectiveFloorId = flat.floorId;
        }
      }

      if (!effectiveFloorId || !roomNumber || capacity === undefined || capacity === null || isNaN(Number(capacity))) {
        return errorResponse(res, 400, "Required fields are missing");
      }

      if (!mongoose.Types.ObjectId.isValid(effectiveFloorId)) {
        return errorResponse(res, 404, "Referenced floor or flat not found");
      }

      const floor = await Floor.findById(effectiveFloorId);
      if (!floor) {
        return errorResponse(res, 404, "Referenced floor or flat not found");
      }

      const existingRoom = await Room.findOne({
        floorId: effectiveFloorId,
        roomNumber: String(roomNumber).trim(),
      });
      if (existingRoom) {
        return errorResponse(res, 409, "A resource with these details already exists");
      }

      const room = await Room.create({
        floorId: effectiveFloorId,
        flatId: flatId ? new mongoose.Types.ObjectId(flatId) : null,
        roomNumber: String(roomNumber).trim(),
        capacity: Number(capacity),
        description: description ? description.trim() : "",
      });

      return res.status(201).json({
        status: "success",
        message: "Room created successfully",
        data: {
          id: room._id.toString(),
          type: "room",
          floorId: room.floorId.toString(),
          flatId: room.flatId ? room.flatId.toString() : null,
          roomNumber: room.roomNumber,
          capacity: room.capacity,
          description: room.description,
          createdAt: room.createdAt,
        },
      });
    }

    // 4. BED
    if (type === "bed") {
      const { roomId, bedNumber, bedType, monthlyRent, status } = req.body;

      if (!roomId || !bedNumber || monthlyRent === undefined || monthlyRent === null || isNaN(Number(monthlyRent))) {
        return errorResponse(res, 400, "Required fields are missing");
      }

      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return errorResponse(res, 404, "Referenced room not found");
      }

      const room = await Room.findById(roomId);
      if (!room) {
        return errorResponse(res, 404, "Referenced room not found");
      }

      const existingBed = await Bed.findOne({
        roomId,
        bedNumber: String(bedNumber).trim(),
      });
      if (existingBed) {
        return errorResponse(res, 409, "A resource with these details already exists");
      }

      const bedCount = await Bed.countDocuments({ roomId });
      if (bedCount >= room.capacity) {
        return errorResponse(
          res,
          409,
          "Room capacity reached. Cannot add more beds."
        );
      }

      const bed = await Bed.create({
        roomId,
        bedNumber: String(bedNumber).trim(),
        bedType: bedType ? bedType.trim() : "Single",
        monthlyRent: Number(monthlyRent),
        status: status && ["Available", "Occupied"].includes(status) ? status : "Available",
      });

      return res.status(201).json({
        status: "success",
        message: "Bed created successfully",
        data: {
          id: bed._id.toString(),
          type: "bed",
          roomId: bed.roomId.toString(),
          bedNumber: bed.bedNumber,
          bedType: bed.bedType,
          monthlyRent: bed.monthlyRent,
          status: bed.status,
          createdAt: bed.createdAt,
        },
      });
    }

    // 5. TENANT
    if (type === "tenant") {
      const {
        fullName,
        phone,
        email,
        address,
        roomId,
        bedId,
        joiningDate,
        monthlyRent,
        securityDeposit,
        emergencyContact,
        notes,
      } = req.body;

      if (
        !fullName ||
        !phone ||
        !roomId ||
        !bedId ||
        !joiningDate ||
        monthlyRent === undefined ||
        monthlyRent === null
      ) {
        return errorResponse(
          res,
          400,
          "Full name, phone, room ID, bed ID, joining date, and monthly rent are required"
        );
      }

      if (
        !mongoose.Types.ObjectId.isValid(roomId) ||
        !mongoose.Types.ObjectId.isValid(bedId)
      ) {
        return errorResponse(res, 404, "Selected room or bed not found");
      }

      const room = await Room.findById(roomId);
      const bed = await Bed.findById(bedId);

      if (!room || !bed || bed.roomId.toString() !== room._id.toString()) {
        return errorResponse(res, 404, "Selected room or bed not found");
      }

      if (bed.status === "Occupied") {
        return errorResponse(res, 409, "This bed is already occupied");
      }

      const existingActiveTenant = await Tenant.findOne({
        phone: String(phone).trim(),
        tenantStatus: "Active",
      });
      if (existingActiveTenant) {
        return errorResponse(
          res,
          409,
          "This phone number already belongs to an active tenant"
        );
      }

      const tenant = await Tenant.create({
        fullName: fullName.trim(),
        phone: String(phone).trim(),
        email: email ? email.trim() : "",
        address: address ? address.trim() : "",
        roomId: room._id,
        bedId: bed._id,
        joiningDate,
        monthlyRent: Number(monthlyRent),
        securityDeposit: securityDeposit !== undefined ? Number(securityDeposit) : 0,
        emergencyContact: emergencyContact ? emergencyContact.trim() : "",
        notes: notes ? notes.trim() : "",
        tenantStatus: "Active",
      });

      bed.status = "Occupied";
      bed.tenantId = tenant._id;
      await bed.save();

      return res.status(201).json({
        status: "success",
        message: "Tenant created successfully",
        data: {
          id: tenant._id.toString(),
          type: "tenant",
          fullName: tenant.fullName,
          phone: tenant.phone,
          email: tenant.email,
          address: tenant.address,
          roomId: tenant.roomId.toString(),
          bedId: tenant.bedId.toString(),
          joiningDate: tenant.joiningDate,
          monthlyRent: tenant.monthlyRent,
          securityDeposit: tenant.securityDeposit,
          emergencyContact: tenant.emergencyContact,
          notes: tenant.notes,
          status: tenant.tenantStatus,
          createdAt: tenant.createdAt,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/management?type=floor|flat|room|bed
 */
export const getResources = async (req, res, next) => {
  try {
    const type = req.query.type || "floor";

    if (!["floor", "flat", "room", "bed"].includes(type)) {
      return errorResponse(
        res,
        400,
        "Invalid type. Allowed values: floor, flat, room, bed"
      );
    }

    // 1. FLOORS
    if (type === "floor") {
      const floors = await Floor.find().sort({ floorNumber: 1 });

      const items = await Promise.all(
        floors.map(async (f) => {
          const flatCount = await Flat.countDocuments({ floorId: f._id });
          const roomCount = await Room.countDocuments({ floorId: f._id });
          const rooms = await Room.find({ floorId: f._id }).select("_id");
          const roomIds = rooms.map((r) => r._id);
          const bedCount = await Bed.countDocuments({ roomId: { $in: roomIds } });

          return {
            id: f._id.toString(),
            name: f.name,
            floorNumber: f.floorNumber,
            description: f.description,
            flatCount,
            roomCount,
            bedCount,
            createdAt: f.createdAt,
          };
        })
      );

      return successResponse(res, 200, "Floors retrieved successfully", {
        type: "floor",
        count: items.length,
        items,
      });
    }

    // 2. FLATS
    if (type === "flat") {
      const { floorId } = req.query;
      const filter = {};
      if (floorId) {
        if (!mongoose.Types.ObjectId.isValid(floorId)) {
          return successResponse(res, 200, "Flats retrieved successfully", {
            type: "flat",
            count: 0,
            items: [],
          });
        }
        filter.floorId = floorId;
      }

      const flats = await Flat.find(filter).sort({ flatNumber: 1 });

      const items = await Promise.all(
        flats.map(async (f) => {
          const roomCount = await Room.countDocuments({ flatId: f._id });
          const rooms = await Room.find({ flatId: f._id }).select("_id");
          const roomIds = rooms.map((r) => r._id);
          const bedCount = await Bed.countDocuments({ roomId: { $in: roomIds } });

          return {
            id: f._id.toString(),
            floorId: f.floorId.toString(),
            flatNumber: f.flatNumber,
            name: f.name || f.flatNumber,
            description: f.description,
            roomCount,
            bedCount,
            createdAt: f.createdAt,
          };
        })
      );

      return successResponse(res, 200, "Flats retrieved successfully", {
        type: "flat",
        count: items.length,
        items,
      });
    }

    // 3. ROOMS
    if (type === "room") {
      const { floorId, flatId } = req.query;
      const filter = {};
      if (flatId) {
        if (!mongoose.Types.ObjectId.isValid(flatId)) {
          return successResponse(res, 200, "Rooms retrieved successfully", {
            type: "room",
            count: 0,
            items: [],
          });
        }
        filter.flatId = flatId;
      } else if (floorId) {
        if (!mongoose.Types.ObjectId.isValid(floorId)) {
          return successResponse(res, 200, "Rooms retrieved successfully", {
            type: "room",
            count: 0,
            items: [],
          });
        }
        filter.floorId = floorId;
      }

      const rooms = await Room.find(filter).sort({ roomNumber: 1 });

      // Cache flats for lookup
      const flats = await Flat.find().select("_id flatNumber name");
      const flatMap = {};
      flats.forEach((fl) => {
        flatMap[fl._id.toString()] = fl.flatNumber || fl.name;
      });

      const items = await Promise.all(
        rooms.map(async (r) => {
          const bedCount = await Bed.countDocuments({ roomId: r._id });
          const occupiedBeds = await Bed.countDocuments({
            roomId: r._id,
            status: "Occupied",
          });
          const availableBeds = await Bed.countDocuments({
            roomId: r._id,
            status: "Available",
          });

          const flatIdStr = r.flatId ? r.flatId.toString() : null;
          const flatNumber = flatIdStr ? flatMap[flatIdStr] || "" : "";

          return {
            id: r._id.toString(),
            floorId: r.floorId.toString(),
            flatId: flatIdStr,
            flatNumber,
            roomNumber: r.roomNumber,
            capacity: r.capacity,
            bedCount,
            occupiedBeds,
            availableBeds,
            description: r.description,
            createdAt: r.createdAt,
          };
        })
      );

      return successResponse(res, 200, "Rooms retrieved successfully", {
        type: "room",
        count: items.length,
        items,
      });
    }

    // 4. BEDS
    if (type === "bed") {
      const { roomId, floorId, flatId } = req.query;
      const filter = {};

      if (roomId) {
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
          return successResponse(res, 200, "Beds retrieved successfully", {
            type: "bed",
            count: 0,
            items: [],
          });
        }
        filter.roomId = roomId;
      } else if (flatId) {
        if (!mongoose.Types.ObjectId.isValid(flatId)) {
          return successResponse(res, 200, "Beds retrieved successfully", {
            type: "bed",
            count: 0,
            items: [],
          });
        }
        const rooms = await Room.find({ flatId }).select("_id");
        filter.roomId = { $in: rooms.map((r) => r._id) };
      } else if (floorId) {
        if (!mongoose.Types.ObjectId.isValid(floorId)) {
          return successResponse(res, 200, "Beds retrieved successfully", {
            type: "bed",
            count: 0,
            items: [],
          });
        }
        const rooms = await Room.find({ floorId }).select("_id");
        filter.roomId = { $in: rooms.map((r) => r._id) };
      }

      const beds = await Bed.find(filter).sort({ bedNumber: 1 });

      const items = beds.map((b) => ({
        id: b._id.toString(),
        roomId: b.roomId.toString(),
        bedNumber: b.bedNumber,
        bedType: b.bedType,
        monthlyRent: b.monthlyRent,
        status: b.status,
        tenantId: b.tenantId ? b.tenantId.toString() : null,
        createdAt: b.createdAt,
      }));

      return successResponse(res, 200, "Beds retrieved successfully", {
        type: "bed",
        count: items.length,
        items,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/management/:id?type=floor|flat|room|bed
 */
export const updateResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 404, "Resource not found");
    }

    if (!type || !["floor", "flat", "room", "bed"].includes(type)) {
      return errorResponse(res, 400, "Invalid request data");
    }

    // 1. FLOOR
    if (type === "floor") {
      const floor = await Floor.findById(id);
      if (!floor) {
        return errorResponse(res, 404, "Floor not found");
      }

      const { name, floorNumber, description } = req.body;

      if (floorNumber !== undefined && floorNumber !== null) {
        const num = Number(floorNumber);
        if (isNaN(num)) {
          return errorResponse(res, 400, "Invalid request data");
        }
        const existing = await Floor.findOne({
          floorNumber: num,
          _id: { $ne: floor._id },
        });
        if (existing) {
          return errorResponse(res, 409, "A resource with these details already exists");
        }
        floor.floorNumber = num;
      }

      if (name !== undefined) floor.name = name.trim();
      if (description !== undefined) floor.description = description.trim();

      await floor.save();

      return successResponse(res, 200, "Floor updated successfully", {
        id: floor._id.toString(),
        name: floor.name,
        floorNumber: floor.floorNumber,
        description: floor.description,
        updatedAt: floor.updatedAt,
      });
    }

    // 2. FLAT
    if (type === "flat") {
      const flat = await Flat.findById(id);
      if (!flat) {
        return errorResponse(res, 404, "Flat not found");
      }

      const { floorId, flatNumber, name, description } = req.body;

      if (floorId !== undefined) {
        if (!mongoose.Types.ObjectId.isValid(floorId)) {
          return errorResponse(res, 400, "Invalid request data");
        }
        const floor = await Floor.findById(floorId);
        if (!floor) {
          return errorResponse(res, 404, "Floor not found");
        }
        flat.floorId = floorId;
      }

      if (flatNumber !== undefined) {
        const fNum = String(flatNumber).trim();
        const existing = await Flat.findOne({
          floorId: flat.floorId,
          flatNumber: fNum,
          _id: { $ne: flat._id },
        });
        if (existing) {
          return errorResponse(res, 409, "A flat with this number already exists on this floor");
        }
        flat.flatNumber = fNum;
      }

      if (name !== undefined) flat.name = name.trim();
      if (description !== undefined) flat.description = description.trim();

      await flat.save();

      return successResponse(res, 200, "Flat updated successfully", {
        id: flat._id.toString(),
        floorId: flat.floorId.toString(),
        flatNumber: flat.flatNumber,
        name: flat.name,
        description: flat.description,
        updatedAt: flat.updatedAt,
      });
    }

    // 3. ROOM
    if (type === "room") {
      const room = await Room.findById(id);
      if (!room) {
        return errorResponse(res, 404, "Room not found");
      }

      const { floorId, flatId, roomNumber, capacity, description } = req.body;

      if (flatId !== undefined) {
        if (flatId === null || flatId === "") {
          room.flatId = null;
        } else {
          if (!mongoose.Types.ObjectId.isValid(flatId)) {
            return errorResponse(res, 400, "Invalid request data");
          }
          const flat = await Flat.findById(flatId);
          if (!flat) {
            return errorResponse(res, 404, "Referenced flat not found");
          }
          room.flatId = flat._id;
          room.floorId = flat.floorId;
        }
      }

      if (floorId !== undefined && flatId === undefined) {
        if (!mongoose.Types.ObjectId.isValid(floorId)) {
          return errorResponse(res, 400, "Invalid request data");
        }
        const floor = await Floor.findById(floorId);
        if (!floor) {
          return errorResponse(res, 404, "Floor not found");
        }
        room.floorId = floorId;
      }

      if (capacity !== undefined) {
        const cap = Number(capacity);
        if (isNaN(cap) || cap < 1) {
          return errorResponse(res, 400, "Invalid request data");
        }
        const bedCount = await Bed.countDocuments({ roomId: room._id });
        if (cap < bedCount) {
          return errorResponse(res, 400, "Invalid request data");
        }
        room.capacity = cap;
      }

      if (roomNumber !== undefined) {
        const rNum = String(roomNumber).trim();
        const existing = await Room.findOne({
          floorId: room.floorId,
          roomNumber: rNum,
          _id: { $ne: room._id },
        });
        if (existing) {
          return errorResponse(res, 409, "A resource with these details already exists");
        }
        room.roomNumber = rNum;
      }

      if (description !== undefined) room.description = description.trim();

      await room.save();

      return successResponse(res, 200, "Room updated successfully", {
        id: room._id.toString(),
        floorId: room.floorId.toString(),
        flatId: room.flatId ? room.flatId.toString() : null,
        roomNumber: room.roomNumber,
        capacity: room.capacity,
        description: room.description,
        updatedAt: room.updatedAt,
      });
    }

    // 4. BED
    if (type === "bed") {
      const bed = await Bed.findById(id);
      if (!bed) {
        return errorResponse(res, 404, "Bed not found");
      }

      const { roomId, bedNumber, bedType, monthlyRent, status } = req.body;

      if (roomId !== undefined) {
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
          return errorResponse(res, 400, "Invalid request data");
        }
        const room = await Room.findById(roomId);
        if (!room) {
          return errorResponse(res, 404, "Room not found");
        }
        bed.roomId = roomId;
      }

      if (bedNumber !== undefined) {
        const bNum = String(bedNumber).trim();
        const existing = await Bed.findOne({
          roomId: bed.roomId,
          bedNumber: bNum,
          _id: { $ne: bed._id },
        });
        if (existing) {
          return errorResponse(res, 409, "A resource with these details already exists");
        }
        bed.bedNumber = bNum;
      }

      if (bedType !== undefined) bed.bedType = bedType.trim();
      if (monthlyRent !== undefined) {
        const rent = Number(monthlyRent);
        if (isNaN(rent) || rent < 0) {
          return errorResponse(res, 400, "Invalid request data");
        }
        bed.monthlyRent = rent;
      }
      if (status !== undefined && ["Available", "Occupied"].includes(status)) {
        bed.status = status;
      }

      await bed.save();

      return successResponse(res, 200, "Bed updated successfully", {
        id: bed._id.toString(),
        roomId: bed.roomId.toString(),
        bedNumber: bed.bedNumber,
        bedType: bed.bedType,
        monthlyRent: bed.monthlyRent,
        status: bed.status,
        updatedAt: bed.updatedAt,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/management/:id?type=floor|flat|room|bed
 */
export const deleteResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 404, "Resource not found");
    }

    if (!type || !["floor", "flat", "room", "bed"].includes(type)) {
      return errorResponse(
        res,
        400,
        "Invalid type. Allowed values: floor, flat, room, bed"
      );
    }

    // 1. FLOOR
    if (type === "floor") {
      const floor = await Floor.findById(id);
      if (!floor) {
        return errorResponse(res, 404, "Resource not found");
      }

      const hasRooms = await Room.exists({ floorId: floor._id });
      const hasFlats = await Flat.exists({ floorId: floor._id });
      if (hasRooms || hasFlats) {
        return errorResponse(
          res,
          409,
          "Cannot delete this resource because it contains linked records"
        );
      }

      await Floor.findByIdAndDelete(id);

      return successResponse(res, 200, "Floor deleted successfully", {
        id,
        type: "floor",
      });
    }

    // 2. FLAT
    if (type === "flat") {
      const flat = await Flat.findById(id);
      if (!flat) {
        return errorResponse(res, 404, "Resource not found");
      }

      const hasRooms = await Room.exists({ flatId: flat._id });
      if (hasRooms) {
        return errorResponse(
          res,
          409,
          "Cannot delete this resource because it contains linked records"
        );
      }

      await Flat.findByIdAndDelete(id);

      return successResponse(res, 200, "Flat deleted successfully", {
        id,
        type: "flat",
      });
    }

    // 3. ROOM
    if (type === "room") {
      const room = await Room.findById(id);
      if (!room) {
        return errorResponse(res, 404, "Resource not found");
      }

      const hasBeds = await Bed.exists({ roomId: room._id });
      if (hasBeds) {
        return errorResponse(
          res,
          409,
          "Cannot delete this resource because it contains linked records"
        );
      }

      await Room.findByIdAndDelete(id);

      return successResponse(res, 200, "Room deleted successfully", {
        id,
        type: "room",
      });
    }

    // 4. BED
    if (type === "bed") {
      const bed = await Bed.findById(id);
      if (!bed) {
        return errorResponse(res, 404, "Resource not found");
      }

      if (bed.status === "Occupied" || bed.tenantId) {
        return errorResponse(
          res,
          409,
          "Cannot delete this resource because it contains linked records"
        );
      }

      const hasActiveTenant = await Tenant.exists({
        bedId: bed._id,
        tenantStatus: "Active",
      });
      if (hasActiveTenant) {
        return errorResponse(
          res,
          409,
          "Cannot delete this resource because it contains linked records"
        );
      }

      await Bed.findByIdAndDelete(id);

      return successResponse(res, 200, "Bed deleted successfully", {
        id,
        type: "bed",
      });
    }
  } catch (error) {
    next(error);
  }
};

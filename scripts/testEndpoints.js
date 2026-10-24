import "dotenv/config";

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;

let authToken = "";
let floorId = "";
let roomId = "";
let bedId1 = "";
let bedId2 = "";
let tenantId = "";
let paymentId = "";

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
};

const runTests = async () => {
  console.log(`\n🚀 Starting Comprehensive Endpoint Verification on ${BASE_URL}...\n`);

  // 1. Health check
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthJson = await healthRes.json();
  assert(healthRes.status === 200 && healthJson.status === "success", "GET /api/health");

  // 2. Admin Login - Missing fields
  const loginMissing = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@srpg.com" }),
  });
  const loginMissingJson = await loginMissing.json();
  assert(
    loginMissing.status === 400 &&
      loginMissingJson.message === "Email and password are required",
    "POST /api/auth/login - Missing password returns 400"
  );

  // 3. Admin Login - Invalid credentials
  const loginInvalid = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@srpg.com", password: "WrongPassword" }),
  });
  const loginInvalidJson = await loginInvalid.json();
  assert(
    loginInvalid.status === 401 &&
      loginInvalidJson.message === "Invalid email or password",
    "POST /api/auth/login - Invalid password returns 401"
  );

  // 4. Admin Login - Success
  const loginSuccess = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL || "admin@srpg.com",
      password: process.env.ADMIN_PASSWORD || "Admin@123456",
    }),
  });
  const loginSuccessJson = await loginSuccess.json();
  assert(
    loginSuccess.status === 200 &&
      loginSuccessJson.status === "success" &&
      loginSuccessJson.data?.token,
    "POST /api/auth/login - Success returns 200 & JWT token"
  );
  authToken = loginSuccessJson.data.token;

  // 5. GET /api/auth/me - Missing token
  const meMissing = await fetch(`${BASE_URL}/api/auth/me`);
  const meMissingJson = await meMissing.json();
  assert(
    meMissing.status === 401 &&
      meMissingJson.message === "Authentication token is required",
    "GET /api/auth/me - Missing token returns 401"
  );

  // 6. GET /api/auth/me - Valid token
  const meSuccess = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const meSuccessJson = await meSuccess.json();
  assert(
    meSuccess.status === 200 &&
      meSuccessJson.data?.admin?.email === (process.env.ADMIN_EMAIL || "admin@srpg.com"),
    "GET /api/auth/me - Success returns 200 & profile"
  );

  // 7. Management - Create Floor
  const uniqueFloorNum = Math.floor(100 + Math.random() * 900);
  const floorRes = await fetch(`${BASE_URL}/api/management/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      type: "floor",
      name: `Floor ${uniqueFloorNum}`,
      floorNumber: uniqueFloorNum,
      description: `Test Floor ${uniqueFloorNum}`,
    }),
  });
  const floorJson = await floorRes.json();
  assert(floorRes.status === 201 && floorJson.data?.id, "POST /api/management/create (Floor) returns 201");
  floorId = floorJson.data.id;

  // 8. Management - Duplicate Floor
  const duplicateFloorRes = await fetch(`${BASE_URL}/api/management/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      type: "floor",
      name: `Floor Duplicate`,
      floorNumber: uniqueFloorNum,
    }),
  });
  assert(duplicateFloorRes.status === 409, "POST /api/management/create (Duplicate Floor) returns 409");

  // 9. Management - Create Room
  const roomRes = await fetch(`${BASE_URL}/api/management/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      type: "room",
      floorId,
      roomNumber: `${uniqueFloorNum}01`,
      capacity: 2,
      description: "Test Room 1",
    }),
  });
  const roomJson = await roomRes.json();
  assert(roomRes.status === 201 && roomJson.data?.id, "POST /api/management/create (Room) returns 201");
  roomId = roomJson.data.id;

  // 10. Management - Create Bed 1
  const bed1Res = await fetch(`${BASE_URL}/api/management/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      type: "bed",
      roomId,
      bedNumber: "Bed A",
      bedType: "Single",
      monthlyRent: 6000,
    }),
  });
  const bed1Json = await bed1Res.json();
  assert(bed1Res.status === 201 && bed1Json.data?.id, "POST /api/management/create (Bed 1) returns 201");
  bedId1 = bed1Json.data.id;

  // 11. Management - Create Bed 2
  const bed2Res = await fetch(`${BASE_URL}/api/management/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      type: "bed",
      roomId,
      bedNumber: "Bed B",
      bedType: "Single",
      monthlyRent: 6000,
    }),
  });
  const bed2Json = await bed2Res.json();
  assert(bed2Res.status === 201 && bed2Json.data?.id, "POST /api/management/create (Bed 2) returns 201");
  bedId2 = bed2Json.data.id;

  // 12. Management - Capacity Exceeded for Bed 3
  const bed3Res = await fetch(`${BASE_URL}/api/management/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      type: "bed",
      roomId,
      bedNumber: "Bed C",
      bedType: "Single",
      monthlyRent: 6000,
    }),
  });
  assert(
    bed3Res.status === 409,
    "POST /api/management/create (Room capacity exceeded) returns 409"
  );

  // 13. Create Tenant
  const uniquePhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
  const tenantRes = await fetch(`${BASE_URL}/api/management/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      type: "tenant",
      fullName: "Ravi Kumar",
      phone: uniquePhone,
      email: "ravi@example.com",
      address: "Vijayawada, Andhra Pradesh",
      roomId,
      bedId: bedId1,
      joiningDate: "2026-10-01",
      monthlyRent: 6000,
      securityDeposit: 6000,
      emergencyContact: "9876543210",
      notes: "Working professional",
    }),
  });
  const tenantJson = await tenantRes.json();
  assert(
    tenantRes.status === 201 && tenantJson.data?.id,
    "POST /api/management/create (Tenant) returns 201"
  );
  tenantId = tenantJson.data.id;

  // 14. Tenant Bed Already Occupied
  const occBedRes = await fetch(`${BASE_URL}/api/management/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      type: "tenant",
      fullName: "Other Tenant",
      phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
      roomId,
      bedId: bedId1,
      joiningDate: "2026-10-01",
      monthlyRent: 6000,
    }),
  });
  assert(
    occBedRes.status === 409,
    "POST /api/management/create (Occupied bed) returns 409"
  );

  // 15. GET /api/management?type=floor
  const getFloors = await fetch(`${BASE_URL}/api/management?type=floor`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const getFloorsJson = await getFloors.json();
  assert(
    getFloors.status === 200 &&
      getFloorsJson.data.items.some((f) => f.id === floorId && f.roomCount >= 1),
    "GET /api/management?type=floor returns floors with roomCount"
  );

  // 16. GET /api/management?type=room
  const getRooms = await fetch(`${BASE_URL}/api/management?type=room&floorId=${floorId}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const getRoomsJson = await getRooms.json();
  assert(
    getRooms.status === 200 &&
      getRoomsJson.data.items.some(
        (r) => r.id === roomId && r.occupiedBeds === 1 && r.availableBeds === 1
      ),
    "GET /api/management?type=room returns room with occupied & available counts"
  );

  // 17. GET /api/management?type=bed
  const getBeds = await fetch(`${BASE_URL}/api/management?type=bed&roomId=${roomId}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const getBedsJson = await getBeds.json();
  assert(
    getBeds.status === 200 &&
      getBedsJson.data.items.some((b) => b.id === bedId1 && b.status === "Occupied"),
    "GET /api/management?type=bed returns beds with occupied status"
  );

  // 18. PUT /api/management/:id?type=floor
  const putFloor = await fetch(`${BASE_URL}/api/management/${floorId}?type=floor`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ description: "Updated floor description" }),
  });
  assert(putFloor.status === 200, "PUT /api/management/:id?type=floor returns 200");

  // 19. DELETE /api/management/:id?type=floor (Contains rooms -> 409)
  const delFloor = await fetch(`${BASE_URL}/api/management/${floorId}?type=floor`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert(
    delFloor.status === 409,
    "DELETE /api/management/:id?type=floor (Contains rooms) returns 409"
  );

  // 20. GET /api/tenants
  const getTenantsRes = await fetch(`${BASE_URL}/api/tenants?month=2026-10`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const getTenantsJson = await getTenantsRes.json();
  const currentTenantRecord = getTenantsJson.data.tenants.find((t) => t.id === tenantId);
  assert(
    getTenantsRes.status === 200 &&
      currentTenantRecord &&
      currentTenantRecord.rent.rentAmount === 6000 &&
      currentTenantRecord.rent.outstandingAmount === 6000,
    "GET /api/tenants returns tenant with computed rent"
  );

  // 21. GET /api/tenants/filter-options
  const filterOptionsRes = await fetch(`${BASE_URL}/api/tenants/filter-options`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const filterOptionsJson = await filterOptionsRes.json();
  assert(
    filterOptionsRes.status === 200 &&
      filterOptionsJson.data.floors.length > 0 &&
      filterOptionsJson.data.tenantStatuses.includes("Active"),
    "GET /api/tenants/filter-options returns dropdown data"
  );

  // 22. PUT /api/tenants/:id (Move tenant to bedId2)
  const updateTenantRes = await fetch(`${BASE_URL}/api/tenants/${tenantId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      bedId: bedId2,
    }),
  });
  const updateTenantJson = await updateTenantRes.json();
  assert(
    updateTenantRes.status === 200 && updateTenantJson.data.bedId === bedId2,
    "PUT /api/tenants/:id updates tenant bed assignment"
  );

  // 23. POST /api/rent-payments (Partial Payment of 3000)
  const testTxRef = `UPI_${Date.now()}`;
  const payPartialRes = await fetch(`${BASE_URL}/api/rent-payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      tenantId,
      month: "2026-10",
      amountPaid: 3000,
      paymentDate: "2026-10-24",
      paymentMethod: "UPI",
      transactionReference: testTxRef,
      notes: "Partial October payment",
    }),
  });
  const payPartialJson = await payPartialRes.json();
  assert(
    payPartialRes.status === 201 &&
      payPartialJson.data.payment.paymentStatus === "Partial" &&
      payPartialJson.data.payment.outstandingAmount === 3000,
    "POST /api/rent-payments (Partial) returns 201 and Partial status"
  );
  paymentId = payPartialJson.data.payment.id;

  // 23b. POST /api/rent-payments (Duplicate transaction reference -> 409)
  const duplicateTxRes = await fetch(`${BASE_URL}/api/rent-payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      tenantId,
      month: "2026-10",
      amountPaid: 1000,
      paymentDate: "2026-10-24",
      paymentMethod: "UPI",
      transactionReference: testTxRef,
    }),
  });
  assert(
    duplicateTxRes.status === 409,
    "POST /api/rent-payments (Duplicate transaction reference) returns 409"
  );

  // 24. POST /api/rent-payments (Remaining Payment of 3000)
  const payRemainingRes = await fetch(`${BASE_URL}/api/rent-payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      tenantId,
      month: "2026-10",
      amountPaid: 3000,
      paymentDate: "2026-10-24",
      paymentMethod: "Cash",
      notes: "Remaining October payment",
    }),
  });
  const payRemainingJson = await payRemainingRes.json();
  assert(
    payRemainingRes.status === 201 &&
      payRemainingJson.data.payment.paymentStatus === "Paid" &&
      payRemainingJson.data.payment.outstandingAmount === 0,
    "POST /api/rent-payments (Full balance) marks as Paid"
  );

  // 25. POST /api/rent-payments (Overpayment -> 400)
  const overpayRes = await fetch(`${BASE_URL}/api/rent-payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      tenantId,
      month: "2026-10",
      amountPaid: 100,
      paymentDate: "2026-10-24",
      paymentMethod: "Cash",
    }),
  });
  assert(
    overpayRes.status === 400,
    "POST /api/rent-payments (Overpayment beyond balance) returns 400"
  );

  // 26. GET /api/rent-payments (History)
  const paymentsHistoryRes = await fetch(`${BASE_URL}/api/rent-payments?tenantId=${tenantId}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const paymentsHistoryJson = await paymentsHistoryRes.json();
  assert(
    paymentsHistoryRes.status === 200 &&
      paymentsHistoryJson.data.payments.length === 2 &&
      paymentsHistoryJson.data.pagination.totalRecords === 2,
    "GET /api/rent-payments returns payments history with pagination"
  );

  // 27. GET /api/rent-payments/summary/:tenantId
  const summaryRes = await fetch(
    `${BASE_URL}/api/rent-payments/summary/${tenantId}?month=2026-10`,
    {
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );
  const summaryJson = await summaryRes.json();
  assert(
    summaryRes.status === 200 &&
      summaryJson.data.totalPaid === 6000 &&
      summaryJson.data.outstandingAmount === 0 &&
      summaryJson.data.paymentStatus === "Paid" &&
      summaryJson.data.payments.length === 2,
    "GET /api/rent-payments/summary/:tenantId returns full summary"
  );

  console.log("\n🎉 ALL 27 DETAILED ENDPOINT ASSERTIONS PASSED WITH FLYING COLORS!\n");
};

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

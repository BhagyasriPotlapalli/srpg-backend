/**
 * Helper to get today's date formatted as YYYY-MM-DD
 */
export const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Helper to get current month formatted as YYYY-MM
 */
export const getCurrentMonthString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

/**
 * Calculate the rent due date for a given tenant and month
 * @param {string} month - "YYYY-MM"
 * @param {object} tenant - tenant object with joiningDate, rentDueDay
 */
export const calculateRentDueDate = (month, tenant) => {
  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);

  // Determine the due day
  let dueDay = 5; // Default PG due day
  if (tenant.rentDueDay) {
    dueDay = tenant.rentDueDay;
  } else if (tenant.joiningDate) {
    const parts = tenant.joiningDate.split("-");
    if (parts.length === 3) {
      const joinDay = parseInt(parts[2], 10);
      if (!isNaN(joinDay) && joinDay > 0) {
        dueDay = joinDay;
      }
    }
  }

  // Days in month m (1-indexed)
  const daysInMonth = new Date(year, m, 0).getDate();
  const actualDay = Math.min(dueDay, daysInMonth);

  return `${yearStr}-${monthStr}-${String(actualDay).padStart(2, "0")}`;
};

/**
 * Compute rent statuses given amounts and dates
 */
export const computeRentStatus = ({
  rentAmount,
  totalPaid,
  rentDueDate,
  today = getTodayDateString(),
}) => {
  const outstandingAmount = Math.max(0, rentAmount - totalPaid);

  let paymentStatus = "Unpaid";
  if (totalPaid >= rentAmount) {
    paymentStatus = "Paid";
  } else if (totalPaid > 0) {
    paymentStatus = "Partial";
  } else {
    paymentStatus = "Unpaid";
  }

  let dueStatus = "Upcoming";
  if (totalPaid >= rentAmount) {
    dueStatus = "Paid";
  } else if (rentDueDate === today) {
    dueStatus = "DueToday";
  } else if (rentDueDate < today) {
    dueStatus = "Overdue";
  } else {
    dueStatus = "Upcoming";
  }

  // Single rentStatus string with documented precedence:
  // 1. Paid if fully paid
  // 2. Overdue if past due date
  // 3. DueToday if due date is today
  // 4. Partial if partial payment made
  // 5. Upcoming/Unpaid
  let rentStatus = "Unpaid";
  if (totalPaid >= rentAmount) {
    rentStatus = "Paid";
  } else if (rentDueDate < today) {
    rentStatus = "Overdue";
  } else if (rentDueDate === today) {
    rentStatus = "DueToday";
  } else if (totalPaid > 0) {
    rentStatus = "Partial";
  } else {
    rentStatus = "Upcoming";
  }

  return {
    paymentStatus,
    dueStatus,
    rentStatus,
    outstandingAmount,
  };
};

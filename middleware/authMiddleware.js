import { authenticateAdmin } from "./auth.js";

export { authenticateAdmin };
export const protect = authenticateAdmin;
export default authenticateAdmin;

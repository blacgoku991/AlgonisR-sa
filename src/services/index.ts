import { config } from "../config";
import type { BookingService } from "../types";
import { DemoBookingService } from "./demoService";
import { GraphBookingService } from "./graphService";

export const service: BookingService = config.demo ? new DemoBookingService() : new GraphBookingService();

import mongoose from "mongoose";

const bikeMaintenanceSchema = new mongoose.Schema(
  {
    bike: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bike",
      required: true,
    },
    note: {
      type: String,
      required: [true, "Please add maintenance details"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const BikeMaintenanceRecord = mongoose.model(
  "BikeMaintenanceRecord",
  bikeMaintenanceSchema
);

export default BikeMaintenanceRecord;

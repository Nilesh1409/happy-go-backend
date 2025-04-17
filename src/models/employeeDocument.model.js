import mongoose from "mongoose";

const employeeDocumentSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Please add a document name"],
    },
    type: {
      type: String,
      required: [true, "Please add a document type"],
    },
    url: {
      type: String,
      required: [true, "Please add a document URL"],
    },
    size: {
      type: Number,
      required: [true, "Please add a document size"],
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const EmployeeDocument = mongoose.model(
  "EmployeeDocument",
  employeeDocumentSchema
);

export default EmployeeDocument;

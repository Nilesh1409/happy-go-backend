import mongoose from "mongoose";

const hostelOverviewSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a title"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please provide a description"],
    },
    imageKeys: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

const HostelOverview = mongoose.model("HostelOverview", hostelOverviewSchema);

export default HostelOverview;

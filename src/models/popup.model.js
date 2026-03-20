import mongoose from "mongoose";

const popupSchema = new mongoose.Schema(
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
    imageKey: {
      type: String,
      default: null,
    },
    show: {
      type: String,
      enum: ["always", "once", "never"],
      default: "always",
    },
  },
  { timestamps: true }
);

const Popup = mongoose.model("Popup", popupSchema);

export default Popup;

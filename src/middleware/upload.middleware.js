import multer from "multer";

const storage = multer.memoryStorage();
export const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log("Received file:", file);
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/msword" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

import express from "express";
import { getLandingPopup } from "../controllers/popup.controller.js";

const router = express.Router();

router.get("/", getLandingPopup);

export default router;

import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Get landing popup content for first-time visitors
// @route   GET /api/popup
// @access  Public
export const getLandingPopup = asyncHandler(async (req, res) => {
  const popup = {
    title: "Welcome to Happy Go!",
    message:
      "Best bike rental service in Chikkamagaluru since 2010. Rent premium bikes, book hostels, and explore with zero deposit. Happy Ride, Happy Stay.",
    ctaText: "Explore Bikes",
    ctaLink: "/search",
    imageUrl:
      "https://happygorentals.com/assets/images/andreas-weilguny-gZGId1GVRcc-unsplash.jpg",
    showOnce: true,
  };

  res.status(200).json({
    success: true,
    data: popup,
  });
});

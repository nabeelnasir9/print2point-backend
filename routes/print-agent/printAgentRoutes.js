const express = require("express");
const verifyToken = require("../../middleware/verifyToken.js");
const PrintAgent = require("../../models/print-agent-schema.js");
const Card = require("../../models/card-schema.js");
const validateUpdateCard = require("../../middleware/validateCard.js");
const router = express.Router();

router.post("/additional-info", verifyToken, async (req, res) => {
  try {
    const { personal_info, location, personal_phone_number, card } = req.body;

    const printAgent = await PrintAgent.findById(req.user.id);
    if (!printAgent) {
      return res.status(400).json({ message: "User not found" });
    }

    printAgent.personal_info = personal_info;
    printAgent.location = location;
    printAgent.personal_phone_number = personal_phone_number;

    if (card) {
      const newCard = new Card({
        ...card,
        user_id: printAgent._id,
        ref_type: "PrintAgent",
      });
      await newCard.save();
      printAgent.cards = [newCard._id];
    }

    await printAgent.save();
    res.status(200).json({ message: "Additional info updated successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/create-card", verifyToken, async (req, res) => {
  try {
    const { card } = req.body;
    //INFO: req.user.id is the id we get from the token
    const printAgent = await PrintAgent.findById(req.user.id);
    if (!printAgent) {
      return res.status(400).json({ message: "User not found" });
    }

    const newCard = new Card({
      ...card,
      user_id: printAgent._id,
      ref_type: "PrintAgent",
    });

    await newCard.save();
    printAgent.cards.push(newCard._id);
    await printAgent.save();

    res.status(201).json({ message: "Card created successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/get-cards", verifyToken, async (req, res) => {
  try {
    const printAgent = await PrintAgent.findById(req.user.id).populate("cards");
    if (!printAgent) {
      return res.status(400).json({ message: "User not found" });
    }
    if (!printAgent.cards || printAgent.cards.length === 0) {
      return res.status(404).json({ message: "No cards found for this user" });
    }
    res.status(200).json({
      message: "Cards retrieved successfully",
      cards: printAgent.cards,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/get-card/:cardId", verifyToken, async (req, res) => {
  try {
    const { cardId } = req.params;

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    const printAgent = await PrintAgent.findById(req.user.id);
    if (!printAgent || !printAgent.cards.includes(cardId)) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    res.status(200).json({ message: "Card retrieved successfully", card });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

//INFO: allows partial updates
router.delete("/delete-card/:cardId", verifyToken, async (req, res) => {
  try {
    const { cardId } = req.params;
    const printAgent = await PrintAgent.findById(req.user.id);
    if (!printAgent) {
      return res.status(400).json({ message: "User not found" });
    }

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    if (!printAgent.cards.includes(cardId)) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    await Card.deleteOne({ _id: cardId });
    printAgent.cards = printAgent.cards.filter((id) => id !== cardId);
    await printAgent.save();

    res.status(200).json({ message: "Card deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});
//  PUT request to update card
//  INFO: allows partial updates

router.put(
  "/update-card/:cardId",
  verifyToken,
  validateUpdateCard,
  async (req, res) => {
    try {
      const { cardId } = req.params;
      const { bank_name, card_number, expiry_date, phone_number } = req.body;

      const printAgent = await PrintAgent.findById(req.user.id);
      if (!printAgent) {
        return res.status(400).json({ message: "User not found" });
      }

      const cardToUpdate = await Card.findById(cardId);
      if (!cardToUpdate) {
        return res.status(404).json({ message: "Card not found" });
      }

      if (!printAgent.cards.includes(cardId)) {
        return res.status(403).json({ message: "Unauthorized access" });
      }

      cardToUpdate.bank_name = bank_name ?? cardToUpdate.bank_name;
      cardToUpdate.card_number = card_number ?? cardToUpdate.card_number;
      cardToUpdate.expiry_date = expiry_date ?? cardToUpdate.expiry_date;
      cardToUpdate.phone_number = phone_number ?? cardToUpdate.phone_number;

      await cardToUpdate.save();

      res.status(200).json({ message: "Card updated successfully" });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: "Server error" });
    }
  },
);

module.exports = router;
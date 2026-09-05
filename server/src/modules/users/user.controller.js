const User = require("./user.model");

const createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createUser,
};
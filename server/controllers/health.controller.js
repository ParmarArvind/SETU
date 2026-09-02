function getHealth(req, res) {
  res.status(200).json({
    success: true,
    message: 'DevSync API is running',
  });
}

export { getHealth };
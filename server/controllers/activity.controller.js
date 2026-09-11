import Activity from '../models/Activity.js';

export const getProjectActivity = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const page = Math.max(
      parseInt(req.query.page, 10) || 1,
      1,
    );

    const limit = Math.min(
      Math.max(
        parseInt(req.query.limit, 10) || 20,
        1,
      ),
      50,
    );

    const skip = (page - 1) * limit;

    const filter = {
      project: projectId,
    };

    // Optional category/action filtering
    if (req.query.action) {
      filter.action = req.query.action;
    }

    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .populate('actor', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Activity.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: {
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};